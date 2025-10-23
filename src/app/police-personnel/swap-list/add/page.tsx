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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  SwapHoriz as SwapHorizIcon,
  Person as PersonIcon,
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
}

export default function AddSwapTransactionPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [personnelOptions, setPersonnelOptions] = useState<PolicePersonnel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Personnel selections
  const [personnelA, setPersonnelA] = useState<PolicePersonnel | null>(null);
  const [personnelB, setPersonnelB] = useState<PolicePersonnel | null>(null);
  
  // Form data
  const [year, setYear] = useState<number>(new Date().getFullYear() + 543);
  const [swapDate, setSwapDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPersonnelOptions('');
  }, []);

  const fetchPersonnelOptions = async (searchTerm: string) => {
    try {
      setSearchLoading(true);
      const response = await fetch(
        `/api/police-personnel/search-names?query=${encodeURIComponent(searchTerm)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch personnel');
      }

      const data = await response.json();
      // Filter only personnel with rank (not vacant positions)
      setPersonnelOptions(data.filter((p: PolicePersonnel) => p.rank));
    } catch (error) {
      console.error('Error fetching personnel:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePersonnelSearch = (event: React.SyntheticEvent, value: string) => {
    if (value.length >= 2) {
      fetchPersonnelOptions(value);
    }
  };

  const handleSelectPersonnelA = (newValue: PolicePersonnel | null) => {
    setPersonnelA(newValue);
    // Reset B if position doesn't match
    if (personnelB && newValue && personnelB.position !== newValue.position) {
      setPersonnelB(null);
    }
  };

  const handleSelectPersonnelB = (newValue: PolicePersonnel | null) => {
    setPersonnelB(newValue);
  };

  // Filter options for B based on A's position
  const optionsForB = personnelA
    ? personnelOptions.filter(
        (p) =>
          p.id !== personnelA.id &&
          p.position === personnelA.position &&
          p.rank // Ensure has rank
      )
    : [];

  const canSwap = personnelA && personnelB && personnelA.position === personnelB.position;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSwap) {
      toast.error('กรุณาเลือกบุคลากร 2 คนที่มีตำแหน่งเท่ากัน');
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
          swapDate,
          swapType: 'two-way',
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
                เลือกบุคลากร 2 คน ที่มีตำแหน่งเท่ากัน เพื่อบันทึกการสลับหน่วยงานกัน
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
                    • <strong>{personnelA.fullName}</strong> จาก <strong>{personnelA.unit}</strong> → ไป <strong style={{ color: 'green' }}>{personnelB.unit}</strong>
                  </Typography>
                  <Typography variant="body2">
                    • <strong>{personnelB.fullName}</strong> จาก <strong>{personnelB.unit}</strong> → ไป <strong style={{ color: 'green' }}>{personnelA.unit}</strong>
                  </Typography>
                </Box>
              </Alert>
            )}
          </Paper>

          {/* Additional Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={3}>
              ข้อมูลเพิ่มเติม
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="ปีงบประมาณ พ.ศ. *"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                required
                inputProps={{ min: 2500, max: 2700 }}
                size="small"
              />

              <TextField
                label="วันที่ทำการสลับ *"
                type="date"
                value={swapDate}
                onChange={(e) => setSwapDate(e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                size="small"
              />

              <TextField
                label="หมายเหตุ"
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                size="small"
              />
            </Box>
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
      </Box>
    </Layout>
  );
}
