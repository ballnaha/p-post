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
    await prisma.swapTransaction.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting three-way transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
