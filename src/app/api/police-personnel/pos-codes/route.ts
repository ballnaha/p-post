import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dataCache, CACHE_KEYS } from '@/utils/cache';

/**
 * GET /api/police-personnel/pos-codes
 * Return POSCODEs that actually exist in police_personnel (rank not null),
 * joined with PosCodeMaster to get names.
 * Cached for 5 minutes for better performance.
 */
export async function GET() {
  try {
    // Check cache first
    const cached = dataCache.get<{ id: number; name: string }[]>(CACHE_KEYS.POS_CODES);
    if (cached) {
      return NextResponse.json({ success: true, total: cached.length, data: cached, cached: true });
    }

    // Fetch all pos codes from PosCodeMaster
    const posCodes = await prisma.posCodeMaster.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    // Cache the result
    dataCache.set(CACHE_KEYS.POS_CODES, posCodes);

    return NextResponse.json({ success: true, total: posCodes.length, data: posCodes });
  } catch (error: any) {
    console.error('Fetch pos codes error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรหัสตำแหน่ง' },
      { status: 500 }
    );
  }
}
