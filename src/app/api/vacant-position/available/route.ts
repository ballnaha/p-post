import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildWildcardSearchWhere } from '@/lib/wildcardSearch';

const SEARCHABLE_FIELDS = ['position', 'unit', 'positionNumber', 'fullName'] as const;

/**
 * GET - ดึงรายการตำแหน่งว่างที่พร้อมใช้งาน
 * สำหรับใช้ในหน้า promotion-chain และหน้าอื่นๆ ที่ต้องการตำแหน่งว่างที่ยังไม่ถูกจับคู่
 * 
 * ✅ Optimized v2:
 * - ใช้ select แทน include เพื่อลดขนาดข้อมูล
 * - ใช้ Promise.all สำหรับ count + data + assignedPositions
 * - กรอง unassigned ใน JS แทน subquery เพราะ Prisma ไม่รองรับ NOT EXISTS subquery
 * - ลดจำนวนฟิลด์ที่ดึงจาก posCodeMaster
 * 
 * Query Parameters:
 * - year: ปีงบประมาณ (required)
 * - unassignedOnly: true/false - กรองเฉพาะตำแหน่งที่ยังไม่ถูกจับคู่ (default: true)
 * - page: หน้าที่ต้องการ (0-based, optional)
 * - limit: จำนวนรายการต่อหน้า (optional)
 * - search: ค้นหาจาก position, unit, positionNumber (optional)
 * - posCodeId: กรองตาม posCodeId (optional)
 * - unit: กรองตามหน่วยงาน (optional)
 * - status: กรองตามสถานะ 'vacant' หรือ 'reserved' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unassignedOnly = searchParams.get('unassignedOnly') !== 'false';
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search');
    const posCodeId = searchParams.get('posCodeId');
    const unit = searchParams.get('unit');
    const status = searchParams.get('status');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearInt = parseInt(year);

    // Parse pagination
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const usePagination = page !== undefined && limit !== undefined;

    // Build status filter
    let fullNameFilter: any[];
    if (status === 'vacant') {
      fullNameFilter = [
        { fullName: null },
        { fullName: '' },
        {
          AND: [
            { fullName: { not: null } },
            { fullName: { not: '' } },
            { fullName: { not: { contains: 'ว่าง (กันตำแหน่ง)' } } },
            { fullName: { not: { contains: 'ว่าง(กันตำแหน่ง)' } } }
          ]
        }
      ];
    } else if (status === 'reserved') {
      fullNameFilter = [
        { fullName: { contains: 'ว่าง (กันตำแหน่ง)' } },
        { fullName: { contains: 'ว่าง(กันตำแหน่ง)' } }
      ];
    } else {
      fullNameFilter = [
        { fullName: null },
        { fullName: '' },
        { fullName: { contains: 'ว่าง' } },
        { fullName: { contains: 'กันตำแหน่ง' } }
      ];
    }

    const whereClause: any = {
      year: yearInt,
      isActive: true,
      AND: [
        { OR: [{ rank: null }, { rank: '' }] },
        { OR: fullNameFilter }
      ]
    };

    // Filter by unit
    if (unit && unit !== 'all') {
      whereClause.AND.push({ unit: { equals: unit } });
    }

    // Filter by search text
    if (search) {
      const searchWhere = buildWildcardSearchWhere(SEARCHABLE_FIELDS, search);
      if (searchWhere) {
        whereClause.AND.push(searchWhere);
      }
    }

    // Filter by posCodeId
    if (posCodeId) {
      const pId = parseInt(posCodeId);
      whereClause.AND.push({ posCodeId: pId });
    }

    // ✅ Optimized: Run count + data + assigned in parallel
    const queries: Promise<any>[] = [
      // Query 1: Count
      prisma.policePersonnel.count({ where: whereClause }),
      // Query 2: Data with select (ลดขนาดข้อมูล)
      prisma.policePersonnel.findMany({
        where: whereClause,
        select: {
          id: true,
          noId: true,
          position: true,
          positionNumber: true,
          unit: true,
          rank: true,
          fullName: true,
          nationalId: true,
          actingAs: true,
          requestedPosition: true,
          supporterName: true,
          supportReason: true,
          notes: true,
          posCodeId: true,
          posCodeMaster: {
            select: {
              id: true,
              name: true,
            }
          },
        },
        orderBy: [
          { posCodeId: 'asc' },
          { position: 'asc' },
          { noId: 'asc' }
        ],
        // ลบการแบ่งหน้าในระดับ DB ออก เพื่อไปแบ่งหน้าหลังจากการกรอง (Filter) ด้วย JavaScript 
        // จะทำให้จำนวนต่อหน้าแสดงผลได้ครบถ้วนอย่างมืออาชีพ
      }),
    ];

    // Query 3: Assigned positions (only if needed)
    const includeIds = searchParams.get('includeIds')?.split(',') || [];

    if (unassignedOnly) {
      queries.push(
        prisma.swapTransactionDetail.findMany({
          where: {
            transaction: { year: yearInt },
            toPosition: { not: null },
            isPlaceholder: false // ✅ ไม่นับรายการที่เป็นตำแหน่งว่างจำลอง (Placeholder)
          },
          select: {
            toPosition: true,
            toUnit: true,
            toPositionNumber: true,
          }
        })
      );
    }

    const results = await Promise.all(queries);
    const totalCount = results[0] as number;
    const vacantPositions = results[1] as any[];

    // Filter unassigned
    let filteredPositions = vacantPositions;
    if (unassignedOnly && results[2]) {
      const assignedPositions = results[2] as any[];
      
      // สร้าง Map นับจำนวนโควต้าการจองเพื่อหักลบแบบ 1-ต่อ-1
      const assignedCounts: Record<string, number> = {};
      assignedPositions.forEach(p => {
        const key = `${p.toPosition}-${p.toUnit}-${p.toPositionNumber}`;
        assignedCounts[key] = (assignedCounts[key] || 0) + 1;
      });

      filteredPositions = vacantPositions.filter(position => {
        if (includeIds.includes(String(position.id))) return true;

        const key = `${position.position}-${position.unit}-${position.positionNumber}`;
        if (assignedCounts[key] > 0) {
            assignedCounts[key]--; // หักโควต้าแล้วตัดออก
            return false;
        }
        return true;
      });
    }

    // ✅ นำการแบ่งหน้า (Pagination) มาไว้ในส่วน JS แทน
    // เพื่อให้เวลาถูกหักลบตำแหน่งที่ใช้ออกไปแล้ว ระบบยังคงเติมตำแหน่งที่เหลือให้เต็มหน้าจอ
    let paginatedPositions = filteredPositions;
    if (usePagination) {
      const startIndex = page * limit;
      const endIndex = startIndex + limit;
      paginatedPositions = filteredPositions.slice(startIndex, endIndex);
    }

    // จัดกลุ่มตามตำแหน่ง
    const groupedPositions = paginatedPositions.reduce((acc, position: any) => {
      const pcId = position.posCodeMaster?.id;
      const pcName = position.posCodeMaster?.name;
      const key = `${pcId}-${pcName}`;

      if (!acc[key]) {
        acc[key] = {
          posCodeId: pcId,
          posCodeName: pcName,
          positions: [],
        };
      }

      acc[key].positions.push({
        id: position.id,
        noId: position.noId,
        position: position.position,
        unit: position.unit,
        positionNumber: position.positionNumber,
        rank: position.rank,
        fullName: position.fullName,
        nationalId: position.nationalId,
        actingAs: position.actingAs,
        requestedPosition: position.requestedPosition,
        supporterName: position.supporterName,
        supportReason: position.supportReason,
        notes: position.notes,
      });

      return acc;
    }, {} as Record<string, any>);

    // แปลงเป็น array และเรียงตามชื่อตำแหน่ง
    const formattedData = Object.values(groupedPositions)
      .sort((a: any, b: any) => {
        return (a.posCodeName || '').localeCompare(b.posCodeName || '', 'th');
      });

    // ✅ ปรับปรุงการคำนวณ Total ให้แม่นยำ 100%
    // 1. ดึง Key ของตำแหน่งที่ตรงตามเงื่อนไข Filter ทั้งหมด (โดยไม่แบ่งหน้า)
    const allMatchingKeys = await prisma.policePersonnel.findMany({
      where: whereClause,
      select: {
        id: true,
        position: true,
        unit: true,
        positionNumber: true,
      }
    });

    // 2. กรองเฉพาะที่ยังไม่ถูก Assigned
    // 2. กรองเฉพาะที่ยังไม่ถูก Assigned โดยจับคู่แบบ 1-ต่อ-1
    let trueUnassignedCount = 0;
    if (unassignedOnly && results[2]) {
      const assignedPositions = results[2] as any[];
      // นับจำนวนครั้งที่แต่ละตำแหน่งถูกจอง
      const assignedCounts: Record<string, number> = {};
      assignedPositions.forEach(p => {
        const key = `${p.toPosition}-${p.toUnit}-${p.toPositionNumber}`;
        assignedCounts[key] = (assignedCounts[key] || 0) + 1;
      });

      let debugLog = `--- DEBUG ASSIGNED COUNTS ---\nTotal Matching Keys: ${allMatchingKeys.length}\nAssigned Positions: ${assignedPositions.length}\n`;
      debugLog += `Assigned Counts Map: ${JSON.stringify(assignedCounts)}\n`;

      let removedKeys: string[] = [];
      trueUnassignedCount = allMatchingKeys.filter(position => {
        if (includeIds.includes(String(position.id))) return true;

        const key = `${position.position}-${position.unit}-${position.positionNumber}`;
        if (assignedCounts[key] > 0) {
          assignedCounts[key]--; // หักโควต้าที่ถูกจองไป 1
          removedKeys.push(key);
          return false; // ตัดรายการนี้ออก
        }
        return true;
      }).length;
      
      debugLog += `Removed Keys: ${JSON.stringify(removedKeys)}\n`;
      debugLog += `True Unassigned Count: ${trueUnassignedCount}\n`;
      
      const fs = require('fs');
      fs.writeFileSync('debug-vacant.txt', debugLog);
    } else {
      trueUnassignedCount = allMatchingKeys.length;
    }

    return NextResponse.json({
      year: yearInt,
      total: trueUnassignedCount,
      count: filteredPositions.length,
      unassignedOnly,
      groups: formattedData,
      ...(usePagination && {
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(trueUnassignedCount / (limit || 1)),
        }
      }),
    });

  } catch (error) {
    console.error('Error fetching available vacant positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available vacant positions' },
      { status: 500 }
    );
  }
}
