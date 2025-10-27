import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการผู้ยื่นขอตำแหน่งเฉพาะ เรียงตาม display_order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ posCodeId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const resolvedParams = await params;
    const posCodeId = parseInt(resolvedParams.posCodeId);

    if (isNaN(posCodeId)) {
      return NextResponse.json(
        { error: 'Invalid position code ID' },
        { status: 400 }
      );
    }

    const whereClause: any = {
      requestedPositionId: posCodeId,
    };

    if (year) {
      whereClause.year = parseInt(year);
    }

    // ดึงรายการผู้ยื่นขอตำแหน่งเฉพาะ เรียงตาม displayOrder
    const applicants = await prisma.vacantPosition.findMany({
      where: whereClause,
      include: {
        posCodeMaster: true, // ตำแหน่งปัจจุบัน
        requestedPosCode: true, // ตำแหน่งที่ขอ
      },
      orderBy: [
        { displayOrder: 'asc' }, // เรียงตามลำดับที่กำหนด
        { createdAt: 'asc' }, // ถ้า displayOrder เท่ากัน ให้เรียงตามวันที่สร้าง
      ],
    });

    return NextResponse.json(applicants);
  } catch (error) {
    console.error('Error fetching applicants for position:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applicants for position' },
      { status: 500 }
    );
  }
}