import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการ three-way transactions (ใช้ SwapTransaction แทน)
// Optimized: Selective field selection instead of include for better performance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause: any = { swapType: 'three-way' };
    if (year) {
      whereClause.year = parseInt(year);
    }

    // Use select instead of include to fetch only necessary fields
    const transactions = await prisma.swapTransaction.findMany({
      where: whereClause,
      select: {
        id: true,
        groupNumber: true,
        groupName: true,
        swapDate: true,
        status: true,
        notes: true,
        year: true,
        createdAt: true,
        swapDetails: {
          select: {
            id: true,
            personnelId: true,
            noId: true,
            fullName: true,
            rank: true,
            nationalId: true,
            posCodeId: true,
            posCodeMaster: {
              select: {
                id: true,
                name: true,
              }
            },
            fromPosition: true,
            fromPositionNumber: true,
            fromUnit: true,
            fromActingAs: true,
            toPosition: true,
            toPositionNumber: true,
            toUnit: true,
            toActingAs: true,
            sequence: true,
            // ข้อมูลส่วนตัว
            birthDate: true,
            age: true,
            education: true,
            seniority: true,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: true,
            currentRankSince: true,
            enrollmentDate: true,
            retirementDate: true,
            yearsOfService: true,
            // ข้อมูลการฝึกอบรม
            trainingLocation: true,
            trainingCourse: true,
            notes: true,
            // ข้อมูลการเสนอชื่อ
            supportName: true,
            supportReason: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: [
        { year: 'desc' },
        { swapDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Error fetching three-way transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch three-way transactions' },
      { status: 500 }
    );
  }
}

// POST - สร้าง three-way transaction ใหม่ (ใช้ SwapTransaction แทน)
// Optimized: Added validation and selective field return
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, swapDate, groupName, groupNumber, status, notes, swapDetails } = body;

    // Validate: ต้องมี 3 คน
    if (!swapDetails || swapDetails.length !== 3) {
      return NextResponse.json(
        { success: false, error: 'Three-way swap must have exactly 3 people' },
        { status: 400 }
      );
    }

    // Additional validation
    if (!year || !swapDate) {
      return NextResponse.json(
        { success: false, error: 'Year and swap date are required' },
        { status: 400 }
      );
    }

    // Validate all personnel have required fields
    const hasInvalidDetail = swapDetails.some((detail: any) => 
      !detail.personnelId || !detail.fullName
    );
    if (hasInvalidDetail) {
      return NextResponse.json(
        { success: false, error: 'All personnel must have ID and full name' },
        { status: 400 }
      );
    }

    // สร้าง transaction พร้อม details (ใช้ SwapTransaction)
    const transaction = await prisma.swapTransaction.create({
      data: {
        year,
        swapDate: new Date(swapDate),
        swapType: 'three-way', // ระบุ type
        groupName,
        groupNumber,
        status: status || 'completed',
        notes,
        swapDetails: {
          create: swapDetails.map((detail: any, index: number) => ({
            sequence: index + 1, // 1, 2, 3
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
            notes: detail.notes,
          })),
        },
      },
      select: {
        id: true,
        groupNumber: true,
        groupName: true,
        swapDate: true,
        status: true,
        notes: true,
        year: true,
        createdAt: true,
        swapDetails: {
          select: {
            id: true,
            personnelId: true,
            fullName: true,
            rank: true,
            nationalId: true,
            posCodeId: true,
            fromPosition: true,
            fromPositionNumber: true,
            fromUnit: true,
            toPosition: true,
            toPositionNumber: true,
            toUnit: true,
            sequence: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Error creating three-way transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create three-way transaction' },
      { status: 500 }
    );
  }
}
