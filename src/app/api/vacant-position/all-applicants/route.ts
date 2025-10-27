import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการผู้ยื่นขอทั้งหมดในระบบ เรียงตาม display_order
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause: any = {};

    if (year) {
      whereClause.year = parseInt(year);
    }

    // ดึงรายการผู้ยื่นขอทั้งหมด เรียงตาม displayOrder
    const applicants = await prisma.vacantPosition.findMany({
      where: whereClause,
      include: {
        posCodeMaster: true,
        requestedPosCode: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { id: 'asc' }
      ],
    });

    const formattedApplicants = applicants.map(applicant => ({
      id: applicant.id,
      fullName: applicant.fullName,
      rank: applicant.rank || 'ไม่ระบุ',
      position: applicant.posCodeMaster?.name || 'ไม่ระบุ',
      unit: applicant.unit || 'ไม่ระบุ',
      requestedPosition: applicant.requestedPosCode?.name || 'ไม่ระบุ',
      requestedPositionId: applicant.requestedPositionId,
      displayOrder: applicant.displayOrder,
      nominator: applicant.nominator,
      notes: applicant.notes,
      nationalId: applicant.nationalId,
      birthDate: applicant.birthDate,
      seniority: applicant.seniority,
    }));

    return NextResponse.json(formattedApplicants);
  } catch (error) {
    console.error('Error fetching all applicants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}