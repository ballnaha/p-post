'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, Paper, Typography, Button, Chip, CircularProgress, TextField, alpha, useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Check as CheckIcon, Warning as WarningIcon } from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';
import PromotionChainTable from './components/PromotionChainTable';

// Types - ตรงกับ PolicePersonnel schema
interface ChainNode {
  id: string;
  nodeOrder: number;
  isPlaceholder?: boolean; // true = ตำแหน่งว่าง (ยังไม่ได้เลือกบุคลากร)
  personnelId?: string; // อ้างอิง police_personnel.id
  noId?: number; // police_personnel.noId (ลำดับที่)
  
  // ข้อมูลบุคคล (Person Information)
  nationalId?: string; // police_personnel.nationalId (optional สำหรับ placeholder)
  fullName: string; // police_personnel.fullName
  rank?: string; // police_personnel.rank (optional สำหรับ placeholder)
  seniority?: string; // police_personnel.seniority
  
  // ข้อมูลส่วนตัว (Personal Information)
  birthDate?: string; // police_personnel.birthDate
  age?: string; // police_personnel.age
  education?: string; // police_personnel.education
  
  // ข้อมูลการแต่งตั้ง/ดำรงตำแหน่ง (Appointment Information)
  lastAppointment?: string; // police_personnel.lastAppointment
  currentRankSince?: string; // police_personnel.currentRankSince
  enrollmentDate?: string; // police_personnel.enrollmentDate
  retirementDate?: string; // police_personnel.retirementDate
  yearsOfService?: string; // police_personnel.yearsOfService
  
  // ข้อมูลการฝึกอบรม (Training Information)
  trainingLocation?: string; // police_personnel.trainingLocation
  trainingCourse?: string; // police_personnel.trainingCourse
  
  // ข้อมูลการเสนอชื่อ (Support Information)
  supporterName?: string; // police_personnel.supporterName
  supportReason?: string; // police_personnel.supportReason
  
  // หมายเหตุ (Notes)
  notes?: string; // หมายเหตุเฉพาะของบุคลากรคนนี้
  
  // ข้อมูลตำแหน่งเดิม (From Position)
  fromPosCodeId: number; // police_personnel.posCodeId
  fromPosCodeName?: string; // posCodeMaster.name
  fromPosition: string; // police_personnel.position
  fromPositionNumber?: string; // police_personnel.positionNumber
  fromUnit: string; // police_personnel.unit
  fromActingAs?: string; // police_personnel.actingAs
  
  // ข้อมูลตำแหน่งใหม่ (To Position)
  toPosCodeId: number;
  toPosCodeName?: string;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  toActingAs?: string;
  
  // Metadata
  fromRankLevel: number;
  toRankLevel: number;
  isPromotionValid: boolean;
}

interface VacantPosition {
  id: string;
  posCodeId: number; // police_personnel.posCodeId
  posCodeName?: string; // posCodeMaster.name
  position: string; // police_personnel.position
  unit: string; // police_personnel.unit
  requestedPositionId?: number;
  requestedPosition?: string;
  positionNumber?: string; // police_personnel.positionNumber
  actingAs?: string; // police_personnel.actingAs - ทำหน้าที่
}

function CreatePromotionChainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const vacantId = searchParams.get('vacantId');
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [groupNumber, setGroupNumber] = useState<string>('');
  const [groupNotes, setGroupNotes] = useState<string>(''); // หมายเหตุของกลุ่ม
  const [vacantPosition, setVacantPosition] = useState<VacantPosition | null>(null);
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (vacantId) {
      loadVacantPosition(vacantId);
    } else {
      // ถ้าไม่มี vacantId ให้ redirect กลับไปหน้าหลัก
      toast.error('กรุณาเลือกตำแหน่งว่างก่อนสร้างรายการ');
      router.push('/police-personnel/promotion-chain');
    }
  }, [vacantId]);

  // Generate next group number like 2568/PC-001 based on existing promotion-chain records
  useEffect(() => {
    const fetchNextGroupNumber = async () => {
      try {
        const currentYear = new Date().getFullYear() + 543;
        const response = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=promotion-chain`);
        if (!response.ok) throw new Error('Failed to fetch promotion-chain transactions');
        const result = await response.json();
        const transactions: any[] = Array.isArray(result?.data) ? result.data : [];
        let maxNumber = 0;
        for (const t of transactions) {
          if (t.groupNumber) {
            const match = String(t.groupNumber).match(/\/PC-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          }
        }
        const next = String(maxNumber + 1).padStart(3, '0');
        setGroupNumber(`${currentYear}/PC-${next}`);
      } catch (e) {
        const currentYear = new Date().getFullYear() + 543;
        setGroupNumber(`${currentYear}/PC-001`);
      }
    };
    fetchNextGroupNumber();
  }, []);

  const loadVacantPosition = async (id: string) => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/vacant-position/actual?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vacant positions');
      }

      const result = await response.json();
      const allPositions = result.data || [];
      
      console.log('Looking for vacant position:', { id, totalPositions: allPositions.length });
      
      // Find the specific vacant position by ID
      const data = allPositions.find((pos: any) => pos.id === id);
      
      if (!data) {
        console.error('Vacant position not found. Available IDs:', allPositions.map((p: any) => p.id).slice(0, 5));
        toast.error('ไม่พบข้อมูลตำแหน่งว่างที่เลือก กรุณาเลือกใหม่');
        // Redirect back to main page
        setTimeout(() => {
          router.push('/police-personnel/promotion-chain');
        }, 2000);
        return;
      }
      
      // Debug: ตรวจสอบข้อมูล posCodeMaster
      console.log('Raw data from API:', {
        id: data.id,
        posCodeId: data.posCodeId,
        posCodeName: data.posCodeName, // API ส่ง posCodeName มาโดยตรง
        position: data.position,
      });
      
      // Map API response to VacantPosition format
      const vacantPos: VacantPosition = {
        id: data.id,
        posCodeId: data.posCodeId,
        posCodeName: data.posCodeName, // API ส่ง posCodeName มาโดยตรง (แทน posCodeMaster?.name)
        position: data.position || '-', // ชื่อตำแหน่งจาก police_personnel
        unit: data.unit || '-',
        requestedPositionId: data.requestedPositionId,
        requestedPosition: data.requestedPosition,
        positionNumber: data.positionNumber,
        actingAs: data.actingAs,
      };
      
      console.log('Mapped vacant position:', vacantPos);
      setVacantPosition(vacantPos);
    } catch (error) {
      console.error('Error loading vacant position:', error);
      toast.error('ไม่สามารถโหลดข้อมูลตำแหน่งว่างได้');
      // Redirect back to main page on error
      setTimeout(() => {
        router.push('/police-personnel/promotion-chain');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNode = (node: ChainNode) => {
    setNodes([...nodes, node]);
    setActiveStep(nodes.length);
  };

  const handleAddPlaceholder = () => {
    // สร้าง placeholder node
    const placeholderNode: ChainNode = {
      id: `placeholder-${Date.now()}`,
      nodeOrder: nodes.length + 1,
      isPlaceholder: true,
      fullName: '[รอการเลือกบุคลากร]',
      
      // ตำแหน่ง from ว่าง (เพราะยังไม่มีบุคคล)
      fromPosCodeId: 0,
      fromPosCodeName: undefined,
      fromPosition: '',
      fromPositionNumber: undefined,
      fromUnit: '',
      fromActingAs: undefined,
      
      // ตำแหน่ง to ตามโหนดก่อนหน้า (หรือ vacant position ถ้าเป็นโหนดแรก)
      toPosCodeId: nodes.length === 0 ? vacantPosition?.posCodeId || 0 : nodes[nodes.length - 1].fromPosCodeId,
      toPosCodeName: nodes.length === 0 ? vacantPosition?.posCodeName : nodes[nodes.length - 1].fromPosCodeName,
      toPosition: nodes.length === 0 ? vacantPosition?.position || '' : nodes[nodes.length - 1].fromPosition,
      toPositionNumber: nodes.length === 0 ? vacantPosition?.positionNumber : nodes[nodes.length - 1].fromPositionNumber,
      toUnit: nodes.length === 0 ? vacantPosition?.unit || '' : nodes[nodes.length - 1].fromUnit,
      toActingAs: nodes.length === 0 ? vacantPosition?.actingAs : nodes[nodes.length - 1].fromActingAs,
      
      // Rank levels
      fromRankLevel: 0,
      toRankLevel: nodes.length === 0 ? (vacantPosition?.posCodeId || 0) : nodes[nodes.length - 1].fromRankLevel,
      isPromotionValid: false, // placeholder ยังไม่ valid
    };

    setNodes([...nodes, placeholderNode]);
    toast.info('เพิ่มตำแหน่งว่างแล้ว กรุณาเลือกบุคลากรภายหลัง');
  };

  const handleInsertPlaceholder = (beforeNodeId: string) => {
    const insertIndex = nodes.findIndex(n => n.id === beforeNodeId);
    if (insertIndex === -1) {
      toast.error('ไม่พบตำแหน่งที่ต้องการแทรก');
      return;
    }

    const targetNode = nodes[insertIndex];

    // สร้าง placeholder node
    const placeholderNode: ChainNode = {
      id: `placeholder-${Date.now()}`,
      nodeOrder: targetNode.nodeOrder,
      isPlaceholder: true,
      fullName: '[รอการเลือกบุคลากร]',
      
      // ตำแหน่ง from ว่าง
      fromPosCodeId: 0,
      fromPosCodeName: undefined,
      fromPosition: '',
      fromPositionNumber: undefined,
      fromUnit: '',
      fromActingAs: undefined,
      
      // ตำแหน่ง to ตามโหนดที่จะแทรกก่อน
      toPosCodeId: targetNode.toPosCodeId,
      toPosCodeName: targetNode.toPosCodeName,
      toPosition: targetNode.toPosition,
      toPositionNumber: targetNode.toPositionNumber,
      toUnit: targetNode.toUnit,
      toActingAs: targetNode.toActingAs,
      
      // Rank levels
      fromRankLevel: 0,
      toRankLevel: targetNode.toRankLevel,
      isPromotionValid: false,
    };

    // แทรก placeholder
    const newNodes = [...nodes];
    newNodes.splice(insertIndex, 0, placeholderNode);

    // อัปเดต nodeOrder และ toPosition
    const reorderedNodes = newNodes.map((node, index) => {
      if (index === 0) {
        return {
          ...node,
          nodeOrder: 1,
          toPosCodeId: vacantPosition?.posCodeId || node.toPosCodeId,
          toPosCodeName: vacantPosition?.posCodeName || node.toPosCodeName,
          toPosition: vacantPosition?.position || node.toPosition,
          toPositionNumber: vacantPosition?.positionNumber || node.toPositionNumber,
          toUnit: vacantPosition?.unit || node.toUnit,
          toActingAs: vacantPosition?.actingAs || node.toActingAs,
        };
      } else {
        const prevNode = newNodes[index - 1];
        
        // ถ้า prevNode เป็น placeholder → node นี้ควรมีตำแหน่งว่าง เพราะ placeholder ยังไม่มีบุคคลมารับตำแหน่ง
        if (prevNode.isPlaceholder) {
          return {
            ...node,
            nodeOrder: index + 1,
            // ให้ตำแหน่งเป็นค่าว่าง
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPosition: '',
            toPositionNumber: undefined,
            toUnit: '',
            toActingAs: undefined,
            toRankLevel: 0,
          };
        }
        
        return {
          ...node,
          nodeOrder: index + 1,
          toPosCodeId: prevNode.fromPosCodeId,
          toPosCodeName: prevNode.fromPosCodeName,
          toPosition: prevNode.fromPosition,
          toPositionNumber: prevNode.fromPositionNumber,
          toUnit: prevNode.fromUnit,
          toActingAs: prevNode.fromActingAs,
          toRankLevel: prevNode.fromRankLevel,
        };
      }
    });

    setNodes(reorderedNodes);
    toast.info(`แทรกตำแหน่งว่างก่อน ${targetNode.fullName} สำเร็จ`);
  };

  const handleRemoveNode = (nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const removedNode = nodes[nodeIndex];

    // ลบโหนด
    const newNodes = nodes.filter(n => n.id !== nodeId);

    // ถ้าไม่มีโหนดเหลือ ให้ clear ทั้งหมด
    if (newNodes.length === 0) {
      setNodes([]);
      toast.success('ลบตำแหน่งสำเร็จ');
      return;
    }

    // ปรับ nodeOrder และตำแหน่งที่เกี่ยวข้อง
    const reorderedNodes = newNodes.map((node, index) => {
      // กรณีที่ 1: โหนดก่อนหน้าโหนดที่ถูกลบ - ไม่เปลี่ยนแปลง (เว้นแต่ nodeOrder)
      if (index < nodeIndex) {
        return {
          ...node,
          nodeOrder: index + 1,
        };
      }
      
      // กรณีที่ 2: โหนดหลังจากโหนดที่ถูกลบ - ต้องอัปเดตตำแหน่ง to
      if (index === 0) {
        // โหนดแรกใหม่ (หลังจากลบโหนดแรกเดิม) 
        // ต้องอัปเดต toPosition ให้เป็นตำแหน่งว่างต้นทาง (vacantPosition)
        if (nodeIndex === 0 && vacantPosition) {
          // ถ้าลบโหนดแรก node ที่ 2 จะกลายเป็น node แรก และได้รับตำแหน่งว่างต้นทาง
          return {
            ...node,
            nodeOrder: 1,
            toPosCodeId: vacantPosition.posCodeId || removedNode.toPosCodeId,
            toPosCodeName: vacantPosition.posCodeName || removedNode.toPosCodeName,
            toPosition: vacantPosition.position || removedNode.toPosition,
            toPositionNumber: vacantPosition.positionNumber || removedNode.toPositionNumber,
            toUnit: vacantPosition.unit || removedNode.toUnit,
            toActingAs: vacantPosition.actingAs || removedNode.toActingAs,
            toRankLevel: removedNode.toRankLevel,
          };
        }
        return {
          ...node,
          nodeOrder: 1,
        };
      } else {
        // โหนดที่เหลือ - อัปเดต toPosition ให้เชื่อมกับ fromPosition ของโหนดก่อนหน้า
        const prevNode = newNodes[index - 1];
        return {
          ...node,
          nodeOrder: index + 1,
          toPosCodeId: prevNode.fromPosCodeId,
          toPosCodeName: prevNode.fromPosCodeName,
          toPosition: prevNode.fromPosition,
          toPositionNumber: prevNode.fromPositionNumber,
          toUnit: prevNode.fromUnit,
          toActingAs: prevNode.fromActingAs,
          toRankLevel: prevNode.fromRankLevel,
        };
      }
    });

    setNodes(reorderedNodes);
    
    // แสดงข้อความที่มีรายละเอียดมากขึ้น
    if (nodeIndex < nodes.length - 1) {
      const nextNode = nodes[nodeIndex + 1];
      toast.success(
        `ลบตำแหน่งสำเร็จ - ${nextNode.fullName} จะได้รับตำแหน่งใหม่: ${removedNode.toPosition}`
      );
    } else {
      toast.success('ลบตำแหน่งสำเร็จ');
    }
  };

  const handleInsertNode = (newNode: ChainNode, beforeNodeId: string) => {
    const insertIndex = nodes.findIndex(n => n.id === beforeNodeId);
    if (insertIndex === -1) {
      toast.error('ไม่พบตำแหน่งที่ต้องการแทรก');
      return;
    }

    const targetNode = nodes[insertIndex];

    // ถ้า targetNode เป็น placeholder ให้แทนที่แทนการแทรก
    if (targetNode.isPlaceholder) {
      const newNodes = [...nodes];
      // แทนที่ placeholder ด้วยบุคลากรจริง
      newNodes[insertIndex] = {
        ...newNode,
        nodeOrder: targetNode.nodeOrder,
        isPlaceholder: false,
        // รักษาตำแหน่ง to ของ placeholder เดิม
        toPosCodeId: targetNode.toPosCodeId,
        toPosCodeName: targetNode.toPosCodeName,
        toPosition: targetNode.toPosition,
        toPositionNumber: targetNode.toPositionNumber,
        toUnit: targetNode.toUnit,
        toActingAs: targetNode.toActingAs,
        toRankLevel: targetNode.toRankLevel,
      };

      // อัปเดต toPosition ของโหนดถัดไป (ถ้ามี)
      const reorderedNodes = newNodes.map((node, index) => {
        if (index === 0) {
          return {
            ...node,
            nodeOrder: 1,
            toPosCodeId: vacantPosition?.posCodeId || node.toPosCodeId,
            toPosCodeName: vacantPosition?.posCodeName || node.toPosCodeName,
            toPosition: vacantPosition?.position || node.toPosition,
            toPositionNumber: vacantPosition?.positionNumber || node.toPositionNumber,
            toUnit: vacantPosition?.unit || node.toUnit,
            toActingAs: vacantPosition?.actingAs || node.toActingAs,
          };
        } else {
          const prevNode = newNodes[index - 1];
          return {
            ...node,
            nodeOrder: index + 1,
            toPosCodeId: prevNode.fromPosCodeId,
            toPosCodeName: prevNode.fromPosCodeName,
            toPosition: prevNode.fromPosition,
            toPositionNumber: prevNode.fromPositionNumber,
            toUnit: prevNode.fromUnit,
            toActingAs: prevNode.fromActingAs,
            toRankLevel: prevNode.fromRankLevel,
          };
        }
      });

      setNodes(reorderedNodes);
      toast.success(`เลือก ${newNode.fullName} สำเร็จ`);
      return;
    }

    // แทรกโหนดใหม่และ reorder (กรณีปกติ)
    const newNodes = [...nodes];
    newNodes.splice(insertIndex, 0, newNode);

    // อัปเดต nodeOrder และ toPosition
    const reorderedNodes = newNodes.map((node, index) => {
      if (index === 0) {
        // โหนดแรกต้องอ้างอิงไปที่ vacantPosition
        return {
          ...node,
          nodeOrder: 1,
          toPosCodeId: vacantPosition?.posCodeId || node.toPosCodeId,
          toPosCodeName: vacantPosition?.posCodeName || node.toPosCodeName,
          toPosition: vacantPosition?.position || node.toPosition,
          toPositionNumber: vacantPosition?.positionNumber || node.toPositionNumber,
          toUnit: vacantPosition?.unit || node.toUnit,
          toActingAs: vacantPosition?.actingAs || node.toActingAs,
        };
      } else {
        // โหนดอื่นๆ อ้างอิงไปที่ fromPosition ของโหนดก่อนหน้า
        const prevNode = newNodes[index - 1];
        return {
          ...node,
          nodeOrder: index + 1,
          toPosCodeId: prevNode.fromPosCodeId,
          toPosCodeName: prevNode.fromPosCodeName,
          toPosition: prevNode.fromPosition,
          toPositionNumber: prevNode.fromPositionNumber,
          toUnit: prevNode.fromUnit,
          toActingAs: prevNode.fromActingAs,
          toRankLevel: prevNode.fromRankLevel,
        };
      }
    });

    setNodes(reorderedNodes);
    toast.success(`แทรก ${newNode.fullName} ก่อน ${nodes[insertIndex].fullName} สำเร็จ`);
  };

  const handleReorder = (reorderedNodes: ChainNode[]) => {
    // อัปเดตตำแหน่งหลังจาก drag-drop
    const updatedNodes = reorderedNodes.map((node, index) => {
      if (index === 0) {
        return {
          ...node,
          nodeOrder: 1,
          toPosCodeId: vacantPosition?.posCodeId || node.toPosCodeId,
          toPosCodeName: vacantPosition?.posCodeName || node.toPosCodeName,
          toPosition: vacantPosition?.position || node.toPosition,
          toPositionNumber: vacantPosition?.positionNumber || node.toPositionNumber,
          toUnit: vacantPosition?.unit || node.toUnit,
          toActingAs: vacantPosition?.actingAs || node.toActingAs,
        };
      } else {
        const prevNode = reorderedNodes[index - 1];
        return {
          ...node,
          nodeOrder: index + 1,
          toPosCodeId: prevNode.fromPosCodeId,
          toPosCodeName: prevNode.fromPosCodeName,
          toPosition: prevNode.fromPosition,
          toPositionNumber: prevNode.fromPositionNumber,
          toUnit: prevNode.fromUnit,
          toActingAs: prevNode.fromActingAs,
          toRankLevel: prevNode.fromRankLevel,
        };
      }
    });

    setNodes(updatedNodes);
    toast.success('จัดเรียงใหม่สำเร็จ');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!vacantPosition || nodes.length === 0) {
        toast.error('ข้อมูลไม่ครบถ้วน');
        return;
      }

      // ตรวจสอบว่ามีโหนดที่ไม่ใช่ placeholder อย่างน้อย 1 โหนด
      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        toast.error('ต้องมีบุคลากรอย่างน้อย 1 คน');
        return;
      }

      // แจ้งเตือนถ้ามี placeholder
      const placeholderCount = nodes.filter(n => n.isPlaceholder).length;
      if (placeholderCount > 0) {
        toast.info(`บันทึก ${validNodes.length} คน + ${placeholderCount} ตำแหน่งว่าง (รอจัดคน)`);
      }

      const year = new Date().getFullYear() + 543; // พ.ศ.
      const swapDetails = nodes.map((node) => ({
        sequence: node.nodeOrder,
        isPlaceholder: node.isPlaceholder || false,
        personnelId: node.personnelId,
        noId: node.noId,
        nationalId: node.nationalId,
        fullName: node.fullName,
        rank: node.rank,
        seniority: node.seniority,
        posCodeId: node.fromPosCodeId,
        toPosCodeId: node.toPosCodeId || null,
        // ข้อมูลส่วนตัว
        birthDate: node.birthDate,
        age: node.age,
        education: node.education,
        // ข้อมูลการแต่งตั้ง
        lastAppointment: node.lastAppointment,
        currentRankSince: node.currentRankSince,
        enrollmentDate: node.enrollmentDate,
        retirementDate: node.retirementDate,
        yearsOfService: node.yearsOfService,
        // ข้อมูลการฝึกอบรม
        trainingLocation: node.trainingLocation,
        trainingCourse: node.trainingCourse,
        // ข้อมูลการเสนอชื่อ
        supportName: node.supporterName,
        supportReason: node.supportReason,
        // ตำแหน่ง
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
        swapType: 'promotion-chain',
        groupName: `ตำแหน่งว่าง ${vacantPosition.posCodeName || ''} • ${vacantPosition.position || ''}${vacantPosition.positionNumber ? ` (${vacantPosition.positionNumber})` : ''}`,
        groupNumber: groupNumber || null,
        status: 'completed',
        notes: groupNotes.trim() || null,
        swapDetails,
      };

      const response = await fetch('/api/swap-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      toast.success('บันทึกรายการสำเร็จ');
      router.push('/police-personnel/promotion-chain');
    } catch (error: any) {
      console.error('Error saving chain:', error);
      toast.error(error?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteClick = () => {
    // ตรวจสอบว่าไม่มี placeholder
    const hasPlaceholder = nodes.some(n => n.isPlaceholder);
    if (hasPlaceholder) {
      toast.error('ไม่สามารถสิ้นสุดได้เนื่องจากมีตำแหน่งว่าง กรุณาเลือกบุคลากรให้ครบก่อน');
      return;
    }
    setShowCompleteDialog(true);
  };

  const handleComplete = async () => {
    setShowCompleteDialog(false);
    setCompleting(true);
    try {
      if (!vacantPosition || nodes.length === 0) {
        toast.error('ข้อมูลไม่ครบถ้วน');
        return;
      }

      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        toast.error('ต้องมีบุคลากรอย่างน้อย 1 คน');
        return;
      }

      const year = new Date().getFullYear() + 543; // พ.ศ.
      const swapDetails = nodes.map((node) => ({
        sequence: node.nodeOrder,
        isPlaceholder: node.isPlaceholder || false,
        personnelId: node.personnelId,
        noId: node.noId,
        nationalId: node.nationalId,
        fullName: node.fullName,
        rank: node.rank,
        seniority: node.seniority,
        posCodeId: node.fromPosCodeId,
        toPosCodeId: node.toPosCodeId || null,
        // ข้อมูลส่วนตัว
        birthDate: node.birthDate,
        age: node.age,
        education: node.education,
        // ข้อมูลการแต่งตั้ง
        lastAppointment: node.lastAppointment,
        currentRankSince: node.currentRankSince,
        enrollmentDate: node.enrollmentDate,
        retirementDate: node.retirementDate,
        yearsOfService: node.yearsOfService,
        // ข้อมูลการฝึกอบรม
        trainingLocation: node.trainingLocation,
        trainingCourse: node.trainingCourse,
        // ข้อมูลการเสนอชื่อ
        supportName: node.supporterName,
        supportReason: node.supportReason,
        // ตำแหน่ง
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
        swapType: 'promotion-chain',
        groupName: `ตำแหน่งว่าง ${vacantPosition.posCodeName || ''} • ${vacantPosition.position || ''}${vacantPosition.positionNumber ? ` (${vacantPosition.positionNumber})` : ''}`,
        groupNumber: groupNumber || null,
        status: 'completed',
        isCompleted: true, // สิ้นสุดแล้ว
        notes: groupNotes.trim() || null,
        swapDetails,
      };

      const response = await fetch('/api/swap-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      toast.success('บันทึกและสิ้นสุดรายการสำเร็จ');
      router.push('/police-personnel/promotion-chain');
    } catch (error: any) {
      console.error('Error completing chain:', error);
      toast.error(error?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setCompleting(false);
    }
  };

  const validateChain = () => {
    if (nodes.length === 0) return false;
    
    // อนุญาตให้บันทึกได้แม้มี placeholder
    // แต่ต้องมีโหนดที่ valid อย่างน้อย 1 โหนด
    const validNodes = nodes.filter(n => !n.isPlaceholder);
    if (validNodes.length === 0) return false;
    
    // เช็คว่าโหนดที่ไม่ใช่ placeholder ทั้งหมด valid หรือไม่
    return validNodes.every((node) => node.isPromotionValid);
  };

  const isChainValid = validateChain();
  const hasPlaceholder = nodes.some(n => n.isPlaceholder);

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            gap: 2,
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                จัดคนเข้าตำแหน่งว่าง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                เลือกบุคลากรทีละขั้นเพื่อจัดเข้าตำแหน่งว่างแบบทอดต่อ
              </Typography>

              {/* Vacant Position Info - Compact */}
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">กำลังโหลด...</Typography>
                </Box>
              ) : vacantPosition && (
                <Box sx={{ 
                  p: 1.5,
                  bgcolor: 'primary.50',
                  borderRadius: 1,
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                      🎯 ตำแหน่งว่างต้นทาง
                    </Typography>
                    <Chip label={`${nodes.length} ขั้น`} size="small" color="primary" sx={{ height: 30, fontSize: '0.85rem' }} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {vacantPosition.posCodeName} • {vacantPosition.position} 
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.85rem' }}>
                     • {vacantPosition.unit} • เลขตำแหน่ง {vacantPosition.positionNumber || '-'} • ทำหน้าที่: {vacantPosition.actingAs || '-'}
                  </Typography>
                  {/* Group Number Display (ตามแบบหน้า สลับตำแหน่ง) */}
                  <Box sx={{ mt: 1.25, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label="เลขกลุ่ม" size="small" color="primary" sx={{ height: 22 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{groupNumber || '-'}</Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/police-personnel/promotion-chain')}
              sx={{ flexShrink: 0 }}
            >
              ย้อนกลับ
            </Button>
          </Box>

          {/* หมายเหตุกลุ่ม */}
          {!loading && vacantPosition && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="หมายเหตุ"
                placeholder="ระบุหมายเหตุเพิ่มเติมสำหรับกลุ่มนี้ (ถ้ามี)"
                multiline
                rows={2}
                value={groupNotes}
                onChange={(e) => setGroupNotes(e.target.value)}
                variant="outlined"
                size="small"
              />
            </Box>
          )}
        </Paper>

        {!loading && (
          <>

            {/* Chain Table */}
            <Box sx={{ pb: 12 }}> {/* Add bottom padding to prevent sticky footer overlap */}
              <PromotionChainTable
                vacantPosition={vacantPosition}
                nodes={nodes}
                onAddNode={handleAddNode}
                onRemoveNode={handleRemoveNode}
                onInsertNode={handleInsertNode}
                onReorder={handleReorder}
                onAddPlaceholder={handleAddPlaceholder}
                onInsertPlaceholder={handleInsertPlaceholder}
              />
            </Box>

            {/* Actions - Sticky Footer */}
            <Paper 
              sx={{ 
                p: { xs: 1.5, sm: 2.5 }, 
                position: 'sticky', 
                bottom: 0, 
                zIndex: 10,
                display: 'flex', 
                gap: { xs: 1, sm: 2 },
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ mb: { xs: 1, sm: 0 } }}>
                {nodes.length > 0 ? (
                  <>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                      {isChainValid ? (hasPlaceholder ? '✓ พร้อมบันทึก (มีตำแหน่งว่าง)' : '✓ พร้อมบันทึก') : '⚠ ยังไม่สมบูรณ์'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      {nodes.filter(n => !n.isPlaceholder).length} บุคลากร
                      {hasPlaceholder && ` • ${nodes.filter(n => n.isPlaceholder).length} ตำแหน่งว่าง (จะถูกข้าม)`}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                    เริ่มสร้างโซ่ด้วยการเลือกผู้สมัคร
                  </Typography>
                )}
              </Box>
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 1, sm: 2 },
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                width: { xs: '100%', sm: 'auto' }
              }}>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/police-personnel/promotion-chain')}
                  disabled={saving || completing}
                  fullWidth={isMobile}
                  sx={{ 
                    minHeight: { xs: '44px', sm: 'auto' },
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size={isMobile ? 'medium' : 'large'}
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={!isChainValid || saving || completing || nodes.length === 0}
                  fullWidth={isMobile}
                  sx={{ 
                    minHeight: { xs: '48px', sm: 'auto' },
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    fontWeight: 600
                  }}
                >
                  {saving ? 'กำลังบันทึก...' : hasPlaceholder ? 'บันทึก' : 'บันทึกรายการ'}
                </Button>
                {!hasPlaceholder && nodes.length > 0 && (
                  <Button
                    variant="outlined"
                    color="success"
                    size={isMobile ? 'medium' : 'large'}
                    startIcon={completing ? <CircularProgress size={20} /> : <CheckIcon />}
                    onClick={handleCompleteClick}
                    disabled={!isChainValid || saving || completing || nodes.length === 0}
                    fullWidth={isMobile}
                    sx={{ 
                      minHeight: { xs: '48px', sm: 'auto' },
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      fontWeight: 600
                    }}
                  >
                    {completing ? 'กำลังบันทึก...' : 'บันทึกและสิ้นสุด'}
                  </Button>
                )}
              </Box>
            </Paper>
          </>
        )}

        {/* Complete Confirmation Dialog */}
        <Dialog
          open={showCompleteDialog}
          onClose={() => !completing && setShowCompleteDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'success.50',
            borderBottom: '2px solid',
            borderColor: 'success.main',
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'success.main',
              color: 'white',
            }}>
              <CheckIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.dark' }}>
                ยืนยันการสิ้นสุดรายการ
              </Typography>
              <Typography variant="caption" color="text.secondary">
                กรุณาตรวจสอบข้อมูลก่อนดำเนินการ
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 , mt:1 }}>
                คุณต้องการสิ้นสุดรายการนี้ใช่หรือไม่?
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="ตำแหน่งว่าง" size="small" color="primary" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {vacantPosition?.posCodeName || ''} • {vacantPosition?.position || ''}
                      {vacantPosition?.positionNumber && ` (${vacantPosition.positionNumber})`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="จำนวนบุคลากร" size="small" color="success" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {nodes.filter(n => !n.isPlaceholder).length} คน
                    </Typography>
                  </Box>
                  {groupNumber && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="เลขกลุ่ม" size="small" color="default" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {groupNumber}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>
            <Box sx={{ 
              p: 2, 
              bgcolor: 'info.50', 
              borderRadius: 1,
              borderLeft: '4px solid',
              borderColor: 'info.main',
            }}>
              <Typography variant="body2" sx={{ color: 'info.dark', fontWeight: 500 }}>
                💡 เมื่อสิ้นสุดแล้ว รายการนี้จะถูกบันทึกและทำเครื่องหมายว่าเสร็จสมบูรณ์
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={() => setShowCompleteDialog(false)}
              disabled={completing}
              variant="outlined"
              sx={{ minWidth: 100 }}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completing}
              variant="contained"
              color="success"
              startIcon={completing ? <CircularProgress size={20} /> : <CheckIcon />}
              sx={{ minWidth: 120, fontWeight: 600 }}
            >
              {completing ? 'กำลังบันทึก...' : 'ยืนยันสิ้นสุด'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

export default function CreatePromotionChainPage() {
  return (
    <Suspense fallback={
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      </Layout>
    }>
      <CreatePromotionChainContent />
    </Suspense>
  );
}
