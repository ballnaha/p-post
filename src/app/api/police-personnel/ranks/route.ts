import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // ดึงรายการยศที่ไม่ซ้ำกันและไม่เป็นค่าว่าง
    const ranks = await prisma.policePersonnel.findMany({
      where: {
        rank: {
          not: null,
          notIn: ['', ' '],
        },
      },
      select: {
        rank: true,
      },
      distinct: ['rank'],
      orderBy: {
        rank: 'asc',
      },
    });

    // แปลงเป็น array ของ string, trim ช่องว่าง, กรองค่าซ้ำ และเรียงตามตัวอักษร
    const rankList = Array.from(
      new Set(
        ranks
          .map((item) => item.rank?.trim()) // trim ช่องว่างหน้าหลัง
          .filter((rank): rank is string => rank !== null && rank !== '')
      )
    ).sort((a, b) => a.localeCompare(b, 'th')); // เรียงตามภาษาไทย

    return NextResponse.json({
      success: true,
      data: rankList,
    });
  } catch (error: any) {
    console.error('Fetch ranks error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลยศ' },
      { status: 500 }
    );
  }
}
