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
        notes: true,
        createdAt: true,
        updatedAt: true,
        swapDetails: {
          select: {
            id: true,
            sequence: true,
            personnelId: true,
            nationalId: true,
            fullName: true,
            rank: true,
            posCodeId: true,
            posCodeMaster: {
              select: {
                id: true,
                name: true
              }
            },
            fromPosition: true,
            fromPositionNumber: true,
            fromUnit: true,
            toPosition: true,
            toPositionNumber: true,
            toUnit: true,
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

    // สำหรับ vacant-assignment ให้ดึงข้อมูล requestedPosCode
    if (swapType === 'vacant-assignment') {
      const enrichedTransactions = await Promise.all(
        transactions.map(async (transaction) => {
          const enrichedDetails = await Promise.all(
            transaction.swapDetails.map(async (detail) => {
              if (detail.personnelId) {
                // ดึงข้อมูล VacantPosition จาก personnelId
                const vacantPosition = await prisma.vacantPosition.findUnique({
                  where: { id: detail.personnelId },
                  include: {
                    requestedPosCode: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                });
                
                return {
                  ...detail,
                  requestedPosCode: vacantPosition?.requestedPosCode || null,
                  requestedPositionId: vacantPosition?.requestedPositionId || null
                };
              }
              return detail;
            })
          );
          
          return {
            ...transaction,
            swapDetails: enrichedDetails
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        data: enrichedTransactions
      });
    }

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
  const { year, swapDate, swapType, groupName, groupNumber, notes, swapDetails } = body;

    // Validate
    const effectiveSwapType = swapType || 'two-way';
    const minDetails = effectiveSwapType === 'promotion-chain' ? 1 : 2;
    if (!year || !swapDate || !swapDetails || swapDetails.length < minDetails) {
      return NextResponse.json(
        { success: false, error: effectiveSwapType === 'promotion-chain' ? 'ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 1 ขั้นตอน' : 'ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 2 คนที่สลับตำแหน่ง' },
        { status: 400 }
      );
    }

    // Create transaction with details
    const transaction = await prisma.swapTransaction.create({
      data: {
        year,
        swapDate: new Date(swapDate),
        swapType: swapType || 'two-way',
        groupName,
        groupNumber,
        status: 'completed',
        notes,
        swapDetails: {
          create: swapDetails.map((detail: any, index: number) => ({
            sequence: detail.sequence !== undefined ? detail.sequence : (swapType === 'three-way' ? index + 1 : null),
            personnelId: detail.personnelId,
            nationalId: detail.nationalId,
            fullName: detail.fullName,
            rank: detail.rank,
            posCodeId: detail.posCodeId,
            fromPosition: detail.fromPosition,
            fromPositionNumber: detail.fromPositionNumber,
            fromUnit: detail.fromUnit,
            toPosition: detail.toPosition,
            toPositionNumber: detail.toPositionNumber,
            toUnit: detail.toUnit,
            notes: detail.notes
          }))
        }
      },
      include: {
        swapDetails: {
          orderBy: swapType === 'three-way' ? { sequence: 'asc' } : { fullName: 'asc' }
        }
      }
    });

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
