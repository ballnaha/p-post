'use client';
import React from 'react';
import { Card, CardContent, Box, Typography, IconButton, Divider, Stack, Tooltip } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

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

interface ChainNodeCardProps {
  node: ChainNode;
  onRemove: () => void;
  isLastNode: boolean;
}

export default function ChainNodeCard({ node, onRemove, isLastNode }: ChainNodeCardProps) {
  const isPromotion = node.toRankLevel < node.fromRankLevel;

  return (
    <Card
      elevation={2}
      sx={{
        border: '2px solid',
        borderColor: node.isPromotionValid ? 'success.main' : 'error.main',
        bgcolor: 'background.paper',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 4,
        }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header with step number and actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.5,
            bgcolor: node.isPromotionValid ? 'success.50' : 'error.50',
            borderRadius: 10,
            border: '1px solid',
            borderColor: node.isPromotionValid ? 'success.main' : 'error.main',
          }}>
            <Typography variant="caption" fontWeight={700} color={node.isPromotionValid ? 'success.main' : 'error.main'}>
              ขั้นที่ {node.nodeOrder}
            </Typography>
          </Box>
          {isLastNode && (
            <Tooltip title="ลบขั้นนี้">
              <IconButton onClick={onRemove} color="error" size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Person Info - Compact */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', lineHeight: 1.2 }}>
            {node.rank} {node.fullName}
          </Typography>
          {node.seniority && (
            <Typography variant="caption" color="text.secondary">
              อาวุโส {node.seniority}
            </Typography>
          )}
        </Box>

        {/* Position Movement - Single Line Flow */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          p: 1.5,
          bgcolor: 'grey.50',
          borderRadius: 1,
        }}>
          {/* From */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">จาก</Typography>
            <Typography variant="body2" fontWeight={600} noWrap>{node.fromPosition}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {node.fromUnit}
            </Typography>
          </Box>

          {/* Arrow */}
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            px: 1,
            flexShrink: 0,
          }}>
            <Typography variant="h6" color="success.main">→</Typography>
            <Typography variant="caption" color="success.main" fontWeight={600}>เลื่อน</Typography>
          </Box>

          {/* To */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">ไป</Typography>
            <Typography variant="body2" fontWeight={600} color="success.main" noWrap>
              {node.toPosition}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {node.toUnit}
            </Typography>
          </Box>
        </Box>

        {!node.isPromotionValid && (
          <Box sx={{ mt: 1.5, p: 1, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
            <Typography variant="caption" color="error" fontWeight={600}>
              ⚠️ การเลื่อนตำแหน่งนี้ไม่ถูกต้องตามลำดับชั้น
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
