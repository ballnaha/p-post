'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  InputAdornment,
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
  Clear as ClearIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import DataTablePagination from '@/components/DataTablePagination';
import { EmptyState } from '@/app/components/EmptyState';

interface ThreeWaySwapDetail {
  id: string;
  personnelId: string;
  noId?: number;
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
  fromActingAs?: string;
  toPosition?: string;
  toPositionNumber?: string;
  toUnit?: string;
  toActingAs?: string;
  sequence: number;
  // ข้อมูลส่วนตัว
  birthDate?: string | null;
  age?: string;
  education?: string | null;
  seniority?: string;
  // ข้อมูลการแต่งตั้ง
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  yearsOfService?: string;
  // ข้อมูลการฝึกอบรม
  trainingLocation?: string | null;
  trainingCourse?: string;
  notes?: string | null;
  // ข้อมูลการเสนอชื่อ
  supportName?: string;
  supportReason?: string;
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
  birthDate?: string | null;
  education?: string | null;
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  trainingLocation?: string | null;
  trainingCourse?: string;
  actingAs?: string;
  notes?: string | null;
  // ข้อมูลการเสนอชื่อ
  supporterName?: string;
  supportReason?: string;
}

// Optimized: Memoized skeleton component to prevent re-renders during loading
const CardSkeleton = React.memo(function CardSkeleton() {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
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
  );
});

export default function ThreeWaySwapPage() {
  const router = useRouter();
  const toast = useToast();

  // Data states
  const [data, setData] = useState<ThreeWaySwapTransaction[]>([]);
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ThreeWaySwapTransaction | null>(null);
  
  // Personnel detail modal
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [personnelDetail, setPersonnelDetail] = useState<PersonnelData | null>(null);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  
  // Search state - using simple text search
  const [searchText, setSearchText] = useState<string>('');
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12); // Default for card view

  // Expanded rows for table view
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Generate available years - Memoized for performance
  const availableYears = useMemo(() => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];
    
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
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

  // Memoized filtered data - only recalculate when dependencies change
  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(item => {
        // Search in group name, group number, swap date, and personnel names
        const gn = (item.groupName || '').toLowerCase();
        const gnum = (item.groupNumber || '').toLowerCase();
        const date = formatDate(item.swapDate).toLowerCase();
        const detailText = item.swapDetails?.map(d => `${d.fullName} ${d.fromUnit} ${d.toUnit}`).join(' ').toLowerCase() || '';
        
        return gn.includes(lower) || gnum.includes(lower) || date.includes(lower) || detailText.includes(lower);
      });
    }

    return filtered;
  }, [data, searchText]);

  // Memoized paginated data
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredData, page, rowsPerPage]);

  // Optimized: Memoized fetch function with useCallback
  // Fixed: Removed toast from dependencies to prevent infinite loop
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Clear data immediately when starting to load
      setData([]);
      
      const response = await fetch(`/api/three-way-transactions?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear]);

  const handleResetFilters = useCallback(() => {
    setSearchText('');
    setPage(0); // Reset to first page when filters are reset
  }, []);

  // Optimized: Memoized event handlers with useCallback
  const handleYearChange = useCallback((event: SelectChangeEvent<number>) => {
    const newYear = event.target.value as number;
    setCurrentYear(newYear);
    setPage(0);
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

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, transaction: ThreeWaySwapTransaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  }, []);

  // Optimized: Memoized edit handler with useCallback
  const handleEdit = useCallback(() => {
    if (selectedTransaction) {
      router.push(`/police-personnel/three-way-swap/edit/${selectedTransaction.id}`);
    }
    handleMenuClose();
  }, [selectedTransaction, router, handleMenuClose]);

  // Optimized: Memoized delete click handler with useCallback
  const handleDeleteClick = useCallback(() => {
    if (selectedTransaction) {
      setDeletingId(selectedTransaction.id);
      setItemToDelete(selectedTransaction);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  }, [selectedTransaction, handleMenuClose]);

  // Optimized: Memoized delete confirm handler with useCallback
  // Fixed: Removed toast from dependencies to prevent issues
  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/three-way-transactions/${deletingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // ถ้าเป็น error เกี่ยวกับข้อมูลที่เกี่ยวข้อง ให้แสดง error ที่ละเอียดขึ้น
        if (response.status === 400 && errorData.conflictPersonnel) {
          toast.error(errorData.error);
        } else {
          throw new Error(errorData.error || 'Failed to delete');
        }
        return;
      }

      toast.success('ลบข้อมูลการสลับตำแหน่งสามเส้าสำเร็จ');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast.error(error.message || 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
      setItemToDelete(null);
      setIsDeleting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletingId, fetchData]);

  // Optimized: Memoized personnel detail handler with useCallback
  // Fixed: Removed toast from dependencies to prevent issues
  const handleViewPersonnelDetail = useCallback(async (personnelId: string) => {
    if (!personnelId) return;
    try {
      setLoadingPersonnel(true);
      setPersonnelModalOpen(true);
      
      // ค้นหาข้อมูลจาก swap transaction details ที่บันทึกไว้
      // เพื่อให้แสดงข้อมูล ณ เวลานั้น ไม่ได้รับผลกระทบจากการ import ข้อมูลใหม่
      let personnelData: PersonnelData | null = null;
      
      for (const transaction of data) {
        const detail = transaction.swapDetails?.find(d => d.personnelId === personnelId);
        if (detail) {
          personnelData = {
            id: detail.personnelId || '',
            noId: detail.noId,
            fullName: detail.fullName,
            rank: detail.rank,
            nationalId: detail.nationalId,
            posCodeId: detail.posCodeId,
            posCodeMaster: detail.posCodeMaster,
            position: detail.fromPosition,
            positionNumber: detail.fromPositionNumber,
            unit: detail.fromUnit,
            actingAs: detail.fromActingAs,
            notes: detail.notes,
            // ข้อมูลส่วนตัวที่บันทึกไว้
            birthDate: detail.birthDate,
            age: detail.age,
            education: detail.education,
            lastAppointment: detail.lastAppointment,
            currentRankSince: detail.currentRankSince,
            enrollmentDate: detail.enrollmentDate,
            retirementDate: detail.retirementDate,
            yearsOfService: detail.yearsOfService,
            trainingLocation: detail.trainingLocation,
            trainingCourse: detail.trainingCourse,
            seniority: detail.seniority,
            // ข้อมูลการเสนอชื่อ
            supporterName: detail.supportName,
            supportReason: detail.supportReason,
          };
          break;
        }
      }
      
      if (personnelData) {
        setPersonnelDetail(personnelData);
      } else {
        toast.error('ไม่พบข้อมูลบุคลากร');
        setPersonnelModalOpen(false);
      }
    } catch (error: any) {
      console.error('Error loading personnel detail:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setPersonnelModalOpen(false);
    } finally {
      setLoadingPersonnel(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Optimized: Memoized modal handlers with useCallback
  const handleClosePersonnelModal = useCallback(() => {
    setPersonnelModalOpen(false);
  }, []);

  const handleClearPersonnelData = useCallback(() => {
    setSelectedPersonnelId(null);
    setPersonnelDetail(null);
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  }, []);

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'เสร็จสมบูรณ์';
      case 'pending': return 'รอดำเนินการ';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  }, []);

  // Optimized: Memoized toggle row handler with useCallback
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

  // Optimized: Memoized pagination handlers with useCallback
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  // Add effects after all functions are defined
  useEffect(() => {
    fetchData();
  }, [currentYear]); // ✅ เปลี่ยนเป็น currentYear แทน fetchData

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [searchText]);

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
                color="warning"
                startIcon={<AddIcon />}
                onClick={() => router.push('/police-personnel/three-way-swap/add')}
                size="medium"
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
              <TextField
                fullWidth
                label="ค้นหา"
                placeholder="ค้นหาชื่อกลุ่ม, หมายเลข, ชื่อบุคคล, หน่วยงาน..."
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: searchText && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchText('')}
                          edge="end"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {searchText && (
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
              <CardSkeleton key={i} />
            ))}
          </Box>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <Fade in={!loading} timeout={800}>
                <Paper sx={{ borderRadius: 2 }}>
                  <EmptyState
                    icon={ThreeWayIcon}
                    title={searchText ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ไม่พบข้อมูลการสลับตำแหน่งสามเส้า'}
                    description={searchText 
                      ? 'ลองปรับเปลี่ยนคำค้นหาหรือล้างตัวกรอง'
                      : `ยังไม่มีข้อมูลการสลับตำแหน่งสามเส้าในปี ${currentYear}`
                    }
                    actionLabel={!searchText ? 'เพิ่มการสลับสามเส้า' : undefined}
                    onAction={!searchText ? () => router.push('/police-personnel/three-way-swap/add') : undefined}
                  />
                </Paper>
              </Fade>
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
                                    {detail.rank || '-'} {detail.fullName || '-'}
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
                                              <TableCell>ยศ</TableCell>
                                              <TableCell>ชื่อ-สกุล</TableCell>
                                              
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
                                                <TableCell>{detail.rank || '-'}</TableCell>
                                                <TableCell><strong>{detail.fullName || '-'}</strong></TableCell>                                         
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
              <EditIcon color="primary" fontSize="small" />
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
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>ยืนยันการลบข้อมูลการสลับตำแหน่งสามเส้า</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              คุณต้องการลบรายการสลับตำแหน่งสามเส้า กลุ่ม{' '}
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
