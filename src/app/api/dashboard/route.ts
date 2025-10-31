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

    // สร้าง where clause สำหรับ VacantPosition filter
    const vacantPositionBaseWhere: any = {
      year: yearNumber
    };
    if (unit && unit !== 'all') {
      vacantPositionBaseWhere.unit = unit;
    }

    // นับจำนวนตำแหน่งที่จับคู่แล้ว (requested_position_id != null และ is_assigned = 1)
    const totalVacantPositions = await prisma.vacantPosition.count({
      where: { 
        ...vacantPositionBaseWhere,
        requestedPositionId: { not: null },
        isAssigned: true
      }
    });

    // นับจำนวนตำแหน่งที่จับคู่สำเร็จแล้ว (เหมือนกับ totalVacantPositions)
    const assignedPositions = totalVacantPositions;

    // นับจำนวนตำแหน่งที่รอดำเนินการ (requested_position_id != null และ is_assigned = 0)
    const pendingPositions = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionBaseWhere,
        requestedPositionId: { not: null },
        isAssigned: false
      }
    });

    // นับจำนวนผู้สมัครตำแหน่งว่าง (requested_position_id != null)
    const totalApplicants = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionBaseWhere,
        requestedPositionId: { not: null }
      }
    });

    // สร้าง where clause สำหรับ SwapList filter
    const swapListWhereClause: any = {
      year: yearNumber
    };
    if (unit && unit !== 'all') {
      swapListWhereClause.unit = unit;
    }

    // นับจำนวนรายการแลกเปลี่ยนทั้งหมด (ไม่มี unit filter เพราะ SwapTransaction ไม่มีฟิลด์ unit)
    const totalSwapTransactions = await prisma.swapTransaction.count({
      where: { year: yearNumber }
    });

    // นับจำนวนสลับตำแหน่ง two-way ทั้งหมด (จาก SwapList)
    const totalSwapList = await prisma.swapList.count({
      where: { 
        ...swapListWhereClause,
        swapType: 'two-way'
      }
    });

    // นับจำนวนสามเส้า three-way ทั้งหมด (จาก SwapList)
    const totalThreeWaySwap = await prisma.swapList.count({
      where: { 
        ...swapListWhereClause,
        swapType: 'three-way'
      }
    });

    // นับจำนวนคนที่สลับสำเร็จแล้วแบบ two-way (จาก SwapTransactionDetail)
    // กรองตาม fromUnit หรือ toUnit
    const completedSwapDetailWhereClause: any = {
      transaction: {
        year: yearNumber,
        swapType: 'two-way'
      }
    };
    if (unit && unit !== 'all') {
      completedSwapDetailWhereClause.OR = [
        { fromUnit: unit },
        { toUnit: unit }
      ];
    }
    const completedSwapCount = await prisma.swapTransactionDetail.count({
      where: completedSwapDetailWhereClause
    });

    // นับจำนวนคนที่สลับสำเร็จแล้วแบบ three-way (จาก SwapTransactionDetail)
    const completedThreeWayDetailWhereClause: any = {
      transaction: {
        year: yearNumber,
        swapType: 'three-way'
      }
    };
    if (unit && unit !== 'all') {
      completedThreeWayDetailWhereClause.OR = [
        { fromUnit: unit },
        { toUnit: unit }
      ];
    }
    const completedThreeWaySwapCount = await prisma.swapTransactionDetail.count({
      where: completedThreeWayDetailWhereClause
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
    // เพิ่ม filter unit ถ้ามี
    const topRequestedWhere: any = {
      year: yearNumber,
      requestedPositionId: { not: null }
    };
    if (unit && unit !== 'all') {
      topRequestedWhere.unit = unit;
    }

    const topRequestedPositionsData = await prisma.vacantPosition.groupBy({
      by: ['requestedPositionId'],
      where: topRequestedWhere,
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

    // ดึงชื่อตำแหน่งจาก PosCodeMaster พร้อมจำนวนตำแหน่งว่างจริง
    const topRequestedPositions = await Promise.all(
      topRequestedPositionsData.map(async (item) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: item.requestedPositionId! }
        });
        
        // ตำแหน่งว่าง: pos_code_id === requested_position_id AND requested_position_id === null AND is_assigned = 0
        const vacantWhereClause: any = {
          year: yearNumber,
          posCodeId: item.requestedPositionId,
          requestedPositionId: null,
          isAssigned: false
        };
        if (unit && unit !== 'all') {
          vacantWhereClause.unit = unit;
        }

        const availableSlots = await prisma.vacantPosition.count({
          where: vacantWhereClause
        });
        
        return {
          posCodeId: item.requestedPositionId!,
          posCodeName: posCode?.name || 'ไม่ระบุ',
          count: item._count.id,
          availableSlots // จำนวนตำแหน่งว่างที่แท้จริง
        };
      })
    );

    // สถิติแยกตามตำแหน่ง (Position Details) - ใช้ vacant_position เป็นหลัก
    // ดึงตำแหน่งทั้งหมดที่มีคนยื่นขอ
    const applicantWhereClause: any = {
      year: yearNumber,
      requestedPositionId: { not: null }
    };
    if (unit && unit !== 'all') {
      applicantWhereClause.unit = unit;
    }

    const allPositionsData = await prisma.vacantPosition.groupBy({
      by: ['requestedPositionId'],
      where: applicantWhereClause,
      _count: {
        id: true
      }
    });

    const positionDetails = await Promise.all(
      allPositionsData.map(async (item) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: item.requestedPositionId! }
        });

        // นับจำนวนผู้ยื่นขอตำแหน่งนี้
        const applicantFilter: any = {
          year: yearNumber,
          requestedPositionId: item.requestedPositionId,
        };
        if (unit && unit !== 'all') {
          applicantFilter.unit = unit;
        }

        const totalApplicants = item._count.id;

        // นับจำนวนที่จับคู่แล้ว
        const assignedCount = await prisma.vacantPosition.count({
          where: {
            ...applicantFilter,
            isAssigned: true
          }
        });

        // นับจำนวนที่รอจับคู่
        const pendingCount = await prisma.vacantPosition.count({
          where: {
            ...applicantFilter,
            isAssigned: false
          }
        });

        const assignmentRate = totalApplicants > 0 
          ? (assignedCount / totalApplicants) * 100 
          : 0;

        // ตำแหน่งว่าง: pos_code_id === requested_position_id AND requested_position_id === null AND is_assigned = 0
        const vacantFilter: any = {
          year: yearNumber,
          posCodeId: item.requestedPositionId,
          requestedPositionId: null,
          isAssigned: false
        };
        if (unit && unit !== 'all') {
          vacantFilter.unit = unit;
        }

        const availableSlots = await prisma.vacantPosition.count({
          where: vacantFilter
        });

        return {
          posCodeId: item.requestedPositionId!,
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

    // ข้อมูลกราฟ: เปรียบเทียบตำแหน่งว่างกับจับคู่สำเร็จ
    // ดึงทุก PosCode จาก PosCodeMaster
    const allPosCodes = await prisma.posCodeMaster.findMany({
      orderBy: { id: 'asc' }
    });

    // สร้าง where clause สำหรับ filter unit
    const chartBaseFilter: any = {
      year: yearNumber
    };
    if (unit && unit !== 'all') {
      chartBaseFilter.unit = unit;
    }

    // สร้างข้อมูลกราฟสำหรับทุก PosCode
    const chartDataByPosition = await Promise.all(
      allPosCodes.map(async (posCode) => {
        // นับตำแหน่งว่าง: pos_code_id === posCode.id AND requested_position_id === null AND is_assigned = false
        const vacantSlots = await prisma.vacantPosition.count({
          where: {
            ...chartBaseFilter,
            posCodeId: posCode.id,
            requestedPositionId: null,
            isAssigned: false
          }
        });

        // นับจับคู่สำเร็จ: requested_position_id === posCode.id AND is_assigned = true
        const assignedCount = await prisma.vacantPosition.count({
          where: {
            ...chartBaseFilter,
            requestedPositionId: posCode.id,
            isAssigned: true
          }
        });

        return {
          posCodeId: posCode.id,
          posCodeName: posCode.name,
          vacantSlots, // ตำแหน่งว่าง
          totalApplicants: assignedCount // จับคู่สำเร็จ
        };
      })
    );

    // เรียงตาม posCodeId
    const sortedChartData = chartDataByPosition.sort(
      (a, b) => a.posCodeId - b.posCodeId
    );

    // ดึงรายการหน่วยทั้งหมดสำหรับ filter จาก vacant_position และ swap_list
    const unitsFromVacant = await prisma.vacantPosition.findMany({
      where: {
        year: yearNumber,
        unit: { not: null }
      },
      select: { unit: true },
      distinct: ['unit']
    });

    const unitsFromSwap = await prisma.swapList.findMany({
      where: {
        year: yearNumber,
        unit: { not: null }
      },
      select: { unit: true },
      distinct: ['unit']
    });

    // รวมหน่วยจากทั้งสองแหล่ง
    const allUnitsSet = new Set<string>();
    unitsFromVacant.forEach(u => {
      if (u.unit) allUnitsSet.add(u.unit);
    });
    unitsFromSwap.forEach(u => {
      if (u.unit) allUnitsSet.add(u.unit);
    });

    const availableUnits = Array.from(allUnitsSet).sort();

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
