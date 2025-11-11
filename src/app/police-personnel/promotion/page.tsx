'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Collapse,
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
  useMediaQuery,
  useTheme,
  Stack,
  Badge,
  Alert,
  List,
  ListItem,
  ListItemButton,
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
  MoreVert as MoreVertIcon,
  CalendarToday as CalendarIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  CheckCircle as CheckCircleIcon,
  DragIndicator as DragIndicatorIcon,
  FilterList as FilterListIcon,
  InfoOutlined as InfoOutlinedIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/Layout';
import DataTablePagination from '@/components/DataTablePagination';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import { useDragDropHighlight } from '@/hooks/useDragDropHighlight';

// Types
interface SwapDetail {
  id: string;
  sequence?: number | null;
  personnelId?: string | null;
  noId?: number | null;
  nationalId?: string | null;
  fullName: string;
  rank?: string | null;
  posCodeId?: number | null;
  posCodeMaster?: { id: number; name: string } | null;
  toPosCodeId?: number | null;
  toPosCodeMaster?: { id: number; name: string } | null;
  fromPosition?: string | null;
  fromPositionNumber?: string | null;
  fromUnit?: string | null;
  fromActingAs?: string | null;
  toPosition?: string | null;
  toPositionNumber?: string | null;
  toUnit?: string | null;
  toActingAs?: string | null;
  notes?: string | null;
  birthDate?: string | null;
  age?: string | null;
  education?: string | null;
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  yearsOfService?: string | null;
  seniority?: string | null;
  trainingLocation?: string | null;
  trainingCourse?: string | null;
  supportName?: string | null;
  supportReason?: string | null;
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

interface EligiblePerson {
  id: string;
  noId?: number;
  posCodeId?: number;
  posCodeName?: string;
  position: string;
  unit: string;
  fullName: string;
  rank: string;
  nationalId: string;
  seniority?: string;
  positionNumber?: string;
  actingAs?: string;
  age?: string;
  yearsOfService?: string;
  trainingCourse?: string;
}

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
  supporterName?: string;
  supportReason?: string;
}

export default function PromotionPage() {
  const router = useRouter();
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(false);
  const [chains, setChains] = useState<TransactionChain[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  
  const [eligiblePersonnel, setEligiblePersonnel] = useState<EligiblePerson[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [totalEligible, setTotalEligible] = useState(0);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [mainSearchText, setMainSearchText] = useState('');
  
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
  
  const [drawerPage, setDrawerPage] = useState(0);
  const [drawerRowsPerPage, setDrawerRowsPerPage] = useState(20);
  
  const [searchText, setSearchText] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterPosCode, setFilterPosCode] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
  
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; groupName?: string | null; groupNumber?: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<TransactionChain | null>(null);
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [personnelDetailModalOpen, setPersonnelDetailModalOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PolicePersonnel | null>(null);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  
  const dragDropHighlight = useDragDropHighlight(2000);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // โหลดข้อมูล units และ positions จาก API
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // โหลดหน่วยงาน
        const unitsResponse = await fetch('/api/police-personnel/units');
        if (unitsResponse.ok) {
          const unitsData = await unitsResponse.json();
          setUnitOptions(unitsData.data || []);
        }

        // โหลดรหัสตำแหน่ง (PosCode)
        const posCodesResponse = await fetch('/api/police-personnel/pos-codes');
        if (posCodesResponse.ok) {
          const posCodesData = await posCodesResponse.json();
          setPosCodeOptions(posCodesData.data || []);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadChains();
  }, [selectedYear]);

  const loadChains = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/swap-transactions?year=${selectedYear}&swapType=promotion`);
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
      const res = await fetch(`/api/swap-transactions/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'ลบรายการไม่สำเร็จ');
      }
      toast.success('ลบรายการสำเร็จ');
      const updatedChains = chains.filter(c => c.id !== deleteTarget.id);
      setChains(updatedChains);
      setDeleteTarget(null);
      await loadEligiblePersonnel(updatedChains);
    } catch (e: any) {
      console.error('Delete failed:', e);
      toast.error(e?.message || 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeleting(false);
    }
  };

  const loadEligiblePersonnel = async (chainsToUse?: TransactionChain[]) => {
    setLoadingEligible(true);
    try {
      const currentChains = chainsToUse !== undefined ? chainsToUse : chains;

      const params = new URLSearchParams({
        year: selectedYear.toString(),
        page: drawerPage.toString(),
        limit: drawerRowsPerPage.toString(),
        includeAll: 'true', // ดึงข้อมูลทั้งหมดจาก police_personnel (รวมทั้งที่ไม่มียศ)
      });

      if (searchText && searchText.trim()) {
        params.append('search', searchText.trim());
      }

      if (filterPosCode && filterPosCode !== 'all') {
        params.append('posCodeId', filterPosCode);
      }

      if (filterUnit && filterUnit !== 'all') {
        params.append('unit', filterUnit);
      }

      console.log('Fetching promotion-eligible personnel with params:', params.toString());
      
      const response = await fetch(`/api/police-personnel/promotion-eligible?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData?.error || 'Failed to fetch eligible personnel');
      }
      
      const data = await response.json();
      
      const eligible: EligiblePerson[] = (data.data || []).map((p: any) => ({
        id: p.id,
        noId: p.noId,
        posCodeId: p.posCodeId,
        posCodeName: p.posCodeName,
        position: p.position || p.posCodeName || '-',
        unit: p.unit || '-',
        fullName: p.fullName || '-',
        rank: p.rank || '-',
        nationalId: p.nationalId || '',
        seniority: p.seniority || '',
        positionNumber: p.positionNumber,
        actingAs: p.actingAs,
        age: p.age,
        yearsOfService: p.yearsOfService,
        trainingCourse: p.trainingCourse,
      }));

      // กรองคนที่ถูกใช้ไปแล้วใน promotion chains
      const usedPersonnelIds = new Set<string>();
      currentChains.forEach(chain => {
        chain.swapDetails?.forEach(detail => {
          if (detail.personnelId) {
            usedPersonnelIds.add(detail.personnelId);
          }
        });
      });

      const availablePersonnel = eligible.filter(p => !usedPersonnelIds.has(p.id));

      // ไม่ต้อง extract options จากข้อมูลที่กรองแล้ว
      // เพราะ options ถูกโหลดจาก API แยกต่างหาก (ใน useEffect ตอนเริ่มต้น)
      
      setEligiblePersonnel(availablePersonnel);
      setTotalEligible(data.total || availablePersonnel.length);
    } catch (error) {
      console.error('Error loading eligible personnel:', error);
      setEligiblePersonnel([]);
      setTotalEligible(0);
    } finally {
      setLoadingEligible(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page to 0 when filters change
  useEffect(() => {
    if (showCreateDialog) {
      setDrawerPage(0);
    }
  }, [searchText, filterPosCode, filterUnit]);

  // โหลดข้อมูลเมื่อ drawer เปิด หรือเมื่อ page, rowsPerPage, หรือ filters เปลี่ยน
  // ใช้ timeout เล็กน้อยเพื่อให้ page reset เสร็จก่อน
  useEffect(() => {
    if (!showCreateDialog) return;

    const timer = setTimeout(() => {
      loadEligiblePersonnel();
    }, 10);

    return () => clearTimeout(timer);
  }, [showCreateDialog, drawerPage, drawerRowsPerPage, searchText, filterPosCode, filterUnit]);

  useEffect(() => {
    if (filterPosCode !== 'all') {
      const exists = posCodeOptions.some((p) => p.id.toString() === filterPosCode);
      if (!exists) {
        setFilterPosCode('all');
      }
    }
  }, [posCodeOptions]);

  const handleCreateChain = (personnelId: string) => {
    setShowCreateDialog(false);
    router.push(`/police-personnel/promotion/create?personnelId=${personnelId}`);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0];
        const month = parts[1];
        const year = parts[2];
        const y = parseInt(year, 10);
        if (!isNaN(y)) {
          if (y > 2500) {
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
          }
          if (y > 1900 && y < 2100) {
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${(y + 543).toString()}`;
          }
        }
        return `${day}/${month}/${year}`;
      }
    }
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

  const sortedDetails = (details: SwapDetail[]) => {
    return [...(details || [])].sort((a, b) => {
      const sa = a.sequence ?? 9999;
      const sb = b.sequence ?? 9999;
      if (sa !== sb) return sa - sb;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  };

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
      router.push(`/police-personnel/promotion/${selectedItem.id}/edit`);
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

  const createReorderHandler = useCallback((transactionId: string) => {
    return (sourceIndex: number, targetIndex: number, detailId: string) => {
      setChains(prevChains => {
        const newChains = prevChains.map(chain => {
          if (chain.id !== transactionId) return chain;

          const originalFirstDetail = chain.swapDetails[0];
          const targetPositionData = {
            toPosCodeId: originalFirstDetail.toPosCodeId,
            toPosCodeMaster: originalFirstDetail.toPosCodeMaster,
            toPosition: originalFirstDetail.toPosition,
            toPositionNumber: originalFirstDetail.toPositionNumber,
            toUnit: originalFirstDetail.toUnit,
            toActingAs: originalFirstDetail.toActingAs,
          };

          const newDetails = [...chain.swapDetails];
          const [removed] = newDetails.splice(sourceIndex, 1);
          newDetails.splice(targetIndex, 0, removed);

          const updatedDetails = newDetails.map((detail, index) => {
            if (index === 0) {
              return {
                ...detail,
                sequence: index + 1,
                toPosCodeId: targetPositionData.toPosCodeId,
                toPosCodeMaster: targetPositionData.toPosCodeMaster,
                toPosition: targetPositionData.toPosition,
                toPositionNumber: targetPositionData.toPositionNumber,
                toUnit: targetPositionData.toUnit,
                toActingAs: targetPositionData.toActingAs,
              };
            } else {
              const prevDetail = newDetails[index - 1];
              return {
                ...detail,
                sequence: index + 1,
                toPosCodeId: prevDetail.posCodeId,
                toPosCodeMaster: prevDetail.posCodeMaster,
                toPosition: prevDetail.fromPosition,
                toPositionNumber: prevDetail.fromPositionNumber,
                toUnit: prevDetail.fromUnit,
                toActingAs: prevDetail.fromActingAs,
              };
            }
          });

          return { ...chain, swapDetails: updatedDetails };
        });

        return newChains;
      });

      setEditingTransactionId(transactionId);
      toast.info('ลำดับถูกเปลี่ยนแล้ว กรุณากดปุ่มบันทึก');
    };
  }, [toast]);

  const handleSaveOrder = useCallback(async (transactionId: string) => {
    const chain = chains.find(c => c.id === transactionId);
    if (!chain) return;

    setSavingOrder(true);
    try {
      const swapDetails = chain.swapDetails.map(detail => ({
        sequence: detail.sequence,
        personnelId: detail.personnelId,
        noId: detail.noId,
        nationalId: detail.nationalId,
        fullName: detail.fullName,
        rank: detail.rank,
        seniority: detail.seniority,
        posCodeId: detail.posCodeId,
        toPosCodeId: detail.toPosCodeId,
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
        supportName: detail.supportName,
        supportReason: detail.supportReason,
        fromPosition: detail.fromPosition,
        fromPositionNumber: detail.fromPositionNumber,
        fromUnit: detail.fromUnit,
        fromActingAs: detail.fromActingAs,
        toPosition: detail.toPosition,
        toPositionNumber: detail.toPositionNumber,
        toUnit: detail.toUnit,
        toActingAs: detail.toActingAs,
        notes: detail.notes,
      }));

      const payload = {
        year: chain.year,
        swapDate: chain.swapDate,
        swapType: chain.swapType,
        groupName: chain.groupName,
        groupNumber: chain.groupNumber,
        status: chain.status,
        notes: chain.notes,
        swapDetails,
      };

      const res = await fetch(`/api/swap-transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || 'บันทึกไม่สำเร็จ');
      }

      toast.success('บันทึกลำดับใหม่สำเร็จ');
      setEditingTransactionId(null);
      await loadChains();
    } catch (error: any) {
      console.error('Save order failed:', error);
      toast.error(error?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSavingOrder(false);
    }
  }, [chains, toast]);

  const handleViewPersonnelDetail = useCallback(async (personnelId?: string | null) => {
    if (!personnelId) return;
    try {
      setLoadingPersonnel(true);
      setPersonnelDetailModalOpen(true);
      
      // ลองหาจาก chains ก่อน
      let personnelData: PolicePersonnel | null = null;
      
      for (const chain of chains) {
        const detail = chain.swapDetails?.find(d => d.personnelId === personnelId);
        if (detail) {
          personnelData = {
            id: detail.personnelId || '',
            noId: detail.noId || undefined,
            fullName: detail.fullName,
            rank: detail.rank || undefined,
            nationalId: detail.nationalId || undefined,
            posCodeId: detail.posCodeId || undefined,
            posCodeMaster: detail.posCodeMaster || undefined,
            position: detail.fromPosition || undefined,
            positionNumber: detail.fromPositionNumber || undefined,
            unit: detail.fromUnit || undefined,
            actingAs: detail.fromActingAs || undefined,
            notes: detail.notes || undefined,
            birthDate: detail.birthDate || undefined,
            age: detail.age || undefined,
            education: detail.education || undefined,
            lastAppointment: detail.lastAppointment || undefined,
            currentRankSince: detail.currentRankSince || undefined,
            enrollmentDate: detail.enrollmentDate || undefined,
            retirementDate: detail.retirementDate || undefined,
            yearsOfService: detail.yearsOfService || undefined,
            seniority: detail.seniority || undefined,
            trainingLocation: detail.trainingLocation || undefined,
            trainingCourse: detail.trainingCourse || undefined,
            supporterName: detail.supportName || undefined,
            supportReason: detail.supportReason || undefined,
          };
          break;
        }
      }

      // ถ้าไม่พบใน chains ให้เรียก API โดยตรง
      if (!personnelData) {
        const response = await fetch(`/api/police-personnel/${personnelId}`);
        if (!response.ok) {
          throw new Error('ไม่สามารถโหลดข้อมูลบุคลากรได้');
        }
        const result = await response.json();
        if (result.success && result.data) {
          personnelData = result.data;
        }
      }

      if (personnelData) {
        setSelectedPersonnel(personnelData);
      } else {
        throw new Error('ไม่พบข้อมูลบุคลากร');
      }
    } catch (e: any) {
      console.error('Error fetching personnel detail:', e);
      toast.error(e?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลบุคลากร');
      setPersonnelDetailModalOpen(false);
    } finally {
      setLoadingPersonnel(false);
    }
  }, [chains, toast]);

  const filteredChains = useMemo(() => {
    let result = chains;
    
    if (mainSearchText.trim()) {
      const lower = mainSearchText.toLowerCase();
      result = result.filter(c => {
        const gn = (c.groupName || '').toLowerCase();
        const gnum = (c.groupNumber || '').toLowerCase();
        const date = formatDate(c.swapDate).toLowerCase();
        const detailText = c.swapDetails?.map(d => `${d.fullName} ${d.fromUnit} ${d.toUnit}`).join(' ').toLowerCase() || '';
        return gn.includes(lower) || gnum.includes(lower) || date.includes(lower) || detailText.includes(lower);
      });
    }
    
    return result.sort((a, b) => {
      const numA = a.groupNumber || '';
      const numB = b.groupNumber || '';
      return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
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
                🎖️ รายการเลื่อนตำแหน่ง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                จัดบุคลากรเพื่อเลื่อนตำแหน่ง โดยเลือกจากบุคลากรที่มีคุณสมบัติเหมาะสม
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
                size="medium"
                onClick={async () => {
                  setSearchText('');
                  setSearchInput('');
                  setFilterPosCode('all');
                  setFilterUnit('all');
                  setDrawerPage(0);
                  setShowCreateDialog(true);
                  await loadEligiblePersonnel(chains);
                }}
              >
                เพิ่มรายการเลื่อนตำแหน่ง
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
              <InputLabel id="year-filter-label">ปี</InputLabel>
              <Select
                labelId="year-filter-label"
                id="year-filter"
                value={selectedYear}
                label="ปี"
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              placeholder="ค้นหา ชื่อกลุ่ม, เลขกลุ่ม, ชื่อบุคลากร..."
              value={mainSearchText}
              onChange={(e) => setMainSearchText(e.target.value)}
              size="small"
              fullWidth
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
              เริ่มต้นสร้างรายการเลื่อนตำแหน่งแรกของคุณ
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="medium"
              onClick={async () => {
                setSearchText('');
                setSearchInput('');
                setFilterPosCode('all');
                setFilterUnit('all');
                setDrawerPage(0);
                setShowCreateDialog(true);
                await loadEligiblePersonnel(chains);
              }}
            >
              เพิ่มรายการเลื่อนตำแหน่ง
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
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <CheckCircleIcon color="success" />
                                      รายละเอียดขั้นตอน ({row.swapDetails.length})
                                    </Typography>
                                    {editingTransactionId === row.id && (
                                      <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        disabled={savingOrder}
                                        startIcon={savingOrder ? <CircularProgress size={16} /> : <CheckIcon />}
                                        onClick={() => handleSaveOrder(row.id)}
                                        sx={{ fontWeight: 600 }}
                                      >
                                        {savingOrder ? 'กำลังบันทึก...' : 'บันทึกลำดับใหม่'}
                                      </Button>
                                    )}
                                  </Box>
                                  <TableContainer>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={{ bgcolor: 'white' }}>
                                          <TableCell sx={{ width: 40 }} />
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
                                        {sortedDetails(row.swapDetails).map((detail, index) => {
                                          return (
                                          <TableRow 
                                            key={detail.id} 
                                            draggable
                                            onDragStart={(e: React.DragEvent) => dragDropHighlight.handleDragStart(e, row.id, detail.id, index)}
                                            onDragOver={(e: React.DragEvent) => dragDropHighlight.handleDragOver(e, row.id, index)}
                                            onDragLeave={dragDropHighlight.handleDragLeave}
                                            onDrop={(e: React.DragEvent) => dragDropHighlight.handleDrop(e, row.id, index, createReorderHandler(row.id))}
                                            onDragEnd={dragDropHighlight.handleDragEnd}
                                            sx={dragDropHighlight.getDragDropStyles(detail.id, row.id, index, theme)}
                                          >
                                            <TableCell>
                                              <DragIndicatorIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                            </TableCell>
                                            <TableCell>{detail.sequence ?? '-'}</TableCell>
                                            <TableCell><strong>{detail.rank ? `${detail.rank} ` : ''}{detail.fullName}</strong></TableCell>
                                            <TableCell>
                                              {detail.posCodeMaster ? (
                                                <Chip label={`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                                              ) : '-' }
                                            </TableCell>
                                            <TableCell>
                                              {detail.fromPosition || '-'}{detail.fromPositionNumber ? ` (${detail.fromPositionNumber})` : ''}
                                            </TableCell>
                                            <TableCell>{detail.fromUnit || '-'}</TableCell>
                                            <TableCell sx={{ bgcolor: 'success.50' }}>
                                              {detail.toPosCodeMaster ? (
                                                <>
                                                  <Chip label={`${detail.toPosCodeMaster.id} - ${detail.toPosCodeMaster.name}`} size="small" color="success" variant="outlined" sx={{ fontSize: '0.75rem', mb: 0.5 }} />
                                                  <br />
                                                  <strong>{detail.toPosition || '-'}</strong>{detail.toPositionNumber ? ` (${detail.toPositionNumber})` : ''}
                                                </>
                                              ) : (
                                                <>
                                                  <strong>{detail.toPosition || '-'}</strong>{detail.toPositionNumber ? ` (${detail.toPositionNumber})` : ''}
                                                </>
                                              )}
                                            </TableCell>
                                            <TableCell sx={{ bgcolor: 'success.50' }}>
                                              <strong>{detail.toUnit || '-'}</strong>
                                            </TableCell>
                                            <TableCell align="center">
                                              <Tooltip title="ดูรายละเอียดบุคลากร">
                                                <IconButton size="small" color="primary" onClick={() => handleViewPersonnelDetail(detail.personnelId || undefined)}>
                                                  <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </TableCell>
                                          </TableRow>
                                          );
                                        })}
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
                          รายการเลื่อนตำแหน่ง ({details.length} คน)
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
                                <Box>
                                  {detail.toPosCodeMaster && (
                                    <Chip 
                                      label={`${detail.toPosCodeMaster.id} - ${detail.toPosCodeMaster.name}`} 
                                      size="small" 
                                      color="success" 
                                      variant="outlined" 
                                      sx={{ fontSize: '0.7rem', mb: 0.5 }} 
                                    />
                                  )}
                                  <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.875rem' }}>
                                    <strong>→ ไป:</strong> {detail.toPosition || '-'}
                                    {detail.toPositionNumber && ` (${detail.toPositionNumber})`}
                                    {detail.toUnit && ` • ${detail.toUnit}`}
                                  </Typography>
                                </Box>
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

        {/* Drawer for selecting eligible personnel */}
        <Drawer
          anchor="right"
          open={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            setSearchText('');
            setSearchInput('');
            setFilterPosCode('all');
            setFilterUnit('all');
            setDrawerPage(0);
            setShowFilters(false);
          }}
          ModalProps={{
            sx: {
              zIndex: 10001, // สูงกว่า AppBar และ components อื่นๆ
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
              p: { xs: 1.5, md: 1 }, 
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
              <Box sx={{ lineHeight: 1, pl: { xs: 0, md: 1.5 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25, fontSize: { xs: '1rem', md: '1.1rem' } }}>
                  เลือกบุคลากรเลื่อนตำแหน่ง
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                  {loadingEligible ? (
                    <>กำลังโหลด...</>
                  ) : (
                    <>
                      {(searchText || filterPosCode !== 'all' || filterUnit !== 'all') ? 'กรองแล้ว: ' : 'ทั้งหมด: '}
                      {totalEligible} คน
                    </>
                  )}
                </Typography>
              </Box>
              <IconButton onClick={() => {
                setShowCreateDialog(false);
                setSearchText('');
                setSearchInput('');
                setShowFilters(false);
              }} size="small">
                <CloseIcon sx={{ fontSize: { xs: 22, md: 20 } }} />
              </IconButton>
            </Box>

            {/* Search and Filter - แสดงตลอดเวลา */}
            <Box sx={{ 
              p: 1, 
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 56,
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}>
                <Stack spacing={1}>
                  {/* Search and Filter Toggle */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1,
                    alignItems: 'flex-start'
                  }}>
                    <TextField
                      size="small"
                      placeholder="ค้นหา ชื่อ, ตำแหน่ง, หน่วย..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1 }}
                    />
                    
                    {/* Mobile: Toggle Filter Button */}
                    {isMobile && (
                      <Badge 
                        badgeContent={
                          (filterUnit !== 'all' ? 1 : 0) + 
                          (filterPosCode !== 'all' ? 1 : 0)
                        } 
                        color="primary"
                        invisible={filterUnit === 'all' && filterPosCode === 'all'}
                      >
                        <IconButton 
                          onClick={() => setShowFilters(!showFilters)}
                          color={showFilters ? 'primary' : 'default'}
                          sx={{ 
                            border: 1, 
                            borderColor: showFilters ? 'primary.main' : 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <FilterListIcon />
                        </IconButton>
                      </Badge>
                    )}
                  </Box>

                  {/* Filter Controls */}
                  <Collapse in={!isMobile || showFilters}>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1, 
                      flexDirection: isMobile ? 'column' : 'row',
                      mb: isMobile ? 1 : 0 
                    }}>
                      {/* Filter Unit */}
                      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
                        <Select
                          value={filterUnit}
                          onChange={(e: SelectChangeEvent) => setFilterUnit(e.target.value)}
                          displayEmpty
                          renderValue={(selected) => {
                            if (selected === 'all') {
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <FilterListIcon fontSize="small" />
                                  <Typography variant="body2">ทุกหน่วย</Typography>
                                </Box>
                              );
                            }
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
                                  {selected}
                                </Typography>
                              </Box>
                            );
                          }}
                          MenuProps={{
                            disablePortal: true,
                            PaperProps: {
                              sx: {
                                maxHeight: 300,
                              }
                            },
                          }}
                          sx={{
                            '& .MuiSelect-select': {
                              py: 1,
                            }
                          }}
                        >
                          <MenuItem value="all">
                            <Typography variant="body2">ทุกหน่วย</Typography>
                          </MenuItem>
                          {unitOptions.map((unit) => (
                            <MenuItem key={unit} value={unit}>
                              <Typography variant="body2" noWrap>
                                {unit}
                              </Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Filter PosCode */}
                      <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 150 }}>
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
                                  {posCode ? `${posCode.id} - ${posCode.name}` : selected}
                                </Typography>
                              </Box>
                            );
                          }}
                          MenuProps={{
                            disablePortal: true,
                            PaperProps: {
                              sx: {
                                maxHeight: 300,
                              }
                            },
                          }}
                          sx={{
                            '& .MuiSelect-select': {
                              py: 1,
                            }
                          }}
                        >
                          <MenuItem value="all">
                            <Typography variant="body2">ทุกระดับ</Typography>
                          </MenuItem>
                          {posCodeOptions.map((posCode) => (
                            <MenuItem key={posCode.id} value={posCode.id.toString()}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {posCode.id} - {posCode.name}
                              </Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  </Collapse>
                  
                  {(searchText || filterPosCode !== 'all' || filterUnit !== 'all') && (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      px: 0.5,
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        พบ {totalEligible} คน
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setSearchText('');
                          setSearchInput('');
                          setFilterPosCode('all');
                          setFilterUnit('all');
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
                  )}
                </Stack>
              </Box>

            {/* Content - แยก Box สำหรับแสดง loading */}
            <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, sm: 1.5 } }}>
              {/* Skeleton Loading */}
              {loadingEligible ? (
                <List disablePadding>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <ListItem key={index} disablePadding sx={{ mb: 0.75 }}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          width: '100%',
                          border: '1.5px solid',
                          borderColor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                          <Box sx={{ py: 1, px: 1.5, flex: 1 }}>
                            {/* Name & Rank */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 0.5 }} />
                              <Skeleton variant="text" width="60%" height={28} />
                            </Box>
                            {/* Position & Unit */}
                            <Skeleton variant="text" width="85%" height={24} sx={{ mb: 0.5 }} />
                            {/* Badges */}
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Skeleton variant="rectangular" width={70} height={22} sx={{ borderRadius: 0.5 }} />
                              <Skeleton variant="rectangular" width={60} height={22} sx={{ borderRadius: 0.5 }} />
                              <Skeleton variant="rectangular" width={80} height={22} sx={{ borderRadius: 0.5 }} />
                            </Box>
                          </Box>
                          {/* Buttons */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1 }}>
                            <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1.5 }} />
                            <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1.5 }} />
                          </Box>
                        </Box>
                      </Paper>
                    </ListItem>
                  ))}
                </List>
              ) : eligiblePersonnel.length === 0 ? (
                <Alert severity="warning" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                  {(searchText || filterPosCode !== 'all' || filterUnit !== 'all') 
                    ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา'
                    : <>ไม่มีบุคลากรที่เหมาะสมสำหรับเลื่อนตำแหน่งในปี {selectedYear}</>
                  }
                </Alert>
              ) : (
                <List disablePadding>
                  {eligiblePersonnel.map((person) => (
                    <ListItem
                      key={person.id}
                      disablePadding
                      sx={{ mb: 0.75 }}
                    >
                      <Paper 
                        elevation={0}
                        sx={{ 
                          width: '100%',
                          border: '1.5px solid',
                          borderColor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            borderColor: 'success.main',
                            boxShadow: '0 3px 10px rgba(46, 125, 50, 0.15)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                          {/* Main Content - Clickable */}
                          <ListItemButton
                            onClick={() => handleCreateChain(person.id)}
                            sx={{ 
                              py: 1,
                              px: 1.5,
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              '&:hover': {
                                bgcolor: 'success.50',
                              }
                            }}
                          >
                            {/* Content */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              {/* Name & Rank Header */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Chip 
                                  label={person.rank || '-'} 
                                  size="small" 
                                  color="success"
                                  sx={{ 
                                    height: 24,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    '& .MuiChip-label': { px: 1.25 }
                                  }}
                                />
                                <Typography 
                                  variant="h6" 
                                  fontWeight={600}
                                  sx={{ 
                                    fontSize: '0.9rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: 'text.primary',
                                  }}
                                >
                                  {person.fullName}
                                </Typography>
                              </Box>
                              
                              {/* Position & Unit - Combined */}
                              <Typography 
                                variant="body2" 
                                color="text.primary"
                                fontWeight={500}
                                sx={{ 
                                  fontSize: '0.875rem',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  mb: 0.5,
                                }}
                              >
                                <TrendingUpIcon sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5, color: 'primary.main' }} />
                                {person.position || person.posCodeName || '-'}
                                {person.posCodeName && person.position !== person.posCodeName && (
                                  <Typography component="span" color="text.secondary" sx={{fontSize:'0.875rem'}}>
                                    {' '}({person.posCodeName})
                                  </Typography>
                                )}
                                <Typography component="span" color="text.secondary" sx={{fontSize:'0.875rem'}}>
                                  {' • '}{person.unit || '-'}
                                </Typography>
                              </Typography>
                              
                              {/* Details Row with Badges - Compact */}
                              <Box sx={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: 0.5,
                              }}>
                                {person.posCodeId && (
                                  <Chip 
                                    label={`รหัส ${person.posCodeId}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                      height: 22,
                                      fontSize: '0.75rem',
                                      borderColor: 'grey.300',
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                )}
                                {person.age && (
                                  <Chip 
                                    label={`อายุ ${person.age}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                      height: 22,
                                      fontSize: '0.75rem',
                                      borderColor: 'grey.300',
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                )}
                                {person.yearsOfService && (
                                  <Chip 
                                    label={`ราชการ ${person.yearsOfService}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                      height: 22,
                                      fontSize: '0.75rem',
                                      borderColor: 'grey.300',
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                )}
                                {person.trainingCourse && person.trainingCourse.trim() && person.trainingCourse !== '-' && (
                                  <Chip 
                                    label={
                                      (person.trainingCourse.includes('นรต') || person.trainingCourse.includes('นรส'))
                                        ? person.trainingCourse
                                        : `นรต.${person.trainingCourse}`
                                    }
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                      height: 22,
                                      fontSize: '0.75rem',
                                      borderColor: 'grey.300',
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>
                            
                            {/* Add Icon Button */}
                            <Box sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 36,
                              height: 36,
                              borderRadius: 1.5,
                              bgcolor: 'success.main',
                              color: 'white',
                              boxShadow: '0 2px 6px rgba(46, 125, 50, 0.25)',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: 'success.dark',
                                boxShadow: '0 3px 10px rgba(46, 125, 50, 0.35)',
                              }
                            }}>
                              <AddIcon sx={{ fontSize: 22 }} />
                            </Box>
                          </ListItemButton>

                          {/* Detail Button - Separate from main click */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            borderLeft: '1.5px solid',
                            borderColor: 'grey.200',
                            px: 0.5,
                          }}>
                            <Tooltip title="ดูรายละเอียด">
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPersonnelDetail(person.id);
                                }}
                                sx={{ 
                                  width: 36,
                                  height: 36,
                                  color: 'info.main',
                                  '&:hover': {
                                    bgcolor: 'info.lighter',
                                    color: 'info.dark',
                                  }
                                }}
                              >
                                <InfoOutlinedIcon sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Paper>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Footer with Pagination */}
            {!loadingEligible && totalEligible > 0 && (
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
                px: { xs: 1, sm: 2 },
              }}>
                {/* Rows per page selector */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    แสดง
                  </Typography>
                  <FormControl size="small" variant="standard" sx={{ minWidth: 60 }}>
                    <Select
                      value={drawerRowsPerPage}
                      onChange={(e: SelectChangeEvent<number>) => {
                        setDrawerRowsPerPage(Number(e.target.value));
                        setDrawerPage(0);
                      }}
                      sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                      MenuProps={{
                        disablePortal: true,
                        PaperProps: {
                          sx: {
                            maxHeight: 300,
                          }
                        },
                      }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={20}>20</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    รายการ
                  </Typography>
                </Box>

                {/* Pagination */}
                <Pagination
                  count={Math.ceil(totalEligible / drawerRowsPerPage)}
                  page={drawerPage + 1}
                  onChange={(e, p) => setDrawerPage(p - 1)}
                  color="primary"
                  size={isMobile ? 'small' : 'medium'}
                  siblingCount={isMobile ? 0 : 1}
                  boundaryCount={1}
                  showFirstButton={!isMobile}
                  showLastButton={!isMobile}
                />
              </Box>
            )}
          </Box>
        </Drawer>

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
            <ListItemText sx={{ color: 'error.main' }}>ลบ</ListItemText>
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteTarget}
          onClose={() => !deleting && setDeleteTarget(null)}
        >
          <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              คุณต้องการลบรายการเลื่อนตำแหน่ง กลุ่ม{' '}
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

        {/* Personnel Detail Modal */}
        {selectedPersonnel && (
          <PersonnelDetailModal
            open={personnelDetailModalOpen}
            onClose={() => {
              setPersonnelDetailModalOpen(false);
              setSelectedPersonnel(null);
            }}
            personnel={selectedPersonnel}
            loading={loadingPersonnel}
          />
        )}
      </Box>
    </Layout>
  );
}
