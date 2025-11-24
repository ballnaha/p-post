'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, Paper, Typography, Button, Chip, CircularProgress, TextField, useMediaQuery, useTheme, Autocomplete, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, CheckCircle as CheckCircleIcon , Check as CheckIcon } from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';
import PromotionTable from './components/PromotionTable';


// Types
interface ChainNode {
  id: string;
  nodeOrder: number;
  isPlaceholder?: boolean; // true = ตำแหน่งว่าง (ยังไม่ได้เลือกบุคลากร)
  personnelId?: string;
  noId?: number;
  
  nationalId: string;
  fullName: string;
  rank: string;
  seniority?: string;
  
  birthDate?: string;
  age?: string;
  education?: string;
  
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  
  trainingLocation?: string;
  trainingCourse?: string;
  
  supporterName?: string;
  supportReason?: string;
  
  notes?: string;
  
  fromPosCodeId: number;
  fromPosCodeName?: string;
  fromPosition: string;
  fromPositionNumber?: string;
  fromUnit: string;
  fromActingAs?: string;
  
  toPosCodeId: number;
  toPosCodeName?: string;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  toActingAs?: string;
  
  fromRankLevel: number;
  toRankLevel: number;
  isPromotionValid: boolean;
}

interface StartingPersonnel {
  id: string;
  noId?: number;
  posCodeId: number;
  posCodeName?: string;
  position: string;
  unit: string;
  requestedPositionId?: number;
  requestedPosition?: string;
  positionNumber?: string;
  actingAs?: string;
  fullName: string;
  rank: string;
  nationalId: string;
  seniority?: string;
  birthDate?: string;
  age?: string;
  education?: string;
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  trainingLocation?: string;
  trainingCourse?: string;
  supporterName?: string;
  supportReason?: string;
}

function CreatePromotionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupNumber, setGroupNumber] = useState<string>('');
  const [groupNotes, setGroupNotes] = useState<string>('');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [saveAndComplete, setSaveAndComplete] = useState(false);
  
  // Unit Information
  const [unitName, setUnitName] = useState<string>('');
  const [unitDescription, setUnitDescription] = useState<string>('');
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
  const [unitLoading, setUnitLoading] = useState(true);
  
  // อัพเดท toUnit ของ node แรกเมื่อเปลี่ยนหน่วยปลายทาง
  useEffect(() => {
    if (nodes.length > 0 && unitName) {
      const updatedNodes = nodes.map((node, index) => {
        if (index === 0) {
          return {
            ...node,
            toUnit: unitName,
          };
        }
        return node;
      });
      setNodes(updatedNodes);
    }
  }, [unitName]);
  

  
  // Selected Personnel to Transfer
  const [selectedPersonnel, setSelectedPersonnel] = useState<StartingPersonnel[]>([]);
  
  // Get starting personnel (first selected personnel)
  const startingPersonnel = selectedPersonnel[0] || null;
  
  // Chain nodes for filling vacant positions
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const fetchNextGroupNumber = async () => {
      try {
        const currentYear = new Date().getFullYear() + 543;
        const response = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=transfer`);
        if (!response.ok) throw new Error('Failed to fetch transfer transactions');
        const result = await response.json();
        const transactions: any[] = Array.isArray(result?.data) ? result.data : [];
        let maxNumber = 0;
        for (const t of transactions) {
          if (t.groupNumber) {
            const match = String(t.groupNumber).match(/\/TF-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          }
        }
        const next = String(maxNumber + 1).padStart(3, '0');
        setGroupNumber(`${currentYear}/TF-${next}`);
      } catch (e) {
        const currentYear = new Date().getFullYear() + 543;
        setGroupNumber(`${currentYear}/TF-001`);
      }
    };
    fetchNextGroupNumber();
  }, []);

  // Fetch unique units from police_personnel
  useEffect(() => {
    const fetchUnits = async () => {
      setUnitLoading(true);
      try {
        // ใช้ API in-out ที่มี filtersOnly เพื่อดึง unique units
        const response = await fetch('/api/in-out?filtersOnly=true');
        if (!response.ok) throw new Error('Failed to fetch filters');
        const result = await response.json();
        
        if (result.success && result.data.filters) {
          const units = result.data.filters.units || [];
          console.log('Fetched unique units:', units.length, units);
          setUnitOptions(units);
        } else {
          setUnitOptions([]);
        }
      } catch (e) {
        console.error('Failed to fetch units:', e);
        setUnitOptions([]);
      } finally {
        setUnitLoading(false);
      }
    };
    fetchUnits();
  }, []);

  const handleAddNode = (node: ChainNode) => {
    setNodes([...nodes, node]);
    setActiveStep(nodes.length);
  };

  const handleAddPlaceholder = () => {
    const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
    const isLastNodePlaceholder = lastNode?.isPlaceholder === true;
    
    // สร้าง placeholder node
    const placeholderNode: ChainNode = {
      id: `placeholder-${Date.now()}`,
      nodeOrder: nodes.length + 1,
      isPlaceholder: true,
      fullName: '[รอการเลือกบุคลากร]',
      nationalId: '',
      rank: '',
      
      // ตำแหน่ง from ว่าง (เพราะยังไม่มีบุคคล)
      fromPosCodeId: 0,
      fromPosCodeName: undefined,
      fromPosition: '',
      fromPositionNumber: undefined,
      fromUnit: '',
      fromActingAs: undefined,
      
      // ตำแหน่ง to: ถ้า node ก่อนหน้าเป็น placeholder ให้เป็นค่าว่าง
      toPosCodeId: nodes.length === 0 
        ? 0 
        : isLastNodePlaceholder 
          ? 0 
          : (lastNode?.fromPosCodeId || 0),
      toPosCodeName: nodes.length === 0 
        ? undefined 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromPosCodeName,
      toPosition: nodes.length === 0 
        ? '' 
        : isLastNodePlaceholder 
          ? '' 
          : (lastNode?.fromPosition || ''),
      toPositionNumber: nodes.length === 0 
        ? undefined 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromPositionNumber,
      toUnit: nodes.length === 0 
        ? unitName 
        : isLastNodePlaceholder 
          ? '' 
          : (lastNode?.fromUnit || ''),
      toActingAs: nodes.length === 0 
        ? undefined 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromActingAs,
      
      // Rank levels
      fromRankLevel: 0,
      toRankLevel: nodes.length === 0 ? 0 : (lastNode?.fromRankLevel || 0),
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
      nationalId: '',
      rank: '',
      
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

    // แทรก placeholder ก่อนโหนดที่เลือก
    const newNodes = [...nodes];
    newNodes.splice(insertIndex, 0, placeholderNode);

    // อัพเดท nodeOrder และ toUnit ตาม chain logic
    const reorderedNodes = newNodes.map((node, index) => {
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง
        return {
          ...node,
          nodeOrder: 1,
          toPosition: '',
          toUnit: unitName || node.toUnit,
          toPosCodeId: 0,
          toPosCodeName: undefined,
          toPositionNumber: undefined,
          toActingAs: undefined,
        };
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า
        const prevNode = newNodes[index - 1];
        if (prevNode.isPlaceholder) {
          // ถ้า node ก่อนหน้าเป็น placeholder ยังไม่รู้ว่าจะไปไหน
          return {
            ...node,
            nodeOrder: index + 1,
            toPosition: '',
            toUnit: '',
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPositionNumber: undefined,
            toActingAs: undefined,
          };
        } else {
          // Node ก่อนหน้าเป็น node ปกติ
          return {
            ...node,
            nodeOrder: index + 1,
            toPosCodeId: prevNode.fromPosCodeId,
            toPosCodeName: prevNode.fromPosCodeName,
            toPosition: prevNode.fromPosition,
            toPositionNumber: prevNode.fromPositionNumber,
            toUnit: prevNode.fromUnit,
            toActingAs: prevNode.fromActingAs,
          };
        }
      }
    });

    setNodes(reorderedNodes);
    toast.info('แทรกตำแหน่งว่างแล้ว กรุณาเลือกบุคลากรภายหลัง');
  };

  const handleRemoveNode = (nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const removedNode = nodes[nodeIndex];
    const newNodes = nodes.filter(n => n.id !== nodeId);

    if (newNodes.length === 0) {
      setNodes([]);
      toast.success('ลบตำแหน่งสำเร็จ');
      return;
    }

    const reorderedNodes = newNodes.map((node, index) => {
      if (index < nodeIndex) {
        return {
          ...node,
          nodeOrder: index + 1,
        };
      }
      
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง (ไม่มีตำแหน่งเฉพาะ)
        return {
          ...node,
          nodeOrder: 1,
          toPosition: '',
          toUnit: unitName || node.toUnit,
          toPosCodeId: 0,
          toPosCodeName: undefined,
          toPositionNumber: undefined,
          toActingAs: undefined,
        };
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า
        const prevNode = newNodes[index - 1];
        if (prevNode.isPlaceholder) {
          // ถ้า node ก่อนหน้าเป็น placeholder ยังไม่รู้ว่าจะไปไหน
          return {
            ...node,
            nodeOrder: index + 1,
            toPosition: '',
            toUnit: '',
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPositionNumber: undefined,
            toActingAs: undefined,
          };
        } else {
          // Node ก่อนหน้าเป็น node ปกติ
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
      }
    });

    setNodes(reorderedNodes);
    
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

    const newNodes = [...nodes];
    newNodes.splice(insertIndex, 0, newNode);

    const reorderedNodes = newNodes.map((node, index) => {
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง (ไม่มีตำแหน่งเฉพาะ)
        return {
          ...node,
          nodeOrder: 1,
          toPosition: '',
          toUnit: unitName || node.toUnit,
          toPosCodeId: 0,
          toPosCodeName: undefined,
          toPositionNumber: undefined,
          toActingAs: undefined,
        };
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า
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
    const updatedNodes = reorderedNodes.map((node, index) => {
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง (ไม่มีตำแหน่งเฉพาะ)
        return {
          ...node,
          nodeOrder: 1,
          toPosition: '',
          toUnit: unitName || node.toUnit,
          toPosCodeId: 0,
          toPosCodeName: undefined,
          toPositionNumber: undefined,
          toActingAs: undefined,
        };
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า (chain)
        const prevNode = reorderedNodes[index - 1];
        if (prevNode.isPlaceholder) {
          // ถ้า node ก่อนหน้าเป็น placeholder ยังไม่รู้ว่าจะไปไหน
          return {
            ...node,
            nodeOrder: index + 1,
            toPosition: '',
            toUnit: '',
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPositionNumber: undefined,
            toActingAs: undefined,
          };
        } else {
          // Node ก่อนหน้าเป็น node ปกติ
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
      }
    });

    setNodes(updatedNodes);
    toast.success('จัดเรียงใหม่สำเร็จ');
  };

  const handleSave = async (markAsComplete = false) => {
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

      // กรองเฉพาะ node ที่ไม่ใช่ placeholder
      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        toast.error('กรุณาเลือกบุคลากรอย่างน้อย 1 คน (ไม่นับตำแหน่งว่าง)');
        return;
      }

      // ถ้าจะทำเครื่องหมายเสร็จสิ้น ต้องไม่มี placeholder
      if (markAsComplete) {
        const hasPlaceholder = nodes.some(n => n.isPlaceholder);
        if (hasPlaceholder) {
          toast.error('ไม่สามารถทำเครื่องหมายเสร็จสิ้นได้ เนื่องจากยังมีตำแหน่งว่างที่ยังไม่ได้เลือกบุคลากร');
          return;
        }
      }

      const year = new Date().getFullYear() + 543;
      
      // ส่งทุก node รวม placeholder เพื่อให้ยังคงอยู่หลัง reload
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
        swapType: 'transfer', // ยังคงเป็นการย้ายหน่วยงาน
        groupName: `ย้ายหน่วยงาน → ${unitName}`,
        groupNumber: groupNumber || null,
        status: 'completed',
        isCompleted: markAsComplete,
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

      toast.success(markAsComplete ? 'บันทึกและทำเครื่องหมายเสร็จสิ้นสำเร็จ' : 'บันทึกรายการสำเร็จ');
      router.push('/police-personnel/promotion');
    } catch (error: any) {
      console.error('Error saving chain:', error);
      toast.error(error?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
      setCompleting(false);
      setSaveAndComplete(false);
    }
  };

  const handleCompleteClick = () => {
    // ตรวจสอบว่ามี placeholder หรือไม่
    const hasPlaceholder = nodes.some(n => n.isPlaceholder);
    if (hasPlaceholder) {
      toast.error('ไม่สามารถทำเครื่องหมายเสร็จสิ้นได้ เนื่องจากยังมีตำแหน่งว่างที่ยังไม่ได้เลือกบุคลากร');
      return;
    }
    setShowCompleteDialog(true);
  };

  const handleComplete = async () => {
    setCompleting(true);
    setSaveAndComplete(true);
    setShowCompleteDialog(false);
    await handleSave(true);
  };

  const validateChain = () => {
    // ตรวจสอบแค่ว่ามีอย่างน้อย 1 node (ไม่นับ placeholder)
    if (nodes.length === 0) return false;
    const validNodes = nodes.filter(n => !n.isPlaceholder);
    return validNodes.length > 0;
  };

  const isChainValid = validateChain();

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          {/* Title and Back Button */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2,
          }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                ย้ายบุคลากรไปหน่วยงานอื่น
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เลือกบุคลากรที่จะย้ายไปหน่วยงานปลายทาง และจัดคนเติมตำแหน่งว่างแบบทอดต่อ
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/police-personnel/promotion')}
              sx={{ flexShrink: 0 }}
            >
              ย้อนกลับ
            </Button>
          </Box>

          {/* Destination Unit Info - Full Width */}
          <Box sx={{ 
            p: 2,
            bgcolor: 'primary.50',
            borderRadius: 1,
            borderLeft: '3px solid',
            borderColor: 'primary.main',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                🏢 หน่วยงานปลายทาง
              </Typography>
              <Chip label={`${nodes.length} ขั้น`} size="small" color="primary" sx={{ height: 30, fontSize: '0.85rem' }} />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <Autocomplete
                fullWidth
                freeSolo
                loading={unitLoading}
                disabled={unitLoading}
                options={unitOptions}
                value={unitName}
                onChange={(event, newValue) => {
                  setUnitName(newValue || '');
                }}
                onInputChange={(event, newInputValue) => {
                  setUnitName(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="ชื่อหน่วยงานปลายทาง"
                    placeholder={unitLoading ? "กำลังโหลดข้อมูลหน่วยงาน..." : "เลือกหรือพิมพ์ชื่อหน่วยงาน..."}
                    variant="outlined"
                    size="small"
                    required
                  />
                )}
                sx={{ bgcolor: 'white', flex: 1 }}
              />
              
              <TextField
                label="รายละเอียดเพิ่มเติม"
                placeholder="ระบุรายละเอียดของหน่วยงาน (ถ้ามี)"
                value={unitDescription}
                onChange={(e) => setUnitDescription(e.target.value)}
                variant="outlined"
                size="small"
                sx={{ bgcolor: 'white', flex: 1 }}
              />
            </Box>
            
            {/* Group Number Display */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip label="เลขกลุ่ม" size="small" color="primary" sx={{ height: 22 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{groupNumber || '-'}</Typography>
            </Box>
          </Box>

          {/* หมายเหตุกลุ่ม */}
          {nodes.length > 0 && (
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
            <Box sx={{ pb: 12 }}>
              <PromotionTable
                startingPersonnel={startingPersonnel}
                nodes={nodes}
                onAddNode={handleAddNode}
                onRemoveNode={handleRemoveNode}
                onInsertNode={handleInsertNode}
                onReorder={handleReorder}
                onAddPlaceholder={handleAddPlaceholder}
                onInsertPlaceholder={handleInsertPlaceholder}
                destinationUnit={unitName}
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
                      {isChainValid ? '✓ พร้อมบันทึก' : '⚠ ยังไม่สมบูรณ์'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      {nodes.length} ขั้นในโซ่
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
                  onClick={() => router.push('/police-personnel/promotion')}
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
                  onClick={() => handleSave(false)}
                  disabled={!isChainValid || saving || completing || nodes.length === 0}
                  fullWidth={isMobile}
                  sx={{ 
                    minHeight: { xs: '48px', sm: 'auto' },
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    fontWeight: 600
                  }}
                >
                  {saving && !saveAndComplete ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                </Button>

                
                {!nodes.some(n => n.isPlaceholder) && nodes.length > 0 && (
                  <Button
                    variant="outlined"
                    color="success"
                    size={isMobile ? 'medium' : 'large'}
                    startIcon={completing ? <CircularProgress size={20} /> : <CheckIcon />}
                    onClick={handleCompleteClick}
                    disabled={!isChainValid || saving || completing}
                    fullWidth={isMobile}
                    sx={{ 
                      minHeight: { xs: '44px', sm: 'auto' },
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

        {/* Complete confirmation dialog */}
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
              <CheckCircleIcon sx={{ fontSize: 28 }} />
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
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 500, mt: 1 }}>
                คุณต้องการบันทึกและสิ้นสุดรายการนี้ใช่หรือไม่?
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="หน่วยปลายทาง" size="small" color="primary" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {unitName || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="จำนวนบุคลากร" size="small" color="success" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {nodes.filter(n => !n.isPlaceholder).length} คน
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="เลขกลุ่ม" size="small" color="default" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {groupNumber || '-'}
                    </Typography>
                  </Box>
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
              startIcon={completing ? <CircularProgress size={20} /> : <CheckCircleIcon />}
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

export default function CreatePromotionPage() {
  return (
    <Suspense fallback={
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      </Layout>
    }>
      <CreatePromotionContent />
    </Suspense>
  );
}
