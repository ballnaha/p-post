'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Collapse,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapHoriz as SwapHorizIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  CheckCircle as CheckIcon,
  CalendarToday as CalendarIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  School as EducationIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import DataTablePagination from '@/components/DataTablePagination';
import { EmptyState } from '@/app/components/EmptyState';

interface PolicePersonnel {
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

interface SwapDetail {
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
  notes?: string;
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

export default function SwapListPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SwapTransaction[]>([]);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear() + 543);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SwapTransaction | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<SwapTransaction | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  
  // Personnel detail modal states
  const [personnelDetailModalOpen, setPersonnelDetailModalOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PolicePersonnel | null>(null);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  
  // Filter states
  const [groupNameFilter, setGroupNameFilter] = useState<string | null>(null);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12); // Default for card view

  // Generate available years (from 2568 to current year)
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

  // Memoized filter options - only recalculate when data changes
  const groupNameOptions = useMemo(() => {
    const names = Array.from(new Set(data.map(item => item.groupName).filter(Boolean))) as string[];
    return names.sort();
  }, [data]);

  // Memoized filtered data - only recalculate when dependencies change
  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (groupNameFilter) {
      filtered = filtered.filter(item => item.groupName === groupNameFilter);
    }

    return filtered;
  }, [data, groupNameFilter]);

  // Memoized paginated data
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredData, page, rowsPerPage]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Clear data immediately when starting to load
      setData([]);
      
      // Filter by swapType=two-way to get only two-way swap transactions
      const response = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=two-way`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [currentYear, toast]);

  useEffect(() => {
    fetchData();
  }, [currentYear]); // ✅ เปลี่ยนเป็น currentYear แทน fetchData

  const handleResetFilters = useCallback(() => {
    setGroupNameFilter(null);
    setPage(0); // Reset to first page when filters are reset
  }, []);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, item: SwapTransaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedItem(null);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedItem) {
      router.push(`/police-personnel/swap-list/edit/${selectedItem.id}`);
    }
    handleMenuClose();
  }, [selectedItem, router, handleMenuClose]);

  const handleDeleteClick = useCallback(() => {
    if (selectedItem) {
      setItemToDelete(selectedItem);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  }, [selectedItem, handleMenuClose]);

  const handleViewPersonnelDetail = useCallback(async (personnelId: string) => {
    try {
      setLoadingPersonnel(true);
      setPersonnelDetailModalOpen(true);
      
      // ดึงข้อมูลจาก swap_list แทน police_personnel
      const response = await fetch(`/api/swap-list/personnel/${personnelId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch personnel details');
      }

      const result = await response.json();
      setSelectedPersonnel(result.data);
    } catch (error: any) {
      console.error('Error fetching personnel details:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลบุคลากร');
      setPersonnelDetailModalOpen(false);
    } finally {
      setLoadingPersonnel(false);
    }
  }, []); // Removed toast from dependencies

  const handleClosePersonnelDetailModal = useCallback(() => {
    setPersonnelDetailModalOpen(false);
  }, []);

  const formatDate = (dateString?: string | null) => {
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

  const handleDeleteConfirm = useCallback(async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/swap-transactions/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete');
      }

      toast.success('ลบข้อมูลสำเร็จ');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, fetchData]); // Removed toast from dependencies

  const handleYearChange = useCallback((event: SelectChangeEvent<number>) => {
    setCurrentYear(Number(event.target.value));
    setPage(0); // Reset page when year changes
  }, []);

  const handleViewModeChange = useCallback((_event: React.MouseEvent<HTMLElement>, newMode: 'table' | 'card' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
      // Reset pagination when switching view mode
      setPage(0);
      // Set appropriate rowsPerPage for each view
      if (newMode === 'table') {
        setRowsPerPage(10);
      } else {
        setRowsPerPage(12);
      }
    }
  }, []);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const getSwapTypeLabel = (type: string) => {
    switch (type) {
      case 'two-way': return 'สลับ 2 คน';
      case 'three-way': return 'สามเส้า (3 คน)';
      case 'multi-way': return 'หลายคน';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'เสร็จสมบูรณ์';
      case 'pending': return 'รอดำเนินการ';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [groupNameFilter]);

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
                  ผลการสลับตำแหน่ง
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  จัดการและตรวจสอบรายการสลับตำแหน่งของบุคลากร
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* View Mode Toggle */}
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
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => router.push('/police-personnel/swap-list/add')}
                size="large"
              >
                เพิ่มรายการสลับตำแหน่ง
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
                  onClick={handleResetFilters}
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
                    <Skeleton variant="rounded" width={100} height={32} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="75%" height={32} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="50%" height={24} />
                  </Box>
                  <Skeleton variant="circular" width={40} height={40} />
                </Box>

                {/* Swap Details Skeleton */}
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="text" width={160} height={24} sx={{ mb: 1.5 }} />
                  
                  {/* Two person cards for swap */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2].map((j) => (
                      <Box 
                        key={j}
                        sx={{ 
                          p: 2, 
                          bgcolor: 'grey.50', 
                          borderRadius: 1,
                          borderLeft: '3px solid',
                          borderLeftColor: 'primary.main'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="65%" height={24} sx={{ mb: 0.5 }} />
                            <Skeleton variant="rounded" width={90} height={20} />
                          </Box>
                          <Skeleton variant="circular" width={32} height={32} />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Skeleton variant="text" width="88%" height={20} />
                          <Skeleton variant="text" width="82%" height={20} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <Fade in={!loading} timeout={800}>
                <Paper sx={{ borderRadius: 2 }}>
                  <EmptyState
                    icon={SwapHorizIcon}
                    title={groupNameFilter ? 'ไม่พบข้อมูลที่ตรงกับการกรอง' : 'ไม่พบข้อมูลการสลับตำแหน่ง'}
                    description={groupNameFilter 
                      ? 'ลองปรับเปลี่ยนตัวกรองหรือล้างตัวกรอง' 
                      : `ยังไม่มีรายการสลับตำแหน่งในปี ${currentYear}`
                    }
                    actionLabel={!groupNameFilter ? 'เพิ่มรายการสลับตำแหน่ง' : undefined}
                    onAction={!groupNameFilter ? () => router.push('/police-personnel/swap-list/add') : undefined}
                  />
                </Paper>
              </Fade>
            ) : (
              <>
                {/* Table View */}
                {viewMode === 'table' ? (
                  <Paper elevation={2}>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'primary.main' }}>
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
                            color="primary"
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
                              <CheckIcon color="success" />
                              รายละเอียดการสลับตำแหน่ง
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
                                  {row.swapDetails.map((detail) => (
                                    <TableRow key={detail.id} sx={{ bgcolor: 'white' }}>
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
                ) : (
                  /* Card View */
                  <>
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
                              label={row.groupNumber || '-'}
                              color="primary"
                              size="medium"
                              sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}
                            />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.15rem' }}>
                              {row.groupName || 'ไม่ระบุชื่อกลุ่ม'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
                              <CalendarIcon sx={{ fontSize: 16 }} />
                              {formatDate(row.swapDate)}
                            </Typography>
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

                        {/* Swap Details */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.95rem' }}>
                            <SwapHorizIcon fontSize="small" color="primary" />
                            รายการสลับตำแหน่ง ({row.swapDetails.length} คน)
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {row.swapDetails.map((detail, index) => (
                              <Box 
                                key={detail.id}
                                sx={{ 
                                  p: 2, 
                                  bgcolor: 'grey.50', 
                                  borderRadius: 1,
                                  borderLeft: '3px solid',
                                  borderLeftColor: 'primary.main'
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem', mb: 0.5 }}>
                                      {detail.rank} {detail.fullName}
                                    </Typography>
                                    {detail.posCodeMaster && (
                                      <Chip 
                                        label={`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`}
                                        size="small"
                                        color="primary"
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
                  
                    {/* Pagination for Card View */}
                    {filteredData.length > 0 && (
                      <Paper sx={{ mt: 3 }}>
                        <DataTablePagination
                          count={filteredData.length}
                          page={page}
                          rowsPerPage={rowsPerPage}
                          rowsPerPageOptions={[6, 12, 24, 48]}
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
              <EditIcon fontSize="small" color="primary" />
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
          onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        >
          <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              คุณต้องการลบรายการสลับตำแหน่ง กลุ่ม{' '}
              <strong>
                {itemToDelete && itemToDelete.groupName ? itemToDelete.groupName : '(ไม่ระบุชื่อกลุ่ม)'}
              </strong>{' '}
              ใช่หรือไม่?
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                ระบบจะตรวจสอบว่าบุคลากรในรายการนี้ได้ทำการสลับตำแหน่งในปีเดียวกันแล้วหรือไม่
              </Typography>
            </Alert>
            <Typography variant="body2" color="error">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isDeleting ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Personnel Detail Modal - Using Reusable Component */}
        <PersonnelDetailModal 
          open={personnelDetailModalOpen}
          onClose={handleClosePersonnelDetailModal}
          personnel={selectedPersonnel}
          loading={loadingPersonnel}
          onClearData={() => setSelectedPersonnel(null)}
        />
      </Box>
    </Layout>
  );
}
