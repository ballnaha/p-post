# Promotion Chain UI - คู่มือการใช้งาน

## 📋 ภาพรวม

UI สำหรับจัดการ **Promotion Chain (ลูกโซ่การเลื่อนตำแหน่ง)** ที่เกิดขึ้นเมื่อมีตำแหน่งว่างและต้องการเลื่อนคนขึ้นมาแทนตามลำดับชั้นยศ

## 🎯 สถานการณ์ตัวอย่าง

### ปัญหา:
- มีตำแหน่งว่าง: **ผกก-นครปฐม**
- เลือกคนมาแทน: **รอง ผบก. จากราชบุรี**
- ตำแหน่งเดิมของเขา (**ผบก.-ราชบุรี**) จะว่างลง
- ต้องหาคนมาแทนต่อ: **ผกก.-สมุทรสาคร**
- ตำแหน่งเดิม (**ผกก.-สมุทรสาคร**) จะว่างลง
- ทำต่อไปจนถึงระดับล่างสุดที่กำหนด

### โซ่การเลื่อนตำแหน่ง:
```
ผกก-นครปฐม (ว่าง)
    ↓
รอง ผบก. สมชาย - ราชบุรี (เลื่อนขึ้น)
    ↓ (ผบก.-ราชบุรี ว่าง)
ผกก. สมศรี - สมุทรสาคร (เลื่อนขึ้น)
    ↓ (ผกก.-สมุทรสาคร ว่าง)
สว. สมหมาย - กาญจนบุรี (เลื่อนขึ้น)
    ↓ (สว.-กาญจนบุรี ว่าง)
รอง สว. สมใจ - สุพรรณบุรี (เลื่อนขึ้น)
    ✓ (จบโซ่)
```

## 🏗️ โครงสร้าง Files

```
src/app/police-personnel/promotion-chain/
├── page.tsx                                    # หน้าแสดงรายการ Promotion Chains
└── create/
    ├── page.tsx                                # หน้าสร้าง Chain ใหม่
    └── components/
        ├── PromotionChainBuilder.tsx           # Component หลักสำหรับสร้าง Chain
        ├── CandidateSelector.tsx               # Dialog เลือกผู้สมัคร
        └── ChainNodeCard.tsx                   # Card แสดงแต่ละขั้นของ Chain
```

## 🎨 UI Components

### 1. **หน้าแสดงรายการ** (`/police-personnel/promotion-chain`)

**Features:**
- ✅ แสดงรายการ Promotion Chain ทั้งหมด
- ✅ กรองตามปีงบประมาณ
- ✅ แสดงสถานะ (ร่าง, อนุมัติ, เสร็จสิ้น, ยกเลิก)
- ✅ Preview แบบย่อของแต่ละ Chain
- ✅ ปุ่มดูรายละเอียด, แก้ไข, ลบ

**UI Elements:**
```tsx
- Header พร้อม title และปุ่ม "สร้าง Chain ใหม่"
- Dropdown เลือกปีงบประมาณ
- Alert box อธิบาย Promotion Chain
- Card list แสดง Chains พร้อม:
  - Chain Number
  - ตำแหน่งต้นทาง
  - จำนวนขั้น
  - Status badge
  - Preview chain (Chip + Arrow)
```

### 2. **หน้าสร้าง Chain** (`/police-personnel/promotion-chain/create`)

**Features:**
- ✅ แสดงตำแหน่งว่างต้นทาง
- ✅ สรุปสถานะ Chain (จำนวนขั้น, การตรวจสอบ)
- ✅ ปุ่มบันทึก/ยกเลิก

### 3. **PromotionChainBuilder Component**

**Features:**
- ✅ แสดง Visual Chain แบบ Step-by-step
- ✅ กล่องแสดงตำแหน่งว่างต้นทาง
- ✅ แสดงแต่ละ Node ด้วย ChainNodeCard
- ✅ ลูกศรแสดงทิศทาง (Arrow Down)
- ✅ กล่อง "เพิ่มขั้นถัดไป" พร้อมแสดงยศที่ต้องการ
- ✅ สรุป Chain แบบ Horizontal Chips

**Logic:**
```typescript
// คำนวณยศที่ต้องการในขั้นถัดไป
const getNextRequiredRankLevel = (): number | null => {
  if (nodes.length === 0) {
    // ขั้นแรก: หาคนที่มียศต่ำกว่าตำแหน่งว่าง
    return vacantRankLevel + 1;
  }
  // ขั้นถัดไป: หาคนที่มียศต่ำกว่าตำแหน่งที่เพิ่งว่าง
  return lastNode.fromRankLevel + 1;
};
```

### 4. **CandidateSelector Component (Dialog)**

**Features:**
- ✅ แสดงข้อมูลตำแหน่งว่างและยศที่ต้องการ
- ✅ Search box สำหรับค้นหาผู้สมัคร
- ✅ ตารางแสดงรายชื่อผู้สมัครจาก Swap List
- ✅ Filter ตามยศที่ต้องการโดยอัตโนมัติ
- ✅ แสดงข้อมูล: ชื่อ, ยศ, ตำแหน่งปัจจุบัน, หน่วย, อาวุโส
- ✅ Selected Info Box แสดงผู้สมัครที่เลือก

**Mock Data:**
```typescript
// สำหรับ Demo - ใน Production จะดึงจาก API
const mockCandidates = [
  {
    fullName: 'พ.ต.ท. สมชาย ใจดี',
    rank: 'พ.ต.ท.',
    position: 'รอง ผบก.-ราชบุรี',
    unit: 'สถ.ราชบุรี',
    rankLevel: requiredRankLevel,
  },
];
```

### 5. **ChainNodeCard Component**

**Features:**
- ✅ Badge แสดงลำดับขั้น + สถานะความถูกต้อง
- ✅ ข้อมูลบุคคล (ชื่อ, ยศ, อาวุโส)
- ✅ แสดงตำแหน่งเดิม (จะว่าง) - พื้นหลังสีแดง
- ✅ แสดงตำแหน่งใหม่ - พื้นหลังสีเขียว
- ✅ Badge "เลื่อนขึ้น" / "ย้าย" ตรงกลาง
- ✅ ปุ่มลบ (แสดงเฉพาะ Node สุดท้าย)
- ✅ Info box แสดงตำแหน่งที่จะว่างถัดไป

**Visual Design:**
```
┌─────────────────────────────────────────────────┐
│  [✓ ขั้นที่ 1]                        [🗑️ ลบ]  │
│                                                 │
│  👤 พ.ต.ท. สมชาย ใจดี                          │
│     [พ.ต.ท.] [อ.50]                            │
│  ───────────────────────────────────────────    │
│                                                 │
│  🏢 ตำแหน่งเดิม (จะว่าง)                       │
│  ┌─────────────────────────────────────────┐   │
│  │ รอง ผบก.-ราชบุรี                        │   │
│  │ สถ.ราชบุรี                              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│            [↑ เลื่อนขึ้น]                       │
│                                                 │
│  🏢 ตำแหน่งใหม่                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ ผกก-นครปฐม                             │   │
│  │ สถ.นครปฐม                              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  💡 ตำแหน่ง รอง ผบก.-ราชบุรี จะว่าง →         │
│     ต้องหาคนมาแทนในขั้นถัดไป                   │
└─────────────────────────────────────────────────┘
```

## 🔄 Flow การใช้งาน

### 1. เข้าหน้า Promotion Chain Management
```
/police-personnel/promotion-chain
```

### 2. คลิก "สร้าง Chain ใหม่"
- เปิด Dialog แสดงรายการตำแหน่งว่าง
- เลือกตำแหน่งว่างที่ต้องการ

### 3. ระบบนำไปหน้า Create
```
/police-personnel/promotion-chain/create?vacantId=xxx
```

### 4. เริ่มสร้าง Chain
1. **ขั้นที่ 1:** คลิก "เลือกผู้สมัคร"
   - เปิด Dialog แสดงผู้สมัครที่มียศเหมาะสม
   - เลือกคน → ระบบสร้าง Node แรก

2. **ขั้นที่ 2:** ระบบแสดงตำแหน่งที่ว่างใหม่
   - คลิก "เลือกผู้สมัคร" อีกครั้ง
   - เลือกคนมาแทน → สร้าง Node ที่ 2

3. **ทำซ้ำ:** จนถึงระดับล่างสุด (รอง สว.)

### 5. บันทึก Chain
- ตรวจสอบความถูกต้อง
- คลิก "บันทึก Chain"

## 📊 Rank Hierarchy (ลำดับชั้นยศ)

```typescript
const RANK_HIERARCHY = [
  { rankName: 'รอง ผบ.ตร.', rankLevel: 1 },
  { rankName: 'ผู้ช่วย', rankLevel: 2 },
  { rankName: 'ผบช.', rankLevel: 3 },
  { rankName: 'รอง ผบช.', rankLevel: 4 },
  { rankName: 'ผบก.', rankLevel: 6 },
  { rankName: 'รอง ผบก.', rankLevel: 7 },
  { rankName: 'ผกก.', rankLevel: 8 },
  { rankName: 'รอง ผกก.', rankLevel: 9 },
  { rankName: 'สว.', rankLevel: 11 },
  { rankName: 'รอง สว.', rankLevel: 12 },
];
```

**หมายเหตุ:** ระดับน้อย = ยศสูงกว่า

## 🔍 Validation Rules

### 1. การเลื่อนตำแหน่งต้องถูกต้อง
```typescript
isPromotionValid = toRankLevel < fromRankLevel
// ตัวอย่าง: จาก รอง ผบก. (level 7) → ผกก. (level 8) ❌ ไม่ถูกต้อง
// ตัวอย่าง: จาก รอง ผบก. (level 7) → ผบก. (level 6) ✅ ถูกต้อง
```

### 2. ผู้สมัครต้องมียศที่เหมาะสม
```typescript
requiredRankLevel = vacantRankLevel + 1
// ตัวอย่าง: ผกก. ว่าง (level 8) → ต้องการ รอง ผกก. (level 9)
```

## 🎯 Next Steps (TODO)

### Backend Implementation:
- [ ] สร้าง API endpoints:
  - `POST /api/promotion-chain` - สร้าง chain ใหม่
  - `GET /api/promotion-chain` - ดึงรายการ chains
  - `GET /api/promotion-chain/:id` - ดึงข้อมูล chain
  - `PUT /api/promotion-chain/:id` - แก้ไข chain
  - `DELETE /api/promotion-chain/:id` - ลบ chain
  - `POST /api/promotion-chain/:id/approve` - อนุมัติ chain

### Database:
- [ ] เพิ่มตาราง `promotion_chain`
- [ ] เพิ่มตาราง `promotion_chain_node`
- [ ] เพิ่มตาราง `rank_hierarchy`

### UI Enhancements:
- [ ] หน้าดูรายละเอียด Chain
- [ ] หน้าแก้ไข Chain
- [ ] Export Chain เป็น PDF
- [ ] Timeline view
- [ ] Drag & Drop reorder nodes

## 💡 Key Features

✅ **Visual Chain Builder** - แสดง Chain แบบ Step-by-step ง่ายต่อการเข้าใจ

✅ **Auto Rank Detection** - ระบบคำนวณยศที่ต้องการอัตโนมัติ

✅ **Real-time Validation** - ตรวจสอบความถูกต้องของการเลื่อนตำแหน่งแบบ Real-time

✅ **Mock Data Ready** - มี Mock data สำหรับทดสอบ UI

✅ **Responsive Design** - รองรับทุกขนาดหน้าจอ

✅ **Material-UI** - ใช้ MUI components ที่สวยงามและ Accessible

## 🚀 วิธีทดสอบ

1. เปิดโปรเจค
```bash
npm run dev
```

2. เข้า URL:
```
http://localhost:3000/police-personnel/promotion-chain
```

3. คลิก "สร้าง Chain ใหม่"

4. ระบบจะแสดง Mock data ของตำแหน่งว่าง

5. เลือกตำแหน่งว่าง → ไปหน้า Create

6. คลิก "เลือกผู้สมัคร" → เห็น Mock data ผู้สมัคร

7. เลือกคน → เห็น Node Card แสดงผลสวยงาม

8. ทำซ้ำเพื่อสร้าง Chain หลายขั้น

## 📝 หมายเหตุ

- UI ทั้งหมดใช้ **Mock Data** เนื่องจากยังไม่มี Backend API
- ต้องเชื่อมต่อกับ API จริงในขั้นตอนถัดไป
- Two-way และ Three-way Swap ไม่ได้ถูกแก้ไข ยังคงทำงานตามเดิม
- Promotion Chain เป็น Feature ใหม่ที่แยกออกมาต่างหาก
