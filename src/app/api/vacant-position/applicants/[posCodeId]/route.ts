import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการผู้ยื่นขอตำแหน่งเฉพาะ เรียงตาม display_order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ posCodeId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const resolvedParams = await params;
    const posCodeId = parseInt(resolvedParams.posCodeId);

    if (isNaN(posCodeId)) {
      return NextResponse.json(
        { error: 'Invalid position code ID' },
        { status: 400 }
      );
    }

    const whereClause: any = {
      requestedPositionId: posCodeId,
    };

    if (year) {
      whereClause.year = parseInt(year);
    }

    // ดึงรายการผู้ยื่นขอตำแหน่งเฉพาะ เรียงตาม displayOrder
    const applicants = await prisma.vacantPosition.findMany({
      where: whereClause,
      include: {
        posCodeMaster: true, // ตำแหน่งปัจจุบัน
        requestedPosCode: true, // ตำแหน่งที่ขอ
      },
      orderBy: [
        { displayOrder: 'asc' }, // เรียงตามลำดับที่กำหนด
        { createdAt: 'asc' }, // ถ้า displayOrder เท่ากัน ให้เรียงตามวันที่สร้าง
      ],
    });

    // ถ้าไม่มีข้อมูลให้ return เลย
    if (applicants.length === 0) {
      return NextResponse.json([]);
    }

    // เช็คว่าผู้ยื่นขอแต่ละคนถูกจับคู่แล้วหรือยัง (ใช้ personnelId)
    const applicantIds = applicants.map(a => a.id);
    
    // Query เฉพาะ applicants ที่มีอยู่ เพื่อลดจำนวนข้อมูล
    const assignedApplicants = await prisma.swapTransactionDetail.findMany({
      where: {
        personnelId: { in: applicantIds },
        transaction: {
          swapType: 'vacant-assignment',
          status: 'completed', // เฉพาะที่ยังไม่ถูกยกเลิก
        }
      },
      select: {
        personnelId: true,
        toPosition: true,
        toUnit: true,
        transaction: {
          select: {
            swapDate: true,
            year: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // สร้าง Map ของการจับคู่ (เก็บเฉพาะรายการแรก = ล่าสุด)
    const assignmentMap = new Map();
    assignedApplicants.forEach(detail => {
      if (!assignmentMap.has(detail.personnelId)) {
        assignmentMap.set(detail.personnelId, {
          assignedPosition: detail.toPosition,
          assignedUnit: detail.toUnit,
          assignedDate: detail.transaction.swapDate,
          assignedYear: detail.transaction.year,
        });
      }
    });

    // เพิ่มข้อมูลการจับคู่เข้าไปในผลลัพธ์
    const applicantsWithAssignment = applicants.map(applicant => ({
      ...applicant,
      assignmentInfo: assignmentMap.get(applicant.id) || null,
    }));

    return NextResponse.json(applicantsWithAssignment);
  } catch (error) {
    console.error('Error fetching applicants for position:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applicants for position' },
      { status: 500 }
    );
  }
}