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
    const hasRequestedPosition = searchParams.get('hasRequestedPosition') || undefined; // hasRequestedPosition filter
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const yearParam = searchParams.get('year'); // Year filter for excluding already assigned
    const excludeTransactionId = searchParams.get('excludeTransactionId') || undefined; // Transaction ID to exclude from filtering

    const page = pageParam ? Math.max(0, parseInt(pageParam, 10) || 0) : 0;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 20) : 20;

    // Get personnel IDs that are already in swap transactions for the specified year
    // Optimized: Use single query with join instead of two separate queries
    let excludedPersonnelIds: string[] = [];
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        // Build transaction where clause
        const transactionWhere: any = { year };
        if (excludeTransactionId) {
          transactionWhere.id = { not: excludeTransactionId };
        }

        // Single optimized query with join
        const swapDetails = await prisma.swapTransactionDetail.findMany({
          where: {
            transaction: transactionWhere,
            personnelId: { not: null },
          },
          select: { personnelId: true },
          distinct: ['personnelId'], // Get unique personnel IDs only
        });

        excludedPersonnelIds = swapDetails
          .map(sd => sd.personnelId)
          .filter((id): id is string => id !== null);
      }
    }

    // Build where clause
    const where: any = {
      rank: { not: null },
      // กรองตำแหน่งว่างออก - ตรวจสอบว่า rank ไม่เป็น empty string
      AND: [
        {
          NOT: {
            rank: ''
          }
        }
      ]
    };

    // Filter by year if provided
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        where.year = year;
      }
    }

    // Exclude personnel already in swap transactions for the year
    if (excludedPersonnelIds.length > 0) {
      where.id = { notIn: excludedPersonnelIds };
    }

    if (unit && unit !== 'all') {
      where.unit = unit;
    }

    const minPosCodeIdParam = searchParams.get('minPosCodeId') || undefined;

    if (posCodeIdParam && posCodeIdParam !== 'all') {
      const posCodeId = parseInt(posCodeIdParam, 10);
      if (!isNaN(posCodeId)) {
        where.posCodeId = posCodeId;
      }
    } else if (minPosCodeIdParam) {
      const minPosCodeId = parseInt(minPosCodeIdParam, 10);
      if (!isNaN(minPosCodeId)) {
        where.posCodeId = { gte: minPosCodeId };
      }
    }

    // Filter by hasRequestedPosition status
    if (hasRequestedPosition && hasRequestedPosition !== 'all') {
      if (hasRequestedPosition === 'with-supporter') {
        where.AND.push({
          OR: [
            { supporterName: { not: null, notIn: [''] } },
            { supportReason: { not: null, notIn: [''] } },
            { requestedPosition: { not: null, notIn: [''] } },
          ]
        });
      } else if (hasRequestedPosition === 'without-supporter') {
        where.AND.push({
          supporterName: { in: [null, ''] },
          supportReason: { in: [null, ''] },
          requestedPosition: { in: [null, ''] },
        });
      }
    }

    if (search && search.trim()) {
      where.AND.push({
        OR: [
          { fullName: { contains: search } },
          { position: { contains: search } },
          { unit: { contains: search } },
          { actingAs: { contains: search } },
          { trainingCourse: { contains: search } },
        ]
      });
    }

    // Count total (filtered)
    const total = await prisma.policePersonnel.count({ where });

    // Query data page with optimized select (only fields we need)
    const personnel = await prisma.policePersonnel.findMany({
      where,
      select: {
        id: true,
        noId: true,
        posCodeId: true,
        posCodeMaster: {
          select: {
            id: true,
            name: true,
          },
        },
        position: true,
        positionNumber: true,
        unit: true,
        fullName: true,
        rank: true,
        nationalId: true,
        seniority: true,
        age: true,
        yearsOfService: true,
        actingAs: true,
        trainingCourse: true,
        birthDate: true,
        education: true,
        lastAppointment: true,
        currentRankSince: true,
        enrollmentDate: true,
        retirementDate: true,
        trainingLocation: true,
        notes: true,
        supporterName: true, // เพิ่มฟิลด์ผู้สนับสนุน
        supportReason: true, // เพิ่มฟิลด์เหตุผล
        requestedPosition: true, // เพิ่มฟิลด์ตำแหน่งที่ร้องขอ
        avatarUrl: true, // เพิ่มฟิลด์รูปภาพ
      },
      orderBy: [
        { posCodeId: 'asc' },
        { fullName: 'asc' },
      ],
      skip: page * limit,
      take: limit,
    }) as any; // Temporary any type until Prisma client updates

    const candidates = personnel.map((p: any) => ({
      id: p.id,
      noId: p.noId,
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
      supporterName: p.supporterName || null, // ผู้สนับสนุน
      supportReason: p.supportReason || null, // เหตุผลในการสนับสนุน
      requestedPosition: p.requestedPosition || null, // ตำแหน่งที่ร้องขอ
      avatarUrl: p.avatarUrl || null, // รูปภาพ
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
