import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-list/[id]
 * ดึงข้อมูล swap list item ตาม ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const swapItem = await prisma.swapList.findUnique({
      where: { id }
    });

    if (!swapItem) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล' },
        { status: 404 }
      );
    }

    return NextResponse.json(swapItem);
  } catch (error: any) {
    console.error('Error fetching swap item:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/swap-list/[id]
 * อัพเดทข้อมูล swap list item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // ตรวจสอบว่ามี swap item อยู่จริง
    const existing = await prisma.swapList.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล' },
        { status: 404 }
      );
    }

    // กรองข้อมูลที่ต้องการอัพเดท (ไม่รวม relation objects และ auto-generated fields)
    const { year, notes, id: bodyId, posCodeMaster, createdAt, updatedAt, createdBy, updatedBy, ...personnelData } = body;

    // อัพเดทข้อมูล
    const updated = await prisma.swapList.update({
      where: { id },
      data: {
        ...personnelData,
        year: year || existing.year,
        notes: notes || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating swap item:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/swap-list/[id]
 * ลบ swap list item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // ตรวจสอบว่ามี swap item อยู่จริง
    const existing = await prisma.swapList.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าบุคลากรนี้มีการจับคู่ใน swap_transaction_detail หรือไม่
    if (existing.nationalId) {
      const hasSwapTransaction = await prisma.swapTransactionDetail.findFirst({
        where: {
          nationalId: existing.nationalId
        },
        include: {
          transaction: true
        }
      });

      if (hasSwapTransaction) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'ไม่สามารถลบได้ เนื่องจากบุคลากรนี้มีการจับคู่แลกตำแหน่งอยู่',
            detail: 'กรุณาลบการจับคู่ใน Swap Transaction ก่อน',
            transactionId: hasSwapTransaction.transactionId
          },
          { status: 400 }
        );
      }
    }

    // ลบข้อมูล
    await prisma.swapList.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error deleting swap item:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}
