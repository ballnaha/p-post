import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // ดึงรายการหน่วยทั้งหมดที่ไม่ซ้ำกัน
    const units = await prisma.policePersonnel.findMany({
      where: {
        AND: [
          { unit: { not: null } },
          { unit: { not: '' } }
        ],
      },
      select: {
        unit: true,
      },
      distinct: ['unit'],
      orderBy: {
        unit: 'asc',
      },
    });

    // แปลงเป็น array ของ string
    const unitList = units.map(item => item.unit).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: unitList,
    });
  } catch (error: any) {
    console.error('Fetch units error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลหน่วย' },
      { status: 500 }
    );
  }
}
