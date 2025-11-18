import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/swap-transactions/[id]
 * ดึงข้อมูลผลการสลับตำแหน่งตาม ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transaction = await prisma.swapTransaction.findUnique({
      where: { id },
      include: {
        swapDetails: {
          include: {
            posCodeMaster: {
              select: {
                id: true,
                name: true
              }
            },
            toPosCodeMaster: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction
    });
  } catch (error: any) {
    console.error('Error fetching swap transaction:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/swap-transactions/[id]
 * แก้ไขข้อมูลผลการสลับตำแหน่ง
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { year, swapDate, swapType, groupName, groupNumber, status, isCompleted, notes, startingPersonnel, swapDetails } = body;

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existingTransaction = await prisma.swapTransaction.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล' },
        { status: 404 }
      );
    }

    // อัพเดทข้อมูล
    const updateData: any = {};
    if (year !== undefined) updateData.year = year;
    if (swapDate !== undefined) updateData.swapDate = new Date(swapDate);
    if (swapType !== undefined) updateData.swapType = swapType;
    if (groupName !== undefined) updateData.groupName = groupName;
    if (groupNumber !== undefined) updateData.groupNumber = groupNumber;
    if (status !== undefined) updateData.status = status;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (notes !== undefined) updateData.notes = notes;

    // ถ้ามีการอัพเดท swapDetails
    if (swapDetails && Array.isArray(swapDetails)) {
      // ลบ swapDetails เก่าทั้งหมด
      await prisma.swapTransactionDetail.deleteMany({
        where: { transactionId: id }
      });

      // สร้าง swapDetails array โดยเพิ่ม startingPersonnel เป็น sequence = 0 (สำหรับ promotion)
      const allDetails = [];
      
      // ถ้าเป็น promotion และมี startingPersonnel ให้เพิ่มเป็น detail แรก (sequence = 0)
      const effectiveSwapType = swapType || existingTransaction.swapType;
      if ((effectiveSwapType === 'promotion' || effectiveSwapType === 'promotion-chain') && startingPersonnel) {
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
      allDetails.push(...swapDetails.map((detail: any) => {
        const isPlaceholder = detail.isPlaceholder === true;
        return {
          sequence: detail.sequence,
          isPlaceholder: isPlaceholder,
          personnelId: detail.personnelId || null,
          noId: detail.noId ? parseInt(detail.noId.toString()) : null,
          nationalId: detail.nationalId || null,
          fullName: detail.fullName || 'ตำแหน่งว่าง',
          rank: detail.rank || null,
          seniority: detail.seniority || null,
          posCodeId: isPlaceholder ? null : (detail.posCodeId || null),
          toPosCodeId: isPlaceholder ? null : (detail.toPosCodeId || null),
          // ข้อมูลส่วนตัว
          birthDate: detail.birthDate || null,
          age: detail.age || null,
          education: detail.education || null,
          // ข้อมูลการแต่งตั้ง
          lastAppointment: detail.lastAppointment || null,
          currentRankSince: detail.currentRankSince || null,
          enrollmentDate: detail.enrollmentDate || null,
          retirementDate: detail.retirementDate || null,
          yearsOfService: detail.yearsOfService || null,
          // ข้อมูลการฝึกอบรม
          trainingLocation: detail.trainingLocation || null,
          trainingCourse: detail.trainingCourse || null,
          // ข้อมูลการเสนอชื่อ
          supportName: detail.supportName || null,
          supportReason: detail.supportReason || null,
          // ตำแหน่ง
          fromPosition: detail.fromPosition || null,
          fromPositionNumber: detail.fromPositionNumber || null,
          fromUnit: detail.fromUnit || null,
          fromActingAs: detail.fromActingAs || null,
          toPosition: detail.toPosition || null,
          toPositionNumber: detail.toPositionNumber || null,
          toUnit: detail.toUnit || null,
          toActingAs: detail.toActingAs || null,
          notes: detail.notes || null
        };
      })),
      
      // สร้าง swapDetails ใหม่
      updateData.swapDetails = {
        create: allDetails
      };
    }

    const transaction = await prisma.swapTransaction.update({
      where: { id },
      data: updateData,
      include: {
        swapDetails: {
          include: {
            posCodeMaster: {
              select: {
                id: true,
                name: true
              }
            },
            toPosCodeMaster: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { sequence: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'แก้ไขข้อมูลสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error updating swap transaction:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/swap-transactions/[id]
 * ลบข้อมูลผลการสลับตำแหน่ง
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const existingTransaction = await prisma.swapTransaction.findUnique({
      where: { id },
      include: {
        swapDetails: true
      }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล' },
        { status: 404 }
      );
    }

    // ดึง personnelId ของบุคลากรที่เกี่ยวข้องในธุรกรรมนี้
    const personnelIds = existingTransaction.swapDetails
      .map(detail => detail.personnelId)
      .filter((id): id is string => id !== null);

    // ตรวจสอบว่าบุคลากรเหล่านี้มีการสลับตำแหน่งในปีนี้หรือไม่ (รวมทั้งสามเส้า)
    const relatedSwapTransactions = await prisma.swapTransaction.findMany({
      where: {
        id: { not: existingTransaction.id }, // ไม่ใช่ตัวเอง
        year: existingTransaction.year,
        swapDetails: {
          some: {
            personnelId: {
              in: personnelIds
            }
          }
        }
      },
      include: {
        swapDetails: {
          where: {
            personnelId: {
              in: personnelIds
            }
          }
        }
      }
    });

    if (relatedSwapTransactions.length > 0) {
      // หาชื่อบุคลากรที่มีปัญหา
      const conflictPersonnelNames: string[] = [];
      relatedSwapTransactions.forEach(transaction => {
        if (transaction.swapDetails) {
          transaction.swapDetails.forEach(detail => {
            if (detail.personnelId && personnelIds.includes(detail.personnelId) && detail.fullName) {
              conflictPersonnelNames.push(detail.fullName);
            }
          });
        }
      });

      const uniqueNames = [...new Set(conflictPersonnelNames)];
      
      return NextResponse.json(
        { 
          success: false, 
          error: `ไม่สามารถลบได้ เนื่องจากบุคลากร ${uniqueNames.join(', ')} ได้ถูกสลับตำแหน่งในปี ${existingTransaction.year} แล้ว กรุณาลบข้อมูลการสลับตำแหน่งของบุคลากรเหล่านี้ก่อน`,
          conflictPersonnel: uniqueNames,
          year: existingTransaction.year
        },
        { status: 400 }
      );
    }

    // ลบ swapDetails ก่อน (Cascade delete should handle this, but being explicit)
    await prisma.swapTransactionDetail.deleteMany({
      where: { transactionId: id }
    });

    // ลบ transaction
    await prisma.swapTransaction.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'ลบข้อมูลสำเร็จ'
    });
  } catch (error: any) {
    console.error('Error deleting swap transaction:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูล' },
      { status: 500 }
    );
  }
}
