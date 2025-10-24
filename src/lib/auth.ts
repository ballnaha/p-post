import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

/**
 * ตรวจสอบว่า user เป็น admin หรือไม่
 * ใช้ใน API routes
 */
export async function checkAdminAuth() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง - กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      ),
    };
  }

  if (session.user?.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { 
          success: false, 
          error: 'ไม่มีสิทธิ์เข้าถึง - ต้องเป็น Admin เท่านั้น',
          currentRole: session.user?.role 
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
  };
}

/**
 * ตรวจสอบว่า user login หรือไม่ (ไม่จำเป็นต้องเป็น admin)
 */
export async function checkAuth() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง - กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    session,
  };
}
