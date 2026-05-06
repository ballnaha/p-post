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
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import PersonnelDrawer from './components/PersonnelDrawer';
import { formatBuddhistDate } from '@/utils/dateFormat';

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

export default function AddThreeWaySwapPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [swappedPersonnelIds, setSwappedPersonnelIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (year) {
      fetchNextGroupNumber(year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const fetchNextGroupNumber = async (selectedYear: number): Promise<Set<string>> => {
    try {
      // Filter by swapType=three-way to get only three-way transactions
      const response = await fetch(`/api/swap-transactions?year=${selectedYear}&swapType=three-way`);

      if (!response.ok) {
        throw new Error('Failed to fetch swap transactions');
      }

      const result = await response.json();
      const transactions = result.data || [];

      // Find the maximum group number for three-way swaps this year (format: 2568/THREE-001)
      let maxNumber = 0;
      if (Array.isArray(transactions)) {
        transactions.forEach((transaction: any) => {
          if (transaction.groupNumber) {
            // Extract number from format "2568/THREE-001" or legacy "2568/3W-001"
            const match = transaction.groupNumber.match(/\/(?:THREE|3W)-(\d+)$/);
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
      setGroupNumber(`${selectedYear}/THREE-${formattedNumber}`);

      // Extract personnel IDs who already swapped in this year (three-way only)
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
      setGroupNumber(`${selectedYear}/THREE-001`);
      return new Set<string>();
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

    if (!year || !swapDate || !groupNumber) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    // Check for duplicates
    const ids = [personnelA.id, personnelB.id, personnelC.id];
    if (new Set(ids).size !== 3) {
      toast.error('ไม่สามารถเลือกบุคลากรซ้ำกันได้');
      return;
    }

    // Validate: แต่ละคนต้องไม่ได้ตำแหน่งเดิม (A→B, B→C, C→A)
    try {
      setLoading(true);

      const groupName = `${personnelA.fullName} → ${personnelB.fullName} → ${personnelC.fullName}`;

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
          toPosCodeId: personnelB.posCodeId,
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
          // ข้อมูลการเสนอชื่อ (snapshot)
          supportName: personnelA.supporterName,
          supportReason: personnelA.supportReason,
          // หมายเหตุ
          notes: personnelA.notes,
          // ตำแหน่ง
          fromPosition: personnelA.position,
          fromPositionNumber: personnelA.positionNumber,
          fromUnit: personnelA.unit,
          fromActingAs: personnelA.actingAs,
          toPosition: personnelB.position, // A ไปที่ตำแหน่ง B
          toPositionNumber: personnelB.positionNumber,
          toUnit: personnelB.unit,
          toActingAs: personnelB.actingAs,
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
          toPosCodeId: personnelC.posCodeId,
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
          // ข้อมูลการเสนอชื่อ (snapshot)
          supportName: personnelB.supporterName,
          supportReason: personnelB.supportReason,
          // หมายเหตุ
          notes: personnelB.notes,
          // ตำแหน่ง
          fromPosition: personnelB.position,
          fromPositionNumber: personnelB.positionNumber,
          fromUnit: personnelB.unit,
          fromActingAs: personnelB.actingAs,
          toPosition: personnelC.position, // B ไปที่ตำแหน่ง C
          toPositionNumber: personnelC.positionNumber,
          toUnit: personnelC.unit,
          toActingAs: personnelC.actingAs,
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
          toPosCodeId: personnelA.posCodeId,
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
          // ข้อมูลการเสนอชื่อ (snapshot)
          supportName: personnelC.supporterName,
          supportReason: personnelC.supportReason,
          // หมายเหตุ
          notes: personnelC.notes,
          // ตำแหน่ง
          fromPosition: personnelC.position,
          fromPositionNumber: personnelC.positionNumber,
          fromUnit: personnelC.unit,
          fromActingAs: personnelC.actingAs,
          toPosition: personnelA.position, // C ไปที่ตำแหน่ง A
          toPositionNumber: personnelA.positionNumber,
          toUnit: personnelA.unit,
          toActingAs: personnelA.actingAs,
        },
      ];

      const response = await fetch('/api/swap-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year,
          swapDate: swapDate.format('YYYY-MM-DD'),
          swapType: 'three-way',
          groupName,
          groupNumber,
          notes: notes || `การสลับตำแหน่งสามเส้า: ${groupName}`,
          swapDetails,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save swap transaction');
      }

      toast.success('บันทึกผลการสลับตำแหน่งสามเส้าสำเร็จ');
      router.push('/police-personnel/three-way-swap');
    } catch (error: any) {
      console.error('Error saving swap transaction:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
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
                  <Typography variant="body2">{formatBuddhistDate(personnel.birthDate)}</Typography>
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
                  <Typography variant="body2">{formatBuddhistDate(personnel.enrollmentDate)}</Typography>
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
                  <Typography variant="body2">{formatBuddhistDate(personnel.currentRankSince)}</Typography>
                </Box>
              )}
              {personnel.lastAppointment && (
                <Box>
                  <Typography variant="caption" color="text.secondary">แต่งตั้งครั้งล่าสุด</Typography>
                  <Typography variant="body2">{formatBuddhistDate(personnel.lastAppointment)}</Typography>
                </Box>
              )}
              {personnel.retirementDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary">วันเกษียณ</Typography>
                  <Typography variant="body2" color="warning.main">
                    {formatBuddhistDate(personnel.retirementDate)}
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

          {/* New Position Section */}
          {personnelA && personnelB && personnelC && (
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed', borderColor: 'grey.300' }}>
              <Typography variant="subtitle2" color="success.main" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                🟢 ตำแหน่งใหม่ (ที่จะไป)
              </Typography>
              <Box sx={{ p: 1.5, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                {label === 'บุคลากร A' && (
                  <>
                    <Typography variant="body2" fontWeight={700} color="success.dark">{personnelB.position}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">{personnelB.unit}</Typography>
                  </>
                )}
                {label === 'บุคลากร B' && (
                  <>
                    <Typography variant="body2" fontWeight={700} color="success.dark">{personnelC.position}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">{personnelC.unit}</Typography>
                  </>
                )}
                {label === 'บุคลากร C' && (
                  <>
                    <Typography variant="body2" fontWeight={700} color="success.dark">{personnelA.position}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">{personnelA.unit}</Typography>
                  </>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );

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
                  เพิ่มการสลับตำแหน่งสามเส้า
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                เลือกบุคลากร 3 คน เพื่อบันทึกการสลับตำแหน่งแบบวงกลม (A→B, B→C, C→A)
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
                helperText="เลขกลุ่มจะถูกสร้างอัตโนมัติ"
              />
              <FormControl size="small" fullWidth>
                <InputLabel id="year-select-label">ประจำปี *</InputLabel>
                <Select
                  labelId="year-select-label"
                  value={year}
                  label="ประจำปี *"
                  onChange={(e) => setYear(Number(e.target.value))}
                  required
                >
                  {(() => {
                    const currentYear = new Date().getFullYear() + 543;
                    return Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map((y) => (
                      <MenuItem key={y} value={y}>
                        พ.ศ. {y}
                      </MenuItem>
                    ));
                  })()}
                </Select>
              </FormControl>
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
          </Paper>

          {/* Notes Section */}
          <Box>
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
                disabled={loading}
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
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={loading || !canSwap}
                fullWidth={isMobile}
                sx={{
                  minHeight: { xs: '48px', sm: 'auto' },
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 600
                }}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึกผลการสลับสามเส้า'}
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
          excludePersonnelId={[personnelA?.id, personnelB?.id, personnelC?.id].filter((id): id is string => !!id)}
          filterYear={year}
        />

        {/* Personnel Drawer for B - กรองตามหน่วยและ posCode เดียวกับ A */}
        <PersonnelDrawer
          open={drawerBOpen}
          onClose={() => setDrawerBOpen(false)}
          onSelect={(personnel) => handleSelectPersonnelB(personnel as any)}
          title="เลือกบุคลากร B"
          excludePersonnelId={[personnelA?.id, personnelB?.id, personnelC?.id].filter((id): id is string => !!id)}
          initialFilterUnit={personnelA?.unit}
          initialFilterPosCode={personnelA?.posCodeId}
          filterYear={year}
        />

        {/* Personnel Drawer for C - กรองตามหน่วยและ posCode เดียวกับ A */}
        <PersonnelDrawer
          open={drawerCOpen}
          onClose={() => setDrawerCOpen(false)}
          onSelect={(personnel) => handleSelectPersonnelC(personnel as any)}
          title="เลือกบุคลากร C"
          excludePersonnelId={[personnelA?.id, personnelB?.id, personnelC?.id].filter((id): id is string => !!id)}
          initialFilterUnit={personnelA?.unit}
          initialFilterPosCode={personnelA?.posCodeId}
          filterYear={year}
        />
      </Box>
    </Layout>
  );
}
