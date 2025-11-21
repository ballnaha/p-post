'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  SwapHoriz as SwapHorizIcon,
  CalendarToday as CalendarIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

interface SwapDetail {
  id: string;
  personnelId: string;
  noId?: string;
  fullName: string;
  rank: string | null;
  nationalId: string | null;
  age: string | null;
  seniority: string | null;
  birthDate: string | null;
  education: string | null;
  lastAppointment: string | null;
  currentRankSince: string | null;
  enrollmentDate: string | null;
  retirementDate: string | null;
  yearsOfService: string | null;
  trainingLocation: string | null;
  trainingCourse: string | null;
  avatarUrl?: string | null;
  posCodeId: number | null;
  posCodeMaster: {
    id: number;
    name: string;
  } | null;
  fromPosition: string | null;
  fromPositionNumber: string | null;
  fromUnit: string | null;
  fromActingAs: string | null;
  toPosCodeId: number | null;
  toPosCodeMaster: {
    id: number;
    name: string;
  } | null;
  toPosition: string | null;
  toPositionNumber: string | null;
  toUnit: string | null;
  toActingAs: string | null;
  transaction: {
    id: string;
    year: number;
    swapDate: string;
    swapType: string;
    groupNumber: string | null;
  } | null;
}

interface InOutDetailModalProps {
  open: boolean;
  onClose: () => void;
  detail: SwapDetail | null;
  swapPartner: SwapDetail | null;
  replacedPerson?: SwapDetail | null;
  onViewPersonnelDetail: (personnel: SwapDetail) => void;
}

const InOutDetailModal: React.FC<InOutDetailModalProps> = ({
  open,
  onClose,
  detail,
  swapPartner,
  onViewPersonnelDetail,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    
    // ถ้าเป็นรูปแบบ DD/MM/YYYY ให้ตรวจสอบว่าเป็น พ.ศ. หรือ ค.ศ.
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[2]);
        // ถ้าปีน้อยกว่า 2500 แสดงว่าเป็น ค.ศ. ให้แปลงเป็น พ.ศ.
        if (!isNaN(year) && year < 2500) {
          return `${parts[0]}/${parts[1]}/${year + 543}`;
        }
      }
      // ถ้าเป็น พ.ศ. อยู่แล้ว หรือไม่สามารถ parse ได้ ให้ return ตรงๆ
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
      }
    } catch {
      return dateString;
    }
    
    return dateString;
  };

  const getSwapTypeLabel = (type: string) => {
    switch (type) {
      case 'two-way': return 'สลับ 2 คน';
      case 'three-way': return 'สามเส้า';
      case 'multi-way': return 'หลายคน';
      case 'promotion': return 'เลื่อนตำแหน่ง';
      case 'promotion-chain': return 'เลื่อนตำแหน่งแบบลูกโซ่';
      default: return type;
    }
  };

  if (!detail || !detail.transaction) return null;

  return (
    <Dialog
      key={`${open}-${isMobile}`}
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        backdrop: {
          timeout: 0,
        },
      }}
      sx={{
        zIndex: 10001,
        '& .MuiDialog-paper': {
          width: { xs: '100%' },
          height: { xs: '100%', sm: 'auto' },
          maxHeight: { xs: '100%', sm: '90vh' },
          margin: { xs: 0, sm: 2 },
          borderRadius: { xs: 0, sm: 1 },
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        pb: 2,
        position: 'sticky',
        top: 0,
        bgcolor: 'background.paper',
        zIndex: 1,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon color="primary" />
          <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            รายละเอียดการสลับตำแหน่ง
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={3}>
          {/* ข้อมูลการสลับ */}
          <Paper sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'grey.50', border: 1, borderColor: 'grey.300' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" color="text.primary" fontWeight={600} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                📋 ข้อมูลการสลับ
              </Typography>
              <Chip 
                label={getSwapTypeLabel(detail.transaction.swapType)}
                size="small"
                color={detail.transaction.swapType === 'three-way' ? 'warning' : (detail.transaction.swapType === 'promotion' ? 'info' : 'primary')}
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>วันที่สลับ</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <CalendarIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="body2" fontWeight={600}>
                    {formatDate(detail.transaction.swapDate)}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>ปี พ.ศ.</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                  {detail.transaction.year > 2500 ? detail.transaction.year : detail.transaction.year + 543}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>เลขกลุ่ม</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                  {detail.transaction.groupNumber || '-'}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* ข้อมูลบุคคล */}
          <Paper sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" color="primary.main" fontWeight={600} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                👤 ข้อมูลบุคคล
              </Typography>
              <Tooltip title="ดูข้อมูลเต็ม">
                <IconButton
                  size="small"
                  onClick={() => onViewPersonnelDetail(detail)}
                  sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.100' } }}
                >
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>ยศ ชื่อ-สกุล</Typography>
                <Typography variant="body2" fontWeight={600} color="primary.dark" sx={{ mt: 0.5 }}>
                  {detail.rank} {detail.fullName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>เลขบัตรประชาชน</Typography>
                <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                  {detail.nationalId || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>อายุ</Typography>
                <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                  {detail.age ? `${detail.age} ปี` : '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>อายุราชการ</Typography>
                <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                  {detail.yearsOfService ? `${detail.yearsOfService} ปี` : '-'}
                </Typography>
              </Box>
              {detail.birthDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>วันเกิด</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                    {formatDate(detail.birthDate)}
                  </Typography>
                </Box>
              )}
              {detail.education && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>การศึกษา</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                    {detail.education}
                  </Typography>
                </Box>
              )}
              {detail.enrollmentDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>วันบรรจุ</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                    {formatDate(detail.enrollmentDate)}
                  </Typography>
                </Box>
              )}
              {detail.retirementDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>วันเกษียณ</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                    {detail.retirementDate}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* สรุปการสลับตำแหน่ง */}
          <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: alpha('#2196f3', 0.05), border: 2, borderColor: 'primary.main' }}>
            <Typography variant="h6" fontWeight={600} color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              <SwapHorizIcon />
              สรุปการสลับตำแหน่ง
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            {/* 2 Column Layout for Desktop, Stack for Mobile */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
              gap: 2.5,
              alignItems: 'start'
            }}>
              {/* ตำแหน่งเดิม */}
              <Box sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'white', borderRadius: 2, border: 1, borderColor: 'grey.300', boxShadow: 1 }}>
                <Typography variant="subtitle2" fontWeight={600} color="text.primary" gutterBottom sx={{ mb: 1.5, fontSize: { xs: '0.875rem', sm: '0.95rem' } }}>
                  📍 ตำแหน่งเดิม (ที่ออกจาก)
                </Typography>
                <Box sx={{ pl: { xs: 1.5, sm: 2 }, borderLeft: 4, borderColor: 'grey.400' }}>
                  {detail.posCodeMaster && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>POS CODE</Typography>
                      <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {detail.posCodeMaster.id} - {detail.posCodeMaster.name}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>ตำแหน่ง</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {detail.fromPosition || '-'}
                    </Typography>
                  </Box>
                  {detail.fromPositionNumber && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>เลขตำแหน่ง</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {detail.fromPositionNumber}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>หน่วย</Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {detail.fromUnit || '-'}
                    </Typography>
                  </Box>
                  {detail.fromActingAs && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>ทำหน้าที่</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {detail.fromActingAs}
                      </Typography>
                    </Box>
                  )}
                </Box>
                {swapPartner && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1, border: 1, borderColor: 'info.200' }}>
                    <Typography variant="caption" color="info.dark" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                      💡 ตำแหน่งนี้ตอนนี้มี <strong>{swapPartner.rank} {swapPartner.fullName}</strong> มาอยู่แทน
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* ตำแหน่งใหม่ */}
              <Box sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: alpha('#4caf50', 0.1), borderRadius: 2, border: 2, borderColor: 'success.main', boxShadow: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="success.dark" gutterBottom sx={{ mb: 1.5, fontSize: { xs: '0.875rem', sm: '0.95rem' } }}>
                  ✅ ตำแหน่งใหม่ (ที่ได้รับ)
                </Typography>
                <Box sx={{ pl: { xs: 1.5, sm: 2 }, borderLeft: 4, borderColor: 'success.main' }}>
                  {detail.toPosCodeMaster && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>POS CODE</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {detail.toPosCodeMaster.id} - {detail.toPosCodeMaster.name}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>ตำแหน่ง</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.dark" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {detail.toPosition || '-'}
                    </Typography>
                  </Box>
                  {detail.toPositionNumber && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>เลขตำแหน่ง</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.dark" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {detail.toPositionNumber}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>หน่วย</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.dark" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {detail.toUnit || '-'}
                    </Typography>
                  </Box>
                  {detail.toActingAs && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>ทำหน้าที่</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.dark" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {detail.toActingAs}
                      </Typography>
                    </Box>
                  )}
                </Box>
                
              </Box>
            </Box>
          </Paper>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ 
        px: { xs: 1.5, md: 2 }, 
        py: { xs: 2, md: 1.5 }, 
        bgcolor: 'grey.50', 
        borderTop: 1, 
        borderColor: 'divider',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          size="medium" 
          sx={{ 
            minWidth: { xs: '100%', md: 100 }, 
            fontWeight: 600,
            py: { xs: 1.5, md: 1 }
          }}
        >
          ปิด
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InOutDetailModal;
