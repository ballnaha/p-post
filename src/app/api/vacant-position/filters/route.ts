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
    const [units, posCodes, positions] = await Promise.all([
      // ดึงหน่วยทั้งหมดจาก VacantPosition
      prisma.vacantPosition.findMany({
        where: {
          unit: { not: null },
        },
        select: { unit: true },
        distinct: ['unit'],
        orderBy: { unit: 'asc' },
      }),
      
      // ดึงรหัสตำแหน่งจากตำแหน่งว่าง (posCodeId) จาก VacantPosition
      prisma.vacantPosition.findMany({
        where: {
          posCodeId: { not: null },
          unit: { not: null },
        },
        select: { 
          posCodeId: true, 
          unit: true,
          posCodeMaster: {
            select: { id: true, name: true }
          }
        },
        distinct: ['posCodeId', 'unit'],
        orderBy: [
          { unit: 'asc' },
          { posCodeId: 'asc' },
        ],
      }),
      
      // ดึงตำแหน่งทั้งหมดจาก VacantPosition
      prisma.vacantPosition.groupBy({
        by: ['position', 'posCodeId', 'unit'],
        where: {
          position: { not: null },
          posCodeId: { not: null },
        },
        _count: {
          _all: true,
        },
        orderBy: [
          { unit: 'asc' },
          { position: 'asc' },
          { posCodeId: 'asc' },
        ],
      }),
    ]);

    // สร้าง options สำหรับ dropdown
    const unitOptions = units
      .filter(u => u.unit && u.unit.trim() !== '')
      .map(u => ({ value: u.unit, label: u.unit }));

    const posCodeOptions = posCodes
      .filter(p => p.posCodeId && p.posCodeMaster)
      .map(p => ({
        value: p.posCodeId!.toString(),
        label: `${p.posCodeMaster!.name} (รหัส: ${p.posCodeId})`,
        unit: p.unit ?? null,
      }));

    const positionOptions = positions
      .filter(p => p.position && p.position.trim() !== '' && p.posCodeId)
      .map(p => ({
        value: p.position!,
        label: p.position!,
        posCodeId: p.posCodeId!.toString(),
        unit: p.unit ?? null,
        count: p._count._all,
      }));

    return NextResponse.json({
      success: true,
      data: {
        units: unitOptions,
        posCodes: posCodeOptions,
        positions: positionOptions,
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