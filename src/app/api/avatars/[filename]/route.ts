import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// GET - Serve avatar image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // ป้องกัน path traversal attack
    const sanitizedFilename = path.basename(filename);
    
    // ตรวจสอบว่าเป็นไฟล์ image ที่อนุญาต
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(sanitizedFilename).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }
    
    // สร้าง path ไปยังไฟล์
    const filepath = path.join(process.cwd(), 'public', 'avatars', sanitizedFilename);
    
    // ตรวจสอบว่าไฟล์มีอยู่จริง
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // อ่านไฟล์
    const imageBuffer = await readFile(filepath);
    
    // กำหนด content type ตาม extension
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    
    const contentType = contentTypeMap[ext] || 'image/jpeg';
    
    // ส่งรูปภาพกลับพร้อม cache headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // cache 1 ปี
      },
    });
  } catch (error) {
    console.error('Error serving avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
