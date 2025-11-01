import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการตำแหน่งที่ว่างจาก vacant_position (snapshot ถาวร)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null;
    const search = searchParams.get('search')?.trim() || '';
    const unitFilter = searchParams.get('unit') || 'all';
    const posCodeFilter = searchParams.get('posCode') || 'all';
    const positionFilter = searchParams.get('position') || 'all';
    const year = searchParams.get('year'); // เพิ่ม year parameter

    // ตรวจสอบ year (required)
    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);

    // ถ้าไม่มี page และ limit จะดึงทั้งหมด
  const usePagination = page !== null && limit !== null;
  const skip = usePagination && limit !== null ? (page! - 1) * limit : 0;

    // สร้าง where clause สำหรับตำแหน่งที่ว่าง จาก vacant_position
    // ดึงเฉพาะตำแหน่งว่าง (ไม่ใช่ผู้ยื่นขอ) - แสดงทั้งที่จับคู่แล้วและยังไม่จับคู่
    const where: any = {
      year: yearNumber,
      nominator: null, // เฉพาะตำแหน่งว่าง (ไม่ใช่ผู้ยื่นขอ)
      requestedPositionId: null
      // ไม่กรอง isAssigned เพื่อให้แสดงทั้งที่จับคู่แล้วและยังไม่จับคู่
    };

    // เพิ่ม unit filter
    if (unitFilter !== 'all') {
      where.unit = unitFilter;
    }

    // เพิ่ม posCode filter
    if (posCodeFilter !== 'all') {
      const posCodeId = parseInt(posCodeFilter);
      if (!isNaN(posCodeId)) {
        where.posCodeId = posCodeId;
      }
    }

    // เพิ่ม position filter
    if (positionFilter !== 'all') {
      where.position = positionFilter;
    }

    // ดึงข้อมูลตำแหน่งที่ว่างจาก vacant_position
    const vacantPositions = await prisma.vacantPosition.findMany({
      where,
      include: {
        posCodeMaster: true,
      },
      orderBy: [
        { unit: 'asc' },
        { position: 'asc' },
        { positionNumber: 'asc' },
      ],
    });

    // เช็คว่าตำแหน่งเหล่านี้ถูกจับคู่แล้วหรือยัง (จาก swap_transaction_detail)
    // ค้นหาจาก toPosition + toUnit ที่ตรงกับตำแหน่งว่าง
    const assignedDetails = await prisma.swapTransactionDetail.findMany({
      where: {
        transaction: {
          swapType: 'vacant-assignment',
          status: 'completed',
          year: yearNumber, // เฉพาะปีที่เลือก
        }
      },
      include: {
        transaction: {
          select: {
            swapDate: true,
            year: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // สร้าง Map ของการจับคู่ (key = vacant_position.id)
    // ค้นหาจาก toPosition + toUnit + toPositionNumber ที่ตรงกับตำแหน่งว่าง
    const assignmentMap = new Map();
    for (const detail of assignedDetails) {
      // ค้นหาตำแหน่งที่ตรงกับ toPosition + toUnit + toPositionNumber
      const matchedPosition = vacantPositions.find(vp => 
        vp.position === detail.toPosition && 
        vp.unit === detail.toUnit &&
        vp.positionNumber === detail.toPositionNumber
      );
      
      if (matchedPosition && !assignmentMap.has(matchedPosition.id)) {
        assignmentMap.set(matchedPosition.id, {
          assignedPersonName: detail.fullName || 'ไม่ระบุ',
          assignedPersonRank: detail.rank || '',
          assignedPosition: detail.toPosition,
          assignedUnit: detail.toUnit,
          assignedDate: detail.transaction?.swapDate || new Date(),
          assignedYear: detail.transaction?.year || yearNumber,
        });
      }
    }

    // Return individual vacant positions with assignmentInfo
    const resultWithAssignments = vacantPositions.map(position => {
      const assignmentInfo = assignmentMap.get(position.id) || null;
      return {
        id: position.id,
        posCodeId: position.posCodeId,
        posCodeName: position.posCodeMaster?.name || 'ไม่ระบุ',
        unit: position.unit,
        position: position.position,
        positionNumber: position.positionNumber,
        actingAs: position.actingAs,
        notes: position.notes,
        fullName: position.fullName,
        isAssigned: position.isAssigned, // สถานะการจับคู่
        year: position.year,
        assignmentInfo, // เพิ่มข้อมูลการจับคู่
      };
    });

    // Apply search filter (รองรับการค้นหาชื่อผู้ถูกจับคู่)
    let filteredResult = resultWithAssignments;
    if (search) {
      const normalizedSearch = search.toLowerCase();
      filteredResult = resultWithAssignments.filter((position) => {
        const fieldsToSearch = [
          position.position,
          position.unit,
          position.positionNumber,
          position.posCodeName,
          position.assignmentInfo?.assignedPersonName,
          position.assignmentInfo?.assignedPersonRank,
          position.assignmentInfo?.fromUnit,
          position.assignmentInfo?.fromPosition,
        ];

        return fieldsToSearch.some((value) =>
          value ? value.toLowerCase().includes(normalizedSearch) : false
        );
      });
    }

    const filteredTotal = filteredResult.length;
    const paginatedResult = usePagination && limit
      ? filteredResult.slice(skip, skip + limit)
      : filteredResult;

    // Return different format based on pagination
    if (usePagination && limit) {
      return NextResponse.json({
        success: true,
        data: paginatedResult,
        pagination: {
          page: page!,
          limit: limit,
          total: filteredTotal,
          totalPages: Math.ceil(filteredTotal / limit),
        },
      });
    } else {
      // Return all data without pagination
      return NextResponse.json({
        success: true,
        data: paginatedResult,
        total: filteredTotal,
      });
    }
  } catch (error) {
    console.error('Error fetching actual vacant positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actual vacant positions' },
      { status: 500 }
    );
  }
}