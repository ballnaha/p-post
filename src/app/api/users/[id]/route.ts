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
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
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
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
