import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ข้าม middleware สำหรับ static files และ API auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // ไฟล์ต่างๆ เช่น .png, .js
  ) {
    return NextResponse.next();
  }

  // ตรวจสอบ API routes (ไม่รวม /api/auth)
  if (pathname.startsWith('/api/')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง - กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // ตรวจสอบว่าเป็น admin
    if (token.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่มีสิทธิ์เข้าถึง - ต้องเป็น Admin เท่านั้น',
          currentRole: token.role 
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

// กำหนด path ที่ต้องการให้ middleware ทำงาน
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
