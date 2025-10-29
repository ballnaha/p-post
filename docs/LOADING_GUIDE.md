# คู่มือการทำงานของ Loading ในระบบ

## ภาพรวมการทำงานของ Loading

ระบบมีการแสดง Loading 2 ระดับ:
1. **Page-level Loading (ทั้งหน้า)** - เมื่อเปลี่ยนหน้า (route)
2. **Component-level Loading (บางส่วน)** - เมื่อโหลดข้อมูลภายในหน้า

---

## 1. Page-level Loading (ทั้งหน้า)

### การทำงาน
- ใช้ไฟล์ `/app/loading.tsx`
- แสดงโดย Next.js อัตโนมัติเมื่อมีการ **เปลี่ยนหน้า (navigation)**
- ครอบคลุมทั้งหน้าจอ (100vh)
- แสดง CircularProgress กับข้อความ "กำลังโหลด..."

### เมื่อไหร่ที่แสดง
- ✅ Click เมนู Sidebar เพื่อไปหน้าใหม่
- ✅ Click ลิงก์ที่เปลี่ยน route
- ✅ การ navigate โดยโปรแกรม (router.push)
- ✅ โหลดหน้าครั้งแรก (initial load)

### ตัวอย่างไฟล์
```tsx
// /app/loading.tsx
export default function Loading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', ... }}>
      <CircularProgress size={48} />
      <Typography>กำลังโหลด...</Typography>
    </Box>
  );
}
```

### ข้อดี
- ไม่ต้องจัดการเอง (Next.js handle ให้)
- UX ดี - ผู้ใช้รู้ว่าระบบกำลังโหลดหน้าใหม่
- ป้องกันการ flash ของเนื้อหา

---

## 2. Component-level Loading (บางส่วน)

### การทำงาน
- ใช้ `useState` เพื่อจัดการ loading state
- แสดงเฉพาะส่วนที่กำลังโหลดข้อมูล
- ใช้ **Skeleton Loading** เพื่อแสดงโครงสร้างของข้อมูล

### เมื่อไหร่ที่ใช้
- ❌ **ไม่แสดงทั้งหน้า** เมื่ออยู่ในหน้าเดิม
- ✅ โหลดข้อมูลจาก API ภายในหน้า
- ✅ Filter, Search, Pagination
- ✅ CRUD operations (Create, Update, Delete)
- ✅ โหลดข้อมูลใน Modal/Dialog

---

## 3. ตัวอย่างการใช้งานในแต่ละหน้า

### 3.1 หน้า Vacant Position (`/police-personnel/vacant-position`)

#### Loading States
```tsx
const [loading, setLoading] = useState(true);          // โหลดข้อมูลหลัก
const [loadingPersonnel, setLoadingPersonnel] = useState(false);  // โหลดรายละเอียด
```

#### เมื่อแสดง Skeleton
- ✅ โหลดข้อมูลครั้งแรก (`useEffect` when `selectedYear` changes)
- ✅ เปลี่ยนปี (Filter)
- ✅ แสดงใน body ของหน้า (ไม่ใช่ทั้งหน้า)

#### Component
```tsx
{loading ? (
  // Skeleton Loading
  viewMode === 'table' ? <TableSkeleton /> : <CardSkeleton />
) : (
  // Real Content
  paginatedData.map(item => ...)
)}
```

---

### 3.2 หน้า Assignment (`/police-personnel/vacant-position/assignment`)

#### Loading States
```tsx
const [loading, setLoading] = useState(false);         // โหลดตำแหน่งว่าง
const [loadingApplicants, setLoadingApplicants] = useState(false);  // โหลดผู้สมัคร
```

#### เมื่อแสดง Skeleton
- ✅ เลือก Filter (unit, posCode, search)
- ✅ โหลดรายการตำแหน่งว่าง
- ✅ แสดง Skeleton Cards (จำนวนตาม `rowsPerPage`)

#### Component
```tsx
{loading && vacantPositions.length === 0 ? (
  // Skeleton Loading - แสดง Cards โครงร่าง
  <Box sx={{ display: 'grid', ... }}>
    {Array.from({ length: rowsPerPage }).map((_, index) => (
      <Card key={index}>
        <Skeleton variant="text" />
        <Skeleton variant="rectangular" />
      </Card>
    ))}
  </Box>
) : (
  // Real Content
  vacantPositions.map(position => ...)
)}
```

---

### 3.3 หน้า Assignment History

#### Loading State
```tsx
const [loading, setLoading] = useState(false);
```

#### เมื่อแสดง
- ✅ โหลดประวัติการจับคู่
- ✅ Filter ตามปี
- ✅ แสดง CircularProgress ตรงกลางหน้า (ไม่ใช่ทั้งหน้า)

---

## 4. Pattern ที่แนะนำ

### ✅ ควรใช้ Skeleton Loading เมื่อ:
1. โหลดข้อมูลหลักของหน้า (ครั้งแรก)
2. Filter หรือ Search ข้อมูล
3. Pagination
4. รู้โครงสร้างของข้อมูลที่จะแสดง

### ✅ ควรใช้ CircularProgress เมื่อ:
1. โหลดข้อมูลใน Modal/Dialog
2. กำลัง Submit Form
3. ไม่รู้โครงสร้างของข้อมูลที่จะแสดง
4. Loading แบบเร็ว (< 1 วินาที)

### ✅ ควรใช้ Page Loading เมื่อ:
1. เปลี่ยนหน้า (navigation)
2. โหลดหน้าครั้งแรก
3. Next.js จัดการให้อัตโนมัติ

---

## 5. Best Practices

### 1. แยก Loading States
```tsx
// ❌ ไม่ดี - ใช้ loading เดียวสำหรับหลายอย่าง
const [loading, setLoading] = useState(false);

// ✅ ดี - แยก state ตามการใช้งาน
const [loadingData, setLoadingData] = useState(false);
const [loadingDetails, setLoadingDetails] = useState(false);
const [submitting, setSubmitting] = useState(false);
```

### 2. Initial Loading
```tsx
// ✅ ดี - ให้ loading = true สำหรับการโหลดครั้งแรก
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  setLoading(true);
  try {
    // fetch data
  } finally {
    setLoading(false);
  }
};
```

### 3. Skeleton แทน CircularProgress
```tsx
// ❌ ไม่ค่อยดี - แค่ spinner ตรงกลาง
{loading && <CircularProgress />}

// ✅ ดีกว่า - Skeleton ที่จำลองโครงสร้างจริง
{loading ? (
  <Box sx={{ display: 'grid', ... }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <Card key={i}>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="rectangular" height={100} />
      </Card>
    ))}
  </Box>
) : (
  // Real content
)}
```

### 4. Loading States ที่ถูกต้อง
```tsx
// ✅ แสดง Skeleton เฉพาะเมื่อไม่มีข้อมูล
{loading && data.length === 0 ? (
  <SkeletonLoader />
) : (
  <DataDisplay data={data} />
)}

// ✅ แสดง Skeleton เมื่อกำลังโหลดครั้งแรก
{loading && !data ? (
  <SkeletonLoader />
) : (
  <DataDisplay data={data} />
)}
```

---

## 6. สรุปการใช้งาน

| สถานการณ์ | Loading Type | Component | ที่แสดง |
|-----------|--------------|-----------|---------|
| Click เมนูไปหน้าใหม่ | Page Loading | `/app/loading.tsx` | ทั้งหน้า |
| โหลดข้อมูลครั้งแรก | Skeleton | Component State | Body |
| Filter/Search | Skeleton | Component State | Body |
| Pagination | Skeleton | Component State | Body |
| Submit Form | CircularProgress | Component State | ปุ่ม/Dialog |
| โหลดใน Modal | CircularProgress | Component State | Modal |
| CRUD Operations | CircularProgress/Disabled | Component State | ปุ่ม |

---

## 7. เพิ่มเติม

### Responsive Skeleton
```tsx
// ปรับขนาด Skeleton ตาม breakpoint
<Skeleton 
  variant="text" 
  width={{ xs: '100%', sm: '80%', md: '60%' }}
  height={{ xs: 20, sm: 24, md: 28 }}
/>
```

### Skeleton Count ตาม rowsPerPage
```tsx
// แสดง Skeleton ตามจำนวนที่ตั้งค่าไว้
{Array.from({ length: rowsPerPage }).map((_, index) => (
  <SkeletonCard key={index} />
))}
```

---

## สรุป

1. **Page Loading** = เปลี่ยนหน้า → แสดงทั้งหน้า (Next.js handle)
2. **Skeleton Loading** = โหลดข้อมูล → แสดงเฉพาะ body
3. **CircularProgress** = Action/Submit → แสดงในปุ่มหรือ dialog

การใช้ Loading ที่ถูกต้องจะทำให้ UX ดีขึ้นและผู้ใช้รู้สึกว่าระบบตอบสนองเร็ว
