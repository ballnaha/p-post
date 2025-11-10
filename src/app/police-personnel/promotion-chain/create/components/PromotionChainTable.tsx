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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  InfoOutlined as InfoOutlinedIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import CandidateSelector from './CandidateSelector';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import { useToast } from '@/hooks/useToast';

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

interface VacantPosition {
  id: string;
  posCodeId: number;
  posCodeName?: string;
  position: string;
  unit: string;
  positionNumber?: string;
  actingAs?: string;
}

interface PromotionChainTableProps {
  vacantPosition: VacantPosition | null;
  nodes: ChainNode[];
  onAddNode: (node: ChainNode) => void;
  onRemoveNode: (nodeId: string) => void;
  onInsertNode?: (node: ChainNode, beforeNodeId: string) => void;
  onReorder?: (nodes: ChainNode[]) => void;
}

export default function PromotionChainTable({
  vacantPosition,
  nodes,
  onAddNode,
  onRemoveNode,
  onInsertNode,
  onReorder,
}: PromotionChainTableProps) {
  const [showCandidateSelector, setShowCandidateSelector] = useState(false);
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<any | null>(null);
  const [personnelModalLoading, setPersonnelModalLoading] = useState(false);
  const [insertBeforeNodeId, setInsertBeforeNodeId] = useState<string | null>(null);
  const [draggedRow, setDraggedRow] = useState<{ nodeId: string; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const toast = useToast();

  const getRankLevelByPosCode = (posCodeId: number): number => {
    return posCodeId;
  };

  const getCurrentVacantRankLevel = (): number | null => {
    if (!vacantPosition && nodes.length === 0) return null;
    if (nodes.length === 0) {
      return getRankLevelByPosCode(vacantPosition?.posCodeId || 0);
    }
    const lastNode = nodes[nodes.length - 1];
    return lastNode.fromRankLevel;
  };

  const currentVacantRankLevel = getCurrentVacantRankLevel();
  const canAddMore = currentVacantRankLevel !== null;

  const handleSelectCandidate = (candidate: any) => {
    if (nodes.some(n => n.personnelId === candidate.id)) {
      toast.warning('ไม่สามารถเลือกบุคคลเดิมซ้ำได้');
      return;
    }

    // ถ้ากำลังแทรก
    if (insertBeforeNodeId && onInsertNode) {
      const targetNodeIndex = nodes.findIndex(n => n.id === insertBeforeNodeId);
      if (targetNodeIndex === -1) {
        toast.error('ไม่พบตำแหน่งที่ต้องการแทรก');
        return;
      }

      const targetNode = nodes[targetNodeIndex];
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
      toPosCodeId: nodes.length === 0 ? vacantPosition?.posCodeId || 0 : nodes[nodes.length - 1].fromPosCodeId,
      toPosCodeName: nodes.length === 0 ? vacantPosition?.posCodeName || vacantPosition?.position : nodes[nodes.length - 1].fromPosCodeName,
      toPosition: nodes.length === 0 ? vacantPosition?.position || '' : nodes[nodes.length - 1].fromPosition,
      toPositionNumber: nodes.length === 0 ? (vacantPosition?.positionNumber || undefined) : nodes[nodes.length - 1].fromPositionNumber,
      toUnit: nodes.length === 0 ? vacantPosition?.unit || '' : nodes[nodes.length - 1].fromUnit,
      toActingAs: nodes.length === 0 ? (vacantPosition?.actingAs || undefined) : nodes[nodes.length - 1].fromActingAs,
      fromRankLevel: candidate.rankLevel,
      toRankLevel: nodes.length === 0 ? getRankLevelByPosCode(vacantPosition?.posCodeId || 0) : nodes[nodes.length - 1].fromRankLevel,
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, nodeId: string, index: number) => {
    setDraggedRow({ nodeId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // ป้องกันการ setState บ่อยเกินไป ถ้าเป็น index เดิมก็ไม่ต้อง update
    if (dragOverIndex !== targetIndex) {
      setDragOverIndex(targetIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // เช็คว่า mouse ออกจาก row จริงๆ หรือเปล่า (ไม่ใช่แค่เข้า child element)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedRow || !onReorder) return;
    
    const sourceIndex = draggedRow.index;
    
    // รีเซ็ต drag state ก่อน
    setDraggedRow(null);
    setDragOverIndex(null);
    
    if (sourceIndex === targetIndex) {
      return;
    }

    // สร้าง array ใหม่
    const newNodes = [...nodes];
    const [removed] = newNodes.splice(sourceIndex, 1);
    newNodes.splice(targetIndex, 0, removed);

    // อัปเดต nodeOrder
    const updatedNodes = newNodes.map((node, index) => ({
      ...node,
      nodeOrder: index + 1,
    }));

    // อัปเดตทันทีหลัง clear drag state
    onReorder(updatedNodes);
  };

  const handleDragEnd = () => {
    setDraggedRow(null);
    setDragOverIndex(null);
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            🔗 ลูกโซ่การเลื่อนตำแหน่ง
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
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      ยังไม่มีข้อมูล กรุณาเพิ่มบุคลากร
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                nodes.map((node, index) => {
                  const isDragging = draggedRow?.nodeId === node.id;
                  const isDropTarget = dragOverIndex === index && !isDragging;
                  
                  return (
                  <TableRow
                    key={node.id}
                    draggable
                    onDragStart={(e: React.DragEvent) => handleDragStart(e, node.id, index)}
                    onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e: React.DragEvent) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    sx={{
                      cursor: isDragging ? 'grabbing' : 'grab',
                      opacity: isDragging ? 0.4 : 1,
                      bgcolor: isDropTarget ? 'primary.50' : 'transparent',
                      position: 'relative',
                      userSelect: 'none',
                      pointerEvents: 'auto',
                      outline: isDropTarget ? '2px dashed #667eea' : 'none',
                      outlineOffset: '-2px',
                      '&:hover': { 
                        bgcolor: isDragging ? 'transparent' : (isDropTarget ? 'primary.100' : 'action.hover'),
                      },
                    }}
                  >
                    <TableCell sx={{ py: 1 }}>
                      <DragIndicatorIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Chip label={node.nodeOrder} color="primary" size="small" sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }} />
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem', lineHeight: 1.3 }}>
                        {node.rank} {node.fullName}
                      </Typography>
                      {node.seniority && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          อาวุโส {node.seniority}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <Box>
                        {node.fromPosCodeName && (
                          <Chip label={node.fromPosCodeName} size="small" sx={{ fontSize: '0.65rem', height: 18, mb: 0.25 }} />
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
                          <Chip label={node.toPosCodeName} size="small" color="success" sx={{ fontSize: '0.65rem', height: 18, mb: 0.25 }} />
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
                    <TableCell align="center" sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                        {onInsertNode && (
                          <Tooltip title="แทรกก่อนหน้า">
                            <IconButton size="small" onClick={() => handleInsertBefore(node.id)} color="primary" sx={{ p: 0.5 }}>
                              <AddIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="ดูข้อมูล">
                          <IconButton size="small" onClick={() => handleShowPersonnelDetail(node)} color="info" sx={{ p: 0.5 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ลบ">
                          <IconButton size="small" onClick={() => onRemoveNode(node.id)} color="error" sx={{ p: 0.5 }}>
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

        {/* Add Button */}
        {canAddMore && (
          <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCandidateSelector(true)}
              fullWidth
              size="medium"
              sx={{ fontWeight: 700, py: 0.75 }}
            >
              {nodes.length === 0 ? 'เพิ่มบุคลากรคนแรก' : 'เพิ่มบุคลากรคนถัดไป'}
            </Button>
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
        selectedPersonnelIds={nodes.map(n => n.personnelId).filter(Boolean) as string[]}
        isInsertMode={insertBeforeNodeId !== null}
        vacantPosition={
          insertBeforeNodeId !== null
            ? (() => {
                const targetNode = nodes.find(n => n.id === insertBeforeNodeId);
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
              ? vacantPosition
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
    </Box>
  );
}
