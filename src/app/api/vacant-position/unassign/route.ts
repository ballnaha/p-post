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

    // ใช้ transaction เพื่อความปลอดภัย พร้อม timeout
    console.log('🔄 Starting transaction...');
    const result = await prisma.$transaction(async (tx) => {
      // ดึงข้อมูลผู้ยื่นขอ
      console.log('📥 Fetching applicant:', applicantId);
      const applicant = await tx.vacantPosition.findUnique({
        where: { id: applicantId },
        select: {
          id: true,
          fullName: true,
          isAssigned: true
        }
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

      // ค้นหา swap transaction ที่เกี่ยวข้อง
      console.log('� Finding related swap transactions...');
      const transactions = await tx.swapTransaction.findMany({
        where: {
          swapType: 'vacant-assignment',
          swapDetails: {
            some: {
              personnelId: applicantId
            }
          }
        },
        include: {
          swapDetails: true
        }
      });
      console.log(`✅ Found ${transactions.length} transaction(s)`);

      let deletedDetailsCount = 0;
      let deletedTransactionsCount = 0;

      // ลบ transaction details และ transactions
      for (const transaction of transactions) {
        console.log(`🗑️ Deleting transaction ${transaction.id}...`);
        
        // ลบ swap_transaction_detail ก่อน
        const deletedDetails = await tx.swapTransactionDetail.deleteMany({
          where: { transactionId: transaction.id }
        });
        deletedDetailsCount += deletedDetails.count;
        console.log(`✅ Deleted ${deletedDetails.count} detail(s)`);

        // ลบ swap_transaction (cascade delete จะลบ details อัตโนมัติ)
        await tx.swapTransaction.delete({
          where: { id: transaction.id }
        });
        deletedTransactionsCount++;
        console.log(`✅ Deleted transaction ${transaction.id}`);
      }

      // Reset isAssigned สำหรับผู้ยื่นขอเท่านั้น
      // ไม่ต้อง reset ตำแหน่งว่าง (requestedPositionId = null) 
      // เพราะตำแหน่งว่างไม่มี isAssigned = true ตั้งแต่แรก
      console.log('🔄 Resetting applicant status...');
      const updatedApplicant = await tx.vacantPosition.update({
        where: { id: applicantId },
        data: { isAssigned: false },
      });
      console.log('✅ Reset applicant status:', updatedApplicant.id);

      return {
        success: true,
        applicantId: updatedApplicant.id,
        deletedTransactions: deletedTransactionsCount,
        deletedDetails: deletedDetailsCount,
        message: 'ยกเลิกการจับคู่และลบประวัติสำเร็จ'
      };
    }, {
      maxWait: 5000, // รอ transaction เริ่มต้นสูงสุด 5 วินาที
      timeout: 10000, // timeout รวมของ transaction 10 วินาที
    });

    console.log('📤 Sending response:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('💥 Error unassigning position:', error);
    
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
      { error: error instanceof Error ? error.message : 'Failed to unassign position' },
      { status: 500 }
    );
  }
}
