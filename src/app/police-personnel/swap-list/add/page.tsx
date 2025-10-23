'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Autocomplete,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  SwapHoriz as SwapHorizIcon,
  Person as PersonIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  School as EducationIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

interface PolicePersonnel {
  id: string;
  noId?: string;
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
  age?: string;
  yearsOfService?: string;
  // Extended fields for dialog
  seniority?: string;
  birthDate?: string;
  education?: string;
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  trainingLocation?: string;
  trainingCourse?: string;
  actingAs?: string;
}

export default function AddSwapTransactionPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [personnelOptions, setPersonnelOptions] = useState<PolicePersonnel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [swappedPersonnelIds, setSwappedPersonnelIds] = useState<Set<string>>(new Set());
  
  // Personnel selections
  const [personnelA, setPersonnelA] = useState<PolicePersonnel | null>(null);
  const [personnelB, setPersonnelB] = useState<PolicePersonnel | null>(null);
  
  // Dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPersonnelDetail, setSelectedPersonnelDetail] = useState<PolicePersonnel | null>(null);
  
  // Form data
  const [year, setYear] = useState<number>(new Date().getFullYear() + 543);
  const [swapDate, setSwapDate] = useState<Dayjs | null>(dayjs());
  const [notes, setNotes] = useState('');
  const [groupNumber, setGroupNumber] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      const swappedIds = await fetchNextGroupNumber();
      await fetchPersonnelOptions(swappedIds);
    };
    fetchData();
  }, []);

  const fetchNextGroupNumber = async (): Promise<Set<string>> => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/swap-transactions?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch swap transactions');
      }
      
      const result = await response.json();
      const transactions = result.data || [];
      const count = Array.isArray(transactions) ? transactions.length : 0;
      const nextNumber = String(count + 1).padStart(3, '0');
      setGroupNumber(`${currentYear}/${nextNumber}`);
      
      // Extract personnel IDs who already swapped in this year
      const swappedIds = new Set<string>();
      if (Array.isArray(transactions)) {
        transactions.forEach((transaction: any) => {
          if (Array.isArray(transaction.swapDetails)) {
            transaction.swapDetails.forEach((detail: any) => {
              if (detail.personnelId) {
                swappedIds.add(detail.personnelId);
              }
            });
          }
        });
      }
      setSwappedPersonnelIds(swappedIds);
      return swappedIds;
    } catch (error) {
      console.error('Error fetching group number:', error);
      // Fallback to default
      const currentYear = new Date().getFullYear() + 543;
      setGroupNumber(`${currentYear}/001`);
      return new Set<string>();
    }
  };

  const fetchPersonnelOptions = async (excludeIds?: Set<string>) => {
    try {
      setSearchLoading(true);
      // Fetch from swap-list API to get personnel who are in the current year's swap list
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/swap-list?year=${currentYear}`);

      if (!response.ok) {
        throw new Error('Failed to fetch swap list');
      }

      const json = await response.json();
      const list: PolicePersonnel[] = Array.isArray(json?.data) ? json.data : [];
      // Filter only personnel with rank and who haven't swapped yet this year
      const idsToExclude = excludeIds || swappedPersonnelIds;
      setPersonnelOptions(
        list.filter((p: PolicePersonnel) => 
          !!p.rank && !idsToExclude.has(p.id)
        )
      );
    } catch (error) {
      console.error('Error fetching swap list:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePersonnelSearch = (event: React.SyntheticEvent, value: string) => {
    // Search is now client-side since we already have all swap list data
    // Filter happens in the Autocomplete component itself
  };

  const handleShowDetail = (personnel: PolicePersonnel) => {
    setSelectedPersonnelDetail(personnel);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedPersonnelDetail(null);
  };

  const handleSelectPersonnelA = (newValue: PolicePersonnel | null) => {
    setPersonnelA(newValue);
    // No need to reset B anymore since position doesn't need to match
  };

  const handleSelectPersonnelB = (newValue: PolicePersonnel | null) => {
    setPersonnelB(newValue);
  };

  // Filter options for B - no need to check same position
  const optionsForB = personnelA
    ? personnelOptions.filter(
        (p) =>
          p.id !== personnelA.id &&
          p.rank // Ensure has rank
      )
    : [];

  const canSwap = personnelA && personnelB;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!personnelA || !personnelB) {
      toast.error('กรุณาเลือกบุคลากร 2 คน');
      return;
    }

    if (!year) {
      toast.error('กรุณาระบุประจำปีให้ถูกต้อง');
      return;
    }

    if (!swapDate) {
      toast.error('กรุณาเลือกวันที่ทำการสลับ');
      return;
    }

    if (!groupNumber || groupNumber.trim() === '') {
      toast.error('ไม่พบเลขกลุ่ม กรุณาลองใหม่อีกครั้ง');
      return;
    }

    // Validate personnel A
    if (!personnelA.id || !personnelA.fullName || !personnelA.position || !personnelA.unit) {
      toast.error('ข้อมูลบุคลากร A ไม่ครบถ้วน');
      return;
    }

    // Validate personnel B
    if (!personnelB.id || !personnelB.fullName || !personnelB.position || !personnelB.unit) {
      toast.error('ข้อมูลบุคลากร B ไม่ครบถ้วน');
      return;
    }

    // Check if trying to swap with the same person
    if (personnelA.id === personnelB.id) {
      toast.error('ไม่สามารถสลับกับบุคลากรคนเดียวกันได้');
      return;
    }

    try {
      setLoading(true);

      // สร้างชื่อกลุ่มอัตโนมัติ
      const groupName = `${personnelA.fullName} ⟷ ${personnelB.fullName}`;

      const swapDetails = [
        {
          personnelId: personnelA.id,
          nationalId: personnelA.nationalId,
          fullName: personnelA.fullName,
          rank: personnelA.rank,
          fromPosition: personnelA.position,
          fromPositionNumber: personnelA.positionNumber,
          fromUnit: personnelA.unit,
          toPosition: personnelB.position, // Same position
          toPositionNumber: personnelB.positionNumber,
          toUnit: personnelB.unit, // Swap to B's unit
        },
        {
          personnelId: personnelB.id,
          nationalId: personnelB.nationalId,
          fullName: personnelB.fullName,
          rank: personnelB.rank,
          fromPosition: personnelB.position,
          fromPositionNumber: personnelB.positionNumber,
          fromUnit: personnelB.unit,
          toPosition: personnelA.position, // Same position
          toPositionNumber: personnelA.positionNumber,
          toUnit: personnelA.unit, // Swap to A's unit
        },
      ];

      const response = await fetch('/api/swap-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          swapDate: swapDate ? swapDate.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
          swapType: 'two-way',
          groupName: groupName, // ชื่อกลุ่ม
          groupNumber: groupNumber, // เลขกลุ่ม
          notes: notes || `การสลับตำแหน่ง: ${groupName}`,
          swapDetails,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save swap transaction');
      }

      toast.success('บันทึกผลการสลับตำแหน่งสำเร็จ');
      router.push('/police-personnel/swap-list');
    } catch (error: any) {
      console.error('Error saving swap transaction:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2,
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SwapHorizIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  บันทึกผลการสลับตำแหน่ง
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                เลือกบุคลากร 2 คน เพื่อบันทึกการสลับหน่วยงานกัน
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
            >
              ย้อนกลับ
            </Button>
          </Box>

          {/* Group Number Display */}
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              <TextField
                label="เลขกลุ่ม"
                value={groupNumber}
                disabled
                size="small"
                helperText="เลขกลุ่มจะถูกสร้างอัตโนมัติ"
              />
              <TextField
                label="ประจำปี *"
                type="number"
                value={year || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setYear(value === '' ? 0 : parseInt(value) || 0);
                }}
                required
                inputProps={{ min: 2500, max: 2700 }}
                size="small"
              />
              <DatePicker
                label="วันที่ทำการสลับ *"
                value={swapDate}
                onChange={(newValue) => setSwapDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    required: true,
                  },
                }}
              />
            </Box>
          </LocalizationProvider>
        </Paper>

        {/* Main Form */}
        <form onSubmit={handleSubmit}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' }, 
              gap: 3,
              alignItems: 'start',
            }}>
              {/* บุคลากร A */}
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  bgcolor: personnelA ? 'success.50' : 'grey.50',
                  border: 2,
                  borderColor: personnelA ? 'success.main' : 'grey.300',
                  transition: 'all 0.3s',
                }}
              >
                <Typography variant="h6" fontWeight={600} mb={2} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  บุคลากร A
                </Typography>
                
                <Autocomplete
                  fullWidth
                  size="small"
                  options={personnelOptions}
                  value={personnelA}
                  getOptionLabel={(option) => `${option.rank || ''} ${option.fullName || ''} - ${option.position || ''} (${option.unit || ''})`}
                  onChange={(event, newValue) => handleSelectPersonnelA(newValue)}
                  onInputChange={handlePersonnelSearch}
                  loading={searchLoading}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="🔍 เลือกบุคลากร A" 
                      placeholder="ค้นหา..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {searchLoading ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                {personnelA && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Divider sx={{ flexGrow: 1 }} />
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleShowDetail(personnelA)}
                        sx={{ ml: 1 }}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Box>
                    <Stack spacing={1.5}>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {personnelA.position}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">หน่วย (ปัจจุบัน)</Typography>
                        <Typography variant="body2" fontWeight={600}>{personnelA.unit}</Typography>
                      </Box>
                      {personnelA.age && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">อายุ</Typography>
                          <Typography variant="body2">{personnelA.age}</Typography>
                        </Box>
                      )}
                      {personnelA.yearsOfService && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">อายุราชการ</Typography>
                          <Typography variant="body2">{personnelA.yearsOfService} ปี</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}
              </Paper>

              {/* ลูกศรกลาง */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                minHeight: { xs: 40, md: 300 },
                py: { xs: 2, md: 0 },
              }}>
                <SwapHorizIcon 
                  sx={{ 
                    fontSize: { xs: 40, md: 64 }, 
                    color: canSwap ? 'success.main' : 'grey.400',
                    transition: 'all 0.3s',
                  }} 
                />
              </Box>

              {/* บุคลากร B */}
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  bgcolor: personnelB ? 'success.50' : 'grey.50',
                  border: 2,
                  borderColor: personnelB ? 'success.main' : 'grey.300',
                  transition: 'all 0.3s',
                }}
              >
                <Typography variant="h6" fontWeight={600} mb={2} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  บุคลากร B
                </Typography>
                
                <Autocomplete
                  fullWidth
                  size="small"
                  options={optionsForB}
                  value={personnelB}
                  getOptionLabel={(option) => `${option.rank || ''} ${option.fullName || ''} - ${option.position || ''} (${option.unit || ''})`}
                  onChange={(event, newValue) => handleSelectPersonnelB(newValue)}
                  disabled={!personnelA}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="🔍 เลือกบุคลากร B" 
                      placeholder={personnelA ? "ค้นหา..." : "เลือก A ก่อน"} 
                    />
                  )}
                  noOptionsText={
                    personnelA 
                      ? "ไม่พบบุคลากร" 
                      : "เลือกบุคลากร A ก่อน"
                  }
                />

                {personnelB && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Divider sx={{ flexGrow: 1 }} />
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleShowDetail(personnelB)}
                        sx={{ ml: 1 }}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Box>
                    <Stack spacing={1.5}>
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {personnelB.position}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">หน่วย (ปัจจุบัน)</Typography>
                        <Typography variant="body2" fontWeight={600}>{personnelB.unit}</Typography>
                      </Box>
                      {personnelB.age && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">อายุ</Typography>
                          <Typography variant="body2">{personnelB.age}</Typography>
                        </Box>
                      )}
                      {personnelB.yearsOfService && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">อายุราชการ</Typography>
                          <Typography variant="body2">{personnelB.yearsOfService} ปี</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}
              </Paper>
            </Box>

            {/* Swap Result Preview */}
            {canSwap && (
              <Alert severity="success" sx={{ mt: 3 }}>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  📝 ชื่อกลุ่ม: {personnelA.fullName} ⟷ {personnelB.fullName}
                </Typography>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  ✅ ผลการสลับตำแหน่ง:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    • <strong>{personnelA.fullName}</strong> จาก <strong>{personnelA.position}</strong> → ไป <strong style={{ color: 'green' }}>{personnelB.position}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • <strong>{personnelB.fullName}</strong> จาก <strong>{personnelB.position}</strong> → ไป <strong style={{ color: 'green' }}>{personnelA.position}</strong>
                  </Typography>
                </Box>
              </Alert>
            )}
          </Paper>

          {/* Notes Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              หมายเหตุ
            </Typography>
            <TextField
              label="หมายเหตุ"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
              size="small"
              fullWidth
            />
          </Paper>

          {/* Submit Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => router.back()}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={loading || !canSwap}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกผลการสลับ'}
            </Button>
          </Box>
        </form>

        {/* Personnel Detail Dialog */}
        <Dialog 
          open={detailDialogOpen} 
          onClose={handleCloseDetail}
          maxWidth="md"
          fullWidth
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
              รายละเอียดบุคลากร
            </Box>
            {selectedPersonnelDetail && (
              <Chip 
                label={selectedPersonnelDetail.rank ? 'มีผู้ดำรง' : 'ตำแหน่งว่าง'} 
                color={selectedPersonnelDetail.rank ? 'success' : 'default'} 
                size="small" 
                sx={{ ml: 'auto', height: 24, fontSize: '0.75rem' }}
              />
            )}
          </DialogTitle>
          
          <DialogContent sx={{ p: 2 , mt: 2}}>
            {selectedPersonnelDetail && (
              <Box>
                {/* Header Section - ชื่อและตำแหน่ง */}
                <Box sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.25, fontSize: '1.125rem' }}>
                    {selectedPersonnelDetail.rank || ''} {selectedPersonnelDetail.fullName || 'ตำแหน่งว่าง'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.938rem' }}>
                    {selectedPersonnelDetail.position} • {selectedPersonnelDetail.unit || '-'}
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'  }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ID</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.noId || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เลขตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.positionNumber || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.position || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ทำหน้าที่</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.actingAs || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>หน่วย</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.unit || '-'}</Typography>
                        </Box>
                      </Stack>
                    </Paper>

                    {/* ข้อมูลบุคคล */}
                    {selectedPersonnelDetail.rank && (
                      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.938rem' }}>
                          <PersonIcon fontSize="small" />
                          ข้อมูลบุคคล
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Stack spacing={0.75} divider={<Divider />}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ชื่อ-สกุล</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.fullName || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ยศ</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.rank || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>อาวุโส</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.seniority || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>อายุ</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.age || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>วันเกิด</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.birthDate || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เลขบัตรประชาชน</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{selectedPersonnelDetail.nationalId || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>คุณวุฒิ</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.education || '-'}</Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    )}
                  </Box>

                  {/* Right Column */}
                  <Box>
                    {/* ข้อมูลการแต่งตั้ง */}
                    {selectedPersonnelDetail.rank && (
                      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.938rem' }}>
                          <CalendarIcon fontSize="small" />
                          ข้อมูลการแต่งตั้ง
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Stack spacing={0.75} divider={<Divider />}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>แต่งตั้งครั้งสุดท้าย</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.lastAppointment || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ระดับนี้เมื่อ</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.currentRankSince || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>บรรจุ</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.enrollmentDate || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เกษียณ</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.retirementDate || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>จำนวนปี</Typography>
                            <Typography variant="body2" fontWeight={600} color="info.main" sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.yearsOfService ? `${selectedPersonnelDetail.yearsOfService} ปี` : '-'}</Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    )}

                    {/* ข้อมูลการฝึกอบรม */}
                    {(selectedPersonnelDetail.trainingLocation || selectedPersonnelDetail.trainingCourse) && (
                      <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.938rem' }}>
                          <EducationIcon fontSize="small" />
                          ข้อมูลการฝึกอบรม
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        <Stack spacing={0.75} divider={<Divider />}>
                          {selectedPersonnelDetail.trainingLocation && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>สถานที่ฝึกอบรม</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.trainingLocation}</Typography>
                            </Box>
                          )}
                          {selectedPersonnelDetail.trainingCourse && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>หลักสูตร (นรต.)</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedPersonnelDetail.trainingCourse}</Typography>
                            </Box>
                          )}
                        </Stack>
                      </Paper>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleCloseDetail} variant="contained" size="medium" sx={{ minWidth: 100, fontWeight: 600 }}>
              ปิด
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
