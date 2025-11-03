'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

interface PolicePersonnel {
  id: string;
  noId?: string;
  posCodeId?: number;
  posCodeMaster?: {
    id: number;
    name: string;
  };
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

  const fetchNextGroupNumber = useCallback(async (): Promise<Set<string>> => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=two-way`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch swap transactions');
      }
      
      const result = await response.json();
      const transactions = result.data || [];
      
      // Find the maximum group number for this year (format: 2568/2W-001)
      let maxNumber = 0;
      if (Array.isArray(transactions)) {
        transactions.forEach((transaction: any) => {
          if (transaction.groupNumber) {
            // Extract number from format "2568/2W-001"
            const match = transaction.groupNumber.match(/\/2W-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) {
                maxNumber = num;
              }
            }
          }
        });
      }
      
      // Next number is max + 1
      const nextNumber = maxNumber + 1;
      const formattedNumber = String(nextNumber).padStart(3, '0');
      setGroupNumber(`${currentYear}/2W-${formattedNumber}`);
      
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
      setGroupNumber(`${currentYear}/2W-001`);
      return new Set<string>();
    }
  }, []);

  const fetchPersonnelOptions = useCallback(async (excludeIds?: Set<string>) => {
    try {
      setSearchLoading(true);
      // Fetch from swap-list API to get personnel who are in the current year's swap list
      // Filter by swapType=two-way to get only personnel for two-way swap
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/swap-list?year=${currentYear}&swapType=two-way`);

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
  }, [swappedPersonnelIds]);

  useEffect(() => {
    const fetchData = async () => {
      const swappedIds = await fetchNextGroupNumber();
      await fetchPersonnelOptions(swappedIds);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ เรียกแค่ครั้งเดียวตอน mount

  const handleShowDetail = useCallback((personnel: PolicePersonnel) => {
    setSelectedPersonnelDetail(personnel);
    setDetailDialogOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
  }, []);

  const handleSelectPersonnelA = useCallback((newValue: PolicePersonnel | null) => {
    setPersonnelA(newValue);
    // No need to reset B anymore since position doesn't need to match
  }, []);

  const handleSelectPersonnelB = useCallback((newValue: PolicePersonnel | null) => {
    setPersonnelB(newValue);
  }, []);

  // Memoized filter options for B - no need to check same position
  const optionsForB = useMemo(() => {
    return personnelA
      ? personnelOptions.filter(
          (p) =>
            p.id !== personnelA.id &&
            p.rank // Ensure has rank
        )
      : [];
  }, [personnelA, personnelOptions]);

  const canSwap = useMemo(() => 
    Boolean(personnelA && personnelB), 
    [personnelA, personnelB]
  );

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
          sequence: 1, // บุคลากร A ขึ้นก่อน
          personnelId: personnelA.id,
          nationalId: personnelA.nationalId,
          fullName: personnelA.fullName,
          rank: personnelA.rank,
          posCodeId: personnelA.posCodeId,
          fromPosition: personnelA.position,
          fromPositionNumber: personnelA.positionNumber,
          fromUnit: personnelA.unit,
          toPosition: personnelB.position, // Same position
          toPositionNumber: personnelB.positionNumber,
          toUnit: personnelB.unit, // Swap to B's unit
        },
        {
          sequence: 2, // บุคลากร B ขึ้นหลัง
          personnelId: personnelB.id,
          nationalId: personnelB.nationalId,
          fullName: personnelB.fullName,
          rank: personnelB.rank,
          posCodeId: personnelB.posCodeId,
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
      <Box>
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
                
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  ผลการสลับตำแหน่ง
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
                type="text"
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
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body1">{option.rank} {option.fullName || '-'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          เลขตำแหน่ง: {option.positionNumber || '-'} | ตำแหน่ง: {option.position || '-'} | หน่วย: {option.unit || '-'}
                        </Typography>
                      </Box>
                    </li>
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
                        title="ดูข้อมูลเพิ่มเติม"
                      >
                        <InfoIcon />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      {/* Column 1 */}
                      <Stack spacing={1.5}>
                        {personnelA.noId && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">ID</Typography>
                            <Typography variant="body2" fontWeight={500}>{personnelA.noId}</Typography>
                          </Box>
                        )}
                        {personnelA.posCodeMaster && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">POSCODE</Typography>
                            <Typography variant="body2" fontWeight={600} color="primary.main">
                              {personnelA.posCodeMaster.id} - {personnelA.posCodeMaster.name}
                            </Typography>
                            
                          </Box>
                        )}
                        <Box>
                          <Typography variant="caption" color="text.secondary">ชื่อ-สกุล</Typography>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {personnelA.rank} {personnelA.fullName}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {personnelA.position}
                          </Typography>
                          {personnelA.positionNumber && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              เลขตำแหน่ง: {personnelA.positionNumber}
                            </Typography>
                          )}
                        </Box>
                        {personnelA.actingAs && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">ทำหน้าที่</Typography>
                            <Typography variant="body2" fontWeight={500} color="info.main">
                              {personnelA.actingAs}
                            </Typography>
                          </Box>
                        )}
                        <Box>
                          <Typography variant="caption" color="text.secondary">หน่วย (ปัจจุบัน)</Typography>
                          <Typography variant="body2" fontWeight={600}>{personnelA.unit}</Typography>
                        </Box>
                        {personnelA.nationalId && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">เลขบัตรประชาชน</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {personnelA.nationalId}
                            </Typography>
                          </Box>
                        )}
                        {personnelA.birthDate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันเกิด</Typography>
                            <Typography variant="body2">{personnelA.birthDate}</Typography>
                          </Box>
                        )}
                        {personnelA.age && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">อายุ</Typography>
                            <Typography variant="body2">{personnelA.age} ปี</Typography>
                          </Box>
                        )}
                      </Stack>

                      {/* Column 2 */}
                      <Stack spacing={1.5}>
                        {personnelA.education && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">วุฒิการศึกษา</Typography>
                            <Typography variant="body2">{personnelA.education}</Typography>
                          </Box>
                        )}
                        {personnelA.seniority && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">อาวุโส</Typography>
                            <Typography variant="body2" fontWeight={500}>{personnelA.seniority}</Typography>
                          </Box>
                        )}
                        {personnelA.enrollmentDate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันบรรจุ</Typography>
                            <Typography variant="body2">{personnelA.enrollmentDate}</Typography>
                          </Box>
                        )}
                        {personnelA.yearsOfService && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">อายุราชการ</Typography>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {personnelA.yearsOfService} ปี
                            </Typography>
                          </Box>
                        )}
                        {personnelA.currentRankSince && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">ดำรงยศนี้ตั้งแต่</Typography>
                            <Typography variant="body2">{personnelA.currentRankSince}</Typography>
                          </Box>
                        )}
                        {personnelA.lastAppointment && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">แต่งตั้งครั้งล่าสุด</Typography>
                            <Typography variant="body2">{personnelA.lastAppointment}</Typography>
                          </Box>
                        )}
                        {personnelA.retirementDate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันเกษียณ</Typography>
                            <Typography variant="body2" color="warning.main">
                              {personnelA.retirementDate}
                            </Typography>
                          </Box>
                        )}
                        {personnelA.trainingLocation && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">สถานที่ฝึกอบรม</Typography>
                            <Typography variant="body2">{personnelA.trainingLocation}</Typography>
                          </Box>
                        )}
                        {personnelA.trainingCourse && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">หลักสูตร (นรต.)</Typography>
                            <Typography variant="body2">{personnelA.trainingCourse}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
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
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box>
                        <Typography variant="body1">{option.rank} {option.fullName || '-'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          เลขที่: {option.noId || '-'} | ตำแหน่ง: {option.position || '-'} | หน่วย: {option.unit || '-'}
                        </Typography>
                      </Box>
                    </li>
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
                        title="ดูข้อมูลเพิ่มเติม"
                      >
                        <InfoIcon />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      {/* Column 1 */}
                      <Stack spacing={1.5}>
                        {personnelB.noId && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">ID</Typography>
                            <Typography variant="body2" fontWeight={500}>{personnelB.noId}</Typography>
                          </Box>
                        )}
                        {personnelB.posCodeMaster && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">POSCODE</Typography>
                            <Typography variant="body2" fontWeight={600} color="primary.main">
                              {personnelB.posCodeMaster.id} - {personnelB.posCodeMaster.name}
                            </Typography>
                          </Box>
                        )}
                        <Box>
                          <Typography variant="caption" color="text.secondary">ชื่อ-สกุล</Typography>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {personnelB.rank} {personnelB.fullName}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {personnelB.position}
                          </Typography>
                          {personnelB.positionNumber && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              เลขตำแหน่ง: {personnelB.positionNumber}
                            </Typography>
                          )}
                        </Box>
                        {personnelB.actingAs && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">ทำหน้าที่</Typography>
                            <Typography variant="body2" fontWeight={500} color="info.main">
                              {personnelB.actingAs}
                            </Typography>
                          </Box>
                        )}
                        <Box>
                          <Typography variant="caption" color="text.secondary">หน่วย (ปัจจุบัน)</Typography>
                          <Typography variant="body2" fontWeight={600}>{personnelB.unit}</Typography>
                        </Box>
                        {personnelB.nationalId && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">เลขบัตรประชาชน</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {personnelB.nationalId}
                            </Typography>
                          </Box>
                        )}
                        {personnelB.birthDate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันเกิด</Typography>
                            <Typography variant="body2">{personnelB.birthDate}</Typography>
                          </Box>
                        )}
                        {personnelB.age && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">อายุ</Typography>
                            <Typography variant="body2">{personnelB.age} ปี</Typography>
                          </Box>
                        )}
                      </Stack>

                      {/* Column 2 */}
                      <Stack spacing={1.5}>
                        {personnelB.education && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">วุฒิการศึกษา</Typography>
                            <Typography variant="body2">{personnelB.education}</Typography>
                          </Box>
                        )}
                        {personnelB.seniority && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">อาวุโส</Typography>
                            <Typography variant="body2" fontWeight={500}>{personnelB.seniority}</Typography>
                          </Box>
                        )}
                        {personnelB.enrollmentDate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันบรรจุ</Typography>
                            <Typography variant="body2">{personnelB.enrollmentDate}</Typography>
                          </Box>
                        )}
                        {personnelB.yearsOfService && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">อายุราชการ</Typography>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {personnelB.yearsOfService} ปี
                            </Typography>
                          </Box>
                        )}
                        {personnelB.currentRankSince && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">ดำรงยศนี้ตั้งแต่</Typography>
                            <Typography variant="body2">{personnelB.currentRankSince}</Typography>
                          </Box>
                        )}
                        {personnelB.lastAppointment && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">แต่งตั้งครั้งล่าสุด</Typography>
                            <Typography variant="body2">{personnelB.lastAppointment}</Typography>
                          </Box>
                        )}
                        {personnelB.retirementDate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันเกษียณ</Typography>
                            <Typography variant="body2" color="warning.main">
                              {personnelB.retirementDate}
                            </Typography>
                          </Box>
                        )}
                        {personnelB.trainingLocation && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">สถานที่ฝึกอบรม</Typography>
                            <Typography variant="body2">{personnelB.trainingLocation}</Typography>
                          </Box>
                        )}
                        {personnelB.trainingCourse && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">หลักสูตร (นรต.)</Typography>
                            <Typography variant="body2">{personnelB.trainingCourse}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Box>

            {/* Swap Result Preview */}
            {canSwap && personnelA && personnelB && (
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

        {/* Personnel Detail Modal - Using Reusable Component */}
        <PersonnelDetailModal 
          open={detailDialogOpen}
          onClose={handleCloseDetail}
          personnel={selectedPersonnelDetail}
          loading={false}
          onClearData={() => setSelectedPersonnelDetail(null)}
        />
      </Box>
    </Layout>
  );
}
