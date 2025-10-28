import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการตำแหน่งที่มีคนยื่นขอ (distinct requestedPositionId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause: any = {
      requestedPositionId: {
        not: null
      }
    };

    if (year) {
      whereClause.year = parseInt(year);
    }

    // ดึง distinct requestedPositionId พร้อม requestedPosCode
    const positions = await prisma.vacantPosition.findMany({
      where: whereClause,
      select: {
        requestedPositionId: true,
        requestedPosCode: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      distinct: ['requestedPositionId'],
      orderBy: {
        requestedPositionId: 'asc'
      }
    });

    // แปลงเป็น format { value, label }
    const posCodeOptions = positions
      .filter(p => p.requestedPosCode)
      .map(p => ({
        value: p.requestedPositionId!.toString(),
        label: `${p.requestedPositionId} - ${p.requestedPosCode!.name}`
      }));

    return NextResponse.json({
      success: true,
      data: posCodeOptions
    });
  } catch (error) {
    console.error('Error fetching requested positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requested positions' },
      { status: 500 }
    );
  }
}
