import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const search = (searchParams.get('search') || '').trim();
    const role = searchParams.get('role') || 'all';
    const isActiveParam = searchParams.get('isActive') || 'all'; // 'true' | 'false' | 'all'
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'username' | 'lastLogin' | 'role';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const where: any = { AND: [] as any[] };
    if (search) {
      where.AND.push({
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (role && role !== 'all') {
      where.AND.push({ role });
    }
    if (isActiveParam !== 'all') {
      where.AND.push({ isActive: isActiveParam === 'true' });
    }
    if (where.AND.length === 0) delete where.AND;

    const total = await prisma.user.count({ where });
    const skip = (page - 1) * pageSize;
    const orderBy: Record<string, 'asc' | 'desc'> = { [sortBy]: sortOrder };

    const data = await prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    });

    return NextResponse.json({ data, total, page, pageSize });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, firstName, lastName, password, role, isActive } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        password: hashedPassword,
        role: role || 'user',
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
