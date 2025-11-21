const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPerson() {
  try {
    // ค้นหาข้อมูล อภิสัณห์ หว้าจีน
    const person = await prisma.policePersonnel.findFirst({
      where: {
        fullName: {
          contains: 'อภิสัณห์'
        }
      },
      select: {
        id: true,
        fullName: true,
        nationalId: true,
        supporterName: true,
        supportReason: true,
        year: true
      }
    });

    console.log('Person found:', person);

    if (person && person.nationalId) {
      // ตรวจสอบใน swap_transaction_detail
      const matched = await prisma.swapTransactionDetail.findMany({
        where: {
          nationalId: person.nationalId,
          OR: [
            { toPosCodeId: { not: null } },
            { toPosition: { not: null } }
          ]
        },
        select: {
          id: true,
          nationalId: true,
          fullName: true,
          toPosCodeId: true,
          toPosition: true,
          toUnit: true,
          transaction: {
            select: {
              id: true,
              groupName: true,
              swapType: true
            }
          }
        }
      });

      console.log('\nMatched records in swap_transaction_detail:', matched);
      console.log('Total matched:', matched.length);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPerson();
