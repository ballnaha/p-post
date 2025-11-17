import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/swap-transactions/[id]/complete
 * ทำเครื่องหมายว่ากลุ่มนี้เสร็จสิ้นแล้ว (ไม่มี placeholder)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ตรวจสอบว่ามี transaction อยู่จริง
    const transaction = await prisma.swapTransaction.findUnique({
      where: { id },
      include: {
        swapDetails: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูล" },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าไม่มี placeholder (personnelId และ nationalId ต้องมีค่า)
    const hasPlaceholder = transaction.swapDetails.some(
      (detail) => !detail.personnelId && !detail.nationalId
    );

    if (hasPlaceholder) {
      return NextResponse.json(
        { 
          success: false, 
          error: "ยังมีตำแหน่งว่าง (placeholder) อยู่ กรุณาเลือกบุคลากรให้ครบก่อน" 
        },
        { status: 400 }
      );
    }

    // อัปเดต isCompleted = true
    const updated = await prisma.swapTransaction.update({
      where: { id },
      data: {
        isCompleted: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "ทำเครื่องหมายเสร็จสิ้นสำเร็จ",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error completing transaction:", error);
    return NextResponse.json(
      { success: false, error: error.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/swap-transactions/[id]/complete
 * ยกเลิกการทำเครื่องหมายเสร็จสิ้น (กรณีต้องการแก้ไขเพิ่มเติม)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ตรวจสอบว่ามี transaction อยู่จริง
    const transaction = await prisma.swapTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูล" },
        { status: 404 }
      );
    }

    // อัปเดต isCompleted = false
    const updated = await prisma.swapTransaction.update({
      where: { id },
      data: {
        isCompleted: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "ยกเลิกการทำเครื่องหมายเสร็จสิ้นสำเร็จ",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error uncompleting transaction:", error);
    return NextResponse.json(
      { success: false, error: error.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
