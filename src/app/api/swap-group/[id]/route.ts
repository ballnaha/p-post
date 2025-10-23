import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงข้อมูลกลุ่มสลับตำแหน่งตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const group = await prisma.swapGroup.findUnique({
      where: { id: params.id },
      include: {
        members: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'ไม่พบกลุ่มที่ระบุ' },
        { status: 404 }
      );
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching swap group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch swap group' },
      { status: 500 }
    );
  }
}

// PUT - อัพเดทข้อมูลกลุ่มสลับตำแหน่ง
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, status } = body;

    const group = await prisma.swapGroup.update({
      where: { id: params.id },
      data: {
        name,
        description,
        status,
        updatedAt: new Date()
      },
      include: {
        members: true,
        _count: {
          select: { members: true }
        }
      }
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating swap group:', error);
    return NextResponse.json(
      { error: 'Failed to update swap group' },
      { status: 500 }
    );
  }
}

// DELETE - ลบกลุ่มสลับตำแหน่ง
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.swapGroup.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'ลบกลุ่มสำเร็จ' });
  } catch (error) {
    console.error('Error deleting swap group:', error);
    return NextResponse.json(
      { error: 'Failed to delete swap group' },
      { status: 500 }
    );
  }
}
