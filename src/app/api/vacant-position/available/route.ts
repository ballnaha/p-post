import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET - ดึงรายการตำแหน่งว่างที่พร้อมใช้งาน
 * สำหรับใช้ในหน้า promotion-chain และหน้าอื่นๆ ที่ต้องการตำแหน่งว่างที่ยังไม่ถูกจับคู่
 * 
 * Query Parameters:
 * - year: ปีงบประมาณ (required)
 * - unassignedOnly: true/false - กรองเฉพาะตำแหน่งที่ยังไม่ถูกจับคู่ (default: true)
 * - minRankLevel: เลขระดับยศขั้นต่ำ (optional)
 * - maxRankLevel: เลขระดับยศสูงสุด (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unassignedOnly = searchParams.get('unassignedOnly') !== 'false'; // default true
    const minRankLevel = searchParams.get('minRankLevel');
    const maxRankLevel = searchParams.get('maxRankLevel');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const whereClause: any = {
      year: parseInt(year),
    };

    // กรองเฉพาะตำแหน่งที่ยังไม่ถูกจับคู่
    if (unassignedOnly) {
      whereClause.isAssigned = false;
    }

    // Note: rankLevel filtering is removed as PosCodeMaster doesn't have this field
    // Filter by posCodeId instead if needed

    // ดึงข้อมูลตำแหน่งว่าง
    const vacantPositions = await prisma.vacantPosition.findMany({
      where: whereClause,
      include: {
        posCodeMaster: true,
        requestedPosCode: true,
      },
      orderBy: [
        { requestedPositionId: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    // จัดกลุ่มตามตำแหน่งที่ขอ
    const groupedPositions = vacantPositions.reduce((acc, position) => {
      const posCodeId = position.requestedPosCode?.id || position.posCodeMaster?.id;
      const posCodeName = position.requestedPosCode?.name || position.posCodeMaster?.name;
      const key = `${posCodeId}-${posCodeName}`;

      if (!acc[key]) {
        acc[key] = {
          posCodeId: posCodeId,
          posCodeName: posCodeName,
          positions: [],
        };
      }

      acc[key].positions.push({
        id: position.id,
        position: position.position,
        unit: position.unit,
        positionNumber: position.positionNumber,
        rank: position.rank,
        fullName: position.fullName,
        nationalId: position.nationalId,
        nominator: position.nominator,
        notes: position.notes,
        displayOrder: position.displayOrder,
      });

      return acc;
    }, {} as Record<string, any>);

    // แปลงเป็น array และเรียงตามชื่อตำแหน่ง
    const formattedData = Object.values(groupedPositions)
      .sort((a: any, b: any) => {
        return (a.posCodeName || '').localeCompare(b.posCodeName || '', 'th');
      });

    return NextResponse.json({
      year: parseInt(year),
      total: vacantPositions.length,
      unassignedOnly,
      groups: formattedData,
    });

  } catch (error) {
    console.error('Error fetching available vacant positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available vacant positions' },
      { status: 500 }
    );
  }
}
