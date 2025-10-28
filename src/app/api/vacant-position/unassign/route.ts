import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST - ยกเลิกการจับคู่ตำแหน่ง
export async function POST(request: NextRequest) {
  console.log('🔵 API /unassign called');
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { applicantId, reason } = body;

    console.log('🔍 Extracted params:', { applicantId, reason });

    if (!applicantId) {
      console.log('❌ Missing applicantId');
      return NextResponse.json(
        { error: 'Applicant ID is required' },
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
      });

      if (!applicant) {
        console.log('❌ Applicant not found');
        throw new Error('Applicant not found');
      }
      console.log('✅ Found applicant:', applicant.fullName);

      if (!applicant.isAssigned) {
        console.log('❌ Applicant is not assigned');
        throw new Error('Applicant is not assigned, cannot unassign');
      }

      // ยกเลิกสถานะการจับคู่
      console.log('🔄 Updating applicant status to unassigned...');
      const updatedApplicant = await tx.vacantPosition.update({
        where: { id: applicantId },
        data: { isAssigned: false },
      });
      console.log('✅ Updated applicant status:', updatedApplicant.id);

      // อัพเดทสถานะใน SwapTransaction เป็น 'cancelled'
      console.log('🔄 Cancelling swap transaction...');
      const cancelledTransactions = await tx.swapTransaction.updateMany({
        where: {
          swapType: 'vacant-assignment',
          swapDetails: {
            some: {
              personnelId: applicantId
            }
          }
        },
        data: {
          status: 'cancelled',
          notes: `ยกเลิกการจับคู่: ${reason || 'ไม่ระบุเหตุผล'}\n(ยกเลิกเมื่อ: ${new Date().toLocaleString('th-TH')})`
        }
      });
      console.log('✅ Cancelled transactions:', cancelledTransactions.count);

      return {
        success: true,
        applicantId: updatedApplicant.id,
        cancelledTransactions: cancelledTransactions.count,
        message: 'ยกเลิกการจับคู่สำเร็จ'
      };
    });

    console.log('📤 Sending response:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('💥 Error unassigning position:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unassign position' },
      { status: 500 }
    );
  }
}
