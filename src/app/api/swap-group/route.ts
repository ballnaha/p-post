import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการกลุ่มสลับตำแหน่งทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause: any = {};
    if (year) {
      whereClause.year = parseInt(year);
    }

    const groups = await prisma.swapGroup.findMany({
      where: whereClause,
      include: {
        members: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching swap groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch swap groups' },
      { status: 500 }
    );
  }
}

// POST - สร้างกลุ่มสลับตำแหน่งใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, year, description, status } = body;

    if (!name || !year) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อกลุ่มและปี' },
        { status: 400 }
      );
    }

    const group = await prisma.swapGroup.create({
      data: {
        name,
        year: parseInt(year),
        description,
        status: status || 'draft'
      },
      include: {
        members: true,
        _count: {
          select: { members: true }
        }
      }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating swap group:', error);
    return NextResponse.json(
      { error: 'Failed to create swap group' },
      { status: 500 }
    );
  }
}
