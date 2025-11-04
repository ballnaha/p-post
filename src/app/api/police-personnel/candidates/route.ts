import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

/**
 * GET /api/police-personnel/candidates
 * ดึงข้อมูลผู้สมัครสำหรับ Promotion Chain
 * เงื่อนไข: ต้องมี rank ไม่เป็น null (มีคนครองตำแหน่ง)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const unit = searchParams.get('unit') || undefined; // exact match
    const posCodeIdParam = searchParams.get('posCodeId') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const yearParam = searchParams.get('year'); // Year filter for excluding already assigned

    const page = pageParam ? Math.max(0, parseInt(pageParam, 10) || 0) : 0;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 20) : 20;

    // Get personnel IDs that are already in swap transactions for the specified year
    let excludedPersonnelIds: string[] = [];
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        // Find all swap transactions for this year (including all swap types)
        const swapTransactions = await prisma.swapTransaction.findMany({
          where: { year },
          select: { id: true },
        });

        const transactionIds = swapTransactions.map(st => st.id);

        if (transactionIds.length > 0) {
          // Get all personnel IDs from swap transaction details
          const swapDetails = await prisma.swapTransactionDetail.findMany({
            where: {
              transactionId: { in: transactionIds },
              personnelId: { not: null },
            },
            select: { personnelId: true },
          });

          excludedPersonnelIds = swapDetails
            .map(sd => sd.personnelId)
            .filter((id): id is string => id !== null);
        }
      }
    }

    // Build where clause
    const where: any = {
      rank: { not: null },
    };

    // Exclude personnel already in swap transactions for the year
    if (excludedPersonnelIds.length > 0) {
      where.id = { notIn: excludedPersonnelIds };
    }

    if (unit && unit !== 'all') {
      where.unit = unit;
    }

    if (posCodeIdParam && posCodeIdParam !== 'all') {
      const posCodeId = parseInt(posCodeIdParam, 10);
      if (!isNaN(posCodeId)) {
        where.posCodeId = posCodeId;
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { fullName: { contains: search } },
        { position: { contains: search } },
        { unit: { contains: search } },
        { actingAs: { contains: search } },
        { trainingCourse: { contains: search } },
      ];
    }

    // Count total (filtered)
    const total = await prisma.policePersonnel.count({ where });

    // Query data page
    const personnel = await prisma.policePersonnel.findMany({
      where,
      include: {
        posCodeMaster: true,
      },
      orderBy: [
        { posCodeId: 'asc' },
        { fullName: 'asc' },
      ],
      skip: page * limit,
      take: limit,
    });

    const candidates = personnel.map((p) => ({
      id: p.id,
      posCodeId: p.posCodeId,
      posCodeMaster: p.posCodeMaster
        ? { id: p.posCodeMaster.id, name: p.posCodeMaster.name }
        : null,
      posCodeName: p.posCodeMaster?.name,
      position: p.position || p.posCodeMaster?.name || '-',
      positionNumber: p.positionNumber,
      unit: p.unit || '-',
      fullName: p.fullName || '-',
      rank: p.rank || '-',
      nationalId: p.nationalId || '',
      seniority: p.seniority || '',
      rankLevel: p.posCodeId || 999,
      age: p.age || '-',
      yearsOfService: p.yearsOfService || '-',
      actingAs: p.actingAs || '-',
      trainingCourse: p.trainingCourse || '-',
      birthDate: p.birthDate || null,
      education: p.education || null,
      lastAppointment: p.lastAppointment || null,
      currentRankSince: p.currentRankSince || null,
      enrollmentDate: p.enrollmentDate || null,
      retirementDate: p.retirementDate || null,
      trainingLocation: p.trainingLocation || null,
      notes: p.notes || null,
    }));

    return NextResponse.json({
      success: true,
      data: candidates,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / (limit || 1)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates', details: error.message },
      { status: 500 }
    );
  }
}
