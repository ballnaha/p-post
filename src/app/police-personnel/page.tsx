'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Divider,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
  CloudUpload as ImportIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  School as EducationIcon,
  WorkHistory as ServiceIcon,
  MilitaryTech as RankIcon,
  Assignment as PositionIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useTheme, useMediaQuery } from '@mui/material';
import DataTablePagination from '@/components/DataTablePagination';
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
  createdBy?: string;
  updatedBy?: string;
}

export default function PolicePersonnelPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  const [data, setData] = useState<PolicePersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [positionFilter, setPositionFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [units, setUnits] = useState<string[]>([]);
  const [ranks, setRanks] = useState<string[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PolicePersonnel | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ดึงรายการหน่วยและยศทั้งหมด
  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/police-personnel/units');
      const result = await response.json();
      if (result.success) {
        setUnits(result.data);
      }
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchRanks = async () => {
    try {
      const response = await fetch('/api/police-personnel/ranks');
      const result = await response.json();
      if (result.success) {
        setRanks(result.data);
      }
    } catch (err) {
      console.error('Error fetching ranks:', err);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchRanks();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/police-personnel?page=${page + 1}&limit=${rowsPerPage}&search=${search}&position=${positionFilter}&unit=${unitFilter}&rank=${rankFilter}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTotal(result.pagination.total);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, positionFilter, unitFilter, rankFilter]);

  const handleSearch = () => {
    setPage(0);
    fetchData();
  };

  const handleViewDetail = (personnel: PolicePersonnel) => {
    setSelectedPersonnel(personnel);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedPersonnel(null);
  };

  const handleEdit = (personnel: PolicePersonnel) => {
    setSelectedPersonnel(personnel);
    setEditFormData({
      fullName: personnel.fullName || '',
      rank: personnel.rank || '',
      position: personnel.position || '',
      positionNumber: personnel.positionNumber || '',
      unit: personnel.unit || '',
      nationalId: personnel.nationalId || '',
      age: personnel.age || '',
      education: personnel.education || '',
      seniority: personnel.seniority || '',
      actingAs: personnel.actingAs || '',
      birthDate: personnel.birthDate || '',
      lastAppointment: personnel.lastAppointment || '',
      currentRankSince: personnel.currentRankSince || '',
      enrollmentDate: personnel.enrollmentDate || '',
      retirementDate: personnel.retirementDate || '',
      yearsOfService: personnel.yearsOfService || '',
      trainingLocation: personnel.trainingLocation || '',
      trainingCourse: personnel.trainingCourse || '',
      notes: personnel.notes || '',
    });
    setEditModalOpen(true);
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setSelectedPersonnel(null);
    setEditFormData({});
  };

  const handleEditSave = async () => {
    if (!selectedPersonnel) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/police-personnel/${selectedPersonnel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('แก้ไขข้อมูลสำเร็จ');
        handleEditClose();
        fetchData();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (personnel: PolicePersonnel) => {
    setSelectedPersonnel(personnel);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPersonnel) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/police-personnel/${selectedPersonnel.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('ลบข้อมูลสำเร็จ');
        setDeleteConfirmOpen(false);
        setSelectedPersonnel(null);
        fetchData();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setSelectedPersonnel(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    
    // ถ้าเป็นรูปแบบวันที่ไทยอยู่แล้ว (DD/MM/YYYY) ให้ return เลย
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // ตรวจสอบว่าเป็นรูปแบบ DD/MM/YYYY หรือไม่
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        
        // ถ้าปีเป็น พ.ศ. (มากกว่า 2500) ให้ return เลย
        if (parseInt(year) > 2500) {
          return `${day}/${month}/${year}`;
        }
        
        // ถ้าปีเป็น ค.ศ. ให้แปลงเป็น พ.ศ.
        if (parseInt(year) > 1900 && parseInt(year) < 2100) {
          const thaiYear = parseInt(year) + 543;
          return `${day}/${month}/${thaiYear}`;
        }
      }
      
      // ถ้าเป็นรูปแบบอื่นที่มี / ให้ return เลย
      return dateString;
    }
    
    // ถ้าเป็น ISO date string หรือ timestamp
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
        return `${day}/${month}/${year}`;
      }
    } catch (error) {
      // ถ้าแปลงไม่ได้ ให้ return ค่าเดิม
      return dateString;
    }
    
    return dateString;
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'table' | 'card' | null,
  ) => {
    if (newMode !== null && !isMobile) {
      setViewMode(newMode);
    }
  };

  // Force card view on mobile
  useEffect(() => {
    if (isMobile && viewMode !== 'card') {
      setViewMode('card');
    }
  }, [isMobile]);

  // Render Card View
  const renderCardView = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              กำลังโหลดข้อมูล...
            </Typography>
          </Box>
        </Box>
      );
    }

    if (data.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            ไม่พบข้อมูล
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => router.push('/police-personnel/import')}
          >
            นำเข้าข้อมูล
          </Button>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 3,
        }}
      >
        {data.map((person, index) => (
          <Card
            key={person.id}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                
                boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
              },
            }}
          >
              <CardContent sx={{ flexGrow: 1, pb: 2 }}>
                {/* Status Badge */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BadgeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {person.positionNumber || 'ไม่ระบุเลขตำแหน่ง'}
                    </Typography>
                  </Box>
                  {person.rank ? (
                    <Chip
                      label="มีผู้ดำรง"
                      color="success"
                      size="small"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    />
                  ) : (
                    <Chip
                      label="ว่าง"
                      color="default"
                      size="small"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>

                {/* Line 1: ยศ ชื่อ-สกุล */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <PersonIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.3 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.125rem',
                      lineHeight: 1.4,
                      color: person.rank ? 'text.primary' : 'text.secondary',
                      flex: 1,
                    }}
                  >
                    {person.rank ? (
                      <>
                        {person.rank && `${person.rank} `}
                        {person.fullName}
                      </>
                    ) : (
                      'ตำแหน่งว่าง'
                    )}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                {/* Line 2: ตำแหน่ง */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                  <PositionIcon sx={{ fontSize: 18, color: 'primary.main', mt: 0.2 }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      color: 'primary.main',
                      lineHeight: 1.6,
                      flex: 1,
                    }}
                  >
                    {person.position || '-'}
                  </Typography>
                </Box>

                {/* Line 3: คุณวุฒิ/อายุ/จำนวนปี/นรต. */}
                {person.rank && (person.education || person.age || person.yearsOfService || person.trainingCourse) && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    
                    {/* คุณวุฒิ */}
                    {person.education && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EducationIcon sx={{ fontSize: 16, color: 'info.main' }} />
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary',
                            lineHeight: 1.6,
                          }}
                        >
                          {person.education}
                        </Typography>
                      </Box>
                    )}

                    {/* อายุ / จำนวนปี / นรต. */}
                    {(person.age || person.yearsOfService || person.trainingCourse) && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {person.age && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ServiceIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.secondary',
                                lineHeight: 1.6,
                              }}
                            >
                              อายุ {person.age}
                            </Typography>
                          </Box>
                        )}
                        {person.yearsOfService && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ServiceIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.secondary',
                                lineHeight: 1.6,
                              }}
                            >
                              จำนวนปี {person.yearsOfService}
                            </Typography>
                          </Box>
                        )}
                        {person.trainingCourse && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EducationIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.secondary',
                                lineHeight: 1.6,
                              }}
                            >
                              นรต.{person.trainingCourse}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {/* ทำหน้าที่ และ หน่วย */}
                {(person.actingAs || person.unit) && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    {person.actingAs && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: person.unit ? 0.5 : 0 }}>
                        ทำหน้าที่: {person.actingAs}
                      </Typography>
                    )}
                    {person.unit && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        หน่วย: {person.unit}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  variant="outlined"
                  onClick={() => handleViewDetail(person)}
                  sx={{
                    flex: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  ดู
                </Button>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  variant="outlined"
                  color="warning"
                  onClick={() => handleEdit(person)}
                  sx={{
                    flex: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  แก้ไข
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(person)}
                  sx={{
                    border: 1,
                    borderColor: 'error.main',
                    borderRadius: 2,
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
        ))}
      </Box>
    );
  };

  return (
    <Layout>
      <Box sx={{         
        mx: 'auto',
        width: '100%',
        // ป้องกันปัญหา overflow ใน mobile
        overflow: 'visible',
      }}>
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
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Police Personnel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                จัดการข้อมูลบุคลากรตำรวจ
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              alignItems: 'center',
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
            }}>
              {/* View Mode Toggle - hidden on mobile */}
              {!isMobile && (
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  size="small"
                  aria-label="view mode"
                >
                  <ToggleButton value="table" aria-label="table view">
                    <Tooltip title="มุมมองตาราง">
                      <ViewListIcon />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="card" aria-label="card view">
                    <Tooltip title="มุมมองการ์ด">
                      <ViewModuleIcon />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              )}

              <Button
                variant="contained"
                startIcon={<ImportIcon />}
                onClick={() => router.push('/police-personnel/import')}
                sx={{ 
                  minWidth: { xs: 'auto', sm: 140 },
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>นำเข้าข้อมูล</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>นำเข้า</Box>
              </Button>
            </Box>
          </Box>

          {/* Search and Filter */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="ค้นหาด้วย ชื่อ, ตำแหน่ง, เลขบัตร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>สถานะตำแหน่ง</InputLabel>
              <Select
                value={positionFilter}
                label="สถานะตำแหน่ง"
                onChange={(e) => setPositionFilter(e.target.value as 'all' | 'occupied' | 'vacant')}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="occupied">มีผู้ดำรง</MenuItem>
                <MenuItem value="vacant">ตำแหน่งว่าง</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              size="small"
              options={['ทั้งหมด', ...units]}
              value={unitFilter === 'all' ? 'ทั้งหมด' : unitFilter}
              onChange={(event, newValue) => {
                setUnitFilter(newValue === 'ทั้งหมด' ? 'all' : newValue || 'all');
              }}
              sx={{ minWidth: 200 }}
              renderInput={(params) => <TextField {...params} label="หน่วย" />}
            />

            <Autocomplete
              size="small"
              options={['ทั้งหมด', ...ranks]}
              value={rankFilter === 'all' ? 'ทั้งหมด' : rankFilter}
              onChange={(event, newValue) => {
                setRankFilter(newValue === 'ทั้งหมด' ? 'all' : newValue || 'all');
              }}
              sx={{ minWidth: 200 }}
              renderInput={(params) => <TextField {...params} label="ยศ" />}
            />

            <Button variant="contained" onClick={handleSearch} sx={{ minWidth: 100 }}>
              ค้นหา
            </Button>
            <Tooltip title="รีเฟรช">
              <IconButton onClick={fetchData} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Data Display - Table or Card View */}
        <Paper sx={{ p: (isMobile || viewMode === 'card') ? 3 : 0 }}>
          {(isMobile ? 'card' : viewMode) === 'table' ? (
            <>
              <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ลำดับ</TableCell>
                  <TableCell>เลขตำแหน่ง</TableCell>
                  <TableCell>ตำแหน่ง</TableCell>
                  <TableCell>ยศ</TableCell>
                  <TableCell>ชื่อ-สกุล</TableCell>
                  <TableCell>หน่วย</TableCell>
                  <TableCell>อายุ</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        กำลังโหลดข้อมูล...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        ไม่พบข้อมูล
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<ImportIcon />}
                        onClick={() => router.push('/police-personnel/import')}
                        sx={{ mt: 2 }}
                      >
                        นำเข้าข้อมูล
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, index) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>{row.positionNumber || '-'}</TableCell>
                      <TableCell>{row.position || '-'}</TableCell>
                      <TableCell>{row.rank || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.fullName || '-'}
                        </Typography>
                        {row.nationalId && (
                          <Typography variant="caption" color="text.secondary">
                            {row.nationalId}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{row.unit || '-'}</TableCell>
                      <TableCell>{row.age || '-'}</TableCell>
                      <TableCell>
                        {row.rank ? (
                          <Chip label="มีผู้ดำรง" color="success" size="small" />
                        ) : (
                          <Chip label="ตำแหน่งว่าง" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="ดูรายละเอียด">
                            <IconButton size="small" color="primary" onClick={() => handleViewDetail(row)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="แก้ไข">
                            <IconButton size="small" color="warning" onClick={() => handleEdit(row)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ลบ">
                            <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <DataTablePagination
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(newPage) => setPage(newPage)}
            onRowsPerPageChange={(newRowsPerPage) => {
              setRowsPerPage(newRowsPerPage);
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            variant="minimal"
            disabled={loading}
          />
            </>
          ) : (
            <>
              {renderCardView()}
              <DataTablePagination
                count={total}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(newPage) => setPage(newPage)}
                onRowsPerPageChange={(newRowsPerPage) => {
                  setRowsPerPage(newRowsPerPage);
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                variant="minimal"
                disabled={loading}
              />
            </>
          )}
        </Paper>

        {/* Detail Modal */}
        <Dialog 
          open={detailModalOpen} 
          onClose={handleCloseDetailModal} 
          maxWidth="lg" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 2
          }}>
            <PersonIcon />
            รายละเอียดบุคลากร
            {selectedPersonnel && (
              <Chip 
                label={selectedPersonnel.rank ? 'มีผู้ดำรง' : 'ตำแหน่งว่าง'} 
                color={selectedPersonnel.rank ? 'success' : 'default'} 
                size="small" 
                sx={{ ml: 'auto' }}
              />
            )}
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            {selectedPersonnel && (
              <Box>
                {/* Header Section - ชื่อและตำแหน่ง */}
                <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {selectedPersonnel.rank || null} {selectedPersonnel.fullName || 'ตำแหน่งว่าง'}
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    {selectedPersonnel.position} • {selectedPersonnel.unit || '-'}
                  </Typography>
                </Box>

                {/* Content Sections */}
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2.5 }}>
                    
                    {/* Left Column */}
                    <Box>
                      {/* ข้อมูลตำแหน่ง */}
                      <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BadgeIcon />
                          ข้อมูลตำแหน่ง
                        </Typography>
                        <Stack spacing={1.5}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">ID</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedPersonnel.noId || '-'}</Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">เลขตำแหน่ง</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedPersonnel.positionNumber || '-'}</Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">ทำหน้าที่</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedPersonnel.actingAs || '-'}</Typography>
                          </Box>
                        </Stack>
                      </Paper>

                      {/* ข้อมูลบุคคล */}
                      {selectedPersonnel.rank && (
                        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, bgcolor: 'success.50', borderRadius: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main', mb: 2, mt:2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon />
                            ข้อมูลบุคคล
                          </Typography>
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">ชื่อ-สกุล</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedPersonnel.fullName || '-'}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">ยศ</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedPersonnel.rank || '-'}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">อาวุโส</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedPersonnel.seniority || '-'}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">อายุ</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedPersonnel.age ? `${selectedPersonnel.age}` : '-'}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">วันเกิด</Typography>
                              <Typography variant="body2" fontWeight={600}>{formatDate(selectedPersonnel.birthDate)}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">เลขบัตรประชาชน</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{selectedPersonnel.nationalId || '-'}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">คุณวุฒิ</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedPersonnel.education || '-'}</Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      )}
                    </Box>

                    {/* Right Column */}
                    <Box>
                      {/* ข้อมูลการแต่งตั้ง */}
                      {selectedPersonnel.rank && (
                        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, bgcolor: 'info.50', borderRadius: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'info.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon />
                            ข้อมูลการแต่งตั้ง
                          </Typography>
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">แต่งตั้งครั้งสุดท้าย</Typography>
                              <Typography variant="body2" fontWeight={600}>{formatDate(selectedPersonnel.lastAppointment)}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">ระดับนี้เมื่อ</Typography>
                              <Typography variant="body2" fontWeight={600}>{formatDate(selectedPersonnel.currentRankSince)}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">บรรจุ</Typography>
                              <Typography variant="body2" fontWeight={600}>{formatDate(selectedPersonnel.enrollmentDate)}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">เกษียณ</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedPersonnel.retirementDate || '-'}</Typography>
                            </Box>
                            <Divider />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2" color="text.secondary">จำนวนปี</Typography>
                              <Typography variant="body2" fontWeight={700} color="info.main">{selectedPersonnel.yearsOfService ? `${selectedPersonnel.yearsOfService} ปี` : '-'}</Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      )}

                      {/* ข้อมูลการฝึกอบรม */}
                      {(selectedPersonnel.trainingLocation || selectedPersonnel.trainingCourse) && (
                        <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, bgcolor: 'warning.50', borderRadius: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'warning.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EducationIcon />
                            ข้อมูลการฝึกอบรม
                          </Typography>
                          <Stack spacing={1.5}>
                            {selectedPersonnel.trainingLocation && (
                              <>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary">สถานที่ฝึกอบรม (ตท.)</Typography>
                                  <Typography variant="body2" fontWeight={600}>{selectedPersonnel.trainingLocation}</Typography>
                                </Box>
                                <Divider />
                              </>
                            )}
                            {selectedPersonnel.trainingCourse && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">หลักสูตร (นรต.)</Typography>
                                <Typography variant="body2" fontWeight={600}>{selectedPersonnel.trainingCourse}</Typography>
                              </Box>
                            )}
                          </Stack>
                        </Paper>
                      )}
                    </Box>
                  </Box>

                  {/* หมายเหตุ - Full Width */}
                  {selectedPersonnel.notes && (
                    <Paper elevation={0} sx={{ p: 2.5, bgcolor: 'grey.100', borderRadius: 1 , border:1,px:3, borderColor:'grey.300'}}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
                        หมายเหตุ
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
                        {selectedPersonnel.notes}
                      </Typography>
                    </Paper>
                  )}
                  
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 2.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleCloseDetailModal} variant="contained" size="large" sx={{ minWidth: 120, fontWeight: 600 }}>
              ปิด
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog 
          open={editModalOpen} 
          onClose={handleEditClose} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
            แก้ไขข้อมูลบุคลากร
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={3}>
              {/* ข้อมูลบุคคล */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="primary" mb={2} mt={2}>
                  ข้อมูลบุคคล
                </Typography>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="ยศ"
                      value={editFormData.rank || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, rank: e.target.value })}
                      size="small"
                      
                    />
                    <TextField
                      fullWidth
                      label="ชื่อ-สกุล"
                      value={editFormData.fullName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="เลขบัตรประชาชน"
                      value={editFormData.nationalId || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nationalId: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="อายุ"
                      value={editFormData.age || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="อาวุโส"
                      value={editFormData.seniority || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, seniority: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="คุณวุฒิ"
                      value={editFormData.education || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, education: e.target.value })}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* ข้อมูลตำแหน่ง */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="primary" mb={2}>
                  ข้อมูลตำแหน่ง
                </Typography>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="ตำแหน่ง"
                      value={editFormData.position || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="เลขตำแหน่ง"
                      value={editFormData.positionNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, positionNumber: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="หน่วย"
                      value={editFormData.unit || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ทำหน้าที่"
                      value={editFormData.actingAs || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, actingAs: e.target.value })}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* ข้อมูลวันที่ */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="primary" mb={2}>
                  ข้อมูลวันที่
                </Typography>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="วันเกิด"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.birthDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="แต่งตั้งครั้งสุดท้าย"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.lastAppointment || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, lastAppointment: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="ระดับนี้เมื่อ"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.currentRankSince || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, currentRankSince: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="บรรจุ"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.enrollmentDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, enrollmentDate: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="เกษียณ"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.retirementDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, retirementDate: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="จำนวนปี"
                      value={editFormData.yearsOfService || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, yearsOfService: e.target.value })}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* ข้อมูลการฝึกอบรม */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="primary" mb={2}>
                  ข้อมูลการฝึกอบรม
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label="สถานที่ฝึกอบรม (ตท.)"
                    value={editFormData.trainingLocation || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, trainingLocation: e.target.value })}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="หลักสูตร (นรต.)"
                    value={editFormData.trainingCourse || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, trainingCourse: e.target.value })}
                    size="small"
                  />
                </Stack>
              </Box>

              {/* หมายเหตุ */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="หมายเหตุ"
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                size="small"
              />
            </Stack>
          </DialogContent>
          
          <DialogActions sx={{ p: 2.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleEditClose} variant="outlined" size="large" disabled={isSaving}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleEditSave} 
              variant="contained" 
              size="large" 
              sx={{ minWidth: 120 }}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
          <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
          <DialogContent>
            <Typography>
              ต้องการลบข้อมูล "{selectedPersonnel?.fullName || selectedPersonnel?.position}" ใช่หรือไม่?
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              การลบข้อมูลนี้ไม่สามารถย้อนกลับได้
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleDeleteCancel} variant="outlined" disabled={isDeleting}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              variant="contained" 
              color="error"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isDeleting ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
