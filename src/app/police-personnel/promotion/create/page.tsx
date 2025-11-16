'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, Paper, Typography, Button, Chip, CircularProgress, TextField, useMediaQuery, useTheme } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';
import PromotionTable from './components/PromotionTable';

// Types
interface ChainNode {
  id: string;
  nodeOrder: number;
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
  
  // Unit Information
  const [unitName, setUnitName] = useState<string>('');
  const [unitDescription, setUnitDescription] = useState<string>('');
  
  // Selected Personnel to Transfer
  const [selectedPersonnel, setSelectedPersonnel] = useState<StartingPersonnel[]>([]);
  
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

  const handleAddNode = (node: ChainNode) => {
    setNodes([...nodes, node]);
    setActiveStep(nodes.length);
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
        if (nodeIndex === 0 && startingPersonnel) {
          return {
            ...node,
            nodeOrder: 1,
            toPosCodeId: startingPersonnel.posCodeId || removedNode.toPosCodeId,
            toPosCodeName: startingPersonnel.posCodeName || removedNode.toPosCodeName,
            toPosition: startingPersonnel.position || removedNode.toPosition,
            toPositionNumber: startingPersonnel.positionNumber || removedNode.toPositionNumber,
            toUnit: startingPersonnel.unit || removedNode.toUnit,
            toActingAs: startingPersonnel.actingAs || removedNode.toActingAs,
            toRankLevel: removedNode.toRankLevel,
          };
        }
        return {
          ...node,
          nodeOrder: 1,
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
        return {
          ...node,
          nodeOrder: 1,
          toPosCodeId: startingPersonnel?.posCodeId || node.toPosCodeId,
          toPosCodeName: startingPersonnel?.posCodeName || node.toPosCodeName,
          toPosition: startingPersonnel?.position || node.toPosition,
          toPositionNumber: startingPersonnel?.positionNumber || node.toPositionNumber,
          toUnit: startingPersonnel?.unit || node.toUnit,
          toActingAs: startingPersonnel?.actingAs || node.toActingAs,
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
    toast.success(`แทรก ${newNode.fullName} ก่อน ${nodes[insertIndex].fullName} สำเร็จ`);
  };

  const handleReorder = (reorderedNodes: ChainNode[]) => {
    const updatedNodes = reorderedNodes.map((node, index) => {
      if (index === 0) {
        return {
          ...node,
          nodeOrder: 1,
          toPosCodeId: startingPersonnel?.posCodeId || node.toPosCodeId,
          toPosCodeName: startingPersonnel?.posCodeName || node.toPosCodeName,
          toPosition: startingPersonnel?.position || node.toPosition,
          toPositionNumber: startingPersonnel?.positionNumber || node.toPositionNumber,
          toUnit: startingPersonnel?.unit || node.toUnit,
          toActingAs: startingPersonnel?.actingAs || node.toActingAs,
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
      if (!startingPersonnel) {
        toast.error('กรุณาเลือกบุคลากรเริ่มต้น');
        return;
      }

      if (nodes.length === 0) {
        toast.error('กรุณาเพิ่มบุคลากรอย่างน้อย 1 คน');
        return;
      }

      const year = new Date().getFullYear() + 543;
      const swapDetails = nodes.map((node) => ({
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
        swapType: 'promotion',
        groupName: `เลื่อนตำแหน่ง • ${startingPersonnel.position}`,
        groupNumber: groupNumber || null,
        status: 'completed',
        notes: groupNotes.trim() || null,
        // ข้อมูลบุคลากรที่จะเลื่อนตำแหน่ง
        startingPersonnel: {
          id: startingPersonnel.id,
          noId: startingPersonnel.noId,
          fullName: startingPersonnel.fullName,
          rank: startingPersonnel.rank,
          nationalId: startingPersonnel.nationalId,
          seniority: startingPersonnel.seniority,
          posCodeId: startingPersonnel.posCodeId,
          posCodeName: startingPersonnel.posCodeName,
          position: startingPersonnel.position,
          positionNumber: startingPersonnel.positionNumber,
          unit: startingPersonnel.unit,
          actingAs: startingPersonnel.actingAs,
        },
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
      router.push('/police-personnel/promotion');
    } catch (error: any) {
      console.error('Error saving chain:', error);
      toast.error(error?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const validateChain = () => {
    if (nodes.length === 0) return false;
    return nodes.every((node) => node.isPromotionValid);
  };

  const isChainValid = validateChain();

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
                สร้างรายการย้ายบุคลากร
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                กรอกข้อมูลหน่วยงานปลายทาง เลือกบุคลากรที่จะย้าย และจัดคนเติมตำแหน่งว่าง
              </Typography>

              {/* Unit Information */}
              <Box sx={{ 
                p: 1.5,
                bgcolor: 'primary.50',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderColor: 'primary.main',
                mb: 2,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                    🏢 ข้อมูลหน่วยงานปลายทาง
                  </Typography>
                  <Chip label="เลขกลุ่ม" size="small" color="primary" sx={{ height: 22 }} />
                </Box>
                
                <TextField
                  fullWidth
                  label="ชื่อหน่วยงาน/Unit"
                  placeholder="เช่น หน่วยที่ 1, กองบังคับการ..."
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 1.5, bgcolor: 'white' }}
                  required
                />
                
                <TextField
                  fullWidth
                  label="รายละเอียดเพิ่มเติม"
                  placeholder="ระบุรายละเอียดของหน่วยงาน (ถ้ามี)"
                  value={unitDescription}
                  onChange={(e) => setUnitDescription(e.target.value)}
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  sx={{ bgcolor: 'white' }}
                />
                
                <Box sx={{ mt: 1, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{groupNumber || '-'}</Typography>
                </Box>
              </Box>

              {/* Selected Personnel Count */}
              <Box sx={{ 
                p: 1.5,
                bgcolor: 'success.50',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderColor: 'success.main',
              }}>
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                  👥 บุคลากรที่เลือก
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {selectedPersonnel.length} คน
                </Typography>
                {selectedPersonnel.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    จะเกิดตำแหน่งว่าง {selectedPersonnel.length} ตำแหน่ง
                  </Typography>
                )}
              </Box>
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

          {/* หมายเหตุกลุ่ม */}
          {!loading && startingPersonnel && (
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
                  disabled={saving}
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
                  disabled={!isChainValid || saving || nodes.length === 0}
                  fullWidth={isMobile}
                  sx={{ 
                    minHeight: { xs: '48px', sm: 'auto' },
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    fontWeight: 600
                  }}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                </Button>
              </Box>
            </Paper>
          </>
        )}
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
