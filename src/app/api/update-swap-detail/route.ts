import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// POST: Update swap transaction detail toPositionNumber
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { detailId, newToPositionNumber, newToPosition, newToUnit } = body;

        if (!detailId) {
            return NextResponse.json({ success: false, error: 'detailId is required' }, { status: 400 });
        }

        // Find the detail record
        const existingDetail = await prisma.swapTransactionDetail.findUnique({
            where: { id: detailId },
            include: { transaction: true }
        });

        if (!existingDetail) {
            return NextResponse.json({ success: false, error: 'Detail not found' }, { status: 404 });
        }

        // Update the record
        const updateData: any = {};
        if (newToPositionNumber !== undefined) updateData.toPositionNumber = newToPositionNumber;
        if (newToPosition !== undefined) updateData.toPosition = newToPosition;
        if (newToUnit !== undefined) updateData.toUnit = newToUnit;

        const updatedDetail = await prisma.swapTransactionDetail.update({
            where: { id: detailId },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            message: 'Updated successfully',
            data: {
                id: updatedDetail.id,
                fullName: updatedDetail.fullName,
                fromPosition: updatedDetail.fromPosition,
                fromPositionNumber: updatedDetail.fromPositionNumber,
                toPosition: updatedDetail.toPosition,
                toPositionNumber: updatedDetail.toPositionNumber,
                toUnit: updatedDetail.toUnit,
            }
        });
    } catch (error) {
        console.error('Error updating:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// GET: List all swap details for a year (for finding the correct detailId)
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || '2568', 10);
        const name = searchParams.get('name') || '';

        const transactions = await prisma.swapTransaction.findMany({
            where: { year },
            include: {
                swapDetails: true,
            }
        });

        let allDetails = transactions.flatMap(tx =>
            tx.swapDetails.map(d => ({
                id: d.id,
                fullName: d.fullName,
                rank: d.rank,
                fromPosition: d.fromPosition,
                fromPositionNumber: d.fromPositionNumber,
                toPosition: d.toPosition,
                toPositionNumber: d.toPositionNumber,
                toUnit: d.toUnit,
                transactionId: d.transactionId,
            }))
        );

        if (name) {
            allDetails = allDetails.filter(d => d.fullName?.includes(name));
        }

        return NextResponse.json({
            success: true,
            data: allDetails,
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
