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

    // นับตำแหน่ง "ว่าง" (ที่ยังไม่ถูกจับคู่)
    const vacantNotAssigned = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionWhere,
        fullName: { equals: 'ว่าง' },
        isAssigned: false
      }
    });

    // นับตำแหน่ง "ว่าง" (ที่ถูกจับคู่แล้ว)
    const vacantAssigned = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionWhere,
        fullName: { equals: 'ว่าง' },
        isAssigned: true
      }
    });

    // นับตำแหน่ง "ว่าง (กันตำแหน่ง)" (ที่ยังไม่ถูกจับคู่)
    const reservedNotAssigned = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionWhere,
        OR: [
          { fullName: { equals: 'ว่าง (กันตำแหน่ง)' } },
          { fullName: { equals: 'ว่าง(กันตำแหน่ง)' } }
        ],
        isAssigned: false
      }
    });

    // นับตำแหน่ง "ว่าง (กันตำแหน่ง)" (ที่ถูกจับคู่แล้ว)
    const reservedAssigned = await prisma.vacantPosition.count({
      where: {
        ...vacantPositionWhere,
        OR: [
          { fullName: { equals: 'ว่าง (กันตำแหน่ง)' } },
          { fullName: { equals: 'ว่าง(กันตำแหน่ง)' } }
        ],
        isAssigned: true
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

    const assignedApplicants = await prisma.vacantPosition.count({
      where: {
        ...applicantsWhere,
        isAssigned: true
      }
    });

    const pendingApplicants = await prisma.vacantPosition.count({
      where: {
        ...applicantsWhere,
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

    return NextResponse.json({
      success: true,
      data: {
        vacantPositions: {
          totalVacant, // รวมทั้งหมด
          vacant: vacantNotAssigned + vacantAssigned, // รวมทั้งหมดที่เป็น "ว่าง"
          vacantNotAssigned, // ว่างที่ยังไม่จับคู่
          vacantAssigned, // ว่างที่จับคู่แล้ว
          reserved: reservedNotAssigned + reservedAssigned, // รวมทั้งหมดที่เป็น "กันตำแหน่ง"
          reservedNotAssigned, // กันตำแหน่งที่ยังไม่จับคู่
          reservedAssigned, // กันตำแหน่งที่จับคู่แล้ว
          emptyName,
          other: totalVacant - (vacantNotAssigned + vacantAssigned) - (reservedNotAssigned + reservedAssigned) - emptyName
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
