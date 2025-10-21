# Police Personnel Import System

## ภาพรวม
ระบบนำเข้าข้อมูลบุคลากรตำรวจจากไฟล์ Excel เข้าสู่ฐานข้อมูล

## คุณสมบัติ
- ✅ นำเข้าข้อมูลจากไฟล์ Excel (.xlsx, .xls)
- ✅ รองรับข้อมูลทั้งตำแหน่งที่มีผู้ดำรงและตำแหน่งว่าง
- ✅ ดาวน์โหลด Template Excel
- ✅ แสดงผลการนำเข้าแบบละเอียด (สำเร็จ/ล้มเหลว)
- ✅ แสดงรายการข้อมูลที่นำเข้าแล้ว
- ✅ ค้นหาข้อมูล
- ✅ Pagination

## หน้าที่สร้าง

### 1. หน้านำเข้าข้อมูล
**Path**: `/police-personnel/import`
**ไฟล์**: `src/app/police-personnel/import/page.tsx`

**ฟีเจอร์**:
- ดาวน์โหลด Template Excel
- อัปโหลดไฟล์ Excel
- แสดงผลการนำเข้า (สำเร็จ/ล้มเหลว)
- แสดงรายละเอียดข้อผิดพลาด

### 2. หน้าแสดงรายการข้อมูล
**Path**: `/police-personnel`
**ไฟล์**: `src/app/police-personnel/page.tsx`

**ฟีเจอร์**:
- แสดงรายการข้อมูลทั้งหมด
- ค้นหาข้อมูล (ชื่อ, ตำแหน่ง, หน่วย, ยศ, เลขบัตร)
- Pagination
- แสดงสถานะ (มีผู้ดำรง/ตำแหน่งว่าง)

## API Endpoints

### 1. Import Data
**Endpoint**: `POST /api/police-personnel/import`
**ไฟล์**: `src/app/api/police-personnel/import/route.ts`

**Request**:
- Content-Type: `multipart/form-data`
- Body: FormData with file field

**Response**:
```json
{
  "success": true,
  "message": "นำเข้าข้อมูลสำเร็จ 10 แถว, ล้มเหลว 2 แถว",
  "results": {
    "success": 10,
    "failed": 2,
    "errors": ["แถวที่ 3: ...", "แถวที่ 5: ..."],
    "created": [...]
  }
}
```

### 2. Get Personnel List
**Endpoint**: `GET /api/police-personnel`
**ไฟล์**: `src/app/api/police-personnel/route.ts`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10)
- `search` (optional)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 3. Download Template
**Endpoint**: `GET /api/police-personnel/template`
**ไฟล์**: `src/app/api/police-personnel/template/route.ts`

**Response**: Excel file download

## รูปแบบไฟล์ Excel

### คอลัมน์ที่ต้องมี:
1. **รหัสตำแหน่ง** - รหัสตำแหน่งจาก PosCodeMaster (ตัวเลข)
2. **ตำแหน่ง** - ชื่อตำแหน่ง
3. **เลขตำแหน่ง** - เลขประจำตำแหน่ง
4. **หน่วย** - หน่วยงาน
5. **ทำหน้าที่** - หน้าที่ที่ปฏิบัติ
6. **อาวุโส** - ลำดับอาวุโส (ตัวเลข)
7. **ยศ** - ยศตำรวจ
8. **ชื่อ-สกุล** - ชื่อเต็มของผู้ดำรงตำแหน่ง (ว่างถ้าไม่มี)
9. **เลขบัตรประชาชน** - เลขบัตร 13 หลัก
10. **วันเกิด** - วันเกิด (รูปแบบวันที่)
11. **อายุ** - อายุ (ตัวเลข)
12. **คุณวุฒิ** - วุฒิการศึกษา
13. **แต่งตั้งครั้งสุดท้าย** - วันที่แต่งตั้ง
14. **ระดับนี้เมื่อ** - วันที่ได้รับยศปัจจุบัน
15. **บรรจุ** - วันที่บรรจุเข้าราชการ
16. **เกษียณ** - วันที่เกษียณ
17. **จำนวนปี** - จำนวนปีการรับราชการ
18. **ตท** - สถานที่ฝึกอบรม
19. **นรต** - รุ่นนายร้อยตำรวจ
20. **หมายเหตุ** - หมายเหตุเพิ่มเติม

### หมายเหตุ:
- ฟิลด์ที่เป็นตัวเลขต้องเป็นตัวเลขเท่านั้น
- วันที่สามารถเป็นรูปแบบ Excel Date หรือ String (YYYY-MM-DD)
- สำหรับตำแหน่งว่าง ให้ใส่เฉพาะข้อมูลตำแหน่ง ไม่ต้องใส่ข้อมูลบุคคล

## การติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
npm install xlsx
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Migrations (ถ้าจำเป็น)
```bash
npx prisma migrate dev
```

## การใช้งาน

### 1. ดาวน์โหลด Template
1. ไปที่หน้า `/police-personnel/import`
2. คลิกปุ่ม "ดาวน์โหลด Template"
3. จะได้ไฟล์ `police_personnel_template.xlsx`

### 2. กรอกข้อมูล
1. เปิดไฟล์ Template ด้วย Excel
2. กรอกข้อมูลตามคอลัมน์ที่กำหนด
3. **อย่าลบหรือเปลี่ยนชื่อหัวคอลัมน์**
4. บันทึกไฟล์

### 3. นำเข้าข้อมูล
1. กลับไปที่หน้า `/police-personnel/import`
2. คลิกเลือกไฟล์ Excel
3. คลิกปุ่ม "นำเข้าข้อมูล"
4. รอผลการนำเข้า

### 4. ตรวจสอบข้อมูล
1. ไปที่หน้า `/police-personnel`
2. ดูรายการข้อมูลที่นำเข้า
3. ใช้ฟังก์ชันค้นหาเพื่อค้นหาข้อมูล

## ข้อมูลเพิ่มเติม

### Navigation Menu
ระบบจะเพิ่มเมนูใหม่ใน Sidebar:
- **Police Personnel**
  - Personnel List - แสดงรายการข้อมูล
  - Import Data - นำเข้าข้อมูล

### Security
- ต้อง login ก่อนใช้งาน (ใช้ NextAuth)
- บันทึกผู้สร้างและผู้แก้ไขข้อมูล (createdBy, updatedBy)

### Error Handling
- แสดงรายการแถวที่นำเข้าไม่สำเร็จพร้อมข้อความ error
- Validation ข้อมูลก่อนบันทึก
- Transaction rollback กรณีเกิด error

## Known Issues

### TypeScript Error
หลังจาก generate Prisma client อาจมี TypeScript error ใน VS Code:
```
Property 'policePersonnel' does not exist on type 'PrismaClient'
```

**วิธีแก้**:
1. Restart TypeScript server: `Ctrl+Shift+P` > `TypeScript: Restart TS Server`
2. หรือ restart VS Code
3. Model `policePersonnel` มีอยู่จริงและใช้งานได้ปกติ

## TODO
- [ ] เพิ่มการ Export ข้อมูลเป็น Excel
- [ ] เพิ่มหน้าแก้ไขข้อมูล
- [ ] เพิ่มการลบข้อมูล
- [ ] เพิ่มการ Validate ข้อมูลที่ซับซ้อนขึ้น
- [ ] เพิ่ม Batch Delete
- [ ] เพิ่ม History Log
