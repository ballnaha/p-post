import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการสามเส้า
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause = year ? { year: parseInt(year) } : {};

    const threeWaySwaps = await prisma.threeWaySwap.findMany({
      where: whereClause,
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(threeWaySwaps);
  } catch (error) {
    console.error('Error fetching three-way swap list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch three-way swap list' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มบุคคลเข้ารายการสามเส้า
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, notes, id, posCodeMaster, createdAt, updatedAt, createdBy, updatedBy, ...personnelData } = body;

    // เช็คว่ามีข้อมูลซ้ำหรือไม่
    if (personnelData.originalPersonnelId) {
      const existing = await prisma.threeWaySwap.findUnique({
        where: {
          unique_threeway_personnel_year: {
            originalPersonnelId: personnelData.originalPersonnelId,
            year: year,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'บุคคลนี้อยู่ในรายการสามเส้าแล้ว' },
          { status: 400 }
        );
      }
    }

    // สร้างข้อมูลใหม่
    const newEntry = await prisma.threeWaySwap.create({
      data: {
        year,
        notes,
        ...personnelData,
      },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('Error adding to three-way swap list:', error);
    return NextResponse.json(
      { error: 'Failed to add to three-way swap list' },
      { status: 500 }
    );
  }
}

// DELETE - ลบออกจากรายการสามเส้า
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const originalPersonnelId = searchParams.get('originalPersonnelId');
    const year = searchParams.get('year');

    if (!originalPersonnelId || !year) {
      return NextResponse.json(
        { error: 'Missing originalPersonnelId or year' },
        { status: 400 }
      );
    }

    await prisma.threeWaySwap.delete({
      where: {
        unique_threeway_personnel_year: {
          originalPersonnelId,
          year: parseInt(year),
        },
      },
    });

    return NextResponse.json({ message: 'Removed from three-way swap list' });
  } catch (error) {
    console.error('Error removing from three-way swap list:', error);
    return NextResponse.json(
      { error: 'Failed to remove from three-way swap list' },
      { status: 500 }
    );
  }
}
