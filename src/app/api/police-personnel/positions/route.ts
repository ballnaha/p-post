import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/police-personnel/positions
 * ดึงรายการตำแหน่งแบบย่อ (ส่วนแรกของตำแหน่ง) สำหรับใช้เป็น filter
 * ตัวอย่าง: "รอง ผกก.ฝอ.1 บก.อก.บช.น." -> จะดึงเป็น "รอง ผกก."
 *           "ผกก.ฝอ.2 บก.อก.บช.น." -> จะดึงเป็น "ผกก."
 */
export async function GET(request: NextRequest) {
  try {
    // ดึงตำแหน่งทั้งหมดที่ไม่ซ้ำกันจากฐานข้อมูล
    const positions = await prisma.policePersonnel.findMany({
      where: {
        AND: [
          { position: { not: null } },
          { position: { not: '' } }
        ]
      },
      select: {
        position: true
      },
      distinct: ['position']
    });

    // Extract ตำแหน่งแบบย่อ (คำแรก ๆ ก่อนเครื่องหมาย)
    const extractedPositions = new Set<string>();

    positions.forEach(item => {
      if (!item.position) return;

      const position = item.position.trim();
      
      // กรณีที่มี "รอง" นำหน้า
      if (position.startsWith('รอง ')) {
        // หาคำถัดไป เช่น "รอง ผกก." จาก "รอง ผกก.ฝอ.1"
        const match = position.match(/^(รอง\s+[^\s.]+\.?)/);
        if (match) {
          extractedPositions.add(match[1]);
        }
      } else {
        // กรณีปกติ หาคำแรกจนถึงจุด เช่น "ผกก." จาก "ผกก.ฝอ.2"
        const match = position.match(/^([^\s.]+\.?)/);
        if (match) {
          extractedPositions.add(match[1]);
        }
      }
    });

    // แปลง Set เป็น Array และเรียงตามตัวอักษร
    const sortedPositions = Array.from(extractedPositions).sort((a, b) => 
      a.localeCompare(b, 'th')
    );

    return NextResponse.json({
      success: true,
      data: sortedPositions
    });
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่ง' },
      { status: 500 }
    );
  }
}
