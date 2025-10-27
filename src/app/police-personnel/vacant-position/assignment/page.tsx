'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  Badge,
  Stack,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  AccountBox as AccountBoxIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';

interface VacantPosition {
  id: string;
  posCodeId: number;
  posCodeName: string;
  unit: string;
  position: string;
  positionNumber: string;
  actingAs: string;
  notes: string;
}

interface Applicant {
  id: string;
  fullName: string;
  rank: string;
  unit: string;
  position: string;
  displayOrder: number;
  nominator: string;
  notes: string;
  requestedPosition: string;
  requestedPositionId: number;
  nationalId: string;
  birthDate: Date | null;
  seniority: number | null;
  requestedPosCode: {
    name: string;
  };
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  units: FilterOption[];
  posCodes: FilterOption[];
}

export default function VacantPositionAssignmentPage() {
  const [vacantPositions, setVacantPositions] = useState<VacantPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<VacantPosition | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedVacantSlot, setSelectedVacantSlot] = useState<VacantPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignNotes, setAssignNotes] = useState('');
  
  // Filter states
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ units: [], posCodes: [] });
  const [filters, setFilters] = useState({
    search: '',
    unit: 'all',
    posCode: 'all',
  });
  
  // Summary states
  const [total, setTotal] = useState(0);
  
  const toast = useToast();

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    // แสดงข้อมูลเฉพาะเมื่อมีการเลือก filter หน่วยหรือ pos code
    if (filters.unit !== 'all' || filters.posCode !== 'all' || filters.search) {
      fetchVacantPositions();
    } else {
      // ถ้าไม่มี filter ให้ล้างข้อมูล
      setVacantPositions([]);
      setTotal(0);
    }
  }, [filters.search, filters.unit, filters.posCode]); // ลบ page และ limit ออก

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/vacant-position/filters');
      if (response.ok) {
        const result = await response.json();
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchVacantPositions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        // ไม่ส่ง page และ limit เพื่อดึงทั้งหมด
        ...(filters.search && { search: filters.search }),
        ...(filters.unit !== 'all' && { unit: filters.unit }),
        ...(filters.posCode !== 'all' && { posCode: filters.posCode }),
      });

      const response = await fetch(`/api/vacant-position/actual?${params}`);
      if (response.ok) {
        const result = await response.json();
        setVacantPositions(result.data || result); // รองรับทั้งแบบมี pagination และไม่มี
        if (result.pagination) {
          setTotal(result.pagination.total);
        } else {
          // ถ้าไม่มี pagination ให้นับจาก data
          setTotal((result.data || result).length);
        }
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลตำแหน่งที่ว่างได้');
      }
    } catch (error) {
      console.error('Error fetching vacant positions:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    // ไม่ต้องรีเซ็ต page เพราะไม่มี pagination
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    // ไม่ต้องรีเซ็ต page เพราะไม่มี pagination
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      unit: 'all',
      posCode: 'all',
    });
    // ไม่ต้องรีเซ็ต page เพราะไม่มี pagination
  };

  const fetchApplicants = async (posCodeId: number) => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear() + 543; // พ.ศ.
      // ดึงรายการผู้สมัครเฉพาะตำแหน่งนั้น
      const response = await fetch(`/api/vacant-position/applicants/${posCodeId}?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        setApplicants(data);
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลผู้ยื่นขอได้');
      }
    } catch (error) {
      console.error('Error fetching applicants:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplicants = (position: VacantPosition) => {
    setSelectedPosition(position);
    fetchApplicants(position.posCodeId);
    setDialogOpen(true);
  };

  const handleAssignPosition = (applicant: Applicant, vacantPosition: VacantPosition) => {
    setSelectedApplicant(applicant);
    setSelectedVacantSlot(vacantPosition);
    setAssignNotes('');
    setAssignDialogOpen(true);
  };

  const confirmAssignment = async () => {
    if (!selectedApplicant || !selectedVacantSlot) return;

    setLoading(true);
    try {
      const response = await fetch('/api/vacant-position/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantId: selectedApplicant.id,
          vacantPositionId: selectedVacantSlot.id,
          notes: assignNotes,
        }),
      });

      if (response.ok) {
        toast.success('จับคู่ตำแหน่งสำเร็จ');
        setAssignDialogOpen(false);
        setDialogOpen(false);
        fetchVacantPositions(); // รีเฟรชข้อมูล
      } else {
        const error = await response.json();
        if (response.status === 409) {
          // ตำแหน่งไม่ว่างแล้ว
          toast.error(error.details || 'ตำแหน่งนี้ไม่ว่างแล้ว');
        } else {
          toast.error(error.error || 'ไม่สามารถจับคู่ตำแหน่งได้');
        }
      }
    } catch (error) {
      console.error('Error assigning position:', error);
      toast.error('เกิดข้อผิดพลาดในการจับคู่ตำแหน่ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Box>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6">
            จัดการจับคู่ตำแหน่งที่ว่าง
          </Typography>
          <Typography variant="body2" color="text.secondary">
            เลือกหน่วยหรือรหัสตำแหน่งเพื่อแสดงตำแหน่งที่ว่าง
          </Typography>
          
          {!loading && total > 0 && vacantPositions.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<AssignmentIcon />}
                label={`ตำแหน่งว่าง: ${total} ตำแหน่ง`}
                color="warning"
                variant="filled"
                size="small"
              />
            </Box>
          )}
        </Stack>

        {/* Filter Section */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon fontSize="small" />
              <Typography variant="subtitle1">
                ตัวกรองข้อมูล
              </Typography>
            </Box>
            
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              {/* Search */}
              <TextField
                label="ค้นหา"
                placeholder="ค้นหาตำแหน่ง, หน่วย..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1 }}
              />
              
              {/* Unit Filter */}
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel>หน่วย *</InputLabel>
                <Select
                  value={filters.unit}
                  label="หน่วย *"
                  onChange={(e) => handleFilterChange('unit', e.target.value)}
                >
                  <MenuItem value="all">-- เลือกหน่วย --</MenuItem>
                  {filterOptions.units.map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Position Code Filter */}
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel>รหัสตำแหน่ง *</InputLabel>
                <Select
                  value={filters.posCode}
                  label="รหัสตำแหน่ง *"
                  onChange={(e) => handleFilterChange('posCode', e.target.value)}
                >
                  <MenuItem value="all">-- เลือกรหัสตำแหน่ง --</MenuItem>
                  {filterOptions.posCodes.map((posCode) => (
                    <MenuItem key={posCode.value} value={posCode.value}>
                      {posCode.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Reset Button */}
              <Button
                variant="outlined"
                startIcon={<RefreshIcon fontSize="small" />}
                onClick={resetFilters}
                size="small"
                sx={{ height: 40 }}
              >
                รีเซ็ต
              </Button>
            </Stack>
            
            {/* Summary */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {total > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  พบตำแหน่งที่ว่าง: <strong>{total}</strong> ตำแหน่ง
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  เลือกหน่วยหรือรหัสตำแหน่งเพื่อค้นหาตำแหน่งที่ว่าง
                </Typography>
              )}
              {(filters.search || filters.unit !== 'all' || filters.posCode !== 'all') && (
                <Chip
                  label="มีการกรองข้อมูล"
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          </Stack>
        </Paper>

        {loading && vacantPositions.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)', 
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(4, 1fr)'
            }, 
            gap: 2.5,
            mt: 1
          }}>
            {vacantPositions.map((position) => (
              <Card 
                key={position.id}
                sx={{ 
                  height: 'fit-content',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
                    borderColor: 'primary.main',
                    transform: 'translateY(-4px)',
                  },
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                  }
                }}
                onClick={() => handleViewApplicants(position)}
              >
                <CardContent sx={{ p: 2.5, pb: 2 }}>
                  <Stack spacing={2}>
                    {/* Header with position name and code */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                        <Box sx={{ 
                          p: 1, 
                          borderRadius: 2, 
                          backgroundColor: 'primary.50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <BusinessIcon color="primary" fontSize="medium" />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 700,
                              fontSize: '1.1rem',
                              lineHeight: 1.3,
                              color: 'text.primary',
                              mb: 0.5
                            }}
                          >
                            {position.posCodeName}
                          </Typography>
                          <Chip
                            label={`รหัส ${position.posCodeId}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ 
                              height: 24,
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>

                    {/* Unit and Position in horizontal layout */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      {/* หน่วย */}
                      <Box sx={{ 
                        backgroundColor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 2,
                        p: 1.5,
                        textAlign: 'center',
                        position: 'relative',
                        '&:before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: 'primary.main',
                          borderRadius: '2px 2px 0 0'
                        }
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          หน่วยงาน
                        </Typography>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 700,
                          color: 'primary.main',
                          fontSize: '0.95rem',
                          mt: 0.5
                        }}>
                          {position.unit || 'ไม่ระบุ'}
                        </Typography>
                      </Box>
                      
                      {/* ตำแหน่ง */}
                      <Box sx={{ 
                        backgroundColor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 2,
                        p: 1.5,
                        textAlign: 'center',
                        position: 'relative',
                        '&:before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: 'success.main',
                          borderRadius: '2px 2px 0 0'
                        }
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                          ตำแหน่ง
                        </Typography>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 700,
                          color: 'success.main',
                          fontSize: '0.95rem',
                          mt: 0.5
                        }}>
                          {position.position || 'ไม่ระบุ'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Position Number */}
                    {position.positionNumber && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: 1,
                        py: 0.5
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          เลขตำแหน่ง
                        </Typography>
                        <Chip
                          label={position.positionNumber}
                          size="small"
                          color="info"
                          variant="filled"
                          sx={{ 
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      </Box>
                    )}

                    {/* Status Badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}>
                      <Chip
                        icon={<AssignmentIcon fontSize="small" />}
                        label="ตำแหน่งว่าง"
                        color="warning"
                        variant="filled"
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          px: 1,
                          boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)'
                        }}
                      />
                    </Box>
                  </Stack>
                </CardContent>
                
                <CardActions sx={{ 
                  p: 2.5, 
                  pt: 0,
                  backgroundColor: 'grey.25'
                }}>
                  <Button
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewApplicants(position)}
                    variant="contained"
                    fullWidth
                    sx={{ 
                      py: 1.2,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      textTransform: 'none',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    ดูรายการผู้สมัคร
                  </Button>
                </CardActions>
              </Card>
              ))}
          </Box>
        )}

        {/* แสดงข้อความแนะนำเมื่อยังไม่มีการ filter */}
        {!loading && vacantPositions.length === 0 && filters.unit === 'all' && filters.posCode === 'all' && !filters.search && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              กรุณาเลือกหน่วยหรือรหัสตำแหน่งเพื่อแสดงตำแหน่งที่ว่าง
            </Typography>
          </Alert>
        )}

        {/* แสดงข้อความเมื่อไม่พบข้อมูลตามเงื่อนไข */}
        {!loading && vacantPositions.length === 0 && (filters.unit !== 'all' || filters.posCode !== 'all' || filters.search) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            ไม่พบตำแหน่งที่ว่างตามเงื่อนไขที่กำหนด
          </Alert>
        )}

        {/* Dialog แสดงรายการผู้ยื่นขอ */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AccountBoxIcon fontSize="small" />
              <Box>
                <Typography variant="subtitle1">
                  ผู้ยื่นขอตำแหน่ง: {selectedPosition?.posCodeName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  หน่วย: {selectedPosition?.unit} | ตำแหน่ง: {selectedPosition?.position}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 0 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : applicants.length === 0 ? (
              <Alert severity="info" sx={{ py: 1 }}>
                ไม่มีผู้ยื่นขอตำแหน่งนี้
              </Alert>
            ) : (
              <>
                <Typography variant="body2" gutterBottom color="text.secondary">
                  รายการผู้ยื่นขอตำแหน่งนี้ (เรียงตามลำดับ): {applicants.length} คน
                </Typography>
                <List dense>
                  {applicants.map((applicant, index) => (
                    <React.Fragment key={applicant.id}>
                      <ListItem sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Chip 
                                label={`อันดับ ${applicant.displayOrder || index + 1}`} 
                                size="small" 
                                color="primary"
                              />
                              <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                {applicant.fullName}
                              </Box>
                              <Chip 
                                label={applicant.rank} 
                                size="small" 
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <strong>ตำแหน่งปัจจุบัน:</strong> {applicant.position} | {applicant.unit}
                              {applicant.nominator && (
                                <>
                                  <br />
                                  <strong>ผู้เสนอ:</strong> {applicant.nominator}
                                </>
                              )}
                              {applicant.notes && (
                                <>
                                  <br />
                                  <strong>หมายเหตุ:</strong> {applicant.notes}
                                </>
                              )}
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ArrowIcon fontSize="small" />}
                            onClick={() => handleAssignPosition(applicant, selectedPosition!)}
                            disabled={loading}
                            color="success"
                            sx={{ minWidth: 100, py: 0.5, fontSize: '0.75rem' }}
                          >
                            จับคู่
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < applicants.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDialogOpen(false)} size="small">
              ปิด
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog ยืนยันการจับคู่ */}
        <Dialog 
          open={assignDialogOpen} 
          onClose={() => setAssignDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckIcon color="success" fontSize="small" />
              <Typography variant="subtitle1">
                ยืนยันการจับคู่ตำแหน่ง
              </Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 1 }}>
            {selectedApplicant && selectedVacantSlot && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ py: 1 }}>
                  <Box component="div">
                    <Box component="div" sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>
                      การจับคู่ที่จะดำเนินการ:
                    </Box>
                    <Box component="div" sx={{ fontSize: '0.8rem', mb: 1 }}>
                      <strong>👤 ผู้ย้าย:</strong> {selectedApplicant.fullName}
                      <br />
                      <strong>📍 จาก:</strong> {selectedApplicant.position} | {selectedApplicant.unit}
                      <br />
                      <strong>🎯 ไป:</strong> {selectedVacantSlot.position} | {selectedVacantSlot.unit}
                      {selectedVacantSlot.positionNumber && (
                        <>
                          <br />
                          <strong>🏷️ เลขตำแหน่ง:</strong> {selectedVacantSlot.positionNumber}
                        </>
                      )}
                    </Box>
                  </Box>
                </Alert>
                
                <TextField
                  label="หมายเหตุ (ไม่บังคับ)"
                  multiline
                  rows={2}
                  size="small"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  fullWidth
                  placeholder="เพิ่มหมายเหตุ..."
                />
              </Stack>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button 
              onClick={() => setAssignDialogOpen(false)}
              disabled={loading}
              size="small"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmAssignment}
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
              disabled={loading}
              size="small"
            >
              ยืนยัน
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}