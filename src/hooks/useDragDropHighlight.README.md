# useDragDropHighlight Hook - คู่มือการใช้งาน

Custom React Hook สำหรับจัดการ Drag and Drop พร้อม Highlight Effect ที่สวยงาม

## ✨ Features

- 🎯 **Drag and Drop** - ลากและวางแถวได้อย่างง่ายดาย
- 💚 **Highlight Effect** - แสดงสีเขียวพร้อมเอฟเฟกต์เรืองแสงเมื่อ drop สำเร็จ
- ⚡ **Auto Remove** - Highlight จะหายไปอัตโนมัติหลังเวลาที่กำหนด
- 🎨 **Customizable** - ปรับแต่งได้ทั้งสีและระยะเวลา
- ♻️ **Reusable** - ใช้ซ้ำได้ในทุกหน้า (List, Create, Edit)

## 📦 Installation

Hook นี้อยู่ที่: `src/hooks/useDragDropHighlight.ts`

## 🚀 การใช้งานพื้นฐาน

### 1. Import Hook

\`\`\`typescript
import { useDragDropHighlight } from '@/hooks/useDragDropHighlight';
import { useTheme } from '@mui/material';
\`\`\`

### 2. เรียกใช้ใน Component

\`\`\`typescript
export default function MyPage() {
  const theme = useTheme();
  
  // เรียกใช้ hook (highlight จะหายใน 2 วินาที)
  const dragDropHighlight = useDragDropHighlight(2000);
  
  // สร้าง handler สำหรับ reorder
  const createReorderHandler = useCallback((transactionId: string) => {
    return (sourceIndex: number, targetIndex: number, detailId: string) => {
      // จัดการเรียงลำดับใหม่ที่นี่
      setData(prevData => {
        // ... logic การเรียงลำดับ
      });
      
      toast.info('ลำดับถูกเปลี่ยนแล้ว');
    };
  }, []);
  
  return (
    // ... JSX
  );
}
\`\`\`

### 3. ใช้กับ TableRow

\`\`\`typescript
<TableRow 
  key={item.id}
  draggable
  onDragStart={(e) => dragDropHighlight.handleDragStart(e, groupId, item.id, index)}
  onDragOver={(e) => dragDropHighlight.handleDragOver(e, groupId, index)}
  onDragLeave={dragDropHighlight.handleDragLeave}
  onDrop={(e) => dragDropHighlight.handleDrop(e, groupId, index, createReorderHandler(groupId))}
  onDragEnd={dragDropHighlight.handleDragEnd}
  sx={dragDropHighlight.getDragDropStyles(item.id, groupId, index, theme)}
>
  <TableCell>
    <DragIndicatorIcon />
  </TableCell>
  {/* ... เนื้อหาอื่นๆ */}
</TableRow>
\`\`\`

## 📋 ตัวอย่างการใช้งานแบบเต็ม

### Example 1: หน้า List (Promotion Chain)

\`\`\`typescript
'use client';
import React, { useState, useCallback } from 'react';
import { useTheme, TableRow, TableCell } from '@mui/material';
import { DragIndicator as DragIndicatorIcon } from '@mui/icons-material';
import { useDragDropHighlight } from '@/hooks/useDragDropHighlight';
import { useToast } from '@/hooks/useToast';

export default function PromotionChainPage() {
  const theme = useTheme();
  const toast = useToast();
  const [chains, setChains] = useState<TransactionChain[]>([]);
  
  // เรียกใช้ drag drop hook
  const dragDropHighlight = useDragDropHighlight(2000);
  
  // สร้าง reorder handler
  const createReorderHandler = useCallback((transactionId: string) => {
    return (sourceIndex: number, targetIndex: number, detailId: string) => {
      setChains(prevChains => {
        const newChains = prevChains.map(chain => {
          if (chain.id !== transactionId) return chain;

          const newDetails = [...chain.swapDetails];
          const [removed] = newDetails.splice(sourceIndex, 1);
          newDetails.splice(targetIndex, 0, removed);

          return { ...chain, swapDetails: newDetails };
        });
        return newChains;
      });
      
      toast.info('ลำดับถูกเปลี่ยนแล้ว');
    };
  }, [toast]);

  return (
    <Table>
      <TableBody>
        {chains.map((chain) => (
          chain.swapDetails.map((detail, index) => (
            <TableRow
              key={detail.id}
              draggable
              onDragStart={(e) => dragDropHighlight.handleDragStart(e, chain.id, detail.id, index)}
              onDragOver={(e) => dragDropHighlight.handleDragOver(e, chain.id, index)}
              onDragLeave={dragDropHighlight.handleDragLeave}
              onDrop={(e) => dragDropHighlight.handleDrop(e, chain.id, index, createReorderHandler(chain.id))}
              onDragEnd={dragDropHighlight.handleDragEnd}
              sx={dragDropHighlight.getDragDropStyles(detail.id, chain.id, index, theme)}
            >
              <TableCell><DragIndicatorIcon /></TableCell>
              <TableCell>{detail.fullName}</TableCell>
            </TableRow>
          ))
        ))}
      </TableBody>
    </Table>
  );
}
\`\`\`

### Example 2: หน้า Create/Edit

\`\`\`typescript
'use client';
import React, { useState, useCallback } from 'react';
import { useTheme, TableRow, TableCell, Button } from '@mui/material';
import { useDragDropHighlight } from '@/hooks/useDragDropHighlight';

export default function CreatePromotionChainPage() {
  const theme = useTheme();
  const [details, setDetails] = useState<SwapDetail[]>([]);
  
  // ใช้ highlight เวลา 3 วินาที
  const dragDropHighlight = useDragDropHighlight(3000);
  
  const handleReorder = useCallback((sourceIndex: number, targetIndex: number) => {
    setDetails(prev => {
      const newDetails = [...prev];
      const [removed] = newDetails.splice(sourceIndex, 1);
      newDetails.splice(targetIndex, 0, removed);
      
      // อัพเดต sequence
      return newDetails.map((d, i) => ({ ...d, sequence: i + 1 }));
    });
  }, []);

  const reorderHandler = useCallback(() => handleReorder, [handleReorder]);

  const handleSave = async () => {
    // บันทึกข้อมูล
    await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({ details }),
    });
  };

  return (
    <>
      <Table>
        <TableBody>
          {details.map((detail, index) => (
            <TableRow
              key={detail.id}
              draggable
              onDragStart={(e) => dragDropHighlight.handleDragStart(e, 'new-chain', detail.id, index)}
              onDragOver={(e) => dragDropHighlight.handleDragOver(e, 'new-chain', index)}
              onDragLeave={dragDropHighlight.handleDragLeave}
              onDrop={(e) => dragDropHighlight.handleDrop(e, 'new-chain', index, reorderHandler())}
              onDragEnd={dragDropHighlight.handleDragEnd}
              sx={dragDropHighlight.getDragDropStyles(detail.id, 'new-chain', index, theme)}
            >
              <TableCell><DragIndicatorIcon /></TableCell>
              <TableCell>{detail.fullName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Button onClick={handleSave}>บันทึก</Button>
    </>
  );
}
\`\`\`

## 🎨 Styling Customization

Hook จะคืนค่า styles object ที่มี:

- **Background Color**: สีเขียวอ่อนเมื่อ drop สำเร็จ
- **Border**: เส้นขอบสีเขียว 2px solid
- **Box Shadow**: เอฟเฟกต์เรืองแสงรอบๆ
- **Animation**: Pulse animation แบบนุ่มนวล
- **Transition**: การเปลี่ยนแปลงแบบ smooth

หากต้องการปรับแต่งเพิ่มเติม สามารถ override styles ได้:

\`\`\`typescript
<TableRow
  sx={{
    ...dragDropHighlight.getDragDropStyles(detail.id, chain.id, index, theme),
    // Override styles
    backgroundColor: 'custom color',
  }}
>
\`\`\`

## 📖 API Reference

### useDragDropHighlight(highlightDuration?)

**Parameters:**
- \`highlightDuration\` (optional): ระยะเวลาแสดง highlight (milliseconds) - default: 2000ms

**Returns:**
- \`draggedRow\`: ข้อมูล row ที่กำลังถูก drag
- \`dragOverIndex\`: ตำแหน่งที่ hover อยู่
- \`droppedRows\`: Set ของ detail IDs ที่เพิ่ง drop
- \`handleDragStart\`: Handler สำหรับเริ่ม drag
- \`handleDragOver\`: Handler สำหรับ hover
- \`handleDragLeave\`: Handler สำหรับออกจากพื้นที่ drop
- \`handleDragEnd\`: Handler สำหรับสิ้นสุด drag
- \`handleDrop\`: Handler สำหรับ drop
- \`getDragDropStyles\`: Function คืนค่า styles object

## 🎯 Best Practices

1. **ใช้ useCallback** สำหรับ reorder handler เพื่อป้องกัน re-render
2. **กำหนด unique key** ให้กับแต่ละ row
3. **ใช้ theme** จาก MUI เพื่อความสอดคล้องของสี
4. **แสดง toast notification** เพื่อแจ้งผู้ใช้เมื่อมีการเปลี่ยนแปลง

## 🐛 Troubleshooting

### Highlight ไม่แสดง
- ตรวจสอบว่าส่ง \`theme\` object ให้ \`getDragDropStyles\`
- ตรวจสอบว่า \`detailId\` ไม่ซ้ำกัน

### Drag ไม่ทำงาน
- ตรวจสอบ \`draggable={true}\` บน TableRow
- ตรวจสอบว่าเชื่อม handlers ครบทุกตัว

### Performance ช้า
- ลดจำนวน rows ต่อหน้า
- ใช้ \`React.memo\` กับ TableRow component

## 📝 License

MIT
