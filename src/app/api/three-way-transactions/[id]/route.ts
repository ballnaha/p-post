import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงข้อมูล three-way transaction ตาม ID (ใช้ SwapTransaction)
// Optimized: Selective field selection for better performance
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const transaction = await prisma.swapTransaction.findUnique({
      where: { 
        id: id,
      },
      select: {
        id: true,
        groupNumber: true,
        groupName: true,
        swapDate: true,
        status: true,
        notes: true,
        year: true,
        swapType: true,
        createdAt: true,
        swapDetails: {
          select: {
            id: true,
            personnelId: true,
            noId: true,
            fullName: true,
            rank: true,
            seniority: true,
            nationalId: true,
            posCodeId: true,
            posCodeMaster: {
              select: {
                id: true,
                name: true,
              }
            },
            // ข้อมูลส่วนตัว
            birthDate: true,
            age: true,
            education: true,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: true,
            currentRankSince: true,
            enrollmentDate: true,
            retirementDate: true,
            yearsOfService: true,
            // ข้อมูลการฝึกอบรม
            trainingLocation: true,
            trainingCourse: true,
            // ตำแหน่ง
            fromPosition: true,
            fromPositionNumber: true,
            fromUnit: true,
            fromActingAs: true,
            toPosition: true,
            toPositionNumber: true,
            toUnit: true,
            toActingAs: true,
            sequence: true,
            notes: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!transaction || transaction.swapType !== 'three-way') {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Error fetching three-way transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไข three-way transaction (ใช้ SwapTransaction)
// Optimized: Better validation and selective field return
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { year, swapDate, groupName, groupNumber, status, notes, swapDetails } = body;

    // Validate: ต้องมี 3 คน
    if (swapDetails && swapDetails.length !== 3) {
      return NextResponse.json(
        { success: false, error: 'Three-way swap must have exactly 3 people' },
        { status: 400 }
      );
    }

    // Validate all personnel have required fields if swapDetails provided
    if (swapDetails) {
      const hasInvalidDetail = swapDetails.some((detail: any) => 
        !detail.personnelId || !detail.fullName
      );
      if (hasInvalidDetail) {
        return NextResponse.json(
          { success: false, error: 'All personnel must have ID and full name' },
          { status: 400 }
        );
      }
    }

    // ลบ details เก่าและสร้างใหม่
    const transaction = await prisma.swapTransaction.update({
      where: { id: id },
      data: {
        year,
        swapDate: swapDate ? new Date(swapDate) : undefined,
        swapType: 'three-way',
        groupName,
        groupNumber,
        status,
        notes,
        swapDetails: swapDetails ? {
          deleteMany: {},
          create: swapDetails.map((detail: any, index: number) => ({
            sequence: index + 1,
            personnelId: detail.personnelId,
            noId: detail.noId,
            nationalId: detail.nationalId,
            fullName: detail.fullName,
            rank: detail.rank,
            seniority: detail.seniority,
            posCodeId: detail.posCodeId,
            // ข้อมูลส่วนตัว
            birthDate: detail.birthDate,
            age: detail.age,
            education: detail.education,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: detail.lastAppointment,
            currentRankSince: detail.currentRankSince,
            enrollmentDate: detail.enrollmentDate,
            retirementDate: detail.retirementDate,
            yearsOfService: detail.yearsOfService,
            // ข้อมูลการฝึกอบรม
            trainingLocation: detail.trainingLocation,
            trainingCourse: detail.trainingCourse,
            // ตำแหน่ง
            fromPosition: detail.fromPosition,
            fromPositionNumber: detail.fromPositionNumber,
            fromUnit: detail.fromUnit,
            fromActingAs: detail.fromActingAs,
            toPosition: detail.toPosition,
            toPositionNumber: detail.toPositionNumber,
            toUnit: detail.toUnit,
            toActingAs: detail.toActingAs,
            notes: detail.notes,
          })),
        } : undefined,
      },
      select: {
        id: true,
        groupNumber: true,
        groupName: true,
        swapDate: true,
        status: true,
        notes: true,
        year: true,
        createdAt: true,
        swapDetails: {
          select: {
            id: true,
            personnelId: true,
            noId: true,
            fullName: true,
            rank: true,
            seniority: true,
            nationalId: true,
            posCodeId: true,
            // ข้อมูลส่วนตัว
            birthDate: true,
            age: true,
            education: true,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: true,
            currentRankSince: true,
            enrollmentDate: true,
            retirementDate: true,
            yearsOfService: true,
            // ข้อมูลการฝึกอบรม
            trainingLocation: true,
            trainingCourse: true,
            // ตำแหน่ง
            fromPosition: true,
            fromPositionNumber: true,
            fromUnit: true,
            fromActingAs: true,
            toPosition: true,
            toPositionNumber: true,
            toUnit: true,
            toActingAs: true,
            sequence: true,
            notes: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Error updating three-way transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE - ลบ three-way transaction (ใช้ SwapTransaction)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existingTransaction = await prisma.swapTransaction.findUnique({
      where: { id: id },
      include: {
        swapDetails: true
      }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลการสลับตำแหน่งสามเส้า' },
        { status: 404 }
      );
    }

    if (existingTransaction.swapType !== 'three-way') {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลนี้ไม่ใช่การสลับตำแหน่งสามเส้า' },
        { status: 400 }
      );
    }

    // ดึง personnelId ของบุคลากรที่เกี่ยวข้องในธุรกรรมนี้
    const personnelIds = existingTransaction.swapDetails
      .map(detail => detail.personnelId)
      .filter((id): id is string => id !== null);

    // Optimized: Use select to fetch only necessary fields for conflict checking
    const relatedSwapTransactions = await prisma.swapTransaction.findMany({
      where: {
        year: existingTransaction.year,
        swapType: { not: 'three-way' }, // ไม่ใช่สามเส้า
        swapDetails: {
          some: {
            personnelId: {
              in: personnelIds
            }
          }
        }
      },
      select: {
        id: true,
        year: true,
        swapDetails: {
          select: {
            personnelId: true,
            fullName: true,
          },
          where: {
            personnelId: {
              in: personnelIds
            }
          }
        }
      }
    });

    if (relatedSwapTransactions.length > 0) {
      // หาชื่อบุคลากรที่มีปัญหา - optimized with Set for better performance
      const conflictPersonnelNamesSet = new Set<string>();
      relatedSwapTransactions.forEach(transaction => {
        if (transaction.swapDetails) {
          transaction.swapDetails.forEach(detail => {
            if (detail.personnelId && personnelIds.includes(detail.personnelId) && detail.fullName) {
              conflictPersonnelNamesSet.add(detail.fullName);
            }
          });
        }
      });

      const uniqueNames = Array.from(conflictPersonnelNamesSet);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `ไม่สามารถลบได้ เนื่องจากบุคลากร ${uniqueNames.join(', ')} ได้ถูกสลับตำแหน่งในปี ${existingTransaction.year} แล้ว กรุณาลบข้อมูลการสลับตำแหน่งของบุคลากรเหล่านี้ก่อน`,
          conflictPersonnel: uniqueNames,
          year: existingTransaction.year
        },
        { status: 400 }
      );
    }

    // ถ้าไม่มีข้อมูลที่ขัดแย้ง ให้ลบได้
    await prisma.swapTransaction.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลการสลับตำแหน่งสามเส้าสำเร็จ',
    });
  } catch (error) {
    console.error('Error deleting three-way transaction:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}
