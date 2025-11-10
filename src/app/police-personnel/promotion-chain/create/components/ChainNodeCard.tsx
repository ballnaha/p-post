'use client';
import React, { useState } from 'react';
import { Card, CardContent, Box, Typography, IconButton, Divider, Stack, Tooltip, Chip, Button, useMediaQuery, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Paper } from '@mui/material';
import { Delete as DeleteIcon, InfoOutlined as InfoOutlinedIcon, Add as AddIcon, Warning as WarningIcon } from '@mui/icons-material';

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
  actingAs?: string; // police_personnel.actingAs - ทำหน้าที่ (alias for fromActingAs)
  fromActingAs?: string; // ทำหน้าที่ของตำแหน่งเดิม (explicit name)
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
  onInsertBefore?: () => void; // แทรกตำแหน่งใหม่ก่อนตำแหน่งนี้
  nextNode?: ChainNode; // โหนดถัดไป เพื่อแสดงข้อมูลผลกระทบจากการลบ
}

export default function ChainNodeCard({ node, onRemove, isLastNode, onShowDetail, onInsertBefore, nextNode }: ChainNodeCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isPromotion = node.toRankLevel < node.fromRankLevel;
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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
        {/* Insert Button - แสดงที่ด้านบนของการ์ดถ้ามีฟังก์ชัน onInsertBefore */}
        {onInsertBefore && (
          <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
            <Button
              onClick={onInsertBefore}
              size="small"
              variant="outlined"
              startIcon={<AddIcon fontSize="small" />}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.75rem',
                borderColor: 'primary.main',
                color: 'primary.main',
                bgcolor: 'primary.50',
                borderStyle: 'dashed',
                borderWidth: 2,
                '&:hover': {
                  bgcolor: 'primary.100',
                  borderColor: 'primary.dark',
                  borderStyle: 'dashed',
                  borderWidth: 2,
                },
              }}
            >
              แทรกตำแหน่งก่อนหน้านี้
            </Button>
          </Box>
        )}
        
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
            <Tooltip title="ลบขั้นนี้">
              <IconButton 
                onClick={() => setConfirmDialogOpen(true)} 
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

        {/* Support Information - Minimal */}
        {node.supporterName && (
          <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Chip 
              label={`ผู้สนับสนุน: ${node.supporterName}`}
              size="small"
              icon={<span style={{ fontSize: '0.9rem' }}>⭐</span>}
              sx={{ 
                height: 22,
                fontSize: '0.75rem',
                bgcolor: 'warning.50',
                color: 'warning.dark',
                fontWeight: 600,
                border: '1px solid',
                borderColor: 'warning.200',
                alignSelf: 'flex-start',
                '& .MuiChip-icon': {
                  marginLeft: '4px',
                }
              }}
            />
            {node.supportReason && (
              <Typography variant="body2" sx={{ color: 'text.primary', pl: 0.5 }}>
                - {node.supportReason}
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
              <Typography variant="body2" sx={{ color: 'text.secondary', display: 'block' }}>
                {node.fromPosCodeName}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.9rem' }}>
              หน่วย: {node.fromUnit}
            </Typography>
            {((node.fromActingAs || node.actingAs) && (node.fromActingAs || node.actingAs)?.trim() !== '' && (node.fromActingAs || node.actingAs) !== '-') && (
              <Typography variant="body2" sx={{ display: 'block', color: 'primary.main', mt: 0.25 }}>
                💼 ทำหน้าที่: {node.fromActingAs || node.actingAs}
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
              <Typography variant="body2" sx={{ color: 'success.dark', display: 'block' }}>
                {node.toPosCodeName}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'success.dark', display: 'block', fontSize: '0.9rem' }}>
              หน่วย: {node.toUnit}
            </Typography>
            {node.toActingAs && node.toActingAs.trim() !== '' && node.toActingAs !== '-' && (
              <Typography variant="body2" sx={{ color: 'success.dark', display: 'block', mt: 0.25 }}>
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

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          borderBottom: '2px solid',
          borderColor: 'error.main',
        }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'error.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
          }}>
            <WarningIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              ยืนยันการลบตำแหน่ง
            </Typography>
            <Typography variant="caption" color="text.secondary">
              กรุณาตรวจสอบข้อมูลก่อนดำเนินการ
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {/* แสดงข้อมูลตำแหน่งที่จะถูกลบ */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              🗑️ ตำแหน่งที่จะถูกลบ:
            </Typography>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                bgcolor: 'error.50', 
                border: '2px solid', 
                borderColor: 'error.main',
                borderRadius: 2,
              }}
            >
              <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5, color: 'error.dark' }}>
                ขั้นที่ {node.nodeOrder}: {node.rank} {node.fullName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                จาก: {node.fromPosition} ({node.fromUnit})
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                ไป: {node.toPosition} ({node.toUnit})
              </Typography>
            </Paper>
          </Box>

          {/* แสดงผลกระทบต่อตำแหน่งถัดไป ถ้ามี */}
          {nextNode && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                🔄 ผลกระทบต่อตำแหน่งถัดไป:
              </Typography>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  bgcolor: 'warning.50', 
                  border: '2px solid', 
                  borderColor: 'warning.main',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5, color: 'warning.dark' }}>
                  {nextNode.rank} {nextNode.fullName}
                </Typography>
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    ตำแหน่งใหม่ที่จะได้รับ:
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr auto 1fr', 
                    gap: 1, 
                    alignItems: 'center',
                    p: 1.5,
                    bgcolor: 'white',
                    borderRadius: 1,
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        เดิม:
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'error.main' }}>
                        {nextNode.toPosition}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {nextNode.toUnit}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      fontSize: '1.5rem',
                      color: 'success.main',
                      fontWeight: 700,
                    }}>
                      →
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        ใหม่:
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'success.main' }}>
                        {node.toPosition}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {node.toUnit}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}

          {!nextNode && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'info.50', 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'info.main',
            }}>
              <Typography variant="body2" color="info.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span">ℹ️</Box>
                นี่คือตำแหน่งสุดท้ายในลูกโซ่ การลบจะไม่ส่งผลกระทบต่อตำแหน่งอื่น
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={() => {
              setConfirmDialogOpen(false);
              onRemove();
            }}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ minWidth: 100 }}
          >
            ยืนยันลบ
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
