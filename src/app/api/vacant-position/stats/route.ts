import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงสถิติตำแหน่งว่างจาก vacant_position (snapshot)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);

    // Base where clause สำหรับ vacant_position
    // เฉพาะตำแหน่งว่าง (ไม่ใช่ผู้ยื่นขอ)
    const vacantPositionWhere = {
      year: yearNumber,
      nominator: null, // เฉพาะตำแหน่งว่าง
      requestedPositionId: null
    };

    // นับตำแหน่งว่างทั้งหมดจาก vacant_position
    const totalVacant = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionWhere,
        OR: [
          { fullName: { equals: null } },
          { fullName: { equals: '' } },
          { fullName: { equals: 'ว่าง' } },
          { fullName: { equals: 'ว่าง (กันตำแหน่ง)' } },
          { fullName: { equals: 'ว่าง(กันตำแหน่ง)' } }
        ]
      }
    });

    // นับตำแหน่ง "ว่าง" ทั้งหมด (ไม่สนใจ isAssigned)
    const totalVacantOnly = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionWhere,
        fullName: { equals: 'ว่าง' }
      }
    });

    // นับตำแหน่ง "ว่าง (กันตำแหน่ง)" ทั้งหมด (ไม่สนใจ isAssigned)
    const totalReserved = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionWhere,
        OR: [
          { fullName: { equals: 'ว่าง (กันตำแหน่ง)' } },
          { fullName: { equals: 'ว่าง(กันตำแหน่ง)' } }
        ]
      }
    });

    // นับตำแหน่งที่ fullName = null หรือ empty
    const emptyName = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionWhere,
        OR: [
          { fullName: { equals: null } },
          { fullName: { equals: '' } }
        ]
      }
    });

    // นับจำนวนผู้ยื่นขอตำแหน่งจาก vacant_position
    // ต้องกรองเฉพาะผู้ยื่นขอ (มี nominator หรือ requestedPositionId)
    const applicantsWhere: any = {
      year: yearNumber,
      OR: [
        { nominator: { not: null } }, // มีผู้เสนอ = เป็นผู้ยื่นขอ
        { requestedPositionId: { not: null } } // มีตำแหน่งที่ขอ = เป็นผู้ยื่นขอ
      ]
    };

    const totalApplicants = await prisma.vacantPosition.count({
      where: applicantsWhere
    });

    // จับคู่แล้ว = ผู้ยื่นขอที่ requestedPositionId !== null และ isAssigned = true
    const assignedApplicants = await prisma.vacantPosition.count({
      where: {
        year: yearNumber,
        requestedPositionId: { not: null },
        isAssigned: true
      }
    });

    // รอจับคู่ = ผู้ยื่นขอที่ requestedPositionId !== null และ isAssigned = false
    const pendingApplicants = await prisma.vacantPosition.count({
      where: {
        year: yearNumber,
        requestedPositionId: { not: null },
        isAssigned: false
      }
    });

    // นับจำนวนผู้ยื่นขอแต่ละตำแหน่ง (รอจับคู่)
    const pendingByPosition = await prisma.vacantPosition.groupBy({
      by: ['requestedPositionId'],
      where: {
        ...applicantsWhere,
        isAssigned: false,
        requestedPositionId: { not: null } // กรองเฉพาะที่มี requestedPositionId
      },
      _count: {
        id: true
      }
    });

    // นับจำนวนผู้ที่จับคู่แล้วแต่ละตำแหน่ง
    const assignedByPosition = await prisma.vacantPosition.groupBy({
      by: ['requestedPositionId'],
      where: {
        ...applicantsWhere,
        isAssigned: true,
        requestedPositionId: { not: null }
      },
      _count: {
        id: true
      }
    });

    // ดึงข้อมูลชื่อตำแหน่ง (รวมทั้ง pending และ assigned)
    const allPositionIds = [
      ...pendingByPosition.map(p => p.requestedPositionId),
      ...assignedByPosition.map(p => p.requestedPositionId)
    ].filter((id): id is number => id !== null);
    
    const uniquePositionIds = [...new Set(allPositionIds)];
      
    const positions = await prisma.posCodeMaster.findMany({
      where: {
        id: {
          in: uniquePositionIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // สร้าง map ของตำแหน่งและจำนวนคน
    const positionMap = new Map(positions.map(p => [p.id, p.name]));
    
    const pendingByPositionDetail = pendingByPosition
      .filter(item => item.requestedPositionId !== null) // กรอง null ออก
      .map(item => ({
        positionId: item.requestedPositionId as number,
        positionName: positionMap.get(item.requestedPositionId as number) || 'ไม่ระบุ',
        count: item._count.id
      }))
      .sort((a, b) => b.count - a.count); // เรียงจากมากไปน้อย

    const assignedByPositionDetail = assignedByPosition
      .filter(item => item.requestedPositionId !== null)
      .map(item => ({
        positionId: item.requestedPositionId as number,
        positionName: positionMap.get(item.requestedPositionId as number) || 'ไม่ระบุ',
        count: item._count.id
      }))
      .sort((a, b) => b.count - a.count); // เรียงจากมากไปน้อย

    // ดึงข้อมูล SwapTransactionDetail เพื่อหาว่าผู้ที่จับคู่แล้วไปจับคู่กับตำแหน่งประเภทใด
    const assignedDetails = await prisma.swapTransactionDetail.findMany({
      where: {
        transaction: {
          year: yearNumber,
        },
      },
      include: {
        transaction: true,
      },
    });

    // ดึงข้อมูลตำแหน่งว่างเพื่อหา fullName ของแต่ละตำแหน่ง
    const vacantPositionsData = await prisma.vacantPosition.findMany({
      where: vacantPositionWhere,
    });

    // สร้าง Map เพื่อเช็คว่าตำแหน่งแต่ละตำแหน่งเป็น "ว่าง" หรือ "กันตำแหน่ง"
    const positionTypeMap = new Map<string, string>();
    vacantPositionsData.forEach(vp => {
      const key = `${vp.position}|${vp.unit}`;
      positionTypeMap.set(key, vp.fullName || '');
    });

    // นับจำนวนผู้ที่จับคู่กับ "ว่าง" และ "กันตำแหน่ง"
    let vacantAssignedCount = 0;
    let reservedAssignedCount = 0;

    assignedDetails.forEach(detail => {
      const key = `${detail.toPosition}|${detail.toUnit}`;
      const positionType = positionTypeMap.get(key);
      
      if (positionType === 'ว่าง') {
        vacantAssignedCount++;
      } else if (positionType === 'ว่าง (กันตำแหน่ง)' || positionType === 'ว่าง(กันตำแหน่ง)') {
        reservedAssignedCount++;
      }
    });

    // คำนวณค่าตามตรรกะใหม่
    // ว่าง = รวมตำแหน่ง "ว่าง" ทั้งหมด - จำนวนผู้ที่จับคู่กับ "ว่าง" แล้ว
    const vacant = totalVacantOnly - vacantAssignedCount;
    
    // จับคู่แล้ว (ของ "ว่าง") = ผู้ยื่นขอที่จับคู่กับ "ว่าง" แล้ว
    const vacantAssigned = vacantAssignedCount;
    
    // รอจับคู่ (ของ "ว่าง") = ผู้ยื่นขอที่รอการจับคู่
    const vacantNotAssigned = pendingApplicants;
    
    // กันตำแหน่ง = รวมตำแหน่ง "กันตำแหน่ง" ทั้งหมด - จำนวนผู้ที่จับคู่กับ "กันตำแหน่ง" แล้ว
    const reserved = totalReserved - reservedAssignedCount;
    const reservedAssigned = reservedAssignedCount; // ผู้ที่จับคู่กับกันตำแหน่งแล้ว
    const reservedNotAssigned = 0; // ผู้ที่รอจับคู่กับกันตำแหน่ง (ยังไม่มีในระบบ)

    return NextResponse.json({
      success: true,
      data: {
        vacantPositions: {
          totalVacant, // รวมทั้งหมด (ทุกประเภท)
          vacant, // ว่าง = รวมทั้งหมด - จับคู่แล้ว
          vacantNotAssigned, // รอจับคู่ = requestedPositionId !== null และ isAssigned = false
          vacantAssigned, // จับคู่แล้ว = requestedPositionId !== null และ isAssigned = true
          reserved, // รวมกันตำแหน่งทั้งหมด
          reservedNotAssigned, // กันตำแหน่งที่ยังไม่จับคู่
          reservedAssigned, // กันตำแหน่งที่จับคู่แล้ว
          emptyName,
          other: totalVacant - totalVacantOnly - totalReserved - emptyName
        },
        applicants: {
          total: totalApplicants,
          assigned: assignedApplicants,
          pending: pendingApplicants,
          pendingByPosition: pendingByPositionDetail,
          assignedByPosition: assignedByPositionDetail
        },
        year: yearNumber
      }
    });
  } catch (error) {
    console.error('Error fetching vacant position stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacant position stats' },
      { status: 500 }
    );
  }
}
