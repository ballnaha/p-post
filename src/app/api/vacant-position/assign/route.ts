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

    // ใช้ transaction เพื่อความปลอดภัย พร้อม timeout
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

      // ตรวจสอบว่าผู้ยื่นขอถูกจับคู่ไปแล้วหรือไม่
      if (applicant.isAssigned) {
        console.log('❌ Applicant already assigned');
        throw new Error('Applicant already assigned');
      }
      console.log('✅ Applicant is not yet assigned');

      // ดึงข้อมูลตำแหน่งที่ว่างจาก vacant_position (snapshot ถาวร)
      console.log('📥 Fetching vacant position:', vacantPositionId);
      const vacantPosition = await tx.vacantPosition.findUnique({
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
        isAssigned: vacantPosition.isAssigned,
        year: vacantPosition.year
      });

      // ตรวจสอบว่าตำแหน่งนี้ถูกจับคู่ไปแล้วหรือไม่
      if (vacantPosition.isAssigned) {
        console.log('❌ Position already assigned');
        throw new Error('CONFLICT:ตำแหน่งนี้ถูกจับคู่ไปแล้ว');
      }
      console.log('✅ Position is available for assignment');
      
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

      // อัพเดทสถานะผู้ยื่นขอเป็น "จับคู่แล้ว"
      console.log('📝 Updating applicant status to assigned...');
      const updatedApplicant = await tx.vacantPosition.update({
        where: { id: applicantId },
        data: { isAssigned: true },
      });
      console.log('✅ Updated applicant status:', updatedApplicant.id);

      // ไม่ update isAssigned สำหรับตำแหน่งว่าง (requested_position_id = null)
      // เพราะจะทำให้เกิด data inconsistency
      // ตำแหน่งว่างยังคงเป็น vacant position ที่พร้อมให้คนอื่นยื่นขอได้
      console.log('ℹ️ Skipping vacant position status update to maintain data consistency');
      console.log('ℹ️ Vacant position (requested_position_id=null) should remain isAssigned=false');

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
    }, {
      maxWait: 5000, // รอ transaction เริ่มต้นสูงสุด 5 วินาที
      timeout: 10000, // timeout รวมของ transaction 10 วินาที
    });

    console.log('📤 Sending response:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error assigning position:', error);
    
    // ตรวจสอบ CONFLICT error
    if (error instanceof Error && error.message.startsWith('CONFLICT:')) {
      const details = error.message.replace('CONFLICT:', '');
      return NextResponse.json(
        { 
          error: 'Position already assigned',
          details: details
        },
        { status: 409 }
      );
    }
    
    // ตรวจสอบ Applicant already assigned error
    if (error instanceof Error && error.message === 'Applicant already assigned') {
      return NextResponse.json(
        { 
          error: 'Applicant already assigned',
          details: 'ผู้ยื่นขอถูกจับคู่ตำแหน่งไปแล้ว'
        },
        { status: 409 }
      );
    }
    
    // ตรวจสอบ Prisma error type
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      if (prismaError.code === 'P2028') {
        return NextResponse.json(
          { 
            error: 'ระบบไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
            details: 'Transaction timeout - database is busy'
          },
          { status: 503 } // Service Unavailable
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign position' },
      { status: 500 }
    );
  }
}