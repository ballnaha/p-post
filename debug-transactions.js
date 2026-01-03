const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.swapTransaction.findMany({
        select: { swapType: true, status: true },
        take: 20
    });
    console.log('Sample transactions:', transactions);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
