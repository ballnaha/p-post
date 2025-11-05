# แก้ไขปัญหาการ Import ข้อมูลบน Production

## 🔴 ปัญหาที่พบ

### 1. Server has closed the connection (แถวที่ 25002, 39002)
**สาเหตุ:**
- Connection timeout เนื่องจากข้อมูลมากเกินไป
- Transaction ใช้เวลานานเกินไป
- MySQL `wait_timeout` และ `interactive_timeout` หมดเวลา

### 2. The provided value for the column is too long (แถวที่ 25726)
**สาเหตุ:**
- คอลัมน์ `education` เป็น VARCHAR(191) ซึ่งสั้นเกินไป
- ข้อมูลคุณวุฒิบางรายการยาวเกิน 191 ตัวอักษร

## ✅ วิธีแก้ไข

### ขั้นตอนที่ 1: อัปเดต Database Schema

รัน migration เพื่อเปลี่ยน column type:

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

หรือรัน SQL โดยตรง:

```sql
ALTER TABLE `police_personnel` MODIFY COLUMN `education` TEXT NULL;
ALTER TABLE `vacant_position` MODIFY COLUMN `education` TEXT NULL;
```

### ขั้นตอนที่ 2: ตั้งค่า MySQL (สำหรับ Production Server)

แก้ไขไฟล์ `my.cnf` หรือ `my.ini`:

```ini
[mysqld]
# เพิ่ม timeout
wait_timeout = 600
interactive_timeout = 600
net_read_timeout = 600
net_write_timeout = 600

# เพิ่ม max packet size
max_allowed_packet = 256M

# เพิ่ม connection pool
max_connections = 300
```

รีสตาร์ท MySQL:
```bash
# Ubuntu/Debian
sudo systemctl restart mysql

# Windows
net stop MySQL80
net start MySQL80
```

### ขั้นตอนที่ 3: อัปเดตโค้ด Application

โค้ดได้รับการปรับปรุงแล้ว:
- ✅ ลด batch size จาก 1000 → 500 records
- ✅ เพิ่ม transaction timeout (60 วินาที)
- ✅ เพิ่ม delay 100ms ระหว่าง batch
- ✅ จำกัดความยาว `education` ไม่เกิน 5000 ตัวอักษร
- ✅ Fallback เป็นการ import ทีละรายการถ้า batch ล้มเหลว

Deploy โค้ดใหม่:
```bash
git pull origin main
npm install
npm run build
pm2 restart all
```

### ขั้นตอนที่ 4: ตั้งค่า Connection String (ถ้าใช้ Prisma)

แก้ไขไฟล์ `.env`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/database?connect_timeout=300&pool_timeout=300&socket_timeout=300"
```

## 🚀 ขั้นตอนการ Import ใหม่

1. **Backup ข้อมูลก่อน:**
```bash
mysqldump -u root -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Clear ข้อมูลเก่า (ถ้าจำเป็น):**
```sql
TRUNCATE TABLE police_personnel;
```

3. **Import ข้อมูลผ่าน UI:**
   - เปิดหน้า Import
   - เลือกไฟล์ Excel
   - รอให้กระบวนการเสร็จสมบูรณ์
   - ระบบจะแสดง progress แบบ real-time

4. **ตรวจสอบผลลัพธ์:**
```sql
SELECT COUNT(*) as total FROM police_personnel;
SELECT COUNT(*) as with_education FROM police_personnel WHERE education IS NOT NULL;
```

## 📊 ประสิทธิภาพที่คาดหวัง

**ก่อนแก้ไข:**
- Batch size: 1000 records
- Timeout: ไม่กำหนด
- ล้มเหลวที่แถว ~25,000

**หลังแก้ไข:**
- Batch size: 500 records (ปลอดภัยกว่า)
- Transaction timeout: 60 วินาที
- Delay ระหว่าง batch: 100ms
- สามารถ import ข้อมูล 50,000+ แถวได้

**เวลาที่ใช้ (โดยประมาณ):**
- 10,000 แถว: ~30 วินาที
- 50,000 แถว: ~2.5 นาที
- 100,000 แถว: ~5 นาที

## ⚠️ คำเตือนสำคัญ

1. **อย่า import ข้อมูลใน production ในช่วงเวลาที่มีผู้ใช้งานจำนวนมาก**
2. **Backup ข้อมูลก่อนทุกครั้ง**
3. **ทดสอบใน staging environment ก่อน**
4. **ตรวจสอบ server resources (CPU, RAM, Disk)**
5. **Monitor log files ระหว่าง import**

## 🔍 การตรวจสอบ Log

```bash
# Application log
tail -f /var/log/app.log

# MySQL slow query log
tail -f /var/log/mysql/slow-query.log

# MySQL error log
tail -f /var/log/mysql/error.log
```

## 📞 หากยังพบปัญหา

1. ตรวจสอบ server resources
2. เพิ่ม MySQL connections
3. ลด batch size เหลือ 250 หรือ 100
4. ติดต่อ DBA เพื่อ tune MySQL parameters
5. พิจารณาใช้ bulk import tools (mysqlimport, LOAD DATA INFILE)

## 🎯 Alternative: Import ผ่าน Command Line

หากต้องการ import ข้อมูลจำนวนมาก ๆ แนะนำใช้:

```bash
# วิธี 1: ใช้ mysqlimport
mysqlimport --local --fields-terminated-by=',' database_name personnel.csv

# วิธี 2: ใช้ LOAD DATA INFILE
mysql -u root -p database_name -e "
LOAD DATA LOCAL INFILE 'personnel.csv' 
INTO TABLE police_personnel 
FIELDS TERMINATED BY ',' 
ENCLOSED BY '\"' 
LINES TERMINATED BY '\n' 
IGNORE 1 ROWS;
"
```

วิธีนี้เร็วกว่าและมีเสถียรภาพมากกว่าการ import ผ่าน API
