import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-transactions
 * ดึงรายการผลการสลับตำแหน่งทั้งหมด พร้อม posCodeMaster
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const swapType = searchParams.get('swapType');
    
    const where: any = {};
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (swapType) where.swapType = swapType;

    const transactions = await prisma.swapTransaction.findMany({
      where,
      include: {
        swapDetails: {
          include: {
            posCodeMaster: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { sequence: 'asc' },
            { fullName: 'asc' }
          ]
        }
      },
      orderBy: [
        { year: 'desc' },
        { swapDate: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Error fetching swap transactions:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/swap-transactions
 * สร้างผลการสลับตำแหน่งใหม่
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, swapDate, swapType, groupName, groupNumber, notes, swapDetails } = body;

    // Validate
    if (!year || !swapDate || !swapDetails || swapDetails.length < 2) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 2 คนที่สลับตำแหน่ง' },
        { status: 400 }
      );
    }

    // Create transaction with details
    const transaction = await prisma.swapTransaction.create({
      data: {
        year,
        swapDate: new Date(swapDate),
        swapType: swapType || 'two-way',
        groupName,
        groupNumber,
        status: 'completed',
        notes,
        swapDetails: {
          create: swapDetails.map((detail: any, index: number) => ({
            sequence: detail.sequence !== undefined ? detail.sequence : (swapType === 'three-way' ? index + 1 : null),
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
            notes: detail.notes
          }))
        }
      },
      include: {
        swapDetails: {
          orderBy: swapType === 'three-way' ? { sequence: 'asc' } : { fullName: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'บันทึกผลการสลับตำแหน่งสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error creating swap transaction:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}
