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
      },
      orderBy: [
        { year: 'desc' },
        { noId: 'asc' },
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
    // กรอง fields ที่ไม่ต้องการออก (id, posCodeMaster, timestamps)
    const { 
      year, 
      notes, 
      id, 
      posCodeMaster, 
      createdAt, 
      updatedAt, 
      createdBy, 
      updatedBy, 
      ...personnelData 
    } = body;

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

    // สร้างข้อมูลใหม่
    const newEntry = await prisma.vacantPosition.create({
      data: {
        year,
        notes,
        ...personnelData,
      },
      include: {
        posCodeMaster: true,
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

    // ค้นหาข้อมูลที่จะลบก่อน
    const itemToDelete = await prisma.vacantPosition.findFirst({
      where: {
        nationalId: nationalId,
        year: year,
      },
      select: {
        id: true,
        fullName: true,
      },
    });

    if (!itemToDelete) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
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

    // หมายเหตุ: เอาการตรวจสอบ swap_list ออก เนื่องจากตารางนี้ถูกลบแล้ว
    // การตรวจสอบ usedInTransaction ด้านบนเพียงพอแล้ว

    // ลบข้อมูล
    await prisma.vacantPosition.delete({
      where: {
        id: itemToDelete.id,
      },
    });

    return NextResponse.json({ 
      message: 'Removed from vacant position list successfully' 
    });
  } catch (error) {
    console.error('Error removing from vacant position list:', error);
    return NextResponse.json(
      { error: 'Failed to remove from vacant position list' },
      { status: 500 }
    );
  }
}
