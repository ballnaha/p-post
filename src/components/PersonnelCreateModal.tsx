'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Autocomplete,
  Typography,
  Divider,
  InputAdornment,
  Paper,
  Stack,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import { useSnackbar } from '@/contexts/SnackbarContext';

// Set locale to Thai
dayjs.locale('th');

interface PersonnelCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PosCode {
  id: number;
  name: string;
}

// Helper functions for Thai date
const parseThaiDate = (dateStr: string): Dayjs | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]) - 543; // Convert BE to AD
  const date = dayjs(`${year}-${month}-${day}`);
  return date.isValid() ? date : null;
};

const formatThaiDate = (date: Dayjs | null): string => {
  if (!date || !date.isValid()) return '';
  const day = date.date().toString().padStart(2, '0');
  const month = (date.month() + 1).toString().padStart(2, '0');
  const year = date.year() + 543; // Convert AD to BE
  return `${day}/${month}/${year}`;
};

export default function PersonnelCreateModal({
  open,
  onClose,
  onSuccess,
}: PersonnelCreateModalProps) {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [posCodes, setPosCodes] = useState<PosCode[]>([]);
  const [loadingPosCodes, setLoadingPosCodes] = useState(false);
  const [units, setUnits] = useState<string[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    posCodeId: null as number | null,
    position: '',
    positionNumber: '',
    unit: '',
    rank: '',
    fullName: '',
    nationalId: '',
    birthDate: '',
    age: '',
    seniority: '',
    education: '',
    lastAppointment: '',
    currentRankSince: '',
    enrollmentDate: '',
    retirementDate: '',
    yearsOfService: '',
    trainingLocation: '',
    trainingCourse: '',
    notes: '',
    actingAs: '',
    supporterName: '',
    supportReason: '',
  });

  // Fetch PosCodes on mount
  useEffect(() => {
    if (open) {
      fetchPosCodes();
      fetchUnits();
    }
  }, [open]);

  const fetchPosCodes = async () => {
    try {
      setLoadingPosCodes(true);
      const response = await fetch('/api/police-personnel/pos-codes');
      if (response.ok) {
        const data = await response.json();
        setPosCodes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching pos codes:', error);
    } finally {
      setLoadingPosCodes(false);
    }
  };

  const fetchUnits = async () => {
    try {
      setLoadingUnits(true);
      const response = await fetch('/api/police-personnel/units');
      if (response.ok) {
        const data = await response.json();
        setUnits(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.fullName) {
      showSnackbar('กรุณาระบุชื่อ-สกุล', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/police-personnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        showSnackbar('บันทึกข้อมูลสำเร็จ', 'success');
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          posCodeId: null,
          position: '',
          positionNumber: '',
          unit: '',
          rank: '',
          fullName: '',
          nationalId: '',
          birthDate: '',
          age: '',
          seniority: '',
          education: '',
          lastAppointment: '',
          currentRankSince: '',
          enrollmentDate: '',
          retirementDate: '',
          yearsOfService: '',
          trainingLocation: '',
          trainingCourse: '',
          notes: '',
          actingAs: '',
          supporterName: '',
          supportReason: '',
        });
      } else {
        showSnackbar(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      }
    } catch (error) {
      console.error('Error creating personnel:', error);
      showSnackbar('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionProps={{
        timeout: 0,
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%' },
          height: { xs: '100%', md: 'auto' },
          maxHeight: { xs: '100%', md: '90vh' },
          margin: { xs: 0, md: '32px' },
          borderRadius: { xs: 0, md: 1 },
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 1.5,
        px: 2,
        flexShrink: 0
      }}>
        <PersonAddIcon fontSize="small" />
        <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
          เพิ่มข้อมูลบุคลากร
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ 
        flex: 1,
        overflow: 'auto',
        p: { xs: 2, md: 3 },
        backgroundColor: 'grey.50',
        '& .MuiTextField-root': {
          '& .MuiInputLabel-root': {
            fontSize: '0.875rem'
          },
          '& .MuiInputBase-input': {
            fontSize: '0.875rem'
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1
            }
          }
        }
      }}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
          <Box component="form" noValidate autoComplete="off">
            <Stack spacing={{ xs: 2, sm: 3 }}>
                
                {/* ข้อมูลบุคคล */}
                <Paper sx={{                 
                  mt: { xs: 1.5, sm: 5 },
                  p: { xs: 2, sm: 3 },
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'grey.200',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <PersonIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                      ข้อมูลบุคคล
                    </Typography>
                  </Box>

                  <Stack spacing={2.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="ยศ"
                        value={formData.rank}
                        onChange={(e) => handleChange('rank', e.target.value)}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <BadgeIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                            </InputAdornment>
                          )
                        }}
                      />
                      <TextField
                        fullWidth
                        required
                        label="ชื่อ-สกุล"
                        value={formData.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="เลขบัตรประชาชน"
                        value={formData.nationalId}
                        onChange={(e) => handleChange('nationalId', e.target.value)}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                            </InputAdornment>
                          )
                        }}
                      />
                      <TextField
                        fullWidth
                        label="อายุ"
                        value={formData.age}
                        onChange={(e) => handleChange('age', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="อาวุโส"
                        value={formData.seniority}
                        onChange={(e) => handleChange('seniority', e.target.value)}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                            </InputAdornment>
                          )
                        }}
                      />
                      <TextField
                        fullWidth
                        label="คุณวุฒิ"
                        value={formData.education}
                        onChange={(e) => handleChange('education', e.target.value)}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SchoolIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Stack>
                  </Stack>
                </Paper>

                {/* ข้อมูลตำแหน่ง */}
                <Paper sx={{                 
                  p: { xs: 2, sm: 3 },
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'grey.200',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <BadgeIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                      ข้อมูลตำแหน่ง
                    </Typography>
                  </Box>
                  
                  <Stack spacing={2.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        select
                        label="รหัสตำแหน่ง"
                        value={formData.posCodeId || ''}
                        onChange={(e) => handleChange('posCodeId', e.target.value ? Number(e.target.value) : null)}
                        variant="outlined"
                        size="small"
                        SelectProps={{
                          displayEmpty: true,
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <BadgeIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                            </InputAdornment>
                          ),
                        }}
                      >
                        <MenuItem value="">
                          <em>-- เลือกรหัสตำแหน่ง --</em>
                        </MenuItem>
                        {loadingPosCodes ? (
                          <MenuItem disabled>
                            <CircularProgress size={20} />
                          </MenuItem>
                        ) : (
                          posCodes.map((posCode) => (
                            <MenuItem key={posCode.id} value={posCode.id}>
                              {posCode.id} - {posCode.name}
                            </MenuItem>
                          ))
                        )}
                      </TextField>
                      <TextField
                        fullWidth
                        label="ตำแหน่ง"
                        value={formData.position}
                        onChange={(e) => handleChange('position', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="เลขตำแหน่ง"
                        value={formData.positionNumber}
                        onChange={(e) => handleChange('positionNumber', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="ทำหน้าที่"
                        value={formData.actingAs}
                        onChange={(e) => handleChange('actingAs', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Autocomplete
                        fullWidth
                        freeSolo
                        options={units}
                        value={formData.unit}
                        onChange={(_, newValue) => handleChange('unit', newValue || '')}
                        onInputChange={(_, newInputValue) => handleChange('unit', newInputValue)}
                        loading={loadingUnits}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="หน่วย"
                            variant="outlined"
                            size="small"
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <BadgeIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <>
                                  {loadingUnits ? <CircularProgress color="inherit" size={20} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    </Stack>
                  </Stack>
                </Paper>

                {/* ข้อมูลวันที่ */}
                <Paper sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'grey.200',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <CalendarIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                      ข้อมูลวันที่
                    </Typography>
                  </Box>

                  <Stack spacing={2.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="วันเกิด"
                        placeholder="DD/MM/YYYY"
                        value={formData.birthDate}
                        onChange={(e) => handleChange('birthDate', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="แต่งตั้งครั้งสุดท้าย"
                        placeholder="DD/MM/YYYY"
                        value={formData.lastAppointment}
                        onChange={(e) => handleChange('lastAppointment', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="ระดับนี้เมื่อ"
                        placeholder="DD/MM/YYYY"
                        value={formData.currentRankSince}
                        onChange={(e) => handleChange('currentRankSince', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="บรรจุ"
                        placeholder="DD/MM/YYYY"
                        value={formData.enrollmentDate}
                        onChange={(e) => handleChange('enrollmentDate', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        label="เกษียณ"
                        placeholder=""
                        value={formData.retirementDate}
                        onChange={(e) => handleChange('retirementDate', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label="จำนวนปี"
                        value={formData.yearsOfService}
                        onChange={(e) => handleChange('yearsOfService', e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                    </Stack>
                  </Stack>
                </Paper>

                {/* ข้อมูลการฝึกอบรม */}
                <Paper sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'grey.200',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <SchoolIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                      ข้อมูลการฝึกอบรม
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="สถานที่ฝึกอบรม (ตท.)"
                      value={formData.trainingLocation}
                      onChange={(e) => handleChange('trainingLocation', e.target.value)}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="หลักสูตร (นรต.)"
                      value={formData.trainingCourse}
                      onChange={(e) => handleChange('trainingCourse', e.target.value)}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                </Paper>

                {/* ข้อมูลการเสนอชื่อ */}
                <Paper sx={{                 
                  p: { xs: 2, sm: 3 },
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'grey.200',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <BadgeIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                      ข้อมูลการเสนอชื่อ
                    </Typography>
                  </Box>

                  <Stack spacing={2.5}>
                    <TextField
                      fullWidth
                      label="ผู้สนับสนุน/ผู้เสนอชื่อ"
                      value={formData.supporterName}
                      onChange={(e) => handleChange('supporterName', e.target.value)}
                      variant="outlined"
                      size="small"
                      placeholder="ระบุชื่อผู้สนับสนุน/ผู้เสนอชื่อ"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                          </InputAdornment>
                        )
                      }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="เหตุผลในการสนับสนุน"
                      value={formData.supportReason}
                      onChange={(e) => handleChange('supportReason', e.target.value)}
                      variant="outlined"
                      size="small"
                      placeholder="เช่น เหตุผล, ข้อมูลเพิ่มเติม..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderWidth: 2
                          }
                        }
                      }}
                    />
                  </Stack>
                </Paper>

                {/* หมายเหตุ */}
                <Paper sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'grey.200',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <InfoIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                      หมายเหตุ
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="หมายเหตุเพิ่มเติม"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    variant="outlined"
                    size="small"
                    placeholder="ระบุข้อมูลเพิ่มเติม..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderWidth: 2
                        }
                      }
                    }}
                  />
                </Paper>
            </Stack>
          </Box>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ 
        p: 2,
        borderTop: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        gap: 1,
        flexShrink: 0
      }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          size="medium"
          disabled={loading}
          sx={{ 
            minWidth: 100,
            borderRadius: 1.5
          }}
        >
          ยกเลิก
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          size="medium"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{ 
            minWidth: 120,
            borderRadius: 1.5
          }}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
