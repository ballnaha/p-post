const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPosCodeMaster() {
  try {
    // ตรวจสอบข้อมูลทั้งหมดใน pos_code_master
    const allPosCodes = await prisma.posCodeMaster.findMany({
      orderBy: { id: 'asc' }
    });

    console.log('=== PosCodeMaster Data ===');
    console.log(`Total records: ${allPosCodes.length}`);
    console.log('\nAll records:');
    allPosCodes.forEach(pc => {
      console.log(`  ID: ${pc.id}, Name: ${pc.name}`);
    });

    // ตรวจสอบว่ามี ID = 8 หรือไม่
    const posCode8 = await prisma.posCodeMaster.findUnique({
      where: { id: 8 }
    });

    console.log('\n=== Checking ID = 8 ===');
    if (posCode8) {
      console.log(`✅ Found: ID ${posCode8.id}, Name: "${posCode8.name}"`);
    } else {
      console.log('❌ Not found: No record with ID = 8');
    }

    // ตรวจสอบ police_personnel ที่มี posCodeId = 8
    const personnelWithPosCode8 = await prisma.policePersonnel.findMany({
      where: { posCodeId: 8 },
      include: { posCodeMaster: true },
      take: 5
    });

    console.log('\n=== Police Personnel with posCodeId = 8 ===');
    console.log(`Found ${personnelWithPosCode8.length} records`);
    personnelWithPosCode8.forEach(p => {
      console.log(`  ${p.fullName}: posCodeId=${p.posCodeId}, posCodeMaster=${p.posCodeMaster ? p.posCodeMaster.name : 'NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPosCodeMaster();
