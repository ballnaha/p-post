import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // ตรวจสอบว่าเป็น admin
    const authCheck = await checkAdminAuth();
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const positionFilter = searchParams.get('position') || 'all';
    const positionTypeFilter = searchParams.get('positionType') || 'all';
    const unitFilter = searchParams.get('unit') || 'all';
    const rankFilter = searchParams.get('rank') || 'all';
    const swapFilter = searchParams.get('swapFilter') || 'all';
    const posCodeFilter = searchParams.get('posCode') || 'all';

    const skip = (page - 1) * limit;

    // สร้าง where clause สำหรับค้นหา
    const where: any = {};
    
    // เพิ่ม position filter - ตรวจสอบจาก rank แทน fullName
    if (positionFilter === 'vacant') {
      // รายการยื่นขอตำแหน่งทั่วไป - ไม่มี rank และไม่มีคำว่า "ว่าง (กันตำแหน่ง)"
      where.AND = [
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
            {
              AND: [
                { fullName: { not: null } },
                { fullName: { not: { contains: 'ว่าง (กันตำแหน่ง)' } } }, // มีเว้นวรรค
                { fullName: { not: { contains: 'ว่าง(กันตำแหน่ง)' } } }    // ไม่มีเว้นวรรค
              ]
            }
          ]
        }
      ];
    } else if (positionFilter === 'occupied') {
      where.AND = [
        { rank: { not: null } },
        { rank: { not: '' } }
      ];
    } else if (positionFilter === 'reserved') {
      // รายการยื่นขอตำแหน่ง (กันตำแหน่ง) - มีคำว่า "ว่าง (กันตำแหน่ง)" หรือ "ว่าง(กันตำแหน่ง)" ใน fullName
      where.OR = [
        { fullName: { contains: 'ว่าง (กันตำแหน่ง)' } }, // มีเว้นวรรค
        { fullName: { contains: 'ว่าง(กันตำแหน่ง)' } }    // ไม่มีเว้นวรรค
      ];
    }
    
    // เพิ่ม position type filter (ตำแหน่ง - ผกก., รอง ผกก. เป็นต้น)
    if (positionTypeFilter !== 'all') {
      if (where.AND) {
        where.AND.push({ position: { startsWith: positionTypeFilter } });
      } else {
        where.AND = [{ position: { startsWith: positionTypeFilter } }];
      }
    }
    
    // เพิ่ม unit filter
    if (unitFilter !== 'all') {
      if (where.AND) {
        where.AND.push({ unit: { equals: unitFilter } });
      } else {
        where.AND = [{ unit: { equals: unitFilter } }];
      }
    }
    
    // เพิ่ม rank filter
    if (rankFilter !== 'all') {
      if (where.AND) {
        where.AND.push({ rank: { equals: rankFilter } });
      } else {
        where.AND = [{ rank: { equals: rankFilter } }];
      }
    }
    
    // เพิ่ม posCode filter
    if (posCodeFilter !== 'all') {
      const posCodeId = parseInt(posCodeFilter);
      if (!isNaN(posCodeId)) {
        if (where.AND) {
          where.AND.push({ posCodeId: { equals: posCodeId } });
        } else {
          where.AND = [{ posCodeId: { equals: posCodeId } }];
        }
      }
    }
    
    if (search) {
      const searchConditions = [
        { fullName: { contains: search } },
        { nationalId: { contains: search } },
        { positionNumber: { contains: search } },
        { position: { contains: search } },
        { notes: { contains: search } },
      ];
      
      if (where.AND || where.OR) {
        // ถ้ามี filter อื่นแล้ว ให้เพิ่ม search เข้าไป
        where.AND = where.AND ? [...where.AND, { OR: searchConditions }] : [{ OR: searchConditions }];
      } else {
        where.OR = searchConditions;
      }
    }

    // ถ้ามี swap filter ต้อง query ทั้งหมดก่อน แล้วค่อย paginate
    const shouldQueryAll = swapFilter !== 'all';
    
    // ดึงข้อมูล
    let personnelQuery = prisma.policePersonnel.findMany({
      where,
      ...(shouldQueryAll ? {} : {
        skip,
        take: limit,
      }),
      orderBy: { noId: 'asc' } as any,
      include: {
        posCodeMaster: true,
      },
    });

    const [personnel, total] = await Promise.all([
      personnelQuery,
      prisma.policePersonnel.count({ where }),
    ]);

    // Filter based on swap lists (server-side after fetching)
    let filteredPersonnel = personnel;
    
    if (swapFilter !== 'all') {
      const currentYear = new Date().getFullYear() + 543;
      const nationalIds = personnel.map(p => p.nationalId).filter(Boolean) as string[];

      if (swapFilter === 'in-swap') {
        // ใช้ swap_transaction_detail แทน swap_list
        const swapList = await prisma.swapTransactionDetail.findMany({
          where: {
            transaction: {
              year: currentYear,
              swapType: 'two-way'
            },
            nationalId: { in: nationalIds }
          },
          select: { nationalId: true },
          distinct: ['nationalId']
        });
        const swapNationalIds = new Set(swapList.map(s => s.nationalId).filter(Boolean));
        filteredPersonnel = personnel.filter(p => p.nationalId && swapNationalIds.has(p.nationalId));
      } else if (swapFilter === 'in-threeway') {
        // ใช้ swap_transaction_detail แทน swap_list
        const threeWayList = await prisma.swapTransactionDetail.findMany({
          where: {
            transaction: {
              year: currentYear,
              swapType: 'three-way'
            },
            nationalId: { in: nationalIds }
          },
          select: { nationalId: true },
          distinct: ['nationalId']
        });
        const threeWayNationalIds = new Set(threeWayList.map(s => s.nationalId).filter(Boolean));
        filteredPersonnel = personnel.filter(p => p.nationalId && threeWayNationalIds.has(p.nationalId));
      } else if (swapFilter === 'in-vacant') {
        const vacantList = await prisma.vacantPosition.findMany({
          where: {
            year: currentYear,
            nationalId: { in: nationalIds }
          },
          select: { nationalId: true }
        });
        const vacantNationalIds = new Set(vacantList.map(s => s.nationalId).filter(Boolean));
        filteredPersonnel = personnel.filter(p => p.nationalId && vacantNationalIds.has(p.nationalId));
      }
      
      // ทำ pagination หลังจาก filter แล้ว
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPersonnel = filteredPersonnel.slice(startIndex, endIndex);
      
      return NextResponse.json({
        success: true,
        data: paginatedPersonnel,
        pagination: {
          page,
          limit,
          total: filteredPersonnel.length,
          totalPages: Math.ceil(filteredPersonnel.length / limit),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: filteredPersonnel,
      pagination: {
        page,
        limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}
