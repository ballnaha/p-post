'use client';
import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Divider, Stack, Chip } from '@mui/material';
import { Add as AddIcon, ArrowDownward as ArrowDownIcon } from '@mui/icons-material';
import ChainNodeCard from './ChainNodeCard';
import CandidateSelector from './CandidateSelector';

// Types
interface ChainNode {
  id: string;
  nodeOrder: number;
  personnelId?: string;
  nationalId: string;
  fullName: string;
  rank: string;
  seniority?: string;
  fromPosCodeId: number;
  fromPosition: string;
  fromPositionNumber?: string;
  fromUnit: string;
  toPosCodeId: number;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  fromRankLevel: number;
  toRankLevel: number;
  isPromotionValid: boolean;
}

interface VacantPosition {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  requestedPositionId?: number;
  requestedPosition?: string;
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
    const newNode: ChainNode = {
      id: `node-${Date.now()}`,
      nodeOrder: nodes.length + 1,
      personnelId: candidate.id,
      nationalId: candidate.nationalId,
      fullName: candidate.fullName,
      rank: candidate.rank,
      seniority: candidate.seniority,
      fromPosCodeId: candidate.posCodeId,
      fromPosition: candidate.position,
      fromPositionNumber: candidate.positionNumber,
      fromUnit: candidate.unit,
      toPosCodeId: nodes.length === 0 ? vacantPosition?.posCodeId || 0 : nodes[nodes.length - 1].fromPosCodeId,
      toPosition: nodes.length === 0 ? vacantPosition?.position || '' : nodes[nodes.length - 1].fromPosition,
      toPositionNumber: nodes.length === 0 ? '' : nodes[nodes.length - 1].fromPositionNumber,
      toUnit: nodes.length === 0 ? vacantPosition?.unit || '' : nodes[nodes.length - 1].fromUnit,
      fromRankLevel: candidate.rankLevel,
      toRankLevel: nodes.length === 0 ? getRankLevelByPosCode(vacantPosition?.posCodeId || 0) : nodes[nodes.length - 1].fromRankLevel,
      isPromotionValid: true,
    };

    onAddNode(newNode);
    setShowCandidateSelector(false);
  };

  return (
    <Box>
      {/* Chain Visualization */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={600}>
            ลูกโซ่การเลื่อนตำแหน่ง
          </Typography>
          {nodes.length === 0 ? (
            <Chip label="เริ่มต้น" size="small" variant="outlined" />
          ) : (
            <Chip 
              label={`${nodes.length} ขั้น`} 
              size="small" 
              color="primary" 
            />
          )}
        </Box>

        {/* Nodes Flow */}
        <Stack spacing={2}>
          {nodes.map((node, index) => (
            <Box key={node.id}>
              {/* Flow Indicator */}
              {index === 0 && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 2,
                  p: 1.5,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'primary.main',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    }
                  }} />
                  <Typography variant="caption" color="text.secondary">
                    เริ่มจาก: {vacantPosition?.position} ({vacantPosition?.unit})
                  </Typography>
                </Box>
              )}

              <ChainNodeCard
                node={node}
                onRemove={() => onRemoveNode(node.id)}
                isLastNode={index === nodes.length - 1}
              />

              {/* Arrow between nodes */}
              {index < nodes.length - 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    color: 'text.secondary',
                  }}>
                    <Box>↓</Box>
                    <Typography variant="caption">ตำแหน่งว่าง</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </Stack>

        {/* Add Next Node - Prominent CTA */}
        {canAddMore && (
          <>
            {nodes.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  color: 'text.secondary',
                }}>
                  <Box>↓</Box>
                  <Typography variant="caption">ตำแหน่งว่าง</Typography>
                </Box>
              </Box>
            )}
            
            <Box sx={{ 
              p: 3, 
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'primary.main',
              bgcolor: 'primary.50',
              textAlign: 'center',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'primary.100',
                borderColor: 'primary.dark',
              }
            }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {nodes.length === 0 ? '🎯 เลือกคนมาแทนตำแหน่งว่าง' : `📍 ตำแหน่งที่ว่าง: ${nodes[nodes.length - 1].fromPosition}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                ต้องการยศต่ำกว่า {getRankNameByPosCodeId(currentVacantRankLevel || 0)} เพื่อเลื่อนขึ้นมา
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                startIcon={<AddIcon />} 
                onClick={() => setShowCandidateSelector(true)}
              >
                เลือกผู้สมัคร
              </Button>
            </Box>
          </>
        )}

        {!canAddMore && nodes.length > 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                color: 'success.main',
              }}>
                <Box>✓</Box>
                <Typography variant="caption" fontWeight={600}>สมบูรณ์</Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
              <Typography variant="body2" color="success.main" fontWeight={600}>
                ✓ Chain สมบูรณ์แล้ว • จบที่ระดับ {getRankNameByPosCodeId(nodes[nodes.length - 1].fromRankLevel)}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* Summary - Compact */}
      {nodes.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            📋 สรุปลูกโซ่
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
            <Typography variant="body2" fontWeight={600}>{vacantPosition?.position}</Typography>
            {nodes.map((node) => (
              <React.Fragment key={node.id}>
                <Typography variant="body2" color="text.secondary">→</Typography>
                <Typography variant="body2">{node.rank} {node.fullName}</Typography>
              </React.Fragment>
            ))}
          </Box>
        </Paper>
      )}

      {/* Candidate Selector Dialog */}
      <CandidateSelector
        open={showCandidateSelector}
        onClose={() => setShowCandidateSelector(false)}
        targetRankLevel={currentVacantRankLevel || 0}
        onSelect={handleSelectCandidate}
        vacantPosition={
          nodes.length === 0
            ? vacantPosition
            : {
                id: nodes[nodes.length - 1].id,
                posCodeId: nodes[nodes.length - 1].fromPosCodeId,
                position: nodes[nodes.length - 1].fromPosition,
                unit: nodes[nodes.length - 1].fromUnit,
              }
        }
      />
    </Box>
  );
}
