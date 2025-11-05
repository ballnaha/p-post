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

    // นับจำนวนผู้สมัครตำแหน่งว่างทั้งหมด
    const totalApplicants = await prisma.vacantPosition.count({
      where: vacantPositionBaseWhere
    });

    // นับจำนวนตำแหน่งที่จับคู่สำเร็จแล้ว (จาก swap_transaction_detail ที่มี toPosition ตรงกับตำแหน่งว่าง)
    // และกรองตาม unit ถ้ามี
    const assignedDetailWhereClause: any = {
      transaction: {
        year: yearNumber
      },
      toPosition: { not: null }
    };
    if (unit && unit !== 'all') {
      assignedDetailWhereClause.toUnit = unit;
    }
    const assignedPositions = await prisma.swapTransactionDetail.count({
      where: assignedDetailWhereClause
    });

    // จำนวนตำแหน่งว่างที่จับคู่แล้ว = assignedPositions
    const totalVacantPositions = assignedPositions;

    // จำนวนตำแหน่งที่รอดำเนินการ = ผู้สมัครทั้งหมด - ที่จับคู่แล้ว
    const pendingPositions = totalApplicants - assignedPositions;

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

    // นับจำนวนสลับตำแหน่ง two-way ทั้งหมด (จาก SwapTransactionDetail)
    const swapDetailWhereClause: any = {
      transaction: {
        year: yearNumber,
        swapType: 'two-way'
      }
    };
    if (unit && unit !== 'all') {
      swapDetailWhereClause.OR = [
        { fromUnit: unit },
        { toUnit: unit }
      ];
    }
    const totalSwapList = await prisma.swapTransactionDetail.count({
      where: swapDetailWhereClause
    });

    // นับจำนวนสามเส้า three-way ทั้งหมด (จาก SwapTransactionDetail)
    const threeWayDetailWhereClause: any = {
      transaction: {
        year: yearNumber,
        swapType: 'three-way'
      }
    };
    if (unit && unit !== 'all') {
      threeWayDetailWhereClause.OR = [
        { fromUnit: unit },
        { toUnit: unit }
      ];
    }
    const totalThreeWaySwap = await prisma.swapTransactionDetail.count({
      where: threeWayDetailWhereClause
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

    // นับจำนวนประเภทตำแหน่งที่มีในระบบ (จาก vacant_position)
    const uniquePositions = await prisma.vacantPosition.findMany({
      where: { year: yearNumber },
      select: { posCodeId: true },
      distinct: ['posCodeId']
    });
    const totalPositionTypes = uniquePositions.length;

    // คำนวณอัตราความสำเร็จ (จับคู่สำเร็จ × 100 / ผู้สมัคร)
    const assignmentRate = totalApplicants > 0 
      ? (assignedPositions * 100 / totalApplicants)
      : 0;

    // ตำแหน่งที่ได้รับความนิยมสูงสุด (Top 5) - จาก toPosition ใน swap_transaction_detail
    const topRequestedWhere: any = {
      transaction: {
        year: yearNumber
      },
      toPosition: { not: null }
    };
    if (unit && unit !== 'all') {
      topRequestedWhere.toUnit = unit;
    }

    const topRequestedPositionsData = await prisma.swapTransactionDetail.groupBy({
      by: ['toPosition'],
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

    // แปลงข้อมูลตำแหน่งที่ได้รับความนิยม
    const topRequestedPositions = topRequestedPositionsData.map((item) => {
      return {
        posCodeId: 0, // ไม่มี posCodeId เพราะ toPosition เป็น string
        posCodeName: item.toPosition || 'ไม่ระบุ',
        count: item._count.id,
        availableSlots: 0 // ไม่สามารถนับได้เพราะไม่มี relation กับ vacant_position
      };
    });

    // สถิติแยกตามตำแหน่ง (Position Details) - ใช้ vacant_position สำหรับจำนวนตำแหน่งว่าง
    // และ swap_transaction_detail สำหรับจำนวนที่จับคู่แล้ว
    const applicantWhereClause: any = {
      year: yearNumber
    };
    if (unit && unit !== 'all') {
      applicantWhereClause.unit = unit;
    }

    const allPositionsData = await prisma.vacantPosition.groupBy({
      by: ['posCodeId'],
      where: applicantWhereClause,
      _count: {
        id: true
      }
    });

    const positionDetails = await Promise.all(
      allPositionsData.filter(item => item.posCodeId !== null).map(async (item) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: item.posCodeId! }
        });

        // นับจำนวนตำแหน่งว่างทั้งหมด
        const vacantFilter: any = {
          year: yearNumber,
          posCodeId: item.posCodeId
        };
        if (unit && unit !== 'all') {
          vacantFilter.unit = unit;
        }

        const totalVacantSlots = item._count.id;

        // นับจำนวนที่จับคู่แล้ว (จาก swap_transaction_detail ที่ toPosition ตรงกับตำแหน่งนี้)
        const assignedFilter: any = {
          transaction: {
            year: yearNumber
          },
          toPosition: posCode?.name
        };
        if (unit && unit !== 'all') {
          assignedFilter.toUnit = unit;
        }

        const assignedCount = await prisma.swapTransactionDetail.count({
          where: assignedFilter
        });

        // นับจำนวนผู้สมัคร (ในที่นี้คือ totalVacantSlots เพราะ vacant_position แต่ละแถวคือ 1 ตำแหน่ง)
        const totalApplicants = totalVacantSlots;

        // คงเหลือ = ตำแหน่งว่างทั้งหมด - จับคู่แล้ว
        const pendingCount = Math.max(0, totalVacantSlots - assignedCount);

        const assignmentRate = totalApplicants > 0 
          ? (assignedCount / totalApplicants) * 100 
          : 0;

        return {
          posCodeId: item.posCodeId,
          posCodeName: posCode?.name || 'ไม่ระบุ',
          totalApplicants,
          assignedCount,
          pendingCount,
          assignmentRate,
          availableSlots: totalVacantSlots
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
        // นับตำแหน่งว่าง: pos_code_id === posCode.id
        const vacantSlots = await prisma.vacantPosition.count({
          where: {
            ...chartBaseFilter,
            posCodeId: posCode.id
          }
        });

        // นับจับคู่สำเร็จ: จำนวนคนที่ย้ายมาตำแหน่งนี้ (toPosition swap)
        // ใช้ SwapTransactionDetail ที่มี posCodeId === posCode.id
        const assignedCount = await prisma.swapTransactionDetail.count({
          where: {
            posCodeId: posCode.id,
            transaction: {
              year: yearNumber,
              status: 'completed'
            }
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

    // ดึงรายการหน่วยทั้งหมดสำหรับ filter จาก vacant_position และ swap_transaction_detail
    const unitsFromVacant = await prisma.vacantPosition.findMany({
      where: {
        year: yearNumber,
        unit: { not: null }
      },
      select: { unit: true },
      distinct: ['unit']
    });

    // ดึงหน่วยจาก swap_transaction_detail (fromUnit และ toUnit)
    const swapDetails = await prisma.swapTransactionDetail.findMany({
      where: {
        transaction: {
          year: yearNumber
        },
        OR: [
          { fromUnit: { not: null } },
          { toUnit: { not: null } }
        ]
      },
      select: { 
        fromUnit: true,
        toUnit: true
      }
    });

    // รวมหน่วยจากทั้งสองแหล่ง
    const allUnitsSet = new Set<string>();
    unitsFromVacant.forEach(u => {
      if (u.unit) allUnitsSet.add(u.unit);
    });
    swapDetails.forEach(s => {
      if (s.fromUnit) allUnitsSet.add(s.fromUnit);
      if (s.toUnit) allUnitsSet.add(s.toUnit);
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
