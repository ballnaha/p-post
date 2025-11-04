'use client';
import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Divider, Stack, Chip } from '@mui/material';
import { Add as AddIcon, ArrowDownward as ArrowDownIcon , ArrowForward as ArrowForwardIcon} from '@mui/icons-material';
import ChainNodeCard from './ChainNodeCard';
import CandidateSelector from './CandidateSelector';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

// Types - ตรงกับ PolicePersonnel schema
interface ChainNode {
  id: string;
  nodeOrder: number;
  personnelId?: string; // อ้างอิง police_personnel.id
  
  // ข้อมูลบุคคล (Person Information)
  nationalId: string; // police_personnel.nationalId
  fullName: string; // police_personnel.fullName
  rank: string; // police_personnel.rank
  seniority?: string; // police_personnel.seniority
  
  // ข้อมูลตำแหน่งเดิม (From Position)
  fromPosCodeId: number; // police_personnel.posCodeId
  fromPosCodeName?: string; // posCodeMaster.name
  fromPosition: string; // police_personnel.position
  fromPositionNumber?: string; // police_personnel.positionNumber
  fromUnit: string; // police_personnel.unit
  actingAs?: string; // police_personnel.actingAs - ทำหน้าที่
  
  // ข้อมูลตำแหน่งใหม่ (To Position)
  toPosCodeId: number;
  toPosCodeName?: string;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  toActingAs?: string; // ทำหน้าที่ของตำแหน่งปลายทาง
  
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
  actingAs?: string; // police_personnel.actingAs - ทำหน้าที่
  requestedPositionId?: number;
  requestedPosition?: string;
  positionNumber?: string; // police_personnel.positionNumber
}

interface PromotionChainBuilderProps {
  vacantPosition: VacantPosition | null;
  nodes: ChainNode[];
  onAddNode: (node: ChainNode) => void;
  onRemoveNode: (nodeId: string) => void;
}

export default function PromotionChainBuilder({
  vacantPosition,
  nodes,
  onAddNode,
  onRemoveNode,
}: PromotionChainBuilderProps) {
  const [showCandidateSelector, setShowCandidateSelector] = useState(false);
  const [showPersonnelModal, setShowPersonnelModal] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<any | null>(null);
  const [personnelModalLoading, setPersonnelModalLoading] = useState(false);
  const toast = useToast();

  // ดึงตัวอักษรย่อพื้นที่จากหน่วย เช่น บก.น.2 -> น
  const getAreaTag = (unit?: string) => {
    if (!unit) return '-';
    const m = unit.match(/บก\.(.)/);
    if (m && m[1]) return m[1];
    return unit.charAt(0);
  };

  // คำนวณตำแหน่งว่างปัจจุบันที่ต้องหาคนมาแทน
  const getCurrentVacantRankLevel = (): number | null => {
    if (!vacantPosition && nodes.length === 0) return null;

    if (nodes.length === 0) {
      // ขั้นแรก: หาคนมาแทนตำแหน่งว่างต้นทาง
      return getRankLevelByPosCode(vacantPosition?.posCodeId || 0);
    }

    // ขั้นถัดไป: หาคนมาแทนตำแหน่งที่เพิ่งว่าง (ตำแหน่งเดิมของคนที่เลื่อนไป)
    const lastNode = nodes[nodes.length - 1];
    return lastNode.fromRankLevel;
  };

  const getRankLevelByPosCode = (posCodeId: number): number => {
    // ใช้ posCodeId จาก pos_code_master เป็นตัวกำหนดระดับโดยตรง
    return posCodeId;
  };

  const getRankNameByPosCodeId = (posCodeId: number): string => {
    // ใช้ position name จาก vacantPosition หรือ nodes
    if (vacantPosition?.posCodeId === posCodeId) {
      return vacantPosition.position;
    }
    // ค้นหาจาก nodes
    const node = nodes.find(n => n.fromPosCodeId === posCodeId || n.toPosCodeId === posCodeId);
    if (node) {
      return node.fromPosCodeId === posCodeId ? node.fromPosition : node.toPosition;
    }
    return `PosCode ${posCodeId}`;
  };

  const currentVacantRankLevel = getCurrentVacantRankLevel();
  const canAddMore = currentVacantRankLevel !== null;

  const handleSelectCandidate = (candidate: any) => {
    // Prevent selecting the same person more than once
    if (nodes.some(n => n.personnelId === candidate.id)) {
      toast.warning('ไม่สามารถเลือกบุคคลเดิมซ้ำได้');
      return;
    }
    const newNode: ChainNode = {
      id: `node-${Date.now()}`,
      nodeOrder: nodes.length + 1,
      personnelId: candidate.id,
      nationalId: candidate.nationalId,
      fullName: candidate.fullName,
      rank: candidate.rank,
      seniority: candidate.seniority,
      fromPosCodeId: candidate.posCodeId,
      fromPosCodeName: candidate.posCodeName || candidate.position,
      fromPosition: candidate.position,
      fromPositionNumber: candidate.positionNumber,
      fromUnit: candidate.unit,
      actingAs: candidate.actingAs,
      toPosCodeId: nodes.length === 0 ? vacantPosition?.posCodeId || 0 : nodes[nodes.length - 1].fromPosCodeId,
      toPosCodeName: nodes.length === 0 ? vacantPosition?.posCodeName || vacantPosition?.position : nodes[nodes.length - 1].fromPosCodeName,
      toPosition: nodes.length === 0 ? vacantPosition?.position || '' : nodes[nodes.length - 1].fromPosition,
      toPositionNumber: nodes.length === 0 ? (vacantPosition?.positionNumber || undefined) : nodes[nodes.length - 1].fromPositionNumber,
      toUnit: nodes.length === 0 ? vacantPosition?.unit || '' : nodes[nodes.length - 1].fromUnit,
      toActingAs: nodes.length === 0 ? (vacantPosition?.actingAs || undefined) : nodes[nodes.length - 1].actingAs,
      fromRankLevel: candidate.rankLevel,
      toRankLevel: nodes.length === 0 ? getRankLevelByPosCode(vacantPosition?.posCodeId || 0) : nodes[nodes.length - 1].fromRankLevel,
      isPromotionValid: true,
    };

    onAddNode(newNode);
    setShowCandidateSelector(false);
  };


  // Open personnel detail modal for a node's person
  const handleShowPersonnelDetail = async (node: ChainNode) => {
    // Prefill with data from node for instant content, then fetch to complete
    const prefill = {
      id: node.personnelId,
      posCodeId: node.fromPosCodeId,
      posCodeMaster: node.fromPosCodeName
        ? { id: node.fromPosCodeId, name: node.fromPosCodeName }
        : null,
      position: node.fromPosition,
      positionNumber: node.fromPositionNumber || null,
      unit: node.fromUnit,
      rank: node.rank,
      fullName: node.fullName,
      nationalId: node.nationalId,
      seniority: node.seniority || null,
      actingAs: node.actingAs || null,
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
      notes: null,
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
      };
      setSelectedPersonnel(full);
    } catch (e: any) {
      toast.error(e?.message || 'ไม่สามารถดึงข้อมูลบุคลากรได้');
    } finally {
      setPersonnelModalLoading(false);
    }
  };

  return (
    <Box>
      {/* Chain Visualization */}
      <Paper 
        elevation={3}
        sx={{ 
          p: 4, 
          mb: 3,
          borderRadius: 3,
          bgcolor: 'background.paper',
          borderTop: 4,
          borderColor: 'primary.main',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, color: 'primary.main' }}>
              🔗 ลูกโซ่การเลื่อนตำแหน่ง
            </Typography>
            <Typography variant="caption" color="text.secondary">
              สร้างลำดับการเลื่อนตำแหน่งแบบเชื่อมโยง
            </Typography>
          </Box>
          {nodes.length === 0 ? (
            <Chip 
              label="🎯 เริ่มต้น" 
              size="medium"
              sx={{ 
                fontWeight: 600,
                bgcolor: 'grey.100',
                fontSize: '0.875rem',
              }}
            />
          ) : (
            <Chip 
              label={`✅ ${nodes.length} ขั้นตอน`} 
              size="medium"
              sx={{ 
                fontWeight: 700,
                bgcolor: 'success.main',
                color: 'white',
                fontSize: '0.875rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            />
          )}
        </Box>

        {/* Nodes Flow */}
        <Stack spacing={1.5}>
          {nodes.map((node, index) => (
            <Box key={node.id}>
              {/* Flow Indicator - Start */}
              <ChainNodeCard
                node={node}
                onRemove={() => onRemoveNode(node.id)}
                isLastNode={index === nodes.length - 1}
                onShowDetail={() => handleShowPersonnelDetail(node)}
              />

              {/* Arrow between nodes */}
              {index < nodes.length - 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Chip 
                    icon={<Box sx={{ fontSize: '1rem' }}>↓</Box>}
                    label="ตำแหน่งถัดไป" 
                    size="medium"
                    sx={{ 
                      bgcolor: 'warning.50',
                      color: 'warning.main',
                      border: '1px solid',
                      borderColor: 'warning.main',
                      fontWeight: 600,
                      
                    }}
                  />
                </Box>
              )}
            </Box>
          ))}
        </Stack>

        {/* Add Next Node - Compact CTA */}
        {canAddMore && (
          <>
            {nodes.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Chip 
                  icon={<Box sx={{ fontSize: '1rem' }}>↓</Box>}
                  label="ตำแหน่งถัดไป" 
                  size="medium"
                  sx={{ 
                    bgcolor: 'warning.50',
                    color: 'warning.main',
                    border: '1px solid',
                    borderColor: 'warning.main',
                    fontWeight: 600,
                  }}
                />
              </Box>
            )}
            
            <Box sx={{ 
              p: 2, 
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'primary.main',
              bgcolor: 'primary.50',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                bgcolor: 'primary.100',
                borderColor: 'primary.dark',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.2)',
              },
            }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
              }}>
                
              </Box>
              
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography variant="body1" fontWeight={700} sx={{ color: 'text.primary', mb: 0.25 }}>
                  {nodes.length === 0
                    ? `เลือกคนมาแทนตำแหน่งว่าง:`
                    : `ตำแหน่งที่ว่าง:`}
                </Typography>

                {/* ข้อมูลตำแหน่งและหน่วย แสดง 2 บรรทัดแบบกระชับ */}
                {(() => {
                  const isNext = nodes.length > 0;
                  const posCodeName = isNext ? nodes[nodes.length - 1].fromPosCodeName : vacantPosition?.posCodeName;
                  const position = isNext ? nodes[nodes.length - 1].fromPosition : vacantPosition?.position;
                  const unit = isNext ? nodes[nodes.length - 1].fromUnit : vacantPosition?.unit;
                  const positionNumber = isNext ? nodes[nodes.length - 1].fromPositionNumber : vacantPosition?.positionNumber;
                  const actingAs = isNext ? nodes[nodes.length - 1].actingAs : vacantPosition?.actingAs;
                  const areaTag = getAreaTag(unit);

                  return (
                    <>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                        {posCodeName || '-'} • {position || '-'} {unit ? ` ${unit}` : ''}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', fontSize: '0.9rem' }}>
                        • {areaTag} • เลขตำแหน่ง {positionNumber || '-'} • ทำหน้าที่: {actingAs || '-'}
                      </Typography>
                    </>
                  );
                })()}
              </Box>
              
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => setShowCandidateSelector(true)}
                sx={{
                  fontWeight: 700,
                  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                  },
                }}
              >
                เลือกผู้สมัคร
              </Button>
            </Box>
          </>
        )}

        {!canAddMore && nodes.length > 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <Chip 
                icon={<Box sx={{ color: 'success.main' }}>✓</Box>}
                label="สมบูรณ์" 
                sx={{ 
                  bgcolor: 'success.50',
                  color: 'success.main',
                  border: '1px solid',
                  borderColor: 'success.main',
                  fontWeight: 700,
                }}
              />
            </Box>
            <Paper 
              elevation={2}
              sx={{ 
                p: 1.5, 
                bgcolor: 'success.50',
                borderRadius: 2, 
                border: '2px solid', 
                borderColor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              }}>
                ✅
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" color="success.main" fontWeight={700} sx={{ mb: 0.25 }}>
                  ลูกโซ่สมบูรณ์แล้ว!
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  จบที่ระดับ <strong>{getRankNameByPosCodeId(nodes[nodes.length - 1].fromRankLevel)}</strong>
                </Typography>
              </Box>
            </Paper>
          </>
        )}
      </Paper>

      {/* Summary - Compact */}
      {nodes.length > 0 && (
        <Paper 
          elevation={2}
          sx={{ 
            p: 1.5, 
            mb: 2, 
            borderRadius: 2,
            bgcolor: 'warning.50',
            border: '2px solid',
            borderColor: 'warning.main',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
            <Box sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'warning.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
            }}>
              📋
            </Box>
            <Typography variant="body1" fontWeight={700} sx={{ color: 'warning.dark' }}>
              สรุปลูกโซ่การเลื่อนตำแหน่ง
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1, 
            alignItems: 'flex-start',
            p: 1.25,
            bgcolor: 'white',
            borderRadius: 1,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
          }}>
            {nodes.map((node, index) => {
              const positionLabel = index === 0 
                ? vacantPosition?.position || '-'
                : nodes[index - 1].fromPosition;
              return (
                <React.Fragment key={node.id}>
                  {index > 0 && (
                    <ArrowForwardIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Chip 
                      label={positionLabel}
                      size="small"
                      sx={{ 
                        fontWeight: 700,
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontSize: '0.8rem',
                      }}
                    />
                    <Typography variant="body2" sx={{ mt: 0.25, fontSize: '0.8rem', color: 'text.primary', fontWeight: 600 }}>
                      - {node.rank} {node.fullName}
                    </Typography>
                  </Box>
                </React.Fragment>
              );
            })}
          </Box>
          {/* ย้ายปุ่มบันทึกไป footer ของหน้า create */}
        </Paper>
      )}

      {/* Candidate Selector Dialog */}
      <CandidateSelector
        open={showCandidateSelector}
        onClose={() => setShowCandidateSelector(false)}
        targetRankLevel={currentVacantRankLevel || 0}
        onSelect={handleSelectCandidate}
        selectedPersonnelIds={nodes.map(n => n.personnelId).filter(Boolean) as string[]}
        vacantPosition={
          nodes.length === 0
            ? vacantPosition
            : {
                id: nodes[nodes.length - 1].id,
                posCodeId: nodes[nodes.length - 1].fromPosCodeId,
                posCodeName: nodes[nodes.length - 1].fromPosCodeName,
                position: nodes[nodes.length - 1].fromPosition,
                unit: nodes[nodes.length - 1].fromUnit,
                actingAs: nodes[nodes.length - 1].actingAs,
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
