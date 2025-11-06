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

    // === คำนวณจับคู่ตำแหน่งกับบุคลากร (จาก PolicePersonnel) ===
    // สร้าง where clause สำหรับ PolicePersonnel filter
    const personnelBaseWhere: any = {};
    if (unit && unit !== 'all') {
      personnelBaseWhere.unit = unit;
    }

    // นับตำแหน่งทั้งหมดในระบบ (จาก PolicePersonnel)
    const totalPositionsInSystem = await prisma.policePersonnel.count({
      where: personnelBaseWhere
    });

    // นับตำแหน่งที่มีคนดำรงตำแหน่ง (NOT vacant)
    const assignedPositions = await prisma.policePersonnel.count({
      where: {
        ...personnelBaseWhere,
        AND: [
          { fullName: { not: null } },
          { fullName: { not: 'ว่าง' } },
          { fullName: { not: 'ว่าง (กันตำแหน่ง)' } },
          { rank: { not: null } }
        ]
      }
    });

    // นับตำแหน่งว่าง (fullName = null || 'ว่าง' || 'ว่าง (กันตำแหน่ง)' || rank = null)
    const totalVacantPositions = await prisma.policePersonnel.count({
      where: {
        ...personnelBaseWhere,
        OR: [
          { fullName: null },
          { fullName: 'ว่าง' },
          { fullName: 'ว่าง (กันตำแหน่ง)' },
          { rank: null }
        ]
      }
    });

    // จำนวนผู้สมัคร = จำนวนตำแหน่งว่างทั้งหมด
    const totalApplicants = totalVacantPositions;

    // นับจำนวนตำแหน่งว่างที่จับคู่ไปแล้ว (จาก SwapTransactionDetail ที่ swapType = 'promotion-chain')
    const promotionChainWhereClause: any = {
      transaction: {
        year: yearNumber,
        swapType: 'promotion-chain'
      }
    };
    if (unit && unit !== 'all') {
      promotionChainWhereClause.OR = [
        { fromUnit: unit },
        { toUnit: unit }
      ];
    }

    // จำนวนตำแหน่งว่างที่จับคู่ไปแล้ว
    const matchedVacantPositions = await prisma.swapTransactionDetail.count({
      where: promotionChainWhereClause
    });

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

    // Group by posCodeId จาก PolicePersonnel
    const allPositionsData = await prisma.policePersonnel.groupBy({
      by: ['posCodeId'],
      where: personnelGroupWhere,
      _count: {
        id: true
      }
    });

    const positionDetails = await Promise.all(
      allPositionsData.filter(item => item.posCodeId !== null).map(async (item) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: item.posCodeId! }
        });

        // นับตำแหน่งทั้งหมดของ posCode นี้
        const totalPositionsFilter: any = {
          posCodeId: item.posCodeId
        };
        if (unit && unit !== 'all') {
          totalPositionsFilter.unit = unit;
        }

        const totalPositions = await prisma.policePersonnel.count({
          where: totalPositionsFilter
        });

        // นับจำนวนที่มีคนดำรงตำแหน่ง (NOT vacant)
        const assignedCount = await prisma.policePersonnel.count({
          where: {
            ...totalPositionsFilter,
            AND: [
              { fullName: { not: null } },
              { fullName: { not: 'ว่าง' } },
              { fullName: { not: 'ว่าง (กันตำแหน่ง)' } },
              { rank: { not: null } }
            ]
          }
        });

        // นับจำนวนตำแหน่งว่าง (fullName = null || 'ว่าง' || 'ว่าง (กันตำแหน่ง)' || rank = null)
        const pendingCount = await prisma.policePersonnel.count({
          where: {
            ...totalPositionsFilter,
            OR: [
              { fullName: null },
              { fullName: 'ว่าง' },
              { fullName: 'ว่าง (กันตำแหน่ง)' },
              { rank: null }
            ]
          }
        });

        // นับผู้สมัครจาก VacantPosition
        const applicantFilter: any = {
          year: yearNumber,
          posCodeId: item.posCodeId
        };
        if (unit && unit !== 'all') {
          applicantFilter.unit = unit;
        }

        const totalApplicants = await prisma.vacantPosition.count({
          where: applicantFilter
        });

        const assignmentRate = totalPositions > 0 
          ? (assignedCount / totalPositions) * 100 
          : 0;

        return {
          posCodeId: item.posCodeId,
          posCodeName: posCode?.name || 'ไม่ระบุ',
          totalApplicants,
          assignedCount,
          pendingCount,
          assignmentRate,
          availableSlots: pendingCount // ตำแหน่งว่างที่มี
        };
      })
    );

    // คำนวณสรุปตำแหน่งว่างทั้งหมด
    const vacantSlotsSummary = {
      totalVacantSlots: totalPositionsInSystem, // ตำแหน่งทั้งหมดในระบบ
      filledSlots: assignedPositions, // จำนวนที่มีคนดำรงตำแหน่ง
      remainingSlots: totalVacantPositions // ตำแหน่งว่าง (fullName = null)
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

    // สร้างข้อมูลกราฟสำหรับทุก PosCode
    const chartDataByPosition = await Promise.all(
      allPosCodes.map(async (posCode) => {
        // นับตำแหน่งว่างทั้งหมดของ posCode นี้
        const totalVacantPositions = await prisma.policePersonnel.count({
          where: {
            ...chartBaseFilter,
            posCodeId: posCode.id,
            OR: [
              { fullName: null },
              { fullName: 'ว่าง' },
              { fullName: 'ว่าง (กันตำแหน่ง)' },
              { rank: null }
            ]
          }
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

    // ดึงรายการหน่วยทั้งหมดสำหรับ filter จาก PolicePersonnel
    const unitsFromPersonnel = await prisma.policePersonnel.findMany({
      where: {
        unit: { not: null }
      },
      select: { unit: true },
      distinct: ['unit']
    });

    // รวมหน่วยจาก VacantPosition ด้วย
    const unitsFromVacant = await prisma.vacantPosition.findMany({
      where: {
        year: yearNumber,
        unit: { not: null }
      },
      select: { unit: true },
      distinct: ['unit']
    });

    // รวมหน่วยทั้งหมด
    const allUnitsSet = new Set<string>();
    unitsFromPersonnel.forEach(u => {
      if (u.unit) allUnitsSet.add(u.unit);
    });
    unitsFromVacant.forEach(u => {
      if (u.unit) allUnitsSet.add(u.unit);
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
