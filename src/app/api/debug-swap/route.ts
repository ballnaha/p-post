import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Normalize position number (remove spaces)
const normalizePositionNumber = (posNum: string | null | undefined): string => {
    if (!posNum) return '';
    return posNum.replace(/\s+/g, '').trim();
};

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const positionNumber = searchParams.get('positionNumber') || '2702 07450 0007';
        const name = searchParams.get('name') || 'กตธน';
        const year = parseInt(searchParams.get('year') || '2568', 10);

        const normalizedPosNum = normalizePositionNumber(positionNumber);

        // Check all swap_transaction_detail with toPositionNumber (any format)
        const allSwapDetails = await prisma.swapTransactionDetail.findMany({
            include: {
                transaction: true,
            },
            take: 500, // limit
        });

        // Filter by normalized position number
        const detailsByNormalizedPos = allSwapDetails.filter(d =>
            normalizePositionNumber(d.toPositionNumber) === normalizedPosNum ||
            normalizePositionNumber(d.fromPositionNumber) === normalizedPosNum
        );

        // Check by name
        const detailsByName = allSwapDetails.filter(d =>
            d.fullName?.includes(name)
        );

        // Check police_personnel
        const personnel = await prisma.policePersonnel.findMany({
            where: {
                positionNumber: positionNumber,
                year: year,
                isActive: true,
            }
        });

        // Also search personnel by normalized position number
        const allPersonnel = await prisma.policePersonnel.findMany({
            where: {
                year: year,
                isActive: true,
            },
            select: {
                id: true,
                positionNumber: true,
                fullName: true,
                rank: true,
                position: true,
                unit: true,
            },
            take: 3000,
        });

        const personnelByNormalizedPos = allPersonnel.filter(p =>
            normalizePositionNumber(p.positionNumber) === normalizedPosNum
        );

        // Get all swap transactions for this year
        const swapTxForYear = await prisma.swapTransaction.findMany({
            where: { year: year },
            include: {
                swapDetails: true,
            }
        });

        return NextResponse.json({
            success: true,
            searchParams: {
                positionNumber,
                normalizedPosNum,
                name,
                year,
            },
            data: {
                swapTxCountForYear: swapTxForYear.length,
                swapDetailsCountForYear: swapTxForYear.reduce((sum, tx) => sum + tx.swapDetails.length, 0),
                detailsByNormalizedPosition: detailsByNormalizedPos.map(d => ({
                    id: d.id,
                    fullName: d.fullName,
                    rank: d.rank,
                    fromPosition: d.fromPosition,
                    fromPositionNumber: d.fromPositionNumber,
                    toPosition: d.toPosition,
                    toPositionNumber: d.toPositionNumber,
                    transactionId: d.transactionId,
                    transactionYear: d.transaction?.year,
                    transactionType: d.transaction?.swapType,
                })),
                detailsByName: detailsByName.map(d => ({
                    id: d.id,
                    fullName: d.fullName,
                    rank: d.rank,
                    fromPosition: d.fromPosition,
                    fromPositionNumber: d.fromPositionNumber,
                    toPosition: d.toPosition,
                    toPositionNumber: d.toPositionNumber,
                    transactionYear: d.transaction?.year,
                    transactionType: d.transaction?.swapType,
                })),
                personnelExactMatch: personnel.map(p => ({
                    id: p.id,
                    fullName: p.fullName,
                    rank: p.rank,
                    position: p.position,
                    positionNumber: p.positionNumber,
                    unit: p.unit,
                })),
                personnelNormalizedMatch: personnelByNormalizedPos.map(p => ({
                    id: p.id,
                    fullName: p.fullName,
                    rank: p.rank,
                    position: p.position,
                    positionNumber: p.positionNumber,
                    unit: p.unit,
                })),
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
