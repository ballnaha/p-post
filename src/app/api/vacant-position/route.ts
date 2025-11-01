import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงรายการรายการยื่นขอตำแหน่ง
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const whereClause = year ? { year: parseInt(year) } : {};

    // Optimize: Select only necessary fields to reduce data transfer
    const vacantPositions = await prisma.vacantPosition.findMany({
      where: whereClause,
      select: {
        id: true,
        year: true,
        notes: true,
        displayOrder: true,
        nominator: true,
        requestedPositionId: true,
        isAssigned: true,
        nationalId: true,
        noId: true,
        position: true,
        positionNumber: true,
        unit: true,
        rank: true,
        fullName: true,
        age: true,
        education: true,
        seniority: true,
        actingAs: true,
        birthDate: true,
        lastAppointment: true,
        currentRankSince: true,
        enrollmentDate: true,
        retirementDate: true,
        yearsOfService: true,
        trainingLocation: true,
        trainingCourse: true,
        createdAt: true,
        posCodeMaster: {
          select: {
            id: true,
            name: true,
          }
        },
        requestedPosCode: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: [
        { requestedPositionId: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    // Optimize: Only fetch assignments if there are nationalIds
    const nationalIds = vacantPositions
      .map(v => v.nationalId)
      .filter((id): id is string => !!id);

    const assignmentMap = new Map();
    
    if (nationalIds.length > 0) {
      // Optimize: Get only the latest assignment per nationalId using DISTINCT ON equivalent
      const assignments = await prisma.swapTransactionDetail.findMany({
        where: {
          nationalId: {
            in: nationalIds
          }
        },
        select: {
          nationalId: true,
          toPosition: true,
          toUnit: true,
          createdAt: true,
          transaction: {
            select: {
              year: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        // Limit to first result per nationalId (processed in JS below)
      });

      // Process assignments - keep only the latest per nationalId
      assignments.forEach(assignment => {
        if (assignment.nationalId && !assignmentMap.has(assignment.nationalId)) {
          assignmentMap.set(assignment.nationalId, {
            assignedPosition: assignment.toPosition || '',
            assignedUnit: assignment.toUnit || '',
            assignedDate: assignment.createdAt.toISOString(),
            assignedYear: assignment.transaction.year,
          });
        }
      });
    }

    // Optimize: Use simpler object spread instead of mapping
    const formattedData = vacantPositions.map(item => {
      const assignmentInfo = item.nationalId ? assignmentMap.get(item.nationalId) : null;
      
      return {
        ...item,
        isAssigned: item.isAssigned || !!assignmentInfo,
        assignmentInfo: assignmentInfo || null,
      };
    });

    return NextResponse.json(formattedData);
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
        isAssigned: true,
        fullName: true,
      },
    });

    if (!itemToDelete) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่าจับคู่แล้วหรือไม่ (Option 3: เพิ่มการเตือน)
    if (itemToDelete.isAssigned) {
      return NextResponse.json(
        { 
          error: 'ไม่สามารถลบได้ เนื่องจากได้จับคู่ตำแหน่งแล้ว',
          message: 'กรุณายกเลิกการจับคู่ก่อน จากหน้า "จัดการจับคู่ตำแหน่ง"'
        },
        { status: 400 }
      );
    }

    // ✅ ตรวจสอบว่ามีการใช้งานใน swap_transaction_detail หรือไม่
    const usedInTransaction = await prisma.swapTransactionDetail.findFirst({
      where: { personnelId: itemToDelete.id },
      include: {
        transaction: {
          select: {
            swapDate: true,
            swapType: true,
            groupName: true,
          }
        }
      }
    });

    if (usedInTransaction) {
      const swapTypeName = usedInTransaction.transaction.swapType === 'vacant-assignment' 
        ? 'จับคู่ตำแหน่ง'
        : usedInTransaction.transaction.swapType === 'two-way'
          ? 'สลับตำแหน่ง'
          : 'สามเส้า';
      
      return NextResponse.json(
        { 
          error: 'ไม่สามารถลบได้ เนื่องจากมีประวัติการจับคู่ในระบบ',
          message: `บุคคลนี้มีประวัติ${swapTypeName}แล้ว กรุณาลบประวัติการจับคู่ในหน้า "ประวัติการจับคู่" ก่อน`,
          details: {
            transactionDate: usedInTransaction.transaction.swapDate,
            transactionType: swapTypeName,
          }
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีข้อมูลในรายการสลับตำแหน่งหรือไม่ (กำลังจับคู่อยู่)
    const swapListEntry = await prisma.swapList.findFirst({
      where: {
        nationalId: nationalId,
        year: year,
      },
      select: {
        id: true,
        swapType: true,
        fullName: true,
      },
    });

    if (swapListEntry) {
      const swapTypeName = swapListEntry.swapType === 'two-way' ? 'สลับตำแหน่ง' : 
                          swapListEntry.swapType === 'three-way' ? 'สามเส้า' : 'จับคู่';
      return NextResponse.json(
        { 
          error: `ไม่สามารถยกเลิกการยื่นขอตำแหน่งได้`,
          message: `บุคคลนี้อยู่ในรายการ${swapTypeName}แล้ว กรุณายกเลิกการจับคู่ในหน้า "${swapTypeName}" ก่อน`
        },
        { status: 400 }
      );
    }

    // ลบข้อมูล
    await prisma.vacantPosition.delete({
      where: {
        id: itemToDelete.id,
      },
    });

    // จัดลำดับ displayOrder ใหม่สำหรับตำแหน่งเดียวกัน (Optimized with batch update)
    if (itemToDelete.requestedPositionId) {
      const remainingItems = await prisma.vacantPosition.findMany({
        where: {
          requestedPositionId: itemToDelete.requestedPositionId,
          year: year,
        },
        orderBy: { displayOrder: 'asc' },
        select: { id: true },
      });

      // Optimize: Use transaction for batch updates
      const updatePromises = remainingItems.map((item, index) =>
        prisma.vacantPosition.update({
          where: { id: item.id },
          data: { displayOrder: index + 1 },
        })
      );

      await Promise.all(updatePromises);
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
