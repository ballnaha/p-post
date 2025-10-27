import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST - จับคู่ผู้ยื่นขอกับตำแหน่งที่ว่าง
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      applicantId, // ID ของผู้ยื่นขอจาก VacantPosition
      vacantPositionId, // ID ของตำแหน่งที่ว่างจาก PolicePersonnel
      notes 
    } = body;

    if (!applicantId || !vacantPositionId) {
      return NextResponse.json(
        { error: 'Applicant ID and vacant position ID are required' },
        { status: 400 }
      );
    }

    // ใช้ transaction เพื่อความปลอดภัย
    const result = await prisma.$transaction(async (tx) => {
      // ดึงข้อมูลผู้ยื่นขอ
      const applicant = await tx.vacantPosition.findUnique({
        where: { id: applicantId },
        include: {
          posCodeMaster: true,
          requestedPosCode: true,
        }
      });

      if (!applicant) {
        throw new Error('Applicant not found');
      }

      // ดึงข้อมูลตำแหน่งที่ว่าง
      const vacantPosition = await tx.policePersonnel.findUnique({
        where: { id: vacantPositionId },
        include: {
          posCodeMaster: true,
        }
      });

      if (!vacantPosition) {
        throw new Error('Vacant position not found');
      }

      // ตรวจสอบว่าตำแหน่งยังว่างอยู่ (ไม่มีคนหรือเป็นตำแหน่งว่าง)
      // ปรับเงื่อนไขให้เข้มงวดน้อยลง - อนุญาตให้จับคู่ได้หากเป็นตำแหน่งว่าง
      if (vacantPosition.fullName && 
          vacantPosition.fullName.trim() !== '' && 
          vacantPosition.fullName !== 'ตำแหน่งว่าง') {
        return NextResponse.json(
          { 
            error: 'Position is no longer vacant',
            details: `ตำแหน่งนี้มีผู้ดำรงตำแหน่งแล้ว: ${vacantPosition.fullName}` 
          },
          { status: 409 }
        );
      }

        const updatedPosition = await tx.policePersonnel.update({
          where: { id: vacantPositionId },
          data: {
            fullName: applicant.fullName,
            nationalId: applicant.nationalId,
            rank: applicant.rank,
            seniority: applicant.seniority,
            birthDate: applicant.birthDate,
            age: applicant.age,
            education: applicant.education,
            lastAppointment: applicant.lastAppointment,
            currentRankSince: applicant.currentRankSince,
            enrollmentDate: applicant.enrollmentDate,
            retirementDate: applicant.retirementDate,
            yearsOfService: applicant.yearsOfService,
            trainingLocation: applicant.trainingLocation,
            trainingCourse: applicant.trainingCourse,
            notes: notes || `จับคู่จาก รายการยื่นขอตำแหน่ง: ${applicant.notes || ''}`,
            updatedAt: new Date(),
            updatedBy: 'admin', // ควรใช้ข้อมูล user จริง
          },
        });

      // บันทึกประวัติการจับคู่ในตาราง SwapTransaction
      const currentYear = new Date().getFullYear() + 543; // แปลงเป็น พ.ศ.
      const transaction = await tx.swapTransaction.create({
        data: {
          year: currentYear,
          swapDate: new Date(),
          swapType: 'vacant-assignment',
          groupName: `จับคู่: ${applicant.fullName} → ${vacantPosition.position} ${vacantPosition.unit}`,
          status: 'completed',
          notes: `การจับคู่ผู้ยื่นขอตำแหน่งกับตำแหน่งที่ว่าง\n${notes || ''}`,
          createdBy: 'admin', // ควรใช้ข้อมูล user จริง
        },
      });

      // บันทึกรายละเอียดการจับคู่
      await tx.swapTransactionDetail.create({
        data: {
          transactionId: transaction.id,
          sequence: 1,
          personnelId: applicant.id,
          nationalId: applicant.nationalId,
          fullName: applicant.fullName || '',
          rank: applicant.rank,
          posCodeId: applicant.posCodeId,
          fromPosition: applicant.position,
          fromPositionNumber: applicant.positionNumber,
          fromUnit: applicant.unit,
          toPosition: vacantPosition.position,
          toPositionNumber: vacantPosition.positionNumber,
          toUnit: vacantPosition.unit,
          notes: 'ย้ายจากรายการยื่นขอตำแหน่งไปยังตำแหน่งที่ว่าง',
        },
      });

      // ลบผู้ยื่นขอออกจากรายการ (หรืออาจจะเปลี่ยนสถานะแทน)
      await tx.vacantPosition.delete({
        where: { id: applicantId },
      });

      return {
        updatedPosition,
        transaction,
        message: 'การจับคู่สำเร็จ'
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error assigning position:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign position' },
      { status: 500 }
    );
  }
}