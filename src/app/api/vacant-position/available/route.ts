import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET - ดึงรายการตำแหน่งว่างที่พร้อมใช้งาน
 * สำหรับใช้ในหน้า promotion-chain และหน้าอื่นๆ ที่ต้องการตำแหน่งว่างที่ยังไม่ถูกจับคู่
 * 
 * Query Parameters:
 * - year: ปีงบประมาณ (required)
 * - unassignedOnly: true/false - กรองเฉพาะตำแหน่งที่ยังไม่ถูกจับคู่ (default: true)
 * - page: หน้าที่ต้องการ (0-based, optional)
 * - limit: จำนวนรายการต่อหน้า (optional)
 * - search: ค้นหาจาก position, unit, positionNumber (optional)
 * - posCodeId: กรองตาม posCodeId (optional)
 * - minRankLevel: เลขระดับยศขั้นต่ำ (optional)
 * - maxRankLevel: เลขระดับยศสูงสุด (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unassignedOnly = searchParams.get('unassignedOnly') !== 'false'; // default true
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search');
    const posCodeId = searchParams.get('posCodeId');
    const minRankLevel = searchParams.get('minRankLevel');
    const maxRankLevel = searchParams.get('maxRankLevel');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    // Parse pagination parameters
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const usePagination = page !== undefined && limit !== undefined;

    const whereClause: any = {
      year: parseInt(year),
    };

    // กรองเฉพาะตำแหน่งที่ยังไม่ถูกจับคู่
    if (unassignedOnly) {
      whereClause.isAssigned = false;
    }

    // Filter by search text
    if (search) {
      whereClause.OR = [
        { position: { contains: search } },
        { unit: { contains: search } },
        { positionNumber: { contains: search } },
        { requestedPosition: { contains: search } },
      ];
    }

    // Filter by posCodeId
    if (posCodeId) {
      whereClause.requestedPositionId = parseInt(posCodeId);
    }

    // Note: rankLevel filtering is removed as PosCodeMaster doesn't have this field
    // Filter by posCodeId instead if needed

    // นับจำนวนทั้งหมด (สำหรับ pagination)
    const totalCount = await prisma.vacantPosition.count({
      where: whereClause,
    });

    // ดึงข้อมูลตำแหน่งว่าง
    const queryOptions: any = {
      where: whereClause,
      include: {
        posCodeMaster: true,
        requestedPosCode: true,
      },
      orderBy: [
        { requestedPositionId: 'asc' },
        { displayOrder: 'asc' },
      ],
    };

    // เพิ่ม pagination ถ้ามีการระบุ
    if (usePagination && page !== undefined && limit !== undefined) {
      queryOptions.skip = page * limit;
      queryOptions.take = limit;
    }

    const vacantPositions = await prisma.vacantPosition.findMany(queryOptions);

    // จัดกลุ่มตามตำแหน่งที่ขอ
    const groupedPositions = vacantPositions.reduce((acc, position: any) => {
      const posCodeId = position.requestedPosCode?.id || position.posCodeMaster?.id;
      const posCodeName = position.requestedPosCode?.name || position.posCodeMaster?.name;
      const key = `${posCodeId}-${posCodeName}`;

      if (!acc[key]) {
        acc[key] = {
          posCodeId: posCodeId,
          posCodeName: posCodeName,
          positions: [],
        };
      }

      acc[key].positions.push({
        id: position.id,
        position: position.position,
        unit: position.unit,
        positionNumber: position.positionNumber,
        rank: position.rank,
        fullName: position.fullName,
        nationalId: position.nationalId,
        nominator: position.nominator,
        notes: position.notes,
        displayOrder: position.displayOrder,
      });

      return acc;
    }, {} as Record<string, any>);

    // แปลงเป็น array และเรียงตามชื่อตำแหน่ง
    const formattedData = Object.values(groupedPositions)
      .sort((a: any, b: any) => {
        return (a.posCodeName || '').localeCompare(b.posCodeName || '', 'th');
      });

    return NextResponse.json({
      year: parseInt(year),
      total: totalCount,
      count: vacantPositions.length,
      unassignedOnly,
      groups: formattedData,
      ...(usePagination && { 
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / (limit || 1)),
        }
      }),
    });

  } catch (error) {
    console.error('Error fetching available vacant positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available vacant positions' },
      { status: 500 }
    );
  }
}
