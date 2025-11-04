'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  TextField,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  alpha,
  MenuItem,
  List,
  Menu,
  ListItemIcon,
  ListItemText,
  Collapse,
  ListItem,
  ListItemButton,
  Slide,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Pagination,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  CalendarToday as CalendarIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/Layout';
import DataTablePagination from '@/components/DataTablePagination';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

// Types based on swap-transactions API
interface SwapDetail {
  id: string;
  sequence?: number | null;
  personnelId?: string | null;
  nationalId?: string | null;
  fullName: string;
  rank?: string | null;
  posCodeId?: number | null;
  posCodeMaster?: { id: number; name: string } | null;
  fromPosition?: string | null;
  fromPositionNumber?: string | null;
  fromUnit?: string | null;
  toPosition?: string | null;
  toPositionNumber?: string | null;
  toUnit?: string | null;
  notes?: string | null;
}

interface TransactionChain {
  id: string;
  year: number;
  swapDate: string;
  swapType: string;
  groupName?: string | null;
  groupNumber?: string | null;
  status: 'draft' | 'approved' | 'completed' | 'cancelled' | string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  swapDetails: SwapDetail[];
}

interface VacantPosition {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  positionNumber?: string;
  requestedPositionId?: number;
  requestedPosition?: string;
}

interface SwapListPerson {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  fullName: string;
  rank: string;
  nationalId: string;
  seniority?: string;
}

// For personnel modal
interface PolicePersonnel {
  id: string;
  noId?: number;
  posCodeId?: number;
  posCodeMaster?: { id: number; name: string };
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

export default function PromotionChainPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [chains, setChains] = useState<TransactionChain[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  // Compact drawer header height (px) for sticky calculations
  const drawerHeaderHeight = 56;
  const [vacantPositions, setVacantPositions] = useState<VacantPosition[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [totalVacantPositions, setTotalVacantPositions] = useState(0); // จำนวนทั้งหมดจาก server (หลัง filter)
  const [loadingVacant, setLoadingVacant] = useState(false); // loading สำหรับ vacant positions
  
  // Search for main list
  const [mainSearchText, setMainSearchText] = useState('');
  
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
  
  // Pagination for drawer
  const [drawerPage, setDrawerPage] = useState(0);
  const [drawerRowsPerPage, setDrawerRowsPerPage] = useState(20);
  
  // Filter for drawer
  const [searchText, setSearchText] = useState('');
  const [filterPosCode, setFilterPosCode] = useState<string>('all');
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);
  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; groupName?: string | null; groupNumber?: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Action menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<TransactionChain | null>(null);
  // Expanded rows for table details
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Personnel modal
  const [personnelDetailModalOpen, setPersonnelDetailModalOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PolicePersonnel | null>(null);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);

  // Load chains first, then vacant positions (to filter used ones)
  useEffect(() => {
    loadChains();
  }, [selectedYear]);

  const loadChains = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/swap-transactions?year=${selectedYear}&swapType=promotion-chain`);
      if (!response.ok) throw new Error('โหลดรายการไม่สำเร็จ');
      const result = await response.json();
      const list: TransactionChain[] = Array.isArray(result?.data) ? result.data : [];
      setChains(list);
    } catch (error) {
      console.error('Error loading chains:', error);
      setChains([]);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (chain: TransactionChain) => {
    setDeleteTarget({ id: chain.id, groupName: chain.groupName, groupNumber: chain.groupNumber });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/swap-transactions/${deleteTarget.id}` , { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'ลบรายการไม่สำเร็จ');
      }
      toast.success('ลบรายการสำเร็จ');
      // Remove from local state and reload vacant positions
      const updatedChains = chains.filter(c => c.id !== deleteTarget.id);
      setChains(updatedChains);
      setDeleteTarget(null);
      // Reload vacant positions to include the deleted one back in the list
      // ส่ง updatedChains เพื่อให้ใช้ข้อมูลที่อัพเดตแล้ว
      await loadVacantPositions(updatedChains);
    } catch (e: any) {
      console.error('Delete failed:', e);
      toast.error(e?.message || 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeleting(false);
    }
  };

  const loadVacantPositions = async (chainsToUse?: TransactionChain[]) => {
    setLoadingVacant(true);
    try {
      // ใช้ chains ที่ส่งเข้ามา หรือใช้ state ปัจจุบัน
      const currentChains = chainsToUse !== undefined ? chainsToUse : chains;

      // Build query params - ดึงข้อมูลทั้งหมดที่ตรงกับ filter (ไม่ใช้ pagination)
      // เพราะเราต้อง filter ตำแหน่งที่ใช้ไปแล้วฝั่ง client ก่อน
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        unassignedOnly: 'true',
      });

      // Add search filter
      if (searchText && searchText.trim()) {
        params.append('search', searchText.trim());
      }

      // อย่าส่ง posCodeId ไปให้ API เพื่อให้ได้รายการ posCode ครบถ้วนตามเงื่อนไขอื่น
      // แล้วค่อยกรองตาม POSCODE ที่เลือกฝั่ง client อีกครั้ง
      
      console.log('Fetching vacant positions with params:', params.toString());
      
      const response = await fetch(`/api/vacant-position/available?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData?.error || 'Failed to fetch vacant positions');
      }
      
      const data = await response.json();
      
      // แปลง grouped data เป็น flat list สำหรับ dialog
      const flatPositions: VacantPosition[] = [];
      const posCodeSet = new Set<string>();
      
      data.groups.forEach((group: any) => {
        // เก็บ posCode options
        if (group.posCodeId && group.posCodeName) {
          posCodeSet.add(JSON.stringify({ id: group.posCodeId, name: group.posCodeName }));
        }
        
        group.positions.forEach((pos: any) => {
          flatPositions.push({
            id: pos.id,
            posCodeId: group.posCodeId,
            position: pos.position,
            unit: pos.unit,
            positionNumber: pos.positionNumber,
            requestedPositionId: group.posCodeId,
            requestedPosition: group.posCodeName,
          });
        });
      });

      // กรองตำแหน่งที่ใช้ไปแล้วใน promotion-chain (เฉพาะหน้าปัจจุบัน)
      const usedVacantIdsInPage = new Set<string>();
      currentChains.forEach(chain => {
        if (chain.swapDetails && chain.swapDetails.length > 0) {
          const firstDetail = chain.swapDetails[0];
          flatPositions.forEach(vp => {
            const posMatch = vp.position === firstDetail.toPosition;
            const unitMatch = vp.unit === firstDetail.toUnit;
            const posNumMatch = vp.positionNumber === firstDetail.toPositionNumber;
            
            if (posMatch && unitMatch && posNumMatch) {
              usedVacantIdsInPage.add(vp.id);
            }
          });
        }
      });

      let availablePositions = flatPositions.filter(vp => !usedVacantIdsInPage.has(vp.id));

      // Client-side filter by POSCODE (หลังจากได้ options ครบแล้ว)
      if (filterPosCode && filterPosCode !== 'all') {
        availablePositions = availablePositions.filter(vp => {
          const id = (vp.requestedPositionId ?? vp.posCodeId);
          return id !== undefined && id !== null && id.toString() === filterPosCode;
        });
      }
      
      // แปลง Set เป็น Array
      const posCodeList = Array.from(posCodeSet).map(item => JSON.parse(item));
      setPosCodeOptions(posCodeList);
      
      // ตอนนี้เราได้ available positions ทั้งหมดแล้ว (ไม่ได้ทำ pagination)
      // ให้ทำ client-side pagination
      const startIndex = drawerPage * drawerRowsPerPage;
      const endIndex = startIndex + drawerRowsPerPage;
  const paginatedPositions = availablePositions.slice(startIndex, endIndex);
      
      setVacantPositions(paginatedPositions);
      
      // Total คือจำนวนตำแหน่งที่เหลือจริงๆ หลัง filter
  setTotalVacantPositions(availablePositions.length);
    } catch (error) {
      console.error('Error loading vacant positions:', error);
      setVacantPositions([]);
      setTotalVacantPositions(0);
      setPosCodeOptions([]);
    } finally {
      setLoadingVacant(false);
    }
  };

  // Reload vacant positions when pagination or filters change (server-side pagination)
  useEffect(() => {
    if (showCreateDialog) {
      loadVacantPositions();
    }
  }, [drawerPage, drawerRowsPerPage, searchText, filterPosCode]);

  // Reset to first page when filters change
  useEffect(() => {
    if (showCreateDialog) {
      setDrawerPage(0);
    }
  }, [searchText, filterPosCode, showCreateDialog]);

  // ป้องกัน MUI Select out-of-range: ถ้า option ปัจจุบันไม่มีค่า filter ที่เลือกอยู่ ให้ reset เป็น 'all'
  useEffect(() => {
    if (filterPosCode !== 'all') {
      const exists = posCodeOptions.some((p) => p.id.toString() === filterPosCode);
      if (!exists) {
        setFilterPosCode('all');
      }
    }
  }, [posCodeOptions]);

  const handleCreateChain = () => {
    setShowCreateDialog(false);
    router.push('/police-personnel/promotion-chain/create');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'approved': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'ร่าง';
      case 'approved': return 'อนุมัติแล้ว';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  const sortedDetails = (details: SwapDetail[]) => {
    return [...(details || [])].sort((a, b) => {
      const sa = a.sequence ?? 9999;
      const sb = b.sequence ?? 9999;
      if (sa !== sb) return sa - sb;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  };

  // แสดงวันที่เป็นรูปแบบ DD/MM/YYYY โดยปีเป็น พ.ศ. เช่น 04/11/2568
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';

    // ถ้าเป็นรูปแบบที่มี / อยู่แล้ว ให้พยายามแปลงปีเป็น พ.ศ. หากเป็น ค.ศ.
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        const y = parseInt(year, 10);
        if (!isNaN(y)) {
          if (y > 2500) {
            // เป็น พ.ศ. อยู่แล้ว
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
          }
          if (y > 1900 && y < 2100) {
            // เป็น ค.ศ. แปลงเป็น พ.ศ.
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${(y + 543).toString()}`;
          }
        }
        // ไม่แน่ใจรูปแบบ ปล่อยตามเดิม
        return `${day}/${month}/${year}`;
      }
    }

    // พยายาม parse เป็น Date ปกติ (ISO หรือ timestamp)
    try {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = (d.getFullYear() + 543).toString();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      // ignore
    }
    return '-';
  };

  // Menu handlers (similar to swap-list)
  const handleMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>, item: TransactionChain) => {
    setAnchorEl(e.currentTarget);
    setSelectedItem(item);
  }, []);
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedItem(null);
  }, []);
  const handleEdit = useCallback(() => {
    if (selectedItem) {
      router.push(`/police-personnel/promotion-chain/${selectedItem.id}/edit`);
    }
    handleMenuClose();
  }, [selectedItem, router, handleMenuClose]);
  const handleDeleteClick = useCallback(() => {
    if (selectedItem) {
      setDeleteTarget({ id: selectedItem.id, groupName: selectedItem.groupName, groupNumber: selectedItem.groupNumber });
    }
    handleMenuClose();
  }, [selectedItem, handleMenuClose]);
  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }, []);
  const handlePageChange = useCallback((newPage: number) => setPage(newPage), []);
  const handleRowsPerPageChange = useCallback((newR: number) => { setRowsPerPage(newR); setPage(0); }, []);

  const handleViewPersonnelDetail = useCallback(async (personnelId?: string | null) => {
    if (!personnelId) return;
    try {
      setLoadingPersonnel(true);
      setPersonnelDetailModalOpen(true);
      const res = await fetch(`/api/police-personnel/${personnelId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'ไม่พบข้อมูลบุคลากร');
      }
      const result = await res.json();
      setSelectedPersonnel(result.data);
    } catch (e: any) {
      console.error('Error fetching personnel detail:', e);
      toast.error(e?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลบุคลากร');
      setPersonnelDetailModalOpen(false);
    } finally {
      setLoadingPersonnel(false);
    }
  }, [toast]);

  // Derived: filtered and paginated items
  const filteredChains = useMemo(() => {
    if (!mainSearchText.trim()) return chains;
    const lower = mainSearchText.toLowerCase();
    return chains.filter(c => {
      const gn = (c.groupName || '').toLowerCase();
      const gnum = (c.groupNumber || '').toLowerCase();
      const date = formatDate(c.swapDate).toLowerCase();
      const detailText = c.swapDetails?.map(d => `${d.fullName} ${d.fromUnit} ${d.toUnit}`).join(' ').toLowerCase() || '';
      return gn.includes(lower) || gnum.includes(lower) || date.includes(lower) || detailText.includes(lower);
    });
  }, [chains, mainSearchText]);

  const paginatedChains = useMemo(() => {
    return filteredChains.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredChains, page, rowsPerPage]);

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
            <Box>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                
                จัดคนเข้าตำแหน่งว่าง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                จัดบุคลากรเข้าตำแหน่งว่างแบบลูกโซ่ เมื่อมีตำแหน่งว่างและต้องการเลือกคนมาแทนตามลำดับชั้น
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_e, v) => {
                  if (!v) return;
                  setViewMode(v);
                  setPage(0);
                  setRowsPerPage(v === 'table' ? 10 : 12);
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
                startIcon={<AddIcon />}
                onClick={async () => {
                  // Reset filters และ pagination ก่อนเปิด drawer
                  setSearchText('');
                  setFilterPosCode('all');
                  setDrawerPage(0);
                  setShowCreateDialog(true);
                  // Reload vacant positions when opening to ensure used positions are filtered out
                  // ส่ง chains ปัจจุบันเข้าไปเพื่อให้กรองตำแหน่งที่ใช้ไปแล้วได้ถูกต้อง
                  await loadVacantPositions(chains);
                }}
              >
                สร้างรายการใหม่
              </Button>
            </Box>
          </Box>
        </Paper>

      {/* Filters: Year, Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>

          <TextField
            placeholder="ค้นหา ชื่อกลุ่ม, เลขกลุ่ม, ชื่อบุคลากร..."
            value={mainSearchText}
            onChange={(e) => setMainSearchText(e.target.value)}
            size="small"
            sx={{ minWidth: 300, flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: mainSearchText && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setMainSearchText('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            label="ปี"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 250 }}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>

        </Box>
      </Paper>


      {/* Chains List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : chains.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <TrendingUpIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            ยังไม่มีรายการ
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            เริ่มต้นจัดคนเข้าตำแหน่งว่างแรกของคุณ
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={async () => {
              // Reset filters และ pagination ก่อนเปิด drawer
              setSearchText('');
              setFilterPosCode('all');
              setDrawerPage(0);
              setShowCreateDialog(true);
              // Reload vacant positions when opening to ensure used positions are filtered out
              // ส่ง chains ปัจจุบันเข้าไปเพื่อให้กรองตำแหน่งที่ใช้ไปแล้วได้ถูกต้อง
              await loadVacantPositions(chains);
            }}
          >
            สร้างรายการใหม่
          </Button>
        </Paper>
      ) : (
        <>
          {viewMode === 'table' ? (
            <Paper elevation={2}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      <TableCell sx={{ color: 'white', width: 50 }} />
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>เลขกลุ่ม</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>ชื่อกลุ่ม</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>วันที่</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600, width: 80 }} align="center">จัดการ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedChains.map((row) => (
                      <React.Fragment key={row.id}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton size="small" color="primary" onClick={() => toggleRow(row.id)}>
                              {expandedRows.has(row.id) ? <ArrowUpIcon /> : <ArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Chip label={row.groupNumber || '-'} color="primary" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
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
                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, row)}>
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={5} sx={{ p: 0 }}>
                            <Collapse in={expandedRows.has(row.id)} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <CheckIcon color="success" />
                                  รายละเอียดขั้นตอน ({row.swapDetails.length})
                                </Typography>
                                <TableContainer>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{ bgcolor: 'white' }}>
                                        <TableCell>ลำดับ</TableCell>
                                        <TableCell>ยศ/ชื่อ-สกุล</TableCell>
                                        <TableCell>POSCODE</TableCell>
                                        <TableCell>จากตำแหน่ง</TableCell>
                                        <TableCell>จากหน่วย</TableCell>
                                        <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>→ ไปตำแหน่ง</TableCell>
                                        <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>→ ไปหน่วย</TableCell>
                                        <TableCell align="center">ดูข้อมูล</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {sortedDetails(row.swapDetails).map((d) => (
                                        <TableRow key={d.id} sx={{ bgcolor: 'white' }}>
                                          <TableCell>{d.sequence ?? '-'}</TableCell>
                                          <TableCell><strong>{d.rank ? `${d.rank} ` : ''}{d.fullName}</strong></TableCell>
                                          <TableCell>
                                            {d.posCodeMaster ? (
                                              <Chip label={`${d.posCodeMaster.id} - ${d.posCodeMaster.name}`} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                                            ) : '-' }
                                          </TableCell>
                                          <TableCell>
                                            {d.fromPosition || '-'}{d.fromPositionNumber ? ` (${d.fromPositionNumber})` : ''}
                                          </TableCell>
                                          <TableCell>{d.fromUnit || '-'}</TableCell>
                                          <TableCell sx={{ bgcolor: 'success.50' }}>
                                            <strong>{d.toPosition || '-'}</strong>{d.toPositionNumber ? ` (${d.toPositionNumber})` : ''}
                                          </TableCell>
                                          <TableCell sx={{ bgcolor: 'success.50' }}>
                                            <strong>{d.toUnit || '-'}</strong>
                                          </TableCell>
                                          <TableCell align="center">
                                            <Tooltip title="ดูรายละเอียดบุคลากร">
                                              <IconButton size="small" color="primary" onClick={() => handleViewPersonnelDetail(d.personnelId || undefined)}>
                                                <VisibilityIcon fontSize="small" />
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
              {filteredChains.length > 0 && (
                <DataTablePagination
                  count={filteredChains.length}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  variant="minimal"
                />
              )}
            </Paper>
          ) : (
            /* Card View */
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, 
              gap: 3 
            }}>
              {paginatedChains.map((chain) => {
                const details = sortedDetails(chain.swapDetails);
                return (
                  <Paper 
                    key={chain.id} 
                    elevation={2} 
                    sx={{ 
                      p: 3, 
                      position: 'relative',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        elevation: 4,
                        transform: 'translateY(-1px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    {/* Card Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Chip
                          label={chain.groupNumber || '-'}
                          color="primary"
                          size="medium"
                          sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.15rem' }}>
                          {chain.groupName || 'ไม่ระบุชื่อกลุ่ม'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
                          <CalendarIcon sx={{ fontSize: 16 }} />
                          {formatDate(chain.swapDate)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, chain)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    {/* Notes */}
                    {chain.notes && (
                      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                          <strong>หมายเหตุ:</strong> {chain.notes}
                        </Typography>
                      </Alert>
                    )}

                    {/* Chain Details */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.95rem' }}>
                        <TrendingUpIcon fontSize="small" color="primary" />
                        ลูกโซ่ตำแหน่ง ({details.length} คน)
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {details.map((detail, index) => (
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
                                  {detail.sequence ?? index + 1}. {detail.rank ? `${detail.rank} ` : ''}{detail.fullName}
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
                                  onClick={() => handleViewPersonnelDetail(detail.personnelId || undefined)}
                                  sx={{ ml: 1 }}
                                >
                                  <VisibilityIcon fontSize="small" />
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
                );
              })}
            </Box>
          )}
          {/* Pagination for Card View */}
          {filteredChains.length > 0 && viewMode === 'card' && (
            <Paper sx={{ mt: 3 }}>
              <DataTablePagination
                count={filteredChains.length}
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

      {/* Create Drawer */}
      <Drawer
        anchor="right"
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          // Reset filters เมื่อปิด drawer
          setSearchText('');
          setFilterPosCode('all');
          setDrawerPage(0);
        }}
        ModalProps={{
          sx: {
            zIndex: 1400, // สูงกว่า AppBar (1200)
          }
        }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: '90%', md: 700 },
            backgroundImage: 'none',
          }
        }}
        SlideProps={{
          timeout: { enter: 300, exit: 250 }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{ 
            p: 1, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}>
            <Box sx={{ lineHeight: 1 , pl:1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                จับคู่ตำแหน่งว่าง
              </Typography>
              {loadingVacant ? (
                <Skeleton variant="text" width={140} height={16} />
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                  {(searchText || filterPosCode !== 'all') ? 'กรองแล้ว: ' : 'ทั้งหมด: '}
                  {totalVacantPositions} ตำแหน่ง
                </Typography>
              )}
            </Box>
            <IconButton onClick={() => setShowCreateDialog(false)} size="small">
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* Search and Filter */}
          <Box sx={{ 
            p: 1, 
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'sticky',
            top: drawerHeaderHeight, // ความสูงของ header ที่ย่อขนาด
            zIndex: 10, // เพิ่ม zIndex ให้สูงกว่า
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}>
            <Stack spacing={1}>
              {/* Search and Filter in one row */}
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  placeholder="ค้นหา..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1 }}
                />
                
                {loadingVacant ? (
                  <Skeleton variant="rounded" width={180} height={36} />
                ) : (
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <Select
                      value={filterPosCode}
                      onChange={(e: SelectChangeEvent) => setFilterPosCode(e.target.value)}
                      displayEmpty
                      renderValue={(selected) => {
                        if (selected === 'all') {
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <FilterListIcon fontSize="small" />
                              <Typography variant="body2">ทั้งหมด</Typography>
                            </Box>
                          );
                        }
                        const posCode = posCodeOptions.find(p => p.id.toString() === selected);
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FilterListIcon fontSize="small" />
                            <Typography 
                              variant="body2"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {posCode?.name || selected}
                            </Typography>
                          </Box>
                        );
                      }}
                      MenuProps={{
                        sx: { zIndex: 9999 },
                        PaperProps: {
                          sx: {
                            zIndex: 9999,
                            maxHeight: 300,
                          }
                        },
                        disablePortal: false,
                        anchorOrigin: {
                          vertical: 'bottom',
                          horizontal: 'left',
                        },
                        transformOrigin: {
                          vertical: 'top',
                          horizontal: 'left',
                        },
                      }}
                      sx={{
                        '& .MuiSelect-select': {
                          py: 1,
                        }
                      }}
                    >
                      <MenuItem value="all">
                        <Typography variant="body2">ทั้งหมด</Typography>
                      </MenuItem>
                      {posCodeOptions.map((posCode) => (
                        <MenuItem key={posCode.id} value={posCode.id.toString()}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {posCode.name}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
              
              {(searchText || filterPosCode !== 'all') && (
                loadingVacant ? (
                  <Box sx={{ px: 0.5 }}>
                    <Skeleton variant="text" width={120} height={16} />
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    px: 0.5,
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      พบ {totalVacantPositions} ตำแหน่ง
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        setSearchText('');
                        setFilterPosCode('all');
                        setDrawerPage(0);
                      }}
                      sx={{ 
                        minWidth: 'auto', 
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        py: 0.25,
                      }}
                    >
                      ล้างตัวกรอง
                    </Button>
                  </Box>
                )
              )}
            </Stack>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
            
            {loadingVacant ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 5 }}>
                <CircularProgress size={40} />
              </Box>
            ) : vacantPositions.length === 0 ? (
              <Alert severity="warning" sx={{ fontSize: '0.875rem' }}>
                {(searchText || filterPosCode !== 'all') 
                  ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา'
                  : <>ไม่มีตำแหน่งว่างที่พร้อมใช้งานในปี {selectedYear}</>
                }
              </Alert>
            ) : (
              <List disablePadding>
                {vacantPositions.map((vp) => (
                    <ListItem
                      key={vp.id}
                      disablePadding
                      sx={{ mb: 0.5 }}
                    >
                      <Paper 
                        elevation={0}
                        sx={{ 
                          width: '100%',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 0.75,
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 1,
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemButton
                          onClick={() => {
                            router.push(`/police-personnel/promotion-chain/create?vacantId=${vp.id}`);
                            setShowCreateDialog(false);
                          }}
                          sx={{ 
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {/* Content - Ultra Compact Layout */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                              <Chip 
                                label={vp.requestedPosition || 'ไม่ระบุ'} 
                                size="small" 
                                color="primary"
                                sx={{ 
                                  height: 18,
                                  fontSize: '0.85rem',
                                  '& .MuiChip-label': { px: 0.75 }
                                }}
                              />
                              <Typography 
                                variant="caption" 
                                fontWeight={600}
                                sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.85rem',
                                }}
                              >
                                {vp.position || '-'}
                              </Typography>
                            </Box>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ 
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.8rem',
                                lineHeight: 1.2,
                              }}
                            >
                                หน่วย: {vp.unit || '-'}{vp.positionNumber ? ` - เลขที่ ${vp.positionNumber}` : ''}
                            </Typography>
                          </Box>
                          
                          {/* Action Icon - Smaller */}
                          <Box sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 28,
                            height: 28,
                            borderRadius: 0.75,
                            bgcolor: 'primary.50',
                            color: 'primary.main',
                          }}>
                            <AddIcon sx={{ fontSize: 18 }} />
                          </Box>
                        </ListItemButton>
                      </Paper>
                    </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* Footer with Pagination */}
          {totalVacantPositions > 0 && (
            <Box sx={{
              position: 'sticky',
              bottom: 0,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
              zIndex: 10,
              pt: { xs: 1, sm: 1.5 },
              pb: { xs: 1, sm: 1.5 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 2,
            }}>
              {/* Rows per page selector */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  แสดง
                </Typography>
                <FormControl size="small" variant="standard" sx={{ minWidth: 60 }} disabled={loadingVacant}>
                  <Select
                    value={drawerRowsPerPage}
                    onChange={(e: SelectChangeEvent<number>) => {
                      setDrawerRowsPerPage(Number(e.target.value));
                      setDrawerPage(0);
                    }}
                    sx={{ fontSize: '0.875rem' }}
                    MenuProps={{
                      sx: { zIndex: 9999 },
                      PaperProps: {
                        sx: { zIndex: 9999 }
                      },
                      anchorOrigin: {
                        vertical: 'top',
                        horizontal: 'left',
                      },
                      transformOrigin: {
                        vertical: 'bottom',
                        horizontal: 'left',
                      },
                    }}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                  รายการ
                </Typography>
              </Box>

              {/* MUI Pagination */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {loadingVacant ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    หน้า {drawerPage + 1} จาก {Math.ceil(totalVacantPositions / drawerRowsPerPage) || 1}
                  </Typography>
                )}
                <Pagination
                  count={Math.ceil(totalVacantPositions / drawerRowsPerPage) || 1}
                  page={drawerPage + 1}
                  onChange={(_event, page) => setDrawerPage(page - 1)}
                  disabled={loadingVacant}
                  size="medium"
                  showFirstButton
                  showLastButton
                  siblingCount={1}
                  boundaryCount={1}
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontSize: '0.875rem',
                      minWidth: '32px',
                      height: '32px',
                    },
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Drawer>
      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>

        {(selectedItem?.status === 'completed' || selectedItem?.status === 'draft') && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>แก้ไข</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>ลบ</ListItemText>
        </MenuItem>
      </Menu>

      {/* Personnel Detail Modal */}
      <PersonnelDetailModal
        open={personnelDetailModalOpen}
        onClose={() => setPersonnelDetailModalOpen(false)}
        personnel={selectedPersonnel}
        loading={loadingPersonnel}
        onClearData={() => setSelectedPersonnel(null)}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
      >
        <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            คุณต้องการลบรายการจัดคนเข้าตำแหน่งว่าง กลุ่ม{' '}
            <strong>
              {deleteTarget && deleteTarget.groupName ? deleteTarget.groupName : '(ไม่ระบุชื่อกลุ่ม)'}
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
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            ยกเลิก
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {deleting ? 'กำลังลบ...' : 'ลบ'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Layout>
  );
}
