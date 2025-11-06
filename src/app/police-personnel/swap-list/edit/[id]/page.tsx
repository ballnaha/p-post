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
  Stack,
  Divider,
  IconButton,
  Skeleton,
  useMediaQuery,
  useTheme,
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
  Search as SearchIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import PersonnelDrawer from '../../add/components/PersonnelDrawer';

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
  seniority?: string;
  posCodeId?: number;
  posCodeMaster?: {
    id: number;
    name: string;
  };
  // ข้อมูลส่วนตัว
  birthDate?: string;
  age?: string;
  education?: string;
  // ข้อมูลการแต่งตั้ง
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  // ข้อมูลการฝึกอบรม
  trainingLocation?: string;
  trainingCourse?: string;
  // ตำแหน่ง
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<SwapTransaction | null>(null);
  
  // Personnel selections
  const [personnelA, setPersonnelA] = useState<PolicePersonnel | null>(null);
  const [personnelB, setPersonnelB] = useState<PolicePersonnel | null>(null);
  
  // Dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPersonnelDetail, setSelectedPersonnelDetail] = useState<PolicePersonnel | null>(null);
  
  // Drawer state
  const [drawerAOpen, setDrawerAOpen] = useState(false);
  const [drawerBOpen, setDrawerBOpen] = useState(false);
  
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

  // Load transaction and set personnel from transaction data
  useEffect(() => {
    const loadTransaction = async () => {
      if (!params.id) return;
      
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

        // Set personnel from transaction details - ใช้ข้อมูลจาก swap_transaction_detail โดยตรง
        if (data.swapDetails && data.swapDetails.length >= 2) {
          const detailA = data.swapDetails[0];
          const detailB = data.swapDetails[1];

          // ใช้ข้อมูลจาก swap_transaction_detail ที่มีข้อมูลครบถ้วนแล้ว
          const pA: PolicePersonnel = {
            id: detailA.personnelId || '',
            fullName: detailA.fullName,
            rank: detailA.rank,
            seniority: detailA.seniority,
            position: detailA.fromPosition,
            positionNumber: detailA.fromPositionNumber,
            unit: detailA.fromUnit,
            nationalId: detailA.nationalId,
            posCodeId: detailA.posCodeId,
            posCodeMaster: detailA.posCodeMaster,
            // ข้อมูลส่วนตัว
            birthDate: detailA.birthDate,
            age: detailA.age,
            education: detailA.education,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: detailA.lastAppointment,
            currentRankSince: detailA.currentRankSince,
            enrollmentDate: detailA.enrollmentDate,
            retirementDate: detailA.retirementDate,
            yearsOfService: detailA.yearsOfService,
            // ข้อมูลการฝึกอบรม
            trainingLocation: detailA.trainingLocation,
            trainingCourse: detailA.trainingCourse,
          };

          const pB: PolicePersonnel = {
            id: detailB.personnelId || '',
            fullName: detailB.fullName,
            rank: detailB.rank,
            seniority: detailB.seniority,
            position: detailB.fromPosition,
            positionNumber: detailB.fromPositionNumber,
            unit: detailB.fromUnit,
            nationalId: detailB.nationalId,
            posCodeId: detailB.posCodeId,
            posCodeMaster: detailB.posCodeMaster,
            // ข้อมูลส่วนตัว
            birthDate: detailB.birthDate,
            age: detailB.age,
            education: detailB.education,
            // ข้อมูลการแต่งตั้ง
            lastAppointment: detailB.lastAppointment,
            currentRankSince: detailB.currentRankSince,
            enrollmentDate: detailB.enrollmentDate,
            retirementDate: detailB.retirementDate,
            yearsOfService: detailB.yearsOfService,
            // ข้อมูลการฝึกอบรม
            trainingLocation: detailB.trainingLocation,
            trainingCourse: detailB.trainingCourse,
          };

          setPersonnelA(pA);
          setPersonnelB(pB);
        }

      } catch (error) {
        console.error('Error fetching transaction:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        router.push('/police-personnel/swap-list');
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [params.id, router]);

  const handleShowDetail = useCallback(async (personnel: PolicePersonnel) => {
    try {
      setDetailDialogOpen(true);
      // ใช้ข้อมูลจาก personnel ที่มีอยู่แล้วครบถ้วน (จาก swap_transaction_detail)
      setSelectedPersonnelDetail(personnel);
    } catch (error: any) {
      console.error('Error showing personnel details:', error);
      toast.error('เกิดข้อผิดพลาดในการแสดงข้อมูลบุคลากร');
    }
  }, [toast]);

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
  }, []);

  const handleSelectPersonnelA = useCallback((newValue: PolicePersonnel) => {
    setPersonnelA(newValue);
    setDrawerAOpen(false);
    // If B is selected and same as new A, clear B
    setPersonnelB(prev => {
      if (prev && newValue && prev.id === newValue.id) {
        return null;
      }
      return prev;
    });
  }, []);

  const handleSelectPersonnelB = useCallback((newValue: PolicePersonnel) => {
    setPersonnelB(newValue);
    setDrawerBOpen(false);
  }, []);

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
          seniority: personnelA.seniority,
          posCodeId: personnelA.posCodeId,
          // ข้อมูลส่วนตัว
          birthDate: personnelA.birthDate,
          age: personnelA.age,
          education: personnelA.education,
          // ข้อมูลการแต่งตั้ง
          lastAppointment: personnelA.lastAppointment,
          currentRankSince: personnelA.currentRankSince,
          enrollmentDate: personnelA.enrollmentDate,
          retirementDate: personnelA.retirementDate,
          yearsOfService: personnelA.yearsOfService,
          // ข้อมูลการฝึกอบรม
          trainingLocation: personnelA.trainingLocation,
          trainingCourse: personnelA.trainingCourse,
          // ตำแหน่ง
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
          seniority: personnelB.seniority,
          posCodeId: personnelB.posCodeId,
          // ข้อมูลส่วนตัว
          birthDate: personnelB.birthDate,
          age: personnelB.age,
          education: personnelB.education,
          // ข้อมูลการแต่งตั้ง
          lastAppointment: personnelB.lastAppointment,
          currentRankSince: personnelB.currentRankSince,
          enrollmentDate: personnelB.enrollmentDate,
          retirementDate: personnelB.retirementDate,
          yearsOfService: personnelB.yearsOfService,
          // ข้อมูลการฝึกอบรม
          trainingLocation: personnelB.trainingLocation,
          trainingCourse: personnelB.trainingCourse,
          // ตำแหน่ง
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
                <Typography variant="h6" fontWeight={600} mb={1} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  บุคลากร A
                </Typography>
                {personnelA && (
                  <Typography variant="body1" fontWeight={600} color="success.main" sx={{ mb: 2 }}>
                    {personnelA.rank} {personnelA.fullName}
                  </Typography>
                )}
                
                {!personnelA ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<SearchIcon />}
                    onClick={() => setDrawerAOpen(true)}
                    sx={{ 
                      py: 1.5,
                      borderStyle: 'dashed',
                      borderWidth: 2,
                    }}
                  >
                    เลือกบุคลากร A
                  </Button>
                ) : (
                  <Box>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<SearchIcon />}
                      onClick={() => setDrawerAOpen(true)}
                      sx={{ mb: 1 }}
                    >
                      เปลี่ยนบุคลากร A
                    </Button>
                  </Box>
                )}

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
                            <Typography variant="body2">{personnelA.age}</Typography>
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
                              {personnelA.yearsOfService}
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
                  opacity: !personnelA ? 0.6 : 1,
                }}
              >
                <Typography variant="h6" fontWeight={600} mb={1} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon />
                  บุคลากร B
                </Typography>
                {personnelB && (
                  <Typography variant="body1" fontWeight={600} color="success.main" sx={{ mb: 2 }}>
                    {personnelB.rank} {personnelB.fullName}
                  </Typography>
                )}
                
                {!personnelB ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<SearchIcon />}
                    onClick={() => setDrawerBOpen(true)}
                    disabled={!personnelA}
                    sx={{ 
                      py: 1.5,
                      borderStyle: 'dashed',
                      borderWidth: 2,
                    }}
                  >
                    {personnelA ? 'เลือกบุคลากร B' : 'เลือก A ก่อน'}
                  </Button>
                ) : (
                  <Box>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<SearchIcon />}
                      onClick={() => setDrawerBOpen(true)}
                      sx={{ mb: 1 }}
                    >
                      เปลี่ยนบุคลากร B
                    </Button>
                  </Box>
                )}

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
                            <Typography variant="body2">{personnelB.age}</Typography>
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
                              {personnelB.yearsOfService}
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
          <Box sx={{ pb: 12 }}> {/* Add bottom padding to prevent sticky footer overlap */}
            <Paper sx={{ p: 3 }}>
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
          </Box>

          {/* Actions - Sticky Footer */}
          <Paper 
            sx={{ 
              p: { xs: 1.5, sm: 2.5 }, 
              position: 'sticky', 
              bottom: 0, 
              zIndex: 10,
              display: 'flex', 
              gap: { xs: 1, sm: 2 },
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ mb: { xs: 1, sm: 0 } }}>
              {personnelA && personnelB ? (
                <>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                    {canSwap ? '✓ พร้อมบันทึก' : '⚠ ยังไม่สมบูรณ์'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    สลับตำแหน่ง: {personnelA.fullName} ↔ {personnelB.fullName}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                  {personnelA ? 'เลือกบุคลากร B เพื่อทำการสลับตำแหน่ง' : 'เลือกบุคลากร A เพื่อเริ่มต้น'}
                </Typography>
              )}
            </Box>
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 1, sm: 2 },
              flexDirection: { xs: 'column-reverse', sm: 'row' },
              width: { xs: '100%', sm: 'auto' }
            }}>
              <Button
                variant="outlined"
                onClick={() => router.back()}
                disabled={saving}
                fullWidth={isMobile}
                sx={{ 
                  minHeight: { xs: '44px', sm: 'auto' },
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size={isMobile ? 'medium' : 'large'}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={saving || !canSwap}
                fullWidth={isMobile}
                sx={{ 
                  minHeight: { xs: '48px', sm: 'auto' },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 600
                }}
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
          loading={!selectedPersonnelDetail && detailDialogOpen}
          onClearData={() => setSelectedPersonnelDetail(null)}
        />

        {/* Personnel Drawer for A */}
        <PersonnelDrawer
          open={drawerAOpen}
          onClose={() => setDrawerAOpen(false)}
          onSelect={(personnel) => handleSelectPersonnelA(personnel as any)}
          title="เลือกบุคลากร A"
          excludePersonnelId={personnelB?.id ? [personnelB.id] : undefined}
          excludeTransactionId={params.id as string}
        />

        {/* Personnel Drawer for B - กรองตามหน่วยและ posCode เดียวกับ A */}
        <PersonnelDrawer
          key={`drawer-b-${personnelA?.id || 'none'}`}
          open={drawerBOpen}
          onClose={() => setDrawerBOpen(false)}
          onSelect={(personnel) => handleSelectPersonnelB(personnel as any)}
          title="เลือกบุคลากร B"
          excludePersonnelId={[personnelA?.id, personnelB?.id].filter((id): id is string => !!id)}
          initialFilterUnit={personnelA?.unit}
          initialFilterPosCode={personnelA?.posCodeId}
          excludeTransactionId={params.id as string}
        />
      </Box>
    </Layout>
  );
}
