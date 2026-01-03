import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Registration is disabled.' },
    { status: 403 }
  );
}
