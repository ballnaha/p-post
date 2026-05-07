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
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { formatBuddhistDateInput, parseBuddhistDateInputToGregorian } from '@/utils/dateFormat';
import { formatPositionNumber, normalizePositionNumber } from '@/utils/positionNumber';

interface PersonnelCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<PersonnelFormData> & { id?: string };
}

interface PosCode {
  id: number;
  name: string;
}

interface PersonnelFormData {
  posCodeId: number | null;
  position: string;
  positionNumber: string;
  unit: string;
  rank: string;
  fullName: string;
  nationalId: string;
  birthDate: string;
  age: string;
  seniority: string;
  education: string;
  lastAppointment: string;
  currentRankSince: string;
  enrollmentDate: string;
  retirementDate: string;
  yearsOfService: string;
  trainingLocation: string;
  trainingCourse: string;
  notes: string;
  actingAs: string;
  supporterName: string;
  supportReason: string;
  requestedPosition: string;
}

const emptyFormData: PersonnelFormData = {
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
  requestedPosition: '',
};

const dateFields: Array<keyof Pick<
  PersonnelFormData,
  'birthDate' | 'lastAppointment' | 'currentRankSince' | 'enrollmentDate' | 'retirementDate'
>> = ['birthDate', 'lastAppointment', 'currentRankSince', 'enrollmentDate', 'retirementDate'];

const toFormData = (initialData?: PersonnelCreateModalProps['initialData']): PersonnelFormData => ({
  posCodeId: initialData?.posCodeId ?? null,
  position: initialData?.position ?? '',
  positionNumber: formatPositionNumber(initialData?.positionNumber),
  unit: initialData?.unit ?? '',
  rank: initialData?.rank ?? '',
  fullName: initialData?.fullName ?? '',
  nationalId: initialData?.nationalId ?? '',
  birthDate: formatBuddhistDateInput(initialData?.birthDate),
  age: initialData?.age ?? '',
  seniority: initialData?.seniority ?? '',
  education: initialData?.education ?? '',
  lastAppointment: formatBuddhistDateInput(initialData?.lastAppointment),
  currentRankSince: formatBuddhistDateInput(initialData?.currentRankSince),
  enrollmentDate: formatBuddhistDateInput(initialData?.enrollmentDate),
  retirementDate: formatBuddhistDateInput(initialData?.retirementDate),
  yearsOfService: initialData?.yearsOfService ?? '',
  trainingLocation: initialData?.trainingLocation ?? '',
  trainingCourse: initialData?.trainingCourse ?? '',
  notes: initialData?.notes ?? '',
  actingAs: initialData?.actingAs ?? '',
  supporterName: initialData?.supporterName ?? '',
  supportReason: initialData?.supportReason ?? '',
  requestedPosition: initialData?.requestedPosition ?? '',
});

const toSubmitData = (formData: PersonnelFormData): PersonnelFormData => {
  const submitData = { ...formData };
  dateFields.forEach((field) => {
    submitData[field] = parseBuddhistDateInputToGregorian(formData[field]);
  });
  submitData.positionNumber = normalizePositionNumber(formData.positionNumber);

  return submitData;
};

export default function PersonnelCreateModal({
  open,
  onClose,
  onSuccess,
  initialData,
}: PersonnelCreateModalProps) {
  const isEditMode = Boolean(initialData?.id);
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [posCodes, setPosCodes] = useState<PosCode[]>([]);
  const [loadingPosCodes, setLoadingPosCodes] = useState(false);
  const [units, setUnits] = useState<string[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PersonnelFormData>(emptyFormData);

  // Fetch PosCodes on mount
  useEffect(() => {
    if (open) {
      fetchPosCodes();
      fetchUnits();
      setFormData(toFormData(initialData));
    }
  }, [open, initialData]);

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
    try {
      setLoading(true);
      const submitData = toSubmitData(formData);
      const response = await fetch(
        isEditMode ? `/api/police-personnel/${initialData?.id}` : '/api/police-personnel',
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showSnackbar(isEditMode ? 'แก้ไขข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ', 'success');
        onSuccess();
        onClose();
        setFormData(emptyFormData);
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
        {isEditMode ? <EditIcon fontSize="small" /> : <PersonAddIcon fontSize="small" />}
        <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
          {isEditMode ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มข้อมูลบุคลากร'}
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
                      placeholder="DD/MM/พ.ศ."
                      helperText="เช่น 15/01/2523"
                      value={formData.birthDate}
                      onChange={(e) => handleChange('birthDate', e.target.value)}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="แต่งตั้งครั้งสุดท้าย"
                      placeholder="DD/MM/พ.ศ."
                      helperText="เช่น 01/01/2568"
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
                      placeholder="DD/MM/พ.ศ."
                      helperText="เช่น 01/06/2567"
                      value={formData.currentRankSince}
                      onChange={(e) => handleChange('currentRankSince', e.target.value)}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="บรรจุ"
                      placeholder="DD/MM/พ.ศ."
                      helperText="เช่น 01/10/2543"
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
                      placeholder="DD/MM/พ.ศ."
                      helperText="เช่น 30/09/2583"
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
                    label="ตำแหน่งที่ร้องขอ"
                    value={formData.requestedPosition}
                    onChange={(e) => handleChange('requestedPosition', e.target.value)}
                    variant="outlined"
                    size="small"
                    placeholder="ระบุตำแหน่งที่ร้องขอ"
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
          {loading ? 'กำลังบันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
