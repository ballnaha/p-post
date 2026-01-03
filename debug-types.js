const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const types = await prisma.swapTransaction.findMany({
        select: { swapType: true },
        distinct: ['swapType'],
    });
    console.log('Swap types found:', types.map(t => t.swapType));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
