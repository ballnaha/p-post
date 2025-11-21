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

    // นับจำนวนย้ายหน่วย transfer ทั้งหมด (จาก SwapTransactionDetail)
    const transferDetailWhereClause: any = {
      transaction: {
        year: yearNumber,
        swapType: 'transfer'
      }
    };
    if (unit && unit !== 'all') {
      transferDetailWhereClause.OR = [
        { fromUnit: unit },
        { toUnit: unit }
      ];
    }
    const totalTransfer = await prisma.swapTransactionDetail.count({
      where: transferDetailWhereClause
    });

    // แยกประเภทการย้ายหน่วย (Cross-Unit vs Same-Unit)
    // ดึงข้อมูลรายละเอียดการย้ายหน่วยทั้งหมดเพื่อมาคำนวณแยกประเภท
    const transferDetails = await prisma.swapTransactionDetail.findMany({
      where: transferDetailWhereClause,
      select: { fromUnit: true, toUnit: true }
    });

    let transferCrossUnit = 0;
    let transferSameUnit = 0;

    transferDetails.forEach(detail => {
      if (detail.fromUnit && detail.toUnit) {
        if (detail.fromUnit !== detail.toUnit) {
          transferCrossUnit++;
        } else {
          transferSameUnit++;
        }
      } else {
        // กรณีข้อมูลไม่ครบ ถือว่าเป็น Cross Unit ไว้ก่อน (หรืออาจจะไม่นับ)
        // แต่ในบริบทนี้ ถ้าย้ายหน่วย ควรจะมี from/to unit
        // ถ้าไม่มี toUnit อาจจะเป็นการย้ายไปตำแหน่งว่างที่ยังไม่ระบุหน่วย?
        // นับเป็น Cross Unit ไปก่อน
        transferCrossUnit++;
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

    // นับจำนวนคนที่ย้ายหน่วยสำเร็จแล้ว (จาก SwapTransactionDetail)
    const completedTransferDetailWhereClause: any = {
      transaction: {
        year: yearNumber,
        swapType: 'transfer'
      }
    };
    if (unit && unit !== 'all') {
      completedTransferDetailWhereClause.OR = [
        { fromUnit: unit },
        { toUnit: unit }
      ];
    }
    const completedTransferCount = await prisma.swapTransactionDetail.count({
      where: completedTransferDetailWhereClause
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

    // สถานะการจับคู่ (Completed vs Incomplete)
    const transactionStatusWhere: any = {
      year: yearNumber,
      swapType: { in: ['transfer', 'promotion-chain'] }
    };
    
    // ถ้ามีการกรองหน่วย ต้องเช็คว่า transaction นั้นมี detail ที่เกี่ยวข้องกับหน่วยนั้นหรือไม่
    if (unit && unit !== 'all') {
      transactionStatusWhere.swapDetails = {
        some: {
          OR: [
            { fromUnit: unit },
            { toUnit: unit }
          ]
        }
      };
    }

    const completedTransactionsCount = await prisma.swapTransaction.count({
      where: {
        ...transactionStatusWhere,
        isCompleted: true
      }
    });

    const incompleteTransactionsCount = await prisma.swapTransaction.count({
      where: {
        ...transactionStatusWhere,
        isCompleted: false
      }
    });

    // Fetch transactions for drilldown
    const completedTransactions = await prisma.swapTransaction.findMany({
      where: {
        ...transactionStatusWhere,
        isCompleted: true
      },
      select: {
        id: true,
        groupName: true,
        groupNumber: true,
        swapType: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    const incompleteTransactions = await prisma.swapTransaction.findMany({
      where: {
        ...transactionStatusWhere,
        isCompleted: false
      },
      select: {
        id: true,
        groupName: true,
        groupNumber: true,
        swapType: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    const transactionStatusSummary = [
      {
        label: 'การจับคู่ที่สิ้นสุดแล้ว',
        count: completedTransactionsCount,
        type: 'completed',
        transactions: completedTransactions
      },
      {
        label: 'ยังไม่สิ้นสุด',
        count: incompleteTransactionsCount,
        type: 'incomplete',
        transactions: incompleteTransactions
      }
    ];

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

    // ดึงข้อมูล PolicePersonnel ที่มีผู้สนับสนุน (supporterName ไม่เป็น null และไม่ว่าง) หรือมีเหตุผล (supportReason ไม่เป็น null และไม่ว่าง)
    const supportedPersonnelWhere: any = {
      year: yearNumber,
      OR: [
        {
          AND: [
            { supporterName: { not: null } },
            { supporterName: { not: '' } }
          ]
        },
        {
          AND: [
            { supportReason: { not: null } },
            { supportReason: { not: '' } }
          ]
        }
      ]
    };

    if (unit && unit !== 'all') {
      supportedPersonnelWhere.unit = unit;
    }

    const supportedPersonnel = await prisma.policePersonnel.findMany({
      where: supportedPersonnelWhere,
      select: {
        id: true,
        nationalId: true,
        rank: true,
        fullName: true,
        age: true,
        position: true,
        posCodeId: true,
        posCodeMaster: {
          select: {
            id: true,
            name: true,
          }
        },
        unit: true,
        supporterName: true,
        supportReason: true,
      },
      orderBy: [
        { posCodeId: 'asc' },
        { fullName: 'asc' }
      ],
    });

    // Check which personnel are matched (have toPosition in swap_transaction_detail)
    const matchedNationalIds = await prisma.swapTransactionDetail.findMany({
      where: {
        nationalId: {
          in: supportedPersonnel.map(p => p.nationalId).filter(Boolean) as string[]
        },
        OR: [
          { toPosCodeId: { not: null } },
          { toPosition: { not: null } }
        ]
      },
      select: {
        nationalId: true
      },
      distinct: ['nationalId']
    });

    const matchedSet = new Set(matchedNationalIds.map(m => m.nationalId));

    const dashboardStats = {
      totalVacantPositions,
      assignedPositions,
      pendingPositions,
      totalApplicants,
      matchedVacantPositions, // จำนวนตำแหน่งว่างที่จับคู่ไปแล้ว
      totalSwapTransactions,
      totalSwapList, // เพิ่มจำนวนสลับตำแหน่งทั้งหมด
      totalThreeWaySwap, // เพิ่มจำนวนสามเส้าทั้งหมด
      totalTransfer, // เพิ่ม
      transferCrossUnit, // เพิ่ม
      transferSameUnit, // เพิ่ม
      completedSwapCount, // จำนวนคนที่สลับสำเร็จแล้วทั้งหมด
      completedThreeWaySwapCount, // จำนวนคนที่สลับสำเร็จแล้วแบบสามเส้า
      completedTransferCount, // เพิ่ม
      totalPositionTypes,
      assignmentRate,
      positionDetails,
      transactionStatusSummary, // เปลี่ยนจาก topRequestedPositions
      vacantSlotsSummary,
      chartData: sortedChartData, // ข้อมูลกราฟใหม่
      availableUnits, // รายการหน่วยสำหรับ filter
      supportedPersonnel: supportedPersonnel.map(person => ({
        id: person.id,
        rank: person.rank,
        fullName: person.fullName,
        age: person.age,
        position: person.position,
        posCode: person.posCodeId?.toString() || null,
        posCodeName: person.posCodeMaster?.name || null,
        unit: person.unit,
        supporterName: person.supporterName,
        supportReason: person.supportReason,
        isMatched: person.nationalId ? matchedSet.has(person.nationalId) : false,
      })) // เพิ่มข้อมูลผู้ได้รับการสนับสนุน (mapped fields)
    };

    return NextResponse.json({
      success: true,
      data: {
        totalVacantPositions,
        assignedPositions,
        pendingPositions,
        totalApplicants,
        matchedVacantPositions,
        totalSwapTransactions,
        totalSwapList,
        totalThreeWaySwap,
        totalTransfer,
        transferCrossUnit,
        transferSameUnit,
        completedSwapCount,
        completedThreeWaySwapCount,
        completedTransferCount,
        totalPositionTypes,
        assignmentRate,
        positionDetails,
        transactionStatusSummary, // เปลี่ยนจาก topRequestedPositions
        vacantSlotsSummary: {
          totalVacantSlots: totalVacantPositions,
          filledSlots: matchedVacantPositions,
          remainingSlots: pendingPositions
        },
        chartData: sortedChartData,
        availableUnits,
        supportedPersonnel: dashboardStats.supportedPersonnel // Use mapped data from dashboardStats
      }
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
