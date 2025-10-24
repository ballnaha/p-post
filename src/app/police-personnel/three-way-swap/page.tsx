'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Autocomplete,
  TextField,
  Skeleton,
  Fade,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Stack,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChangeHistory as ThreeWayIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  CalendarToday as CalendarIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import DataTablePagination from '@/components/DataTablePagination';

interface ThreeWaySwapDetail {
  id: string;
  personnelId: string;
  fullName: string;
  rank?: string;
  nationalId?: string;
  posCodeId?: number;
  posCodeMaster?: {
    id: number;
    name: string;
  };
  fromPosition?: string;
  fromPositionNumber?: string;
  fromUnit?: string;
  toPosition?: string;
  toPositionNumber?: string;
  toUnit?: string;
  sequence: number;
}

interface ThreeWaySwapTransaction {
  id: string;
  groupNumber: string;
  groupName?: string;
  swapDate: string;
  status: string;
  notes?: string;
  year: number;
  createdAt: string;
  swapDetails: ThreeWaySwapDetail[];
}

interface PersonnelData {
  id: string;
  noId?: number;
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
  notes?: string;
}

export default function ThreeWaySwapPage() {
  const router = useRouter();
  const toast = useToast();

  // Data states
  const [data, setData] = useState<ThreeWaySwapTransaction[]>([]);
  const [filteredData, setFilteredData] = useState<ThreeWaySwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Year filter
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear() + 543);
  
  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<ThreeWaySwapTransaction | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Personnel detail modal
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [personnelDetail, setPersonnelDetail] = useState<PersonnelData | null>(null);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  
  // Filter states
  const [groupNameFilter, setGroupNameFilter] = useState<string | null>(null);
  const [groupNameOptions, setGroupNameOptions] = useState<string[]>([]);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  // Expanded rows for table view
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Generate available years
  const getAvailableYears = () => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];
    
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  };

  const availableYears = getAvailableYears();

  useEffect(() => {
    fetchData();
  }, [currentYear]);

  useEffect(() => {
    if (!loading) {
      applyFilters();
      updateFilterOptions();
    }
  }, [data, groupNameFilter, loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setData([]);
      setFilteredData([]);
      
      const response = await fetch(`/api/three-way-transactions?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data || []);
      setFilteredData(result.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...data];

    if (groupNameFilter) {
      filtered = filtered.filter(item => item.groupName === groupNameFilter);
    }

    setFilteredData(filtered);
    setPage(0);
  };

  const updateFilterOptions = () => {
    const groupNames = [...new Set(data.map(item => item.groupName).filter(Boolean))] as string[];
    setGroupNameOptions(groupNames);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    const newYear = event.target.value as number;
    setCurrentYear(newYear);
    setGroupNameFilter(null);
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: ThreeWaySwapTransaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handleEdit = () => {
    if (selectedTransaction) {
      router.push(`/police-personnel/three-way-swap/edit/${selectedTransaction.id}`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedTransaction) {
      setDeletingId(selectedTransaction.id);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/three-way-transactions/${deletingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      toast.success('ลบข้อมูลสำเร็จ');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast.error(error.message || 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleViewPersonnelDetail = async (personnelId: string) => {
    setSelectedPersonnelId(personnelId);
    setPersonnelModalOpen(true);
    setLoadingPersonnel(true);

    try {
      // ใช้ API swap-list/personnel แทน police-personnel เพราะข้อมูลอยู่ใน swap_list
      const response = await fetch(`/api/swap-list/personnel/${personnelId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch personnel');
      }
      const result = await response.json();
      setPersonnelDetail(result.data);
    } catch (error: any) {
      console.error('Error fetching personnel:', error);
      toast.error(error.message || 'ไม่สามารถโหลดข้อมูลบุคลากรได้');
      setPersonnelDetail(null);
      // ปิด modal ถ้าไม่มีข้อมูล
      setPersonnelModalOpen(false);
    } finally {
      setLoadingPersonnel(false);
    }
  };

  const handleClosePersonnelModal = () => {
    setPersonnelModalOpen(false);
  };

  const handleClearPersonnelData = () => {
    setSelectedPersonnelId(null);
    setPersonnelDetail(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'เสร็จสมบูรณ์';
      case 'pending': return 'รอดำเนินการ';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
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
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                  การสลับตำแหน่งสามเส้า
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  จัดการและตรวจสอบรายการสลับตำแหน่งแบบสามเส้า (3 คน)
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* View Mode Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(event, newValue) => {
                  if (newValue !== null) {
                    setViewMode(newValue);
                  }
                }}
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
              <Button
                variant="contained"
                color="warning"
                startIcon={<AddIcon />}
                onClick={() => router.push('/police-personnel/three-way-swap/add')}
                size="large"
              >
                เพิ่มการสลับสามเส้า
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, 
            gap: 2,
            alignItems: 'start'
          }}>
            <FormControl size="small">
              <InputLabel id="year-filter-label">ปีที่สลับตำแหน่ง</InputLabel>
              <Select
                labelId="year-filter-label"
                id="year-filter"
                value={currentYear}
                label="ปีที่สลับตำแหน่ง"
                onChange={handleYearChange}
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Autocomplete
                fullWidth
                options={groupNameOptions}
                value={groupNameFilter}
                onChange={(event, newValue) => setGroupNameFilter(newValue)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="ชื่อกลุ่ม" 
                    placeholder="ค้นหาชื่อกลุ่ม..."
                    size="small"
                  />
                )}
                noOptionsText="ไม่พบข้อมูล"
              />
              {groupNameFilter && (
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={() => setGroupNameFilter(null)}
                  startIcon={<RefreshIcon />}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  ล้างตัวกรอง
                </Button>
              )}
            </Box>
          </Box>

          
        </Paper>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Paper key={i} elevation={2} sx={{ p: 3 }}>
                {/* Card Header Skeleton */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="rounded" width={120} height={32} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="80%" height={32} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="60%" height={24} />
                  </Box>
                  <Skeleton variant="circular" width={40} height={40} />
                </Box>

                {/* Three-way Details Skeleton */}
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="text" width={180} height={24} sx={{ mb: 1.5 }} />
                  
                  {/* Three person cards */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2, 3].map((j) => (
                      <Box 
                        key={j}
                        sx={{ 
                          p: 2, 
                          bgcolor: 'grey.50', 
                          borderRadius: 1,
                          borderLeft: '3px solid',
                          borderLeftColor: j === 1 ? 'success.main' : j === 2 ? 'info.main' : 'warning.main'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="rounded" width={60} height={20} sx={{ mb: 0.5 }} />
                            <Skeleton variant="text" width="70%" height={24} sx={{ mb: 0.5 }} />
                            <Skeleton variant="rounded" width={100} height={20} />
                          </Box>
                          <Skeleton variant="circular" width={32} height={32} />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Skeleton variant="text" width="90%" height={20} />
                          <Skeleton variant="text" width="85%" height={20} />
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Cycle indicator skeleton */}
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Skeleton variant="rounded" width="100%" height={40} />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <Paper sx={{ p: 8, textAlign: 'center' }}>
                <ThreeWayIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  ไม่พบข้อมูลการสลับตำแหน่งสามเส้า
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {groupNameFilter 
                    ? 'ลองปรับเปลี่ยนตัวกรองหรือเพิ่มข้อมูลใหม่'
                    : `ยังไม่มีข้อมูลการสลับตำแหน่งสามเส้าในปี ${currentYear}`
                  }
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/police-personnel/three-way-swap/add')}
                >
                  เพิ่มการสลับสามเส้า
                </Button>
              </Paper>
            ) : (
              <>
                {viewMode === 'card' ? (
                  /* Card View */
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
                    {paginatedData.map((row) => (
                    <Paper key={row.id} elevation={2} sx={{ 
                      p: 3, 
                      position: 'relative',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        elevation: 4,
                        transform: 'translateY(-1px)',
                        boxShadow: 4
                      }
                    }}>
                      {/* Card Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Chip
                            icon={<ThreeWayIcon />}
                            label={row.groupNumber || '-'}
                            color="warning"
                            size="medium"
                            sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}
                          />
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.15rem' }}>
                            {row.groupName || 'ไม่ระบุชื่อกลุ่ม'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
                              <CalendarIcon sx={{ fontSize: 16 }} />
                              {formatDate(row.swapDate)}
                            </Typography>
                            
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, row)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      {/* Notes */}
                      {row.notes && (
                        <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                            <strong>หมายเหตุ:</strong> {row.notes}
                          </Typography>
                        </Alert>
                      )}

                      {/* Three-way Swap Details */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.95rem' }}>
                          <ThreeWayIcon fontSize="small" color="secondary" />
                          รายการสลับสามเส้า ({row.swapDetails.length} คน)
                        </Typography>
                        
                        {/* Check if exactly 3 people */}
                        {row.swapDetails.length !== 3 && (
                          <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                            <Typography variant="caption">
                              ⚠️ รายการสามเส้าควรมี 3 คน (ปัจจุบันมี {row.swapDetails.length} คน)
                            </Typography>
                          </Alert>
                        )}
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {row.swapDetails
                            .sort((a, b) => a.sequence - b.sequence)
                            .map((detail, index) => (
                            <Box 
                              key={detail.id}
                              sx={{ 
                                p: 2, 
                                bgcolor: 'grey.50', 
                                borderRadius: 1,
                                borderLeft: '3px solid',
                                borderLeftColor: index === 0 ? 'success.main' : index === 1 ? 'info.main' : 'warning.main'
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Chip 
                                      label={`คนที่ ${detail.sequence}`}
                                      size="small"
                                      color={index === 0 ? 'success' : index === 1 ? 'info' : 'warning'}
                                      sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
                                    />
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem', mb: 0.5 }}>
                                    {detail.rank} {detail.fullName}
                                  </Typography>
                                  {detail.posCodeMaster && (
                                    <Chip 
                                      label={`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  )}
                                </Box>
                                <Tooltip title="ดูรายละเอียดบุคลากร">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleViewPersonnelDetail(detail.personnelId)}
                                    sx={{ ml: 1 }}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                  <strong>จาก:</strong> {detail.fromPosition || '-'}
                                  {detail.fromPositionNumber && ` (${detail.fromPositionNumber})`}
                                  {detail.fromUnit && ` • ${detail.fromUnit}`}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.875rem' }}>
                                  <strong>→ ไป:</strong> {detail.toPosition || '-'}
                                  {detail.toPositionNumber && ` (${detail.toPositionNumber})`}
                                  {detail.toUnit && ` • ${detail.toUnit}`}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>

                      </Box>
                    </Paper>
                    ))}
                  </Box>
                ) : (
                  /* Table View */
                  <Paper elevation={2}>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'warning.main' }}>
                            <TableCell sx={{ color: 'white', width: 50, fontWeight: 600 }} />
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>เลขกลุ่ม</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ชื่อกลุ่ม</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>วันที่สลับ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600, width: 80 }} align="center">จัดการ</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedData.map((row) => (
                            <React.Fragment key={row.id}>
                              <TableRow 
                                hover 
                                sx={{ 
                                  '&:hover': { 
                                    bgcolor: 'action.hover',
                                    cursor: 'pointer'
                                  }
                                }}
                              >
                                <TableCell>
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleRow(row.id)}
                                    color="primary"
                                  >
                                    {expandedRows.has(row.id) ? <ArrowUpIcon /> : <ArrowDownIcon />}
                                  </IconButton>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={row.groupNumber || '-'}
                                    color="warning"
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontWeight: 600 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {row.groupName || '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    {formatDate(row.swapDate)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleMenuOpen(e, row)}
                                    color="default"
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            
                              {/* Expanded Detail Row */}
                              <TableRow>
                                <TableCell colSpan={5} sx={{ p: 0 }}>
                                  <Collapse in={expandedRows.has(row.id)} timeout="auto" unmountOnExit>
                                    <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ThreeWayIcon color="warning" />
                                        รายละเอียดการสลับตำแหน่งสามเส้า
                                      </Typography>
                                      
                                      {row.notes && (
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                          <strong>หมายเหตุ:</strong> {row.notes}
                                        </Alert>
                                      )}
                                      
                                      <TableContainer>
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow sx={{ bgcolor: 'white' }}>
                                              <TableCell>ลำดับ</TableCell>
                                              <TableCell>ชื่อ-สกุล</TableCell>
                                              <TableCell>ยศ</TableCell>
                                              <TableCell>POSCODE</TableCell>
                                              <TableCell>จากตำแหน่ง</TableCell>
                                              <TableCell>จากหน่วย</TableCell>
                                              <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>→ ไปตำแหน่ง</TableCell>
                                              <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>→ ไปหน่วย</TableCell>
                                              <TableCell align="center">ดูข้อมูล</TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {row.swapDetails
                                              .sort((a, b) => a.sequence - b.sequence)
                                              .map((detail, index) => (
                                              <TableRow key={detail.id} sx={{ bgcolor: 'white' }}>
                                                <TableCell>
                                                  <Chip 
                                                    label={detail.sequence}
                                                    size="small"
                                                    color={index === 0 ? 'success' : index === 1 ? 'info' : 'warning'}
                                                    sx={{ fontWeight: 600, minWidth: 40 }}
                                                  />
                                                </TableCell>
                                                <TableCell><strong>{detail.fullName}</strong></TableCell>
                                                <TableCell>{detail.rank || '-'}</TableCell>
                                                <TableCell>
                                                  {detail.posCodeMaster ? (
                                                    <Chip 
                                                      label={`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`}
                                                      size="small"
                                                      color="primary"
                                                      variant="outlined"
                                                      sx={{ fontSize: '0.75rem' }}
                                                    />
                                                  ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                  {detail.fromPosition || '-'}
                                                  {detail.fromPositionNumber && ` (${detail.fromPositionNumber})`}
                                                </TableCell>
                                                <TableCell>{detail.fromUnit || '-'}</TableCell>
                                                <TableCell sx={{ bgcolor: 'success.50' }}>
                                                  <strong>{detail.toPosition || '-'}</strong>
                                                  {detail.toPositionNumber && ` (${detail.toPositionNumber})`}
                                                </TableCell>
                                                <TableCell sx={{ bgcolor: 'success.50' }}>
                                                  <strong>{detail.toUnit || '-'}</strong>
                                                </TableCell>
                                                <TableCell align="center">
                                                  <Tooltip title="ดูรายละเอียดบุคลากร">
                                                    <IconButton
                                                      size="small"
                                                      color="primary"
                                                      onClick={() => handleViewPersonnelDetail(detail.personnelId)}
                                                    >
                                                      <ViewIcon fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
          
                    {/* Pagination for Table View */}
                    {filteredData.length > 0 && (
                      <DataTablePagination
                        count={filteredData.length}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50, 100]}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        variant="minimal"
                      />
                    )}
                  </Paper>
                )}
              
                {/* Pagination for Card View */}
                {viewMode === 'card' && filteredData.length > 0 && (
                  <Paper sx={{ mt: 3 }}>
                    <DataTablePagination
                      count={filteredData.length}
                      page={page}
                      rowsPerPage={rowsPerPage}
                      rowsPerPageOptions={[6, 12, 24]}
                      onPageChange={handlePageChange}
                      onRowsPerPageChange={handleRowsPerPageChange}
                      variant="minimal"
                    />
                  </Paper>
                )}
              </>
            )}
          </>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>แก้ไข</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDeleteClick}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>ลบ</ListItemText>
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>ยืนยันการลบ</DialogTitle>
          <DialogContent>
            <Typography>
              คุณแน่ใจหรือไม่ที่จะลบรายการสลับตำแหน่งสามเส้านี้?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              ลบ
            </Button>
          </DialogActions>
        </Dialog>

        {/* Personnel Detail Modal */}
        <PersonnelDetailModal
          open={personnelModalOpen}
          onClose={handleClosePersonnelModal}
          onClearData={handleClearPersonnelData}
          personnel={personnelDetail}
          loading={loadingPersonnel}
          title="รายละเอียดบุคลากร"
        />
      </Box>
    </Layout>
  );
}
