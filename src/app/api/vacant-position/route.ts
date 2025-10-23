import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการตำแหน่งว่าง
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause = year ? { year: parseInt(year) } : {};

    const vacantPositions = await prisma.vacantPosition.findMany({
      where: whereClause,
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(vacantPositions);
  } catch (error) {
    console.error('Error fetching vacant position list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacant position list' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มตำแหน่งว่างเข้ารายการ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, notes, id, posCodeMaster, createdAt, updatedAt, createdBy, updatedBy, ...personnelData } = body;

    // เช็คว่ามีข้อมูลซ้ำหรือไม่
    if (personnelData.originalPersonnelId) {
      const existing = await prisma.vacantPosition.findUnique({
        where: {
          unique_vacant_personnel_year: {
            originalPersonnelId: personnelData.originalPersonnelId,
            year: year,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'ตำแหน่งนี้อยู่ในรายการตำแหน่งว่างแล้ว' },
          { status: 400 }
        );
      }
    }

    // สร้างข้อมูลใหม่
    const newEntry = await prisma.vacantPosition.create({
      data: {
        year,
        notes,
        ...personnelData,
      },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('Error adding to vacant position list:', error);
    return NextResponse.json(
      { error: 'Failed to add to vacant position list' },
      { status: 500 }
    );
  }
}

// DELETE - ลบออกจากรายการตำแหน่งว่าง
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

    await prisma.vacantPosition.delete({
      where: {
        unique_vacant_personnel_year: {
          originalPersonnelId,
          year: parseInt(year),
        },
      },
    });

    return NextResponse.json({ message: 'Removed from vacant position list' });
  } catch (error) {
    console.error('Error removing from vacant position list:', error);
    return NextResponse.json(
      { error: 'Failed to remove from vacant position list' },
      { status: 500 }
    );
  }
}
