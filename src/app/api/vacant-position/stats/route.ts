import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึงสถิติตำแหน่งว่างจาก police_personnel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    // Query สำหรับตำแหน่งที่ว่าง (rank = null/empty)
    const baseWhere = {
      AND: [
        {
          OR: [
            { rank: { equals: null } },
            { rank: { equals: '' } }
          ]
        }
      ]
    };

    // นับตำแหน่งว่างทั้งหมด
    const totalVacant = await prisma.policePersonnel.count({
      where: {
        ...baseWhere,
        OR: [
          { fullName: { equals: null } },
          { fullName: { equals: '' } },
          { fullName: { equals: 'ว่าง' } },
          { fullName: { equals: 'ว่าง (กันตำแหน่ง)' } },
          { fullName: { equals: 'ว่าง(กันตำแหน่ง)' } }
        ]
      }
    });

    // นับตำแหน่ง "ว่าง"
    const vacant = await prisma.policePersonnel.count({
      where: {
        ...baseWhere,
        fullName: { equals: 'ว่าง' }
      }
    });

    // นับตำแหน่ง "ว่าง (กันตำแหน่ง)" และ "ว่าง(กันตำแหน่ง)"
    const reserved = await prisma.policePersonnel.count({
      where: {
        ...baseWhere,
        OR: [
          { fullName: { equals: 'ว่าง (กันตำแหน่ง)' } },
          { fullName: { equals: 'ว่าง(กันตำแหน่ง)' } }
        ]
      }
    });

    // นับตำแหน่งที่ fullName = null หรือ empty
    const emptyName = await prisma.policePersonnel.count({
      where: {
        ...baseWhere,
        OR: [
          { fullName: { equals: null } },
          { fullName: { equals: '' } }
        ]
      }
    });

    // นับจำนวนผู้ยื่นขอตำแหน่งจาก vacant_position
    const applicantsWhere: any = {};
    if (year) {
      applicantsWhere.year = parseInt(year);
    }

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
        policePersonnel: {
          totalVacant,
          vacant,
          reserved,
          emptyName,
          other: totalVacant - vacant - reserved - emptyName
        },
        applicants: {
          total: totalApplicants,
          assigned: assignedApplicants,
          pending: pendingApplicants,
          pendingByPosition: pendingByPositionDetail,
          assignedByPosition: assignedByPositionDetail
        },
        year: year ? parseInt(year) : null
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
