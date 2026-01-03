const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.swapTransactionDetail.count();
    console.log('Total transaction details:', count);
    const sample = await prisma.swapTransactionDetail.findMany({
        include: { transaction: true },
        take: 5
    });
    console.log('Sample:', JSON.stringify(sample, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
