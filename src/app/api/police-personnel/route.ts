import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Optional: Check authentication (uncomment to require login)
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const positionFilter = searchParams.get('position') || 'all';
    const unitFilter = searchParams.get('unit') || 'all';
    const rankFilter = searchParams.get('rank') || 'all';

    const skip = (page - 1) * limit;

    // สร้าง where clause สำหรับค้นหา
    const where: any = {};
    
    // เพิ่ม position filter - ตรวจสอบจาก rank แทน fullName
    if (positionFilter === 'vacant') {
      where.OR = [
        { rank: { equals: null } },
        { rank: { equals: '' } }
      ];
    } else if (positionFilter === 'occupied') {
      where.AND = [
        { rank: { not: null } },
        { rank: { not: '' } }
      ];
    }
    
    // เพิ่ม unit filter
    if (unitFilter !== 'all') {
      if (where.AND) {
        where.AND.push({ unit: { equals: unitFilter } });
      } else {
        where.AND = [{ unit: { equals: unitFilter } }];
      }
    }
    
    // เพิ่ม rank filter
    if (rankFilter !== 'all') {
      if (where.AND) {
        where.AND.push({ rank: { equals: rankFilter } });
      } else {
        where.AND = [{ rank: { equals: rankFilter } }];
      }
    }
    
    if (search) {
      const searchConditions = [
        { fullName: { contains: search } },
        { position: { contains: search } },
        { nationalId: { contains: search } },
        { positionNumber: { contains: search } },
      ];
      
      if (where.AND || where.OR) {
        // ถ้ามี filter อื่นแล้ว ให้เพิ่ม search เข้าไป
        where.AND = where.AND ? [...where.AND, { OR: searchConditions }] : [{ OR: searchConditions }];
      } else {
        where.OR = searchConditions;
      }
    }

    // ดึงข้อมูล
    const [personnel, total] = await Promise.all([
      prisma.policePersonnel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { noId: 'asc' } as any, // Type workaround - will be fixed after TS server restart
        include: {
          posCodeMaster: true,
        },
      }),
      prisma.policePersonnel.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: personnel,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}
