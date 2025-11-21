# Avatar Upload System

ระบบอัพโหลดและจัดการรูป Avatar สำหรับบุคลากร

## 🎯 Features

- ✅ Upload รูปภาพและ resize อัตโนมัติเป็น 300x300px
- ✅ บันทึก URL ลงฐานข้อมูล
- ✅ แก้ไขและลบรูปภาพได้
- ✅ รองรับทั้ง Development และ Production
- ✅ Validation ชนิดและขนาดไฟล์ (max 5MB)
- ✅ Cache optimization สำหรับ performance

## 📁 File Structure

```
public/
  avatars/                              # Folder เก็บรูป avatar
    .gitkeep
    avatar-{id}-{timestamp}.jpg

src/
  app/
    api/
      avatars/
        [filename]/
          route.ts                      # API serve รูปภาพ (สำหรับ production)
      personnel/
        [id]/
          avatar/
            route.ts                    # API upload/delete avatar
  components/
    PersonnelDetailModal.tsx            # Modal แสดงรายละเอียดพร้อม avatar

scripts/
  migrate-avatar-urls.ts                # Migration script
```

## 🚀 API Endpoints

### 1. Upload Avatar
```http
POST /api/personnel/{id}/avatar
Content-Type: multipart/form-data

Body:
  avatar: File (image file)

Response:
{
  "success": true,
  "avatarUrl": "/api/avatars/avatar-{id}-{timestamp}.jpg",
  "message": "อัพโหลดรูปภาพสำเร็จ"
}
```

### 2. Delete Avatar
```http
DELETE /api/personnel/{id}/avatar

Response:
{
  "success": true,
  "message": "ลบรูปภาพสำเร็จ"
}
```

### 3. Get Avatar Image
```http
GET /api/avatars/{filename}

Response: Image file with appropriate Content-Type
Cache-Control: public, max-age=31536000, immutable
```

## 💾 Database Schema

```prisma
model PolicePersonnel {
  // ... other fields
  avatarUrl  String? @map("avatar_url")  // URL ของรูป avatar
}
```

## 🛠️ Development

### Install Dependencies
```bash
npm install
npm install sharp  # สำหรับ resize รูปภาพ
```

### Run Development Server
```bash
npm run dev
```

### Upload Avatar
1. เปิด PersonnelDetailModal
2. กดปุ่ม "เพิ่มรูปภาพ" (Add icon)
3. เลือกไฟล์รูปภาพ (รองรับ: jpg, jpeg, png, gif, webp)
4. รอระบบ upload และ resize

### Edit Avatar
1. กดปุ่ม "แก้ไขรูปภาพ" (Edit icon)
2. เลือกไฟล์รูปใหม่

### Delete Avatar
1. กดปุ่ม "ลบรูปภาพ" (Delete icon)
2. ยืนยันการลบ

## 📦 Production Deployment

### 1. Build Project
```bash
npm run build
```

### 2. Start Production Server
```bash
npm start
```

### 3. Migration (ถ้ามีข้อมูลเก่า)
ถ้ามี avatarUrl แบบเก่า (`/avatars/...`) อยู่แล้ว ให้รัน:
```bash
npm run migrate:avatars
```

Script นี้จะอัพเดท:
- `/avatars/filename.jpg` → `/api/avatars/filename.jpg`

## 🔒 Security

### File Validation
- ตรวจสอบชนิดไฟล์: รองรับเฉพาะ image files
- ตรวจสอบขนาด: จำกัด 5MB
- Path sanitization: ป้องกัน path traversal attack

### Performance
- รูปภาพถูก resize เป็น 300x300px (JPEG quality 90%)
- Cache header: `max-age=31536000` (1 year)
- Immutable cache สำหรับ CDN

## 🐛 Troubleshooting

### รูปไม่แสดง
1. ตรวจสอบว่าไฟล์อยู่ใน `public/avatars/`
2. ตรวจสอบ URL ในฐานข้อมูล (`avatar_url`)
3. เปิด DevTools > Network tab ดู request
4. ตรวจสอบ Console สำหรับ errors

### ไม่สามารถ upload ได้
1. ตรวจสอบขนาดไฟล์ (ต้องไม่เกิน 5MB)
2. ตรวจสอบชนิดไฟล์ (ต้องเป็น image)
3. ตรวจสอบ personnel ID ว่าถูกต้อง
4. ดู API response ใน Network tab

### Production ใช้งานไม่ได้
1. ตรวจสอบว่า `public/avatars/` folder ถูก deploy ไปด้วย
2. ตรวจสอบ permissions ของ folder
3. ตรวจสอบ URL ว่าเป็น `/api/avatars/...` (ไม่ใช่ `/avatars/...`)

## 📝 Notes

- รูปภาพทุกรูปจะถูก convert เป็น JPEG
- Filename format: `avatar-{personnelId}-{timestamp}.jpg`
- รูปเก่าจะถูกลบอัตโนมัติเมื่อ upload รูปใหม่
- รองรับทั้ง mobile และ desktop

## 🔄 Future Improvements

- [ ] รองรับ multiple avatars
- [ ] Image cropping UI
- [ ] Lazy loading
- [ ] WebP support with fallback
- [ ] CDN integration
- [ ] Image optimization pipeline
