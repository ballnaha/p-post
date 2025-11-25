import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET - ดึงข้อมูลบุคลากรตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const personnel = await prisma.policePersonnel.findUnique({
      where: { id },
      include: {
        posCodeMaster: true,
      },
    });

    if (!personnel) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: personnel,
    });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลบุคลากร
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Optional: Check authentication
    const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const username = session?.user?.username || 'system';

    const personnel = await prisma.policePersonnel.update({
      where: { id },
      data: {
        ...body,
        updatedBy: username,
      },
    });

    return NextResponse.json({
      success: true,
      data: personnel,
      message: 'อัปเดตข้อมูลสำเร็จ',
    });
  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' },
      { status: 500 }
    );
  }
}

// PATCH - แก้ไขข้อมูลบุคลากรบางส่วน (เช่น supporterName, supportReason)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Optional: Check authentication
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const username = session?.user?.username || 'system';

    // อนุญาตให้อัพเดทเฉพาะบาง field
    const allowedFields = ['supporterName', 'supportReason', 'notes'];
    const updateData: Record<string, any> = { updatedBy: username };
    
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const personnel = await prisma.policePersonnel.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: personnel,
      message: 'อัปเดตข้อมูลสำเร็จ',
    });
  } catch (error: any) {
    console.error('Patch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' },
      { status: 500 }
    );
  }
}

// DELETE - ลบข้อมูลบุคลากร
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Optional: Check authentication
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    // ดึงข้อมูลบุคลากรก่อน
    const personnel = await prisma.policePersonnel.findUnique({
      where: { id }
    });

    if (!personnel) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลบุคลากร' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าบุคลากรนี้อยู่ใน swap-list, three-way-swap, หรือ vacant-position หรือไม่
    const errors: string[] = [];

    if (personnel.nationalId) {
      // ตรวจสอบว่ามีใน vacant-position หรือไม่
      const inVacantPosition = await prisma.vacantPosition.findFirst({
        where: { nationalId: personnel.nationalId }
      });
      if (inVacantPosition) {
        errors.push('อยู่ในรายการ Vacant Position');
      }

      // ตรวจสอบว่ามีการจับคู่ใน swap_transaction_detail หรือไม่ (รวมทั้ง two-way และ three-way)
      const hasSwapTransaction = await prisma.swapTransactionDetail.findFirst({
        where: { nationalId: personnel.nationalId }
      });
      if (hasSwapTransaction) {
        errors.push('มีการจับคู่แลกตำแหน่งอยู่ใน Swap Transaction');
      }
    }

    // ถ้ามีข้อผิดพลาด ส่งกลับไป
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่สามารถลบข้อมูลได้',
          detail: `บุคลากรนี้${errors.join(', ')}. กรุณาลบออกจากรายการเหล่านั้นก่อน`,
          reasons: errors
        },
        { status: 400 }
      );
    }

    await prisma.policePersonnel.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลสำเร็จ',
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}
