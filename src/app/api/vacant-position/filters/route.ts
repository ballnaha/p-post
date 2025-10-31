import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - ดึง filter options สำหรับตำแหน่งที่ว่าง
export async function GET(request: NextRequest) {
  try {
    // ใช้ logic เดียวกันสำหรับหาตำแหน่งที่ว่าง
    const vacantWhere = {
      AND: [
        {
          OR: [
            { rank: { equals: null } },
            { rank: { equals: '' } }
          ]
        },
        {
          OR: [
            { fullName: { equals: null } },
            { fullName: { equals: '' } },
            {
              AND: [
                { fullName: { not: null } },
                { fullName: { not: { contains: 'ว่าง (กันตำแหน่ง)' } } },
                { fullName: { not: { contains: 'ว่าง(กันตำแหน่ง)' } } }
              ]
            }
          ]
        }
      ]
    };

    // ดึง distinct values สำหรับ filters
    const [units, posCodes] = await Promise.all([
      // ดึงหน่วยทั้งหมดจากตำแหน่งที่ว่าง
      prisma.policePersonnel.findMany({
        where: vacantWhere,
        select: { unit: true },
        distinct: ['unit'],
        orderBy: { unit: 'asc' },
      }),
      
      // ดึงรหัสตำแหน่งที่บุคคลากรต้องการสมัคร (requestedPositionId) จาก VacantPosition
      prisma.vacantPosition.findMany({
        where: {
          requestedPositionId: { not: null },
        },
        select: { 
          requestedPositionId: true, 
          requestedPosCode: {
            select: { id: true, name: true }
          }
        },
        distinct: ['requestedPositionId'],
        orderBy: { requestedPositionId: 'asc' },
      }),
    ]);

    // สร้าง options สำหรับ dropdown
    const unitOptions = units
      .filter(u => u.unit && u.unit.trim() !== '')
      .map(u => ({ value: u.unit, label: u.unit }));

    const posCodeOptions = posCodes
      .filter(p => p.requestedPositionId && p.requestedPosCode)
      .map(p => ({
        value: p.requestedPositionId!.toString(),
        label: `${p.requestedPosCode!.name} (รหัส: ${p.requestedPositionId})`
      }));

    return NextResponse.json({
      success: true,
      data: {
        units: unitOptions,
        posCodes: posCodeOptions,
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}