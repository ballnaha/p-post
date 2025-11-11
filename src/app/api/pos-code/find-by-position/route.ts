import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/pos-code/find-by-position?position=xxx
 * ค้นหา PosCodeMaster จากชื่อตำแหน่ง
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุชื่อตำแหน่ง' },
        { status: 400 }
      );
    }

    // ค้นหาจาก police_personnel ที่มีชื่อตำแหน่งตรงกัน และมี posCodeId
    const personnel = await prisma.policePersonnel.findFirst({
      where: {
        position: position,
        posCodeId: { not: null }
      },
      include: {
        posCodeMaster: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (personnel?.posCodeMaster) {
      return NextResponse.json({
        success: true,
        data: {
          id: personnel.posCodeMaster.id,
          name: personnel.posCodeMaster.name,
          position: personnel.position
        }
      });
    }

    // ถ้าไม่เจอ ลองค้นหาจาก pattern ของชื่อตำแหน่ง
    // เช่น "ผกก.(สอบสวน)" ให้ดึงคำว่า "ผกก." มา
    const posCodePattern = position.match(/^([^\(\.]+)/);
    if (posCodePattern) {
      const posCodePrefix = posCodePattern[1].trim();
      
      // ค้นหา posCodeMaster ที่ชื่อขึ้นต้นด้วย prefix
      const posCodeMaster = await prisma.posCodeMaster.findFirst({
        where: {
          name: {
            startsWith: posCodePrefix
          }
        }
      });

      if (posCodeMaster) {
        return NextResponse.json({
          success: true,
          data: {
            id: posCodeMaster.id,
            name: posCodeMaster.name,
            position: position
          }
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'ไม่พบข้อมูล PosCode สำหรับตำแหน่งนี้' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Error finding pos code:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล' },
      { status: 500 }
    );
  }
}
