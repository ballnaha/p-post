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
  alpha,
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
  ArrowDownward as ArrowDownwardIcon,
  AutoFixHigh as AutoFixHighIcon,
  ArrowRightAlt as ArrowRightAltIcon,
} from '@mui/icons-material';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { formatBuddhistDate } from '@/utils/dateFormat';

// Interface สำหรับข้อมูลบุคลากร (รองรับทั้ง police-personnel, swap-list, three-way-swap, vacant-position)
export interface PersonnelData {
  id?: string;
  isPlaceholder?: boolean;
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
  requestedPosition?: string | null; // ตำแหน่งที่ร้องขอ
  supporterName?: string | null; // ผู้สนับสนุน/ผู้เสนอชื่อ
  supportReason?: string | null; // เหตุผลในการสนับสนุน
  avatarUrl?: string | null; // URL ของรูป avatar
  // New position fields (for swap/transfer display)
  toPosition?: string | null;
  toPositionNumber?: string | null;
  toUnit?: string | null;
  toPosCode?: string | null;
  toPosCodeId?: number | null;
  toPosCodeMaster?: {
    id: number;
    name: string;
  } | null;
  // Swap partner info
  swapPartnerName?: string | null;
  swapPartnerRank?: string | null;
}

interface PersonnelDetailModalProps {
  open: boolean;
  onClose: () => void;
  personnel: PersonnelData | null;
  loading?: boolean;
  title?: string; // Custom title (default: "รายละเอียดบุคลากร")
  onClearData?: () => void; // Optional callback to clear personnel data after animation
  onAvatarUpdate?: (avatarUrl: string | null) => void; // Callback เมื่อ avatar เปลี่ยนแปลง
  onSupporterUpdate?: (requestedPosition: string | null, supporterName: string | null, supportReason: string | null) => void;
  targetInfo?: PersonnelData | null;
  onSuggest?: (data: PersonnelData) => void;
  onPositionUpdate?: (actingAs: string | null) => void;
  onNotesUpdate?: (notes: string | null) => void;
  variant?: 'default' | 'vacant';
}

const formatDate = formatBuddhistDate;

export default function PersonnelDetailModal({
  open,
  onClose,
  personnel,
  loading = false,
  title = 'รายละเอียดบุคลากร',
  onClearData,
  onAvatarUpdate,
  onSupporterUpdate,
  targetInfo,
  onSuggest,
  onPositionUpdate,
  onNotesUpdate,
  variant = 'default'
}: PersonnelDetailModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showSnackbar } = useSnackbar();
  const isVacant = variant === 'vacant';
  const isPlaceholderPersonnel = Boolean(
    personnel?.isPlaceholder ||
    personnel?.id?.startsWith('placeholder-') ||
    (personnel as any)?.originalId?.startsWith('placeholder-')
  );

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supporter editing state
  const [isEditingSupporter, setIsEditingSupporter] = useState(false);
  const [requestedPosition, setRequestedPosition] = useState<string>('');
  const [supporterName, setSupporterName] = useState<string>('');
  const [supportReason, setSupportReason] = useState<string>('');
  const [savingSupporter, setSavingSupporter] = useState(false);

  // Position editing state
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [actingAs, setActingAs] = useState<string>('');
  const [savingPosition, setSavingPosition] = useState(false);

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);

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
      setRequestedPosition(personnel.requestedPosition || '');
      setSupporterName(personnel.supporterName || '');
      setSupportReason(personnel.supportReason || '');
      setActingAs(personnel.actingAs || '');
      setNotes(personnel.notes || '');
    }
  }, [personnel]);

  // Reset editing state when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditingSupporter(false);
      setIsEditingPosition(false);
      setIsEditingNotes(false);
    }
  }, [open]);

  // Get original ID for API calls
  // This is needed because board items have generated IDs like "cuid-board-timestamp"
  // The originalId field stores the database ID (CUID)
  const getOriginalId = (): string | null => {
    if (!personnel) return null;
    // First check if originalId exists (set when adding to board)
    if ((personnel as any).originalId) return String((personnel as any).originalId);
    // If id looks like a board-generated id, extract original CUID
    if (personnel.id && personnel.id.includes('-board-')) {
      const parts = personnel.id.split('-board-');
      return parts[0];
    }
    // Otherwise use id as is (for items from left panel)
    return personnel.id || null;
  };

  const originalId = getOriginalId();

  // Get transaction detail ID if personnel came from a swap transaction
  const getTransactionDetailId = (): string | null => {
    if (!personnel) return null;
    // Check if this personnel has swapDetailId (added when loaded from swap transaction)
    return (personnel as any).swapDetailId || null;
  };

  // Sync data to SwapTransactionDetail (if personnel is from a swap transaction)
  const syncToSwapTransaction = async (data: {
    requestedPosition?: string | null;
    supportName?: string | null;
    supportReason?: string | null;
    notes?: string | null;
    fromActingAs?: string | null;
  }) => {
    const detailId = getTransactionDetailId();
    if (!detailId) return; // Not from a swap transaction, skip

    try {
      await fetch(`/api/swap-transactions/detail/${detailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      // Silent sync - don't show error to user if this fails
    } catch (error) {
      console.error('Sync to swap transaction failed:', error);
    }
  };

  const handleClose = () => {
    setIsEditingSupporter(false);
    setIsEditingPosition(false);
    setIsEditingNotes(false);
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
    setRequestedPosition(personnel?.requestedPosition || '');
    setSupporterName(personnel?.supporterName || '');
    setSupportReason(personnel?.supportReason || '');
    setIsEditingSupporter(false);
  };

  const handleSaveSupporter = async () => {
    if (isPlaceholderPersonnel) {
      setIsEditingSupporter(false);
      return;
    }

    if (!originalId) {
      showSnackbar('ไม่สามารถบันทึกได้ เนื่องจากไม่พบ ID บุคลากร', 'error');
      return;
    }

    try {
      setSavingSupporter(true);

      const response = await fetch(`/api/police-personnel/${originalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestedPosition: requestedPosition.trim() || null,
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
        requestedPosition.trim() || null,
        supporterName.trim() || null,
        supportReason.trim() || null
      );

      // Sync to SwapTransactionDetail if from a swap transaction
      syncToSwapTransaction({
        requestedPosition: requestedPosition.trim() || null,
        supportName: supporterName.trim() || null,
        supportReason: supportReason.trim() || null,
      });
    } catch (error) {
      console.error('Save supporter error:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSavingSupporter(false);
    }
  };

  // Position handlers
  const handleEditPosition = () => {
    setIsEditingPosition(true);
  };

  const handleCancelEditPosition = () => {
    setActingAs(personnel?.actingAs || '');
    setIsEditingPosition(false);
  };

  const handleSavePosition = async () => {
    if (!originalId) {
      showSnackbar('ไม่สามารถบันทึกได้ เนื่องจากไม่พบ ID บุคลากร', 'error');
      return;
    }

    try {
      setSavingPosition(true);

      const response = await fetch(`/api/police-personnel/${originalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actingAs: actingAs.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }

      showSnackbar('บันทึกข้อมูลตำแหน่งสำเร็จ', 'success');
      setIsEditingPosition(false);

      // Call callback to update parent state
      onPositionUpdate?.(actingAs.trim() || null);

      // Sync to SwapTransactionDetail if from a swap transaction
      syncToSwapTransaction({
        fromActingAs: actingAs.trim() || null,
      });
    } catch (error) {
      console.error('Save position error:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSavingPosition(false);
    }
  };

  // Notes handlers
  const handleEditNotes = () => {
    setIsEditingNotes(true);
  };

  const handleCancelEditNotes = () => {
    setNotes(personnel?.notes || '');
    setIsEditingNotes(false);
  };

  const handleSaveNotes = async () => {
    if (isPlaceholderPersonnel) {
      setIsEditingNotes(false);
      return;
    }

    if (!originalId) {
      showSnackbar('ไม่สามารถบันทึกได้ เนื่องจากไม่พบ ID บุคลากร', 'error');
      return;
    }

    try {
      setSavingNotes(true);

      const response = await fetch(`/api/police-personnel/${originalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }

      showSnackbar('บันทึกหมายเหตุสำเร็จ', 'success');
      setIsEditingNotes(false);

      // Call callback to update parent state
      onNotesUpdate?.(notes.trim() || null);

      // Sync to SwapTransactionDetail if from a swap transaction
      syncToSwapTransaction({
        notes: notes.trim() || null,
      });
    } catch (error) {
      console.error('Save notes error:', error);
      showSnackbar(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  // Avatar handlers
  const handleAddAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !originalId) return;

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
      const response = await fetch(`/api/personnel/${originalId}/avatar`, {
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

    if (!originalId) return;

    try {
      setUploading(true);

      // เรียก API delete
      const response = await fetch(`/api/personnel/${originalId}/avatar`, {
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
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
              {onSuggest && !personnel.rank && personnel.posCodeMaster?.id && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AutoFixHighIcon />}
                  onClick={() => onSuggest(personnel)}
                  sx={{
                    height: 28,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'warning.dark',
                    borderColor: 'warning.main',
                    bgcolor: alpha('#f59e0b', 0.05),
                    '&:hover': { bgcolor: alpha('#f59e0b', 0.1), borderColor: 'warning.dark' }
                  }}
                >
                  แนะนำผู้ที่เหมาะสม
                </Button>
              )}
              <Chip
                label={isVacant ? 'ว่าง' : (personnel.rank ? 'มีผู้ดำรง' : 'รายการยื่นขอตำแหน่ง')}
                color={isVacant ? 'error' : (personnel.rank ? 'success' : 'default')}
                size="small"
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            </Box>
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
                      borderColor: isVacant ? 'error.main' : 'primary.main',
                      boxShadow: 3,
                      opacity: uploading ? 0.5 : 1,
                      transition: 'opacity 0.3s',
                      ...(isVacant && { bgcolor: 'error.light' })
                    }}
                  >
                    {!avatarUrl && <PersonIcon sx={{ fontSize: 60, color: isVacant ? 'white' : 'inherit' }} />}
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
                  {!isVacant && (
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
                              disabled={uploading || !originalId}
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
                                disabled={uploading || !originalId}
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
                                disabled={uploading || !originalId}
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
                  )}

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={uploading || !originalId}
                  />
                </Box>
              </Box>

              {/* Header Section - ชื่อและตำแหน่ง */}
              <Box sx={{ p: 2, mb: 2, bgcolor: isVacant ? 'error.main' : 'primary.main', color: 'white', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25, fontSize: '1.125rem' }}>
                  {isVacant ? 'ตำแหน่งว่าง' : `${personnel.rank || ''} ${personnel.fullName || 'รายการยื่นขอตำแหน่ง'}`}
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
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{personnel.noId || personnel.id || '-'}</Typography>
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

                  {/* ข้อมูลตำแหน่งใหม่ (รวม toPosition และ targetInfo) */}
                  {(personnel.toPosition || targetInfo) && (
                    <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: alpha('#22c55e', 0.08), border: '2px solid', borderColor: 'success.main', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.dark', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.938rem' }}>
                        <ArrowRightAltIcon fontSize="small" />
                        🟢 ตำแหน่งใหม่ (ที่จะไป)
                      </Typography>
                      <Divider sx={{ mb: 1, borderColor: 'success.light' }} />
                      <Stack spacing={0.75} divider={<Divider sx={{ opacity: 0.5 }} />}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={700} color="success.dark" sx={{ fontSize: '0.875rem' }}>
                            {targetInfo?.position || personnel.toPosition || targetInfo?.posCodeMaster?.name || '-'}
                          </Typography>
                        </Box>
                        {(personnel.toPositionNumber || targetInfo?.positionNumber) && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เลขตำแหน่ง</Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.875rem' }}>
                              {personnel.toPositionNumber || targetInfo?.positionNumber}
                            </Typography>
                          </Box>
                        )}
                        {(personnel.toPosCodeMaster || targetInfo?.posCodeMaster) && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>POSCODE</Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.875rem' }}>
                              {personnel.toPosCodeMaster
                                ? `${personnel.toPosCodeMaster.id} - ${personnel.toPosCodeMaster.name}`
                                : targetInfo?.posCodeMaster
                                  ? `${targetInfo.posCodeMaster.id} - ${targetInfo.posCodeMaster.name}`
                                  : '-'}
                            </Typography>
                          </Box>
                        )}
                        {!personnel.toPosCodeMaster && !targetInfo?.posCodeMaster && personnel.toPosCode && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>POSCODE</Typography>
                            <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.875rem' }}>{personnel.toPosCode}</Typography>
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>หน่วยปลายทาง</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.875rem' }}>
                            {targetInfo?.unit || personnel.toUnit || '-'}
                          </Typography>
                        </Box>
                        {/* แสดงข้อมูลคู่สลับ */}
                        {(targetInfo?.fullName || personnel.swapPartnerName) && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'success.light' }}>
                            <Typography variant="caption" color="text.secondary" display="block">สลับกับ:</Typography>
                            <Typography variant="body2" fontWeight={600} color="success.dark">
                              {targetInfo?.rank || personnel.swapPartnerRank} {targetInfo?.fullName || personnel.swapPartnerName}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  )}


                  {/* ข้อมูลบุคคล */}
                  {!isVacant && personnel.rank && (
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
                  {!isVacant && personnel.rank && (
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
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(personnel.retirementDate)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>จำนวนปี</Typography>
                          <Typography variant="body2" fontWeight={600} color="info.main" sx={{ fontSize: '0.875rem' }}>{personnel.yearsOfService ? `${personnel.yearsOfService} ปี` : '-'}</Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  )}

                  {/* ข้อมูลการฝึกอบรม */}
                  {!isVacant && (personnel.trainingLocation || personnel.trainingCourse) && (
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
              {!isVacant && !isPlaceholderPersonnel && (
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
                          disabled={!originalId}
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
                        label="ตำแหน่งที่ร้องขอ"
                        value={requestedPosition}
                        onChange={(e) => setRequestedPosition(e.target.value)}
                        fullWidth
                        size="small"
                        placeholder="เช่น ร้องขอตำแหน่งใน จ.ราชบุรี..."
                        disabled={savingSupporter}
                      />
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
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem', mb: 0.25 }}>
                          ตำแหน่งที่ร้องขอ:
                        </Typography>
                        <Typography variant="body2" sx={{ color: requestedPosition ? 'text.primary' : 'text.disabled', fontSize: '0.875rem', fontStyle: requestedPosition ? 'bold' : 'italic', fontWeight: 600 }}>
                          {requestedPosition || 'ยังไม่ได้ระบุ'}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem', mb: 0.25 }}>
                          ผู้สนับสนุน/ผู้เสนอชื่อ:
                        </Typography>
                        <Typography variant="body2" sx={{ color: supporterName ? 'text.primary' : 'text.disabled', fontSize: '0.875rem', fontStyle: supporterName ? 'bold' : 'italic', fontWeight: 600 }}>
                          {supporterName || 'ยังไม่ได้ระบุ'}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem', mb: 0.25 }}>
                          เหตุผลในการสนับสนุน:
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.6, color: supportReason ? 'text.primary' : 'text.disabled', fontSize: '0.875rem', fontStyle: supportReason ? 'bold' : 'italic', fontWeight: 600 }}>
                          {supportReason || 'ยังไม่ได้ระบุ'}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Paper>
              )}

              {/* หมายเหตุ */}
              <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
                    หมายเหตุเพิ่มเติม
                  </Typography>
                  {!isEditingNotes ? (
                    <IconButton size="small" onClick={handleEditNotes} sx={{ p: 0.5 }} disabled={isPlaceholderPersonnel || !originalId}>
                      <EditIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={handleCancelEditNotes} disabled={savingNotes}>
                        <CloseIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      <IconButton size="small" onClick={handleSaveNotes} disabled={savingNotes} color="primary">
                        <SaveIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                {isEditingNotes ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="เพิ่มหมายเหตุ..."
                    sx={{ bgcolor: 'white' }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ fontStyle: notes ? 'normal' : 'italic', color: notes ? 'text.primary' : 'text.disabled' }}>
                    {notes || 'ไม่มีหมายเหตุ'}
                  </Typography>
                )}
              </Paper>
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
