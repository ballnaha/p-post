import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST - จับคู่ผู้ยื่นขอกับตำแหน่งที่ว่าง
export async function POST(request: NextRequest) {
  console.log('🔵 API /assign called');
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { 
      applicantId, // ID ของผู้ยื่นขอจาก VacantPosition
      vacantPositionId, // ID ของตำแหน่งที่ว่างจาก PolicePersonnel
      notes 
    } = body;

    console.log('🔍 Extracted params:', { applicantId, vacantPositionId, notes });

    if (!applicantId || !vacantPositionId) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Applicant ID and vacant position ID are required' },
        { status: 400 }
      );
    }

    // ใช้ transaction เพื่อความปลอดภัย
    console.log('🔄 Starting transaction...');
    const result = await prisma.$transaction(async (tx) => {
      // ดึงข้อมูลผู้ยื่นขอ
      console.log('📥 Fetching applicant:', applicantId);
      const applicant = await tx.vacantPosition.findUnique({
        where: { id: applicantId },
        include: {
          posCodeMaster: true,
          requestedPosCode: true,
        }
      });

      if (!applicant) {
        console.log('❌ Applicant not found');
        throw new Error('Applicant not found');
      }
      console.log('✅ Found applicant:', applicant.fullName);

      // ดึงข้อมูลตำแหน่งที่ว่าง
      console.log('📥 Fetching vacant position:', vacantPositionId);
      const vacantPosition = await tx.policePersonnel.findUnique({
        where: { id: vacantPositionId },
        include: {
          posCodeMaster: true,
        }
      });

      if (!vacantPosition) {
        console.log('❌ Vacant position not found');
        throw new Error('Vacant position not found');
      }
      console.log('✅ Found vacant position:', {
        position: vacantPosition.position,
        unit: vacantPosition.unit,
        fullName: vacantPosition.fullName,
        isOccupied: !!(vacantPosition.fullName && vacantPosition.fullName.trim() !== '' && vacantPosition.fullName !== 'ตำแหน่งว่าง')
      });

      // ตรวจสอบว่าตำแหน่งยังว่างอยู่ (ไม่มีคนหรือเป็นตำแหน่งว่าง)
      // อนุญาตให้จับคู่ได้ถ้า fullName เป็น null, '', 'ว่าง', 'ตำแหน่งว่าง', 'ว่าง (กันตำแหน่ง)', หรือ 'ว่าง(กันตำแหน่ง)'
      const isVacant = !vacantPosition.fullName || 
                       vacantPosition.fullName.trim() === '' || 
                       vacantPosition.fullName === 'ว่าง' ||
                       vacantPosition.fullName === 'ตำแหน่งว่าง' ||
                       vacantPosition.fullName === 'ว่าง (กันตำแหน่ง)' ||
                       vacantPosition.fullName === 'ว่าง(กันตำแหน่ง)';
      
      if (!isVacant) {
        console.log('❌ Position already occupied by:', vacantPosition.fullName);
        return NextResponse.json(
          { 
            error: 'Position is no longer vacant',
            details: `ตำแหน่งนี้มีผู้ดำรงตำแหน่งแล้ว: ${vacantPosition.fullName}` 
          },
          { status: 409 }
        );
      }

      console.log('✅ Position is vacant, proceeding with assignment...');
      
      // ไม่ต้อง update police_personnel เพราะปีต่อไปจะเป็นชุดข้อมูลใหม่
      // เก็บแค่ประวัติการจับคู่ใน SwapTransaction เท่านั้น
      console.log('💾 Creating swap transaction (without updating police_personnel)...');
      
      // บันทึกประวัติการจับคู่ในตาราง SwapTransaction
      const currentYear = new Date().getFullYear() + 543; // แปลงเป็น พ.ศ.
      const transaction = await tx.swapTransaction.create({
        data: {
          year: currentYear,
          swapDate: new Date(),
          swapType: 'vacant-assignment',
          groupName: `จับคู่: ${applicant.fullName} → ${vacantPosition.position} ${vacantPosition.unit}`,
          status: 'completed',
          notes: notes || null,
          createdBy: 'admin', // ควรใช้ข้อมูล user จริง
        },
      });
      console.log('✅ Created transaction:', transaction.id);

      // บันทึกรายละเอียดการจับคู่
      console.log('💾 Creating transaction detail...');
      const detail = await tx.swapTransactionDetail.create({
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
          notes: null,
        },
      });
      console.log('✅ Created transaction detail:', detail.id);

      // อัพเดทสถานะผู้ยื่นขอเป็น "จับคู่แล้ว" แทนการลบ
      console.log('� Updating applicant status to assigned...');
      const updatedApplicant = await tx.vacantPosition.update({
        where: { id: applicantId },
        data: { isAssigned: true },
      });
      console.log('✅ Updated applicant status:', updatedApplicant.id);

      console.log('✅ Transaction completed:', {
        vacantPositionId: vacantPositionId,
        transaction: transaction.id,
        updatedApplicant: updatedApplicant.id,
      });

      return {
        success: true,
        vacantPositionId: vacantPositionId,
        transactionId: transaction.id,
        updatedApplicantId: updatedApplicant.id,
        message: 'การจับคู่สำเร็จ'
      };
    });

    console.log('📤 Sending response:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error assigning position:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign position' },
      { status: 500 }
    );
  }
}