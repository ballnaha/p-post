import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-transactions
 * ดึงรายการผลการสลับตำแหน่งทั้งหมด พร้อม posCodeMaster
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const swapType = searchParams.get('swapType');

    const where: any = {};
    if (year) where.year = parseInt(year);
    if (status) where.status = status;
    if (swapType) where.swapType = swapType;

    // Optimize: Select only necessary fields to reduce data transfer
    const transactions = await prisma.swapTransaction.findMany({
      where,
      select: {
        id: true,
        year: true,
        swapDate: true,
        swapType: true,
        groupName: true,
        groupNumber: true,
        status: true,
        isCompleted: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        swapDetails: {
          select: {
            id: true,
            sequence: true,
            personnelId: true,
            noId: true,
            nationalId: true,
            fullName: true,
            rank: true,
            seniority: true,
            isPlaceholder: true,
            posCodeId: true,
            posCodeMaster: {
              select: {
                id: true,
                name: true
              }
            },
            toPosCodeId: true,
            toPosCodeMaster: {
              select: {
                id: true,
                name: true
              }
            },
            // ข้อมูลส่วนตัว
            birthDate: true,
            age: true,
            education: true,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: true,
            currentRankSince: true,
            enrollmentDate: true,
            retirementDate: true,
            yearsOfService: true,
            // ข้อมูลการฝึกอบรม
            trainingLocation: true,
            trainingCourse: true,
            // ข้อมูลการเสนอชื่อ
            supportName: true,
            supportReason: true,
            requestedPosition: true,
            // ตำแหน่ง
            fromPosition: true,
            fromPositionNumber: true,
            fromUnit: true,
            fromActingAs: true,
            toPosition: true,
            toPositionNumber: true,
            toUnit: true,
            toActingAs: true,
            notes: true
          },
          orderBy: [
            { sequence: 'asc' },
            { fullName: 'asc' }
          ]
        }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
        { year: 'desc' },
        { swapDate: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Error fetching swap transactions:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/swap-transactions
 * สร้างผลการสลับตำแหน่งใหม่
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, swapDate, swapType, groupName, groupNumber, status, isCompleted, notes, startingPersonnel, swapDetails } = body;

    // Validate
    const effectiveSwapType = swapType || 'two-way';
    const minDetails = (effectiveSwapType === 'promotion-chain' || effectiveSwapType === 'promotion' || effectiveSwapType === 'transfer') ? 1 : 2;
    if (!year || !swapDate || !swapDetails || swapDetails.length < minDetails) {
      return NextResponse.json(
        { success: false, error: (effectiveSwapType === 'promotion-chain' || effectiveSwapType === 'promotion' || effectiveSwapType === 'transfer') ? 'ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 1 ขั้นตอน' : 'ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 2 คนที่สลับตำแหน่ง' },
        { status: 400 }
      );
    }

    // สร้าง swapDetails array โดยเพิ่ม startingPersonnel เป็น sequence = 0 (สำหรับ promotion)
    const allDetails: any[] = [];

    // ถ้าเป็น promotion ให้เพิ่ม startingPersonnel เป็น detail แรก (sequence = 0)
    if ((swapType === 'promotion' || swapType === 'promotion-chain') && startingPersonnel) {
      allDetails.push({
        sequence: 0,
        personnelId: startingPersonnel.id,
        noId: startingPersonnel.noId ? parseInt(startingPersonnel.noId.toString()) : null,
        nationalId: startingPersonnel.nationalId,
        fullName: startingPersonnel.fullName,
        rank: startingPersonnel.rank,
        seniority: startingPersonnel.seniority,
        posCodeId: startingPersonnel.posCodeId,
        toPosCodeId: null,
        fromPosition: startingPersonnel.position,
        fromPositionNumber: startingPersonnel.positionNumber,
        fromUnit: startingPersonnel.unit,
        fromActingAs: startingPersonnel.actingAs,
        toPosition: null,
        toPositionNumber: null,
        toUnit: null,
        toActingAs: null,
      });
    }

    // เพิ่ม swapDetails ที่ส่งมา
    swapDetails.forEach((detail: any, index: number) => {
      const isPlaceholder = detail.isPlaceholder === true;

      allDetails.push({
        sequence: detail.sequence !== undefined ? detail.sequence : ((swapType === 'three-way' || swapType === 'promotion' || swapType === 'promotion-chain') ? index + 1 : null),
        isPlaceholder: isPlaceholder,
        personnelId: detail.personnelId || null,
        noId: detail.noId ? parseInt(detail.noId.toString()) : null,
        nationalId: detail.nationalId || null,
        fullName: detail.fullName || 'ตำแหน่งว่าง',
        rank: detail.rank || null,
        seniority: detail.seniority || null,
        // Preserve posCodeId / toPosCodeId even for placeholders (if >0) so chain keeps position context
        posCodeId: (typeof detail.posCodeId === 'number' && detail.posCodeId > 0) ? detail.posCodeId : null,
        toPosCodeId: (typeof detail.toPosCodeId === 'number' && detail.toPosCodeId > 0) ? detail.toPosCodeId : null,
        birthDate: detail.birthDate || null,
        age: detail.age || null,
        education: detail.education || null,
        lastAppointment: detail.lastAppointment || null,
        currentRankSince: detail.currentRankSince || null,
        enrollmentDate: detail.enrollmentDate || null,
        retirementDate: detail.retirementDate || null,
        yearsOfService: detail.yearsOfService || null,
        trainingLocation: detail.trainingLocation || null,
        trainingCourse: detail.trainingCourse || null,
        supportName: detail.supportName || null,
        supportReason: detail.supportReason || null,
        requestedPosition: detail.requestedPosition || null,
        fromPosition: detail.fromPosition || null,
        fromPositionNumber: detail.fromPositionNumber || null,
        fromUnit: detail.fromUnit || null,
        fromActingAs: detail.fromActingAs || null,
        toPosition: detail.toPosition || null,
        toPositionNumber: detail.toPositionNumber || null,
        toUnit: detail.toUnit || null,
        toActingAs: detail.toActingAs || null,
        notes: detail.notes || null
      });
    });

    // Create transaction with details
    const transaction = await prisma.swapTransaction.create({
      data: {
        year,
        swapDate: new Date(swapDate),
        swapType: swapType || 'two-way',
        groupName,
        groupNumber,
        status: status || 'completed',
        isCompleted: isCompleted || false,
        notes,
        swapDetails: {
          create: allDetails
        }
      },
      include: {
        swapDetails: {
          orderBy: swapType === 'three-way' ? { sequence: 'asc' } : { fullName: 'asc' }
        }
      }
    });

    // ===== AUTO ADD TO BOARD LAYOUT =====
    // เพิ่ม transaction ใหม่เข้าไปใน board-layout อัตโนมัติ
    // เพื่อให้แสดงบน personnel-board-v2 ทันที
    const BOARD_LAYOUT_TYPE = 'board-layout';

    try {
      // หา board-layout record สำหรับปีนั้น
      const layoutRecord = await prisma.swapTransaction.findFirst({
        where: {
          year,
          swapType: BOARD_LAYOUT_TYPE,
        },
      });

      if (layoutRecord && layoutRecord.notes) {
        // มี layout อยู่แล้ว - เพิ่ม transaction ใหม่เข้าไป
        try {
          const boardLayout = JSON.parse(layoutRecord.notes);
          const lanes = boardLayout.lanes || [];

          // เพิ่ม lane ใหม่ที่ต้นรายการ (index = 0) และ shift index อื่นๆ
          lanes.forEach((lane: any) => {
            if (typeof lane.index === 'number') {
              lane.index += 1;
            }
          });

          lanes.unshift({
            index: 0,
            transactionId: transaction.id,
            title: transaction.groupName || groupName,
            vacantPosition: null,
            isCompleted: false,
          });

          // อัปเดต layout record
          await prisma.swapTransaction.update({
            where: { id: layoutRecord.id },
            data: {
              notes: JSON.stringify({ lanes }),
              updatedAt: new Date(),
            },
          });

          console.log(`Added transaction ${transaction.id} to board-layout for year ${year}`);
        } catch (parseError) {
          console.error('Error parsing board layout:', parseError);
        }
      } else {
        // ยังไม่มี layout - สร้างใหม่
        const newLanes = [{
          index: 0,
          transactionId: transaction.id,
          title: transaction.groupName || groupName,
          vacantPosition: null,
          isCompleted: false,
        }];

        await prisma.swapTransaction.create({
          data: {
            year,
            swapDate: new Date(),
            swapType: BOARD_LAYOUT_TYPE,
            groupName: `Board Layout ${year}`,
            status: 'active',
            isCompleted: true,
            notes: JSON.stringify({ lanes: newLanes }),
            createdBy: 'system',
          },
        });

        console.log(`Created new board-layout for year ${year} with transaction ${transaction.id}`);
      }
    } catch (layoutError) {
      // ไม่ให้ error จาก layout กระทบการสร้าง transaction หลัก
      console.error('Error adding to board layout (non-critical):', layoutError);
    }
    // ===== END AUTO ADD TO BOARD LAYOUT =====

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'บันทึกผลการสลับตำแหน่งสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error creating swap transaction:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}
