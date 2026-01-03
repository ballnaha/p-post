const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.swapTransaction.count();
    const all = await prisma.swapTransaction.findMany();
    console.log('Total transactions:', count);
    console.log('All transactions detail:', JSON.stringify(all, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
