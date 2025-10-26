import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT - แก้ไขข้อมูลรายการยื่นขอตำแหน่ง
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { nominator, requestedPositionId, notes } = body;

    // ตรวจสอบว่ามี record อยู่หรือไม่
    const existing = await prisma.vacantPosition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลที่ต้องการแก้ไข' },
        { status: 404 }
      );
    }

    // อัพเดทข้อมูล
    const updated = await prisma.vacantPosition.update({
      where: { id },
      data: {
        nominator: nominator || null,
        requestedPositionId: requestedPositionId || null,
        notes: notes || null,
      },
      include: {
        posCodeMaster: true,
        requestedPosCode: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating vacant position:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' },
      { status: 500 }
    );
  }
}
