import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    
    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);

    // นับจำนวนรายการยื่นขอตำแหน่งทั้งหมด
    const totalVacantPositions = await prisma.vacantPosition.count({
      where: { year: yearNumber }
    });

    // นับจำนวนรายการที่จับคู่แล้ว
    const assignedPositions = await prisma.vacantPosition.count({
      where: { 
        year: yearNumber,
        isAssigned: true 
      }
    });

    // นับจำนวนรายการที่รอจับคู่
    const pendingPositions = await prisma.vacantPosition.count({
      where: { 
        year: yearNumber,
        isAssigned: false 
      }
    });

    // นับจำนวนผู้ยื่นขอตำแหน่ง (unique nationalId)
    const uniqueApplicants = await prisma.vacantPosition.findMany({
      where: { year: yearNumber },
      select: { nationalId: true },
      distinct: ['nationalId']
    });
    const totalApplicants = uniqueApplicants.length;

    // นับจำนวนรายการแลกเปลี่ยน
    const totalSwapTransactions = await prisma.swapTransaction.count({
      where: { year: yearNumber }
    });

    // นับจำนวนประเภทตำแหน่งที่มีการยื่นขอ
    const uniquePositions = await prisma.vacantPosition.findMany({
      where: { year: yearNumber },
      select: { requestedPositionId: true },
      distinct: ['requestedPositionId']
    });
    const totalPositionTypes = uniquePositions.filter(p => p.requestedPositionId !== null).length;

    // คำนวณอัตราความสำเร็จ
    const assignmentRate = totalVacantPositions > 0 
      ? (assignedPositions / totalVacantPositions) * 100 
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

    // สถิติแยกตามตำแหน่ง (Position Details)
    const allPositionsData = await prisma.vacantPosition.groupBy({
      by: ['requestedPositionId'],
      where: {
        year: yearNumber,
        requestedPositionId: { not: null }
      },
      _count: {
        id: true
      }
    });

    const positionDetails = await Promise.all(
      allPositionsData.map(async (item) => {
        const posCode = await prisma.posCodeMaster.findUnique({
          where: { id: item.requestedPositionId! }
        });

        // นับจำนวนที่จับคู่แล้ว
        const assignedCount = await prisma.vacantPosition.count({
          where: {
            year: yearNumber,
            requestedPositionId: item.requestedPositionId,
            isAssigned: true
          }
        });

        // นับจำนวนที่รอจับคู่
        const pendingCount = await prisma.vacantPosition.count({
          where: {
            year: yearNumber,
            requestedPositionId: item.requestedPositionId,
            isAssigned: false
          }
        });

        const totalApplicants = item._count.id;
        const assignmentRate = totalApplicants > 0 
          ? (assignedCount / totalApplicants) * 100 
          : 0;

        // คำนวณตำแหน่งว่างที่เหลือ (จำนวนคนที่รอจับคู่)
        const availableSlots = pendingCount;

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

    const dashboardStats = {
      totalVacantPositions,
      assignedPositions,
      pendingPositions,
      totalApplicants,
      totalSwapTransactions,
      totalPositionTypes,
      assignmentRate,
      positionDetails,
      topRequestedPositions,
      vacantSlotsSummary
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
