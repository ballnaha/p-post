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
  const personnelId = searchParams.get('personnelId');
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupNumber, setGroupNumber] = useState<string>('');
  const [groupNotes, setGroupNotes] = useState<string>(''); // หมายเหตุของกลุ่ม
  const [startingPersonnel, setStartingPersonnel] = useState<StartingPersonnel | null>(null);
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (personnelId) {
      loadStartingPersonnel(personnelId);
    } else {
      toast.error('กรุณาเลือกบุคลากรก่อนสร้างรายการ');
      router.push('/police-personnel/promotion');
    }
  }, [personnelId]);

  useEffect(() => {
    const fetchNextGroupNumber = async () => {
      try {
        const currentYear = new Date().getFullYear() + 543;
        const response = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=promotion`);
        if (!response.ok) throw new Error('Failed to fetch promotion transactions');
        const result = await response.json();
        const transactions: any[] = Array.isArray(result?.data) ? result.data : [];
        let maxNumber = 0;
        for (const t of transactions) {
          if (t.groupNumber) {
            const match = String(t.groupNumber).match(/\/PM-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          }
        }
        const next = String(maxNumber + 1).padStart(3, '0');
        setGroupNumber(`${currentYear}/PM-${next}`);
      } catch (e) {
        const currentYear = new Date().getFullYear() + 543;
        setGroupNumber(`${currentYear}/PM-001`);
      }
    };
    fetchNextGroupNumber();
  }, []);

  const loadStartingPersonnel = async (id: string) => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/police-personnel/promotion-eligible?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch personnel');
      }

      const result = await response.json();
      const allPersonnel = result.data || [];
      
      console.log('Looking for personnel:', { id, totalPersonnel: allPersonnel.length });
      
      const data = allPersonnel.find((p: any) => p.id === id);
      
      if (!data) {
        console.error('Personnel not found. Available IDs:', allPersonnel.map((p: any) => p.id).slice(0, 5));
        toast.error('ไม่พบข้อมูลบุคลากรที่เลือก กรุณาเลือกใหม่');
        setTimeout(() => {
          router.push('/police-personnel/promotion');
        }, 2000);
        return;
      }
      
      console.log('Raw data from API:', {
        id: data.id,
        posCodeId: data.posCodeId,
        posCodeName: data.posCodeName,
        position: data.position,
      });
      
      const personnel: StartingPersonnel = {
        id: data.id,
        noId: data.noId,
        posCodeId: data.posCodeId,
        posCodeName: data.posCodeName,
        position: data.position || '-',
        unit: data.unit || '-',
        requestedPositionId: data.requestedPositionId,
        requestedPosition: data.requestedPosition,
        positionNumber: data.positionNumber,
        actingAs: data.actingAs,
        fullName: data.fullName || '-',
        rank: data.rank || '-',
        nationalId: data.nationalId || '',
        seniority: data.seniority,
        birthDate: data.birthDate,
        age: data.age,
        education: data.education,
        lastAppointment: data.lastAppointment,
        currentRankSince: data.currentRankSince,
        enrollmentDate: data.enrollmentDate,
        retirementDate: data.retirementDate,
        yearsOfService: data.yearsOfService,
        trainingLocation: data.trainingLocation,
        trainingCourse: data.trainingCourse,
        supporterName: data.supporterName,
        supportReason: data.supportReason,
      };
      
      console.log('Mapped starting personnel:', personnel);
      setStartingPersonnel(personnel);
    } catch (error) {
      console.error('Error loading personnel:', error);
      toast.error('ไม่สามารถโหลดข้อมูลบุคลากรได้');
      setTimeout(() => {
        router.push('/police-personnel/promotion');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

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
        groupName: `เลื่อนตำแหน่ง ${startingPersonnel.fullName} • ${startingPersonnel.position}`,
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
                สร้างรายการเลื่อนตำแหน่ง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                เลือกบุคลากรทีละขั้นเพื่อจัดเลื่อนตำแหน่งแบบทอดต่อ
              </Typography>

              {/* Starting Personnel Info */}
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">กำลังโหลด...</Typography>
                </Box>
              ) : startingPersonnel && (
                <Box sx={{ 
                  p: 1.5,
                  bgcolor: 'success.50',
                  borderRadius: 1,
                  borderLeft: '3px solid',
                  borderColor: 'success.main',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                      🎖️ บุคลากรที่จะเลื่อนตำแหน่ง
                    </Typography>
                    <Chip label={`${nodes.length} ขั้น`} size="small" color="success" sx={{ height: 30, fontSize: '0.85rem' }} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {startingPersonnel.rank} {startingPersonnel.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.85rem' }}>
                    {startingPersonnel.posCodeName} • {startingPersonnel.position} • {startingPersonnel.unit}
                  </Typography>
                  <Box sx={{ mt: 1.25, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label="เลขกลุ่ม" size="small" color="success" sx={{ height: 22 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{groupNumber || '-'}</Typography>
                  </Box>
                </Box>
              )}
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
