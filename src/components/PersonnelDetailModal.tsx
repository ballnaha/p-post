'use client';
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
  Stack,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  School as EducationIcon,
} from '@mui/icons-material';

// Interface สำหรับข้อมูลบุคลากร (รองรับทั้ง police-personnel, swap-list, three-way-swap, vacant-position)
interface PersonnelData {
  id?: string;
  noId?: number | string | null;
  posCodeId?: number | null;
  posCodeMaster?: {
    id: number;
    name: string;
  } | null;
  position?: string | null;
  positionNumber?: string | null;
  unit?: string | null;
  rank?: string | null;
  fullName?: string | null;
  nationalId?: string | null;
  age?: string | null;
  seniority?: string | null;
  education?: string | null;
  birthDate?: string | null;
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  yearsOfService?: string | null;
  actingAs?: string | null;
  trainingLocation?: string | null;
  trainingCourse?: string | null;
  notes?: string | null;
}

interface PersonnelDetailModalProps {
  open: boolean;
  onClose: () => void;
  personnel: PersonnelData | null;
  loading?: boolean;
  title?: string; // Custom title (default: "รายละเอียดบุคลากร")
  onClearData?: () => void; // Optional callback to clear personnel data after animation
}

// Utility function สำหรับ format วันที่
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  
  // ถ้าเป็นรูปแบบวันที่ไทยอยู่แล้ว (DD/MM/YYYY) ให้ return เลย
  if (typeof dateString === 'string' && dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      // ตรวจสอบว่าเป็นรูปแบบ DD/MM/YYYY หรือไม่
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      
      // ถ้าปีเป็น พ.ศ. (มากกว่า 2500) ให้ return เลย
      if (parseInt(year) > 2500) {
        return `${day}/${month}/${year}`;
      }
      
      // ถ้าปีเป็น ค.ศ. ให้แปลงเป็น พ.ศ.
      if (parseInt(year) > 1900 && parseInt(year) < 2100) {
        const thaiYear = parseInt(year) + 543;
        return `${day}/${month}/${thaiYear}`;
      }
    }
    
    // ถ้าเป็นรูปแบบอื่นที่มี / ให้ return เลย
    return dateString;
  }
  
  // ถ้าเป็น ISO date string หรือ timestamp
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
      return `${day}/${month}/${year}`;
    }
  } catch (error) {
    // ถ้าแปลงไม่ได้ ให้ return ค่าเดิม
    return dateString;
  }
  
  return dateString;
};

export default function PersonnelDetailModal({
  open,
  onClose,
  personnel,
  loading = false,
  title = 'รายละเอียดบุคลากร',
  onClearData
}: PersonnelDetailModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClose = () => {
    onClose();
    // Delay clearing data until animation completes (if callback provided)
    if (onClearData) {
      setTimeout(() => {
        onClearData();
      }, 300); // Match MUI Dialog transition duration
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.5,
        px: 2
      }}>
        <PersonIcon fontSize="small" />
        <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
          {title}
        </Box>
        {personnel && (
          <Chip 
            label={personnel.rank ? 'มีผู้ดำรง' : 'รายการยื่นขอตำแหน่ง'} 
            color={personnel.rank ? 'success' : 'default'} 
            size="small" 
            sx={{ ml: 'auto', height: 24, fontSize: '0.75rem' }}
          />
        )}
      </DialogTitle>
      
      <DialogContent sx={{ p: 2, mt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress size={60} />
          </Box>
        ) : personnel ? (
          <Box>
            {/* Header Section - ชื่อและตำแหน่ง */}
            <Box sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25, fontSize: '1.125rem' }}>
                {personnel.rank || ''} {personnel.fullName || 'รายการยื่นขอตำแหน่ง'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.938rem' }}>
                {personnel.position} • {personnel.unit || '-'}
              </Typography>
            </Box>

            {/* Content Sections */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
              
              {/* Left Column */}
              <Box>
                {/* ข้อมูลตำแหน่ง */}
                <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.938rem' }}>
                    <BadgeIcon fontSize="small" />
                    ข้อมูลตำแหน่ง
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Stack spacing={0.75} divider={<Divider />}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ID</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.noId || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>POSCODE</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                        {personnel.posCodeMaster ? `${personnel.posCodeMaster.id} - ${personnel.posCodeMaster.name}` : '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เลขตำแหน่ง</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.positionNumber || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ทำหน้าที่</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.actingAs || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>หน่วย</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.unit || '-'}</Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* ข้อมูลบุคคล */}
                {personnel.rank && (
                  <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.938rem' }}>
                      <PersonIcon fontSize="small" />
                      ข้อมูลบุคคล
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Stack spacing={0.75} divider={<Divider />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ชื่อ-สกุล</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.fullName || '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ยศ</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.rank || '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>อาวุโส</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.seniority || '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>อายุ</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.age ? `${personnel.age}` : '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>วันเกิด</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(personnel.birthDate)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เลขบัตรประชาชน</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{personnel.nationalId || '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>คุณวุฒิ</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.education || '-'}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                )}
              </Box>

              {/* Right Column */}
              <Box>
                {/* ข้อมูลการแต่งตั้ง */}
                {personnel.rank && (
                  <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.938rem' }}>
                      <CalendarIcon fontSize="small" />
                      ข้อมูลการแต่งตั้ง
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Stack spacing={0.75} divider={<Divider />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>แต่งตั้งครั้งสุดท้าย</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(personnel.lastAppointment)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ระดับนี้เมื่อ</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(personnel.currentRankSince)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>บรรจุ</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(personnel.enrollmentDate)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เกษียณ</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.retirementDate || '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>จำนวนปี</Typography>
                        <Typography variant="body2" fontWeight={600} color="info.main" sx={{ fontSize: '0.875rem' }}>{personnel.yearsOfService ? `${personnel.yearsOfService} ปี` : '-'}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                )}

                {/* ข้อมูลการฝึกอบรม */}
                {(personnel.trainingLocation || personnel.trainingCourse) && (
                  <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.938rem' }}>
                      <EducationIcon fontSize="small" />
                      ข้อมูลการฝึกอบรม
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <Stack spacing={0.75} divider={<Divider />}>
                      {personnel.trainingLocation && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>สถานที่ฝึกอบรม</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.trainingLocation}</Typography>
                        </Box>
                      )}
                      {personnel.trainingCourse && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>หลักสูตร (นรต.)</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.trainingCourse}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Box>
            </Box>

            {/* หมายเหตุ - Full Width */}
            {personnel.notes && (
              <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, bgcolor: 'grey.100', borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.75, fontSize: '0.938rem' }}>
                  หมายเหตุ
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.secondary', display: 'block', fontSize: '0.875rem' }}>
                  {personnel.notes}
                </Typography>
              </Paper>
            )}
          </Box>
        ) : null}
      </DialogContent>
      
      <DialogActions sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={handleClose} variant="contained" size="medium" sx={{ minWidth: 100, fontWeight: 600 }}>
          ปิด
        </Button>
      </DialogActions>
    </Dialog>
  );
}
