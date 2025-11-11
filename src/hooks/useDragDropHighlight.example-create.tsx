/**
 * ตัวอย่างการใช้ useDragDropHighlight ในหน้า Create
 * 
 * วิธีใช้:
 * 1. Copy code นี้ไปใช้ในหน้า create ของคุณ
 * 2. ปรับแต่ง interface และ logic ตามความต้องการ
 * 3. เชื่อมต่อกับ API endpoint ของคุณ
 */

'use client';
import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  DragIndicator as DragIndicatorIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useDragDropHighlight } from '@/hooks/useDragDropHighlight';
import { useToast } from '@/hooks/useToast';

interface SwapDetail {
  id: string;
  sequence: number;
  fullName: string;
  rank: string;
  position: string;
  unit: string;
}

export default function CreatePromotionChainExample() {
  const theme = useTheme();
  const toast = useToast();
  
  // State สำหรับเก็บรายการบุคลากร
  const [details, setDetails] = useState<SwapDetail[]>([
    { id: '1', sequence: 1, fullName: 'จ.ส.อ. สมชาย ใจดี', rank: 'จ.ส.อ.', position: 'สว.1', unit: 'สภ.ดอนเมือง' },
    { id: '2', sequence: 2, fullName: 'ด.ต. สมศักดิ์ รักดี', rank: 'ด.ต.', position: 'สว.2', unit: 'สภ.หลักสี่' },
    { id: '3', sequence: 3, fullName: 'ร.ต.ท. สมหมาย มั่นคง', rank: 'ร.ต.ท.', position: 'รอง สว.', unit: 'สภ.บางเขน' },
  ]);

  // ใช้ drag drop highlight hook (3 วินาที)
  const dragDropHighlight = useDragDropHighlight(3000);
  
  // Handler สำหรับจัดเรียงลำดับใหม่
  const handleReorder = useCallback((sourceIndex: number, targetIndex: number, detailId: string) => {
    setDetails(prev => {
      const newDetails = [...prev];
      const [removed] = newDetails.splice(sourceIndex, 1);
      newDetails.splice(targetIndex, 0, removed);
      
      // อัพเดต sequence ใหม่
      return newDetails.map((detail, index) => ({
        ...detail,
        sequence: index + 1,
      }));
    });
    
    toast.success('เปลี่ยนลำดับสำเร็จ');
  }, [toast]);

  // สร้าง reorder handler (ใช้ 'temp-chain' เป็น transactionId สำหรับหน้า create)
  const reorderHandler = useCallback(() => handleReorder, [handleReorder]);

  // ลบรายการ
  const handleDelete = useCallback((id: string) => {
    setDetails(prev => prev.filter(d => d.id !== id).map((d, i) => ({ ...d, sequence: i + 1 })));
    toast.info('ลบรายการแล้ว');
  }, [toast]);

  // เพิ่มรายการใหม่ (ตัวอย่าง - ควรเปิด modal เพื่อเลือกบุคลากร)
  const handleAdd = useCallback(() => {
    const newId = String(Date.now());
    const newDetail: SwapDetail = {
      id: newId,
      sequence: details.length + 1,
      fullName: 'ตัวอย่าง บุคลากรใหม่',
      rank: 'ด.ต.',
      position: 'สว.3',
      unit: 'สภ.ตัวอย่าง',
    };
    setDetails(prev => [...prev, newDetail]);
    toast.success('เพิ่มรายการแล้ว');
  }, [details.length, toast]);

  // บันทึกข้อมูล
  const handleSave = async () => {
    try {
      // TODO: เชื่อมต่อกับ API
      const response = await fetch('/api/swap-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: new Date().getFullYear() + 543,
          swapType: 'promotion-chain',
          swapDetails: details,
        }),
      });

      if (!response.ok) throw new Error('บันทึกไม่สำเร็จ');

      toast.success('บันทึกลูกโซ่ตำแหน่งสำเร็จ');
      // redirect หรือ clear form
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            สร้างลูกโซ่ตำแหน่งใหม่
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            เพิ่มบุคลากร
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', width: 50 }} />
                <TableCell sx={{ color: 'white' }}>ลำดับ</TableCell>
                <TableCell sx={{ color: 'white' }}>ยศ/ชื่อ-สกุล</TableCell>
                <TableCell sx={{ color: 'white' }}>ตำแหน่ง</TableCell>
                <TableCell sx={{ color: 'white' }}>หน่วย</TableCell>
                <TableCell sx={{ color: 'white', width: 80 }} align="center">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {details.map((detail, index) => (
                <TableRow
                  key={detail.id}
                  draggable
                  onDragStart={(e) => dragDropHighlight.handleDragStart(e, 'temp-chain', detail.id, index)}
                  onDragOver={(e) => dragDropHighlight.handleDragOver(e, 'temp-chain', index)}
                  onDragLeave={dragDropHighlight.handleDragLeave}
                  onDrop={(e) => dragDropHighlight.handleDrop(e, 'temp-chain', index, reorderHandler())}
                  onDragEnd={dragDropHighlight.handleDragEnd}
                  sx={dragDropHighlight.getDragDropStyles(detail.id, 'temp-chain', index, theme)}
                >
                  <TableCell>
                    <DragIndicatorIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
                  </TableCell>
                  <TableCell><strong>{detail.sequence}</strong></TableCell>
                  <TableCell>
                    <strong>{detail.rank} {detail.fullName}</strong>
                  </TableCell>
                  <TableCell>{detail.position}</TableCell>
                  <TableCell>{detail.unit}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(detail.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => window.history.back()}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={details.length === 0}
          >
            บันทึก
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
