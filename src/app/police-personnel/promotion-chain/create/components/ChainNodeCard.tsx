'use client';
import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  alpha,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

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
      sx={{
        position: 'relative',
        border: '2px solid',
        borderColor: node.isPromotionValid ? 'success.main' : 'error.main',
        bgcolor: node.isPromotionValid ? alpha('#4caf50', 0.05) : alpha('#f44336', 0.05),
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      {/* Node Order Badge */}
      <Box
        sx={{
          position: 'absolute',
          top: -12,
          left: 16,
          bgcolor: node.isPromotionValid ? 'success.main' : 'error.main',
          color: 'white',
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          fontSize: '0.75rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {node.isPromotionValid ? <CheckIcon sx={{ fontSize: 16 }} /> : <WarningIcon sx={{ fontSize: 16 }} />}
        ขั้นที่ {node.nodeOrder}
      </Box>

      <CardContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Left: Person Info */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonIcon color="action" />
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                  {node.fullName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={node.rank} size="small" color="primary" />
                  {node.seniority && (
                    <Chip label={node.seniority} size="small" variant="outlined" />
                  )}
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Position Movement */}
            <Stack spacing={2}>
              {/* From Position */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BusinessIcon sx={{ fontSize: 14 }} />
                  ตำแหน่งเดิม (จะว่าง)
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha('#f44336', 0.1),
                    border: '1px solid',
                    borderColor: alpha('#f44336', 0.3),
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {node.fromPosition}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {node.fromUnit}
                    {node.fromPositionNumber && ` • ${node.fromPositionNumber}`}
                  </Typography>
                </Box>
              </Box>

              {/* Arrow */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: isPromotion ? alpha('#4caf50', 0.2) : alpha('#2196f3', 0.2),
                    border: '1px solid',
                    borderColor: isPromotion ? 'success.main' : 'primary.main',
                  }}
                >
                  <TrendingUpIcon
                    sx={{
                      color: isPromotion ? 'success.main' : 'primary.main',
                      fontSize: 20,
                    }}
                  />
                  <Typography variant="caption" fontWeight="bold" color={isPromotion ? 'success.main' : 'primary.main'}>
                    {isPromotion ? 'เลื่อนขึ้น' : 'ย้าย'}
                  </Typography>
                </Box>
              </Box>

              {/* To Position */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BusinessIcon sx={{ fontSize: 14 }} />
                  ตำแหน่งใหม่
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: alpha('#4caf50', 0.1),
                    border: '1px solid',
                    borderColor: alpha('#4caf50', 0.3),
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {node.toPosition}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {node.toUnit}
                    {node.toPositionNumber && ` • ${node.toPositionNumber}`}
                  </Typography>
                </Box>
              </Box>
            </Stack>

            {/* Validation Message */}
            {!node.isPromotionValid && (
              <Box
                sx={{
                  mt: 2,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: alpha('#f44336', 0.1),
                  border: '1px solid',
                  borderColor: 'error.main',
                }}
              >
                <Typography variant="caption" color="error">
                  ⚠️ การเลื่อนตำแหน่งนี้ไม่ถูกต้องตามลำดับชั้น
                </Typography>
              </Box>
            )}
          </Box>

          {/* Right: Actions */}
          {isLastNode && (
            <Tooltip title="ลบขั้นนี้">
              <IconButton
                onClick={onRemove}
                color="error"
                size="small"
                sx={{
                  bgcolor: alpha('#f44336', 0.1),
                  '&:hover': {
                    bgcolor: alpha('#f44336', 0.2),
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>

      {/* Next Vacant Position Indicator */}
      {isLastNode && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: alpha('#ff9800', 0.1),
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            💡 ตำแหน่ง <strong>{node.fromPosition}</strong> จะว่าง → ต้องหาคนมาแทนในขั้นถัดไป
          </Typography>
        </Box>
      )}
    </Card>
  );
}
