'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
  alpha,
  Stack,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  InfoOutlined as InfoIcon,
  Close as CloseIcon,
  SwapHoriz as SwapHorizIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  TrendingFlat as TrendingFlatIcon,
  Visibility as VisibilityIcon,
  HelpOutline,
  InfoOutline,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import DataTablePagination from '@/components/DataTablePagination';
import { EmptyState } from '@/app/components/EmptyState';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import InOutDetailModal from '@/components/InOutDetailModal';

interface SwapDetail {
  id: string;
  personnelId: string;
  noId?: string;
  fullName: string;
  rank: string | null;
  nationalId: string | null;
  age: string | null;
  seniority: string | null;
  
  // ข้อมูลส่วนตัว
  birthDate: string | null;
  education: string | null;
  lastAppointment: string | null;
  currentRankSince: string | null;
  enrollmentDate: string | null;
  retirementDate: string | null;
  yearsOfService: string | null;
  trainingLocation: string | null;
  trainingCourse: string | null;
  
  // ตำแหน่งเดิม (From)
  posCodeId: number | null;
  posCodeMaster: {
    id: number;
    name: string;
  } | null;
  fromPosition: string | null;
  fromPositionNumber: string | null;
  fromUnit: string | null;
  fromActingAs: string | null;
  
  // ตำแหน่งใหม่ (To)
  toPosCodeId: number | null;
  toPosCodeMaster: {
    id: number;
    name: string;
  } | null;
  toPosition: string | null;
  toPositionNumber: string | null;
  toUnit: string | null;
  toActingAs: string | null;
  
  // Transaction info (optional - null ถ้ายังไม่ได้สลับ)
  transaction: {
    id: string;
    year: number;
    swapDate: string;
    swapType: string;
    groupNumber: string | null;
  } | null;
  
  // Sequence สำหรับเรียงลำดับ (จาก swap_transaction_detail.sequence)
  sequence?: number | null;
  
  // Replaced person (คนที่เดิมอยู่ในตำแหน่งใหม่) - มาจาก API แล้ว
  replacedPerson?: SwapDetail | null;
}

interface PositionCode {
  id: number;
  name: string;
}

interface InOutData {
  swapDetails: SwapDetail[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary?: {
    totalPersonnel: number;
    promoted: number;
    transferred: number;
    replacedOthers: number;
    filledVacant: number;
    notAssigned: number;
  };
  filters: {
    units: string[];
    positionCodes: PositionCode[];
  };
}

export default function InOutPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [data, setData] = useState<InOutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedPosCode, setSelectedPosCode] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all, vacant, reserved, occupied
  const [selectedSwapType, setSelectedSwapType] = useState<string>('all'); // all, two-way, three-way, promotion, promotion-chain
  const [searchText, setSearchText] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SwapDetail | null>(null);
  const [swapPartner, setSwapPartner] = useState<SwapDetail | null>(null);
  const [replacedPerson, setReplacedPerson] = useState<SwapDetail | null>(null);
  
  // Personnel Detail Modal states
  const [personnelDetailModalOpen, setPersonnelDetailModalOpen] = useState(false);
  const [selectedPersonnelForDetail, setSelectedPersonnelForDetail] = useState<SwapDetail | null>(null);
  
  // Store filter options (loaded once)
  const [filterOptions, setFilterOptions] = useState<{
    units: string[];
    positionCodes: { id: number; name: string }[];
  }>({
    units: [],
    positionCodes: []
  });
  
  // Page-level cache
  const dataCacheRef = useRef<{
    data: InOutData | null;
    timestamp: number;
    filters: string;
  }>({
    data: null,
    timestamp: 0,
    filters: ''
  });

  const availableYears = useMemo(() => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];
    
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  }, []);

  // Fetch filter options only once on mount
  const fetchFilters = async () => {
    try {
      setLoadingFilters(true);
      const response = await fetch('/api/in-out?filtersOnly=true');
      if (!response.ok) return;
      
      const result = await response.json();
      if (result.success && result.data.filters) {
        // เรียงลำดับ units - ประเภทที่ไม่ว่างขึ้นก่อน (เรียง A-Z)
        const sortedUnits = [...(result.data.filters.units || [])].sort((a, b) => {
          // ถ้าเป็นค่าว่าง ให้ไปอยู่ท้าย
          if (!a || a.trim() === '') return 1;
          if (!b || b.trim() === '') return -1;
          return a.localeCompare(b, 'th');
        });
        
        // เรียงลำดับ positionCodes - ประเภทที่ไม่ว่างขึ้นก่อน (เรียงตาม id)
        const sortedPositionCodes = [...(result.data.filters.positionCodes || [])].sort((a, b) => {
          // ถ้าเป็นค่าว่าง ให้ไปอยู่ท้าย
          if (!a.name || a.name.trim() === '') return 1;
          if (!b.name || b.name.trim() === '') return -1;
          return a.id - b.id;
        });
        
        setFilterOptions({
          units: sortedUnits,
          positionCodes: sortedPositionCodes
        });
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Fetch table data (can be called multiple times)
  const fetchData = async (abortSignal?: AbortSignal, forceReload: boolean = false) => {
    try {
      setLoading(true);
      
      // สร้าง cache key จาก filters
      const cacheKey = `${selectedUnit}-${selectedPosCode}-${selectedStatus}-${selectedSwapType}-${selectedYear}-${page}-${rowsPerPage}-${searchText}`;
      const now = Date.now();
      const cacheAge = now - dataCacheRef.current.timestamp;
      const CACHE_DURATION = 30000; // 30 วินาที
      
      // ใช้ cache ถ้าข้อมูลยังไม่เก่าเกินไปและ filters เหมือนเดิม (และไม่ได้ force reload)
      if (!forceReload && dataCacheRef.current.filters === cacheKey && cacheAge < CACHE_DURATION) {
        setData(dataCacheRef.current.data);
        setInitialLoad(false);
        setLoading(false);
        return;
      }
      
      // Clear old data
      setData(null);
      
      const params = new URLSearchParams({
        unit: selectedUnit,
        posCodeId: selectedPosCode,
        status: selectedStatus,
        swapType: selectedSwapType,
        year: selectedYear.toString(),
        page: page.toString(),
        pageSize: rowsPerPage.toString(),
      });
      
      console.log('[Frontend] Fetching with params:', {
        unit: selectedUnit,
        posCodeId: selectedPosCode,
        status: selectedStatus,
        swapType: selectedSwapType,
        year: selectedYear,
        page,
        pageSize: rowsPerPage
      });
      
      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }

      const response = await fetch(`/api/in-out?${params}`, 
        abortSignal ? { signal: abortSignal } : {}
      );
      
      if (abortSignal?.aborted) return;
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        throw new Error(`Failed to fetch data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setInitialLoad(false);
        
        // อัพเดท cache
        dataCacheRef.current = {
          data: result.data,
          timestamp: Date.now(),
          filters: cacheKey
        };
      } else {
        console.error('API returned success: false', result);
        setData({ swapDetails: [], totalCount: 0, page: 0, pageSize: rowsPerPage, filters: { units: [], positionCodes: [] } });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch in-out data:', error);
        setData({ swapDetails: [], totalCount: 0, page: 0, pageSize: rowsPerPage, filters: { units: [], positionCodes: [] } });
      }
    } finally {
      if (!abortSignal?.aborted) {
        setLoading(false);
      }
    }
  };

  // โหลด filter options ตอน mount (แสดง filters ทันที)
  useEffect(() => {
    fetchFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data when filters change (with debounce) - only after user interaction
  useEffect(() => {
    // Skip initial load - ไม่โหลดข้อมูลตอนเข้าหน้าครั้งแรก
    if (initialLoad) return;
    
    // ใช้ AbortController เพื่อป้องกัน race condition
    const abortController = new AbortController();
    
    // เพิ่ม debounce สำหรับ filter เพื่อลดการเรียก API
    const timer = setTimeout(() => {
      // โหลดข้อมูลทันทีเมื่อ filter เปลี่ยน
      setHasSearched(true);
      fetchData(abortController.signal);
    }, 150); // รอ 150ms หลังจาก filter เปลี่ยน
    
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit, selectedPosCode, selectedStatus, selectedSwapType, selectedYear, page, rowsPerPage, searchText]);

  const filteredSwapDetails = useMemo(() => {
    // ถ้ากำลังโหลด ให้ return [] เพื่อแสดง skeleton
    if (loading || !data?.swapDetails) return [];
    
    // ไม่ต้อง filter ประเภทที่ frontend เพราะ API filter ให้แล้ว
    const filtered = data.swapDetails;
    
    // Debug: ตรวจสอบ sequence ที่ได้จาก API
    if (filtered.length > 0 && filtered.some(d => d.transaction)) {
      const withSequence = filtered.filter(d => d.sequence != null);
      console.log('[In-Out] Sequence debug:', {
        total: filtered.length,
        withSequence: withSequence.length,
        samples: filtered.slice(0, 5).map(d => ({
          name: d.fullName,
          transactionId: d.transaction?.id,
          sequence: d.sequence,
          swapType: d.transaction?.swapType
        }))
      });
    }
    
    // จัดกลุ่มตาม transaction ID และ sequence
    const sorted = [...filtered].sort((a, b) => {
      // 0. แยกคนที่มี transaction กับไม่มี transaction (ตำแหน่งว่าง)
      const hasTransactionA = !!a.transaction?.id;
      const hasTransactionB = !!b.transaction?.id;
      
      // คนที่มี transaction ขึ้นก่อน (ตำแหน่งว่างไปท้าย)
      if (hasTransactionA !== hasTransactionB) {
        return hasTransactionA ? -1 : 1;
      }
      
      // ถ้าทั้งคู่ไม่มี transaction (ตำแหน่งว่างทั้งคู่)
      if (!hasTransactionA && !hasTransactionB) {
        // เรียงตามเลขตำแหน่ง (น้อย -> มาก)
        const posNumA = a.fromPositionNumber || '';
        const posNumB = b.fromPositionNumber || '';
        
        if (posNumA && posNumB) {
          const compareNum = posNumA.localeCompare(posNumB, undefined, { numeric: true });
          if (compareNum !== 0) return compareNum;
        }
        
        // ถ้าเลขตำแหน่งเท่ากัน หรือไม่มี เรียงตามชื่อ
        return (a.fullName || '').localeCompare(b.fullName || '', 'th');
      }
      
      // 1. จัดกลุ่มตาม transaction ID (คนที่สลับกันอยู่ด้วยกัน)
      const transactionA = a.transaction?.id || '';
      const transactionB = b.transaction?.id || '';
      
      if (transactionA !== transactionB) {
        return transactionA.localeCompare(transactionB);
      }
      
      // 2. ภายในกลุ่มเดียวกัน เรียงตาม sequence (ASC: น้อยไปมาก)
      const sequenceA = a.sequence;
      const sequenceB = b.sequence;
      
      // ถ้าทั้งคู่มี sequence ให้เรียงตาม sequence
      if (sequenceA != null && sequenceB != null) {
        if (sequenceA !== sequenceB) {
          return sequenceA - sequenceB; // ASC: 0, 1, 2, 3...
        }
      }
      
      // ถ้ามีแค่ฝั่งใดฝั่งหนึ่งมี sequence ให้ฝั่งที่มีขึ้นก่อน
      if (sequenceA != null && sequenceB == null) return -1;
      if (sequenceA == null && sequenceB != null) return 1;
      
      // 3. ถ้า sequence เท่ากัน หรือทั้งคู่ไม่มี sequence
      // เรียงตามเลขตำแหน่ง (น้อย -> มาก) แล้วตามชื่อ
      const posNumA = a.fromPositionNumber || '';
      const posNumB = b.fromPositionNumber || '';
      
      if (posNumA && posNumB) {
        const compareNum = posNumA.localeCompare(posNumB, undefined, { numeric: true });
        if (compareNum !== 0) return compareNum;
      }
      
      // ถ้าเลขตำแหน่งเท่ากัน หรือไม่มี เรียงตามชื่อ
      return (a.fullName || '').localeCompare(b.fullName || '', 'th');
    });
    
    return sorted;
  }, [data?.swapDetails, loading]);

  const handleUnitChange = (event: SelectChangeEvent<string>) => {
    setInitialLoad(false); // Mark that user has interacted
    setLoading(true); // แสดง skeleton loading ทันที
    setData(null); // Clear data ทันทีเพื่อแสดง skeleton
    setSelectedUnit(event.target.value);
    setPage(0);
  };

  const handlePosCodeChange = (event: SelectChangeEvent<string>) => {
    setInitialLoad(false); // Mark that user has interacted
    setLoading(true); // แสดง skeleton loading ทันที
    setData(null); // Clear data ทันทีเพื่อแสดง skeleton
    setSelectedPosCode(event.target.value);
    setPage(0);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setInitialLoad(false); // Mark that user has interacted
    setLoading(true); // แสดง skeleton loading ทันที
    setData(null); // Clear data ทันทีเพื่อแสดง skeleton
    setSelectedYear(Number(event.target.value));
    setPage(0);
  };

  const handleChangePage = (newPage: number) => {
    setInitialLoad(false); // Mark that user has interacted
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setInitialLoad(false); // Mark that user has interacted
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };



  const handleResetFilters = () => {
    setLoading(true); // แสดง skeleton loading ทันที
    setData(null); // Clear data ทันทีเพื่อแสดง skeleton
    setSearchText('');
    setSelectedUnit('all');
    setSelectedPosCode('all');
    setSelectedStatus('all');
    setSelectedSwapType('all');
    setPage(0);
  };

  const handleSwapTypeChange = (event: SelectChangeEvent<string>) => {
    console.log('[Frontend] SwapType changed to:', event.target.value);
    setInitialLoad(false);
    setLoading(true); // แสดง skeleton loading ทันที
    setData(null); // Clear data ทันทีเพื่อแสดง skeleton
    setSelectedSwapType(event.target.value);
    setPage(0);
  };

  const handleLoadData = () => {
    setHasSearched(true);
    setInitialLoad(false);
    
    // Clear cache และ force reload ข้อมูลใหม่
    dataCacheRef.current = {
      data: null,
      timestamp: 0,
      filters: ''
    };
    
    // โหลดเฉพาะข้อมูล (filters โหลดแล้วตอน mount) - force reload
    fetchData(undefined, true);
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setInitialLoad(false); // Mark that user has interacted
    setLoading(true); // แสดง skeleton loading ทันที
    setData(null); // Clear data ทันทีเพื่อแสดง skeleton
    setSelectedStatus(event.target.value);
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setInitialLoad(false); // Mark that user has interacted
    setLoading(true); // แสดง skeleton loading ทันที
    setData(null); // Clear data ทันทีเพื่อแสดง skeleton
    setSearchText(value);
    setPage(0);
  };

  // รวมข้อความสั้นให้อยู่บรรทัดเดียว คั่นด้วยสัญลักษณ์จุด
  const joinInline = (...parts: (string | null | undefined)[]) =>
    parts
      .map(p => (typeof p === 'string' ? p.trim() : p))
      .filter((p): p is string => !!p && p.length > 0)
      .join(' · ');

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    
    if (typeof dateString === 'string' && dateString.includes('/')) {
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
      }
    } catch {
      return dateString;
    }
    
    return dateString;
  };

  const getSwapTypeLabel = (type: string) => {
    switch (type) {
      case 'two-way': return 'สลับ 2 คน';
      case 'three-way': return 'สามเส้า';
      case 'multi-way': return 'หลายคน';
      case 'promotion': return 'เลื่อนตำแหน่ง';
      case 'promotion-chain': return 'จัดคนเข้าตำแหน่งว่าง';
      default: return type;
    }
  };

  const handleViewDetail = async (detail: SwapDetail) => {
    if (!detail.transaction) return; // ถ้ายังไม่ได้สลับก็ไม่ต้องแสดง modal
    
    setSelectedDetail(detail);
    setDetailModalOpen(true);
    
    // Fetch คนที่สลับด้วย (คนที่อยู่ในตำแหน่งเดิมของเรา)
    try {
      const response = await fetch(`/api/swap-transactions/${detail.transaction.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.swapDetails) {
          const allDetails: SwapDetail[] = result.data.swapDetails;
          
          // หาคนที่ไปอยู่ตำแหน่งเดิมของเรา
          // ลำดับความสำคัญ: position number > position name
          let partner = null;
          
          // 1. ลองหาจาก position number
          if (detail.fromPositionNumber) {
            partner = allDetails.find((d: SwapDetail) => 
              d.id !== detail.id && d.toPositionNumber === detail.fromPositionNumber
            );
          }
          
          // 2. ถ้าไม่เจอ ลองหาจาก position name
          if (!partner && detail.fromPosition) {
            partner = allDetails.find((d: SwapDetail) => 
              d.id !== detail.id && d.toPosition === detail.fromPosition
            );
          }
          
          // 3. ถ้ายังไม่เจอและเป็น two-way swap ให้เอาคนอื่นใน transaction
          if (!partner && detail.transaction.swapType === 'two-way' && allDetails.length === 2) {
            partner = allDetails.find((d: SwapDetail) => d.id !== detail.id);
          }
          
          setSwapPartner(partner || null);
          
          // หาคนที่เราไปแทน (คนที่เดิมอยู่ในตำแหน่งใหม่ของเรา)
          // ใช้ replacedPerson ที่มาจาก API แทน
          setReplacedPerson(detail.replacedPerson || null);
        }
      }
    } catch (error) {
      console.error('Error fetching swap details:', error);
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDetail(null);
    setSwapPartner(null);
    setReplacedPerson(null);
  };

  // Handler สำหรับเปิด Personnel Detail Modal
  const handleViewPersonnelDetail = (personnel: SwapDetail) => {
    setSelectedPersonnelForDetail(personnel);
    setPersonnelDetailModalOpen(true);
  };

  const handleClosePersonnelDetailModal = () => {
    setPersonnelDetailModalOpen(false);
    setSelectedPersonnelForDetail(null);
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
              <PersonIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main' }} />
              <Box>
                <Typography variant={isMobile ? 'h6' : 'h5'} component="h1" sx={{ fontWeight: 600 }}>
                  In and Out
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
                  ข้อมูลการสลับตำแหน่งเจ้าหน้าที่
                </Typography>
              </Box>
            </Box>
            <Chip 
              label={`ทั้งหมด ${data?.totalCount || 0} รายการ`}
              color="primary"
              sx={{ 
                fontWeight: 600, 
                fontSize: { xs: '0.8125rem', sm: '0.875rem' }, 
                px: 1,
                alignSelf: { xs: 'flex-start', sm: 'center' }
              }}
            />
          </Box>

          {/* สรุปสถิติ - จาก Server */}
          {hasSearched && data?.summary && (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, 
              gap: 2,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}>
              {/* เลื่อนตำแหน่ง */}
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.12), borderRadius: 1, border: 1, borderColor: 'success.light' }}>
                <Typography variant="caption" color="success.dark" sx={{ fontWeight: 700, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
                  ⬆️ เลื่อนตำแหน่ง
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.dark' }}>
                  {data.summary.promoted}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  คน
                </Typography>
              </Box>

              {/* ย้ายแนวนอน */}
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
                  ➡️ ย้ายแนวนอน
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {data.summary.transferred}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  คน
                </Typography>
              </Box>

              {/* แทนคนเดิม */}
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.12), borderRadius: 1, border: 1, borderColor: 'info.light' }}>
                <Typography variant="caption" color="info.dark" sx={{ fontWeight: 700, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
                  �  แทนคนเดิม
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.dark' }}>
                  {data.summary.replacedOthers}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  คน
                </Typography>
              </Box>

              {/* เข้าตำแหน่งว่าง */}
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.12), borderRadius: 1, border: 1, borderColor: 'primary.light' }}>
                <Typography variant="caption" color="primary.dark" sx={{ fontWeight: 700, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
                  📋 เข้าตำแหน่งว่าง
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                  {data.summary.filledVacant}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  คน
                </Typography>
              </Box>

              {/* ยังไม่ได้จัด */}
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.12), borderRadius: 1, border: 1, borderColor: 'warning.light' }}>
                <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 700, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
                  ⚠️ ยังไม่ได้จัด
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                  {data.summary.notAssigned}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  คน
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, 
            gap: 2,
            mb: 2
          }}>
            {loadingFilters ? (
              <>
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={40} />
              </>
            ) : (
              <>
                <FormControl size="small">
                  <InputLabel>หน่วยเดิม</InputLabel>
                  <Select value={selectedUnit} label="หน่วยเดิม" onChange={handleUnitChange}>
                    <MenuItem value="all">ทุกหน่วย</MenuItem>
                    {filterOptions.units.map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>ตำแหน่งเดิม (POS CODE)</InputLabel>
                  <Select value={selectedPosCode} label="ตำแหน่งเดิม (POS CODE)" onChange={handlePosCodeChange}>
                    <MenuItem value="all">ทุกตำแหน่ง</MenuItem>
                    {filterOptions.positionCodes.map((pos) => (
                      <MenuItem key={pos.id} value={pos.id.toString()}>
                        {pos.id} - {pos.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>สถานะตำแหน่ง</InputLabel>
                  <Select value={selectedStatus} label="สถานะตำแหน่ง" onChange={handleStatusChange}>
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    <MenuItem value="occupied">มีคนดำรงตำแหน่ง</MenuItem>
                    <MenuItem value="vacant">ว่าง</MenuItem>
                    <MenuItem value="reserved">ว่าง (กันตำแหน่ง)</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>ประเภท</InputLabel>
                  <Select value={selectedSwapType} label="ประเภท" onChange={handleSwapTypeChange}>
                    <MenuItem value="all">ทุกประเภท</MenuItem>
                    <MenuItem value="none">ยังไม่มีประเภท (ยังไม่จับคู่)</MenuItem>
                    <MenuItem value="two-way">สลับตำแหน่ง (2 คน)</MenuItem>
                    <MenuItem value="three-way">สลับสามเส้า (3 คน)</MenuItem>
                    <MenuItem value="promotion-chain">จัดคนเข้าตำแหน่งว่าง</MenuItem>
                    <MenuItem value="promotion">เลื่อนตำแหน่ง</MenuItem>                    
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>ปี</InputLabel>
                  <Select value={selectedYear} label="ปี" onChange={handleYearChange}>
                    {availableYears.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2, 
            alignItems: { xs: 'stretch', sm: 'center' }
          }}>
            {loadingFilters ? (
              <>
                <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Skeleton variant="rounded" width={isMobile ? '100%' : 140} height={40} />
                </Box>
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="ค้นหา"
                  placeholder={isMobile ? "ค้นหา..." : "ค้นหาชื่อ, นามสกุล, ยศ, เลขตำแหน่ง, หน่วย, ตำแหน่ง..."}
                  size="small"
                  value={searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: searchText && (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => handleSearchChange('')}
                            edge="end"
                          >
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  flexShrink: 0
                }}>
                  <Button
                    variant={hasSearched ? "outlined" : "contained"}
                    size="medium"
                    onClick={handleLoadData}
                    startIcon={!isMobile && <RefreshIcon />}
                    sx={{ whiteSpace: 'nowrap', minWidth: isMobile ? 'auto' : undefined }}
                    fullWidth={isMobile}
                  >
                    {isMobile ? <RefreshIcon /> : (hasSearched ? 'โหลดข้อมูลใหม่' : 'โหลดข้อมูล')}
                  </Button>
                  {(searchText || selectedUnit !== 'all' || selectedPosCode !== 'all' || selectedStatus !== 'all') && (
                    <Button
                      variant="outlined"
                      size="medium"
                      color="secondary"
                      onClick={handleResetFilters}
                      startIcon={!isMobile && <ClearIcon />}
                      sx={{ whiteSpace: 'nowrap', minWidth: isMobile ? 'auto' : undefined }}
                      fullWidth={isMobile}
                    >
                      {isMobile ? <ClearIcon /> : 'ล้างตัวกรอง'}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Paper>

        {/* Table - Desktop/Tablet - COMPACT DESIGN */}
        {!isMobile ? (
          <Paper sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ width: 40, py: 1.75, fontWeight: 700, color: 'white', fontSize: '0.875rem', letterSpacing: 0.5 }}>#</TableCell>                  
                    <TableCell sx={{ minWidth: 180, py: 1.75, fontWeight: 700, color: 'white', fontSize: '0.875rem', letterSpacing: 0.5 }}>
                      เจ้าหน้าที่
                    </TableCell>
                    <TableCell sx={{ minWidth: 180, py: 1.75, fontWeight: 700, color: 'white', fontSize: '0.875rem', letterSpacing: 0.5 }}>
                      คนครอง
                    </TableCell>
                    <TableCell sx={{ minWidth: 240, py: 1.75, fontWeight: 700, color: 'white', fontSize: '0.875rem', letterSpacing: 0.5 }}>
                      ตำแหน่งใหม่
                    </TableCell>
                    <TableCell align="center" sx={{ width: 60, py: 1.75, fontWeight: 700, color: 'white', fontSize: '0.875rem' }}>
                      •••
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    // Skeleton Loading Rows
                    Array.from({ length: rowsPerPage }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell sx={{ py: 1 }}>
                          <Skeleton variant="text" width={20} height={18} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Skeleton variant="text" width="85%" height={18} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Skeleton variant="text" width="75%" height={18} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Skeleton variant="text" width="90%" height={18} />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>
                          <Skeleton variant="circular" width={24} height={24} sx={{ mx: 'auto' }} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredSwapDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ p: 0, border: 'none' }}>
                        <EmptyState
                          icon={PersonIcon}
                          title={!hasSearched ? 'เลือก Filter แล้วจะแสดงข้อมูล' : (searchText ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ไม่พบข้อมูล')}
                          description={!hasSearched ? 'กรุณาเลือกตัวกรอง เพื่อแสดงข้อมูล' : (searchText ? 'ลองปรับเปลี่ยนคำค้นหาหรือล้างตัวกรอง' : `ยังไม่มีข้อมูลการสลับตำแหน่งในปี ${selectedYear}`)}
                          variant="compact"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSwapDetails.map((detail, index) => {
                      // ตรวจสอบว่าเป็นคนแรกของกลุ่มใหม่หรือไม่
                      const prevDetail = index > 0 ? filteredSwapDetails[index - 1] : null;
                      const isNewGroup = !prevDetail || prevDetail.transaction?.id !== detail.transaction?.id;
                      const replaced = detail.replacedPerson;
                      const isVacant = !replaced;
                      
                      // ตรวจสอบว่าเป็นการเลื่อนตำแหน่ง (posCodeId ลดลง = เลื่อนขึ้น)
                      const isPromotion = detail.posCodeId && detail.toPosCodeId && detail.toPosCodeId < detail.posCodeId;
                      // ตรวจสอบว่า posCodeId ไม่เปลี่ยนแปลง (ย้ายแนวนอน)
                      const isSameLevel = detail.posCodeId && detail.toPosCodeId && detail.toPosCodeId === detail.posCodeId;
                      
                      return (
                        <TableRow 
                          key={detail.id} 
                          hover 
                          sx={{ 
                            '&:hover': { bgcolor: 'action.hover' },
                            borderTop: isNewGroup && index > 0 ? 1 : 0,
                            borderTopColor: isNewGroup && index > 0 ? 'divider' : 'transparent',
                            // Highlight ตำแหน่งว่างด้วยสีพื้นหลัง
                            bgcolor: isVacant ? alpha(theme.palette.warning.main, 0.08) : 'transparent',
                          }}
                        >
                          {/* # */}
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                              {page * rowsPerPage + index + 1}
                            </Typography>
                          </TableCell>
                        
                          {/* ใคร */}
                          <TableCell sx={{ py: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.4, letterSpacing: 0.2 }}>
                                  {joinInline(detail.rank || '-', detail.fullName || '-')}
                                </Typography>
                                {/* PosCode ID + Name */}
                                {detail.posCodeMaster && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3, display: 'block', mt: 0.25 }}>
                                    {detail.posCodeMaster.id} - {detail.posCodeMaster.name}
                                  </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3, display: 'block', mt: 0.25 }}>
                                  {detail.fromPosition || '-'}
                                </Typography>
                                {/* Unit + เลขตำแหน่ง */}
                                {(detail.fromUnit || detail.fromPositionNumber) && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3, mt: 0.25 }}>
                                    {joinInline(detail.fromUnit, detail.fromPositionNumber ? `(${detail.fromPositionNumber})` : null)}
                                  </Typography>
                                )}
                              </Box>
                              {detail.personnelId && (
                                <Tooltip title="ดูข้อมูลบุคลากร">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPersonnelDetail(detail);
                                    }}
                                    sx={{
                                      color: 'info.main',
                                      p: 0.25,
                                      '&:hover': { bgcolor: 'info.50' }
                                    }}
                                  >
                                    <InfoOutline sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>

                          {/* แทนใคร - เน้นสีถ้าเป็นตำแหน่งว่าง */}
                          <TableCell sx={{ py: 1.5 }}>
                            {replaced ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.4, letterSpacing: 0.2 }}>
                                    {joinInline(replaced.rank || '', replaced.fullName || '')}
                                  </Typography>
                                  {/* PosCode ID + Name */}
                                  {replaced.posCodeMaster && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3, display: 'block', mt: 0.25 }}>
                                      {replaced.posCodeMaster.id} - {replaced.posCodeMaster.name}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3, display: 'block', mt: 0.25 }}>
                                    {replaced.fromPosition || '-'}
                                  </Typography>
                                  {/* Unit + เลขตำแหน่ง */}
                                  {(replaced.fromUnit || replaced.fromPositionNumber) && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3, mt: 0.25 }}>
                                      {joinInline(replaced.fromUnit, replaced.fromPositionNumber ? `(${replaced.fromPositionNumber})` : null)}
                                    </Typography>
                                  )}
                                </Box>
                                {replaced.personnelId && (
                                  <Tooltip title="ดูข้อมูลบุคลากร">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewPersonnelDetail(replaced);
                                      }}
                                      sx={{
                                        color: 'info.main',
                                        p: 0.25,
                                        '&:hover': { bgcolor: 'info.50' }
                                      }}
                                    >
                                      <InfoIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box 
                                  sx={{ 
                                    width: 7, 
                                    height: 7, 
                                    borderRadius: '50%', 
                                    bgcolor: 'warning.main',
                                    flexShrink: 0
                                  }} 
                                />
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark', fontSize: '0.875rem', letterSpacing: 0.2 }}>
                                  ตำแหน่งว่าง
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                        
                          {/* ได้ตำแหน่ง - แสดงว่า "ใคร ได้ตำแหน่งอะไร" */}
                          <TableCell sx={{ py: 1.5 }}>
                            {(detail.toPosCodeMaster || detail.toPosition) ? (
                              <Box>
                                {/* แสดง: ชื่อคน ได้ตำแหน่ง */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                  {isPromotion && (
                                    <Tooltip title="เลื่อนตำแหน่ง">
                                      <TrendingUpIcon 
                                        sx={{ 
                                          fontSize: 16,
                                          color: 'success.main',
                                          fontWeight: 700
                                        }}
                                      />
                                    </Tooltip>
                                  )}
                                  {isSameLevel && (
                                    <Tooltip title="ย้ายแนวนอน (ระดับเดิม)">
                                      <TrendingFlatIcon 
                                        sx={{ 
                                          fontSize: 16,
                                          color: 'text.secondary',
                                          fontWeight: 700
                                        }}
                                      />
                                    </Tooltip>
                                  )}
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 700, 
                                      fontSize: '0.875rem', 
                                      lineHeight: 1.4,
                                      letterSpacing: 0.2,
                                      color: isPromotion ? 'success.dark' : (isSameLevel ? 'text.secondary' : 'text.primary')
                                    }}
                                  >
                                    {detail.rank || ''} {detail.fullName || '-'}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontSize: '0.75rem',
                                      color: 'text.secondary',
                                      fontWeight: 500
                                    }}
                                  >
                                    ได้
                                  </Typography>
                                </Box>
                                
                                {/* POS CODE ID + Name */}
                                {detail.toPosCodeMaster && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontSize: '0.75rem', 
                                      lineHeight: 1.3,
                                      display: 'block',
                                      mt: 0.25,
                                      color: isPromotion ? 'success.dark' : (isSameLevel ? 'text.secondary' : 'text.secondary'),
                                      fontWeight: 600
                                    }}
                                  >
                                    {detail.toPosCodeMaster.id} - {detail.toPosCodeMaster.name}
                                  </Typography>
                                )}
                                
                                {/* ตำแหน่ง */}
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 700, 
                                    color: isPromotion ? 'success.dark' : (isSameLevel ? 'text.secondary' : 'text.primary'), 
                                    fontSize: '0.875rem', 
                                    lineHeight: 1.4,
                                    letterSpacing: 0.2,
                                    display: 'block',
                                    mt: 0.25
                                  }}
                                >
                                  {detail.toPosition || '-'}
                                </Typography>
                                
                                {/* Unit + เลขตำแหน่ง */}
                                {(detail.toUnit || detail.toPositionNumber) && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.3, mt: 0.25 }}>
                                    {joinInline(detail.toUnit, detail.toPositionNumber ? `(${detail.toPositionNumber})` : null)}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: 0.2 }}>
                                ยังไม่ได้จับคู่
                              </Typography>
                            )}
                          </TableCell>

                          {/* ข้อมูล */}
                          <TableCell align="center" sx={{ py: 1 }}>
                            {detail.transaction ? (
                              <Tooltip title="ดูรายละเอียด">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewDetail(detail)}
                                  sx={{
                                    color: 'primary.main',
                                    p: 0.4,
                                    '&:hover': {
                                      bgcolor: 'primary.50',
                                    }
                                  }}
                                >
                                  <InfoIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                -
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            <DataTablePagination
              count={data?.totalCount || 0}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              variant="minimal"
              disabled={loading}
            />
          </Paper>
        ) : (
          /* Card View - Mobile */
          <Box>
            {loading ? (
              // Skeleton Loading Cards
              <Stack spacing={2}>
                {Array.from({ length: rowsPerPage }).map((_, index) => (
                  <Card key={`skeleton-card-${index}`}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      {/* Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Skeleton variant="text" width={40} height={20} />
                        <Skeleton variant="rounded" width={80} height={20} />
                      </Box>

                      {/* Personnel Info */}
                      <Box sx={{ mb: 1.5 }}>
                        <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
                        <Skeleton variant="text" width="90%" height={16} />
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      {/* From Position */}
                      <Box sx={{ mb: 1.5 }}>
                        <Skeleton variant="text" width={100} height={16} sx={{ mb: 0.5 }} />
                        <Skeleton variant="text" width="80%" height={18} />
                        <Skeleton variant="text" width="60%" height={14} sx={{ mt: 0.25 }} />
                        <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.25 }} />
                      </Box>

                      {/* To Position */}
                      <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Skeleton variant="text" width={100} height={16} sx={{ mb: 0.5 }} />
                        <Skeleton variant="text" width="85%" height={16} />
                        <Skeleton variant="text" width="75%" height={18} sx={{ mt: 0.25 }} />
                        <Skeleton variant="text" width="65%" height={14} sx={{ mt: 0.25 }} />
                        <Skeleton variant="text" width="55%" height={14} sx={{ mt: 0.25 }} />
                        <Box sx={{ mt: 1, pt: 1 }}>
                          <Skeleton variant="text" width="70%" height={14} />
                        </Box>
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        <Skeleton variant="rounded" width="50%" height={32} />
                        <Skeleton variant="rounded" width="50%" height={32} />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : filteredSwapDetails.length === 0 ? (
              <Paper sx={{ p: 0 }}>
                <EmptyState
                  icon={PersonIcon}
                  title={!hasSearched ? 'เลือก Filter และกดโหลดข้อมูล' : (searchText ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ไม่พบข้อมูล')}
                  description={!hasSearched ? 'กรุณาเลือกตัวกรองและกดปุ่ม "โหลดข้อมูล" เพื่อแสดงข้อมูล' : (searchText ? 'ลองปรับเปลี่ยนคำค้นหาหรือล้างตัวกรอง' : `ยังไม่มีข้อมูลการสลับตำแหน่งในปี ${selectedYear}`)}
                  variant="compact"
                />
              </Paper>
            ) : (
              <>
                <Stack spacing={2}>
                  {filteredSwapDetails.map((detail, index) => (
                    <Card key={detail.id} sx={{ position: 'relative' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            #{page * rowsPerPage + index + 1}
                          </Typography>
                          {detail.transaction && (
                            <Chip 
                              label={getSwapTypeLabel(detail.transaction.swapType)}
                              size="small"
                              color={detail.transaction.swapType === 'three-way' ? 'warning' : (detail.transaction.swapType === 'promotion' ? 'info' : 'primary')}
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Box>

                        {/* Personnel Info - ใคร */}
                        <Box sx={{ mb: 1.5, p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.08), borderRadius: 1, border: 1, borderColor: 'info.light' }}>
                          <Typography variant="caption" color="info.dark" sx={{ fontWeight: 700, display: 'block', mb: 0.75, fontSize: '0.7rem' }}>
                            👤 ใคร
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, color: 'info.dark' }}>
                            {joinInline(detail.rank || '-', detail.fullName || '-')}
                          </Typography>
                          {detail.posCodeMaster && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, mb: 0.25 }}>
                              📋 {detail.posCodeMaster.id} - {detail.posCodeMaster.name}
                            </Typography>
                          )}
                        </Box>

                        {/* From Position - ตำแหน่งเดิม */}
                        <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.75, fontSize: '0.7rem' }}>
                            📍 ตำแหน่งเดิม
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 600, mb: 0.25 }}>
                            {detail.fromPosition || '-'}
                          </Typography>
                          {detail.fromUnit && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', mb: 0.25 }}>
                              🏢 {detail.fromUnit}
                            </Typography>
                          )}
                          {detail.nationalId && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                              🔢 {detail.nationalId}
                            </Typography>
                          )}
                        </Box>

                        {/* To Position - ย้ายไป */}
                        {(detail.toPosCodeMaster || detail.toPosition) ? (
                          <Box sx={{ p: 1.5, bgcolor: alpha('#4caf50', 0.1), borderRadius: 1, border: 2, borderColor: 'success.main' }}>
                            <Typography variant="caption" color="success.dark" sx={{ fontWeight: 700, display: 'block', mb: 0.75, fontSize: '0.7rem' }}>
                              ➡️ ย้ายไป
                            </Typography>
                            
                            {detail.toPosCodeMaster && (
                              <Typography variant="caption" color="success.main" sx={{ fontSize: '0.75rem', display: 'block', fontWeight: 700, mb: 0.25 }}>
                                📋 {detail.toPosCodeMaster.id} - {detail.toPosCodeMaster.name}
                              </Typography>
                            )}
                            
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark', fontSize: '0.875rem', mb: 0.25 }}>
                              {detail.toPosition || '-'}
                            </Typography>
                            
                            {detail.toUnit && (
                              <Typography variant="caption" color="success.dark" sx={{ fontSize: '0.75rem', display: 'block', mb: 0.25 }}>
                                🏢 {detail.toUnit}
                              </Typography>
                            )}
                            
                            {detail.toPositionNumber && (
                              <Typography variant="caption" color="success.dark" sx={{ fontSize: '0.7rem', display: 'block', mb: 0.75 }}>
                                🔢 {detail.toPositionNumber}
                              </Typography>
                            )}
                            
                            {/* Replaced Person - แทนใคร */}
                            <Divider sx={{ my: 1, borderColor: 'success.light' }} />
                            <Box sx={{ p: 1, bgcolor: alpha('#ff9800', 0.15), borderRadius: 0.5, border: 1, borderColor: 'warning.light' }}>
                              <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 700, display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                                🔄 แทน
                              </Typography>
                              {(() => {
                                const replaced = detail.replacedPerson;
                                if (replaced) {
                                  return (
                                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'warning.dark', fontWeight: 700 }}>
                                      {joinInline(replaced.rank || '', replaced.fullName || '')}
                                    </Typography>
                                  );
                                }
                                // ถ้าไม่มีคนเดิม
                                // ถ้าเป็น two-way หรือ three-way แต่ไม่พบข้อมูลคนเดิม (ผิดปกติ)
                                if ((detail.transaction?.swapType === 'two-way' || detail.transaction?.swapType === 'three-way' || detail.transaction?.swapType === 'multi-way') && detail.toPosCodeId) {
                                  return (
                                    <Typography variant="caption" color="error.main" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                      ⚠️ ข้อมูลคนเดิมไม่พบ
                                    </Typography>
                                  );
                                }
                                // กรณีอื่นๆ (promotion, promotion-chain หรือตำแหน่งว่าง)
                                return (
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'success.dark' }}>
                                    ✅ ตำแหน่งว่าง (ไม่มีคนเดิม)
                                  </Typography>
                                );
                              })()}
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ p: 1.5, bgcolor: alpha('#ff9800', 0.15), borderRadius: 1, border: 2, borderColor: 'warning.main' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'warning.dark', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              ⚠️ ตำแหน่งว่าง (ยังไม่ได้จับคู่)
                            </Typography>
                          </Box>
                        )}

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            startIcon={<InfoIcon />}
                            onClick={() => handleViewPersonnelDetail(detail)}
                          >
                            ข้อมูลบุคลากร
                          </Button>
                          {detail.transaction && (
                            <Button
                              fullWidth
                              size="small"
                              variant="contained"
                              startIcon={<InfoIcon />}
                              onClick={() => handleViewDetail(detail)}
                            >
                              รายละเอียด
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>

                {/* Pagination for Mobile */}
                <Paper sx={{ mt: 2 }}>
                  <DataTablePagination
                    count={data?.totalCount || 0}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                    variant="minimal"
                    disabled={loading}
                  />
                </Paper>
              </>
            )}
          </Box>
        )}

        {/* Detail Modal */}
        <InOutDetailModal
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          detail={selectedDetail}
          swapPartner={swapPartner}
          replacedPerson={replacedPerson}
          onViewPersonnelDetail={handleViewPersonnelDetail}
        />

        {/* Personnel Detail Modal */}
        {selectedPersonnelForDetail && (
          <PersonnelDetailModal
            open={personnelDetailModalOpen}
            onClose={handleClosePersonnelDetailModal}
            personnel={{
              id: selectedPersonnelForDetail.personnelId,
              noId: selectedPersonnelForDetail.noId,
              fullName: selectedPersonnelForDetail.fullName,
              rank: selectedPersonnelForDetail.rank,
              nationalId: selectedPersonnelForDetail.nationalId,
              age: selectedPersonnelForDetail.age,
              seniority: selectedPersonnelForDetail.seniority,
              posCodeId: selectedPersonnelForDetail.posCodeId,
              posCodeMaster: selectedPersonnelForDetail.posCodeMaster,
              position: selectedPersonnelForDetail.fromPosition,
              positionNumber: selectedPersonnelForDetail.fromPositionNumber,
              unit: selectedPersonnelForDetail.fromUnit,
              actingAs: selectedPersonnelForDetail.fromActingAs,
              birthDate: selectedPersonnelForDetail.birthDate,
              education: selectedPersonnelForDetail.education,
              lastAppointment: selectedPersonnelForDetail.lastAppointment,
              currentRankSince: selectedPersonnelForDetail.currentRankSince,
              enrollmentDate: selectedPersonnelForDetail.enrollmentDate,
              retirementDate: selectedPersonnelForDetail.retirementDate,
              yearsOfService: selectedPersonnelForDetail.yearsOfService,
              trainingLocation: selectedPersonnelForDetail.trainingLocation,
              trainingCourse: selectedPersonnelForDetail.trainingCourse,
            }}
          />
        )}
      </Box>
    </Layout>
  );
}