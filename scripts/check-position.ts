import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const targetPosNum = '0105 07443 0257';
    const normalizedPosNum = targetPosNum.replace(/\s+/g, '');

    console.log('=== Searching for position:', targetPosNum, '===');
    console.log('Normalized:', normalizedPosNum);

    // 1. Find in swapTransactionDetail where toPositionNumber matches
    console.log('\n--- SwapTransactionDetail with toPositionNumber ---');
    const detailsWithTo = await prisma.swapTransactionDetail.findMany({
        where: {
            OR: [
                { toPositionNumber: { contains: '0105' } },
            ]
        },
        include: { transaction: true }
    });

    const matchingTo = detailsWithTo.filter(d => {
        const norm = d.toPositionNumber?.replace(/\s+/g, '') || '';
        return norm === normalizedPosNum;
    });

    console.log('Found matching toPositionNumber:', matchingTo.length);
    for (const d of matchingTo) {
        console.log({
            id: d.id,
            fullName: d.fullName,
            rank: d.rank,
            fromPosition: d.fromPosition,
            fromUnit: d.fromUnit,
            toPosition: d.toPosition,
            toPositionNumber: d.toPositionNumber,
            toUnit: d.toUnit,
            transactionId: d.transactionId,
            transactionStatus: d.transaction?.status,
            transactionType: d.transaction?.swapType
        });
    }

    // 2. Find in swapTransactionDetail where positionNumber matches (current position)
    console.log('\n--- SwapTransactionDetail with positionNumber (current) ---');
    const detailsWithCurrent = await prisma.swapTransactionDetail.findMany({
        where: {
            OR: [
                { positionNumber: { contains: '0105' } },
            ]
        },
        include: { transaction: true }
    });

    const matchingCurrent = detailsWithCurrent.filter(d => {
        const norm = d.positionNumber?.replace(/\s+/g, '') || '';
        return norm === normalizedPosNum;
    });

    console.log('Found matching positionNumber:', matchingCurrent.length);
    for (const d of matchingCurrent) {
        console.log({
            id: d.id,
            fullName: d.fullName,
            rank: d.rank,
            position: d.position,
            positionNumber: d.positionNumber,
            unit: d.unit,
            toPosition: d.toPosition,
            toPositionNumber: d.toPositionNumber,
            toUnit: d.toUnit,
            transactionId: d.transactionId,
            transactionStatus: d.transaction?.status,
        });
    }

    // 3. Find in policePersonnel
    console.log('\n--- PolicePersonnel with positionNumber ---');
    const personnel = await prisma.policePersonnel.findMany({
        where: {
            positionNumber: { contains: '0105' },
            year: 2568
        }
    });

    const matchingPersonnel = personnel.filter(p => {
        const norm = p.positionNumber?.replace(/\s+/g, '') || '';
        return norm === normalizedPosNum;
    });

    console.log('Found matching personnel:', matchingPersonnel.length);
    for (const p of matchingPersonnel) {
        console.log({
            id: p.id,
            fullName: p.fullName,
            rank: p.rank,
            position: p.position,
            positionNumber: p.positionNumber,
            unit: p.unit,
        });
    }

    // 4. Check swapTransaction with this position as vacantPosition
    console.log('\n--- SwapTransaction with vacantPositionNumber ---');
    const transactions = await prisma.swapTransaction.findMany({
        where: {
            vacantPositionNumber: { contains: '0105' },
        },
        include: { details: true }
    });

    const matchingTrans = transactions.filter(t => {
        const norm = t.vacantPositionNumber?.replace(/\s+/g, '') || '';
        return norm === normalizedPosNum;
    });

    console.log('Found matching transactions:', matchingTrans.length);
    for (const t of matchingTrans) {
        console.log({
            id: t.id,
            vacantPosition: t.vacantPosition,
            vacantPositionNumber: t.vacantPositionNumber,
            vacantPositionUnit: t.vacantPositionUnit,
            swapType: t.swapType,
            status: t.status,
            year: t.year,
            detailsCount: t.details.length,
            details: t.details.map(d => ({
                fullName: d.fullName,
                rank: d.rank,
            }))
        });
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => {
        console.error(e);
        prisma.$disconnect();
    });
