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

    // รวม query สำหรับนับตำแหน่งว่างทั้งหมด และ applicants พร้อมกัน
    // ใช้ Promise.all เพื่อให้ query ทำงานพร้อมกันแทนการทำทีละ query
    const [
      vacantPositionsData,
      applicantsData
    ] = await Promise.all([
      // ดึงข้อมูลตำแหน่งว่างทั้งหมดมาคำนวณเอง (แทนการ count หลายครั้ง)
      prisma.vacantPosition.findMany({
        where: vacantPositionWhere,
        select: {
          id: true,
          fullName: true,
          position: true,
          unit: true,
        }
      }),
      // ดึงข้อมูล applicants ทั้งหมด
      prisma.vacantPosition.findMany({
        where: {
          year: yearNumber,
          OR: [
            { nominator: { not: null } },
            { requestedPositionId: { not: null } }
          ]
        },
        select: {
          id: true,
          requestedPositionId: true,
          isAssigned: true,
        }
      })
    ]);

    // นับจากข้อมูลที่ดึงมาแทนการ query count หลายครั้ง
    const totalVacant = vacantPositionsData.filter(vp => 
      !vp.fullName || 
      vp.fullName === '' || 
      vp.fullName === 'ว่าง' || 
      vp.fullName === 'ว่าง (กันตำแหน่ง)' || 
      vp.fullName === 'ว่าง(กันตำแหน่ง)'
    ).length;

    const totalVacantOnly = vacantPositionsData.filter(vp => 
      vp.fullName === 'ว่าง'
    ).length;

    const totalReserved = vacantPositionsData.filter(vp => 
      vp.fullName === 'ว่าง (กันตำแหน่ง)' || 
      vp.fullName === 'ว่าง(กันตำแหน่ง)'
    ).length;

    const emptyName = vacantPositionsData.filter(vp => 
      !vp.fullName || vp.fullName === ''
    ).length;

    // นับ applicants
    const totalApplicants = applicantsData.length;
    const assignedApplicants = applicantsData.filter(a => 
      a.requestedPositionId && a.isAssigned
    ).length;
    const pendingApplicants = applicantsData.filter(a => 
      a.requestedPositionId && !a.isAssigned
    ).length;

    // เงื่อนไขสำหรับ applicants groupBy
    const applicantsWhere: any = {
      year: yearNumber,
      OR: [
        { nominator: { not: null } },
        { requestedPositionId: { not: null } }
      ]
    };

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

    // ดึงข้อมูล SwapTransactionDetail เฉพาะ vacant-assignment ที่สมบูรณ์
    const assignedDetails = await prisma.swapTransactionDetail.findMany({
      where: {
        transaction: {
          year: yearNumber,
          swapType: 'vacant-assignment',
          status: 'completed', // เฉพาะที่สมบูรณ์แล้ว
        },
      },
      select: {
        toPosition: true,
        toUnit: true,
        toPositionNumber: true,
      },
    });

    // ใช้ vacantPositionsData ที่ดึงไว้แล้วข้างบน
    // สร้าง Map เพื่อเช็คว่าตำแหน่งแต่ละตำแหน่งเป็น "ว่าง" หรือ "กันตำแหน่ง"
    // ต้องดึง positionNumber ด้วยเพื่อแยกแยะตำแหน่งที่ชื่อเหมือนกันแต่เลขต่างกัน
    const vacantPositionsWithNumber = await prisma.vacantPosition.findMany({
      where: vacantPositionWhere,
      select: {
        id: true,
        fullName: true,
        position: true,
        unit: true,
        positionNumber: true,
      }
    });

    const positionTypeMap = new Map<string, string>();
    vacantPositionsWithNumber.forEach(vp => {
      // ใช้ position|unit|positionNumber เป็น key เพื่อแยกแยะตำแหน่งที่ชื่อเหมือนกัน
      const key = `${vp.position}|${vp.unit}|${vp.positionNumber || ''}`;
      positionTypeMap.set(key, vp.fullName || '');
    });

    // นับจำนวนตำแหน่งที่ถูกจับคู่แล้ว (ไม่ซ้ำ) แยกตาม "ว่าง" และ "กันตำแหน่ง"
    // ใช้ position|unit|positionNumber เป็น unique key
    const assignedVacantPositions = new Set<string>();
    const assignedReservedPositions = new Set<string>();

    assignedDetails.forEach(detail => {
      // ใช้ positionNumber ด้วยเพื่อแยกแยะตำแหน่งที่ชื่อเหมือนกัน
      const key = `${detail.toPosition}|${detail.toUnit}|${detail.toPositionNumber || ''}`;
      const positionType = positionTypeMap.get(key);
      
      if (positionType === 'ว่าง') {
        assignedVacantPositions.add(key);
      } else if (positionType === 'ว่าง (กันตำแหน่ง)' || positionType === 'ว่าง(กันตำแหน่ง)') {
        assignedReservedPositions.add(key);
      }
    });

    const vacantAssignedCount = assignedVacantPositions.size;
    const reservedAssignedCount = assignedReservedPositions.size;

    // คำนวณค่าตามตรรกะที่ถูกต้อง:
    // 1. ว่าง (ยังไม่ถูกจับคู่) = รวมตำแหน่ง "ว่าง" ทั้งหมด - ตำแหน่งที่ถูกจับคู่ไปแล้ว
    const vacant = totalVacantOnly - vacantAssignedCount;
    
    // 2. จับคู่แล้ว (จำนวนตำแหน่งว่างที่ถูกจับคู่) = จำนวนตำแหน่งที่ถูกจับคู่ไปแล้ว
    const vacantAssigned = vacantAssignedCount;
    
    // 3. รอจับคู่ (จำนวนผู้ยื่นขอที่รอ) = ผู้ยื่นขอที่ isAssigned = false
    const vacantNotAssigned = pendingApplicants;
    
    // 4. กันตำแหน่ง (ยังไม่ถูกจับคู่) = รวมตำแหน่ง "กันตำแหน่ง" - ที่ถูกจับคู่แล้ว
    const reserved = totalReserved - reservedAssignedCount;
    
    // 5. กันตำแหน่งที่จับคู่แล้ว
    const reservedAssigned = reservedAssignedCount;
    
    // 6. ผู้ที่รอจับคู่กับกันตำแหน่ง (ระบบไม่รองรับการแยกว่าผู้ยื่นขอต้องการว่างหรือกันตำแหน่ง)
    const reservedNotAssigned = 0;

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
