import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-list/years
 * ดึงรายการปีที่มีข้อมูลใน swap list
 */
export async function GET(request: NextRequest) {
  try {
    // ดึงปีทั้งหมดที่มีข้อมูล (distinct) จาก swap_transaction
    const years = await prisma.$queryRaw<Array<{ year: number }>>`
      SELECT DISTINCT year 
      FROM swap_transaction 
      ORDER BY year DESC
    `;

    const yearList = years.map(item => item.year);

    // เพิ่มปีปัจจุบัน (พ.ศ.) ถ้ายังไม่มีในรายการ
    const currentYear = new Date().getFullYear() + 543;
    if (!yearList.includes(currentYear)) {
      yearList.unshift(currentYear);
    }

    return NextResponse.json({
      success: true,
      data: yearList
    });
  } catch (error: any) {
    console.error('Error fetching years:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}
