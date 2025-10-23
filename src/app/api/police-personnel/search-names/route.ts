import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // ถ้าไม่มี query หรือสั้นเกินไป ไม่ต้องค้นหา
    if (query.length < 1) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // ค้นหาชื่อที่ตรงกับ query และมีชื่ออยู่
    const personnel = await prisma.policePersonnel.findMany({
      where: {
        fullName: {
          contains: query,
          not: null,
        },
      },
      select: {
        fullName: true,
      },
      distinct: ['fullName'],
      orderBy: {
        fullName: 'asc',
      },
      take: 50, // จำกัดผลลัพธ์ที่ 50 รายการ
    });

    // ดึงเฉพาะชื่อออกมาเป็น array
    const names = personnel
      .map((p) => p.fullName)
      .filter((name): name is string => name !== null);

    return NextResponse.json({
      success: true,
      data: names,
    });
  } catch (error: any) {
    console.error('Search names error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการค้นหาชื่อ' },
      { status: 500 }
    );
  }
}
