import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-transactions
 * ดึงรายการผลการสลับตำแหน่งทั้งหมด พร้อม posCodeMaster
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const swapType = searchParams.get('swapType');
    
    const where: any = {};
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (swapType) where.swapType = swapType;

    // Optimize: Select only necessary fields to reduce data transfer
    const transactions = await prisma.swapTransaction.findMany({
      where,
      select: {
        id: true,
        year: true,
        swapDate: true,
        swapType: true,
        groupName: true,
        groupNumber: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        swapDetails: {
          select: {
            id: true,
            sequence: true,
            personnelId: true,
            noId: true,
            nationalId: true,
            fullName: true,
            rank: true,
            seniority: true,
            posCodeId: true,
            posCodeMaster: {
              select: {
                id: true,
                name: true
              }
            },
            // ข้อมูลส่วนตัว
            birthDate: true,
            age: true,
            education: true,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: true,
            currentRankSince: true,
            enrollmentDate: true,
            retirementDate: true,
            yearsOfService: true,
            // ข้อมูลการฝึกอบรม
            trainingLocation: true,
            trainingCourse: true,
            // ตำแหน่ง
            fromPosition: true,
            fromPositionNumber: true,
            fromUnit: true,
            fromActingAs: true,
            toPosition: true,
            toPositionNumber: true,
            toUnit: true,
            toActingAs: true,
            notes: true
          },
          orderBy: [
            { sequence: 'asc' },
            { fullName: 'asc' }
          ]
        }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
        { year: 'desc' },
        { swapDate: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Error fetching swap transactions:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/swap-transactions
 * สร้างผลการสลับตำแหน่งใหม่
 */
export async function POST(request: NextRequest) {
  try {
  const body = await request.json();
  const { year, swapDate, swapType, groupName, groupNumber, notes, swapDetails } = body;

    // Validate
    const effectiveSwapType = swapType || 'two-way';
    const minDetails = effectiveSwapType === 'promotion-chain' ? 1 : 2;
    if (!year || !swapDate || !swapDetails || swapDetails.length < minDetails) {
      return NextResponse.json(
        { success: false, error: effectiveSwapType === 'promotion-chain' ? 'ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 1 ขั้นตอน' : 'ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 2 คนที่สลับตำแหน่ง' },
        { status: 400 }
      );
    }

    // Create transaction with details
    const transaction = await prisma.swapTransaction.create({
      data: {
        year,
        swapDate: new Date(swapDate),
        swapType: swapType || 'two-way',
        groupName,
        groupNumber,
        status: 'completed',
        notes,
        swapDetails: {
          create: swapDetails.map((detail: any, index: number) => ({
            sequence: detail.sequence !== undefined ? detail.sequence : (swapType === 'three-way' ? index + 1 : null),
            personnelId: detail.personnelId,
            noId: detail.noId,
            nationalId: detail.nationalId,
            fullName: detail.fullName,
            rank: detail.rank,
            seniority: detail.seniority,
            posCodeId: detail.posCodeId,
            // ข้อมูลส่วนตัว
            birthDate: detail.birthDate,
            age: detail.age,
            education: detail.education,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: detail.lastAppointment,
            currentRankSince: detail.currentRankSince,
            enrollmentDate: detail.enrollmentDate,
            retirementDate: detail.retirementDate,
            yearsOfService: detail.yearsOfService,
            // ข้อมูลการฝึกอบรม
            trainingLocation: detail.trainingLocation,
            trainingCourse: detail.trainingCourse,
            // ตำแหน่ง
            fromPosition: detail.fromPosition,
            fromPositionNumber: detail.fromPositionNumber,
            fromUnit: detail.fromUnit,
            fromActingAs: detail.fromActingAs,
            toPosition: detail.toPosition,
            toPositionNumber: detail.toPositionNumber,
            toUnit: detail.toUnit,
            toActingAs: detail.toActingAs,
            notes: detail.notes
          }))
        }
      },
      include: {
        swapDetails: {
          orderBy: swapType === 'three-way' ? { sequence: 'asc' } : { fullName: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'บันทึกผลการสลับตำแหน่งสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error creating swap transaction:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}
