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
  IconButton,
  Chip,
  Divider,
  Stack,
  Skeleton,
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
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter, useParams } from 'next/navigation';
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

interface SwapDetail {
  id?: string;
  personnelId: string;
  nationalId?: string;
  fullName: string;
  rank?: string;
  fromPosition?: string;
  fromPositionNumber?: string;
  fromUnit?: string;
  toPosition?: string;
  toPositionNumber?: string;
  toUnit?: string;
  notes?: string;
}

interface SwapTransaction {
  id: string;
  year: number;
  swapDate: string;
  swapType: string;
  groupName?: string;
  groupNumber?: string;
  status: string;
  notes?: string;
  swapDetails: SwapDetail[];
  createdAt: string;
}

export default function EditSwapTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<SwapTransaction | null>(null);
  const [personnelOptions, setPersonnelOptions] = useState<PolicePersonnel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
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
  const [groupName, setGroupName] = useState<string>('');

  // Update notes when personnel A or B changes
  useEffect(() => {
    if (personnelA && personnelB) {
      const updatedNotes = `การสลับตำแหน่ง: ${personnelA.fullName} ⟷ ${personnelB.fullName}`;
      setNotes(updatedNotes);
    }
  }, [personnelA, personnelB]);

  const fetchTransaction = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/swap-transactions/${params.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }

      const result = await response.json();
      const data = result.data;
      
      setTransaction(data);
      setYear(data.year);
      setSwapDate(dayjs(data.swapDate));
      setNotes(data.notes || '');
      setGroupNumber(data.groupNumber || '');
      setGroupName(data.groupName || '');

    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      router.push('/police-personnel/swap-list');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]); // Removed toast from dependencies

  const fetchPersonnelOptions = useCallback(async () => {
    try {
      setSearchLoading(true);
      const currentYear = new Date().getFullYear() + 543;
      
      // 1. Fetch swap-list (available personnel)
      const response = await fetch(`/api/swap-list?year=${currentYear}`);

      if (!response.ok) {
        throw new Error('Failed to fetch swap list');
      }

      const json = await response.json();
      const list: PolicePersonnel[] = Array.isArray(json?.data) ? json.data : [];
      
      // 2. Get current transaction's personnel IDs (so we can include them in options)
      const currentPersonnelIds = transaction?.swapDetails.map(d => d.personnelId) || [];
      
      // 3. Fetch all swap transactions to get already swapped IDs
      const transactionsResponse = await fetch(`/api/swap-transactions?year=${currentYear}`);
      const transactionsResult = await transactionsResponse.json();
      const transactions = transactionsResult.data || [];
      
      // 4. Build a Set of personnel IDs who have already been swapped (excluding current transaction)
      const swappedIds = new Set<string>();
      transactions.forEach((t: any) => {
        // Skip current transaction being edited
        if (t.id !== params.id) {
          if (Array.isArray(t.swapDetails)) {
            t.swapDetails.forEach((detail: any) => {
              if (detail.personnelId) {
                swappedIds.add(detail.personnelId);
              }
            });
          }
        }
      });

      // 5. Filter personnel: must have rank AND not already swapped (except current transaction personnel)
      setPersonnelOptions(
        list.filter((p: PolicePersonnel) => 
          !!p.rank && !swappedIds.has(p.id)
        )
      );

      // 6. Set current personnel from transaction
      if (transaction && transaction.swapDetails.length >= 2) {
        const detailA = transaction.swapDetails[0];
        const detailB = transaction.swapDetails[1];

        // Find matching personnel from options or create from detail
        const pA = list.find(p => p.id === detailA.personnelId) || {
          id: detailA.personnelId,
          fullName: detailA.fullName,
          rank: detailA.rank,
          position: detailA.fromPosition,
          positionNumber: detailA.fromPositionNumber,
          unit: detailA.fromUnit,
          nationalId: detailA.nationalId,
        };

        const pB = list.find(p => p.id === detailB.personnelId) || {
          id: detailB.personnelId,
          fullName: detailB.fullName,
          rank: detailB.rank,
          position: detailB.fromPosition,
          positionNumber: detailB.fromPositionNumber,
          unit: detailB.fromUnit,
          nationalId: detailB.nationalId,
        };

        setPersonnelA(pA);
        setPersonnelB(pB);
      }

    } catch (error) {
      console.error('Error fetching swap list:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [transaction, params.id]);

  useEffect(() => {
    if (params.id) {
      fetchTransaction();
    }
  }, [params.id, fetchTransaction]);

  useEffect(() => {
    if (transaction) {
      fetchPersonnelOptions();
    }
  }, [transaction, fetchPersonnelOptions]);

  const handleShowDetail = useCallback((personnel: PolicePersonnel) => {
    setSelectedPersonnelDetail(personnel);
    setDetailDialogOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
  }, []);

  const handleSelectPersonnelA = useCallback((newValue: PolicePersonnel | null) => {
    setPersonnelA(newValue);
    // If B is selected and same as new A, clear B
    setPersonnelB(prev => {
      if (prev && newValue && prev.id === newValue.id) {
        return null;
      }
      return prev;
    });
  }, []);

  const handleSelectPersonnelB = useCallback((newValue: PolicePersonnel | null) => {
    setPersonnelB(newValue);
  }, []);

  // Memoized filter options for B - exclude A and ensure has rank
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

    if (personnelA.id === personnelB.id) {
      toast.error('ไม่สามารถสลับกับบุคลากรคนเดียวกันได้');
      return;
    }

    try {
      setSaving(true);

      const updatedGroupName = `${personnelA.fullName} ⟷ ${personnelB.fullName}`;

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
          toPosition: personnelB.position,
          toPositionNumber: personnelB.positionNumber,
          toUnit: personnelB.unit,
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
          toPosition: personnelA.position,
          toPositionNumber: personnelA.positionNumber,
          toUnit: personnelA.unit,
        },
      ];

      const response = await fetch(`/api/swap-transactions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          swapDate: swapDate ? swapDate.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
          swapType: 'two-way',
          groupName: updatedGroupName,
          groupNumber: groupNumber,
          notes: notes || `การสลับตำแหน่ง: ${updatedGroupName}`,
          swapDetails,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update swap transaction');
      }

      toast.success('อัพเดทผลการสลับตำแหน่งสำเร็จ');
      router.push('/police-personnel/swap-list');
    } catch (error: any) {
      console.error('Error updating swap transaction:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          {/* Header Skeleton */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width={280} height={40} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={360} height={24} />
              </Box>
              <Skeleton variant="rounded" width={120} height={40} />
            </Box>
          </Paper>

          {/* Form Skeleton */}
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width={200} height={32} sx={{ mb: 3 }} />
            
            {/* Row 1 */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Skeleton variant="rounded" width="33%" height={56} />
              <Skeleton variant="rounded" width="33%" height={56} />
              <Skeleton variant="rounded" width="33%" height={56} />
            </Box>

            {/* Row 2 */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Skeleton variant="rounded" width="50%" height={56} />
              <Skeleton variant="rounded" width="50%" height={56} />
            </Box>

            <Skeleton variant="rounded" width="100%" height={1} sx={{ my: 3 }} />

            {/* Personnel Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 3 }}>
              {[1, 2].map((i) => (
                <Box key={i}>
                  <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} />
                  <Skeleton variant="rounded" width="100%" height={240} />
                </Box>
              ))}
            </Box>

            {/* Notes */}
            <Skeleton variant="text" width={120} height={28} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" width="100%" height={120} sx={{ mb: 3 }} />

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Skeleton variant="rounded" width={100} height={40} />
              <Skeleton variant="rounded" width={140} height={40} />
            </Box>
          </Paper>
        </Box>
      </Layout>
    );
  }

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
                  แก้ไขผลการสลับตำแหน่ง
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                แก้ไขข้อมูลการสลับตำแหน่งระหว่างบุคลากร 2 คน
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

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              <TextField
                label="เลขกลุ่ม"
                value={groupNumber}
                disabled
                size="small"
              />
              <TextField
                label="ประจำปี *"
                type="number"
                value={year || ''}
                onChange={(e) => setYear(parseInt(e.target.value) || 0)}
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
                  options={personnelOptions}
                  getOptionLabel={(option) =>
                    `${option.rank || ''} ${option.fullName || '-'}`
                  }
                  value={personnelA}
                  onChange={(event, newValue) => handleSelectPersonnelA(newValue)}
                  loading={searchLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="เลือกบุคลากร A *"
                      placeholder="พิมพ์ชื่อหรือเลขที่"
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
                          {option.posCodeMaster && `POSCODE: ${option.posCodeMaster.id} | `}
                          เลขตำแหน่ง: {option.positionNumber || '-'} | ตำแหน่ง: {option.position || '-'} | หน่วย: {option.unit || '-'}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  noOptionsText="ไม่พบข้อมูล"
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

              {/* Swap Icon */}
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
                  options={optionsForB}
                  getOptionLabel={(option) =>
                    `${option.rank || ''} ${option.fullName || '-'}`
                  }
                  value={personnelB}
                  onChange={(event, newValue) => handleSelectPersonnelB(newValue)}
                  disabled={false}
                  loading={searchLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="เลือกบุคลากร B *"
                      placeholder="พิมพ์ชื่อหรือเลขที่"
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
                          {option.posCodeMaster && `POSCODE: ${option.posCodeMaster.id} | `}
                          เลขที่: {option.noId || '-'} | ตำแหน่ง: {option.position || '-'} | หน่วย: {option.unit || '-'}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  noOptionsText={!personnelA ? "กรุณาเลือกบุคลากร A ก่อน" : "ไม่พบข้อมูล"}
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
            {canSwap && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }}>
                  <Chip label="ผลการสลับ" color="primary" />
                </Divider>
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>{personnelA?.fullName}</strong> จาก <strong>{personnelA?.position}</strong> → 
                    ไปที่ <strong>{personnelB?.position}</strong>
                  </Typography>
                  <Typography variant="body2">
                    <strong>{personnelB?.fullName}</strong> จาก <strong>{personnelB?.position}</strong> → 
                    ไปที่ <strong>{personnelA?.position}</strong>
                  </Typography>
                </Alert>
              </Box>
            )}

            {/* Notes */}
            <Box sx={{ mt: 3 }}>
              <TextField
                label="หมายเหตุ"
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                fullWidth
              />
            </Box>

            {/* Submit Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => router.back()}
                disabled={saving}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving || !canSwap}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
            </Box>
          </Paper>
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
