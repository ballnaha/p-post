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
  IconButton,
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

export default function AddThreeWaySwapPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [personnelOptions, setPersonnelOptions] = useState<PolicePersonnel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [swappedPersonnelIds, setSwappedPersonnelIds] = useState<Set<string>>(new Set());
  
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
      // Filter by swapType=three-way to get only three-way transactions
      const response = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=three-way`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch swap transactions');
      }
      
      const result = await response.json();
      const transactions = result.data || [];
      
      // Find the maximum group number for three-way swaps this year (format: 2568/3W-001)
      let maxNumber = 0;
      if (Array.isArray(transactions)) {
        transactions.forEach((transaction: any) => {
          if (transaction.groupNumber) {
            // Extract number from format "2568/3W-001"
            const match = transaction.groupNumber.match(/\/3W-(\d+)$/);
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
      setGroupNumber(`${currentYear}/3W-${formattedNumber}`);
      
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
      const currentYear = new Date().getFullYear() + 543;
      setGroupNumber(`${currentYear}/3W-001`);
      return new Set<string>();
    }
  };

  const fetchPersonnelOptions = async (excludeIds?: Set<string>) => {
    try {
      setSearchLoading(true);
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/swap-list?year=${currentYear}&swapType=three-way`);

      if (!response.ok) {
        throw new Error('Failed to fetch swap list');
      }

      const json = await response.json();
      const list: PolicePersonnel[] = Array.isArray(json?.data) ? json.data : [];
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

  const handleShowDetail = (personnel: PolicePersonnel) => {
    setSelectedPersonnelDetail(personnel);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
  };

  const handleSelectPersonnelA = (newValue: PolicePersonnel | null) => {
    setPersonnelA(newValue);
  };

  const handleSelectPersonnelB = (newValue: PolicePersonnel | null) => {
    setPersonnelB(newValue);
  };

  const handleSelectPersonnelC = (newValue: PolicePersonnel | null) => {
    setPersonnelC(newValue);
  };

  // Filter options - exclude already selected personnel
  const optionsForB = personnelA
    ? personnelOptions.filter(p => p.id !== personnelA.id && p.rank)
    : [];

  const optionsForC = personnelA && personnelB
    ? personnelOptions.filter(p => p.id !== personnelA.id && p.id !== personnelB.id && p.rank)
    : [];

  const canSwap = personnelA && personnelB && personnelC;

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
              {renderPersonnelCard(personnelA, 'บุคลากร A', handleSelectPersonnelA, personnelOptions, false)}
              {renderPersonnelCard(personnelB, 'บุคลากร B', handleSelectPersonnelB, optionsForB, !personnelA)}
              {renderPersonnelCard(personnelC, 'บุคลากร C', handleSelectPersonnelC, optionsForC, !personnelA || !personnelB)}
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
              color="warning"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={loading || !canSwap}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกผลการสลับสามเส้า'}
            </Button>
          </Box>
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
