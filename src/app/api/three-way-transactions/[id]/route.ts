import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงข้อมูล three-way transaction ตาม ID (ใช้ SwapTransaction)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = await prisma.swapTransaction.findUnique({
      where: { 
        id: params.id,
      },
      include: {
        swapDetails: {
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
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { year, swapDate, groupName, groupNumber, status, notes, swapDetails } = body;

    // Validate: ต้องมี 3 คน
    if (swapDetails && swapDetails.length !== 3) {
      return NextResponse.json(
        { success: false, error: 'Three-way swap must have exactly 3 people' },
        { status: 400 }
      );
    }

    // ลบ details เก่าและสร้างใหม่
    const transaction = await prisma.swapTransaction.update({
      where: { id: params.id },
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
            nationalId: detail.nationalId,
            fullName: detail.fullName,
            rank: detail.rank,
            posCodeId: detail.posCodeId,
            fromPosition: detail.fromPosition,
            fromPositionNumber: detail.fromPositionNumber,
            fromUnit: detail.fromUnit,
            toPosition: detail.toPosition,
            toPositionNumber: detail.toPositionNumber,
            toUnit: detail.toUnit,
            notes: detail.notes,
          })),
        } : undefined,
      },
      include: {
        swapDetails: {
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
    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existingTransaction = await prisma.swapTransaction.findUnique({
      where: { id: params.id },
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

    // ตรวจสอบว่าบุคลากรเหล่านี้มีการสลับตำแหน่งในปีนี้หรือไม่ (ไม่ใช่สามเส้า)
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
      include: {
        swapDetails: {
          where: {
            personnelId: {
              in: personnelIds
            }
          }
        }
      }
    });

    if (relatedSwapTransactions.length > 0) {
      // หาชื่อบุคลากรที่มีปัญหา
      const conflictPersonnelNames: string[] = [];
      relatedSwapTransactions.forEach(transaction => {
        if (transaction.swapDetails) {
          transaction.swapDetails.forEach(detail => {
            if (detail.personnelId && personnelIds.includes(detail.personnelId) && detail.fullName) {
              conflictPersonnelNames.push(detail.fullName);
            }
          });
        }
      });

      const uniqueNames = [...new Set(conflictPersonnelNames)];
      
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
      where: { id: params.id },
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
