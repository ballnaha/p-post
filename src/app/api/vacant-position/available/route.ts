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
 * - unit: กรองตามหน่วยงาน (optional)
 * - status: กรองตามสถานะ 'vacant' หรือ 'reserved' (optional)
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
    const unit = searchParams.get('unit');
    const status = searchParams.get('status'); // 'vacant', 'reserved', or 'all'
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

    // Build status filter based on status parameter
    let fullNameFilter: any[];
    if (status === 'vacant') {
      // Only regular vacant positions (not reserved)
      // Must match /api/police-personnel logic: fullName is null/empty OR doesn't contain 'กันตำแหน่ง'
      fullNameFilter = [
        { fullName: null },
        { fullName: '' },
        {
          AND: [
            { fullName: { not: null } },
            { fullName: { not: '' } },
            { fullName: { not: { contains: 'ว่าง (กันตำแหน่ง)' } } },
            { fullName: { not: { contains: 'ว่าง(กันตำแหน่ง)' } } }
          ]
        }
      ];
    } else if (status === 'reserved') {
      // Only reserved positions
      fullNameFilter = [
        { fullName: { contains: 'ว่าง (กันตำแหน่ง)' } },
        { fullName: { contains: 'ว่าง(กันตำแหน่ง)' } }
      ];
    } else {
      // All vacant positions (default)
      fullNameFilter = [
        { fullName: null },
        { fullName: '' },
        { fullName: { contains: 'ว่าง' } },
        { fullName: { contains: 'กันตำแหน่ง' } }
      ];
    }

    const whereClause: any = {
      year: parseInt(year),
      isActive: true, // Only current active data
      AND: [
        {
          OR: [
            { rank: null },
            { rank: '' }
          ]
        },
        {
          OR: fullNameFilter
        }
      ]
    };

    // Filter by unit
    if (unit && unit !== 'all') {
      whereClause.AND.push({ unit: { equals: unit } });
    }

    // Filter by search text
    if (search) {
      whereClause.AND.push({
        OR: [
          { position: { contains: search } },
          { unit: { contains: search } },
          { positionNumber: { contains: search } },
          { fullName: { contains: search } }
        ]
      });
    }

    // Filter by posCodeId
    if (posCodeId) {
      const pId = parseInt(posCodeId);
      if (whereClause.AND) {
        whereClause.AND.push({ posCodeId: pId });
      } else {
        whereClause.AND = [{ posCodeId: pId }];
      }
    }

    // counts
    const totalCount = await prisma.policePersonnel.count({
      where: whereClause,
    });

    const queryOptions: any = {
      where: whereClause,
      include: {
        posCodeMaster: true,
      },
      orderBy: [
        { posCodeId: 'asc' },
        { position: 'asc' },
        { noId: 'asc' }
      ],
    };

    // pagination
    if (usePagination) {
      queryOptions.skip = page * limit;
      queryOptions.take = limit;
    }

    const vacantPositions = await prisma.policePersonnel.findMany(queryOptions);

    // ถ้าต้องการเฉพาะตำแหน่งที่ยังไม่ถูกจับคู่ ให้กรองออกตำแหน่งที่มีใน swap_transaction_detail
    let filteredPositions = vacantPositions;
    if (unassignedOnly) {
      // ดึงรายการตำแหน่งที่ถูกจับคู่แล้ว (จาก swap_transaction_detail)
      const assignedPositions = await prisma.swapTransactionDetail.findMany({
        where: {
          transaction: {
            year: parseInt(year)
          },
          toPosition: { not: null }
        },
        select: {
          toPosition: true,
          toUnit: true,
          toPositionNumber: true
        }
      });

      // สร้าง Set สำหรับเช็คว่าตำแหน่งถูกจับคู่แล้วหรือไม่
      const assignedSet = new Set(
        assignedPositions.map(p => `${p.toPosition}-${p.toUnit}-${p.toPositionNumber}`)
      );

      // กรองออกตำแหน่งที่ถูกจับคู่แล้ว
      filteredPositions = vacantPositions.filter(position =>
        !assignedSet.has(`${position.position}-${position.unit}-${position.positionNumber}`)
      );
    }

    // จัดกลุ่มตามตำแหน่ง
    const groupedPositions = filteredPositions.reduce((acc, position: any) => {
      const posCodeId = position.posCodeMaster?.id;
      const posCodeName = position.posCodeMaster?.name;
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
        noId: position.noId,
        position: position.position,
        unit: position.unit,
        positionNumber: position.positionNumber,
        rank: position.rank,
        fullName: position.fullName,
        nationalId: position.nationalId,
        actingAs: position.actingAs,
        supporterName: position.supporterName,
        notes: position.notes,
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
      count: filteredPositions.length,
      unassignedOnly,
      groups: formattedData,
      ...(usePagination && {
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(filteredPositions.length / (limit || 1)),
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
