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
  IconButton,
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
  Person as PersonIcon,
  Info as InfoIcon,
  ChangeHistory as ThreeWayIcon,
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
  posCodeId?: number;
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

export default function EditThreeWaySwapPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<SwapTransaction | null>(null);
  const [personnelOptions, setPersonnelOptions] = useState<PolicePersonnel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Personnel selections - 3 คน
  const [personnelA, setPersonnelA] = useState<PolicePersonnel | null>(null);
  const [personnelB, setPersonnelB] = useState<PolicePersonnel | null>(null);
  const [personnelC, setPersonnelC] = useState<PolicePersonnel | null>(null);
  
  // Dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPersonnelDetail, setSelectedPersonnelDetail] = useState<PolicePersonnel | null>(null);
  
  // Form data
  const [year, setYear] = useState<number>(new Date().getFullYear() + 543);
  const [swapDate, setSwapDate] = useState<Dayjs | null>(dayjs());
  const [notes, setNotes] = useState('');
  const [groupNumber, setGroupNumber] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');

  useEffect(() => {
    if (params.id) {
      fetchTransaction();
    }
  }, [params.id]);

  useEffect(() => {
    if (transaction) {
      fetchPersonnelOptions();
    }
  }, [transaction]);

  // Update notes and groupName when personnel A, B, or C changes
  useEffect(() => {
    if (personnelA && personnelB && personnelC) {
      const updatedGroupName = `${personnelA.fullName} → ${personnelB.fullName} → ${personnelC.fullName}`;
      const updatedNotes = `การสลับตำแหน่งสามเส้า: ${updatedGroupName}`;
      setGroupName(updatedGroupName);
      setNotes(updatedNotes);
    }
  }, [personnelA, personnelB, personnelC]);

  const fetchTransaction = async () => {
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
      router.push('/police-personnel/three-way-swap');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonnelOptions = async () => {
    try {
      setSearchLoading(true);
      const currentYear = new Date().getFullYear() + 543;
      
      // 1. Fetch swap-list (available personnel)
      const response = await fetch(`/api/swap-list?year=${currentYear}&swapType=three-way`);

      if (!response.ok) {
        throw new Error('Failed to fetch swap list');
      }

      const json = await response.json();
      const list: PolicePersonnel[] = Array.isArray(json?.data) ? json.data : [];
      
      // 2. Get current transaction's personnel IDs (so we can include them in options)
      const currentPersonnelIds = transaction?.swapDetails.map(d => d.personnelId) || [];
      
      // 3. Fetch all swap transactions to get already swapped IDs
      const transactionsResponse = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=three-way`);
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

      // 6. Set current personnel from transaction (must be exactly 3)
      if (transaction && transaction.swapDetails.length >= 3) {
        const detailA = transaction.swapDetails[0];
        const detailB = transaction.swapDetails[1];
        const detailC = transaction.swapDetails[2];

        // Find matching personnel from options or create from detail
        const pA = list.find(p => p.id === detailA.personnelId) || {
          id: detailA.personnelId,
          fullName: detailA.fullName,
          rank: detailA.rank,
          position: detailA.fromPosition,
          positionNumber: detailA.fromPositionNumber,
          unit: detailA.fromUnit,
          nationalId: detailA.nationalId,
          posCodeId: detailA.posCodeId,
        };

        const pB = list.find(p => p.id === detailB.personnelId) || {
          id: detailB.personnelId,
          fullName: detailB.fullName,
          rank: detailB.rank,
          position: detailB.fromPosition,
          positionNumber: detailB.fromPositionNumber,
          unit: detailB.fromUnit,
          nationalId: detailB.nationalId,
          posCodeId: detailB.posCodeId,
        };

        const pC = list.find(p => p.id === detailC.personnelId) || {
          id: detailC.personnelId,
          fullName: detailC.fullName,
          rank: detailC.rank,
          position: detailC.fromPosition,
          positionNumber: detailC.fromPositionNumber,
          unit: detailC.fromUnit,
          nationalId: detailC.nationalId,
          posCodeId: detailC.posCodeId,
        };

        setPersonnelA(pA);
        setPersonnelB(pB);
        setPersonnelC(pC);
      }

    } catch (error) {
      console.error('Error fetching swap list:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleShowDetail = (personnel: PolicePersonnel) => {
    setSelectedPersonnelDetail(personnel);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
  };

  const handleSelectPersonnelA = (newValue: PolicePersonnel | null) => {
    setPersonnelA(newValue);
    // If B or C is selected and same as new A, clear them
    if (personnelB && newValue && personnelB.id === newValue.id) {
      setPersonnelB(null);
    }
    if (personnelC && newValue && personnelC.id === newValue.id) {
      setPersonnelC(null);
    }
  };

  const handleSelectPersonnelB = (newValue: PolicePersonnel | null) => {
    setPersonnelB(newValue);
    // If A or C is selected and same as new B, clear them
    if (personnelA && newValue && personnelA.id === newValue.id) {
      setPersonnelA(null);
    }
    if (personnelC && newValue && personnelC.id === newValue.id) {
      setPersonnelC(null);
    }
  };

  const handleSelectPersonnelC = (newValue: PolicePersonnel | null) => {
    setPersonnelC(newValue);
    // If A or B is selected and same as new C, clear them
    if (personnelA && newValue && personnelA.id === newValue.id) {
      setPersonnelA(null);
    }
    if (personnelB && newValue && personnelB.id === newValue.id) {
      setPersonnelB(null);
    }
  };

  // Filter options - exclude already selected personnel
  const optionsForA = personnelOptions.filter(p => p.rank);

  const optionsForB = personnelOptions.filter(p => 
    p.rank && (!personnelA || p.id !== personnelA.id) && (!personnelC || p.id !== personnelC.id)
  );

  const optionsForC = personnelOptions.filter(p => 
    p.rank && (!personnelA || p.id !== personnelA.id) && (!personnelB || p.id !== personnelB.id)
  );

  const canSwap = personnelA && personnelB && personnelC;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!personnelA || !personnelB || !personnelC) {
      toast.error('กรุณาเลือกบุคลากร 3 คน');
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

    // Check for duplicates
    const ids = [personnelA.id, personnelB.id, personnelC.id];
    if (new Set(ids).size !== 3) {
      toast.error('ไม่สามารถเลือกบุคลากรซ้ำกันได้');
      return;
    }

    try {
      setSaving(true);

      const updatedGroupName = `${personnelA.fullName} → ${personnelB.fullName} → ${personnelC.fullName}`;

      // สร้าง swap details สำหรับ 3 คน (A→B, B→C, C→A)
      const swapDetails = [
        {
          personnelId: personnelA.id,
          nationalId: personnelA.nationalId,
          fullName: personnelA.fullName,
          rank: personnelA.rank,
          fromPosition: personnelA.position,
          fromPositionNumber: personnelA.positionNumber,
          fromUnit: personnelA.unit,
          toPosition: personnelB.position, // A ไปที่ตำแหน่ง B
          toPositionNumber: personnelB.positionNumber,
          toUnit: personnelB.unit,
          posCodeId: personnelA.posCodeId,
        },
        {
          personnelId: personnelB.id,
          nationalId: personnelB.nationalId,
          fullName: personnelB.fullName,
          rank: personnelB.rank,
          fromPosition: personnelB.position,
          fromPositionNumber: personnelB.positionNumber,
          fromUnit: personnelB.unit,
          toPosition: personnelC.position, // B ไปที่ตำแหน่ง C
          toPositionNumber: personnelC.positionNumber,
          toUnit: personnelC.unit,
          posCodeId: personnelB.posCodeId,
        },
        {
          personnelId: personnelC.id,
          nationalId: personnelC.nationalId,
          fullName: personnelC.fullName,
          rank: personnelC.rank,
          fromPosition: personnelC.position,
          fromPositionNumber: personnelC.positionNumber,
          fromUnit: personnelC.unit,
          toPosition: personnelA.position, // C ไปที่ตำแหน่ง A
          toPositionNumber: personnelA.positionNumber,
          toUnit: personnelA.unit,
          posCodeId: personnelC.posCodeId,
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
          swapType: 'three-way',
          groupName: updatedGroupName,
          groupNumber: groupNumber,
          notes: notes || `การสลับตำแหน่งสามเส้า: ${updatedGroupName}`,
          swapDetails,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update swap transaction');
      }

      toast.success('อัพเดทผลการสลับตำแหน่งสามเส้าสำเร็จ');
      router.push('/police-personnel/three-way-swap');
    } catch (error: any) {
      console.error('Error updating swap transaction:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const renderPersonnelCard = (
    personnel: PolicePersonnel | null,
    label: string,
    onSelect: (value: PolicePersonnel | null) => void,
    options: PolicePersonnel[],
    disabled: boolean = false
  ) => (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        bgcolor: personnel ? 'warning.50' : 'grey.50',
        border: 2,
        borderColor: personnel ? 'warning.main' : 'grey.300',
        transition: 'all 0.3s',
      }}
    >
      <Typography variant="h6" fontWeight={600} mb={2} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon />
        {label}
      </Typography>
      
      <Autocomplete
        fullWidth
        size="small"
        options={options}
        value={personnel}
        getOptionLabel={(option) => `${option.rank || ''} ${option.fullName || ''} - ${option.position || ''} (${option.unit || ''})`}
        onChange={(event, newValue) => onSelect(newValue)}
        disabled={disabled}
        loading={searchLoading}
        renderInput={(params) => (
          <TextField 
            {...params} 
            label={`🔍 เลือก${label}`}
            placeholder={disabled ? "เลือกบุคลากรก่อนหน้าก่อน" : "ค้นหา..."}
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
                ตำแหน่ง: {option.position || '-'} | หน่วย: {option.unit || '-'}
              </Typography>
            </Box>
          </li>
        )}
      />

      {personnel && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Divider sx={{ flexGrow: 1 }} />
            <IconButton 
              size="small" 
              color="primary"
              onClick={() => handleShowDetail(personnel)}
              sx={{ ml: 1 }}
              title="ดูข้อมูลเพิ่มเติม"
            >
              <InfoIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {/* Column 1 */}
            <Stack spacing={1.5}>
              {personnel.noId && (
                <Box>
                  <Typography variant="caption" color="text.secondary">ID</Typography>
                  <Typography variant="body2" fontWeight={500}>{personnel.noId}</Typography>
                </Box>
              )}
              {personnel.posCodeMaster && (
                <Box>
                  <Typography variant="caption" color="text.secondary">POSCODE</Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">
                    {personnel.posCodeMaster.id} - {personnel.posCodeMaster.name}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">ชื่อ-สกุล</Typography>
                <Typography variant="body2" fontWeight={600} color="primary.main">
                  {personnel.rank} {personnel.fullName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {personnel.position}
                </Typography>
                {personnel.positionNumber && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    เลขตำแหน่ง: {personnel.positionNumber}
                  </Typography>
                )}
              </Box>
              {personnel.actingAs && (
                <Box>
                  <Typography variant="caption" color="text.secondary">ทำหน้าที่</Typography>
                  <Typography variant="body2" fontWeight={500} color="info.main">
                    {personnel.actingAs}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">หน่วย (ปัจจุบัน)</Typography>
                <Typography variant="body2" fontWeight={600}>{personnel.unit}</Typography>
              </Box>
              {personnel.nationalId && (
                <Box>
                  <Typography variant="caption" color="text.secondary">เลขบัตรประชาชน</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {personnel.nationalId}
                  </Typography>
                </Box>
              )}
              {personnel.birthDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary">วันเกิด</Typography>
                  <Typography variant="body2">{personnel.birthDate}</Typography>
                </Box>
              )}
              {personnel.age && (
                <Box>
                  <Typography variant="caption" color="text.secondary">อายุ</Typography>
                  <Typography variant="body2">{personnel.age} ปี</Typography>
                </Box>
              )}
            </Stack>

            {/* Column 2 */}
            <Stack spacing={1.5}>
              {personnel.education && (
                <Box>
                  <Typography variant="caption" color="text.secondary">วุฒิการศึกษา</Typography>
                  <Typography variant="body2">{personnel.education}</Typography>
                </Box>
              )}
              {personnel.seniority && (
                <Box>
                  <Typography variant="caption" color="text.secondary">อาวุโส</Typography>
                  <Typography variant="body2" fontWeight={500}>{personnel.seniority}</Typography>
                </Box>
              )}
              {personnel.enrollmentDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary">วันบรรจุ</Typography>
                  <Typography variant="body2">{personnel.enrollmentDate}</Typography>
                </Box>
              )}
              {personnel.yearsOfService && (
                <Box>
                  <Typography variant="caption" color="text.secondary">อายุราชการ</Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    {personnel.yearsOfService} ปี
                  </Typography>
                </Box>
              )}
              {personnel.currentRankSince && (
                <Box>
                  <Typography variant="caption" color="text.secondary">ดำรงยศนี้ตั้งแต่</Typography>
                  <Typography variant="body2">{personnel.currentRankSince}</Typography>
                </Box>
              )}
              {personnel.lastAppointment && (
                <Box>
                  <Typography variant="caption" color="text.secondary">แต่งตั้งครั้งล่าสุด</Typography>
                  <Typography variant="body2">{personnel.lastAppointment}</Typography>
                </Box>
              )}
              {personnel.retirementDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary">วันเกษียณ</Typography>
                  <Typography variant="body2" color="warning.main">
                    {personnel.retirementDate}
                  </Typography>
                </Box>
              )}
              {personnel.trainingLocation && (
                <Box>
                  <Typography variant="caption" color="text.secondary">สถานที่ฝึกอบรม</Typography>
                  <Typography variant="body2">{personnel.trainingLocation}</Typography>
                </Box>
              )}
              {personnel.trainingCourse && (
                <Box>
                  <Typography variant="caption" color="text.secondary">หลักสูตร (นรต.)</Typography>
                  <Typography variant="body2">{personnel.trainingCourse}</Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Box>
      )}
    </Paper>
  );

  if (loading) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          {/* Header Skeleton */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width={320} height={40} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={400} height={24} />
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

            <Skeleton variant="rounded" width="100%" height={1} sx={{ my: 3 }} />

            {/* Personnel Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i}>
                  <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} />
                  <Skeleton variant="rounded" width="100%" height={300} />
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
                <ThreeWayIcon color="warning" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  แก้ไขการสลับตำแหน่งสามเส้า
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                แก้ไขข้อมูลการสลับตำแหน่งแบบวงกลม (A→B, B→C, C→A)
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
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {renderPersonnelCard(personnelA, 'บุคลากร A', handleSelectPersonnelA, optionsForA, false)}
              {renderPersonnelCard(personnelB, 'บุคลากร B', handleSelectPersonnelB, optionsForB, false)}
              {renderPersonnelCard(personnelC, 'บุคลากร C', handleSelectPersonnelC, optionsForC, false)}
            </Box>

            {/* Swap Result Preview */}
            {canSwap && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  📝 ชื่อกลุ่ม: {personnelA.fullName} → {personnelB.fullName} → {personnelC.fullName}
                </Typography>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  ✅ ผลการสลับตำแหน่งสามเส้า (แต่ละคนห้ามอยู่ตำแหน่งเดิม):
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    • <strong>{personnelA.fullName}</strong> จาก <strong>{personnelA.position}</strong> → ไป <strong style={{ color: 'darkorange' }}>{personnelB.position}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • <strong>{personnelB.fullName}</strong> จาก <strong>{personnelB.position}</strong> → ไป <strong style={{ color: 'darkorange' }}>{personnelC.position}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • <strong>{personnelC.fullName}</strong> จาก <strong>{personnelC.position}</strong> → ไป <strong style={{ color: 'darkorange' }}>{personnelA.position}</strong>
                  </Typography>
                </Box>
              </Alert>
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
                size="small"
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
                color="warning"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving || !canSwap}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
            </Box>
          </Paper>
        </form>

        {/* Personnel Detail Modal */}
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
