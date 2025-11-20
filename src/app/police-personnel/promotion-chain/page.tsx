'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Autocomplete,
  useMediaQuery,
  useTheme,
  Badge,
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
  CheckCircle as CheckCircleIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/Layout';
import DataTablePagination from '@/components/DataTablePagination';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import { useDragDropHighlight } from '@/hooks/useDragDropHighlight';

// Types based on swap-transactions API
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
  // ข้อมูลส่วนตัวที่บันทึกไว้ใน swap_transaction_detail
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
  // ข้อมูลผู้สนับสนุน
  supportName?: string | null;
  supportReason?: string | null;
  // Placeholder
  isPlaceholder?: boolean;
}

interface TransactionChain {
  id: string;
  year: number;
  swapDate: string;
  swapType: string;
  groupName?: string | null;
  groupNumber?: string | null;
  status: 'draft' | 'approved' | 'completed' | 'cancelled' | string;
  isCompleted?: boolean;
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
  supporterName?: string;
  supportReason?: string;
}

export default function PromotionChainPage() {
  const router = useRouter();
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [chains, setChains] = useState<TransactionChain[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showFilters, setShowFilters] = useState(false);
  // Compact drawer header height (px) for sticky calculations
  const drawerHeaderHeight = 56;
  const [vacantPositions, setVacantPositions] = useState<VacantPosition[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [completedFilter, setCompletedFilter] = useState<string>('all'); // 'all' | 'completed' | 'not-completed'
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
  const [searchInput, setSearchInput] = useState(''); // For immediate display in input
  const [filterPosCode, setFilterPosCode] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
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
  // Drag and drop with highlight hook
  const dragDropHighlight = useDragDropHighlight(2000);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null); // transaction ที่กำลังแก้ไข
  const [savingOrder, setSavingOrder] = useState(false);

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

      // เก็บ unit options
      const unitSet = new Set<string>();
      availablePositions.forEach(vp => {
        if (vp.unit) unitSet.add(vp.unit);
      });
      const unitList = Array.from(unitSet).sort((a, b) => a.localeCompare(b, 'th'));
      setUnitOptions(unitList);

      // Client-side filter by Unit
      if (filterUnit && filterUnit !== 'all') {
        availablePositions = availablePositions.filter(vp => vp.unit === filterUnit);
      }

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
  }, [drawerPage, drawerRowsPerPage, searchText, filterPosCode, filterUnit]);

  // Debounce search input for drawer
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(searchInput);
    }, 500); // Delay 500ms before triggering search

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to first page when filters change
  useEffect(() => {
    if (showCreateDialog) {
      setDrawerPage(0);
    }
  }, [searchText, filterPosCode, filterUnit, showCreateDialog]);

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

  const sortedDetails = (details: SwapDetail[]) => {
    return [...(details || [])].sort((a, b) => {
      const sa = a.sequence ?? 9999;
      const sb = b.sequence ?? 9999;
      if (sa !== sb) return sa - sb;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
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

  // Drag and drop handler - ใช้ร่วมกับ hook
  const createReorderHandler = useCallback((transactionId: string) => {
    return (sourceIndex: number, targetIndex: number, detailId: string) => {
      // อัปเดต chains state
      setChains(prevChains => {
        const newChains = prevChains.map(chain => {
          if (chain.id !== transactionId) return chain;

          // เก็บข้อมูลตำแหน่งว่างต้นทางจาก node แรกเดิม
          const originalFirstDetail = chain.swapDetails[0];
          const vacantPositionData = {
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

          // อัปเดต sequence และตำแหน่ง to
          const updatedDetails = newDetails.map((detail, index) => {
            if (index === 0) {
              // โหนดแรก - อัปเดต toPosition ให้เป็นตำแหน่งว่างต้นทาง
              return {
                ...detail,
                sequence: index + 1,
                toPosCodeId: vacantPositionData.toPosCodeId,
                toPosCodeMaster: vacantPositionData.toPosCodeMaster,
                toPosition: vacantPositionData.toPosition,
                toPositionNumber: vacantPositionData.toPositionNumber,
                toUnit: vacantPositionData.toUnit,
                toActingAs: vacantPositionData.toActingAs,
              };
            } else {
              // โหนดถัดไป - อัปเดต toPosition ให้เชื่อมกับ fromPosition ของโหนดก่อนหน้า
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

      setEditingTransactionId(transactionId); // เปิดโหมดแก้ไข
      toast.info('ลำดับถูกเปลี่ยนแล้ว กรุณากดปุ่มบันทึก');
    };
  }, [toast]);

  // บันทึกการเรียงลำดับใหม่
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
      await loadChains(); // โหลดข้อมูลใหม่
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
      
      // ค้นหาข้อมูลจาก swap transaction details ที่บันทึกไว้
      // เพื่อให้แสดงข้อมูล ณ เวลานั้น ไม่ได้รับผลกระทบจากการ import ข้อมูลใหม่
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
            // ข้อมูลส่วนตัวที่บันทึกไว้
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
            // ข้อมูลผู้สนับสนุน
            supporterName: detail.supportName || undefined,
            supportReason: detail.supportReason || undefined,
          };
          break;
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

  // Derived: filtered and paginated items
  const filteredChains = useMemo(() => {
    let result = chains;
    
    // Filter by completed status
    if (completedFilter !== 'all') {
      if (completedFilter === 'completed') {
        result = result.filter(c => c.isCompleted === true);
      } else if (completedFilter === 'not-completed') {
        result = result.filter(c => c.isCompleted !== true);
      }
    }
    
    // Filter by search text
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
    
    // Sort by groupNumber descending (newest first)
    return result.sort((a, b) => {
      const numA = a.groupNumber || '';
      const numB = b.groupNumber || '';
      return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [chains, completedFilter, mainSearchText]);

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
                size="medium"
                onClick={async () => {
                  // Reset filters และ pagination ก่อนเปิด drawer
                  setSearchText('');
                  setSearchInput('');
                  setFilterPosCode('all');
                  setFilterUnit('all');
                  setDrawerPage(0);
                  setShowCreateDialog(true);
                  // Reload vacant positions when opening to ensure used positions are filtered out
                  // ส่ง chains ปัจจุบันเข้าไปเพื่อให้กรองตำแหน่งที่ใช้ไปแล้วได้ถูกต้อง
                  await loadVacantPositions(chains);
                }}
              >
                เพิ่มรายการตำแหน่งว่าง
              </Button>
            </Box>
          </Box>
        </Paper>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 2fr' }, 
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

          <FormControl size="small">
            <InputLabel id="completed-filter-label">สถานะ</InputLabel>
            <Select
              labelId="completed-filter-label"
              id="completed-filter"
              value={completedFilter}
              label="สถานะ"
              onChange={(e) => setCompletedFilter(e.target.value)}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="completed">ทำเสร็จแล้ว</MenuItem>
              <MenuItem value="not-completed">ยังไม่เสร็จ</MenuItem>
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
            เริ่มต้นจัดคนเข้าตำแหน่งว่างแรกของคุณ
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="medium"
            onClick={async () => {
              // Reset filters และ pagination ก่อนเปิด drawer
              setSearchText('');
              setSearchInput('');
              setFilterPosCode('all');
              setFilterUnit('all');
              setDrawerPage(0);
              setShowCreateDialog(true);
              // Reload vacant positions when opening to ensure used positions are filtered out
              // ส่ง chains ปัจจุบันเข้าไปเพื่อให้กรองตำแหน่งที่ใช้ไปแล้วได้ถูกต้อง
              await loadVacantPositions(chains);
            }}
          >
            เพิ่มรายการตำแหน่งว่าง
          </Button>
        </Paper>
      ) : filteredChains.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <FilterListIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            ไม่พบข้อมูลที่ค้นหา
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง
          </Typography>
          <Button
            variant="outlined"
            size="medium"
            onClick={() => {
              setMainSearchText('');
              setCompletedFilter('all');
            }}
          >
            ล้างตัวกรอง
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
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Chip label={row.groupNumber || '-'} color="primary" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                              
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {row.isCompleted && (
                                <Tooltip title="จัดตำแหน่งเสร็จสิ้นแล้ว">
                                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                </Tooltip>
                              )}
                              <Typography variant="body2" fontWeight={600}>
                                {row.groupName || '-'}
                              </Typography>
                            </Box>
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
                                      {sortedDetails(row.swapDetails).map((d, index) => {
                                        // ตรวจสอบว่าเป็น placeholder หรือไม่
                                        const isPlaceholder = d.isPlaceholder || (!d.personnelId && !d.nationalId);
                                        
                                        if (isPlaceholder) {
                                          return (
                                            <TableRow 
                                              key={d.id}
                                              draggable
                                              onDragStart={(e: React.DragEvent) => dragDropHighlight.handleDragStart(e, row.id, d.id, index)}
                                              onDragOver={(e: React.DragEvent) => dragDropHighlight.handleDragOver(e, row.id, index)}
                                              onDragLeave={dragDropHighlight.handleDragLeave}
                                              onDrop={(e: React.DragEvent) => dragDropHighlight.handleDrop(e, row.id, index, createReorderHandler(row.id))}
                                              onDragEnd={dragDropHighlight.handleDragEnd}
                                              sx={{
                                                ...dragDropHighlight.getDragDropStyles(d.id, row.id, index, theme),
                                                bgcolor: 'grey.50',
                                                borderLeft: '4px dashed',
                                                borderColor: 'warning.main',
                                              }}
                                            >
                                              <TableCell>
                                                <DragIndicatorIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                                              </TableCell>
                                              <TableCell>{d.sequence ?? '-'}</TableCell>
                                              <TableCell>
                                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.875rem' }}>
                                                  📋 ตำแหน่งว่าง - รอการเลือกบุคลากร
                                                </Typography>
                                              </TableCell>
                                              <TableCell>-</TableCell>
                                              <TableCell>-</TableCell>
                                              <TableCell>-</TableCell>
                                              <TableCell sx={{ bgcolor: 'warning.50' }}>
                                                {d.toPosCodeMaster ? (
                                                  <>
                                                    <Chip label={`${d.toPosCodeMaster.id} - ${d.toPosCodeMaster.name}`} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.75rem', mb: 0.5 }} />
                                                    <br />
                                                    <strong>{d.toPosition || '-'}</strong>{d.toPositionNumber ? ` (${d.toPositionNumber})` : ''}
                                                  </>
                                                ) : (
                                                  <>
                                                    <strong>{d.toPosition || '-'}</strong>{d.toPositionNumber ? ` (${d.toPositionNumber})` : ''}
                                                  </>
                                                )}
                                              </TableCell>
                                              <TableCell sx={{ bgcolor: 'warning.50' }}>
                                                <strong>{d.toUnit || '-'}</strong>
                                              </TableCell>
                                              <TableCell align="center">-</TableCell>
                                            </TableRow>
                                          );
                                        }
                                        
                                        // ตรวจสอบว่าเป็นการเลื่อนตำแหน่งหรือไม่ (toPosCodeId < posCodeId = เลื่อนขึ้น)
                                        const isPromotion = d.toPosCodeId && d.posCodeId && d.toPosCodeId > 0 && d.posCodeId > 0 && d.toPosCodeId < d.posCodeId;
                                        
                                        return (
                                        <TableRow 
                                          key={d.id} 
                                          draggable
                                          onDragStart={(e: React.DragEvent) => dragDropHighlight.handleDragStart(e, row.id, d.id, index)}
                                          onDragOver={(e: React.DragEvent) => dragDropHighlight.handleDragOver(e, row.id, index)}
                                          onDragLeave={dragDropHighlight.handleDragLeave}
                                          onDrop={(e: React.DragEvent) => dragDropHighlight.handleDrop(e, row.id, index, createReorderHandler(row.id))}
                                          onDragEnd={dragDropHighlight.handleDragEnd}
                                          sx={dragDropHighlight.getDragDropStyles(d.id, row.id, index, theme)}
                                        >
                                          <TableCell>
                                            <DragIndicatorIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                          </TableCell>
                                          <TableCell>{d.sequence ?? '-'}</TableCell>
                                          <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                              {isPromotion && (
                                                <Tooltip title="เลื่อนตำแหน่ง">
                                                  <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                                </Tooltip>
                                              )}
                                              <strong>{d.rank ? `${d.rank} ` : ''}{d.fullName}</strong>
                                            </Box>
                                          </TableCell>
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
                                            {d.toPosCodeMaster ? (
                                              <>
                                                <Chip label={`${d.toPosCodeMaster.id} - ${d.toPosCodeMaster.name}`} size="small" color="success" variant="outlined" sx={{ fontSize: '0.75rem', mb: 0.5 }} />
                                                <br />
                                                <strong>{d.toPosition || '-'}</strong>{d.toPositionNumber ? ` (${d.toPositionNumber})` : ''}
                                              </>
                                            ) : (
                                              <>
                                                <strong>{d.toPosition || '-'}</strong>{d.toPositionNumber ? ` (${d.toPositionNumber})` : ''}
                                              </>
                                            )}
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
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                          <Chip
                            label={chain.groupNumber || '-'}
                            color="primary"
                            size="medium"
                            sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                          />
                          {chain.isCompleted && (
                            <Chip 
                              label="✓ เสร็จสิ้น" 
                              color="success" 
                              size="small" 
                              sx={{ fontWeight: 600 }} 
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          {chain.isCompleted && (
                            <Tooltip title="จัดตำแหน่งเสร็จสิ้นแล้ว">
                              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22 }} />
                            </Tooltip>
                          )}
                          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.15rem' }}>
                            {chain.groupName || 'ไม่ระบุชื่อกลุ่ม'}
                          </Typography>
                        </Box>
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
                        {details.map((detail, index) => {
                          const isPlaceholder = detail.isPlaceholder || (!detail.personnelId && !detail.nationalId);
                          // ตรวจสอบว่าเป็นการเลื่อนตำแหน่งหรือไม่ (toPosCodeId < posCodeId = เลื่อนขึ้น)
                          const isPromotion = detail.toPosCodeId && detail.posCodeId && detail.toPosCodeId > 0 && detail.posCodeId > 0 && detail.toPosCodeId < detail.posCodeId;
                          
                          return (
                          <Box 
                            key={detail.id}
                            sx={{ 
                              p: 2, 
                              bgcolor: isPlaceholder ? 'warning.50' : 'grey.50', 
                              borderRadius: 1,
                              borderLeft: '3px solid',
                              borderLeftColor: isPlaceholder ? 'warning.main' : 'primary.main',
                              borderStyle: isPlaceholder ? 'dashed' : 'solid',
                            }}
                          >
                            {isPlaceholder ? (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem', mb: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                                  {detail.sequence ?? index + 1}. 📋 ตำแหน่งว่าง - รอการเลือกบุคลากร
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                  {detail.toPosCodeMaster && (
                                    <Chip 
                                      label={`${detail.toPosCodeMaster.id} - ${detail.toPosCodeMaster.name}`} 
                                      size="small" 
                                      color="warning" 
                                      variant="outlined" 
                                      sx={{ fontSize: '0.7rem', mb: 0.5 }} 
                                    />
                                  )}
                                  <Typography variant="body2" sx={{ color: 'warning.dark', fontWeight: 600, fontSize: '0.875rem' }}>
                                    <strong>→ ไป:</strong> {detail.toPosition || '-'} 
                                    {detail.toPositionNumber && ` (${detail.toPositionNumber})`}
                                    {detail.toUnit && ` • ${detail.toUnit}`}
                                  </Typography>
                                </Box>
                              </Box>
                            ) : (
                              <>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      {isPromotion && (
                                        <Tooltip title="เลื่อนตำแหน่ง">
                                          <TrendingUpIcon sx={{ color: 'success.main', fontSize: 18 }} />
                                        </Tooltip>
                                      )}
                                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                        {detail.sequence ?? index + 1}. {detail.rank ? `${detail.rank} ` : ''}{detail.fullName}
                                      </Typography>
                                    </Box>
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
                              </>
                            )}
                          </Box>
                          );
                        })}
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
                จับคู่ตำแหน่งว่าง
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
                {loadingVacant ? (
                  <>กำลังโหลด...</>
                ) : (
                  <>
                    {(searchText || filterPosCode !== 'all' || filterUnit !== 'all') ? 'กรองแล้ว: ' : 'ทั้งหมด: '}
                    {totalVacantPositions} ตำแหน่ง
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
              top: drawerHeaderHeight, // ความสูงของ header ที่ย่อขนาด
              zIndex: 10, // เพิ่ม zIndex ให้สูงกว่า
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
                    placeholder="ค้นหา ตำแหน่ง, หน่วย..."
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
                      พบ {totalVacantPositions} ตำแหน่ง
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

          {/* Content - แยก Box สำหรับแสดง loading overlay */}
          <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, sm: 1.5 }, position: 'relative' }}>
            {/* Loading Overlay - จะทับทับเนื้อหาแทนการแทนที่ */}
            {loadingVacant && (
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                zIndex: 1,
              }}>
                <CircularProgress size={isMobile ? 40 : 48} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                  กำลังโหลดข้อมูล...
                </Typography>
              </Box>
            )}
            
            {/* Content - จะคงอยู่แม้กำลังโหลด */}
            {vacantPositions.length === 0 && !loadingVacant ? (
              <Alert severity="warning" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                {(searchText || filterPosCode !== 'all') 
                  ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา'
                  : <>ไม่มีตำแหน่งว่างที่พร้อมใช้งานในปี {selectedYear}</>
                }
              </Alert>
            ) : (
              <List disablePadding sx={{ opacity: loadingVacant ? 0.5 : 1, transition: 'opacity 0.2s' }}>
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
          {!loadingVacant && totalVacantPositions > 0 && (
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

              {/* MUI Pagination */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  หน้า {drawerPage + 1} จาก {Math.ceil(totalVacantPositions / drawerRowsPerPage) || 1}
                </Typography>
                <Pagination
                  count={Math.ceil(totalVacantPositions / drawerRowsPerPage) || 1}
                  page={drawerPage + 1}
                  onChange={(_event, page) => setDrawerPage(page - 1)}
                  size={isMobile ? 'small' : 'medium'}
                  showFirstButton={!isMobile}
                  showLastButton={!isMobile}
                  siblingCount={isMobile ? 0 : 1}
                  boundaryCount={1}
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      minWidth: { xs: '28px', md: '32px' },
                      height: { xs: '28px', md: '32px' },
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
