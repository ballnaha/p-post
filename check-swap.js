const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    // Check swap_transaction_detail for position number 2702 07450 0007
    const details = await prisma.swapTransactionDetail.findMany({
        where: {
            OR: [
                { toPositionNumber: '2702 07450 0007' },
                { fromPositionNumber: '2702 07450 0007' },
            ]
        },
        include: {
            transaction: true,
            posCodeMaster: true,
            toPosCodeMaster: true,
        }
    });

    console.log('=== SwapTransactionDetail for position 2702 07450 0007 ===');
    details.forEach(d => {
        console.log({
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
        });
    });

    // Also check if this position exists in police_personnel
    const personnel = await prisma.policePersonnel.findMany({
        where: {
            positionNumber: '2702 07450 0007',
            year: 2568,
            isActive: true,
        }
    });

    console.log('\n=== PolicePersonnel with position 2702 07450 0007 ===');
    personnel.forEach(p => {
        console.log({
            id: p.id,
            fullName: p.fullName,
            rank: p.rank,
            position: p.position,
            positionNumber: p.positionNumber,
            unit: p.unit,
        });
    });

    // Also search by name
    const byName = await prisma.swapTransactionDetail.findMany({
        where: {
            fullName: { contains: 'กตธน' }
        },
        include: {
            transaction: true,
        }
    });

    console.log('\n=== SwapTransactionDetail for กตธน ===');
    byName.forEach(d => {
        console.log({
            id: d.id,
            fullName: d.fullName,
            rank: d.rank,
            fromPosition: d.fromPosition,
            fromPositionNumber: d.fromPositionNumber,
            toPosition: d.toPosition,
            toPositionNumber: d.toPositionNumber,
            transactionYear: d.transaction?.year,
            transactionType: d.transaction?.swapType,
        });
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
