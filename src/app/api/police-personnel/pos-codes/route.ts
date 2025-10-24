import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // ดึงรายการ posCode ทั้งหมดจาก PosCodeMaster
    const posCodes = await prisma.posCodeMaster.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: posCodes,
    });
  } catch (error: any) {
    console.error('Fetch pos codes error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรหัสตำแหน่ง' },
      { status: 500 }
    );
  }
}
