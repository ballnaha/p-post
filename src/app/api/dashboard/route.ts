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

    // === คำนวณสถิติหลักจาก VacantPosition และ SwapTransactionDetail ===
    
    // สร้าง where clause สำหรับ VacantPosition filter
    const vacantPositionBaseWhere: any = {
      year: yearNumber
    };
    if (unit && unit !== 'all') {
      vacantPositionBaseWhere.unit = unit;
    }

    // นับตำแหน่งว่างทั้งหมดจาก VacantPosition
    const totalVacantPositions = await prisma.vacantPosition.count({
      where: vacantPositionBaseWhere
    });

    // นับตำแหน่งว่างที่จับคู่ไปแล้วจาก SwapTransactionDetail (promotion-chain)
    const promotionChainBaseWhere: any = {
      transaction: {
        year: yearNumber,
        swapType: 'promotion-chain'
      }
    };
    if (unit && unit !== 'all') {
      promotionChainBaseWhere.OR = [
        { fromUnit: unit },
        { toUnit: unit }
      ];
    }

    const assignedPositions = await prisma.swapTransactionDetail.count({
      where: promotionChainBaseWhere
    });

    // จำนวนผู้สมัคร = จำนวนตำแหน่งว่างทั้งหมด
    const totalApplicants = totalVacantPositions;

    // จำนวนตำแหน่งว่างที่จับคู่ไปแล้ว
    const matchedVacantPositions = assignedPositions;

    // จำนวนตำแหน่งว่างที่รอจับคู่ = ตำแหน่งว่างทั้งหมด - จับคู่ไปแล้ว
    const pendingPositions = Math.max(0, totalVacantPositions - matchedVacantPositions);

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

    // คำนวณอัตราความสำเร็จ (จับคู่แล้ว × 100 / ตำแหน่งว่าง)
    const assignmentRate = totalApplicants > 0 
      ? (matchedVacantPositions * 100 / totalApplicants)
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

    // สถิติแยกตามตำแหน่ง (Position Details) - ใช้ PolicePersonnel
    const personnelGroupWhere: any = {};
    if (unit && unit !== 'all') {
      personnelGroupWhere.unit = unit;
    }

    // === คำนวณข้อมูลสถิติตำแหน่งแยกตาม PosCode ===
    // ใช้เฉพาะข้อมูลจาก VacantPosition และ SwapTransactionDetail
    
    // ดึงรายการ PosCode ทั้งหมดที่มีใน VacantPosition ของปีที่เลือก
    const vacantPositionFilter: any = {
      year: yearNumber
    };
    if (unit && unit !== 'all') {
      vacantPositionFilter.unit = unit;
    }

    const posCodesWithVacancies = await prisma.vacantPosition.groupBy({
      by: ['posCodeId'],
      where: vacantPositionFilter,
      _count: {
        id: true
      }
    });

    const positionDetails = await Promise.all(
      posCodesWithVacancies.filter(item => item.posCodeId !== null).map(async (item) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: item.posCodeId! }
        });

        // นับจำนวนตำแหน่งว่างทั้งหมดของ PosCode นี้ (จาก VacantPosition)
        const vacantPositionsFilter: any = {
          year: yearNumber,
          posCodeId: item.posCodeId
        };
        if (unit && unit !== 'all') {
          vacantPositionsFilter.unit = unit;
        }

        const totalVacantPositions = await prisma.vacantPosition.count({
          where: vacantPositionsFilter
        });

        // นับจำนวนตำแหน่งว่างที่จับคู่ไปแล้ว (จาก SwapTransactionDetail promotion-chain)
        const promotionChainFilter: any = {
          transaction: {
            year: yearNumber,
            swapType: 'promotion-chain'
          },
          posCodeId: item.posCodeId
        };
        if (unit && unit !== 'all') {
          promotionChainFilter.OR = [
            { fromUnit: unit },
            { toUnit: unit }
          ];
        }

        const assignedCount = await prisma.swapTransactionDetail.count({
          where: promotionChainFilter
        });

        // นับจำนวนตำแหน่งว่างที่รอจับคู่ = ตำแหน่งว่างทั้งหมด - จับคู่ไปแล้ว
        const pendingCount = Math.max(0, totalVacantPositions - assignedCount);

        // คำนวณอัตราการจับคู่
        const assignmentRate = totalVacantPositions > 0 
          ? (assignedCount / totalVacantPositions) * 100 
          : 0;

        return {
          posCodeId: item.posCodeId,
          posCodeName: posCode?.name || 'ไม่ระบุ',
          totalApplicants: totalVacantPositions, // จำนวนตำแหน่งว่างทั้งหมด
          assignedCount, // จำนวนที่จับคู่แล้ว
          pendingCount, // จำนวนที่รอจับคู่
          assignmentRate, // อัตราการจับคู่
          availableSlots: totalVacantPositions // ตำแหน่งว่างที่มี
        };
      })
    );

    // คำนวณสรุปตำแหน่งว่างทั้งหมด
    const vacantSlotsSummary = {
      totalVacantSlots: totalVacantPositions, // ตำแหน่งว่างทั้งหมดจาก VacantPosition
      filledSlots: assignedPositions, // จำนวนที่จับคู่แล้ว
      remainingSlots: pendingPositions // ตำแหน่งว่างที่รอจับคู่
    };

    // ข้อมูลกราฟ: เปรียบเทียบตำแหน่งว่างกับจับคู่สำเร็จ (จาก PolicePersonnel)
    // ดึงทุก PosCode จาก PosCodeMaster
    const allPosCodes = await prisma.posCodeMaster.findMany({
      orderBy: { id: 'asc' }
    });

    // สร้าง where clause สำหรับ filter unit
    const chartBaseFilter: any = {};
    if (unit && unit !== 'all') {
      chartBaseFilter.unit = unit;
    }

    // สร้างข้อมูลกราฟสำหรับทุก PosCode (ใช้ข้อมูลจาก VacantPosition)
    const chartDataByPosition = await Promise.all(
      allPosCodes.map(async (posCode) => {
        // นับตำแหน่งว่างทั้งหมดของ posCode นี้ (จาก VacantPosition)
        const vacantPositionFilter: any = {
          year: yearNumber,
          posCodeId: posCode.id
        };
        if (unit && unit !== 'all') {
          vacantPositionFilter.unit = unit;
        }

        const totalVacantPositions = await prisma.vacantPosition.count({
          where: vacantPositionFilter
        });

        // นับจำนวนตำแหน่งว่างที่จับคู่ไปแล้ว (จาก promotion-chain)
        const promotionChainFilter: any = {
          transaction: {
            year: yearNumber,
            swapType: 'promotion-chain'
          },
          posCodeId: posCode.id
        };
        if (unit && unit !== 'all') {
          promotionChainFilter.OR = [
            { fromUnit: unit },
            { toUnit: unit }
          ];
        }

        const matchedVacant = await prisma.swapTransactionDetail.count({
          where: promotionChainFilter
        });

        // ตำแหน่งว่างที่เหลือ = ตำแหน่งว่างทั้งหมด - จับคู่ไปแล้ว
        const remainingVacant = Math.max(0, totalVacantPositions - matchedVacant);

        return {
          posCodeId: posCode.id,
          posCodeName: posCode.name,
          vacantSlots: remainingVacant, // ตำแหน่งว่างที่เหลือ (รอจับคู่)
          totalApplicants: matchedVacant // จับคู่ตำแหน่งว่างไปแล้ว
        };
      })
    );

    // เรียงตาม posCodeId
    const sortedChartData = chartDataByPosition.sort(
      (a, b) => a.posCodeId - b.posCodeId
    );

    // ดึงรายการหน่วยทั้งหมดสำหรับ filter จาก VacantPosition
    const unitsFromVacant = await prisma.vacantPosition.findMany({
      where: {
        year: yearNumber,
        unit: { not: null }
      },
      select: { unit: true },
      distinct: ['unit']
    });

    // รวมหน่วยจาก SwapTransactionDetail ด้วย
    const unitsFromSwap = await prisma.swapTransactionDetail.findMany({
      where: {
        transaction: {
          year: yearNumber
        },
        OR: [
          { fromUnit: { not: null } },
          { toUnit: { not: null } }
        ]
      },
      select: { fromUnit: true, toUnit: true },
    });

    // รวมหน่วยทั้งหมด
    const allUnitsSet = new Set<string>();
    unitsFromVacant.forEach(u => {
      if (u.unit) allUnitsSet.add(u.unit);
    });
    unitsFromSwap.forEach(u => {
      if (u.fromUnit) allUnitsSet.add(u.fromUnit);
      if (u.toUnit) allUnitsSet.add(u.toUnit);
    });

    const availableUnits = Array.from(allUnitsSet).sort();

    const dashboardStats = {
      totalVacantPositions,
      assignedPositions,
      pendingPositions,
      totalApplicants,
      matchedVacantPositions, // จำนวนตำแหน่งว่างที่จับคู่ไปแล้ว
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
