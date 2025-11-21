import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAvatarUrls() {
  console.log('🔄 Starting avatar URL migration...');
  
  try {
    // หาข้อมูลที่มี avatarUrl แบบเก่า (เริ่มต้นด้วย /avatars/)
    const personnelWithOldAvatars = await prisma.policePersonnel.findMany({
      where: {
        avatarUrl: {
          startsWith: '/avatars/',
        },
      },
      select: {
        id: true,
        avatarUrl: true,
        fullName: true,
      },
    });

    console.log(`📊 Found ${personnelWithOldAvatars.length} records with old avatar URLs`);

    if (personnelWithOldAvatars.length === 0) {
      console.log('✅ No migration needed!');
      return;
    }

    // อัพเดทเป็น path ใหม่
    let successCount = 0;
    let errorCount = 0;

    for (const personnel of personnelWithOldAvatars) {
      try {
        // แปลง /avatars/filename.jpg -> /api/avatars/filename.jpg
        const oldUrl = personnel.avatarUrl!;
        const filename = oldUrl.replace('/avatars/', '');
        const newUrl = `/api/avatars/${filename}`;

        await prisma.policePersonnel.update({
          where: { id: personnel.id },
          data: { avatarUrl: newUrl },
        });

        console.log(`✅ Updated: ${personnel.fullName} (${personnel.id})`);
        console.log(`   Old: ${oldUrl}`);
        console.log(`   New: ${newUrl}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error updating ${personnel.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n🎉 Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateAvatarUrls()
  .then(() => {
    console.log('✅ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
