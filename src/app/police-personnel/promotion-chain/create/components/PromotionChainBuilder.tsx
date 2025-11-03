'use client';
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  IconButton,
  Chip,
  Divider,
  alpha,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowDownward as ArrowDownIcon,
  TrendingUp as TrendingUpIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
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

const RANK_HIERARCHY = [
  { rankName: 'รอง ผบ.ตร.', rankLevel: 1 },
  { rankName: 'ผู้ช่วย', rankLevel: 2 },
  { rankName: 'ผบช.', rankLevel: 3 },
  { rankName: 'รอง ผบช.', rankLevel: 4 },
  { rankName: 'ผบก.', rankLevel: 6 },
  { rankName: 'รอง ผบก.', rankLevel: 7 },
  { rankName: 'ผกก.', rankLevel: 8 },
  { rankName: 'รอง ผกก.', rankLevel: 9 },
  { rankName: 'สว.', rankLevel: 11 },
  { rankName: 'รอง สว.', rankLevel: 12 },
];

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
    // สมมติว่า posCodeId = rankLevel (สำหรับ demo)
    // ในความเป็นจริงต้องดึงจาก PosCodeMaster
    return posCodeId;
  };

  const getRankNameByLevel = (level: number): string => {
    const rank = RANK_HIERARCHY.find((r) => r.rankLevel === level);
    return rank?.rankName || `ระดับ ${level}`;
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
      {/* Instruction */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>วิธีการสร้าง Chain:</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          1. เริ่มจากตำแหน่งว่าง → เลือกคนที่จะมาแทน<br />
          2. ตำแหน่งเดิมของเขาจะว่าง → เลือกคนมาแทนต่อ<br />
          3. ทำซ้ำจนถึงระดับล่างสุดที่ต้องการ
        </Typography>
      </Alert>

      {/* Chain Visualization */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon />
          ลูกโซ่การเลื่อนตำแหน่ง
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Origin Position */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha('#2196f3', 0.1),
            border: '2px solid',
            borderColor: 'primary.main',
            mb: 2,
          }}
        >
          <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
            ตำแหน่งว่างต้นทาง
          </Typography>
          <Typography variant="h6">
            {vacantPosition?.position || 'ไม่ระบุ'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {vacantPosition?.unit || ''}
          </Typography>
        </Box>

        {/* Arrow Down */}
        {nodes.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
            <ArrowDownIcon color="action" />
          </Box>
        )}

        {/* Nodes */}
        <Stack spacing={2}>
          {nodes.map((node, index) => (
            <Box key={node.id}>
              <ChainNodeCard
                node={node}
                onRemove={() => onRemoveNode(node.id)}
                isLastNode={index === nodes.length - 1}
              />
              {index < nodes.length - 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                  <ArrowDownIcon color="action" />
                </Box>
              )}
            </Box>
          ))}
        </Stack>

        {/* Add Next Node */}
        {canAddMore ? (
          <>
            {nodes.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <ArrowDownIcon color="action" />
              </Box>
            )}
            
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: '2px dashed',
                borderColor: 'divider',
                textAlign: 'center',
                bgcolor: alpha('#000', 0.02),
              }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {nodes.length === 0 ? 'เลือกคนมาแทนตำแหน่งว่าง' : `ตำแหน่งที่ว่าง: ${nodes[nodes.length - 1].fromPosition}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                ต้องการ: ยศที่ต่ำกว่า {getRankNameByLevel(currentVacantRankLevel || 0)} (สามารถเลื่อนขึ้นได้)
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowCandidateSelector(true)}
              >
                เลือกผู้สมัคร
              </Button>
            </Box>
          </>
        ) : (
          nodes.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" icon={<CheckIcon />}>
                Chain สมบูรณ์แล้ว! จบที่ระดับ {getRankNameByLevel(nodes[nodes.length - 1].fromRankLevel)}
              </Alert>
            </Box>
          )
        )}
      </Paper>

      {/* Summary */}
      {nodes.length > 0 && (
        <Paper sx={{ p: 2, bgcolor: alpha('#4caf50', 0.05) }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            สรุปลูกโซ่
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Chip label={vacantPosition?.position} size="small" color="primary" />
            {nodes.map((node, index) => (
              <React.Fragment key={node.id}>
                <ArrowDownIcon fontSize="small" color="action" />
                <Chip
                  label={`${node.rank} ${node.fullName}`}
                  size="small"
                  variant="outlined"
                />
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
