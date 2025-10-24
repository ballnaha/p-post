const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding pos_code_master...');

  const posCodes = [
    { id: 1, name: 'รอง ผบ.ตร.' },
    { id: 2, name: 'ผู้ช่วย' },
    { id: 3, name: 'ผบช.' },
    { id: 4, name: 'รอง ผบช.' },
    { id: 6, name: 'ผบก.' },
    { id: 7, name: 'รอง ผบก.' },
    { id: 8, name: 'ผกก.' },
    { id: 9, name: 'รอง ผกก.' },
    { id: 11, name: 'สว.' },
    { id: 12, name: 'รอง สว.' },
  ];

  for (const posCode of posCodes) {
    const result = await prisma.posCodeMaster.upsert({
      where: { id: posCode.id },
      update: {
        name: posCode.name,
      },
      create: {
        id: posCode.id,
        name: posCode.name,
      },
    });
    console.log(`✓ Created/Updated pos_code: ${result.id} - ${result.name}`);
  }

  console.log('\n✅ Seeding pos_code_master completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding pos_code_master:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
