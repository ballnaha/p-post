import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/swap-list/[id]
 * DEPRECATED - ไม่ใช้แล้ว table swap_list ถูกลบ
 * ใช้ /api/swap-transactions แทน
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'API นี้ไม่ใช้แล้ว กรุณาใช้ /api/swap-transactions แทน',
      redirect: '/api/swap-transactions'
    },
    { status: 410 } // Gone
  );
}

/**
 * PUT /api/swap-list/[id]
 * DEPRECATED - ใช้ /api/swap-transactions แทน
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'API นี้ไม่ใช้แล้ว กรุณาใช้ /api/swap-transactions แทน',
      redirect: '/api/swap-transactions'
    },
    { status: 410 }
  );
}

/**
 * DELETE /api/swap-list/[id]
 * DEPRECATED - ใช้ /api/swap-transactions แทน
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'API นี้ไม่ใช้แล้ว กรุณาใช้ /api/swap-transactions แทน',
      redirect: '/api/swap-transactions'
    },
    { status: 410 }
  );
}
