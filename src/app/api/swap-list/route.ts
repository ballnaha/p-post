import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-list
 * ดึงรายการที่เลือกไว้สำหรับสลับตำแหน่ง
 * Query params:
 *   - year: ปีที่ต้องการดู (optional, ถ้าไม่ระบุจะใช้ปีปัจจุบัน)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    
    // ใช้ปีปัจจุบัน (พ.ศ.) ถ้าไม่ระบุ
    const currentYear = new Date().getFullYear() + 543;
    const year = yearParam ? parseInt(yearParam) : currentYear;

    // ดึงรายการ swap list (ข้อมูลสำเนาทั้งหมดอยู่ใน table แล้ว)
    const swapList = await prisma.swapList.findMany({
      where: {
        year: year
      },
      orderBy: [
        { unit: 'asc' },
        { position: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: swapList,
      year: year,
      total: swapList.length
    });
  } catch (error: any) {
    console.error('Error fetching swap list:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/swap-list
 * เพิ่มบุคลากรเข้า swap list (เก็บสำเนาข้อมูลทั้งหมด)
 * Body: { personnel: PolicePersonnel, year?: number, notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personnel, year, notes } = body;

    if (!personnel || !personnel.id) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุข้อมูลบุคลากร' },
        { status: 400 }
      );
    }

    // ใช้ปีปัจจุบัน (พ.ศ.) ถ้าไม่ระบุ
    const currentYear = new Date().getFullYear() + 543;
    const swapYear = year || currentYear;

    // ตรวจสอบว่ามีในรายการแล้วหรือไม่
    const existing = await prisma.swapList.findFirst({
      where: {
        originalPersonnelId: personnel.id,
        year: swapYear
      }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `บุคลากรนี้อยู่ในรายการสลับตำแหน่งปี ${swapYear} แล้ว` },
        { status: 400 }
      );
    }

    // เพิ่มเข้า swap list พร้อมสำเนาข้อมูลทั้งหมด
    const swapItem = await prisma.swapList.create({
      data: {
        year: swapYear,
        notes: notes || null,
        
        // เก็บ ID เดิมไว้อ้างอิง
        originalPersonnelId: personnel.id,
        noId: personnel.noId,

        // สำเนาข้อมูลตำแหน่ง
        posCodeId: personnel.posCodeId,
        position: personnel.position,
        positionNumber: personnel.positionNumber,
        unit: personnel.unit,
        actingAs: personnel.actingAs,

        // สำเนาข้อมูลบุคคล
        seniority: personnel.seniority,
        rank: personnel.rank,
        fullName: personnel.fullName,
        nationalId: personnel.nationalId,
        birthDate: personnel.birthDate,
        age: personnel.age,
        education: personnel.education,

        // สำเนาข้อมูลการแต่งตั้ง
        lastAppointment: personnel.lastAppointment,
        currentRankSince: personnel.currentRankSince,
        enrollmentDate: personnel.enrollmentDate,
        retirementDate: personnel.retirementDate,
        yearsOfService: personnel.yearsOfService,

        // สำเนาข้อมูลการฝึกอบรม
        trainingLocation: personnel.trainingLocation,
        trainingCourse: personnel.trainingCourse,

        // Metadata
        createdBy: null, // TODO: เพิ่มจาก session
        updatedBy: null
      }
    });

    return NextResponse.json({
      success: true,
      data: swapItem,
      message: `เพิ่ม ${personnel.rank} ${personnel.fullName} เข้ารายการสลับตำแหน่งปี ${swapYear} สำเร็จ`
    });
  } catch (error: any) {
    console.error('Error adding to swap list:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/swap-list
 * ลบบุคลากรออกจาก swap list
 * Body: { id: string } หรือ { originalPersonnelId: string, year: number }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, originalPersonnelId, year } = body;

    if (!id && (!originalPersonnelId || !year)) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ id หรือ originalPersonnelId และ year' },
        { status: 400 }
      );
    }

    let deleted;

    if (id) {
      // ลบด้วย id
      deleted = await prisma.swapList.delete({
        where: { id: id }
      });
    } else {
      // ลบด้วย originalPersonnelId + year
      const record = await prisma.swapList.findFirst({
        where: {
          originalPersonnelId: originalPersonnelId,
          year: year
        }
      });

      if (!record) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบข้อมูลที่ต้องการลบ' },
          { status: 404 }
        );
      }

      deleted = await prisma.swapList.delete({
        where: { id: record.id }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'ลบออกจากรายการสลับตำแหน่งสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error deleting from swap list:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลที่ต้องการลบ' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}
