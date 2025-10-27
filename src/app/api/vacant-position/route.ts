import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการรายการยื่นขอตำแหน่ง
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause = year ? { year: parseInt(year) } : {};

    const vacantPositions = await prisma.vacantPosition.findMany({
      where: whereClause,
      include: {
        posCodeMaster: true, // ดึงข้อมูลรหัสตำแหน่งปัจจุบัน
        requestedPosCode: true, // ดึงข้อมูลรหัสตำแหน่งที่ขอ
      },
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(vacantPositions);
  } catch (error) {
    console.error('Error fetching vacant position list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacant position list' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มรายการยื่นขอตำแหน่งเข้ารายการ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // กรอง fields ที่ไม่ต้องการออก (id, posCodeMaster, timestamps, originalPersonnelId, requestedPositionId)
    const { 
      year, 
      notes, 
      nominator, 
      requestedPositionId, 
      id, 
      posCodeMaster, 
      requestedPosCode,
      createdAt, 
      updatedAt, 
      createdBy, 
      updatedBy, 
      originalPersonnelId, 
      ...personnelData 
    } = body;

    // ตรวจสอบว่ามีตำแหน่งที่ขอหรือไม่
    if (!requestedPositionId) {
      return NextResponse.json(
        { error: 'กรุณาเลือกตำแหน่งที่ขอ' },
        { status: 400 }
      );
    }

    // เช็คว่ามีข้อมูลซ้ำหรือไม่ (ใช้เลขบัตรประชาชน)
    if (personnelData.nationalId) {
      const existing = await prisma.vacantPosition.findFirst({
        where: {
          nationalId: personnelData.nationalId,
          year: year,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'ตำแหน่งนี้อยู่ในรายการรายการยื่นขอตำแหน่งแล้ว' },
          { status: 400 }
        );
      }
    }

    // หา displayOrder ถัดไปสำหรับตำแหน่งที่ขอ
    const maxDisplayOrder = await prisma.vacantPosition.findFirst({
      where: {
        requestedPositionId: requestedPositionId,
        year: year,
      },
      orderBy: {
        displayOrder: 'desc'
      },
      select: {
        displayOrder: true
      }
    });

    const nextDisplayOrder = (maxDisplayOrder?.displayOrder || 0) + 1;

    // สร้างข้อมูลใหม่
    const newEntry = await prisma.vacantPosition.create({
      data: {
        year,
        notes,
        nominator,
        requestedPositionId,
        displayOrder: nextDisplayOrder,
        ...personnelData,
      },
      include: {
        posCodeMaster: true,
        requestedPosCode: true,
      },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error('Error adding to vacant position list:', error);
    return NextResponse.json(
      { error: 'Failed to add to vacant position list' },
      { status: 500 }
    );
  }
}

// DELETE - ลบออกจากรายการรายการยื่นขอตำแหน่ง
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nationalId = searchParams.get('nationalId');
    const yearParam = searchParams.get('year');

    if (!nationalId || !yearParam) {
      return NextResponse.json(
        { error: 'Missing nationalId or year' },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam);

    // ค้นหาข้อมูลที่จะลบก่อน เพื่อเอา requestedPositionId
    const itemToDelete = await prisma.vacantPosition.findFirst({
      where: {
        nationalId: nationalId,
        year: year,
      },
      select: {
        id: true,
        requestedPositionId: true,
        displayOrder: true,
      },
    });

    if (!itemToDelete) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // ลบข้อมูล
    await prisma.vacantPosition.delete({
      where: {
        id: itemToDelete.id,
      },
    });

    // จัดลำดับ displayOrder ใหม่สำหรับตำแหน่งเดียวกัน
    if (itemToDelete.requestedPositionId) {
      const remainingItems = await prisma.vacantPosition.findMany({
        where: {
          requestedPositionId: itemToDelete.requestedPositionId,
          year: year,
        },
        orderBy: { displayOrder: 'asc' },
        select: { id: true },
      });

      // อัปเดต displayOrder ให้เป็น 1, 2, 3, 4...
      for (let i = 0; i < remainingItems.length; i++) {
        await prisma.vacantPosition.update({
          where: { id: remainingItems[i].id },
          data: { displayOrder: i + 1 },
        });
      }
    }

    return NextResponse.json({ 
      message: 'Removed from vacant position list and reordered successfully' 
    });
  } catch (error) {
    console.error('Error removing from vacant position list:', error);
    return NextResponse.json(
      { error: 'Failed to remove from vacant position list' },
      { status: 500 }
    );
  }
}
