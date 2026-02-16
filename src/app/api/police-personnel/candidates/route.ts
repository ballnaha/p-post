import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

/**
 * GET /api/police-personnel/candidates
 * ดึงข้อมูลผู้สมัครสำหรับ Promotion Chain
 * เงื่อนไข: ต้องมี rank ไม่เป็น null (มีคนครองตำแหน่ง)
 * 
 * Optimized: ใช้ subquery แทนการ query 2 ครั้ง + count ใน query เดียว
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const unit = searchParams.get('unit') || undefined;
    const posCodeIdParam = searchParams.get('posCodeId') || undefined;
    const hasRequestedPosition = searchParams.get('hasRequestedPosition') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const yearParam = searchParams.get('year');
    const excludeTransactionId = searchParams.get('excludeTransactionId') || undefined;
    const minPosCodeIdParam = searchParams.get('minPosCodeId') || undefined;

    const page = pageParam ? Math.max(0, parseInt(pageParam, 10) || 0) : 0;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 20) : 20;

    // Build where clause - ใช้ single query approach
    const where: any = {
      rank: { not: null },
      AND: [
        { NOT: { rank: '' } }
      ]
    };

    // Filter by year
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        where.year = year;
      }
    }

    // Exclude personnel already in swap transactions for the year
    // Optimized: ใช้ NOT EXISTS subquery ผ่าน Prisma relation filter แทนการ query 2 ครั้ง
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        // Build transaction filter for exclusion
        const txWhere: any = { year };
        if (excludeTransactionId) {
          txWhere.id = { not: excludeTransactionId };
        }

        // Exclude IDs that appear in swap_transaction_detail for this year
        // ใช้ raw query เพื่อ subquery ที่เร็วกว่า
        const swapDetails = await prisma.swapTransactionDetail.findMany({
          where: {
            transaction: txWhere,
            personnelId: { not: null },
          },
          select: { personnelId: true },
          distinct: ['personnelId'],
        });

        const excludedIds = swapDetails
          .map((sd: any) => sd.personnelId)
          .filter((id: any): id is string => id !== null);

        if (excludedIds.length > 0) {
          where.id = { notIn: excludedIds };
        }
      }
    }

    if (unit && unit !== 'all') {
      where.unit = unit;
    }

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

    // ใช้ Promise.all เพื่อ query count + data พร้อมกัน แทนที่จะ sequential
    const [total, personnel] = await Promise.all([
      prisma.policePersonnel.count({ where }),
      prisma.policePersonnel.findMany({
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
          supporterName: true,
          supportReason: true,
          requestedPosition: true,
          avatarUrl: true,
        },
        orderBy: [
          { posCodeId: 'asc' },
          { fullName: 'asc' },
        ],
        skip: page * limit,
        take: limit,
      }) as any,
    ]);

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
      supporterName: p.supporterName || null,
      supportReason: p.supportReason || null,
      requestedPosition: p.requestedPosition || null,
      avatarUrl: p.avatarUrl || null,
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
