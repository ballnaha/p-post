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
    const supporterFilter = searchParams.get('supporter') || 'all';
    const transactionTypeFilter = searchParams.get('transactionType') || 'all';
    
    // เพิ่ม year และ isActive filters (default = ปีปัจจุบัน และ active เท่านั้น)
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const yearParam = searchParams.get('year');
    const yearFilter = yearParam ? parseInt(yearParam) : currentBuddhistYear;
    const isActiveParam = searchParams.get('isActive');
    const isActiveFilter = isActiveParam === 'false' ? false : true; // default = true

    const skip = (page - 1) * limit;

    // สร้าง where clause สำหรับค้นหา
    const where: any = {
      year: yearFilter,
      isActive: isActiveFilter
    };
    
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
    
    // เพิ่ม supporter filter
    if (supporterFilter === 'with-supporter') {
      if (where.AND) {
        where.AND.push({
          AND: [
            { supporterName: { not: null } },
            { supporterName: { not: '' } }
          ]
        });
      } else {
        where.AND = [{
          AND: [
            { supporterName: { not: null } },
            { supporterName: { not: '' } }
          ]
        }];
      }
    } else if (supporterFilter === 'no-supporter') {
      if (where.AND) {
        where.AND.push({
          OR: [
            { supporterName: { equals: null } },
            { supporterName: { equals: '' } }
          ]
        });
      } else {
        where.AND = [{
          OR: [
            { supporterName: { equals: null } },
            { supporterName: { equals: '' } }
          ]
        }];
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

    // ถ้ามี swap filter หรือ transaction type filter ต้อง query ทั้งหมดก่อน แล้วค่อย paginate
    const shouldQueryAll = swapFilter !== 'all' || transactionTypeFilter !== 'all';
    
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

    // Filter based on swap lists and transaction types (server-side after fetching)
    let filteredPersonnel = personnel;
    
    if (swapFilter !== 'all' || transactionTypeFilter !== 'all') {
      const currentYear = new Date().getFullYear() + 543;
      const nationalIds = personnel.map(p => p.nationalId).filter(Boolean) as string[];

      // Handle transaction type filter
      if (transactionTypeFilter !== 'all') {
        if (transactionTypeFilter === 'two-way') {
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
        } else if (transactionTypeFilter === 'three-way') {
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
        } else if (transactionTypeFilter === 'promotion-chain') {
          const promotionList = await prisma.swapTransactionDetail.findMany({
            where: {
              transaction: {
                year: currentYear,
                swapType: 'promotion-chain'
              },
              nationalId: { in: nationalIds }
            },
            select: { nationalId: true },
            distinct: ['nationalId']
          });
          const promotionNationalIds = new Set(promotionList.map((s: { nationalId: string | null }) => s.nationalId).filter(Boolean));
          filteredPersonnel = personnel.filter(p => p.nationalId && promotionNationalIds.has(p.nationalId));
        }
      }
      // Handle legacy swapFilter (for backwards compatibility)
      else if (swapFilter === 'in-swap') {
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

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบว่าเป็น admin
    const authCheck = await checkAdminAuth();
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const body = await request.json();
    const currentYear = new Date().getFullYear() + 543;
    const username = authCheck.session?.user?.username || 'system';

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!body.fullName) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุชื่อ-สกุล' },
        { status: 400 }
      );
    }

    // ดึงค่า noId สุดท้าย และ +1
    const lastPersonnel = await prisma.policePersonnel.findFirst({
      where: {
        year: currentYear,
        noId: { not: null }
      },
      orderBy: {
        noId: 'desc'
      },
      select: {
        noId: true
      }
    });

    const nextNoId = lastPersonnel?.noId ? lastPersonnel.noId + 1 : 1;

    // สร้างข้อมูลใหม่
    const newPersonnel = await prisma.policePersonnel.create({
      data: {
        year: currentYear,
        isActive: true,
        noId: nextNoId,
        posCodeId: body.posCodeId,
        position: body.position,
        positionNumber: body.positionNumber,
        unit: body.unit,
        rank: body.rank,
        fullName: body.fullName,
        nationalId: body.nationalId,
        birthDate: body.birthDate,
        age: body.age,
        seniority: body.seniority,
        education: body.education,
        lastAppointment: body.lastAppointment,
        currentRankSince: body.currentRankSince,
        enrollmentDate: body.enrollmentDate,
        retirementDate: body.retirementDate,
        yearsOfService: body.yearsOfService,
        trainingLocation: body.trainingLocation,
        trainingCourse: body.trainingCourse,
        notes: body.notes,
        actingAs: body.actingAs,
        supporterName: body.supporterName,
        supportReason: body.supportReason,
        createdBy: username,
        updatedBy: username,
      },
    });

    return NextResponse.json({
      success: true,
      data: newPersonnel,
    });
  } catch (error: any) {
    console.error('Create error:', error);
    
    // Check for unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'มีข้อมูลบุคลากรนี้ในปีปัจจุบันแล้ว (เลขบัตรประชาชนซ้ำ)' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}
