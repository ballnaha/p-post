const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const counts = await prisma.swapTransaction.groupBy({
        by: ['year', 'swapType'],
        _count: { _all: true }
    });
    console.log('Transaction summary:', counts);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
