# การปรับปรุงหน้า promotion/[id]/edit

## การเปลี่ยนแปลงที่ต้องทำ:

### 1. เพิ่ม State สำหรับ Unit (หลังบรรทัด ~150)
```typescript
const [unitName, setUnitName] = useState<string>('');
const [unitDescription, setUnitDescription] = useState<string>('');
const [unitOptions, setUnitOptions] = useState<string[]>([]);
```

### 2. เพิ่ม useEffect สำหรับดึง unit options (คัดลอกจาก create/page.tsx)
```typescript
useEffect(() => {
  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/in-out?filtersOnly=true');
      if (!response.ok) throw new Error('Failed to fetch filters');
      const result = await response.json();
      
      if (result.success && result.data.filters) {
        const units = result.data.filters.units || [];
        setUnitOptions(units);
      } else {
        setUnitOptions([]);
      }
    } catch (e) {
      console.error('Failed to fetch units:', e);
      setUnitOptions([]);
    }
  };
  fetchUnits();
}, []);
```

### 3. อัพเดท useEffect ที่โหลดข้อมูล transaction
ในส่วนที่ตั้งค่า state หลังโหลดข้อมูล เพิ่ม:
```typescript
// ดึง unit จาก toUnit ของ node แรก หรือจาก groupName
const firstNode = chainDetails[0];
if (firstNode?.toUnit) {
  setUnitName(firstNode.toUnit);
}
// หรือ parse จาก groupName: "ย้ายหน่วยงาน → ชื่อหน่วย"
const match = t.groupName?.match(/→\s*(.+)$/);
if (match) {
  setUnitName(match[1]);
}
```

### 4. แก้ไข UI Header (คัดลอกจาก create/page.tsx บรรทัด 513-600)
แทนที่ส่วน Header ทั้งหมดด้วย:
- Title และ Back Button แยกออกจากกัน
- Form หน่วยงานปลายทางเต็มความกว้าง
- Autocomplete สำหรับเลือก unit
- TextField สำหรับรายละเอียดเพิ่มเติม

### 5. ส่ง destinationUnit ไปยัง PromotionTable
```typescript
<PromotionTable
  startingPersonnel={startingPersonnel}
  nodes={nodes}
  onAddNode={handleAddNode}
  onRemoveNode={handleRemoveNode}
  onInsertNode={handleInsertNode}
  onReorder={handleReorder}
  onAddPlaceholder={handleAddPlaceholder}
  onInsertPlaceholder={handleInsertPlaceholder}
  destinationUnit={unitName}  // เพิ่มบรรทัดนี้
/>
```

### 6. อัพเดท handleSave (คัดลอกจาก create/page.tsx)
```typescript
const handleSave = async () => {
  setSaving(true);
  try {
    if (!unitName || unitName.trim() === '') {
      toast.error('กรุณาระบุหน่วยงานปลายทาง');
      return;
    }

    if (nodes.length === 0) {
      toast.error('กรุณาเพิ่มบุคลากรอย่างน้อย 1 คน');
      return;
    }

    const validNodes = nodes.filter(n => !n.isPlaceholder);
    if (validNodes.length === 0) {
      toast.error('กรุณาเลือกบุคลากรอย่างน้อย 1 คน (ไม่นับตำแหน่งว่าง)');
      return;
    }

    const year = new Date().getFullYear() + 543;
    
    const swapDetails = validNodes.map((node) => ({
      sequence: node.nodeOrder,
      personnelId: node.personnelId,
      noId: node.noId,
      nationalId: node.nationalId,
      fullName: node.fullName,
      rank: node.rank,
      seniority: node.seniority,
      posCodeId: node.fromPosCodeId,
      toPosCodeId: node.toPosCodeId || null,
      birthDate: node.birthDate,
      age: node.age,
      education: node.education,
      lastAppointment: node.lastAppointment,
      currentRankSince: node.currentRankSince,
      enrollmentDate: node.enrollmentDate,
      retirementDate: node.retirementDate,
      yearsOfService: node.yearsOfService,
      trainingLocation: node.trainingLocation,
      trainingCourse: node.trainingCourse,
      supportName: node.supporterName,
      supportReason: node.supportReason,
      fromPosition: node.fromPosition,
      fromPositionNumber: node.fromPositionNumber,
      fromUnit: node.fromUnit,
      fromActingAs: node.fromActingAs,
      toPosition: node.toPosition,
      toPositionNumber: node.toPositionNumber,
      toUnit: node.toUnit,
      toActingAs: node.toActingAs,
      notes: node.notes || null,
    }));

    const payload = {
      year,
      swapDate: new Date().toISOString(),
      swapType: 'transfer',
      groupName: `ย้ายหน่วยงาน → ${unitName}`,
      groupNumber: transaction?.groupNumber || null,
      status: 'completed',
      notes: groupNotes.trim() || null,
      swapDetails,
    };

    const response = await fetch(`/api/swap-transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'บันทึกข้อมูลไม่สำเร็จ');
    }

    toast.success('บันทึกการแก้ไขสำเร็จ');
    router.push('/police-personnel/promotion');
  } catch (error: any) {
    console.error('Error saving:', error);
    toast.error(error?.message || 'เกิดข้อผิดพลาดในการบันทึก');
  } finally {
    setSaving(false);
  }
};
```

### 7. เพิ่ม import Autocomplete
```typescript
import { Autocomplete } from '@mui/material';
```

### 8. ลบ startingPersonnel (ถ้าไม่ใช้)
- ลบ state `startingPersonnel`
- ลบการตั้งค่า `startingPersonnel` ใน useEffect
- ส่ง `null` แทน `startingPersonnel` ไปยัง PromotionTable

## สรุป
หน้า edit จะมี UI และ logic เหมือนหน้า create ทุกประการ แต่โหลดข้อมูลจาก transaction ที่มีอยู่แล้ว
