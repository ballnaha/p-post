import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงข้อมูลรายการยื่นขอตำแหน่งตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;

    const vacantPosition = await prisma.vacantPosition.findUnique({
      where: { id },
      include: {
        posCodeMaster: true,
        requestedPosCode: true,
      },
    });

    if (!vacantPosition) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลตำแหน่งว่าง' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: vacantPosition });
  } catch (error) {
    console.error('Error fetching vacant position:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลรายการยื่นขอตำแหน่ง
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
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

    const oldRequestedPositionId = existing.requestedPositionId;
    const newRequestedPositionId = requestedPositionId;

    // ถ้ามีการเปลี่ยนตำแหน่งที่ขอ
    if (oldRequestedPositionId !== newRequestedPositionId) {
      // ใช้ transaction เพื่อให้การอัพเดทเป็นไปแบบ atomic
      await prisma.$transaction(async (tx) => {
        // 1. หา display order สูงสุดของตำแหน่งใหม่
        let newDisplayOrder = 1;
        if (newRequestedPositionId) {
          const maxOrderInNewPosition = await tx.vacantPosition.findFirst({
            where: { requestedPositionId: newRequestedPositionId },
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true },
          });

          if (maxOrderInNewPosition?.displayOrder) {
            newDisplayOrder = maxOrderInNewPosition.displayOrder + 1;
          }
        }

        // 2. อัพเดทข้อมูลและ display order ของรายการที่แก้ไข
        await tx.vacantPosition.update({
          where: { id },
          data: {
            nominator: nominator || null,
            requestedPositionId: newRequestedPositionId || null,
            notes: notes || null,
            displayOrder: newDisplayOrder,
          },
        });

        // 3. จัดลำดับใหม่สำหรับตำแหน่งเดิม (ถ้ามี)
        if (oldRequestedPositionId) {
          const remainingInOldPosition = await tx.vacantPosition.findMany({
            where: { 
              requestedPositionId: oldRequestedPositionId,
              id: { not: id } // ไม่รวมรายการที่เพิ่งแก้ไข
            },
            orderBy: { displayOrder: 'asc' },
          });

          // อัพเดท display order ให้เรียงต่อเนื่องกัน 1, 2, 3, ...
          for (let i = 0; i < remainingInOldPosition.length; i++) {
            await tx.vacantPosition.update({
              where: { id: remainingInOldPosition[i].id },
              data: { displayOrder: i + 1 },
            });
          }
        }
      });
    } else {
      // ถ้าไม่มีการเปลี่ยนตำแหน่ง แค่อัพเดทข้อมูลปกติ
      await prisma.vacantPosition.update({
        where: { id },
        data: {
          nominator: nominator || null,
          requestedPositionId: requestedPositionId || null,
          notes: notes || null,
        },
      });
    }

    // ดึงข้อมูลที่อัพเดทแล้วพร้อม relations
    const updated = await prisma.vacantPosition.findUnique({
      where: { id },
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

// PATCH - อัพเดท displayOrder
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { displayOrder } = body;

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

    // อัพเดท displayOrder
    const updated = await prisma.vacantPosition.update({
      where: { id },
      data: {
        displayOrder: displayOrder,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating displayOrder:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัพเดท displayOrder' },
      { status: 500 }
    );
  }
}
