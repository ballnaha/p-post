import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET - ดึงรายการตำแหน่งว่างที่พร้อมใช้งาน
 * สำหรับใช้ในหน้า promotion-chain และหน้าอื่นๆ ที่ต้องการตำแหน่งว่างที่ยังไม่ถูกจับคู่
 * 
 * ✅ Optimized v2:
 * - ใช้ select แทน include เพื่อลดขนาดข้อมูล
 * - ใช้ Promise.all สำหรับ count + data + assignedPositions
 * - กรอง unassigned ใน JS แทน subquery เพราะ Prisma ไม่รองรับ NOT EXISTS subquery
 * - ลดจำนวนฟิลด์ที่ดึงจาก posCodeMaster
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
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unassignedOnly = searchParams.get('unassignedOnly') !== 'false';
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search');
    const posCodeId = searchParams.get('posCodeId');
    const unit = searchParams.get('unit');
    const status = searchParams.get('status');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearInt = parseInt(year);

    // Parse pagination
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const usePagination = page !== undefined && limit !== undefined;

    // Build status filter
    let fullNameFilter: any[];
    if (status === 'vacant') {
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
      fullNameFilter = [
        { fullName: { contains: 'ว่าง (กันตำแหน่ง)' } },
        { fullName: { contains: 'ว่าง(กันตำแหน่ง)' } }
      ];
    } else {
      fullNameFilter = [
        { fullName: null },
        { fullName: '' },
        { fullName: { contains: 'ว่าง' } },
        { fullName: { contains: 'กันตำแหน่ง' } }
      ];
    }

    const whereClause: any = {
      year: yearInt,
      isActive: true,
      AND: [
        { OR: [{ rank: null }, { rank: '' }] },
        { OR: fullNameFilter }
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
      whereClause.AND.push({ posCodeId: pId });
    }

    // ✅ Optimized: Run count + data + assigned in parallel
    const queries: Promise<any>[] = [
      // Query 1: Count
      prisma.policePersonnel.count({ where: whereClause }),
      // Query 2: Data with select (ลดขนาดข้อมูล)
      prisma.policePersonnel.findMany({
        where: whereClause,
        select: {
          id: true,
          noId: true,
          position: true,
          positionNumber: true,
          unit: true,
          rank: true,
          fullName: true,
          nationalId: true,
          actingAs: true,
          supporterName: true,
          notes: true,
          posCodeId: true,
          posCodeMaster: {
            select: {
              id: true,
              name: true,
            }
          },
        },
        orderBy: [
          { posCodeId: 'asc' },
          { position: 'asc' },
          { noId: 'asc' }
        ],
        ...(usePagination ? { skip: page * limit, take: limit } : {}),
      }),
    ];

    // Query 3: Assigned positions (only if needed)
    if (unassignedOnly) {
      queries.push(
        prisma.swapTransactionDetail.findMany({
          where: {
            transaction: { year: yearInt },
            toPosition: { not: null }
          },
          select: {
            toPosition: true,
            toUnit: true,
            toPositionNumber: true
          }
        })
      );
    }

    const results = await Promise.all(queries);
    const totalCount = results[0] as number;
    const vacantPositions = results[1] as any[];

    // Filter unassigned
    let filteredPositions = vacantPositions;
    if (unassignedOnly && results[2]) {
      const assignedPositions = results[2] as any[];
      const assignedSet = new Set(
        assignedPositions.map(p => `${p.toPosition}-${p.toUnit}-${p.toPositionNumber}`)
      );

      filteredPositions = vacantPositions.filter(position =>
        !assignedSet.has(`${position.position}-${position.unit}-${position.positionNumber}`)
      );
    }

    // จัดกลุ่มตามตำแหน่ง
    const groupedPositions = filteredPositions.reduce((acc, position: any) => {
      const pcId = position.posCodeMaster?.id;
      const pcName = position.posCodeMaster?.name;
      const key = `${pcId}-${pcName}`;

      if (!acc[key]) {
        acc[key] = {
          posCodeId: pcId,
          posCodeName: pcName,
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
      year: yearInt,
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
