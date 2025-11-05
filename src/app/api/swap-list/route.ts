import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-list
 * ดึงรายการ swap transactions (แทนที่ swap_list เดิม)
 * Query params:
 *   - year: ปีที่ต้องการดู (optional, ถ้าไม่ระบุจะใช้ปีปัจจุบัน)
 *   - swapType: ประเภทการสลับ (optional) two-way, three-way, vacant-position
 *   - status: สถานะ (optional) completed, pending, cancelled
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const swapType = searchParams.get('swapType');
    const status = searchParams.get('status') || 'completed';
    
    // ใช้ปีปัจจุบัน (พ.ศ.) ถ้าไม่ระบุ
    const currentYear = new Date().getFullYear() + 543;
    const year = yearParam ? parseInt(yearParam) : currentYear;

    // Build where clause
    const whereClause: any = { year, status };
    if (swapType) {
      whereClause.swapType = swapType;
    }

    // ดึงรายการ swap transactions พร้อมรายละเอียด
    const transactions = await prisma.swapTransaction.findMany({
      where: whereClause,
      include: {
        swapDetails: {
          include: {
            posCodeMaster: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: [
            { sequence: 'asc' },
            { fullName: 'asc' }
          ]
        }
      },
      orderBy: [
        { swapType: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // แปลงข้อมูลให้เป็นรูปแบบเดิม (flat list of personnel)
    const swapList = transactions.flatMap(transaction => 
      transaction.swapDetails.map(detail => ({
        id: detail.personnelId || detail.id,
        transactionId: transaction.id,
        groupNumber: transaction.groupNumber,
        groupName: transaction.groupName,
        posCodeId: detail.posCodeId,
        posCodeMaster: detail.posCodeMaster,
        position: detail.fromPosition,
        positionNumber: detail.fromPositionNumber,
        unit: detail.fromUnit,
        rank: detail.rank,
        fullName: detail.fullName,
        nationalId: detail.nationalId,
        age: detail.age,
        yearsOfService: detail.yearsOfService,
        seniority: detail.seniority,
        birthDate: detail.birthDate,
        education: detail.education,
        lastAppointment: detail.lastAppointment,
        currentRankSince: detail.currentRankSince,
        enrollmentDate: detail.enrollmentDate,
        retirementDate: detail.retirementDate,
        trainingLocation: detail.trainingLocation,
        trainingCourse: detail.trainingCourse,
        year: transaction.year,
        swapType: transaction.swapType,
        notes: detail.notes || transaction.notes,
        createdAt: transaction.createdAt,
        // ข้อมูลตำแหน่งปลายทาง
        toPosition: detail.toPosition,
        toPositionNumber: detail.toPositionNumber,
        toUnit: detail.toUnit,
      }))
    );

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
 * API นี้ไม่ใช้แล้ว - ใช้ /api/swap-transactions แทน
 * เก็บไว้เพื่อ backward compatibility
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'API นี้ไม่ใช้แล้ว กรุณาใช้ /api/swap-transactions แทน',
      redirect: '/api/swap-transactions'
    },
    { status: 410 } // Gone
  );
}

/**
 * DELETE /api/swap-list
 * ลบ transaction ทั้งกลุ่ม (ใช้ transactionId แทน)
 * Body: { transactionId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ transactionId' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า transaction มีอยู่จริง
    const transaction = await prisma.swapTransaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลที่ต้องการลบ' },
        { status: 404 }
      );
    }

    // ลบ transaction (จะลบ details ด้วยอัตโนมัติเพราะมี onDelete: Cascade)
    await prisma.swapTransaction.delete({
      where: { id: transactionId }
    });

    return NextResponse.json({
      success: true,
      message: 'ลบรายการสลับตำแหน่งสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);

    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}
