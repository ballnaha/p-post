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

    const rows = await prisma.policePersonnel.findMany({
      where: {
        rank: { not: null },
        posCodeId: { not: null },
      },
      select: {
        posCodeId: true,
        posCodeMaster: { select: { id: true, name: true } },
      },
      orderBy: [{ posCodeId: 'asc' }],
    });

    // Deduplicate by posCodeId and map to { id, name }
    const map = new Map<number, string>();
    for (const r of rows) {
      if (r.posCodeId) {
        const name = r.posCodeMaster?.name ?? `PosCode ${r.posCodeId}`;
        if (!map.has(r.posCodeId)) map.set(r.posCodeId, name);
      }
    }
    const data = Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.id - b.id);

    // Cache the result
    dataCache.set(CACHE_KEYS.POS_CODES, data);

    return NextResponse.json({ success: true, total: data.length, data });
  } catch (error: any) {
    console.error('Fetch pos codes (from police_personnel) error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรหัสตำแหน่ง' },
      { status: 500 }
    );
  }
}
