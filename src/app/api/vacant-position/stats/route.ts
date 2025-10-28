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
          pending: pendingApplicants
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
