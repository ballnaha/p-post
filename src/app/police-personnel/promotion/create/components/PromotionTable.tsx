'use client';
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  InfoOutlined as InfoOutlinedIcon,
  DragIndicator as DragIndicatorIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import CandidateSelector from './CandidateSelector';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import { useToast } from '@/hooks/useToast';
import { useDragDropHighlight } from '@/hooks/useDragDropHighlight';
import { useTheme } from '@mui/material';

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
  positionNumber?: string;
  actingAs?: string;
  fullName: string;
  rank: string;
  nationalId: string;
  seniority?: string;
}

interface PromotionTableProps {
  startingPersonnel: StartingPersonnel | null;
  nodes: ChainNode[];
  onAddNode: (node: ChainNode) => void;
  onRemoveNode: (nodeId: string) => void;
  onInsertNode?: (node: ChainNode, beforeNodeId: string) => void;
  onReorder?: (nodes: ChainNode[]) => void;
  onAddPlaceholder?: () => void;
  onInsertPlaceholder?: (beforeNodeId: string) => void;
  destinationUnit?: string;
  isCompleted?: boolean; // ถ้า true จะไม่แสดงปุ่มเพิ่ม placeholder
}

export default function PromotionTable({
  startingPersonnel,
  nodes,
  onAddNode,
  onRemoveNode,
  onInsertNode,
  onReorder,
  onAddPlaceholder,
  onInsertPlaceholder,
  destinationUnit = '',
  isCompleted = false,
}: PromotionTableProps) {
  const theme = useTheme();
  const toast = useToast();
  const [showCandidateSelector, setShowCandidateSelector] = useState(false);
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<any | null>(null);
  const [personnelModalLoading, setPersonnelModalLoading] = useState(false);
  const [insertBeforeNodeId, setInsertBeforeNodeId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);
  
  // ใช้ drag drop highlight hook
  const dragDropHighlight = useDragDropHighlight(2000);

  const formatPosCode = (id?: number, name?: string) => {
    if (!name) return id && id > 0 ? `${id}` : '';
    return id && id > 0 ? `${id}-${name}` : name;
  };

  const getRankLevelByPosCode = (posCodeId: number): number => {
    return posCodeId;
  };

  const getCurrentVacantRankLevel = (): number | null => {
    // ถ้ายังไม่มีอะไรเลย ให้ return 0 เพื่อให้สามารถเลือกบุคลากรได้
    if (!startingPersonnel && nodes.length === 0) return 0;
    if (nodes.length === 0) {
      return getRankLevelByPosCode(startingPersonnel?.posCodeId || 0);
    }
    const lastNode = nodes[nodes.length - 1];
    return lastNode.fromRankLevel;
  };

  const currentVacantRankLevel = getCurrentVacantRankLevel();
  const canAddMore = true; // เปลี่ยนให้แสดงปุ่มเสมอ

  const handleSelectCandidate = (candidate: any) => {
    if (nodes.some((n: ChainNode) => n.personnelId === candidate.id)) {
      toast.warning('ไม่สามารถเลือกบุคคลเดิมซ้ำได้');
      return;
    }

    // ถ้ากำลังแทรก หรือ แทนที่ placeholder
    if (insertBeforeNodeId && onInsertNode) {
      const targetNodeIndex = nodes.findIndex((n: ChainNode) => n.id === insertBeforeNodeId);
      if (targetNodeIndex === -1) {
        toast.error('ไม่พบตำแหน่งที่ต้องการแทรก');
        return;
      }

      const targetNode = nodes[targetNodeIndex];
      
      // ถ้า targetNode เป็น placeholder ให้แทนที่แทนการแทรก
      if (targetNode.isPlaceholder) {
        // แทนที่ placeholder ด้วยบุคลากรจริง
        const replacementNode: ChainNode = {
          id: `node-${Date.now()}`,
          nodeOrder: targetNode.nodeOrder,
          personnelId: candidate.id,
          noId: candidate.noId,
          nationalId: candidate.nationalId,
          fullName: candidate.fullName,
          rank: candidate.rank,
          seniority: candidate.seniority,
          birthDate: candidate.birthDate,
          age: candidate.age,
          education: candidate.education,
          lastAppointment: candidate.lastAppointment,
          currentRankSince: candidate.currentRankSince,
          enrollmentDate: candidate.enrollmentDate,
          retirementDate: candidate.retirementDate,
          yearsOfService: candidate.yearsOfService,
          trainingLocation: candidate.trainingLocation,
          trainingCourse: candidate.trainingCourse,
          supporterName: candidate.supporterName,
          supportReason: candidate.supportReason,
          notes: candidate.notes,
          fromPosCodeId: candidate.posCodeId,
          fromPosCodeName: candidate.posCodeName || candidate.position,
          fromPosition: candidate.position,
          fromPositionNumber: candidate.positionNumber,
          fromUnit: candidate.unit,
          fromActingAs: candidate.actingAs,
          toPosCodeId: targetNode.toPosCodeId,
          toPosCodeName: targetNode.toPosCodeName,
          toPosition: targetNode.toPosition,
          toPositionNumber: targetNode.toPositionNumber,
          toUnit: targetNode.toUnit, // ใช้ toUnit จาก placeholder ที่ถูกต้องแล้ว
          toActingAs: targetNode.toActingAs,
          fromRankLevel: candidate.rankLevel,
          toRankLevel: targetNode.toRankLevel,
          isPromotionValid: true,
        };
        
        // แทนที่ placeholder ด้วย node ใหม่
        const newNodes = [...nodes];
        newNodes[targetNodeIndex] = replacementNode;
        
        // อัปเดต node ถัดไป (ถ้ามี) เพราะตอนนี้รู้แล้วว่า placeholder คือใคร
        if (targetNodeIndex + 1 < newNodes.length) {
          const nextNode = newNodes[targetNodeIndex + 1];
          newNodes[targetNodeIndex + 1] = {
            ...nextNode,
            toPosition: replacementNode.fromPosition,
            toUnit: replacementNode.fromUnit,
            toPosCodeId: replacementNode.fromPosCodeId,
            toPosCodeName: replacementNode.fromPosCodeName,
            toPositionNumber: replacementNode.fromPositionNumber,
            toActingAs: replacementNode.fromActingAs,
          };
        }
        
        if (onReorder) {
          onReorder(newNodes);
        }
        
        setInsertBeforeNodeId(null);
        setShowCandidateSelector(false);
        toast.success(`เลือก ${candidate.rank} ${candidate.fullName} แทนตำแหน่งว่างสำเร็จ`);
        return;
      }
      const newNode: ChainNode = {
        id: `node-${Date.now()}`,
        nodeOrder: targetNode.nodeOrder,
        personnelId: candidate.id,
        noId: candidate.noId,
        nationalId: candidate.nationalId,
        fullName: candidate.fullName,
        rank: candidate.rank,
        seniority: candidate.seniority,
        birthDate: candidate.birthDate,
        age: candidate.age,
        education: candidate.education,
        lastAppointment: candidate.lastAppointment,
        currentRankSince: candidate.currentRankSince,
        enrollmentDate: candidate.enrollmentDate,
        retirementDate: candidate.retirementDate,
        yearsOfService: candidate.yearsOfService,
        trainingLocation: candidate.trainingLocation,
        trainingCourse: candidate.trainingCourse,
        supporterName: candidate.supporterName,
        supportReason: candidate.supportReason,
        notes: candidate.notes,
        fromPosCodeId: candidate.posCodeId,
        fromPosCodeName: candidate.posCodeName || candidate.position,
        fromPosition: candidate.position,
        fromPositionNumber: candidate.positionNumber,
        fromUnit: candidate.unit,
        fromActingAs: candidate.actingAs,
        toPosCodeId: targetNode.toPosCodeId,
        toPosCodeName: targetNode.toPosCodeName,
        toPosition: targetNode.toPosition,
        toPositionNumber: targetNode.toPositionNumber,
        toUnit: targetNode.toUnit,
        toActingAs: targetNode.toActingAs,
        fromRankLevel: candidate.rankLevel,
        toRankLevel: targetNode.toRankLevel,
        isPromotionValid: true,
      };

      onInsertNode(newNode, insertBeforeNodeId);
      setInsertBeforeNodeId(null);
      setShowCandidateSelector(false);
      return;
    }

    // การเพิ่มแบบปกติ (ต่อท้าย)
    const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
    const isLastNodePlaceholder = lastNode?.isPlaceholder === true;
    
    const newNode: ChainNode = {
      id: `node-${Date.now()}`,
      nodeOrder: nodes.length + 1,
      personnelId: candidate.id,
      noId: candidate.noId,
      nationalId: candidate.nationalId,
      fullName: candidate.fullName,
      rank: candidate.rank,
      seniority: candidate.seniority,
      birthDate: candidate.birthDate,
      age: candidate.age,
      education: candidate.education,
      lastAppointment: candidate.lastAppointment,
      currentRankSince: candidate.currentRankSince,
      enrollmentDate: candidate.enrollmentDate,
      retirementDate: candidate.retirementDate,
      yearsOfService: candidate.yearsOfService,
      trainingLocation: candidate.trainingLocation,
      trainingCourse: candidate.trainingCourse,
      supporterName: candidate.supporterName,
      supportReason: candidate.supportReason,
      notes: candidate.notes,
      fromPosCodeId: candidate.posCodeId,
      fromPosCodeName: candidate.posCodeName || candidate.position,
      fromPosition: candidate.position,
      fromPositionNumber: candidate.positionNumber,
      fromUnit: candidate.unit,
      fromActingAs: candidate.actingAs,
      // ถ้า node ก่อนหน้าเป็น placeholder ให้ toPosition และ toUnit เป็นค่าว่าง
      toPosCodeId: nodes.length === 0 
        ? startingPersonnel?.posCodeId || 0 
        : isLastNodePlaceholder 
          ? 0 
          : (lastNode?.fromPosCodeId || 0),
      toPosCodeName: nodes.length === 0 
        ? startingPersonnel?.posCodeName || startingPersonnel?.position 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromPosCodeName,
      toPosition: nodes.length === 0 
        ? startingPersonnel?.position || '' 
        : isLastNodePlaceholder 
          ? '' 
          : (lastNode?.fromPosition || ''),
      toPositionNumber: nodes.length === 0 
        ? (startingPersonnel?.positionNumber || undefined) 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromPositionNumber,
      // Node 1: ไปหน่วยปลายทาง, Node 2+: ไปหน่วยของ node ก่อนหน้า (chain), แต่ถ้า node ก่อนหน้าเป็น placeholder ให้เป็นค่าว่าง
      toUnit: nodes.length === 0 
        ? (destinationUnit || startingPersonnel?.unit || '') 
        : isLastNodePlaceholder 
          ? '' 
          : (lastNode?.fromUnit || ''),
      toActingAs: nodes.length === 0 
        ? (startingPersonnel?.actingAs || undefined) 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromActingAs,
      fromRankLevel: candidate.rankLevel,
      toRankLevel: nodes.length === 0 ? getRankLevelByPosCode(startingPersonnel?.posCodeId || 0) : (lastNode?.fromRankLevel || 0),
      isPromotionValid: true,
    };

    onAddNode(newNode);
    setShowCandidateSelector(false);
  };

  const handleShowPersonnelDetail = async (node: ChainNode) => {
    const prefill = {
      id: node.personnelId,
      posCodeId: node.fromPosCodeId,
      posCodeMaster: node.fromPosCodeName ? { id: node.fromPosCodeId, name: node.fromPosCodeName } : null,
      position: node.fromPosition,
      positionNumber: node.fromPositionNumber || null,
      unit: node.fromUnit,
      rank: node.rank,
      fullName: node.fullName,
      nationalId: node.nationalId,
      seniority: node.seniority || null,
      actingAs: node.fromActingAs || null,
      age: null,
      education: null,
      birthDate: null,
      lastAppointment: null,
      currentRankSince: null,
      enrollmentDate: null,
      retirementDate: null,
      yearsOfService: null,
      trainingLocation: null,
      trainingCourse: null,
      notes: node.notes || null,
    };
    setSelectedPersonnel(prefill);
    setShowPersonnelModal(true);

    if (!node.personnelId) return;
    try {
      setPersonnelModalLoading(true);
      const res = await fetch(`/api/police-personnel/${node.personnelId}`);
      if (!res.ok) throw new Error('โหลดข้อมูลบุคลากรไม่สำเร็จ');
      const json = await res.json();
      const p = json?.data || {};
      const full = {
        id: p.id,
        noId: p.noId ?? null,
        posCodeId: p.posCodeId ?? null,
        posCodeMaster: p.posCodeMaster ?? null,
        position: p.position ?? null,
        positionNumber: p.positionNumber ?? null,
        unit: p.unit ?? null,
        rank: p.rank ?? null,
        fullName: p.fullName ?? null,
        nationalId: p.nationalId ?? null,
        age: p.age ?? null,
        seniority: p.seniority ?? null,
        education: p.education ?? null,
        birthDate: p.birthDate ?? null,
        lastAppointment: p.lastAppointment ?? null,
        currentRankSince: p.currentRankSince ?? null,
        enrollmentDate: p.enrollmentDate ?? null,
        retirementDate: p.retirementDate ?? null,
        yearsOfService: p.yearsOfService ?? null,
        actingAs: p.actingAs ?? null,
        trainingLocation: p.trainingLocation ?? null,
        trainingCourse: p.trainingCourse ?? null,
        notes: p.notes ?? null,
        supporterName: p.supporterName ?? null,
        supportReason: p.supportReason ?? null,
      };
      setSelectedPersonnel(full);
    } catch (e: any) {
      toast.error(e?.message || 'ไม่สามารถดึงข้อมูลบุคลากรได้');
    } finally {
      setPersonnelModalLoading(false);
    }
  };

  const handleInsertBefore = (nodeId: string) => {
    if (!onInsertNode) return;
    setInsertBeforeNodeId(nodeId);
    setShowCandidateSelector(true);
  };

  // Handle row selection - คลิกไปเรื่อยๆ กลายเป็น multiple
  const handleRowClick = (nodeId: string, event: React.MouseEvent) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(nodeId)) {
      // ถ้าเลือกอยู่แล้ว ให้ยกเลิกการเลือก
      newSelected.delete(nodeId);
    } else {
      // ถ้ายังไม่เลือก ให้เพิ่มเข้าไป (multiple selection)
      newSelected.add(nodeId);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === nodes.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(nodes.map((n: ChainNode) => n.id)));
    }
  };

  // Handle delete with confirmation
  const handleDeleteClick = (nodeId: string) => {
    setNodeToDelete(nodeId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (nodeToDelete) {
      onRemoveNode(nodeToDelete);
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeToDelete);
        return newSet;
      });
    }
    setDeleteConfirmOpen(false);
    setNodeToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setNodeToDelete(null);
  };

  // Handler สำหรับจัดเรียงลำดับ - ใช้กับ drag drop hook
  const handleReorder = (sourceIndex: number, targetIndex: number, nodeId: string) => {
    if (!onReorder) return;
    
    // สร้าง array ใหม่
    const newNodes = [...nodes];
    const [removed] = newNodes.splice(sourceIndex, 1);
    newNodes.splice(targetIndex, 0, removed);

    // อัปเดต nodeOrder และ toUnit
    const updatedNodes = newNodes.map((node, index) => {
      const updates: any = {
        ...node,
        nodeOrder: index + 1,
      };
      
      // อัพเดท toUnit ตาม chain
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง (ไม่มีตำแหน่งเฉพาะ)
        updates.toPosition = '';
        updates.toUnit = destinationUnit || node.toUnit;
        updates.toPosCodeId = 0;
        updates.toPosCodeName = undefined;
        updates.toPositionNumber = undefined;
        updates.toActingAs = undefined;
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า
        const prevNode = newNodes[index - 1];
        if (prevNode.isPlaceholder) {
          // ถ้า node ก่อนหน้าเป็น placeholder ยังไม่รู้ว่าจะไปไหน ให้ทุกอย่างเป็นค่าว่าง
          updates.toPosition = '';
          updates.toUnit = '';
          updates.toPosCodeId = 0;
          updates.toPosCodeName = undefined;
          updates.toPositionNumber = undefined;
          updates.toActingAs = undefined;
        } else {
          // Node ก่อนหน้าเป็น node ปกติ ให้ไปตำแหน่งและหน่วยของ node ก่อนหน้า
          updates.toPosition = prevNode.fromPosition;
          updates.toUnit = prevNode.fromUnit;
          updates.toPosCodeId = prevNode.fromPosCodeId;
          updates.toPosCodeName = prevNode.fromPosCodeName;
          updates.toPositionNumber = prevNode.fromPositionNumber;
          updates.toActingAs = prevNode.fromActingAs;
        }
      }
      
      return updates;
    });

    // อัปเดตทันทีหลัง clear drag state
    onReorder(updatedNodes);
    toast.success('เปลี่ยนลำดับสำเร็จ');
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            🔗 ลูกโซ่การย้ายบุคลากร
          </Typography>
          {nodes.length > 0 && (
            <Chip 
              label={`${nodes.length} ขั้นตอน`} 
              sx={{ 
                bgcolor: 'white',
                color: 'primary.main',
                fontWeight: 700,
              }}
            />
          )}
        </Box>

        {/* Table */}
        <TableContainer>
          <Table sx={{ tableLayout: 'fixed' }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ width: '40px', fontWeight: 700, py: 1 }} padding="checkbox">
                  <IconButton size="small" onClick={handleSelectAll} sx={{ p: 0.5 }}>
                    {selectedRows.size === nodes.length && nodes.length > 0 ? (
                      <CheckBoxIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    ) : (
                      <CheckBoxOutlineBlankIcon sx={{ fontSize: 20 }} />
                    )}
                  </IconButton>
                </TableCell>
                <TableCell sx={{ width: '40px', fontWeight: 700, py: 1 }} />
                <TableCell sx={{ width: '60px', fontWeight: 700, py: 1, fontSize: '0.875rem' }}>ลำดับ</TableCell>
                <TableCell sx={{ width: '180px', fontWeight: 700, py: 1, fontSize: '0.875rem' }}>ยศ/ชื่อ-สกุล</TableCell>
                <TableCell sx={{ width: '180px', fontWeight: 700, py: 1, fontSize: '0.875rem' }}>จากตำแหน่ง</TableCell>
                <TableCell sx={{ width: '120px', fontWeight: 700, py: 1, fontSize: '0.875rem' }}>จากหน่วย</TableCell>
                <TableCell sx={{ width: '180px', fontWeight: 700, py: 1, fontSize: '0.875rem', color: 'success.main' }}>→ ไปตำแหน่ง</TableCell>
                <TableCell sx={{ width: '120px', fontWeight: 700, py: 1, fontSize: '0.875rem', color: 'success.main' }}>→ ไปหน่วย</TableCell>
                <TableCell sx={{ width: '120px', fontWeight: 700, py: 1, fontSize: '0.875rem' }} align="center">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      ยังไม่มีข้อมูล กรุณาเพิ่มบุคลากร
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                nodes.map((node: ChainNode, index: number) => {
                  const isSelected = selectedRows.has(node.id);
                  const dragStyles = dragDropHighlight.getDragDropStyles(node.id, 'create-chain', index, theme);
                  
                  // ถ้าเป็น Placeholder แสดง row พิเศษ
                  if (node.isPlaceholder) {
                    return (
                      <TableRow
                        key={node.id}
                        draggable
                        onDragStart={(e: React.DragEvent) => dragDropHighlight.handleDragStart(e, 'create-chain', node.id, index)}
                        onDragOver={(e: React.DragEvent) => dragDropHighlight.handleDragOver(e, 'create-chain', index)}
                        onDragLeave={dragDropHighlight.handleDragLeave}
                        onDrop={(e: React.DragEvent) => dragDropHighlight.handleDrop(e, 'create-chain', index, handleReorder)}
                        onDragEnd={dragDropHighlight.handleDragEnd}
                        sx={{
                          ...dragDropHighlight.getDragDropStyles(node.id, 'create-chain', index, theme),
                          bgcolor: 'grey.50',
                          borderLeft: '4px dashed',
                          borderColor: 'warning.main',
                          cursor: 'grab',
                          '&:active': {
                            cursor: 'grabbing',
                          },
                        }}
                      >
                        <TableCell sx={{ py: 1 }} padding="checkbox" />
                        <TableCell sx={{ py: 1 }}>
                          <DragIndicatorIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Chip label={node.nodeOrder} color="warning" size="small" sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }} />
                        </TableCell>
                        <TableCell colSpan={3} sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.875rem' }}>
                              📋 ตำแหน่งว่าง - รอการเลือกบุคลากร
                            </Typography>
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              startIcon={<AddIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setInsertBeforeNodeId(node.id);
                                setShowCandidateSelector(true);
                              }}
                              sx={{ fontSize: '0.75rem', height: 26 }}
                            >
                              เลือกบุคลากร
                            </Button>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'warning.50', py: 1 }}>
                          <Box>
                            {node.toPosCodeName && (
                              <Chip label={formatPosCode(node.toPosCodeId, node.toPosCodeName)} size="small" color="warning" sx={{ fontSize: '0.65rem', height: 18, mb: 0.25 }} />
                            )}
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                              {node.toPosition}
                            </Typography>
                            {node.toPositionNumber && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                ({node.toPositionNumber})
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'warning.50', py: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{node.toUnit}</Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="ลบตำแหน่งว่าง">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteClick(node.id); }} color="error" sx={{ p: 0.5 }}>
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  // Row ปกติสำหรับบุคลากร
                  return (
                  <TableRow
                    key={node.id}
                    draggable
                    onClick={(e) => handleRowClick(node.id, e)}
                    onDragStart={(e: React.DragEvent) => dragDropHighlight.handleDragStart(e, 'create-chain', node.id, index)}
                    onDragOver={(e: React.DragEvent) => dragDropHighlight.handleDragOver(e, 'create-chain', index)}
                    onDragLeave={dragDropHighlight.handleDragLeave}
                    onDrop={(e: React.DragEvent) => dragDropHighlight.handleDrop(e, 'create-chain', index, handleReorder)}
                    onDragEnd={dragDropHighlight.handleDragEnd}
                    selected={isSelected}
                    sx={{
                      ...dragStyles,
                      bgcolor: isSelected ? 'primary.100' : dragStyles.bgcolor,
                      '&:hover': { 
                        ...dragStyles['&:hover'],
                        bgcolor: isSelected ? 'primary.200' : dragStyles['&:hover']?.bgcolor,
                      },
                    }}
                  >
                    <TableCell sx={{ py: 1 }} padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRowClick(node.id, e); }} sx={{ p: 0.5 }}>
                        {isSelected ? (
                          <CheckBoxIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                        ) : (
                          <CheckBoxOutlineBlankIcon sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <DragIndicatorIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Chip label={node.nodeOrder} color="primary" size="small" sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }} />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {node.toPosCodeId > 0 && node.fromPosCodeId > 0 && node.toPosCodeId < node.fromPosCodeId && (
                          <Tooltip title="เลื่อนตำแหน่ง">
                            <TrendingUpIcon sx={{ color: 'success.main', fontSize: 18 }} />
                          </Tooltip>
                        )}
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem', lineHeight: 1.3 }}>
                            {node.rank} {node.fullName}
                          </Typography>
                          {node.seniority && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              อาวุโส {node.seniority}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Box>
                        {node.fromPosCodeName && (
                          <Chip label={formatPosCode(node.fromPosCodeId, node.fromPosCodeName)} size="small" sx={{ fontSize: '0.65rem', height: 18, mb: 0.25 }} />
                        )}
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                          {node.fromPosition}
                        </Typography>
                        {node.fromPositionNumber && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            ({node.fromPositionNumber})
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{node.fromUnit}</Typography>
                    </TableCell>
                    <TableCell sx={{ bgcolor: 'success.50', py: 1 }}>
                      <Box>
                        {node.toPosCodeName && (
                          <Chip label={formatPosCode(node.toPosCodeId, node.toPosCodeName)} size="small" color="success" sx={{ fontSize: '0.65rem', height: 18, mb: 0.25 }} />
                        )}
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
                          {node.toPosition}
                        </Typography>
                        {node.toPositionNumber && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            ({node.toPositionNumber})
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ bgcolor: 'success.50', py: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{node.toUnit}</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {onInsertNode && (
                          <Tooltip title="แทรกบุคลากร">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleInsertBefore(node.id); }} color="primary" sx={{ p: 0.5 }}>
                              <AddIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onInsertPlaceholder && !isCompleted && (
                          <Tooltip title="แทรกตำแหน่งว่าง">
                            <IconButton 
                              size="small" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onInsertPlaceholder(node.id); 
                              }} 
                              sx={{ 
                                p: 0.5,
                                color: 'warning.main',
                                border: '1px dashed',
                                borderColor: 'warning.main',
                                borderRadius: 0.5,
                                '&:hover': { bgcolor: 'warning.50' }
                              }}
                            >
                              <AddIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="ดูข้อมูล">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleShowPersonnelDetail(node); }} color="info" sx={{ p: 0.5 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteClick(node.id); }} color="error" sx={{ p: 0.5 }}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add Buttons */}
        {canAddMore && (
          <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCandidateSelector(true)}
              disabled={!destinationUnit || destinationUnit.trim() === ''}
              fullWidth
              size="medium"
              sx={{ fontWeight: 700, py: 0.75 }}
            >
              {nodes.length === 0 ? 'เพิ่มบุคลากรคนแรก' : 'เพิ่มบุคลากรคนถัดไป'}
            </Button>
            {onAddPlaceholder && !isCompleted && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onAddPlaceholder}
                disabled={!destinationUnit || destinationUnit.trim() === ''}
                size="medium"
                sx={{ 
                  fontWeight: 700, 
                  py: 0.75, 
                  minWidth: '180px',
                  borderStyle: 'dashed',
                  borderWidth: 2,
                }}
              >
                เพิ่มตำแหน่งว่าง
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {/* Candidate Selector */}
      <CandidateSelector
        open={showCandidateSelector}
        onClose={() => {
          setShowCandidateSelector(false);
          setInsertBeforeNodeId(null);
        }}
        targetRankLevel={currentVacantRankLevel || 0}
        onSelect={handleSelectCandidate}
        selectedPersonnelIds={[
          ...(startingPersonnel?.id ? [startingPersonnel.id] : []),
          ...nodes.map((n: ChainNode) => n.personnelId).filter(Boolean) as string[]
        ]}
        isInsertMode={insertBeforeNodeId !== null}
        vacantPosition={
          insertBeforeNodeId !== null
            ? (() => {
                const targetNode = nodes.find((n: ChainNode) => n.id === insertBeforeNodeId);
                return targetNode ? {
                  id: targetNode.id,
                  posCodeId: targetNode.toPosCodeId,
                  posCodeName: targetNode.toPosCodeName,
                  position: targetNode.toPosition,
                  unit: targetNode.toUnit,
                  actingAs: targetNode.toActingAs,
                } : null;
              })()
            : nodes.length === 0
              ? startingPersonnel
              : {
                  id: nodes[nodes.length - 1].id,
                  posCodeId: nodes[nodes.length - 1].fromPosCodeId,
                  posCodeName: nodes[nodes.length - 1].fromPosCodeName,
                  position: nodes[nodes.length - 1].fromPosition,
                  unit: nodes[nodes.length - 1].fromUnit,
                  actingAs: nodes[nodes.length - 1].fromActingAs,
                }
        }
      />

      {/* Personnel Detail Modal */}
      <PersonnelDetailModal
        open={showPersonnelModal}
        onClose={() => setShowPersonnelModal(false)}
        personnel={selectedPersonnel}
        loading={personnelModalLoading}
        onClearData={() => setSelectedPersonnel(null)}
        title="รายละเอียดบุคลากร"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          ⚠️ ยืนยันการลบ
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            คุณแน่ใจหรือไม่ว่าต้องการลบบุคลากรคนนี้ออกจากลูกโซ่?
            {nodeToDelete && (() => {
              const node = nodes.find((n: ChainNode) => n.id === nodeToDelete);
              return node ? (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {node.toPosCodeId > 0 && node.fromPosCodeId > 0 && node.toPosCodeId < node.fromPosCodeId && (
                      <TrendingUpIcon sx={{ color: 'success.main', fontSize: 18 }} />
                    )}
                    <Typography variant="body2" component="div" fontWeight={600} sx={{ color: 'error.dark' }}>
                      {node.rank} {node.fullName}
                    </Typography>
                  </Box>
                  <Typography variant="caption" component="div" color="text.secondary">
                    ลำดับที่ {node.nodeOrder}
                  </Typography>
                </Box>
              ) : null;
            })()}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleDeleteCancel} variant="outlined">
            ยกเลิก
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" autoFocus>
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
