import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

/**
 * GET /api/police-personnel/promotion-eligible
 * ดึงข้อมูลบุคลากรที่สามารถเลื่อนตำแหน่งได้
 * 
 * Query Parameters:
 * - includeAll=true: ดึงข้อมูลทั้งหมดจาก police_personnel (รวมทั้งที่ไม่มียศ)
 * - includeAll=false หรือไม่ส่ง: กรองเฉพาะบุคลากรที่มียศ (rank not null)
 * 
 * เงื่อนไขอื่นๆ: 
 * - ไม่อยู่ใน two-way, three-way, promotion-chain ของปีที่เลือก
 * - รองรับ filter: search, unit, posCodeId, supporter
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
    const supporter = searchParams.get('supporter') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const yearParam = searchParams.get('year');
    const excludeTransactionId = searchParams.get('excludeTransactionId') || undefined;
    const includeAll = searchParams.get('includeAll') === 'true'; // เพิ่มตัวเลือกดึงข้อมูลทั้งหมด

    const page = pageParam ? Math.max(0, parseInt(pageParam, 10) || 0) : 0;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 20) : 20;

    // Get personnel IDs that are already in ANY swap transactions for the specified year
    let excludedPersonnelIds: string[] = [];
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        // Build transaction where clause
        const transactionWhere: any = { year };
        if (excludeTransactionId) {
          transactionWhere.id = { not: excludeTransactionId };
        }
        
        // Query all swap transactions for this year (two-way, three-way, promotion-chain)
        const swapDetails = await prisma.swapTransactionDetail.findMany({
          where: {
            transaction: transactionWhere,
            personnelId: { not: null },
          },
          select: { personnelId: true },
          distinct: ['personnelId'],
        });

        excludedPersonnelIds = swapDetails
          .map(sd => sd.personnelId)
          .filter((id): id is string => id !== null);
      }
    }

    // Build where clause
    const where: any = {
      AND: []
    };

    // ถ้าไม่ได้เลือก includeAll จะกรองเฉพาะคนที่มียศ (rank ไม่เป็น null)
    if (!includeAll) {
      where.rank = { not: null };
      where.AND.push({
        NOT: {
          rank: ''
        }
      });
    }

    // Exclude personnel already in ANY swap transactions for the year
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

    // Filter by supporter status
    if (supporter && supporter !== 'all') {
      if (supporter === 'with-supporter') {
        where.supporterName = { not: null };
      } else if (supporter === 'without-supporter') {
        where.AND.push({
          OR: [
            { supporterName: null },
            { supporterName: '' }
          ]
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

    // ลบ AND ถ้าเป็น array ว่าง
    if (where.AND && where.AND.length === 0) {
      delete where.AND;
    }

    // Count total (filtered)
    const total = await prisma.policePersonnel.count({ where });

    // Query data with pagination
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
        supporterName: true,
        supportReason: true,
      },
      orderBy: [
        { posCodeId: 'asc' },
        { fullName: 'asc' },
      ],
      skip: page * limit,
      take: limit,
    }) as any;

    const eligible = personnel.map((p: any) => ({
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
    }));

    return NextResponse.json({
      success: true,
      data: eligible,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / (limit || 1)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching promotion eligible personnel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotion eligible personnel', details: error.message },
      { status: 500 }
    );
  }
}
