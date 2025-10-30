import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unit = searchParams.get('unit'); // เพิ่ม filter หน่วย
    
    console.log('Dashboard API called with year:', year, 'unit:', unit);
    
    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);
    console.log('Parsed yearNumber:', yearNumber);

    // นับจำนวนตำแหน่งที่จับคู่แล้ว (requested_position_id != null และ is_assigned = 1)
    const totalVacantPositions = await prisma.vacantPosition.count({
      where: { 
        year: yearNumber,
        requestedPositionId: { not: null },
        isAssigned: true
      }
    });

    // นับจำนวนตำแหน่งที่จับคู่สำเร็จแล้ว (เหมือนกับ totalVacantPositions)
    const assignedPositions = totalVacantPositions;

    // นับจำนวนตำแหน่งที่รอดำเนินการ (requested_position_id != null และ is_assigned = 0)
    const pendingPositions = await prisma.vacantPosition.count({
      where: {
        year: yearNumber,
        requestedPositionId: { not: null },
        isAssigned: false
      }
    });

    // นับจำนวนผู้สมัครตำแหน่งว่าง (requested_position_id != null)
    const totalApplicants = await prisma.vacantPosition.count({
      where: {
        year: yearNumber,
        requestedPositionId: { not: null }
      }
    });

    // นับจำนวนรายการแลกเปลี่ยน
    const totalSwapTransactions = await prisma.swapTransaction.count({
      where: { year: yearNumber }
    });

    // นับจำนวนสลับตำแหน่ง two-way ทั้งหมด (จาก SwapList)
    const totalSwapList = await prisma.swapList.count({
      where: { 
        year: yearNumber,
        swapType: 'two-way'
      }
    });

    // นับจำนวนสามเส้า three-way ทั้งหมด (จาก SwapList)
    const totalThreeWaySwap = await prisma.swapList.count({
      where: { 
        year: yearNumber,
        swapType: 'three-way'
      }
    });

    // นับจำนวนคนที่สลับสำเร็จแล้วแบบ two-way (จาก SwapTransactionDetail)
    const completedSwapCount = await prisma.swapTransactionDetail.count({
      where: {
        transaction: {
          year: yearNumber,
          swapType: 'two-way'
        }
      }
    });

    // นับจำนวนคนที่สลับสำเร็จแล้วแบบ three-way (จาก SwapTransactionDetail)
    const completedThreeWaySwapCount = await prisma.swapTransactionDetail.count({
      where: {
        transaction: {
          year: yearNumber,
          swapType: 'three-way'
        }
      }
    });

    // นับจำนวนประเภทตำแหน่งที่มีการยื่นขอ
    const uniquePositions = await prisma.vacantPosition.findMany({
      where: { year: yearNumber },
      select: { requestedPositionId: true },
      distinct: ['requestedPositionId']
    });
    const totalPositionTypes = uniquePositions.filter(p => p.requestedPositionId !== null).length;

    // คำนวณอัตราความสำเร็จ (จับคู่สำเร็จ × 100 / ผู้สมัคร)
    const assignmentRate = totalApplicants > 0 
      ? (assignedPositions * 100 / totalApplicants)
      : 0;

    // ตำแหน่งที่ได้รับความนิยมสูงสุด (Top 5)
    const topRequestedPositionsData = await prisma.vacantPosition.groupBy({
      by: ['requestedPositionId'],
      where: {
        year: yearNumber,
        requestedPositionId: { not: null }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    // ดึงชื่อตำแหน่งจาก PosCodeMaster พร้อมจำนวนที่จับคู่แล้ว
    const topRequestedPositions = await Promise.all(
      topRequestedPositionsData.map(async (item) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: item.requestedPositionId! }
        });
        
        // นับจำนวนที่จับคู่แล้วสำหรับตำแหน่งนี้
        const assignedForThisPosition = await prisma.vacantPosition.count({
          where: {
            year: yearNumber,
            requestedPositionId: item.requestedPositionId,
            isAssigned: true
          }
        });
        
        return {
          posCodeId: item.requestedPositionId!,
          posCodeName: posCode?.name || 'ไม่ระบุ',
          count: item._count.id,
          availableSlots: item._count.id - assignedForThisPosition // คำนวณจากจำนวนคนสมัคร - คนที่จับคู่แล้ว
        };
      })
    );

    // สถิติแยกตามตำแหน่ง (Position Details) - ดึงจาก police_personnel
    // สร้าง where clause สำหรับ filter
    const personnelFilter: any = {
      posCodeId: { not: null },
      OR: [
        { fullName: null },
        { fullName: '' },
        { fullName: 'ว่าง' },
        { fullName: 'ว่าง (กันตำแหน่ง)' },
        { fullName: 'ว่าง(กันตำแหน่ง)' }
      ]
    };

    // เพิ่ม filter หน่วยถ้ามี
    if (unit && unit !== 'all') {
      personnelFilter.unit = unit;
    }

    // นับตำแหน่งว่างจาก police_personnel แยกตาม posCodeId
    const allPositionsData = await prisma.policePersonnel.groupBy({
      by: ['posCodeId'],
      where: personnelFilter,
      _count: {
        id: true
      }
    });

    const positionDetails = await Promise.all(
      allPositionsData.map(async (item) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: item.posCodeId! }
        });

        // นับจำนวนผู้ยื่นขอตำแหน่งนี้ (จาก vacant_position)
        const applicantWhereClause: any = {
          year: yearNumber,
          requestedPositionId: item.posCodeId,
        };
        if (unit && unit !== 'all') {
          applicantWhereClause.unit = unit;
        }

        const totalApplicants = await prisma.vacantPosition.count({
          where: applicantWhereClause
        });

        // นับจำนวนที่จับคู่แล้ว
        const assignedCount = await prisma.vacantPosition.count({
          where: {
            ...applicantWhereClause,
            isAssigned: true
          }
        });

        // นับจำนวนที่รอจับคู่
        const pendingCount = await prisma.vacantPosition.count({
          where: {
            ...applicantWhereClause,
            isAssigned: false
          }
        });

        const assignmentRate = totalApplicants > 0 
          ? (assignedCount / totalApplicants) * 100 
          : 0;

        // ตำแหน่งว่างจริง (จาก police_personnel)
        const availableSlots = item._count.id;

        return {
          posCodeId: item.posCodeId!,
          posCodeName: posCode?.name || 'ไม่ระบุ',
          totalApplicants,
          assignedCount,
          pendingCount,
          assignmentRate,
          availableSlots
        };
      })
    );

    // คำนวณสรุปตำแหน่งว่างทั้งหมด
    const vacantSlotsSummary = {
      totalVacantSlots: totalVacantPositions, // จำนวนคนที่ยื่นขอทั้งหมด
      filledSlots: assignedPositions, // จำนวนที่จับคู่แล้ว
      remainingSlots: pendingPositions // จำนวนที่รอจับคู่
    };

    // ข้อมูลกราฟ: ตำแหน่งว่างจาก police_personnel vs ผู้ยื่นขอตำแหน่ง
    // สร้าง where clause สำหรับ filter หน่วย
    const unitFilter = unit && unit !== 'all' ? { unit } : {};

    // นับตำแหน่งว่างจาก police_personnel
    // ตำแหน่งว่าง = fullName เป็น null, '', "ว่าง", "ว่าง (กันตำแหน่ง)", "ว่าง(กันตำแหน่ง)"
    const vacantPositionsFromPersonnel = await prisma.policePersonnel.groupBy({
      by: ['posCodeId'],
      where: {
        posCodeId: { not: null },
        OR: [
          { fullName: null },
          { fullName: '' },
          { fullName: 'ว่าง' },
          { fullName: 'ว่าง (กันตำแหน่ง)' },
          { fullName: 'ว่าง(กันตำแหน่ง)' }
        ],
        ...unitFilter
      },
      _count: {
        id: true
      }
    });

    // นับผู้ยื่นขอตำแหน่งจาก vacant_position แยกตาม requestedPositionId
    const applicantsByPosition = await prisma.vacantPosition.groupBy({
      by: ['requestedPositionId'],
      where: {
        year: yearNumber,
        requestedPositionId: { not: null },
        ...(unit && unit !== 'all' ? { unit } : {})
      },
      _count: {
        id: true
      }
    });

    // รวมข้อมูลทั้งสอง
    const chartDataByPosition = await Promise.all(
      vacantPositionsFromPersonnel.map(async (vacantPos) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: vacantPos.posCodeId! }
        });

        // หาจำนวนผู้สมัครสำหรับตำแหน่งนี้
        const applicants = applicantsByPosition.find(
          app => app.requestedPositionId === vacantPos.posCodeId
        );

        return {
          posCodeId: vacantPos.posCodeId!,
          posCodeName: posCode?.name || 'ไม่ระบุ',
          vacantSlots: vacantPos._count.id, // ตำแหน่งว่างจริงจาก police_personnel
          totalApplicants: applicants?._count.id || 0 // ผู้ยื่นขอ
        };
      })
    );

    // เพิ่มตำแหน่งที่มีคนสมัครแต่ไม่มีในตำแหน่งว่าง
    for (const app of applicantsByPosition) {
      const exists = chartDataByPosition.find(
        item => item.posCodeId === app.requestedPositionId
      );
      
      if (!exists) {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: app.requestedPositionId! }
        });
        
        chartDataByPosition.push({
          posCodeId: app.requestedPositionId!,
          posCodeName: posCode?.name || 'ไม่ระบุ',
          vacantSlots: 0,
          totalApplicants: app._count.id
        });
      }
    }

    // เรียงตามจำนวนผู้สมัครมากสุด
    const sortedChartData = chartDataByPosition.sort(
      (a, b) => b.totalApplicants - a.totalApplicants
    );

    // ดึงรายการหน่วยทั้งหมดสำหรับ filter
    const allUnits = await prisma.policePersonnel.findMany({
      where: {
        unit: { not: null }
      },
      select: { unit: true },
      distinct: ['unit'],
      orderBy: { unit: 'asc' }
    });

    const availableUnits = allUnits
      .filter(u => u.unit !== null)
      .map(u => u.unit as string);

    const dashboardStats = {
      totalVacantPositions,
      assignedPositions,
      pendingPositions,
      totalApplicants,
      totalSwapTransactions,
      totalSwapList, // เพิ่มจำนวนสลับตำแหน่งทั้งหมด
      totalThreeWaySwap, // เพิ่มจำนวนสามเส้าทั้งหมด
      completedSwapCount, // จำนวนคนที่สลับสำเร็จแล้วทั้งหมด
      completedThreeWaySwapCount, // จำนวนคนที่สลับสำเร็จแล้วแบบสามเส้า
      totalPositionTypes,
      assignmentRate,
      positionDetails,
      topRequestedPositions,
      vacantSlotsSummary,
      chartData: sortedChartData, // ข้อมูลกราฟใหม่
      availableUnits // รายการหน่วยสำหรับ filter
    };

    return NextResponse.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
