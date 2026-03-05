import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

/**
 * GET /api/pos-code-master
 * ดึงข้อมูล Position Code Master ทั้งหมด
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const page = pageParam ? Math.max(0, parseInt(pageParam, 10) || 0) : 0;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : 50;

    const where: any = {};

    if (search && search.trim()) {
      where.OR = [
        { id: isNaN(parseInt(search)) ? undefined : parseInt(search) },
        { name: { contains: search } },
      ].filter(Boolean);
    }

    const [total, posCodeMasters] = await Promise.all([
      prisma.posCodeMaster.count({ where }),
      prisma.posCodeMaster.findMany({
        where,
        orderBy: [{ id: 'asc' }],
        skip: page * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: posCodeMasters,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / (limit || 1)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching pos code masters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pos code masters', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pos-code-master
 * สร้าง Position Code Master ใหม่
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Position code ID and name are required' },
        { status: 400 }
      );
    }

    const posCodeId = parseInt(id);
    if (isNaN(posCodeId)) {
      return NextResponse.json(
        { error: 'Position code ID must be a number' },
        { status: 400 }
      );
    }

    // Check if ID already exists
    const existing = await prisma.posCodeMaster.findUnique({
      where: { id: posCodeId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Position code ID already exists' },
        { status: 409 }
      );
    }

    const posCodeMaster = await prisma.posCodeMaster.create({
      data: {
        id: posCodeId,
        name: name.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      data: posCodeMaster,
      message: 'Position code master created successfully',
    });
  } catch (error: any) {
    console.error('Error creating pos code master:', error);
    return NextResponse.json(
      { error: 'Failed to create pos code master', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pos-code-master
 * อัปเดต Position Code Master
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Position code ID and name are required' },
        { status: 400 }
      );
    }

    const posCodeId = parseInt(id);
    if (isNaN(posCodeId)) {
      return NextResponse.json(
        { error: 'Position code ID must be a number' },
        { status: 400 }
      );
    }

    // Check if exists
    const existing = await prisma.posCodeMaster.findUnique({
      where: { id: posCodeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Position code master not found' },
        { status: 404 }
      );
    }

    const posCodeMaster = await prisma.posCodeMaster.update({
      where: { id: posCodeId },
      data: {
        name: name.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      data: posCodeMaster,
      message: 'Position code master updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating pos code master:', error);
    return NextResponse.json(
      { error: 'Failed to update pos code master', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pos-code-master
 * ลบ Position Code Master
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json(
        { error: 'Position code ID is required' },
        { status: 400 }
      );
    }

    const posCodeId = parseInt(idParam);
    if (isNaN(posCodeId)) {
      return NextResponse.json(
        { error: 'Position code ID must be a number' },
        { status: 400 }
      );
    }

    // Check if exists
    const existing = await prisma.posCodeMaster.findUnique({
      where: { id: posCodeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Position code master not found' },
        { status: 404 }
      );
    }

    // Check if being used
    const personnelCount = await prisma.policePersonnel.count({
      where: { posCodeId },
    });

    if (personnelCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete position code that is being used',
          details: `This position code is used by ${personnelCount} personnel records`,
        },
        { status: 409 }
      );
    }

    await prisma.posCodeMaster.delete({
      where: { id: posCodeId },
    });

    return NextResponse.json({
      success: true,
      message: 'Position code master deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting pos code master:', error);
    return NextResponse.json(
      { error: 'Failed to delete pos code master', details: error.message },
      { status: 500 }
    );
  }
}
