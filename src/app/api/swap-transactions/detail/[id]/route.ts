import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * PATCH /api/swap-transactions/detail/[id]
 * อัปเดตข้อมูลบางส่วนของ SwapTransactionDetail (supportName, supportReason, notes, fromActingAs)
 * ใช้สำหรับ sync จาก Board V2
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // ตรวจสอบว่ามี detail อยู่หรือไม่
        const existingDetail = await prisma.swapTransactionDetail.findUnique({
            where: { id }
        });

        if (!existingDetail) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูล SwapTransactionDetail' },
                { status: 404 }
            );
        }

        // อนุญาตให้อัปเดตเฉพาะบาง field
        const allowedFields = ['supportName', 'supportReason', 'notes', 'fromActingAs', 'requestedPosition'];
        const updateData: Record<string, any> = {};

        for (const field of allowedFields) {
            if (field in body) {
                updateData[field] = body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: 'ไม่มีข้อมูลที่จะอัปเดต' },
                { status: 400 }
            );
        }

        const updatedDetail = await prisma.swapTransactionDetail.update({
            where: { id },
            data: updateData,
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
            }
        });

        return NextResponse.json({
            success: true,
            data: updatedDetail,
            message: 'อัปเดตข้อมูลสำเร็จ'
        });
    } catch (error: any) {
        console.error('Error updating swap transaction detail:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/swap-transactions/detail/[id]
 * ดึงข้อมูล SwapTransactionDetail ตาม ID
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const detail = await prisma.swapTransactionDetail.findUnique({
            where: { id },
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
                },
                transaction: {
                    select: {
                        id: true,
                        groupName: true,
                        groupNumber: true,
                        swapType: true,
                        year: true,
                        status: true
                    }
                }
            }
        });

        if (!detail) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูล' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: detail
        });
    } catch (error: any) {
        console.error('Error fetching swap transaction detail:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
            { status: 500 }
        );
    }
}
