const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const targetPosNum = '0105 07443 0257';
    const normalizedTarget = targetPosNum.replace(/\s+/g, '');

    console.log('Searching for Position Number:', targetPosNum);
    console.log('Normalized Target:', normalizedTarget);

    // 1. Personnel record for 2568
    const personnel = await prisma.policePersonnel.findMany({
        where: { year: 2568 }
    });

    const matchingPersonnel = personnel.filter(p => (p.positionNumber || '').replace(/\s+/g, '') === normalizedTarget);
    console.log('\n--- Police Personnel (2568) ---');
    matchingPersonnel.forEach(p => {
        console.log(`ID: ${p.id}, Name: ${p.fullName}, Unit: [${p.unit}], PosNum: [${p.positionNumber}]`);
    });

    // 2. Search SwapTransactionDetail by toPositionNumber
    // Since toPositionNumber is a String, we can use contains at DB level
    const incomingDetails = await prisma.swapTransactionDetail.findMany({
        where: {
            OR: [
                { toPositionNumber: { contains: '0257' } }
            ]
        },
        include: { transaction: true }
    });

    const exactIncoming = incomingDetails.filter(d => (d.toPositionNumber || '').replace(/\s+/g, '') === normalizedTarget);
    console.log('\n--- Incoming Swap Details (Exact Match) ---');
    exactIncoming.forEach(d => {
        console.log(`- Person: ${d.fullName} (${d.rank})`);
        console.log(`  ToUnit: [${d.toUnit}], ToPosNum: [${d.toPositionNumber}]`);
        console.log(`  TransID: ${d.transactionId}, Type: ${d.transaction?.swapType}, Status: ${d.transaction?.status}, Year: ${d.transaction?.year}`);
    });

    if (exactIncoming.length === 0 && incomingDetails.length > 0) {
        console.log('\n--- Other partial matches found for 0257 ---');
        incomingDetails.forEach(d => {
            console.log(`- Person: ${d.fullName}, ToPosNum: [${d.toPositionNumber}]`);
        });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
