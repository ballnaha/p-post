'use client';
import React from 'react';
import { Card, CardContent, Box, Typography, IconButton, Divider, Stack, Tooltip, Chip, Button, useMediaQuery, useTheme } from '@mui/material';
import { Delete as DeleteIcon, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';

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
  
  // Support information
  supporterName?: string;
  supportReason?: string;
  
  // ข้อมูลตำแหน่งเดิม (From Position)
  fromPosCodeId: number; // police_personnel.posCodeId
  fromPosCodeName?: string; // posCodeMaster.name
  fromPosition: string; // police_personnel.position
  fromPositionNumber?: string; // police_personnel.positionNumber
  fromUnit: string; // police_personnel.unit
  actingAs?: string; // police_personnel.actingAs - ทำหน้าที่
  toActingAs?: string; // ทำหน้าที่ของตำแหน่งปลายทาง
  
  // ข้อมูลตำแหน่งใหม่ (To Position)
  toPosCodeId: number;
  toPosCodeName?: string;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  
  // Metadata
  fromRankLevel: number;
  toRankLevel: number;
  isPromotionValid: boolean;
}

interface ChainNodeCardProps {
  node: ChainNode;
  onRemove: () => void;
  isLastNode: boolean;
  onShowDetail?: () => void; // เปิด modal รายละเอียดบุคลากร
}

export default function ChainNodeCard({ node, onRemove, isLastNode, onShowDetail }: ChainNodeCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isPromotion = node.toRankLevel < node.fromRankLevel;

  return (
    <Card
      elevation={3}
      sx={{
        border: '2px solid',
        borderColor: node.isPromotionValid ? 'success.main' : 'error.main',
        bgcolor: 'background.paper',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: node.isPromotionValid 
            ? '0 8px 24px rgba(16, 185, 129, 0.25)'
            : '0 8px 24px rgba(239, 68, 68, 0.25)',
          transform: 'translateY(-4px)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: node.isPromotionValid 
            ? 'success.main'
            : 'error.main',
        }
      }}
    >
      <CardContent sx={{ p: 1.5, pt: 1.25 }}>
        {/* Header with step number and actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, gap: 1 }}>
          <Box sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            bgcolor: node.isPromotionValid 
              ? 'success.main'
              : 'error.main',
            borderRadius: 10,
            boxShadow: node.isPromotionValid
              ? '0 2px 8px rgba(16, 185, 129, 0.3)'
              : '0 2px 8px rgba(239, 68, 68, 0.3)',
          }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: 'white', fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
              ขั้นที่ {node.nodeOrder}
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.75,
            flexDirection: { xs: 'column', sm: 'row' },
            minWidth: 0
          }}>
            {onShowDetail && (
              <Tooltip title="รายละเอียดบุคลากร">
                <Button
                  onClick={onShowDetail}
                  size={isMobile ? 'small' : 'small'}
                  variant="contained"
                  color="primary"
                  startIcon={!isMobile ? <InfoOutlinedIcon fontSize="small" /> : undefined}
                  sx={{
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    minWidth: { xs: '60px', md: 'auto' },
                    px: { xs: 1, md: 1.5 },
                    py: { xs: 0.5, md: 0.75 },
                    boxShadow: '0 2px 8px rgba(102,126,234,0.35)',
                    '&:hover': { boxShadow: '0 3px 10px rgba(102,126,234,0.45)' },
                    '&:active': { 
                      transform: 'scale(0.98)',
                      transition: 'transform 0.1s'
                    }
                  }}
                >
                  {isMobile ? (
                    <InfoOutlinedIcon fontSize="small" />
                  ) : (
                    'ดูข้อมูล'
                  )}
                </Button>
              </Tooltip>
            )}
            {isLastNode && (
              <Tooltip title="ลบขั้นนี้">
                <IconButton 
                  onClick={onRemove} 
                  size="small"
                  sx={{
                    bgcolor: 'error.50',
                    minWidth: { xs: '32px', md: '40px' },
                    width: { xs: '32px', md: '40px' },
                    height: { xs: '32px', md: '40px' },
                    '&:hover': {
                      bgcolor: 'error.main',
                      color: 'white',
                    },
                    '&:active': { 
                      transform: 'scale(0.98)',
                      transition: 'transform 0.1s'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Person Info - Compact */}
        <Box sx={{ mb: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            {node.rank} {node.fullName}
          </Typography>
          {node.seniority && (
            <Chip 
              label={`อาวุโส ${node.seniority}`}
              size="small"
              sx={{ 
                height: 20,
                fontSize: '0.7rem',
                bgcolor: 'grey.100',
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        {/* Support Information */}
        {node.supporterName && (
          <Box sx={{ mb: 1.25, p: 1, bgcolor: 'primary.50', borderRadius: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, display: 'block' }}>
              👤 ผู้สนับสนุน
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {node.supporterName}
            </Typography>
            {node.supportReason && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                {node.supportReason}
              </Typography>
            )}
          </Box>
        )}

        {/* Position Movement - Compact Flow */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 0,
          borderRadius: 1.5,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          {/* From */}
          <Box sx={{ 
            p: 1.25,
            bgcolor: 'grey.50',
            borderRight: '2px solid white',
          }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
              📍 ตำแหน่งเดิม
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>
              {node.fromPosition}
            </Typography>
            {node.fromPosCodeName && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {node.fromPosCodeName}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.9rem' }}>
              หน่วย: {node.fromUnit}
            </Typography>
            {node.actingAs && node.actingAs !== '-' && (
              <Typography variant="body2" sx={{ display: 'block', color: 'primary.main', mt: 0.25 }}>
                💼 ทำหน้าที่: {node.actingAs}
              </Typography>
            )}
          </Box>

          {/* Arrow */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1.25,
            bgcolor: 'success.main',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              right: -6,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid',
              borderLeftColor: 'success.main',
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
            }
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
              →
            </Typography>
          </Box>

          {/* To */}
          <Box sx={{ 
            p: 1.25,
            bgcolor: 'success.50',
            borderLeft: '2px solid white',
          }}>
            <Typography variant="caption" sx={{ color: 'success.dark', fontWeight: 600, display: 'block', mb: 0.25 }}>
              🎯 ตำแหน่งใหม่
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25, color: 'success.main' }}>
              {node.toPosition}
            </Typography>
            {node.toPosCodeName && (
              <Typography variant="caption" sx={{ color: 'success.dark', display: 'block' }}>
                {node.toPosCodeName}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'success.dark', display: 'block', fontSize: '0.9rem' }}>
              หน่วย: {node.toUnit}
            </Typography>
              {node.toActingAs && node.toActingAs !== '-' && (
                <Typography variant="body2" sx={{ color: 'success.dark', display: 'block' }}>
                  💼 ทำหน้าที่: {node.toActingAs}
                </Typography>
              )}
          </Box>
        </Box>

        
        {!node.isPromotionValid && (
          <Box sx={{ 
            mt: 1.5, 
            p: 1.25, 
            bgcolor: 'error.50',
            borderRadius: 1.5, 
            border: '2px solid', 
            borderColor: 'error.main',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: 'error.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.1rem',
                flexShrink: 0,
              }}>
                ⚠️
              </Box>
              <Typography variant="body2" color="error.main" fontWeight={700}>
                การเลื่อนตำแหน่งนี้ไม่ถูกต้องตามลำดับชั้น
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
