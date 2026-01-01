const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalizePositionNumber = (posNum) => {
    if (!posNum) return '';
    return posNum.replace(/\s+/g, '').trim();
};

async function main() {
    const targetPosNum = '0105 07443 0257';
    const year = 2568;

    // 1. Find Personnel
    const personnel = await prisma.policePersonnel.findMany({
        where: {
            positionNumber: { contains: '0257' },
            year: year
        }
    });

    const p = personnel.find(x => normalizePositionNumber(x.positionNumber) === normalizePositionNumber(targetPosNum));

    if (p) {
        const personnelKey = `${normalizePositionNumber(p.positionNumber)}|${p.unit}`;
        console.log('Personnel Found:');
        console.log(`- Name: ${p.fullName}`);
        console.log(`- PosNum: [${p.positionNumber}] (Normalized: [${normalizePositionNumber(p.positionNumber)}])`);
        console.log(`- Unit: [${p.unit}]`);
        console.log(`- API Search Key: [${personnelKey}]`);
    } else {
        console.log('Personnel NOT found with that exact position number');
    }

    // 2. Find matching SwapDetails
    const details = await prisma.swapTransactionDetail.findMany({
        where: {
            toPositionNumber: { contains: '0257' },
            transaction: { year: year }
        },
        include: { transaction: true }
    });

    console.log('\nSwap Details found for 0257:');
    details.filter(d => normalizePositionNumber(d.toPositionNumber) === normalizePositionNumber(targetPosNum)).forEach(d => {
        const detailKey = `${normalizePositionNumber(d.toPositionNumber)}|${d.toUnit}`;
        console.log(`- Person Moving IN: ${d.fullName}`);
        console.log(`  ToPosNum: [${d.toPositionNumber}] (Normalized: [${normalizePositionNumber(d.toPositionNumber)}])`);
        console.log(`  ToUnit: [${d.toUnit}]`);
        console.log(`  Swap Detail Key: [${detailKey}]`);
        console.log(`  Status: ${d.transaction?.status}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
