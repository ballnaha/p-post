import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VACANT_POSITION_NAMES = new Set([
  'ว่าง',
  'ว่าง (กันตำแหน่ง)',
  'ว่าง(กันตำแหน่ง)',
]);

function isVacantPosition(fullName: string | null | undefined) {
  if (!fullName) {
    return true;
  }

  return VACANT_POSITION_NAMES.has(fullName.trim());
}

function toPositionKey(unit: string | null | undefined, positionNumber: string | null | undefined) {
  if (!unit || !positionNumber) {
    return null;
  }

  return `${unit}|${positionNumber}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unit = searchParams.get('unit'); // เพิ่ม filter หน่วย
    
    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);

    // === คำนวณสถิติหลักจาก PolicePersonnel และ SwapTransactionDetail (เหมือน new-in-out) ===
    
    // สร้าง where clause สำหรับ PolicePersonnel filter
    const personnelBaseWhere: any = {
      year: yearNumber,
      isActive: true
    };
    if (unit && unit !== 'all') {
      personnelBaseWhere.unit = unit;
    }

    // ดึงข้อมูล personnel ทั้งหมดตาม filter
    const personnel = await prisma.policePersonnel.findMany({
      where: personnelBaseWhere,
      select: {
        id: true,
        fullName: true,
        unit: true,
        positionNumber: true,
        posCodeId: true,
      }
    });

    // ดึงข้อมูล swap details เพื่อหาตำแหน่งที่มีคนเข้ามาแทนแล้ว
    const swapDetails = await prisma.swapTransactionDetail.findMany({
      where: {
        transaction: {
          year: yearNumber
        }
      },
      select: {
        toUnit: true,
        toPositionNumber: true
      }
    });

    // สร้าง Set เก็บตำแหน่งที่มีคนเข้ามาแทนแล้ว (unit|positionNumber)
    const filledPositions = new Set<string>();
    swapDetails.forEach(detail => {
      if (detail.toUnit && detail.toPositionNumber) {
        filledPositions.add(`${detail.toUnit}|${detail.toPositionNumber}`);
      }
    });

    // นับตำแหน่งว่างทั้งหมดจาก personnel ที่ผ่าน filter แล้ว
    const vacantPersonnel = personnel.filter((p) => isVacantPosition(p.fullName));
    const totalVacantPositions = vacantPersonnel.length;

    const vacantStatsByPosCode = new Map<number, { totalVacant: number; matchedVacant: number }>();
    let vacantPositionsFilled = 0;

    vacantPersonnel.forEach((person) => {
      const posKey = toPositionKey(person.unit, person.positionNumber);
      const isFilled = posKey ? filledPositions.has(posKey) : false;

      if (isFilled) {
        vacantPositionsFilled++;
      }

      if (person.posCodeId == null) {
        return;
      }

      const currentStats = vacantStatsByPosCode.get(person.posCodeId) || {
        totalVacant: 0,
        matchedVacant: 0,
      };

      currentStats.totalVacant += 1;
      if (isFilled) {
        currentStats.matchedVacant += 1;
      }

      vacantStatsByPosCode.set(person.posCodeId, currentStats);
    });

    // จำนวนผู้สมัคร = จำนวนตำแหน่งว่างทั้งหมด
    const totalApplicants = totalVacantPositions;

    // จำนวนตำแหน่งว่างที่จับคู่ไปแล้ว
    const matchedVacantPositions = vacantPositionsFilled;

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
        swapType: 'two-way',
        isCompleted: true,
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
        swapType: 'three-way',
        isCompleted: true,
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
        swapType: 'transfer',
        isCompleted: true,
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

    // สถานะการจับคู่ (Completed vs Incomplete) - รวมทุกประเภท transaction
    const transactionStatusWhere: any = {
      year: yearNumber
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
        isCompleted: true,
        swapType: { not: 'board-layout' } // Exclude internal board-layout transactions
      }
    });

    const incompleteTransactionsCount = await prisma.swapTransaction.count({
      where: {
        ...transactionStatusWhere,
        isCompleted: false,
        swapType: { not: 'board-layout' } // Exclude internal board-layout transactions
      }
    });

    // Fetch transactions for drilldown
    const completedTransactions = await prisma.swapTransaction.findMany({
      where: {
        ...transactionStatusWhere,
        isCompleted: true,
        swapType: { not: 'board-layout' } // Exclude internal board-layout transactions
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
        isCompleted: false,
        swapType: { not: 'board-layout' } // Exclude internal board-layout transactions
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

    // === คำนวณข้อมูลสถิติตำแหน่งแยกตาม PosCode ===
    // ดึงทุก PosCode จาก PosCodeMaster ก่อน (เพื่อใช้ใน positionDetails)
    const allPosCodes = await prisma.posCodeMaster.findMany({
      orderBy: { id: 'asc' }
    });

    const positionDetailsAll = allPosCodes.map((posCode) => {
      const summary = vacantStatsByPosCode.get(posCode.id) || { totalVacant: 0, matchedVacant: 0 };
      const remainingVacant = Math.max(0, summary.totalVacant - summary.matchedVacant);
      const posCodeAssignmentRate = summary.totalVacant > 0
        ? (summary.matchedVacant / summary.totalVacant) * 100
        : 0;

      return {
        posCodeId: posCode.id,
        posCodeName: posCode.name || 'ไม่ระบุ',
        totalApplicants: summary.totalVacant,
        assignedCount: summary.matchedVacant,
        pendingCount: remainingVacant,
        assignmentRate: posCodeAssignmentRate,
        availableSlots: summary.totalVacant,
      };
    });

    // กรองให้แสดงเฉพาะ PosCode ที่มีข้อมูล (มีตำแหน่งว่างจริงๆ)
    const positionDetails = positionDetailsAll.filter(
      detail => detail.totalApplicants > 0
    );

    // คำนวณสรุปตำแหน่งว่างทั้งหมด
    const vacantSlotsSummary = {
      totalVacantSlots: totalVacantPositions, // ตำแหน่งว่างทั้งหมด (ว่าง + ว่างกันตำแหน่ง)
      filledSlots: vacantPositionsFilled, // จำนวนที่จับคู่แล้ว
      remainingSlots: pendingPositions // ตำแหน่งว่างที่รอจับคู่
    };

    // ข้อมูลกราฟ: เปรียบเทียบตำแหน่งว่างกับจับคู่สำเร็จ (จาก PolicePersonnel)
    // สร้างข้อมูลกราฟสำหรับทุก PosCode (ใช้ข้อมูลจาก PolicePersonnel เหมือน new-in-out และ positionDetails)
    const chartDataByPosition = allPosCodes.map((posCode) => {
      const summary = vacantStatsByPosCode.get(posCode.id) || { totalVacant: 0, matchedVacant: 0 };
      const remainingVacant = Math.max(0, summary.totalVacant - summary.matchedVacant);

      return {
        posCodeId: posCode.id,
        posCodeName: posCode.name,
        vacantSlots: remainingVacant,
        totalApplicants: summary.matchedVacant,
      };
    });

    // กรองและเรียงตาม posCodeId - แสดงเฉพาะ PosCode ที่มีข้อมูล
    const sortedChartData = chartDataByPosition
      .filter(item => (item.totalApplicants + item.vacantSlots) > 0)
      .sort((a, b) => a.posCodeId - b.posCodeId);

    // ดึงรายการหน่วยทั้งหมดสำหรับ filter จาก PolicePersonnel ที่ active ในปีนั้น
    const unitsFromPersonnel = await prisma.policePersonnel.findMany({
      where: {
        year: yearNumber,
        isActive: true,
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
    unitsFromPersonnel.forEach(u => {
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
      isActive: true,
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
        noId: true,
        nationalId: true,
        rank: true,
        fullName: true,
        age: true,
        position: true,
        positionNumber: true,
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
        seniority: true,
        education: true,
        birthDate: true,
        lastAppointment: true,
        currentRankSince: true,
        enrollmentDate: true,
        retirementDate: true,
        yearsOfService: true,
        actingAs: true,
        trainingLocation: true,
        trainingCourse: true,
        notes: true,
      },
      orderBy: [
        { posCodeId: 'asc' },
        { fullName: 'asc' }
      ],
    });

    // Check which personnel are matched (have toPosition in swap_transaction_detail)
    const matchedPersonnelWhere: any = {
      transaction: {
        year: yearNumber,
      },
      nationalId: {
        in: supportedPersonnel.map(p => p.nationalId).filter(Boolean) as string[]
      },
      AND: [
        {
          OR: [
            { toPosCodeId: { not: null } },
            { toPosition: { not: null } }
          ]
        }
      ]
    };

    if (unit && unit !== 'all') {
      matchedPersonnelWhere.AND.push({
        OR: [
          { fromUnit: unit },
          { toUnit: unit }
        ]
      });
    }

    const matchedPersonnelDetails = await prisma.swapTransactionDetail.findMany({
      where: matchedPersonnelWhere,
      select: {
        nationalId: true,
        transactionId: true,
        toPosition: true,
        toPositionNumber: true,
        toPosCodeId: true,
        toPosCodeMaster: {
          select: {
            id: true,
            name: true
          }
        },
        toUnit: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Create a map of nationalId to their latest matched position details
    const matchedDetailsMap = new Map();
    matchedPersonnelDetails.forEach(detail => {
      if (!matchedDetailsMap.has(detail.nationalId)) {
        matchedDetailsMap.set(detail.nationalId, detail);
      }
    });

    const matchedSet = new Set(matchedPersonnelDetails.map(m => m.nationalId));

    const dashboardStats = {
      totalVacantPositions,
      assignedPositions: matchedVacantPositions,
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
      supportedPersonnel: supportedPersonnel.map(person => {
        const matchedDetails = person.nationalId ? matchedDetailsMap.get(person.nationalId) : null;
        return {
          id: person.id,
          noId: person.noId,
          rank: person.rank,
          fullName: person.fullName,
          age: person.age,
          position: person.position,
          positionNumber: person.positionNumber,
          posCode: person.posCodeId?.toString() || null,
          posCodeName: person.posCodeMaster?.name || null,
          unit: person.unit,
          supporterName: person.supporterName,
          supportReason: person.supportReason,
          isMatched: person.nationalId ? matchedSet.has(person.nationalId) : false,
          newPosition: matchedDetails?.toPosition || null,
          newPositionNumber: matchedDetails?.toPositionNumber || null,
          newPosCode: matchedDetails?.toPosCodeId?.toString() || null,
          newPosCodeName: matchedDetails?.toPosCodeMaster?.name || null,
          newUnit: matchedDetails?.toUnit || null,
          transactionId: matchedDetails?.transactionId || null,
          nationalId: person.nationalId,
          seniority: person.seniority,
          education: person.education,
          birthDate: person.birthDate,
          lastAppointment: person.lastAppointment,
          currentRankSince: person.currentRankSince,
          enrollmentDate: person.enrollmentDate,
          retirementDate: person.retirementDate,
          yearsOfService: person.yearsOfService,
          actingAs: person.actingAs,
          trainingLocation: person.trainingLocation,
          trainingCourse: person.trainingCourse,
          notes: person.notes,
        };
      }) // เพิ่มข้อมูลผู้ได้รับการสนับสนุน (mapped fields)
    };

    return NextResponse.json({
      success: true,
      data: {
        totalVacantPositions,
        assignedPositions: matchedVacantPositions,
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
