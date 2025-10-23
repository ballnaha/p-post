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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  Autocomplete,
  Chip,
} from '@mui/material';
import {
  SwapHoriz as SwapHorizIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useTheme, useMediaQuery } from '@mui/material';
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
  seniority?: string;
  education?: string;
  birthDate?: string;
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  actingAs?: string;
  trainingLocation?: string;
  trainingCourse?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function SwapPositionPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();

  const [data, setData] = useState<PolicePersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [personnelA, setPersonnelA] = useState<PolicePersonnel | null>(null);
  const [personnelB, setPersonnelB] = useState<PolicePersonnel | null>(null);
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  // ดึงรายการปีที่มีข้อมูล
  const fetchAvailableYears = async () => {
    try {
      const response = await fetch('/api/swap-list/years');
      const result = await response.json();
      if (result.success) {
        setAvailableYears(result.data);
      }
    } catch (err) {
      console.error('Error fetching years:', err);
    }
  };

  // ดึงข้อมูลจาก swap list ตามปีที่เลือก
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/swap-list?year=${selectedYear}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  // ฟังก์ชันเลือกบุคลากร A
  const handleSelectPersonnelA = (personnel: PolicePersonnel | null) => {
    if (personnel && !personnel.rank) {
      toast.error('ไม่สามารถเลือกตำแหน่งว่างได้');
      return;
    }
    setPersonnelA(personnel);
    setPersonnelB(null); // รีเซ็ต B เมื่อเปลี่ยน A
  };

  // ฟังก์ชันเลือกบุคลากร B
  const handleSelectPersonnelB = (personnel: PolicePersonnel | null) => {
    if (personnel && !personnel.rank) {
      toast.error('ไม่สามารถเลือกตำแหน่งว่างได้');
      return;
    }
    
    if (!personnelA) {
      toast.error('กรุณาเลือกบุคลากร A ก่อน');
      return;
    }

    if (personnel && personnel.id === personnelA.id) {
      toast.error('ไม่สามารถเลือกบุคคลเดียวกันได้');
      return;
    }

    if (personnel && personnel.position !== personnelA.position) {
      toast.error(`ตำแหน่งไม่เท่ากัน (${personnelA.position} ≠ ${personnel.position})`);
      return;
    }

    setPersonnelB(personnel);
  };

  // ฟังก์ชันยืนยันการสลับ
  const handleConfirmSwap = () => {
    if (!personnelA || !personnelB) {
      toast.error('กรุณาเลือกบุคลากรทั้ง 2 คน');
      return;
    }

    if (personnelA.position !== personnelB.position) {
      toast.error('ตำแหน่งไม่เท่ากัน ไม่สามารถสลับได้');
      return;
    }

    setSwapConfirmOpen(true);
  };

  // ฟังก์ชันสลับตำแหน่ง (Demo - ไม่บันทึกลง DB)
  const handleSwapPositions = async () => {
    if (!personnelA || !personnelB) return;

    setIsSwapping(true);
    
    // จำลองการทำงาน
    setTimeout(() => {
      toast.success('🎉 สลับตำแหน่งสำเร็จ (Demo Mode - ไม่ได้บันทึกลง Database)');
      setSwapConfirmOpen(false);
      setPersonnelA(null);
      setPersonnelB(null);
      setIsSwapping(false);
      
      // แสดงข้อมูลที่สลับใน console เพื่อดู
      console.log('=== Swap Position Demo ===');
      console.log('Personnel A:', personnelA.fullName, '(', personnelA.rank, ')');
      console.log('  FROM:', personnelA.unit);
      console.log('  TO:', personnelB.unit);
      console.log('');
      console.log('Personnel B:', personnelB.fullName, '(', personnelB.rank, ')');
      console.log('  FROM:', personnelB.unit);
      console.log('  TO:', personnelA.unit);
      console.log('========================');
    }, 1500);
  };

  const handleReset = () => {
    setPersonnelA(null);
    setPersonnelB(null);
  };

  // กรองตัวเลือกสำหรับ B (เฉพาะตำแหน่งเท่ากันกับ A)
  const optionsForB = personnelA 
    ? data.filter(p => p.rank && p.position === personnelA.position && p.id !== personnelA.id)
    : [];

  return (
    <Layout>
      <Box sx={{ mx: 'auto', width: '100%', overflow: 'visible' }}>
        {/* Header */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 },
            mb: 2,
          }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SwapHorizIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  สลับตำแหน่งบุคลากร
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                เลือกบุคลากรจากรายการที่เพิ่มไว้ 2 คน ที่มีตำแหน่งเท่ากันเพื่อสลับหน่วยงานกัน
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/police-personnel')}
              sx={{ 
                minWidth: { xs: 'auto', sm: 120 },
                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
              }}
            >
              กลับ
            </Button>
          </Box>

          {/* Year Selector */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Autocomplete
              size="small"
              options={availableYears}
              value={selectedYear}
              onChange={(event, newValue) => {
                if (newValue) {
                  setSelectedYear(newValue);
                  setPersonnelA(null);
                  setPersonnelB(null);
                }
              }}
              getOptionLabel={(option) => option.toString()}
              sx={{ maxWidth: 300 }}
              renderInput={(params) => <TextField {...params} label="เลือกปี (พ.ศ.)" />}
              renderOption={(props, option) => {
                const isCurrent = option === new Date().getFullYear() + 543;
                return (
                  <li {...props}>
                    {option} {isCurrent}
                  </li>
                );
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              รายการที่แสดงเป็นบุคลากรที่เพิ่มเข้ารายการสลับตำแหน่งปี {selectedYear} (จำนวน {data.length} คน)
            </Typography>
          </Box>

          {/* Info Alert */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              <strong>เงื่อนไขการสลับตำแหน่ง:</strong>
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.813rem', mt: 0.5 }}>
              ✅ ต้องมีผู้ดำรงตำแหน่งทั้งคู่ (ไม่ใช่ตำแหน่งว่าง)<br />
              ✅ <strong>ตำแหน่งต้องเท่ากัน</strong> (เช่น ผบ.หมู่ ⟷ ผบ.หมู่)<br />
              ⚠️ ยศไม่จำเป็นต้องเท่ากัน
            </Typography>
          </Alert>
        </Paper>

        {/* Main Content */}
        <Paper sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  กำลังโหลดข้อมูล...
                </Typography>
              </Box>
            </Box>
          ) : data.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                ไม่พบรายการสลับตำแหน่งสำหรับปี {selectedYear}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                กรุณาเพิ่มบุคลากรเข้ารายการสลับตำแหน่งจากหน้า Police Personnel ก่อน
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/police-personnel')}
              >
                ไปที่หน้า Police Personnel
              </Button>
            </Box>
          ) : (
            <>
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
                    options={data.filter(p => p.rank)}
                    value={personnelA}
                    getOptionLabel={(option) => `${option.rank} ${option.fullName} - ${option.position} (${option.unit})`}
                    onChange={(event, newValue) => handleSelectPersonnelA(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="🔍 เลือกบุคลากร A" placeholder="ค้นหา..." />
                    )}
                  />

                  {personnelA && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">ยศ</Typography>
                          <Typography variant="body2" fontWeight={600}>{personnelA.rank}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">ชื่อ-สกุล</Typography>
                          <Typography variant="body2" fontWeight={600}>{personnelA.fullName}</Typography>
                        </Box>
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
                      color: personnelA && personnelB ? 'success.main' : 'grey.400',
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
                    getOptionLabel={(option) => `${option.rank} ${option.fullName} - ${option.position} (${option.unit})`}
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
                        ? `ไม่พบบุคลากรที่มีตำแหน่ง "${personnelA.position}"` 
                        : "เลือกบุคลากร A ก่อน"
                    }
                  />

                  {personnelB && (
                    <Box sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">ยศ</Typography>
                          <Typography variant="body2" fontWeight={600}>{personnelB.rank}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">ชื่อ-สกุล</Typography>
                          <Typography variant="body2" fontWeight={600}>{personnelB.fullName}</Typography>
                        </Box>
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

              {/* Summary แสดงเมื่อเลือกครบ */}
              {personnelA && personnelB && personnelA.position === personnelB.position && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 3 }}>
                  <Typography variant="body2" fontWeight={600} mb={1.5}>
                    ✅ ตำแหน่งตรงกัน พร้อมสลับตำแหน่ง
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' }, 
                    gap: 2, 
                    bgcolor: 'white', 
                    p: 2, 
                    borderRadius: 1 
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {personnelA.rank} {personnelA.fullName}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>จาก:</strong> {personnelA.position}
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        <strong>→ ไป:</strong> {personnelB.position}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SwapHorizIcon color="success" sx={{ fontSize: 32 }} />
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {personnelB.rank} {personnelB.fullName}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>จาก:</strong> {personnelB.position}
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        <strong>→ ไป:</strong> {personnelA.position}
                      </Typography>
                    </Box>
                  </Box>
                </Alert>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleReset}
                  disabled={!personnelA && !personnelB}
                  sx={{ minWidth: 140 }}
                >
                  รีเซ็ต
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SwapHorizIcon />}
                  onClick={handleConfirmSwap}
                  disabled={!personnelA || !personnelB || personnelA.position !== personnelB.position}
                  sx={{ minWidth: 180 }}
                >
                  ยืนยันการสลับ
                </Button>
              </Box>
            </>
          )}
        </Paper>

        {/* Swap Confirmation Dialog */}
        <Dialog open={swapConfirmOpen} onClose={() => setSwapConfirmOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SwapHorizIcon color="primary" />
              <Typography component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
                ยืนยันการสลับตำแหน่ง
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              ต้องการสลับหน่วยงานระหว่าง:
            </Typography>
            
            {personnelA && personnelB && (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr auto 1fr', 
                gap: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.300',
              }}>
                <Box>
                  <Chip label="A" color="primary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="subtitle2" fontWeight={600} color="primary" mb={0.5}>
                    {personnelA.rank} {personnelA.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.813rem' }}>
                    ตำแหน่ง: {personnelA.position}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontSize: '0.813rem' }}>
                    <strong>จาก:</strong> {personnelA.unit}
                  </Typography>
                  <Typography variant="body2" color="success.main" fontWeight={600} sx={{ fontSize: '0.813rem' }}>
                    <strong>→ ไป:</strong> {personnelB.unit}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SwapHorizIcon color="primary" sx={{ fontSize: 32 }} />
                </Box>
                
                <Box>
                  <Chip label="B" color="secondary" size="small" sx={{ mb: 1 }} />
                  <Typography variant="subtitle2" fontWeight={600} color="primary" mb={0.5}>
                    {personnelB.rank} {personnelB.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.813rem' }}>
                    ตำแหน่ง: {personnelB.position}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontSize: '0.813rem' }}>
                    <strong>จาก:</strong> {personnelB.unit}
                  </Typography>
                  <Typography variant="body2" color="success.main" fontWeight={600} sx={{ fontSize: '0.813rem' }}>
                    <strong>→ ไป:</strong> {personnelA.unit}
                  </Typography>
                </Box>
              </Box>
            )}

            <Alert severity="warning" sx={{ mt: 2, py: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.813rem' }}>
                🎯 <strong>Demo Mode:</strong> การสลับตำแหน่งจะไม่ถูกบันทึกลง Database
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.5 }}>
            <Button onClick={() => setSwapConfirmOpen(false)} variant="outlined" size="medium" disabled={isSwapping}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSwapPositions} 
              variant="contained" 
              color="primary"
              size="medium"
              disabled={isSwapping}
              startIcon={isSwapping ? <CircularProgress size={16} color="inherit" /> : <SwapHorizIcon />}
              sx={{ minWidth: 200 }}
            >
              {isSwapping ? 'กำลังสลับ...' : 'ยืนยันสลับตำแหน่ง (Demo)'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
