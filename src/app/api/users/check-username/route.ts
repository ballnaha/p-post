import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า username มีอยู่ในฐานข้อมูลหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: {
        username: username.toLowerCase().trim(),
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      available: !existingUser,
      username,
    });
  } catch (error) {
    console.error('Check username error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตรวจสอบ Username' },
      { status: 500 }
    );
  }
}