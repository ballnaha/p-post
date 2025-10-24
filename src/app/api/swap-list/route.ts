import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-list
 * ดึงรายการที่เลือกไว้สำหรับสลับตำแหน่ง
 * Query params:
 *   - year: ปีที่ต้องการดู (optional, ถ้าไม่ระบุจะใช้ปีปัจจุบัน)
 *   - swapType: ประเภทการสลับ (optional) two-way, three-way, vacant-position
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const swapType = searchParams.get('swapType');
    
    // ใช้ปีปัจจุบัน (พ.ศ.) ถ้าไม่ระบุ
    const currentYear = new Date().getFullYear() + 543;
    const year = yearParam ? parseInt(yearParam) : currentYear;

    // Build where clause
    const whereClause: any = { year };
    if (swapType) {
      whereClause.swapType = swapType;
    }

    // ดึงรายการ swap list (ข้อมูลสำเนาทั้งหมดอยู่ใน table แล้ว)
    const swapList = await prisma.swapList.findMany({
      where: whereClause,
      include: {
        posCodeMaster: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { swapType: 'asc' },
        { unit: 'asc' },
        { position: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: swapList,
      year: year,
      swapType: swapType || 'all',
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
 * Body: { personnel: PolicePersonnel, year?: number, notes?: string, swapType?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personnel, year, notes, swapType } = body;

    if (!personnel || !personnel.id) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุข้อมูลบุคลากร' },
        { status: 400 }
      );
    }

    // Validate swapType
    const validSwapTypes = ['two-way', 'three-way', 'vacant-position'];
    const selectedSwapType = swapType && validSwapTypes.includes(swapType) ? swapType : 'two-way';

    // ใช้ปีปัจจุบัน (พ.ศ.) ถ้าไม่ระบุ
    const currentYear = new Date().getFullYear() + 543;
    const swapYear = year || currentYear;

    // ตรวจสอบว่ามีในรายการแล้วหรือไม่ (ตรวจสอบด้วยเลขบัตรประชาชนและ swapType)
    if (personnel.nationalId) {
      const existing = await prisma.swapList.findFirst({
        where: {
          nationalId: personnel.nationalId,
          year: swapYear,
          swapType: selectedSwapType
        }
      });

      if (existing) {
        const swapTypeText = selectedSwapType === 'two-way' ? 'สลับตำแหน่ง 2 คน' : 
                             selectedSwapType === 'three-way' ? 'สลับตำแหน่งสามเส้า' : 
                             'ตำแหน่งว่าง';
        return NextResponse.json(
          { success: false, error: `บุคลากรนี้อยู่ในรายการ${swapTypeText}ปี ${swapYear} แล้ว` },
          { status: 400 }
        );
      }
    }

    // เพิ่มเข้า swap list พร้อมสำเนาข้อมูลทั้งหมด
    const swapItem = await prisma.swapList.create({
      data: {
        year: swapYear,
        swapType: selectedSwapType,
        notes: notes || null,
        
        // ข้อมูลอ้างอิง
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

    const swapTypeText = selectedSwapType === 'two-way' ? 'สลับตำแหน่ง 2 คน' : 
                         selectedSwapType === 'three-way' ? 'สลับตำแหน่งสามเส้า' : 
                         'ตำแหน่งว่าง';

    return NextResponse.json({
      success: true,
      data: swapItem,
      message: `เพิ่ม ${personnel.rank} ${personnel.fullName} เข้ารายการ${swapTypeText}ปี ${swapYear} สำเร็จ`
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
 * Body: { nationalId: string, year: number }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { nationalId, year } = body;

    if (!nationalId || !year) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ nationalId และ year' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าบุคลากรนี้มีการจับคู่ใน swap_transaction_detail หรือไม่
    const hasSwapTransaction = await prisma.swapTransactionDetail.findFirst({
      where: {
        nationalId: nationalId
      },
      include: {
        transaction: true
      }
    });

    if (hasSwapTransaction) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่สามารถลบได้ เนื่องจากบุคลากรนี้มีการจับคู่แลกตำแหน่งอยู่',
          detail: 'กรุณาลบกลุ่มการจับคู่ใน Swap Transaction ก่อน',
          transactionId: hasSwapTransaction.transactionId
        },
        { status: 400 }
      );
    }

    // ลบด้วย nationalId + year (เพราะบุคคลเดียวกันอาจมีหลายปี)
    const deleted = await prisma.swapList.deleteMany({
      where: { 
        nationalId: nationalId,
        year: year
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลที่ต้องการลบ' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ลบออกจากรายการสลับตำแหน่งสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error deleting from swap list:', error);

    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}
