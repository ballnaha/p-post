import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import sharp from 'sharp';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';



// Type for personnel with avatarUrl
type PersonnelWithAvatar = {
  id: string;
  avatarUrl: string | null;
};

// POST - Upload avatar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์รูปภาพ' },
        { status: 400 }
      );
    }

    // ตรวจสอบชนิดไฟล์
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'ไฟล์ต้องเป็นรูปภาพเท่านั้น' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า personnel มีอยู่จริง
    const personnel = await prisma.policePersonnel.findUnique({
      where: { id },
    }) as PersonnelWithAvatar | null;

    if (!personnel) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลบุคลากร' },
        { status: 404 }
      );
    }

    // *** ลบรูปเก่าออกก่อน (ถ้ามีอยู่) ***
    if (personnel.avatarUrl) {
      const filename = personnel.avatarUrl.replace('/api/avatars/', '');
      const oldFilePath = path.join(process.cwd(), 'public', 'avatars', filename);
      if (existsSync(oldFilePath)) {
        try {
          await unlink(oldFilePath);
          console.log('Deleted old avatar:', oldFilePath);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
          // ดำเนินการต่อแม้ว่าลบไม่สำเร็จ เพราะอาจเป็นไฟล์ที่ไม่มีอยู่จริง
        }
      }
    }

    // อ่านไฟล์และแปลงเป็น buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize รูปภาพด้วย sharp (ขนาด 300x300 pixels)
    const resizedBuffer = await sharp(buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // สร้างชื่อไฟล์ใหม่
    const timestamp = Date.now();
    const filename = `avatar-${id}-${timestamp}.jpg`;
    const filepath = path.join(process.cwd(), 'public', 'avatars', filename);

    // บันทึกไฟล์
    await writeFile(filepath, resizedBuffer);

    // อัพเดท database - ใช้ API route แทน public path
    const avatarUrl = `/api/avatars/${filename}`;
    const updatedPersonnel = await prisma.policePersonnel.update({
      where: { id },
      data: { avatarUrl } as any,
    });

    return NextResponse.json({
      success: true,
      avatarUrl,
      message: 'อัพโหลดรูปภาพสำเร็จ',
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ' },
      { status: 500 }
    );
  }
}

// DELETE - Delete avatar
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ตรวจสอบว่า personnel มีอยู่จริง
    const personnel = await prisma.policePersonnel.findUnique({
      where: { id },
    }) as PersonnelWithAvatar | null;

    if (!personnel) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลบุคลากร' },
        { status: 404 }
      );
    }

    if (!personnel.avatarUrl) {
      return NextResponse.json(
        { error: 'ไม่มีรูปภาพให้ลบ' },
        { status: 400 }
      );
    }

    // ลบไฟล์ - แปลง /api/avatars/filename.jpg เป็น public/avatars/filename.jpg
    const filename = personnel.avatarUrl.replace('/api/avatars/', '');
    const filepath = path.join(process.cwd(), 'public', 'avatars', filename);
    if (existsSync(filepath)) {
      await unlink(filepath);
      console.log('Deleted avatar file:', filepath);
    } else {
      console.warn('Avatar file not found:', filepath);
    }

    // อัพเดท database
    await prisma.policePersonnel.update({
      where: { id },
      data: { avatarUrl: null } as any,
    });

    return NextResponse.json({
      success: true,
      message: 'ลบรูปภาพสำเร็จ',
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบรูปภาพ' },
      { status: 500 }
    );
  }
}
