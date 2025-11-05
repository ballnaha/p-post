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
    // ตอนนี้ vacant_position เป็น snapshot ของตำแหน่งว่างทั้งหมด
    const where: any = {
      year: yearNumber
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

    // ถ้าไม่มีข้อมูลให้ return เลย
    if (vacantPositions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // สร้าง key สำหรับ match (position-unit-positionNumber) เพื่อลด complexity
    const positionKeys = vacantPositions.map(vp => 
      `${vp.position}|${vp.unit}|${vp.positionNumber}`
    );

    // ดึงข้อมูล assignment เฉพาะที่ match กับตำแหน่งที่มี (ใช้ IN clause)
    // แทนที่จะดึงทั้งหมดแล้วค่อย filter
    const assignedDetails = await prisma.swapTransactionDetail.findMany({
      where: {
        transaction: {
          swapType: 'vacant-assignment',
          status: 'completed',
          year: yearNumber,
        },
        // ใช้ OR เพื่อให้ MySQL optimize การค้นหา
        OR: vacantPositions.map(vp => ({
          toPosition: vp.position,
          toUnit: vp.unit,
          toPositionNumber: vp.positionNumber,
        })),
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

    // สร้าง Map ของการจับคู่โดยใช้ composite key
    const assignmentMap = new Map();
    assignedDetails.forEach(detail => {
      const key = `${detail.toPosition}|${detail.toUnit}|${detail.toPositionNumber}`;
      if (!assignmentMap.has(key)) { // เอาเฉพาะรายการแรก (ล่าสุด)
        assignmentMap.set(key, {
          assignedPersonName: detail.fullName || 'ไม่ระบุ',
          assignedPersonRank: detail.rank || '',
          assignedPosition: detail.toPosition,
          assignedUnit: detail.toUnit,
          assignedDate: detail.transaction?.swapDate || new Date(),
          assignedYear: detail.transaction?.year || yearNumber,
          fromPosition: detail.fromPosition,
          fromUnit: detail.fromUnit,
        });
      }
    });

    // Return individual vacant positions with assignmentInfo
    const resultWithAssignments = vacantPositions.map(position => {
      const key = `${position.position}|${position.unit}|${position.positionNumber}`;
      const assignmentInfo = assignmentMap.get(key) || null;
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