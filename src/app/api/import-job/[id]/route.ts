import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const job = await prisma.importJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบ Import Job'
      }, { status: 404 });
    }

    // คำนวณ percentage
    const percentage = job.totalRows > 0
      ? Math.round((job.processedRows / job.totalRows) * 100)
      : 0;

    // Parse errors
    let errors = [];
    if (job.errors) {
      try {
        errors = JSON.parse(job.errors);
      } catch (e) {
        errors = [];
      }
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        year: job.year,
        status: job.status,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        successRows: job.successRows,
        failedRows: job.failedRows,
        updatedRows: job.updatedRows,
        percentage,
        fileName: job.fileName,
        errors,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      }
    });

  } catch (error: any) {
    console.error('Get job error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาด'
    }, { status: 500 });
  }
}
