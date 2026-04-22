const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const details = await prisma.swapTransactionDetail.findMany({
        where: { transaction: { year: 2567 } }
    });
    console.log(JSON.stringify(details, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
