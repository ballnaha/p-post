import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unit = searchParams.get('unit');
    
    console.log('Chart API called with year:', year, 'unit:', unit);
    
    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);
    console.log('Chart API - Parsed yearNumber:', yearNumber);

    // ดึง PosCode ทั้งหมดจาก master
    const allPosCodes = await prisma.posCodeMaster.findMany({
      orderBy: { name: 'asc' }
    });

    // สร้าง where clause สำหรับ filter หน่วย
    const unitFilter = unit && unit !== 'all' ? { unit } : {};

    // นับตำแหน่งว่างและผู้ยื่นขอจาก vacantPosition สำหรับแต่ละ posCode
    const vacantPositionsData = await Promise.all(
      allPosCodes.map(async (posCode) => {
        // นับตำแหน่งว่าง (isAssigned = false) จากตำแหน่งปัจจุบัน (posCodeId)
        const vacantCount = await prisma.vacantPosition.count({
          where: {
            year: yearNumber,
            posCodeId: posCode.id,
            isAssigned: false,
            ...(unit && unit !== 'all' ? { unit } : {})
          }
        });

        // นับผู้ยื่นขอ (requestedPositionId = posCode.id และ isAssigned = false)
        const applicantCount = await prisma.vacantPosition.count({
          where: {
            year: yearNumber,
            requestedPositionId: posCode.id,

            ...(unit && unit !== 'all' ? { unit } : {})
          }
        });

        return {
          posCodeId: posCode.id,
          posCodeName: posCode.name,
          vacantSlots: vacantCount,
          totalApplicants: applicantCount
        };
      })
    );

    // แสดงทุกตำแหน่งจาก posCodeMaster (ไม่ filter ออก)
    const filteredData = vacantPositionsData
      .sort((a, b) => (b.vacantSlots + b.totalApplicants) - (a.vacantSlots + a.totalApplicants));

    return NextResponse.json({
      success: true,
      data: {
        chartData: filteredData,
        allPosCodes: allPosCodes.map(p => ({ id: p.id, name: p.name }))
      }
    });
  } catch (error) {
    console.error('Dashboard Chart API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch chart data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
