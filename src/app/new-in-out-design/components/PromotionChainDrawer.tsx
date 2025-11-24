"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Divider,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { 
  Close as CloseIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import PromotionChainTable from '@/app/police-personnel/promotion-chain/create/components/PromotionChainTable';

// Types matching promotion-chain/create
interface ChainNode {
  id: string;
  nodeOrder: number;
  isPlaceholder?: boolean;
  personnelId?: string;
  noId?: number;
  
  nationalId?: string;
  fullName: string;
  rank?: string;
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

interface VacantPosition {
  posCodeId: number;
  posCodeName?: string;
  position: string;
  unit: string;
  requestedPositionId?: number;
  requestedPosition?: string;
  positionNumber?: string;
  actingAs?: string;
}

interface PromotionChainDrawerProps {
  open: boolean;
  onClose: () => void;
  vacantPosition: VacantPosition | null;
  year: number;
  onSaveSuccess?: () => void;
}

export default function PromotionChainDrawer({ 
  open, 
  onClose, 
  vacantPosition, 
  year,
  onSaveSuccess 
}: PromotionChainDrawerProps) {
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [groupNumber, setGroupNumber] = useState<string>('');
  const [groupNotes, setGroupNotes] = useState<string>('');

  // Generate group number
  useEffect(() => {
    if (!open) return;
    const fetchNextGroupNumber = async () => {
      try {
        const currentYear = new Date().getFullYear() + 543;
        const response = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=promotion-chain`);
        if (!response.ok) throw new Error('Failed to fetch');
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
  }, [open]);

  // Reset when drawer opens
  useEffect(() => {
    if (open) {
      setNodes([]);
      setGroupNotes('');
    }
  }, [open]);

  const handleAddVacantBefore = (nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const targetNode = nodes[nodeIndex];
    const newVacant: ChainNode = {
      id: `vacant-${Date.now()}`,
      nodeOrder: nodeIndex + 1,
      isPlaceholder: true,
      fullName: 'ตำแหน่งว่าง',
      fromPosCodeId: 0,
      fromPosCodeName: undefined,
      fromPosition: '',
      fromPositionNumber: undefined,
      fromUnit: '',
      fromActingAs: undefined,
      fromRankLevel: 0,
      toPosCodeId: targetNode.toPosCodeId,
      toPosCodeName: targetNode.toPosCodeName,
      toPosition: targetNode.toPosition,
      toPositionNumber: targetNode.toPositionNumber,
      toUnit: targetNode.toUnit,
      toActingAs: targetNode.toActingAs,
      toRankLevel: targetNode.toRankLevel,
      isPromotionValid: false,
    };

    const newNodes = [...nodes];
    newNodes.splice(nodeIndex, 0, newVacant);

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
        if (prevNode.isPlaceholder) {
          return {
            ...node,
            nodeOrder: index + 1,
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
  };

  const handleRemoveNode = (nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const removedNode = nodes[nodeIndex];
    const newNodes = nodes.filter(n => n.id !== nodeId);

    if (newNodes.length === 0) {
      setNodes([]);
      return;
    }

    const reorderedNodes = newNodes.map((node, index) => {
      if (index < nodeIndex) {
        return { ...node, nodeOrder: index + 1 };
      }
      
      if (index === 0) {
        if (nodeIndex === 0 && vacantPosition) {
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
        return { ...node, nodeOrder: 1 };
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
  };

  const handleReorder = (reorderedNodes: ChainNode[]) => {
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
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!vacantPosition || nodes.length === 0) {
        alert('ข้อมูลไม่ครบถ้วน');
        return;
      }

      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        alert('ต้องมีบุคลากรอย่างน้อย 1 คน');
        return;
      }

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
        posCodeName: node.fromPosCodeName,
        toPosCodeId: node.toPosCodeId || null,
        toPosCodeName: node.toPosCodeName,
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
        notes: node.notes,
      }));

      const payload = {
        swapType: 'promotion-chain',
        groupNumber: groupNumber,
        notes: groupNotes,
        year: year,
        isCompleted: false,
        details: swapDetails,
      };

      const response = await fetch('/api/swap-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save');
      }

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setShowCompleteDialog(false);
    setSaving(true);
    try {
      if (!vacantPosition || nodes.length === 0) {
        alert('ข้อมูลไม่ครบถ้วน');
        return;
      }

      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        alert('ต้องมีบุคลากรอย่างน้อย 1 คน');
        return;
      }

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
        posCodeName: node.fromPosCodeName,
        toPosCodeId: node.toPosCodeId || null,
        toPosCodeName: node.toPosCodeName,
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
        notes: node.notes,
      }));

      const payload = {
        swapType: 'promotion-chain',
        groupNumber: groupNumber,
        notes: groupNotes,
        year: year,
        isCompleted: true,
        details: swapDetails,
      };

      const response = await fetch('/api/swap-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to complete');
      }

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error completing:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          zIndex: 1300,
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: '90%', md: '85%', lg: '80%' },
            maxWidth: 1400,
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              จัดการตำแหน่งว่าง
            </Typography>
            <IconButton onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Vacant Position Info */}
          {vacantPosition && (
            <Paper sx={{ m: 2, p: 2, bgcolor: alpha('#1976d2', 0.08) }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  ตำแหน่งว่างเป้าหมาย
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  {vacantPosition.posCodeName && (
                    <Chip
                      label={vacantPosition.posCodeName}
                      size="small"
                      color="primary"
                    />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {vacantPosition.position}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({vacantPosition.unit})
                  </Typography>
                  {vacantPosition.positionNumber && (
                    <Chip label={`เลขที่ ${vacantPosition.positionNumber}`} size="small" />
                  )}
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Chip label={`เลขที่กลุ่ม: ${groupNumber}`} size="small" variant="outlined" />
                  <Chip
                    label={`${nodes.length} คน`}
                    size="small"
                    color={nodes.length > 0 ? 'success' : 'default'}
                  />
                </Stack>
              </Stack>
            </Paper>
          )}

          {/* Main Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <PromotionChainTable
              nodes={nodes}
              vacantPosition={vacantPosition ? {
                id: `vacant-${vacantPosition.posCodeId}-${Date.now()}`,
                posCodeId: vacantPosition.posCodeId,
                posCodeName: vacantPosition.posCodeName,
                position: vacantPosition.position,
                unit: vacantPosition.unit,
                positionNumber: vacantPosition.positionNumber,
                actingAs: vacantPosition.actingAs,
              } : null}
              onAddNode={(node) => {
                setNodes([...nodes, node]);
              }}
              onRemoveNode={handleRemoveNode}
              onInsertNode={(node, beforeId) => {
                const insertIndex = nodes.findIndex(n => n.id === beforeId);
                if (insertIndex === -1) return;
                const newNodes = [...nodes];
                newNodes.splice(insertIndex, 0, node);
                const reorderedNodes = newNodes.map((n, index) => {
                  if (index === 0) {
                    return {
                      ...n,
                      nodeOrder: 1,
                      toPosCodeId: vacantPosition?.posCodeId || n.toPosCodeId,
                      toPosCodeName: vacantPosition?.posCodeName || n.toPosCodeName,
                      toPosition: vacantPosition?.position || n.toPosition,
                      toPositionNumber: vacantPosition?.positionNumber || n.toPositionNumber,
                      toUnit: vacantPosition?.unit || n.toUnit,
                      toActingAs: vacantPosition?.actingAs || n.toActingAs,
                      toRankLevel: vacantPosition?.posCodeId || n.toRankLevel,
                    };
                  } else {
                    const prevNode = newNodes[index - 1];
                    return {
                      ...n,
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
              }}
              onReorder={handleReorder}
              onInsertPlaceholder={handleAddVacantBefore}
            />

            {/* Notes */}
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="หมายเหตุ (ถ้ามี)"
                multiline
                rows={3}
                value={groupNotes}
                onChange={(e) => setGroupNotes(e.target.value)}
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={handleSave}
                disabled={saving || nodes.length === 0}
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                fullWidth
              >
                บันทึกฉบับร่าง
              </Button>
              <Button
                variant="contained"
                onClick={() => setShowCompleteDialog(true)}
                disabled={saving || nodes.length === 0}
                startIcon={<CheckIcon />}
                fullWidth
              >
                บันทึกและยืนยัน
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      {/* Complete Confirmation Dialog */}
      <Dialog open={showCompleteDialog} onClose={() => setShowCompleteDialog(false)}>
        <DialogTitle>ยืนยันการบันทึกและทำรายการ</DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการบันทึกและทำรายการโปรโมชั่นนี้ใช่หรือไม่? 
            หลังจากยืนยันแล้วจะไม่สามารถแก้ไขได้
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompleteDialog(false)}>ยกเลิก</Button>
          <Button onClick={handleComplete} variant="contained" autoFocus>
            ยืนยัน
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
