'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  CloudUpload as ImportIcon,
  RestartAlt as ResetIcon,
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
  SwapHoriz as SwapHorizIcon,
  AssignmentTurnedIn as VacantIcon,
  ChangeHistory as ChangeHistoryIcon,
  MoreVert as MoreVertIcon,
  InfoOutlined as InfoOutlinedIcon,
  PersonAdd as PersonAddIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useTheme, useMediaQuery } from '@mui/material';
import DataTablePagination from '@/components/DataTablePagination';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import { EmptyState } from '@/app/components/EmptyState';

interface PolicePersonnel {
  id: string;
  noId?: string;
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
  supporterName?: string; // ผู้สนับสนุน/ผู้เสนอชื่อ
  supportReason?: string; // เหตุผลในการสนับสนุน
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// ฟังก์ชันตรวจสอบว่าเป็นตำแหน่งกันตำแหน่งหรือไม่ (รองรับทั้งมีเว้นวรรคและไม่มีเว้นวรรค)
const isReservedPosition = (fullName: string | null | undefined): boolean => {
  if (!fullName) return false;
  return fullName.includes('ว่าง (กันตำแหน่ง)') || fullName.includes('ว่าง(กันตำแหน่ง)');
};

export default function PolicePersonnelPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  
  // Cache สำหรับ list data เพื่อลดการโหลดซ้ำ
  const [listDataCache, setListDataCache] = useState<{
    year: number | null;
    timestamp: number;
    swapList: Set<string>;
    threeWayList: Set<string>;
    promotionChainList: Set<string>;
    vacantList: Set<string>;
  }>({
    year: null,
    timestamp: 0,
    swapList: new Set(),
    threeWayList: new Set(),
    promotionChainList: new Set(),
    vacantList: new Set()
  });
  
  const [data, setData] = useState<PolicePersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [nameSearch, setNameSearch] = useState<string | null>(null);
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [nameInputValue, setNameInputValue] = useState('');
  const [loadingNames, setLoadingNames] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [positionFilter, setPositionFilter] = useState<'all' | 'occupied' | 'vacant' | 'reserved'>('all');
  const [posCodeFilter, setPosCodeFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [supporterFilter, setSupporterFilter] = useState<'all' | 'with-supporter' | 'no-supporter'>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'two-way' | 'three-way' | 'promotion-chain'>('all');
  const [posCodes, setPosCodes] = useState<Array<{ id: number; name: string }>>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PolicePersonnel | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State สำหรับ Add to Swap
  const [addToSwapModalOpen, setAddToSwapModalOpen] = useState(false);
  const [selectedSwapYear, setSelectedSwapYear] = useState<number>(() => {
    const currentYear = new Date().getFullYear() + 543;
    // Default เป็นปีปัจจุบันเสมอ
    return currentYear;
  });
  const [swapNotes, setSwapNotes] = useState('');
  const [isAddingToSwap, setIsAddingToSwap] = useState(false);
  const [swapListData, setSwapListData] = useState<Set<string>>(new Set());

  // Three Way Swap states
  const [addToThreeWayModalOpen, setAddToThreeWayModalOpen] = useState(false);
  const [selectedThreeWayYear, setSelectedThreeWayYear] = useState<number>(() => {
    const currentYear = new Date().getFullYear() + 543;
    return currentYear;
  });
  const [threeWayNotes, setThreeWayNotes] = useState('');
  const [isAddingToThreeWay, setIsAddingToThreeWay] = useState(false);
  const [threeWayListData, setThreeWayListData] = useState<Set<string>>(new Set());

  // Promotion Chain states
  const [promotionChainData, setPromotionChainData] = useState<Set<string>>(new Set());

  // Vacant Position states
  const [vacantListData, setVacantListData] = useState<Set<string>>(new Set());
  const [addToVacantModalOpen, setAddToVacantModalOpen] = useState(false);
  const [selectedVacantYear, setSelectedVacantYear] = useState<number>(() => {
    const currentYear = new Date().getFullYear() + 543;
    return currentYear;
  });
  const [vacantNominator, setVacantNominator] = useState('');
  const [vacantRequestedPosition, setVacantRequestedPosition] = useState<number | null>(null);
  const [vacantNotes, setVacantNotes] = useState('');
  const [selectedVacantPersonnel, setSelectedVacantPersonnel] = useState<PolicePersonnel | null>(null);
  const [isAddingToVacant, setIsAddingToVacant] = useState(false);

  // Loading states สำหรับ icon actions (เก็บ nationalId ของคนที่กำลัง process)
  const [loadingSwap, setLoadingSwap] = useState<Set<string>>(new Set());
  const [loadingThreeWay, setLoadingThreeWay] = useState<Set<string>>(new Set());
  const [loadingVacant, setLoadingVacant] = useState<Set<string>>(new Set());

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPersonnel, setMenuPersonnel] = useState<PolicePersonnel | null>(null);

  // Add Supporter states
  const [addSupporterModalOpen, setAddSupporterModalOpen] = useState(false);
  const [selectedSupporterPersonnel, setSelectedSupporterPersonnel] = useState<PolicePersonnel | null>(null);
  const [supporterName, setSupporterName] = useState('');
  const [supportReason, setSupportReason] = useState('');
  const [isAddingSupporter, setIsAddingSupporter] = useState(false);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, personnel: PolicePersonnel) => {
    setAnchorEl(event.currentTarget);
    setMenuPersonnel(personnel);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setMenuPersonnel(null);
  }, []);

  // Memoize values ที่ใช้บ่อยๆ เพื่อลดการคำนวณซ้ำ
  const isInSwapList = useMemo(() => (nationalId: string | undefined) => {
    return nationalId ? swapListData.has(nationalId) : false;
  }, [swapListData]);

  const isInThreeWayList = useMemo(() => (nationalId: string | undefined) => {
    return nationalId ? threeWayListData.has(nationalId) : false;
  }, [threeWayListData]);

  const isInVacantList = useMemo(() => (nationalId: string | undefined) => {
    return nationalId ? vacantListData.has(nationalId) : false;
  }, [vacantListData]);



  // ดึงรายการทั้ง 3 ประเภทในครั้งเดียวเพื่อเพิ่ม performance พร้อม caching - ใช้ useCallback
  const fetchAllListsForCurrentYear = useCallback(async (forceRefresh = false) => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const now = Date.now();
      const cacheAge = now - listDataCache.timestamp;
      const CACHE_DURATION = 30000; // 30 วินาที
      
      // ใช้ cache ถ้าข้อมูลยังไม่เก่าเกินไปและเป็นปีเดียวกัน
      if (!forceRefresh && 
          listDataCache.year === currentYear && 
          cacheAge < CACHE_DURATION) {
        setSwapListData(listDataCache.swapList);
        setThreeWayListData(listDataCache.threeWayList);
        setPromotionChainData(listDataCache.promotionChainList);
        setVacantListData(listDataCache.vacantList);
        return;
      }
      
      // เรียก API พร้อมกัน 4 ตัวเพื่อลดเวลารอ
      const [swapResponse, threeWayResponse, promotionChainResponse, vacantResponse] = await Promise.all([
        fetch(`/api/swap-list?year=${currentYear}&swapType=two-way`),
        fetch(`/api/swap-list?year=${currentYear}&swapType=three-way`),
        fetch(`/api/swap-list?year=${currentYear}&swapType=promotion-chain`),
        fetch(`/api/vacant-position?year=${currentYear}`)
      ]);

      // Process swap list (two-way)
      const swapResult = await swapResponse.json();
      const swapNationalIds = swapResult.success 
        ? new Set<string>(swapResult.data.map((item: any) => item.nationalId).filter((id: string) => id))
        : new Set<string>();

      // Process three way list
      const threeWayResult = await threeWayResponse.json();
      const threeWayNationalIds = (threeWayResult.success && Array.isArray(threeWayResult.data))
        ? new Set<string>(threeWayResult.data.map((item: any) => item.nationalId).filter((id: string) => id))
        : new Set<string>();

      // Process promotion chain list
      const promotionChainResult = await promotionChainResponse.json();
      const promotionChainNationalIds = (promotionChainResult.success && Array.isArray(promotionChainResult.data))
        ? new Set<string>(promotionChainResult.data.map((item: any) => item.nationalId).filter((id: string) => id))
        : new Set<string>();

      // Process vacant list
      const vacantResult = await vacantResponse.json();
      const vacantNationalIds = Array.isArray(vacantResult)
        ? new Set<string>(vacantResult.map((item: any) => item.nationalId).filter((id: string) => id))
        : new Set<string>();

      // อัพเดท state และ cache
      setSwapListData(swapNationalIds);
      setThreeWayListData(threeWayNationalIds);
      setPromotionChainData(promotionChainNationalIds);
      setVacantListData(vacantNationalIds);
      
      // บันทึก cache
      setListDataCache({
        year: currentYear,
        timestamp: now,
        swapList: swapNationalIds,
        threeWayList: threeWayNationalIds,
        promotionChainList: promotionChainNationalIds,
        vacantList: vacantNationalIds
      });
      
    } catch (err) {
      console.error('Error fetching lists:', err);
    }
  }, [listDataCache]);

  // เก็บ function เดิมไว้สำหรับ backward compatibility
  const fetchSwapListForCurrentYear = async () => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/swap-list?year=${currentYear}&swapType=two-way`);
      const result = await response.json();
      if (result.success) {
        const nationalIds = new Set<string>(
          result.data
            .map((item: any) => item.nationalId)
            .filter((id: string) => id)
        );
        setSwapListData(nationalIds);
      }
    } catch (err) {
      console.error('Error fetching swap list:', err);
    }
  };

  const fetchThreeWayListForCurrentYear = async () => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/swap-list?year=${currentYear}&swapType=three-way`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        const nationalIds = new Set<string>(
          result.data
            .map((item: any) => item.nationalId)
            .filter((id: string) => id)
        );
        setThreeWayListData(nationalIds);
      }
    } catch (err) {
      console.error('Error fetching three way swap list:', err);
    }
  };

  const fetchVacantListForCurrentYear = async () => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/vacant-position?year=${currentYear}`);
      const result = await response.json();
      
      if (Array.isArray(result)) {
        const nationalIds = new Set<string>(
          result
            .map((item: any) => item.nationalId)
            .filter((id: string) => id)
        );
        setVacantListData(nationalIds);
      }
    } catch (err) {
      console.error('Error fetching vacant position list:', err);
    }
  };
  const fetchNameOptions = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setNameOptions([]);
      return;
    }

    setLoadingNames(true);
    try {
      const response = await fetch(`/api/police-personnel/search-names?q=${encodeURIComponent(query)}`);
      const result = await response.json();
      if (result.success) {
        setNameOptions(result.data);
      }
    } catch (err) {
      console.error('Error fetching name options:', err);
    } finally {
      setLoadingNames(false);
    }
  }, []);

  // Fetch pos codes for vacant position dialog and filter
  const fetchPosCodes = useCallback(async () => {
    try {
      const response = await fetch('/api/police-personnel/pos-codes');
      const result = await response.json();
      if (result.success) {
        setPosCodes(result.data);
      }
    } catch (err) {
      console.error('Error fetching pos codes:', err);
    }
  }, []);

  // Fetch units for filter
  const fetchUnits = useCallback(async () => {
    try {
      const response = await fetch('/api/police-personnel/units');
      const result = await response.json();
      if (result.success) {
        setUnits(result.data);
      }
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  }, []);

  // Debounce function สำหรับการค้นหา
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nameInputValue) {
        fetchNameOptions(nameInputValue);
      } else {
        setNameOptions([]);
      }
    }, 300); // รอ 300ms หลังจากพิมพ์

    return () => clearTimeout(timer);
  }, [nameInputValue, fetchNameOptions]);

  useEffect(() => {
    fetchPosCodes();
    fetchUnits();
    // ใช้ function ใหม่ที่รวมการโหลดทั้ง 3 รายการ
    fetchAllListsForCurrentYear();
  }, [fetchPosCodes, fetchUnits, fetchAllListsForCurrentYear]);

  const fetchData = async (abortSignal?: AbortSignal) => {
    setLoading(true);
    setError('');
    
    // Clear ข้อมูลเก่าทันทีเพื่อป้องกัน flicker
    setData([]);
    setTotal(0);
    
    try {
      const searchParam = nameSearch || search || '';
      const response = await fetch(
        `/api/police-personnel?page=${page + 1}&limit=${rowsPerPage}&search=${encodeURIComponent(searchParam)}&position=${positionFilter}&posCode=${posCodeFilter}&unit=${unitFilter}&supporter=${supporterFilter}&transactionType=${transactionTypeFilter}`,
        abortSignal ? { signal: abortSignal } : {}
      );
      
      if (abortSignal?.aborted) return;
      
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTotal(result.pagination.total);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } finally {
      if (!abortSignal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // ใช้ AbortController เพื่อป้องกัน race condition
    const abortController = new AbortController();
    
    // เพิ่ม debounce สำหรับ filter เพื่อลดการเรียก API
    const timer = setTimeout(() => {
      fetchData(abortController.signal);
    }, 200); // รอ 200ms หลังจาก filter เปลี่ยน
    
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [page, rowsPerPage, search, nameSearch, positionFilter, posCodeFilter, unitFilter, supporterFilter, transactionTypeFilter]);

  const handleReset = () => {
    setSearch('');
    setNameSearch(null);
    setNameInputValue('');
    setNameOptions([]);
    setPositionFilter('all');
    setPosCodeFilter('all');
    setUnitFilter('all');
    setSupporterFilter('all');
    setTransactionTypeFilter('all');
    setPage(0);
  };

  const handlePositionFilterChange = useCallback((value: 'all' | 'occupied' | 'vacant' | 'reserved') => {
    setPositionFilter(value);
    setPage(0);
  }, []);

  const handlePosCodeFilterChange = useCallback((value: string) => {
    setPosCodeFilter(value);
    setPage(0);
  }, []);

  const handleUnitFilterChange = useCallback((value: string) => {
    setUnitFilter(value);
    setPage(0);
  }, []);

  const handleSupporterFilterChange = useCallback((value: 'all' | 'with-supporter' | 'no-supporter') => {
    setSupporterFilter(value);
    setPage(0);
  }, []);

  const handleTransactionTypeFilterChange = useCallback((value: 'all' | 'two-way' | 'three-way' | 'promotion-chain') => {
    setTransactionTypeFilter(value);
    setPage(0);
  }, []);

  const handleViewDetail = useCallback((personnel: PolicePersonnel) => {
    setSelectedPersonnel(personnel);
    setDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
  }, []);

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
      supporterName: personnel.supporterName || '', // ผู้สนับสนุน
      supportReason: personnel.supportReason || '', // เหตุผลในการสนับสนุน
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

  // Handler สำหรับ Add Supporter
  const handleAddSupporter = (personnel: PolicePersonnel) => {
    setSelectedSupporterPersonnel(personnel);
    setSupporterName(personnel.supporterName || '');
    setSupportReason(personnel.supportReason || '');
    setAddSupporterModalOpen(true);
  };

  const handleAddSupporterConfirm = async () => {
    if (!selectedSupporterPersonnel) return;

    setIsAddingSupporter(true);
    try {
      const response = await fetch(`/api/police-personnel/${selectedSupporterPersonnel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supporterName: supporterName || null,
          supportReason: supportReason || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('บันทึกข้อมูลผู้สนับสนุนสำเร็จ');
        setAddSupporterModalOpen(false);
        setSelectedSupporterPersonnel(null);
        setSupporterName('');
        setSupportReason('');
        fetchData();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error) {
      console.error('Add supporter error:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsAddingSupporter(false);
    }
  };

  const handleAddSupporterCancel = () => {
    setAddSupporterModalOpen(false);
    setSelectedSupporterPersonnel(null);
    setSupporterName('');
    setSupportReason('');
  };

  // Handler สำหรับ Add to Swap
  const handleAddToSwap = (personnel: PolicePersonnel) => {
    // ตรวจสอบว่าอยู่ในรายการอื่นแล้วหรือไม่
    if (personnel.nationalId && threeWayListData.has(personnel.nationalId)) {
      toast.error('บุคคลนี้อยู่ในรายการสามเส้าแล้ว กรุณาลบออกจากรายการสามเส้าก่อน');
      return;
    }
    if (personnel.nationalId && vacantListData.has(personnel.nationalId)) {
      toast.error('บุคคลนี้ได้ยื่นขอตำแหน่งแล้ว กรุณายกเลิกคำขอก่อน');
      return;
    }

    // เพิ่ม loading state ทันที (เพื่อให้ user รู้ว่ากดแล้ว)
    if (personnel.nationalId) {
      setLoadingSwap(prev => new Set(prev).add(personnel.nationalId!));
    }

    setSelectedPersonnel(personnel);
    // Default เป็นปีปัจจุบันเสมอ
    const currentYear = new Date().getFullYear() + 543;
    setSelectedSwapYear(currentYear);
    setSwapNotes('');
    setAddToSwapModalOpen(true);
  };

  const handleAddToSwapConfirm = async () => {
    if (!selectedPersonnel) return;

    setIsAddingToSwap(true);
    try {
      const response = await fetch('/api/swap-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnel: selectedPersonnel, // ส่งข้อมูลบุคลากรทั้งหมด
          year: selectedSwapYear,
          notes: swapNotes || null
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'เพิ่มเข้ารายการสลับตำแหน่งสำเร็จ');
        setAddToSwapModalOpen(false);
        setSelectedPersonnel(null);
        setSwapNotes('');
        
        // อัพเดท state ทันที (ใช้ nationalId)
        if (selectedPersonnel.nationalId) {
          setSwapListData(prev => new Set(prev).add(selectedPersonnel.nationalId!));
        }
        
        // อัพเดท swap list
        fetchSwapListForCurrentYear();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
      }
    } catch (error) {
      console.error('Add to swap error:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
    } finally {
      setIsAddingToSwap(false);
      // ลบ loading state
      if (selectedPersonnel?.nationalId) {
        setLoadingSwap(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedPersonnel.nationalId!);
          return newSet;
        });
      }
    }
  };

  const handleAddToSwapCancel = () => {
    setAddToSwapModalOpen(false);
    setSelectedPersonnel(null);
    setSwapNotes('');
    // ลบ loading state เมื่อยกเลิก
    if (selectedPersonnel?.nationalId) {
      setLoadingSwap(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedPersonnel.nationalId!);
        return newSet;
      });
    }
  };

  // Three Way Swap Handlers
  const handleAddToThreeWay = (personnel: PolicePersonnel) => {
    // ตรวจสอบว่าอยู่ในรายการอื่นแล้วหรือไม่
    if (personnel.nationalId && swapListData.has(personnel.nationalId)) {
      toast.error('บุคคลนี้อยู่ในรายการสลับตำแหน่งแล้ว กรุณาลบออกจากรายการสลับตำแหน่งก่อน');
      return;
    }
    if (personnel.nationalId && vacantListData.has(personnel.nationalId)) {
      toast.error('บุคคลนี้ได้ยื่นขอตำแหน่งแล้ว กรุณายกเลิกคำขอก่อน');
      return;
    }

    // เพิ่ม loading state
    if (personnel.nationalId) {
      setLoadingThreeWay(prev => new Set(prev).add(personnel.nationalId!));
    }

    setSelectedPersonnel(personnel);
    setAddToThreeWayModalOpen(true);
    const currentYear = new Date().getFullYear() + 543;
    setSelectedThreeWayYear(currentYear);
    setThreeWayNotes('');
  };

  const handleAddToThreeWayConfirm = async () => {
    if (!selectedPersonnel) return;

    setIsAddingToThreeWay(true);
    try {
      const response = await fetch('/api/swap-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnel: selectedPersonnel,
          year: selectedThreeWayYear,
          swapType: 'three-way',
          notes: threeWayNotes || null
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('เพิ่มเข้ารายการสามเส้าสำเร็จ');
        setAddToThreeWayModalOpen(false);
        setSelectedPersonnel(null);
        setThreeWayNotes('');
        
        // อัพเดท state ทันที
        if (selectedPersonnel.nationalId) {
          setThreeWayListData(prev => new Set(prev).add(selectedPersonnel.nationalId!));
        }
        
        fetchThreeWayListForCurrentYear();
      } else {
        const result = await response.json();
        toast.error(result.error || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
      }
    } catch (error) {
      console.error('Add to three way swap error:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
    } finally {
      setIsAddingToThreeWay(false);
      // ลบ loading state
      if (selectedPersonnel?.nationalId) {
        setLoadingThreeWay(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedPersonnel.nationalId!);
          return newSet;
        });
      }
    }
  };

  const handleAddToThreeWayCancel = () => {
    setAddToThreeWayModalOpen(false);
    setSelectedPersonnel(null);
    setThreeWayNotes('');
    // ลบ loading state เมื่อยกเลิก
    if (selectedPersonnel?.nationalId) {
      setLoadingThreeWay(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedPersonnel.nationalId!);
        return newSet;
      });
    }
  };

  const handleRemoveFromThreeWay = async (nationalId: string) => {
    // เพิ่ม loading state
    setLoadingThreeWay(prev => new Set(prev).add(nationalId));
    
    try {
      const currentYear = new Date().getFullYear() + 543;
      
      // ค้นหา record ใน swap_list
      const listResponse = await fetch(`/api/swap-list?year=${currentYear}&swapType=three-way`);
      const listResult = await listResponse.json();
      
      if (!listResult.success) {
        throw new Error('Failed to fetch swap list');
      }
      
      const swapItem = listResult.data.find((item: any) => item.nationalId === nationalId);
      
      if (!swapItem) {
        throw new Error('ไม่พบรายการในระบบ');
      }
      
      // ลบออก
      const response = await fetch(`/api/swap-list/${swapItem.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        // ถ้า HTTP status ไม่ใช่ 2xx ให้ throw error พร้อมข้อความจาก API
        let errorMessage = result.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // ถ้ามี detail field ให้รวมเข้าด้วยกัน (สำหรับ API ที่ส่ง detail แยก)
        if (result.detail && !errorMessage.includes(result.detail)) {
          errorMessage += ` ${result.detail}`;
        }
        
        throw new Error(errorMessage);
      }

      if (result.success) {
        toast.success('ลบออกจากรายการสามเส้าแล้ว');
        
        // อัพเดท state ทันที
        setThreeWayListData(prev => {
          const newSet = new Set(prev);
          newSet.delete(nationalId);
          return newSet;
        });
        
        fetchAllListsForCurrentYear(true); // force refresh เพื่อให้ได้ข้อมูลล่าสุด
      } else {
        // แสดงข้อความ error ที่ละเอียดจาก API
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (error: any) {
      console.error('Remove from three way swap error:', error);
      
      // ถ้ามี error message จาก API ให้ใช้ error message นั้น
      let errorMessage = 'เกิดข้อผิดพลาดในการลบข้อมูล';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      // ลบ loading state
      setLoadingThreeWay(prev => {
        const newSet = new Set(prev);
        newSet.delete(nationalId);
        return newSet;
      });
    }
  };

  const handleRemoveFromSwap = async (nationalId: string) => {
    // เพิ่ม loading state
    setLoadingSwap(prev => new Set(prev).add(nationalId));
    
    try {
      const currentYear = new Date().getFullYear() + 543;
      
      // ค้นหา record ใน swap_list
      const listResponse = await fetch(`/api/swap-list?year=${currentYear}&swapType=two-way`);
      const listResult = await listResponse.json();
      
      if (!listResult.success) {
        throw new Error('Failed to fetch swap list');
      }
      
      const swapItem = listResult.data.find((item: any) => item.nationalId === nationalId);
      
      if (!swapItem) {
        throw new Error('ไม่พบรายการในระบบ');
      }
      
      // ลบออกโดยใช้ ID
      const response = await fetch(`/api/swap-list/${swapItem.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        // ถ้า HTTP status ไม่ใช่ 2xx ให้ throw error พร้อมข้อความจาก API
        let errorMessage = result.error || `HTTP ${response.status}: ${response.statusText}`;
        
        // ถ้ามี detail field ให้รวมเข้าด้วยกัน (สำหรับ API ที่ส่ง detail แยก)
        if (result.detail && !errorMessage.includes(result.detail)) {
          errorMessage += ` ${result.detail}`;
        }
        
        throw new Error(errorMessage);
      }

      if (result.success) {
        toast.success('ลบออกจากรายการสลับตำแหน่งสำเร็จ');
        
        // อัพเดท state ทันที
        setSwapListData(prev => {
          const newSet = new Set(prev);
          newSet.delete(nationalId);
          return newSet;
        });
        
        fetchAllListsForCurrentYear(true); // force refresh เพื่อให้ได้ข้อมูลล่าสุด
      } else {
        // แสดง error message ที่ละเอียดขึ้น
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (error: any) {
      console.error('Remove from swap error:', error);
      
      // ถ้ามี error message จาก API ให้ใช้ error message นั้น
      let errorMessage = 'เกิดข้อผิดพลาดในการลบข้อมูล';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      // ลบ loading state
      setLoadingSwap(prev => {
        const newSet = new Set(prev);
        newSet.delete(nationalId);
        return newSet;
      });
    }
  };

  // Vacant Position Handlers
  const handleAddToVacant = async (personnel: PolicePersonnel) => {
    // ตรวจสอบว่าอยู่ในรายการอื่นแล้วหรือไม่
    const status = getPersonnelStatus(personnel.nationalId);
    if (status.isInSwap) {
      toast.error('บุคคลนี้อยู่ในรายการสลับตำแหน่งแล้ว กรุณาลบออกจากรายการสลับตำแหน่งก่อน');
      return;
    }
    if (status.isInThreeWay) {
      toast.error('บุคคลนี้อยู่ในรายการสามเส้าแล้ว กรุณาลบออกจากรายการสามเส้าก่อน');
      return;
    }

    // เปิด modal สำหรับกรอกข้อมูล
    setSelectedVacantPersonnel(personnel);
    const currentYear = new Date().getFullYear() + 543;
    setSelectedVacantYear(currentYear);
    setVacantNominator('');
    setVacantRequestedPosition(null);
    setVacantNotes('');
    setAddToVacantModalOpen(true);
  };

  const handleConfirmAddToVacant = async () => {
    if (!selectedVacantPersonnel) return;

    // เพิ่ม loading state สำหรับ modal button
    setIsAddingToVacant(true);
    
    // เพิ่ม loading state สำหรับ icon
    if (selectedVacantPersonnel.nationalId) {
      setLoadingVacant(prev => new Set(prev).add(selectedVacantPersonnel.nationalId!));
    }

    try {
      // ตรวจสอบว่ามีตำแหน่งที่ขอหรือไม่
      if (!vacantRequestedPosition) {
        toast.error('กรุณาเลือกตำแหน่งที่ขอ');
        setIsAddingToVacant(false);
        if (selectedVacantPersonnel.nationalId) {
          setLoadingVacant(prev => {
            const newSet = new Set(prev);
            newSet.delete(selectedVacantPersonnel.nationalId!);
            return newSet;
          });
        }
        return;
      }

      const response = await fetch('/api/vacant-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedVacantPersonnel,
          originalPersonnelId: selectedVacantPersonnel.id,
          year: selectedVacantYear,
          nominator: vacantNominator || null,
          requestedPositionId: vacantRequestedPosition,
          notes: vacantNotes || null
        }),
      });

      if (response.ok) {
        toast.success('ยื่นขอตำแหน่งสำเร็จ');
        
        // อัพเดท state ทันที (ใช้ nationalId)
        if (selectedVacantPersonnel.nationalId) {
          setVacantListData(prev => new Set(prev).add(selectedVacantPersonnel.nationalId!));
        }
        
        fetchVacantListForCurrentYear();

        // ปิด modal และ clear form
        setAddToVacantModalOpen(false);
        setSelectedVacantPersonnel(null);
        setSelectedVacantYear(new Date().getFullYear() + 543);
        setVacantNominator('');
        setVacantRequestedPosition(null);
        setVacantNotes('');
      } else {
        const result = await response.json();
        toast.error(result.error || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
      }
    } catch (error) {
      console.error('Add to vacant position error:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
    } finally {
      // ลบ loading state
      setIsAddingToVacant(false);
      if (selectedVacantPersonnel.nationalId) {
        setLoadingVacant(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedVacantPersonnel.nationalId!);
          return newSet;
        });
      }
    }
  };

  const handleRemoveFromVacant = async (nationalId: string) => {
    // เพิ่ม loading state
    setLoadingVacant(prev => new Set(prev).add(nationalId));
    
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(
        `/api/vacant-position?nationalId=${nationalId}&year=${currentYear}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('ยกเลิกการยื่นขอตำแหน่งแล้ว');
        
        // อัพเดท state ทันที
        setVacantListData(prev => {
          const newSet = new Set(prev);
          newSet.delete(nationalId);
          return newSet;
        });
        
        fetchVacantListForCurrentYear();
      } else {
        // แสดง error message จาก API
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || 'เกิดข้อผิดพลาดในการลบข้อมูล';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Remove from vacant position error:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      // ลบ loading state
      setLoadingVacant(prev => {
        const newSet = new Set(prev);
        newSet.delete(nationalId);
        return newSet;
      });
    }
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

  // Memoize การคำนวณ status สำหรับ performance
  const personnelStatus = useMemo(() => {
    const statusMap = new Map<string, {
      isInSwap: boolean;
      isInThreeWay: boolean;
      isInPromotionChain: boolean;
      isInVacant: boolean;
    }>();

    data.forEach(person => {
      if (person.nationalId) {
        statusMap.set(person.nationalId, {
          isInSwap: swapListData.has(person.nationalId),
          isInThreeWay: threeWayListData.has(person.nationalId),
          isInPromotionChain: promotionChainData.has(person.nationalId),
          isInVacant: vacantListData.has(person.nationalId),
        });
      }
    });

    return statusMap;
  }, [data, swapListData, threeWayListData, promotionChainData, vacantListData]);

  // Helper function สำหรับเช็ค status
  const getPersonnelStatus = useCallback((nationalId: string | undefined) => {
    if (!nationalId) return { isInSwap: false, isInThreeWay: false, isInPromotionChain: false, isInVacant: false };
    return personnelStatus.get(nationalId) || { isInSwap: false, isInThreeWay: false, isInPromotionChain: false, isInVacant: false };
  }, [personnelStatus]);

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
        <Paper sx={{ borderRadius: 2 }}>
          <EmptyState
            icon={PersonIcon}
            title="ไม่พบข้อมูลบุคลากร"
            description="เริ่มต้นโดยการนำเข้าข้อมูลบุคลากรตำรวจ"
            actionLabel="นำเข้าข้อมูล"
            onAction={() => router.push('/police-personnel/import')}
            variant="compact"
          />
        </Paper>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <BadgeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {person.positionNumber || 'ไม่ระบุเลขตำแหน่ง'}
                      </Typography>
                    </Box>
                    {person.posCodeMaster && (
                      <Chip 
                        label={`${person.posCodeMaster.id} - ${person.posCodeMaster.name}`} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {person.rank && person.supporterName && (
                      <Tooltip title="มีผู้สนับสนุน" arrow>
                        <StarIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                      </Tooltip>
                    )}
                    {!person.rank && (
                      <Chip
                        label="ว่าง"
                        color="default"
                        size="small"
                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
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
                      isReservedPosition(person.fullName)
                        ? 'ว่าง (กันตำแหน่ง)'
                        : 'ว่าง'
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

                {/* ผู้สนับสนุน และ เหตุผล */}
                {(person.supporterName || person.supportReason) && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    {person.supporterName && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: person.supportReason ? 0.5 : 0 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          ผู้สนับสนุน: {person.supporterName}
                        </Typography>
                      </Box>
                    )}
                    {person.supportReason && (
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 16, color: 'info.main', mt: 0.1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          เหตุผล: {person.supportReason}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {/* Chip แสดงสถานะ Swap List */}
                {person.rank && getPersonnelStatus(person.nationalId).isInSwap && (
                  <Chip 
                    label="อยู่ในสลับตำแหน่ง" 
                    size="small" 
                    color="info"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
                {/* Chip แสดงสถานะ Three Way Swap */}
                {person.rank && person.nationalId && threeWayListData.has(person.nationalId) && (
                  <Chip 
                    label="อยู่ในสามเส้า" 
                    size="small" 
                    color="warning"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
                {/* Chip แสดงสถานะ Promotion Chain */}
                {person.rank && person.nationalId && promotionChainData.has(person.nationalId) && (
                  <Chip 
                    label="เลื่อนตำแหน่ง" 
                    size="small" 
                    color="success"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
                
                {/* ปุ่มฝั่งขวา: เพิ่มผู้สนับสนุน + ดูรายละเอียด + Menu */}
                <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {person.rank && (
                    <Tooltip title="เพิ่ม/แก้ไขผู้สนับสนุน" leaveDelay={0} disableFocusListener>
                      <IconButton
                        size="small"
                        onClick={() => handleAddSupporter(person)}
                        sx={{
                          border: 1,
                          borderColor: 'success.main',
                          borderRadius: 2,
                          color: 'success.main',
                          '&:hover': {
                            bgcolor: 'success.main',
                            color: 'white',
                          }
                        }}
                      >
                        <PersonAddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  <Tooltip title="ดูรายละเอียด" leaveDelay={0} disableFocusListener>
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetail(person)}
                      sx={{
                        border: 1,
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'primary.main',
                          color: 'white',
                        }
                      }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="เมนู" leaveDelay={0} disableFocusListener>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, person)}
                      sx={{
                        border: 1,
                        borderColor: 'grey.400',
                        borderRadius: 2,
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
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
                    <Tooltip title="มุมมองตาราง" leaveDelay={0} disableFocusListener>
                      <ViewListIcon />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="card" aria-label="card view">
                    <Tooltip title="มุมมองการ์ด" leaveDelay={0} disableFocusListener>
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

          {/* Search by Name - Autocomplete + Filters */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Autocomplete
              size="small"
              options={nameOptions}
              value={nameSearch}
              inputValue={nameInputValue}
              onInputChange={(event, newInputValue, reason) => {
                // ป้องกัน undefined และรักษา controlled state
                setNameInputValue(newInputValue || '');
              }}
              onChange={(event, newValue) => {
                setNameSearch(newValue);
                setPage(0);
              }}
              loading={loadingNames}
              loadingText="กำลังค้นหา..."
              noOptionsText={nameInputValue.length < 1 ? "พิมพ์เพื่อค้นหา..." : "ไม่พบข้อมูล"}
              sx={{ 
                flex: { 
                  xs: '1 1 100%',        // Mobile: full width
                  sm: '1 1 100%',        // Small tablet: full width
                  md: '1 1 auto'         // Desktop/iPad landscape: auto flex
                }, 
                minWidth: { xs: '100%', sm: '100%', md: 300 } 
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ค้นหาจากชื่อ-นามสกุล"
                  placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <FormControl size="small" sx={{ 
              flex: { 
                xs: '1 1 100%',              // Mobile: full width
                sm: '1 1 calc(50% - 8px)',   // Small tablet: 2 columns
                md: '0 1 180px'              // Desktop/iPad landscape: fixed width
              }, 
              minWidth: 150 
            }}>
              <InputLabel>สถานะตำแหน่ง</InputLabel>
              <Select
                value={positionFilter}
                label="สถานะตำแหน่ง"
                onChange={(e) => handlePositionFilterChange(e.target.value as 'all' | 'occupied' | 'vacant' | 'reserved')}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="occupied">มีผู้ดำรง</MenuItem>
                <MenuItem value="vacant">ว่าง</MenuItem>
                <MenuItem value="reserved">ว่าง (กันตำแหน่ง)</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ 
              flex: { 
                xs: '1 1 100%',              // Mobile: full width
                sm: '1 1 calc(50% - 8px)',   // Small tablet: 2 columns
                md: '0 1 200px'              // Desktop/iPad landscape: fixed width
              }, 
              minWidth: 150 
            }}>
              <InputLabel>รหัสตำแหน่ง</InputLabel>
              <Select
                value={posCodeFilter}
                label="รหัสตำแหน่ง"
                onChange={(e) => handlePosCodeFilterChange(e.target.value)}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {posCodes.map((posCode) => (
                  <MenuItem key={posCode.id} value={posCode.id.toString()}>
                    {posCode.id} - {posCode.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ 
              flex: { 
                xs: '1 1 100%',              // Mobile: full width
                sm: '1 1 calc(50% - 8px)',   // Small tablet: 2 columns
                md: '0 1 200px'              // Desktop/iPad landscape: fixed width
              }, 
              minWidth: 150 
            }}>
              <InputLabel>หน่วย</InputLabel>
              <Select
                value={unitFilter}
                label="หน่วย"
                onChange={(e) => handleUnitFilterChange(e.target.value)}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                {units.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Supporter Filter & Search - New Row */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ 
              flex: { 
                xs: '1 1 100%',              // Mobile: full width
                sm: '1 1 calc(50% - 8px)',   // Small tablet: 2 columns
                md: '0 1 200px'              // Desktop/iPad landscape: fixed width
              }, 
              minWidth: 150 
            }}>
              <InputLabel>ผู้สนับสนุน</InputLabel>
              <Select
                value={supporterFilter}
                label="ผู้สนับสนุน"
                onChange={(e) => handleSupporterFilterChange(e.target.value as 'all' | 'with-supporter' | 'no-supporter')}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="with-supporter">มีผู้สนับสนุน</MenuItem>
                <MenuItem value="no-supporter">ไม่มีผู้สนับสนุน</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ 
              flex: { 
                xs: '1 1 100%',              // Mobile: full width
                sm: '1 1 calc(50% - 8px)',   // Small tablet: 2 columns
                md: '0 1 200px'              // Desktop/iPad landscape: fixed width
              }, 
              minWidth: 150 
            }}>
              <InputLabel>ประเภทรายการ</InputLabel>
              <Select
                value={transactionTypeFilter}
                label="ประเภทรายการ"
                onChange={(e) => handleTransactionTypeFilterChange(e.target.value as 'all' | 'two-way' | 'three-way' | 'promotion-chain')}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="two-way">สลับตำแหน่ง</MenuItem>
                <MenuItem value="three-way">อยู่ในสามเส้า</MenuItem>
                <MenuItem value="promotion-chain">เลื่อนตำแหน่ง</MenuItem>
              </Select>
            </FormControl>

            {/* ช่องค้นหาหลัก */}
            <TextField
              size="small"
              placeholder="ค้นหาด้วย เลขบัตรประชาชน, เลขตำแหน่ง, หมายเหตุ..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              sx={{ 
                flex: { 
                  xs: '1 1 100%',           // Mobile: full width
                  sm: '1 1 auto',           // Tablet: auto flex
                  md: '1 1 auto'            // Desktop: auto flex
                },
                minWidth: { xs: '100%', sm: 300, md: 300 }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title="รีเซ็ต" leaveDelay={0} disableFocusListener>
              <IconButton 
                onClick={handleReset} 
                color="secondary"
              >
                <ResetIcon />
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
                  <TableCell>ผู้สนับสนุน</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        กำลังโหลดข้อมูล...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ p: 0, border: 'none' }}>
                      <EmptyState
                        icon={PersonIcon}
                        title="ไม่พบข้อมูลบุคลากร"
                        description="เริ่มต้นโดยการนำเข้าข้อมูลบุคลากรตำรวจ"
                        actionLabel="นำเข้าข้อมูล"
                        onAction={() => router.push('/police-personnel/import')}
                        variant="compact"
                      />
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
                          {isReservedPosition(row.fullName)
                            ? 'ว่าง (กันตำแหน่ง)'
                            : (row.fullName || 'ว่าง')
                          }
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
                        {row.supporterName ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                              {row.supporterName}
                            </Typography>
                            {row.supportReason && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                sx={{ 
                                  display: 'block',
                                  maxWidth: 120,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={row.supportReason}
                              >
                                {row.supportReason}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {row.rank && row.supporterName && (
                            <Tooltip title="มีผู้สนับสนุน" arrow>
                              <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                            </Tooltip>
                          )}
                          {!row.rank && (
                            <Chip label="ว่าง" color="default" size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                          {/* Chip แสดงสถานะ Swap List */}
                          {row.rank && getPersonnelStatus(row.nationalId).isInSwap && (
                            <Chip 
                              label="อยู่ใน Swap List" 
                              size="small" 
                              color="info"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                          {/* Chip แสดงสถานะ Three Way Swap */}
                          {row.rank && row.nationalId && threeWayListData.has(row.nationalId) && (
                            <Chip 
                              label="อยู่ในสามเส้า" 
                              size="small" 
                              color="warning"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                          {/* Chip แสดงสถานะ Vacant Position */}
                          {row.rank && row.nationalId && vacantListData.has(row.nationalId) && (
                            <Chip 
                              label="ยื่นขอตำแหน่ง" 
                              size="small" 
                              color="success"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                          
                          {/* ปุ่มฝั่งขวา: เพิ่มผู้สนับสนุน + ดูรายละเอียด + Menu */}
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                            {row.rank && (
                              <Tooltip title="เพิ่ม/แก้ไขผู้สนับสนุน" leaveDelay={0} disableFocusListener>
                                <IconButton
                                  size="small"
                                  onClick={() => handleAddSupporter(row)}
                                  sx={{
                                    border: 1,
                                    borderColor: 'success.main',
                                    borderRadius: 1,
                                    color: 'success.main',
                                    '&:hover': {
                                      bgcolor: 'success.main',
                                      color: 'white',
                                    }
                                  }}
                                >
                                  <PersonAddIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            <Tooltip title="ดูรายละเอียด" leaveDelay={0} disableFocusListener>
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetail(row)}
                                sx={{
                                  border: 1,
                                  borderColor: 'primary.main',
                                  borderRadius: 1,
                                  color: 'primary.main',
                                  '&:hover': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                  }
                                }}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="เมนู" leaveDelay={0} disableFocusListener>
                              <IconButton 
                                size="small"
                                onClick={(e) => handleMenuOpen(e, row)}
                                sx={{
                                  border: 1,
                                  borderColor: 'grey.400',
                                  borderRadius: 1,
                                }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
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

        {/* Detail Modal - Using Reusable Component */}
        <PersonnelDetailModal 
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          personnel={selectedPersonnel}
          loading={false}
          onClearData={() => setSelectedPersonnel(null)}
        />

        {/* Edit Dialog */}
        <Dialog 
          key={`edit-${editModalOpen}-${isMobile}`} // Force re-render when mobile state changes
          open={editModalOpen} 
          onClose={handleEditClose} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
          TransitionProps={{
            timeout: 0, // ปิด transition เพื่อป้องกัน overlay ชั่วขณะ
          }}
          sx={{
            '& .MuiDialog-root': {
              zIndex: '20000 !important', // เหมือนกับ PersonnelDetailModal
            },
            '& .MuiDialog-container': {
              zIndex: '20000 !important',
            },
            '& .MuiDialog-paper': {
              zIndex: '20000 !important',
              position: 'relative',
            },
            '& .MuiBackdrop-root': {
              zIndex: '19999 !important', // ต่ำกว่า content นิดหน่อย
            },
            zIndex: '20000 !important',
            position: 'fixed',
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
            <PersonIcon fontSize="small" />
            <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
              แก้ไขข้อมูลบุคลากร
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
            <Stack spacing={{ xs: 2, sm: 3 }}>
              {/* ข้อมูลบุคคล */}
              <Paper sx={{                 
                p: { xs: 2, sm: 3 },
                mt: { xs: 1.5, sm: 5 },                 
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
                      value={editFormData.rank || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, rank: e.target.value })}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <RankIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                          </InputAdornment>
                        )
                      }}
                    />
                    <TextField
                      fullWidth
                      label="ชื่อ-สกุล"
                      value={editFormData.fullName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="เลขบัตรประชาชน"
                      value={editFormData.nationalId || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nationalId: e.target.value })}
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
                      label="อายุ"
                      value={editFormData.age || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="อาวุโส"
                      value={editFormData.seniority || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, seniority: e.target.value })}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ServiceIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                          </InputAdornment>
                        )
                      }}
                    />
                    <TextField
                      fullWidth
                      label="คุณวุฒิ"
                      value={editFormData.education || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, education: e.target.value })}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EducationIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
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
                  <PositionIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                  <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                    ข้อมูลตำแหน่ง
                  </Typography>
                </Box>
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="ตำแหน่ง"
                      value={editFormData.position || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="เลขตำแหน่ง"
                      value={editFormData.positionNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, positionNumber: e.target.value })}
                      variant="outlined"
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="หน่วย"
                      value={editFormData.unit || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                          </InputAdornment>
                        )
                      }}
                    />
                    <TextField
                      fullWidth
                      label="ทำหน้าที่"
                      value={editFormData.actingAs || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, actingAs: e.target.value })}
                      variant="outlined"
                      size="small"
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
                      value={editFormData.birthDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="แต่งตั้งครั้งสุดท้าย"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.lastAppointment || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, lastAppointment: e.target.value })}
                      variant="outlined"
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
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="บรรจุ"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.enrollmentDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, enrollmentDate: e.target.value })}
                      variant="outlined"
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
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="จำนวนปี"
                      value={editFormData.yearsOfService || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, yearsOfService: e.target.value })}
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
                  <EducationIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                  <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                    ข้อมูลการฝึกอบรม
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    label="สถานที่ฝึกอบรม (ตท.)"
                    value={editFormData.trainingLocation || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, trainingLocation: e.target.value })}
                    variant="outlined"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="หลักสูตร (นรต.)"
                    value={editFormData.trainingCourse || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, trainingCourse: e.target.value })}
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
                    value={editFormData.supporterName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, supporterName: e.target.value })}
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
                    value={editFormData.supportReason || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, supportReason: e.target.value })}
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
                  <InfoOutlinedIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                  <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.938rem' }}>
                    หมายเหตุ
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="หมายเหตุเพิ่มเติม"
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
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
              onClick={handleEditClose} 
              variant="outlined" 
              size="medium"
              disabled={isSaving}
              sx={{ 
                minWidth: 100,
                borderRadius: 1.5
              }}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleEditSave} 
              variant="contained" 
              size="medium"
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
              sx={{ 
                minWidth: 120,
                borderRadius: 1.5
              }}
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ pb: 1 }}>
            <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
              ยืนยันการลบข้อมูล
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              ต้องการลบข้อมูล "{selectedPersonnel?.fullName || selectedPersonnel?.position}" ใช่หรือไม่?
            </Typography>
            <Alert severity="warning" sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.813rem' }}>
                การลบข้อมูลนี้ไม่สามารถย้อนกลับได้
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.5 }}>
            <Button onClick={handleDeleteCancel} variant="outlined" size="medium" disabled={isDeleting}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              variant="contained" 
              color="error"
              size="medium"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isDeleting ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Supporter Dialog */}
        <Dialog 
          key={`supporter-${addSupporterModalOpen}-${isMobile}`}
          open={addSupporterModalOpen} 
          onClose={handleAddSupporterCancel} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
          TransitionProps={{
            timeout: 0,
          }}
          sx={{
            '& .MuiDialog-root': {
              zIndex: '20000 !important',
            },
            '& .MuiDialog-container': {
              zIndex: '20000 !important',
            },
            '& .MuiDialog-paper': {
              zIndex: '20000 !important',
              position: 'relative',
            },
            '& .MuiBackdrop-root': {
              zIndex: '19999 !important',
            },
            zIndex: '20000 !important',
            position: 'fixed',
          }}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: '600px' },
              height: { xs: '100%', md: 'auto' },
              maxHeight: { xs: '100%', md: '90vh' },
              margin: { xs: 0, sm: '32px' },
              borderRadius: { xs: 0, sm: 1 },
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
            <PersonAddIcon color="success" fontSize="small" />
            <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
              เพิ่ม/แก้ไขผู้สนับสนุน
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ 
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, md: 3 },
            backgroundColor: 'grey.50'
          }}>
            <Stack spacing={2}>
              {/* แสดงข้อมูลบุคลากรที่เลือก */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  บุคลากรที่เลือก
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  {selectedSupporterPersonnel?.rank} {selectedSupporterPersonnel?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ตำแหน่ง: {selectedSupporterPersonnel?.position || '-'}
                </Typography>
                {selectedSupporterPersonnel?.posCodeMaster && (
                  <Typography variant="body2" color="text.secondary">
                    รหัสตำแหน่ง: {selectedSupporterPersonnel.posCodeMaster.id} - {selectedSupporterPersonnel.posCodeMaster.name}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  หน่วย: {selectedSupporterPersonnel?.unit || '-'}
                </Typography>
                
                {/* แสดงข้อมูลเพิ่มเติม: อายุ, จำนวนปี, นรต. */}
                <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {selectedSupporterPersonnel?.age && (
                    <Typography variant="body2" color="text.secondary">
                      อายุ: {selectedSupporterPersonnel.age}
                    </Typography>
                  )}
                  {selectedSupporterPersonnel?.yearsOfService && (
                    <Typography variant="body2" color="text.secondary">
                      จำนวนปี: {selectedSupporterPersonnel.yearsOfService}
                    </Typography>
                  )}
                  {selectedSupporterPersonnel?.trainingCourse && (
                    <Typography variant="body2" color="text.secondary">
                      นรต.{selectedSupporterPersonnel.trainingCourse}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* ชื่อผู้สนับสนุน */}
              <TextField
                fullWidth
                label="ชื่อผู้สนับสนุน/ผู้เสนอชื่อ"
                value={supporterName}
                onChange={(e) => setSupporterName(e.target.value)}
                placeholder="ระบุชื่อผู้สนับสนุน..."
                size="medium"
              />

              {/* เหตุผลในการสนับสนุน */}
              <TextField
                fullWidth
                multiline
                rows={4}
                label="เหตุผลในการสนับสนุน"
                value={supportReason}
                onChange={(e) => setSupportReason(e.target.value)}
                placeholder="ระบุเหตุผลในการสนับสนุน..."
                size="medium"
              />
            </Stack>
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
              onClick={handleAddSupporterCancel} 
              variant="outlined" 
              size="medium"
              disabled={isAddingSupporter}
              sx={{ 
                minWidth: 100,
                borderRadius: 1.5
              }}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleAddSupporterConfirm} 
              variant="contained" 
              color="success"
              size="medium"
              disabled={isAddingSupporter}
              startIcon={isAddingSupporter ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
              sx={{ 
                minWidth: 120,
                borderRadius: 1.5
              }}
            >
              {isAddingSupporter ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add to Swap Dialog */}
        <Dialog open={addToSwapModalOpen} onClose={handleAddToSwapCancel} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SwapHorizIcon color="info" />
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                เพิ่มเข้ารายการสลับตำแหน่ง
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 , mt: 2 }}>
            <Stack spacing={2}>
              {/* แสดงข้อมูลบุคลากรที่เลือก */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.200'
                
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  บุคลากรที่เลือก
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {selectedPersonnel?.rank} {selectedPersonnel?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ตำแหน่ง: {selectedPersonnel?.position || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  หน่วย: {selectedPersonnel?.unit || '-'}
                </Typography>
              </Box>

              {/* เลือกปี */}
              <FormControl fullWidth>
                <InputLabel>ปี (พ.ศ.)</InputLabel>
                <Select
                  value={selectedSwapYear}
                  label="ปี (พ.ศ.)"
                  onChange={(e) => setSelectedSwapYear(Number(e.target.value))}
                >
                  {(() => {
                    const currentYear = new Date().getFullYear() + 543;
                    
                    // แสดงปีปัจจุบันและปีก่อนหน้า
                    // เช่น ปี 2568: แสดง 2568
                    //      ปี 2569: แสดง 2569, 2568
                    const years = [currentYear, currentYear - 1];
                    
                    return years.map(year => {
                      const isCurrent = year === currentYear;
                      return (
                        <MenuItem key={year} value={year}>
                          {year} {isCurrent}
                        </MenuItem>
                      );
                    });
                  })()}
                </Select>
              </FormControl>

              {/* หมายเหตุ */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="หมายเหตุ (ถ้ามี)"
                placeholder="เช่น เหตุผลในการพิจารณาสลับตำแหน่ง, ข้อมูลเพิ่มเติม..."
                value={swapNotes}
                onChange={(e) => setSwapNotes(e.target.value)}
              />

              <Alert severity="info" sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.813rem' }}>
                  บุคลากรที่เพิ่มเข้ารายการจะสามารถดูและจัดการได้ในหน้า "สลับตำแหน่ง"
                </Typography>
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleAddToSwapCancel} variant="outlined" size="medium" disabled={isAddingToSwap}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleAddToSwapConfirm} 
              variant="contained" 
              color="info"
              size="medium"
              sx={{ minWidth: 120 }}
              disabled={isAddingToSwap}
              startIcon={isAddingToSwap ? <CircularProgress size={16} color="inherit" /> : <SwapHorizIcon />}
            >
              {isAddingToSwap ? 'กำลังเพิ่ม...' : 'เพิ่มเข้ารายการ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add to Three Way Swap Dialog */}
        <Dialog open={addToThreeWayModalOpen} onClose={handleAddToThreeWayCancel} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChangeHistoryIcon color="warning" />
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                เพิ่มเข้ารายการสามเส้า
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2, mt: 2 }}>
            <Stack spacing={2}>
              {/* แสดงข้อมูลบุคลากรที่เลือก */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  บุคลากรที่เลือก
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  {selectedPersonnel?.rank} {selectedPersonnel?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ตำแหน่ง: {selectedPersonnel?.position || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  หน่วย: {selectedPersonnel?.unit || '-'}
                </Typography>
              </Box>

              {/* เลือกปี */}
              <FormControl fullWidth>
                <InputLabel>ปี (พ.ศ.)</InputLabel>
                <Select
                  value={selectedThreeWayYear}
                  label="ปี (พ.ศ.)"
                  onChange={(e) => setSelectedThreeWayYear(Number(e.target.value))}
                >
                  {(() => {
                    const currentYear = new Date().getFullYear() + 543;
                    const years = [currentYear, currentYear - 1];
                    
                    return years.map(year => {
                      const isCurrent = year === currentYear;
                      return (
                        <MenuItem key={year} value={year}>
                          {year} {isCurrent}
                        </MenuItem>
                      );
                    });
                  })()}
                </Select>
              </FormControl>

              {/* หมายเหตุ */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="หมายเหตุ (ถ้ามี)"
                placeholder="เช่น เหตุผลในการเลือก, ข้อมูลเพิ่มเติม..."
                value={threeWayNotes}
                onChange={(e) => setThreeWayNotes(e.target.value)}
              />

              <Alert severity="info" sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.813rem' }}>
                  การสลับตำแหน่ง 3 คน โดยแต่ละคนห้ามอยู่ตำแหน่งเดิม (A→B, B→C, C→A)
                </Typography>
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleAddToThreeWayCancel} variant="outlined" size="medium" disabled={isAddingToThreeWay}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleAddToThreeWayConfirm} 
              variant="contained" 
              color="warning"
              size="medium"
              sx={{ minWidth: 120 }}
              disabled={isAddingToThreeWay}
              startIcon={isAddingToThreeWay ? <CircularProgress size={16} color="inherit" /> : <ChangeHistoryIcon />}
            >
              {isAddingToThreeWay ? 'กำลังเพิ่ม...' : 'เพิ่มเข้ารายการ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add to Vacant Position Dialog */}
        <Dialog open={addToVacantModalOpen} onClose={() => setAddToVacantModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VacantIcon color="success" />
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                ยื่นขอตำแหน่ง
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2, mt: 2 }}>
            <Stack spacing={2.5}>
              {/* แสดงข้อมูลบุคลากรที่เลือก */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  บุคลากรที่เลือก
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {selectedVacantPersonnel?.rank} {selectedVacantPersonnel?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ตำแหน่ง: {selectedVacantPersonnel?.position || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  หน่วย: {selectedVacantPersonnel?.unit || '-'}
                </Typography>
              </Box>

              {/* ปีที่ยื่นขอ */}
              <FormControl fullWidth>
                <InputLabel>ปีที่ยื่นขอตำแหน่ง</InputLabel>
                <Select
                  value={selectedVacantYear}
                  label="ปีที่ยื่นขอตำแหน่ง"
                  onChange={(e) => setSelectedVacantYear(Number(e.target.value))}
                >
                  {(() => {
                    const currentYear = new Date().getFullYear() + 543;
                    const years = [];
                    for (let year = currentYear; year >= 2568; year--) {
                      years.push(
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      );
                    }
                    return years;
                  })()}
                </Select>
              </FormControl>

              
              {/* ตำแหน่งที่ขอ - Dropdown จาก pos_code_master */}
              <FormControl fullWidth required>
                <InputLabel>ตำแหน่งที่ขอ</InputLabel>
                <Select
                  value={vacantRequestedPosition || ''}
                  label="ตำแหน่งที่ขอ"
                  onChange={(e) => setVacantRequestedPosition(Number(e.target.value))}
                >
                  <MenuItem value="">
                    <em>-- เลือกตำแหน่งที่ต้องการขอ --</em>
                  </MenuItem>
                  {posCodes.map((posCode) => (
                    <MenuItem key={posCode.id} value={posCode.id}>
                      {posCode.id} - {posCode.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* ผู้สนับสนุน */}
              <TextField
                fullWidth
                label="ผู้สนับสนุน"
                placeholder="ระบุชื่อผู้สนับสนุน/ผู้เสนอชื่อ"
                value={vacantNominator}
                onChange={(e) => setVacantNominator(e.target.value)}
                
              />


              {/* หมายเหตุ */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="หมายเหตุ (ถ้ามี)"
                placeholder="เช่น เหตุผล, ข้อมูลเพิ่มเติม..."
                value={vacantNotes}
                onChange={(e) => setVacantNotes(e.target.value)}
              />

              <Alert severity="info" sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.813rem' }}>
                  กรุณาเลือกตำแหน่งที่ต้องการยื่นขอจากรายการ
                </Typography>
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button 
              onClick={() => {
                setAddToVacantModalOpen(false);
                setSelectedVacantPersonnel(null);
                setSelectedVacantYear(new Date().getFullYear() + 543);
                setVacantNominator('');
                setVacantRequestedPosition(null);
                setVacantNotes('');
              }} 
              variant="outlined" 
              size="medium"
              disabled={isAddingToVacant}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleConfirmAddToVacant} 
              variant="contained" 
              color="success"
              size="medium"
              sx={{ minWidth: 120 }}
              disabled={isAddingToVacant || !vacantRequestedPosition}
              startIcon={isAddingToVacant ? <CircularProgress size={20} color="inherit" /> : <VacantIcon />}
            >
              {isAddingToVacant ? 'กำลังเพิ่ม...' : 'เพิ่มเข้ารายการ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Menu สำหรับ Edit, Delete */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem 
            onClick={() => {
              if (menuPersonnel) handleEdit(menuPersonnel);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>แก้ไข</ListItemText>
          </MenuItem>
          <MenuItem 
            onClick={() => {
              if (menuPersonnel) handleDelete(menuPersonnel);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>ลบ</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Layout>
  );
}
