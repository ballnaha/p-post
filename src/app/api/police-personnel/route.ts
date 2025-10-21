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

    const skip = (page - 1) * limit;

    // สร้าง where clause สำหรับค้นหา
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { position: { contains: search } },
        { unit: { contains: search } },
        { rank: { contains: search } },
        { nationalId: { contains: search } },
      ];
    }

    // ดึงข้อมูล
    const [personnel, total] = await Promise.all([
      prisma.policePersonnel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
