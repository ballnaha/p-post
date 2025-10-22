import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const { username, email, firstName, lastName, role, isActive, password } = body;

    const updateData: any = {
      username,
      email: email || null,
      firstName: firstName || null,
      lastName: lastName || null,
      role: role || 'user',
      isActive: isActive ?? true,
    };

    // Only update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: user });
  } catch (e: any) {
    console.error('Update user error:', e);
    if (e.code === 'P2002') {
      // ตรวจสอบว่า field ไหนที่ซ้ำ
      if (e.meta?.target?.includes('username')) {
        return NextResponse.json({ error: 'Username นี้ถูกใช้งานแล้ว กรุณาเลือก Username อื่น' }, { status: 409 });
      } else if (e.meta?.target?.includes('email')) {
        return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 409 });
      } else {
        return NextResponse.json({ error: 'ข้อมูลนี้ถูกใช้งานแล้ว' }, { status: 409 });
      }
    }
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานที่ต้องการแก้ไข' }, { status: 404 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้งาน' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Delete user error:', e);
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานที่ต้องการลบ' }, { status: 404 });
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' }, { status: 500 });
  }
}
