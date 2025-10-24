import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงข้อมูลบุคลากรจาก swap_list เท่านั้น
// เพราะ police_personnel มีการนำเข้าข้อมูลใหม่ทุกปีและข้อมูลเดิมจะถูกลบ
// ใช้ id ของ swap_list โดยตรงในการค้นหา
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personnelId: string }> }
) {
  try {
    const { personnelId } = await params;
    
    // ค้นหาจาก swap_list โดยใช้ id โดยตรง
    const personnel = await prisma.swapList.findUnique({
      where: { id: personnelId },
      include: {
        posCodeMaster: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!personnel) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลบุคลากรใน swap_list' },
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
