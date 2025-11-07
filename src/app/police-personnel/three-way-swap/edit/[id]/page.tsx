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
  IconButton,
  Divider,
  Stack,
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
  Person as PersonIcon,
  Info as InfoIcon,
  ChangeHistory as ThreeWayIcon,
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
  // Support fields
  supporterName?: string;
  supportReason?: string;
  // Notes
  notes?: string;
}

interface SwapDetail {
  id?: string;
  personnelId: string;
  noId?: number;
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
  fromActingAs?: string;
  toPosition?: string;
  toPositionNumber?: string;
  toUnit?: string;
  toActingAs?: string;
  notes?: string;
  // Support fields - ใช้ชื่อตาม API (supportName, supportReason)  
  supportName?: string;
  supportReason?: string;
  // Support fields - ใช้ตาม frontend convention (supporterName)
  supporterName?: string;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<SwapTransaction | null>(null);
  
  // Personnel selections - 3 คน
  const [personnelA, setPersonnelA] = useState<PolicePersonnel | null>(null);
  const [personnelB, setPersonnelB] = useState<PolicePersonnel | null>(null);
  const [personnelC, setPersonnelC] = useState<PolicePersonnel | null>(null);
  
  // Dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPersonnelDetail, setSelectedPersonnelDetail] = useState<PolicePersonnel | null>(null);
  
  // Drawer state
  const [drawerAOpen, setDrawerAOpen] = useState(false);
  const [drawerBOpen, setDrawerBOpen] = useState(false);
  const [drawerCOpen, setDrawerCOpen] = useState(false);
  
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
      
      // Debug: ดูข้อมูลที่ API ส่งมา
      console.log('API Response:', data);
      console.log('SwapDetails:', data.swapDetails);
      
      setTransaction(data);
      setYear(data.year);
      setSwapDate(dayjs(data.swapDate));
      setNotes(data.notes || '');
      setGroupNumber(data.groupNumber || '');
      setGroupName(data.groupName || '');

      // Set personnel from transaction details - ใช้ข้อมูลจาก swap_transaction_detail โดยตรง
      if (data.swapDetails && data.swapDetails.length >= 3) {
        // เรียงตาม sequence เพื่อให้แน่ใจว่า A (sequence 1), B (sequence 2), และ C (sequence 3) ถูกต้อง
        const sortedDetails = [...data.swapDetails].sort((a, b) => a.sequence - b.sequence);
        const detailA = sortedDetails[0];
        const detailB = sortedDetails[1];
        const detailC = sortedDetails[2];

        // ใช้ข้อมูลจาก swap_transaction_detail ที่มีข้อมูลครบถ้วนแล้ว
        const pA: PolicePersonnel = {
          id: detailA.personnelId || '',
          noId: detailA.noId,
          fullName: detailA.fullName,
          rank: detailA.rank,
          seniority: detailA.seniority,
          position: detailA.fromPosition,
          positionNumber: detailA.fromPositionNumber,
          unit: detailA.fromUnit,
          nationalId: detailA.nationalId,
          posCodeId: detailA.posCodeId,
          posCodeMaster: detailA.posCodeMaster,
          actingAs: detailA.fromActingAs,
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
          // Support fields - map จาก API field names
          supporterName: detailA.supportName,
          supportReason: detailA.supportReason,
        };

        const pB: PolicePersonnel = {
          id: detailB.personnelId || '',
          noId: detailB.noId,
          fullName: detailB.fullName,
          rank: detailB.rank,
          seniority: detailB.seniority,
          position: detailB.fromPosition,
          positionNumber: detailB.fromPositionNumber,
          unit: detailB.fromUnit,
          nationalId: detailB.nationalId,
          posCodeId: detailB.posCodeId,
          posCodeMaster: detailB.posCodeMaster,
          actingAs: detailB.fromActingAs,
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
          // Support fields - map จาก API field names
          supporterName: detailB.supportName,
          supportReason: detailB.supportReason,
        };

        const pC: PolicePersonnel = {
          id: detailC.personnelId || '',
          noId: detailC.noId,
          fullName: detailC.fullName,
          rank: detailC.rank,
          seniority: detailC.seniority,
          position: detailC.fromPosition,
          positionNumber: detailC.fromPositionNumber,
          unit: detailC.fromUnit,
          nationalId: detailC.nationalId,
          posCodeId: detailC.posCodeId,
          posCodeMaster: detailC.posCodeMaster,
          actingAs: detailC.fromActingAs,
          // ข้อมูลส่วนตัว
          birthDate: detailC.birthDate,
          age: detailC.age,
          education: detailC.education,
          // ข้อมูลการแต่งตั้ง
          lastAppointment: detailC.lastAppointment,
          currentRankSince: detailC.currentRankSince,
          enrollmentDate: detailC.enrollmentDate,
          retirementDate: detailC.retirementDate,
          yearsOfService: detailC.yearsOfService,
          // ข้อมูลการฝึกอบรม
          trainingLocation: detailC.trainingLocation,
          trainingCourse: detailC.trainingCourse,
          // Support fields - map จาก API field names
          supporterName: detailC.supportName,
          supportReason: detailC.supportReason,
        };

        setPersonnelA(pA);
        setPersonnelB(pB);
        setPersonnelC(pC);
      }

    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      router.push('/police-personnel/three-way-swap');
    } finally {
      setLoading(false);
    }
  };

  // Optimized: Memoized handlers with useCallback
  const handleShowDetail = useCallback((personnel: PolicePersonnel) => {
    setSelectedPersonnelDetail(personnel);
    setDetailDialogOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailDialogOpen(false);
  }, []);

  const handleSelectPersonnelA = useCallback((newValue: PolicePersonnel | null) => {
    setPersonnelA(newValue);
    setDrawerAOpen(false); // ปิด drawer หลังเลือกเสร็จ
    // If B or C is selected and same as new A, clear them
    setPersonnelB(prev => (prev && newValue && prev.id === newValue.id) ? null : prev);
    setPersonnelC(prev => (prev && newValue && prev.id === newValue.id) ? null : prev);
  }, []);

  const handleSelectPersonnelB = useCallback((newValue: PolicePersonnel | null) => {
    setPersonnelB(newValue);
    setDrawerBOpen(false); // ปิด drawer หลังเลือกเสร็จ
    // If A or C is selected and same as new B, clear them
    setPersonnelA(prev => (prev && newValue && prev.id === newValue.id) ? null : prev);
    setPersonnelC(prev => (prev && newValue && prev.id === newValue.id) ? null : prev);
  }, []);

  const handleSelectPersonnelC = useCallback((newValue: PolicePersonnel | null) => {
    setPersonnelC(newValue);
    setDrawerCOpen(false); // ปิด drawer หลังเลือกเสร็จ
    // If A or B is selected and same as new C, clear them
    setPersonnelA(prev => (prev && newValue && prev.id === newValue.id) ? null : prev);
    setPersonnelB(prev => (prev && newValue && prev.id === newValue.id) ? null : prev);
  }, []);

  const canSwap = useMemo(() => 
    Boolean(personnelA && personnelB && personnelC), 
    [personnelA, personnelB, personnelC]
  );

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
          sequence: 1,
          personnelId: personnelA.id,
          noId: personnelA.noId,
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
          fromActingAs: personnelA.actingAs,
          toPosition: personnelB.position, // A ไปที่ตำแหน่ง B
          toPositionNumber: personnelB.positionNumber,
          toUnit: personnelB.unit,
          toActingAs: personnelB.actingAs,
          // Support fields
          supportName: personnelA.supporterName,
          supportReason: personnelA.supportReason,
          // Notes
          notes: personnelA.notes,
        },
        {
          sequence: 2,
          personnelId: personnelB.id,
          noId: personnelB.noId,
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
          fromActingAs: personnelB.actingAs,
          toPosition: personnelC.position, // B ไปที่ตำแหน่ง C
          toPositionNumber: personnelC.positionNumber,
          toUnit: personnelC.unit,
          toActingAs: personnelC.actingAs,
          // Support fields
          supportName: personnelB.supporterName,
          supportReason: personnelB.supportReason,
          // Notes
          notes: personnelB.notes,
        },
        {
          sequence: 3,
          personnelId: personnelC.id,
          noId: personnelC.noId,
          nationalId: personnelC.nationalId,
          fullName: personnelC.fullName,
          rank: personnelC.rank,
          seniority: personnelC.seniority,
          posCodeId: personnelC.posCodeId,
          // ข้อมูลส่วนตัว
          birthDate: personnelC.birthDate,
          age: personnelC.age,
          education: personnelC.education,
          // ข้อมูลการแต่งตั้ง
          lastAppointment: personnelC.lastAppointment,
          currentRankSince: personnelC.currentRankSince,
          enrollmentDate: personnelC.enrollmentDate,
          retirementDate: personnelC.retirementDate,
          yearsOfService: personnelC.yearsOfService,
          // ข้อมูลการฝึกอบรม
          trainingLocation: personnelC.trainingLocation,
          trainingCourse: personnelC.trainingCourse,
          // ตำแหน่ง
          fromPosition: personnelC.position,
          fromPositionNumber: personnelC.positionNumber,
          fromUnit: personnelC.unit,
          fromActingAs: personnelC.actingAs,
          toPosition: personnelA.position, // C ไปที่ตำแหน่ง A
          toPositionNumber: personnelA.positionNumber,
          toUnit: personnelA.unit,
          toActingAs: personnelA.actingAs,
          // Support fields
          supportName: personnelC.supporterName,
          supportReason: personnelC.supportReason,
          // Notes
          notes: personnelC.notes,
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
    onOpenDrawer: () => void,
    disabled: boolean = false
  ) => (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        bgcolor: personnel ? 'success.50' : 'grey.50',
        border: 2,
        borderColor: personnel ? 'success.main' : 'grey.300',
        transition: 'all 0.3s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Typography variant="h6" fontWeight={600} mb={1} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon />
        {label}
      </Typography>
      {personnel && (
        <Typography variant="body1" fontWeight={600} color="success.main" sx={{ mb: 2 }}>
          {personnel.rank} {personnel.fullName}
        </Typography>
      )}
      
      {!personnel ? (
        <Button
          fullWidth
          variant="outlined"
          size="large"
          startIcon={<SearchIcon />}
          onClick={onOpenDrawer}
          disabled={disabled}
          sx={{ 
            py: 1.5,
            borderStyle: 'dashed',
            borderWidth: 2,
          }}
        >
          {disabled ? 'เลือกบุคลากร A ก่อน' : `เลือก${label}`}
        </Button>
      ) : (
        <Box>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<SearchIcon />}
            onClick={onOpenDrawer}
            disabled={disabled}
            sx={{ mb: 1 }}
          >
            เปลี่ยน{label}
          </Button>
        </Box>
      )}

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
              {personnel.supporterName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">ผู้สนับสนุน</Typography>
                  <Typography variant="body2" fontWeight={500} color="success.main">
                    {personnel.supporterName}
                  </Typography>
                </Box>
              )}
              {personnel.supportReason && (
                <Box>
                  <Typography variant="caption" color="text.secondary">เหตุผล</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                    {personnel.supportReason}
                  </Typography>
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
        <Box>
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
            {/* Alert แจ้งเตือนให้เลือก A ก่อน */}
            {!personnelA && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight={600}>
                  📌 กรุณาเลือกบุคลากร A ก่อน จากนั้นระบบจะกรองเฉพาะบุคลากรที่อยู่ในหน่วยและตำแหน่งเดียวกันสำหรับ B และ C
                </Typography>
              </Alert>
            )}
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {renderPersonnelCard(personnelA, 'บุคลากร A', () => setDrawerAOpen(true), false)}
              {renderPersonnelCard(personnelB, 'บุคลากร B', () => setDrawerBOpen(true), !personnelA)}
              {renderPersonnelCard(personnelC, 'บุคลากร C', () => setDrawerCOpen(true), !personnelA)}
            </Box>

            {/* Swap Result Preview */}
            {canSwap && personnelA && personnelB && personnelC && (
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
          </Paper>

          <Box sx={{ pb: 12 }}> {/* Add bottom padding to prevent sticky footer overlap */}
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
              {personnelA && personnelB && personnelC ? (
                <>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                    {canSwap ? '✓ พร้อมบันทึก' : '⚠ ยังไม่สมบูรณ์'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    สลับสามเส้า: {personnelA.fullName} → {personnelB.fullName} → {personnelC.fullName}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                  {!personnelA ? 'เลือกบุคลากร A เพื่อเริ่มต้น' : !personnelB ? 'เลือกบุคลากร B' : 'เลือกบุคลากร C'}
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
                color="warning"
                size={isMobile ? 'medium' : 'large'}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
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

        {/* Personnel Detail Modal */}
        <PersonnelDetailModal 
          open={detailDialogOpen}
          onClose={handleCloseDetail}
          personnel={selectedPersonnelDetail}
          loading={false}
          onClearData={() => setSelectedPersonnelDetail(null)}
        />

        {/* Personnel Drawer for A */}
        <PersonnelDrawer
          open={drawerAOpen}
          onClose={() => setDrawerAOpen(false)}
          onSelect={(personnel) => handleSelectPersonnelA(personnel as any)}
          title="เลือกบุคลากร A"
          excludePersonnelId={[personnelB?.id, personnelC?.id].filter((id): id is string => !!id)}
          excludeTransactionId={params.id as string}
        />

        {/* Personnel Drawer for B - กรองตามหน่วยและ posCode เดียวกับ A */}
        <PersonnelDrawer
          key={`drawer-b-${personnelA?.id || 'none'}`}
          open={drawerBOpen}
          onClose={() => setDrawerBOpen(false)}
          onSelect={(personnel) => handleSelectPersonnelB(personnel as any)}
          title="เลือกบุคลากร B (หน่วยและตำแหน่งเดียวกับ A)"
          excludePersonnelId={[personnelA?.id, personnelB?.id, personnelC?.id].filter((id): id is string => !!id)}
          initialFilterUnit={personnelA?.unit}
          initialFilterPosCode={personnelA?.posCodeId}
          excludeTransactionId={params.id as string}
        />

        {/* Personnel Drawer for C - กรองตามหน่วยและ posCode เดียวกับ A */}
        <PersonnelDrawer
          key={`drawer-c-${personnelA?.id || 'none'}`}
          open={drawerCOpen}
          onClose={() => setDrawerCOpen(false)}
          onSelect={(personnel) => handleSelectPersonnelC(personnel as any)}
          title="เลือกบุคลากร C (หน่วยและตำแหน่งเดียวกับ A)"
          excludePersonnelId={[personnelA?.id, personnelB?.id, personnelC?.id].filter((id): id is string => !!id)}
          initialFilterUnit={personnelA?.unit}
          initialFilterPosCode={personnelA?.posCodeId}
          excludeTransactionId={params.id as string}
        />
      </Box>
    </Layout>
  );
}
