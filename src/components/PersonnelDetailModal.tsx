'use client';
import { useState, useRef, useEffect } from 'react';
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
  Avatar,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  Person as PersonIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  School as EducationIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSnackbar } from '@/contexts/SnackbarContext';

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
  supporterName?: string | null; // ผู้สนับสนุน/ผู้เสนอชื่อ
  supportReason?: string | null; // เหตุผลในการสนับสนุน
  avatarUrl?: string | null; // URL ของรูป avatar
}

interface PersonnelDetailModalProps {
  open: boolean;
  onClose: () => void;
  personnel: PersonnelData | null;
  loading?: boolean;
  title?: string; // Custom title (default: "รายละเอียดบุคลากร")
  onClearData?: () => void; // Optional callback to clear personnel data after animation
  onAvatarUpdate?: (avatarUrl: string | null) => void; // Callback เมื่อ avatar เปลี่ยนแปลง
  onSupporterUpdate?: (supporterName: string | null, supportReason: string | null) => void; // Callback เมื่อบันทึกผู้สนับสนุน
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
  onClearData,
  onAvatarUpdate,
  onSupporterUpdate
}: PersonnelDetailModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();
  
  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supporter editing state
  const [isEditingSupporter, setIsEditingSupporter] = useState(false);
  const [supporterName, setSupporterName] = useState<string>('');
  const [supportReason, setSupportReason] = useState<string>('');
  const [savingSupporter, setSavingSupporter] = useState(false);

  // Set avatar URL from personnel data
  useEffect(() => {
    if (personnel?.avatarUrl) {
      setAvatarUrl(personnel.avatarUrl);
    } else {
      setAvatarUrl(null);
    }
  }, [personnel?.avatarUrl, personnel]);

  // Set supporter data from personnel
  useEffect(() => {
    if (personnel) {
      setSupporterName(personnel.supporterName || '');
      setSupportReason(personnel.supportReason || '');
    }
  }, [personnel]);

  // Reset editing state when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditingSupporter(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsEditingSupporter(false);
    onClose();
    // Delay clearing data until animation completes (if callback provided)
    if (onClearData) {
      setTimeout(() => {
        onClearData();
      }, 300); // Match MUI Dialog transition duration
    }
  };

  // Supporter handlers
  const handleEditSupporter = () => {
    setIsEditingSupporter(true);
  };

  const handleCancelEditSupporter = () => {
    // Reset to original values
    setSupporterName(personnel?.supporterName || '');
    setSupportReason(personnel?.supportReason || '');
    setIsEditingSupporter(false);
  };

  const handleSaveSupporter = async () => {
    if (!personnel?.id) {
      showSnackbar('ไม่สามารถบันทึกได้ เนื่องจากไม่พบ ID บุคลากร', 'error');
      return;
    }

    try {
      setSavingSupporter(true);

      const response = await fetch(`/api/police-personnel/${personnel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supporterName: supporterName.trim() || null,
          supportReason: supportReason.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }

      showSnackbar('บันทึกข้อมูลสำเร็จ', 'success');
      setIsEditingSupporter(false);
      
      // Call callback to update parent state
      onSupporterUpdate?.(
        supporterName.trim() || null, 
        supportReason.trim() || null
      );
    } catch (error) {
      console.error('Save supporter error:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSavingSupporter(false);
    }
  };

  // Avatar handlers
  const handleAddAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !personnel?.id) return;

    // ตรวจสอบชนิดไฟล์
    if (!file.type.startsWith('image/')) {
      showSnackbar('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'warning');
      return;
    }
    
    // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showSnackbar('ขนาดไฟล์ต้องไม่เกิน 5MB', 'warning');
      return;
    }

    try {
      setUploading(true);

      // สร้าง FormData สำหรับส่งไฟล์
      const formData = new FormData();
      formData.append('avatar', file);

      // เรียก API upload
      const response = await fetch(`/api/personnel/${personnel.id}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'เกิดข้อผิดพลาดในการอัพโหลด');
      }

      const data = await response.json();
      setAvatarUrl(data.avatarUrl);
      onAvatarUpdate?.(data.avatarUrl);
      showSnackbar('อัพโหลดรูปภาพสำเร็จ', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัพโหลด', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteAvatar = () => {
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false);
    
    if (!personnel?.id) return;

    try {
      setUploading(true);

      // เรียก API delete
      const response = await fetch(`/api/personnel/${personnel.id}/avatar`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'เกิดข้อผิดพลาดในการลบ');
      }

      setAvatarUrl(null);
      onAvatarUpdate?.(null);
      showSnackbar('ลบรูปภาพสำเร็จ', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบ', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <Dialog 
      key={`${open}-${isMobile}`} // Force re-render when mobile state changes
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      TransitionProps={{
        timeout: 0, // ปิด transition เพื่อป้องกัน overlay ชั่วขณะ
      }}
      sx={{
        '& .MuiDialog-root': {
          zIndex: '20000 !important', // เพิ่มเป็น 20000 เพื่อให้แน่ใจว่าสูงสุด
        },
        '& .MuiDialog-container': {
          zIndex: '20000 !important',
        },
        '& .MuiDialog-paper': {
          zIndex: '20000 !important',
          position: 'relative',
        },
        '& .MuiBackdrop-root': {
          zIndex: '19999 !important', // ต่ำกว่า content นิดหน่อย
        },
        zIndex: '20000 !important',
        position: 'fixed',
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%' },
          height: { xs: '100%', md: 'auto' },
          maxHeight: { xs: '100%', md: '90vh' },
          margin: { xs: 0, md: '32px' },
          borderRadius: { xs: 0, md: 1 },
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.5,
        px: 2,
        flexShrink: 0
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
      
      <DialogContent sx={{ 
        p: { xs: 1.5, md: 2 }, 
        mt: 2,
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#ccc',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#999',
        },
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <CircularProgress size={60} />
          </Box>
        ) : personnel ? (
          <Box>
            {/* Avatar Section */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={avatarUrl || undefined}
                  alt={personnel.fullName || 'Avatar'}
                  sx={{
                    width: 120,
                    height: 120,
                    border: 3,
                    borderColor: 'primary.main',
                    boxShadow: 3,
                    opacity: uploading ? 0.5 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  {!avatarUrl && <PersonIcon sx={{ fontSize: 60 }} />}
                </Avatar>
                
                {/* Loading Overlay */}
                {uploading && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                    }}
                  >
                    <CircularProgress size={40} />
                  </Box>
                )}
                
                {/* Avatar Action Buttons */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -8,
                    right: -8,
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  {!avatarUrl ? (
                    <Tooltip title="เพิ่มรูปภาพ">
                      <span>
                        <IconButton
                          size="small"
                          onClick={handleAddAvatar}
                          disabled={uploading || !personnel.id}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            boxShadow: 2,
                            '&:hover': {
                              bgcolor: 'primary.dark',
                            },
                            '&:disabled': {
                              bgcolor: 'grey.400',
                              color: 'grey.200',
                            },
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : (
                    <>
                      <Tooltip title="แก้ไขรูปภาพ">
                        <span>
                          <IconButton
                            size="small"
                            onClick={handleEditAvatar}
                            disabled={uploading || !personnel.id}
                            sx={{
                              bgcolor: 'warning.main',
                              color: 'white',
                              boxShadow: 2,
                              '&:hover': {
                                bgcolor: 'warning.dark',
                              },
                              '&:disabled': {
                                bgcolor: 'grey.400',
                                color: 'grey.200',
                              },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="ลบรูปภาพ">
                        <span>
                          <IconButton
                            size="small"
                            onClick={handleDeleteAvatar}
                            disabled={uploading || !personnel.id}
                            sx={{
                              bgcolor: 'error.main',
                              color: 'white',
                              boxShadow: 2,
                              '&:hover': {
                                bgcolor: 'error.dark',
                              },
                              '&:disabled': {
                                bgcolor: 'grey.400',
                                color: 'grey.200',
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                </Box>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={uploading || !personnel.id}
                />
              </Box>
            </Box>

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
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ยศ</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.rank || '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ชื่อ-สกุล</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.fullName || '-'}</Typography>
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
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>นรต.</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.trainingCourse}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Box>
            </Box>

            {/* ข้อมูลการเสนอชื่อ - Full Width - แก้ไขได้ */}
            <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.938rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ fontSize: 16 }} />
                  ข้อมูลการเสนอชื่อ
                </Typography>
                {!isEditingSupporter ? (
                  <Tooltip title="แก้ไขข้อมูลการเสนอชื่อ">
                    <IconButton
                      size="small"
                      onClick={handleEditSupporter}
                      disabled={!personnel.id}
                      sx={{ color: 'primary.main' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="บันทึก">
                      <IconButton
                        size="small"
                        onClick={handleSaveSupporter}
                        disabled={savingSupporter}
                        sx={{ color: 'success.main' }}
                      >
                        {savingSupporter ? <CircularProgress size={18} /> : <SaveIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ยกเลิก">
                      <IconButton
                        size="small"
                        onClick={handleCancelEditSupporter}
                        disabled={savingSupporter}
                        sx={{ color: 'error.main' }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
              
              {isEditingSupporter ? (
                <Stack spacing={1.5}>
                  <TextField
                    label="ผู้สนับสนุน/ผู้เสนอชื่อ"
                    value={supporterName}
                    onChange={(e) => setSupporterName(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="กรอกชื่อผู้สนับสนุน..."
                    disabled={savingSupporter}
                  />
                  <TextField
                    label="เหตุผลในการสนับสนุน"
                    value={supportReason}
                    onChange={(e) => setSupportReason(e.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    rows={3}
                    placeholder="กรอกเหตุผลในการสนับสนุน..."
                    disabled={savingSupporter}
                  />
                </Stack>
              ) : (
                <>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', mb: 0.25 }}>
                      ผู้สนับสนุน/ผู้เสนอชื่อ:
                    </Typography>
                    <Typography variant="body2" sx={{ color: supporterName ? 'text.secondary' : 'text.disabled', fontSize: '0.875rem', fontStyle: supporterName ? 'normal' : 'italic' }}>
                      {supporterName || 'ยังไม่ได้ระบุ'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', mb: 0.25 }}>
                      เหตุผลในการสนับสนุน:
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.6, color: supportReason ? 'text.secondary' : 'text.disabled', fontSize: '0.875rem', fontStyle: supportReason ? 'normal' : 'italic' }}>
                      {supportReason || 'ยังไม่ได้ระบุ'}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>

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
          onClick={handleClose} 
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

    {/* Confirm Delete Dialog - Separate from main dialog */}
    <Dialog
      open={deleteConfirmOpen}
      onClose={() => setDeleteConfirmOpen(false)}
      maxWidth="xs"
      fullWidth
      TransitionProps={{
        timeout: 0
      }}
      slotProps={{
        backdrop: {
          sx: {
            zIndex: 20001,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }}
      sx={{ 
        zIndex: 20002,
        '& .MuiDialog-container': {
          zIndex: 20002
        },
        '& .MuiDialog-paper': {
          zIndex: 20002
        }
      }}
    >
      <DialogTitle>ยืนยันการลบรูปภาพ</DialogTitle>
      <DialogContent>
        <Typography>คุณต้องการลบรูปภาพหรือไม่?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">
          ยกเลิก
        </Button>
        <Button onClick={handleConfirmDelete} variant="contained" color="error" autoFocus>
          ลบ
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
