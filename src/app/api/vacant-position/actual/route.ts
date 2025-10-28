import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการตำแหน่งที่ว่างจริง (ไม่มีคนดำรง) พร้อม filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null;
    const search = searchParams.get('search') || '';
    const unitFilter = searchParams.get('unit') || 'all';
    const posCodeFilter = searchParams.get('posCode') || 'all';

    // ถ้าไม่มี page และ limit จะดึงทั้งหมด
    const usePagination = page !== null && limit !== null;
    const skip = usePagination ? (page - 1) * limit : 0;
    const take = usePagination ? limit : undefined;

    // สร้าง where clause สำหรับตำแหน่งที่ว่าง
    // แสดงทั้ง: ว่าง, ว่าง (กันตำแหน่ง), ว่าง(กันตำแหน่ง), และตำแหน่งที่ไม่มีคน
    const where: any = {
      AND: [
        {
          OR: [
            { rank: { equals: null } },
            { rank: { equals: '' } }
          ]
        },
        {
          OR: [
            { fullName: { equals: null } },
            { fullName: { equals: '' } },
            { fullName: { equals: 'ว่าง' } },
            { fullName: { equals: 'ว่าง (กันตำแหน่ง)' } }, // มีเว้นวรรค
            { fullName: { equals: 'ว่าง(กันตำแหน่ง)' } }    // ไม่มีเว้นวรรค
          ]
        }
      ]
    };

    // เพิ่ม unit filter
    if (unitFilter !== 'all') {
      where.AND.push({ unit: { equals: unitFilter } });
    }

    // เพิ่ม posCode filter
    if (posCodeFilter !== 'all') {
      const posCodeId = parseInt(posCodeFilter);
      if (!isNaN(posCodeId)) {
        where.AND.push({ posCodeId: { equals: posCodeId } });
      }
    }

    // เพิ่ม search filter
    if (search) {
      const searchConditions = [
        { position: { contains: search } },
        { unit: { contains: search } },
        { positionNumber: { contains: search } },
      ];
      where.AND.push({ OR: searchConditions });
    }

    // ดึงข้อมูลตำแหน่งที่ว่าง
    const [vacantPositions, total] = await Promise.all([
      prisma.policePersonnel.findMany({
        where,
        ...(usePagination ? { skip, take: take! } : {}),
        include: {
          posCodeMaster: true,
        },
        orderBy: [
          { unit: 'asc' },
          { position: 'asc' },
          { positionNumber: 'asc' },
        ],
      }),
      prisma.policePersonnel.count({ where }),
    ]);

    // เช็คว่าตำแหน่งไหนถูกจับคู่แล้ว
    const positionIds = vacantPositions.map(p => p.id);
    const assignedPositions = await prisma.swapTransactionDetail.findMany({
      where: {
        transaction: {
          swapType: 'vacant-assignment',
          status: 'completed', // เฉพาะที่ยังไม่ถูกยกเลิก
        }
      },
      include: {
        transaction: {
          select: {
            swapDate: true,
            year: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // สร้าง Map ของการจับคู่ตาม toPositionNumber (เลขที่ตำแหน่งที่จะไป)
    // ใช้ toPositionNumber + toPosition + toUnit เป็น unique key
    const positionAssignmentMap = new Map();
    assignedPositions.forEach(detail => {
      const key = `${detail.toPositionNumber}|${detail.toPosition}|${detail.toUnit}`;
      if (!positionAssignmentMap.has(key)) {
        positionAssignmentMap.set(key, {
          assignedPersonName: detail.fullName,
          assignedPersonRank: detail.rank,
          assignedDate: detail.transaction.swapDate,
          assignedYear: detail.transaction.year,
          fromPosition: detail.fromPosition,
          fromUnit: detail.fromUnit,
        });
      }
    });

    // Return individual vacant positions instead of grouped
    const result = vacantPositions.map(position => {
      const key = `${position.positionNumber}|${position.position}|${position.unit}`;
      return {
        id: position.id,
        posCodeId: position.posCodeId,
        posCodeName: position.posCodeMaster?.name || 'ไม่ระบุ',
        unit: position.unit,
        position: position.position,
        positionNumber: position.positionNumber,
        actingAs: position.actingAs,
        notes: position.notes,
        fullName: position.fullName, // เพิ่ม fullName เพื่อใช้ filter ประเภทตำแหน่งว่าง
        assignmentInfo: positionAssignmentMap.get(key) || null,
      };
    });

    // Return different format based on pagination
    if (usePagination && limit) {
      return NextResponse.json({
        success: true,
        data: result,
        pagination: {
          page: page!,
          limit: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      // Return all data without pagination
      return NextResponse.json({
        success: true,
        data: result,
        total,
      });
    }
  } catch (error) {
    console.error('Error fetching actual vacant positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actual vacant positions' },
      { status: 500 }
    );
  }
}