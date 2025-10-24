import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการ three-way transactions (ใช้ SwapTransaction แทน)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause: any = { swapType: 'three-way' };
    if (year) {
      whereClause.year = parseInt(year);
    }

    const transactions = await prisma.swapTransaction.findMany({
      where: whereClause,
      include: {
        swapDetails: {
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: [
        { year: 'desc' },
        { swapDate: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Error fetching three-way transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch three-way transactions' },
      { status: 500 }
    );
  }
}

// POST - สร้าง three-way transaction ใหม่ (ใช้ SwapTransaction แทน)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, swapDate, groupName, groupNumber, status, notes, swapDetails } = body;

    // Validate: ต้องมี 3 คน
    if (!swapDetails || swapDetails.length !== 3) {
      return NextResponse.json(
        { success: false, error: 'Three-way swap must have exactly 3 people' },
        { status: 400 }
      );
    }

    // สร้าง transaction พร้อม details (ใช้ SwapTransaction)
    const transaction = await prisma.swapTransaction.create({
      data: {
        year,
        swapDate: new Date(swapDate),
        swapType: 'three-way', // ระบุ type
        groupName,
        groupNumber,
        status: status || 'completed',
        notes,
        swapDetails: {
          create: swapDetails.map((detail: any, index: number) => ({
            sequence: index + 1, // 1, 2, 3
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
        },
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
    console.error('Error creating three-way transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create three-way transaction' },
      { status: 500 }
    );
  }
}
