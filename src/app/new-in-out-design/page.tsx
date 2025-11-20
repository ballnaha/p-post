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
  ChangeHistory,
  LocationOn,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
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
    twoWaySwap: number;
    threeWaySwap: number;
    transfer: number;
    totalVacant: number;
    vacantFilled: number;
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

  // Helper function to highlight multiple search terms
  const highlightText = (text: string | null | undefined, searchTerms: string[] | { general: string[]; unit: string[]; posCode: string[] }) => {
    if (!text) return text || '';

    // แปลง object เป็น array (ใช้ general + posCode, ไม่รวม unit)
    const terms = Array.isArray(searchTerms) ? searchTerms : [...searchTerms.general, ...searchTerms.posCode];

    if (terms.length === 0) return text;

    // หา term ที่ match กับ text
    let matchedTerm = '';
    let matchIndex = -1;

    for (const term of terms) {
      if (!term.trim()) continue;
      const termLower = term.toLowerCase();
      const textLower = text.toLowerCase();
      const index = textLower.indexOf(termLower);

      if (index !== -1) {
        matchedTerm = term;
        matchIndex = index;
        break;
      }
    }

    if (matchIndex === -1) return text;

    const before = text.substring(0, matchIndex);
    const match = text.substring(matchIndex, matchIndex + matchedTerm.length);
    const after = text.substring(matchIndex + matchedTerm.length);

    return (
      <>
        {before}
        <Box
          component="span"
          sx={{
            bgcolor: '#FFF9C4', // สีเหลืองอ่อนแบบมืออาชีพ (Material Design Yellow 100)
            color: '#F57F17', // สีเหลืองเข้มสำหรับข้อความ (Material Design Yellow 900)
            fontWeight: 600,
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            boxShadow: '0 0 0 1px rgba(245, 127, 23, 0.1)', // เส้นขอบบางๆ
          }}
        >
          {match}
        </Box>
        {after}
      </>
    );
  };

  // Helper functions สำหรับ highlight แต่ละประเภท
  const highlightGeneral = (text: string | null | undefined) =>
    highlightText(text, highlightTerms.general);

  const highlightUnit = (text: string | null | undefined) =>
    highlightText(text, [...highlightTerms.general, ...highlightTerms.unit]);

  const highlightPosCode = (text: string | null | undefined) =>
    highlightText(text, [...highlightTerms.general, ...highlightTerms.posCode]);

  const highlightAll = (text: string | null | undefined) =>
    highlightText(text, [...highlightTerms.general, ...highlightTerms.unit, ...highlightTerms.posCode]);

  // สำหรับ backward compatibility - ใช้ general + posCode (ไม่รวม unit)
  const highlightTextCompat = (text: string | null | undefined) =>
    highlightText(text, [...highlightTerms.general, ...highlightTerms.posCode]);

  // Helper function to join and highlight text - แต่ละส่วนจะ highlight แยกกัน
  const joinInlineWithHighlight = (searchTerms: string[] | { general: string[]; unit: string[]; posCode: string[] }, ...parts: (string | null | undefined)[]) => {
    const filtered = parts
      .map(p => (typeof p === 'string' ? p.trim() : p))
      .filter((p): p is string => !!p && p.length > 0);

    if (filtered.length === 0) return '';

    const joined = filtered.join(' · ');
    // ถ้าเป็น object ให้ใช้ general + posCode (ไม่รวม unit)
    const terms = Array.isArray(searchTerms) ? searchTerms : [...searchTerms.general, ...searchTerms.posCode];
    return highlightText(joined, terms);
  };

  // Helper สำหรับแสดง position + unit + positionNumber โดย highlight แยกตามประเภท
  // สำหรับตำแหน่งคนครอง (highlight unit จาก filter)
  const renderPositionWithHighlight = (position: string | null, unit: string | null, positionNumber: string | null) => {
    const parts: React.ReactNode[] = [];

    if (position) parts.push(highlightGeneral(position));
    if (unit) parts.push(highlightUnit(unit)); // highlight unit จาก filter
    if (positionNumber) parts.push(highlightGeneral(`#${positionNumber}`));

    if (parts.length === 0) return '';

    return parts.reduce((acc: React.ReactNode, part, index) => {
      if (index === 0) return part;
      return <>{acc} · {part}</>;
    });
  };

  // Helper สำหรับแสดง position + unit + positionNumber ของตำแหน่งใหม่
  // (ไม่ highlight unit และ posCode จาก filter เพราะไม่ใช่คอลัมน์ตำแหน่งคนครอง)
  const renderNewPositionWithHighlight = (position: string | null, unit: string | null, positionNumber: string | null) => {
    const parts: React.ReactNode[] = [];

    if (position) parts.push(highlightGeneral(position));
    if (unit) parts.push(highlightGeneral(unit)); // ไม่ highlight unit จาก filter
    if (positionNumber) parts.push(highlightGeneral(`#${positionNumber}`));

    if (parts.length === 0) return '';

    return parts.reduce((acc: React.ReactNode, part, index) => {
      if (index === 0) return part;
      return <>{acc} · {part}</>;
    });
  };

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
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SwapDetail | null>(null);
  const [swapPartner, setSwapPartner] = useState<SwapDetail | null>(null);
  const [replacedPerson, setReplacedPerson] = useState<SwapDetail | null>(null);

  // Personnel Detail Modal states
  const [personnelDetailModalOpen, setPersonnelDetailModalOpen] = useState(false);
  const [selectedPersonnelForDetail, setSelectedPersonnelForDetail] = useState<SwapDetail | null>(null);

  // Back to top button state
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  // Combined highlight terms - เฉพาะจากช่อง search เท่านั้น
  const highlightTerms = useMemo(() => {
    const general: string[] = [];

    // เพิ่ม search text (ค้นหาทุกที่)
    if (searchText.trim()) {
      general.push(searchText.trim());
    }

    // ไม่เพิ่ม unit และ posCode filter เพื่อไม่ให้ highlight

    return { general, unit: [], posCode: [] };
  }, [searchText]);

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
      const response = await fetch('/api/new-in-out?filtersOnly=true');
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

      // ถ้า rowsPerPage = -1 (ทั้งหมด) ให้ส่ง pageSize เป็น 999999
      const effectivePageSize = rowsPerPage === -1 ? 999999 : rowsPerPage;

      const params = new URLSearchParams({
        unit: selectedUnit,
        posCodeId: selectedPosCode,
        status: selectedStatus,
        swapType: selectedSwapType,
        year: selectedYear.toString(),
        page: page.toString(),
        pageSize: effectivePageSize.toString(),
      });

      console.log('[Frontend] Fetching with params:', {
        unit: selectedUnit,
        posCodeId: selectedPosCode,
        status: selectedStatus,
        swapType: selectedSwapType,
        year: selectedYear,
        page,
        pageSize: effectivePageSize
      });

      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }

      const response = await fetch(`/api/new-in-out?${params}`,
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

  // Scroll listener สำหรับ back to top button
  useEffect(() => {
    const handleScroll = () => {
      // หา main content container ที่มี scroll
      const mainContent = document.querySelector('main');
      if (mainContent) {
        setShowBackToTop(mainContent.scrollTop > 300);
      } else {
        // fallback ถ้าไม่เจอ main element
        setShowBackToTop(window.scrollY > 300);
      }
    };

    // ฟัง scroll event จาก main content container
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    } else {
      // fallback
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
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

    // เรียงข้อมูลตาม noId เหมือนหน้า police_personnel
    const sorted = [...filtered].sort((a, b) => {
      // 1. เรียงตาม noId เป็นหลัก
      const noIdA = a.noId || '';
      const noIdB = b.noId || '';

      if (noIdA && noIdB) {
        const compareNum = String(noIdA).localeCompare(String(noIdB), undefined, { numeric: true });
        if (compareNum !== 0) return compareNum;
      }

      if (noIdA && !noIdB) return -1;
      if (!noIdA && noIdB) return 1;

      // 2. ถ้า noId เท่ากัน ให้เรียงตามชื่อ
      return (a.fullName || '').localeCompare(b.fullName || '', 'th');
    });

    // Debug: แสดง 5 รายการแรกเพื่อตรวจสอบการเรียง
    if (sorted.length > 0) {
      console.log('[In-Out] Sorted data (first 5):', sorted.slice(0, 5).map(d => ({
        noId: d.noId,
        fullName: d.fullName,
        positionNumber: d.fromPositionNumber
      })));
    }

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
      case 'promotion': return 'ย้ายหน่วย';
      case 'promotion-chain': return 'จัดคนเข้าตำแหน่งว่าง';
      case 'transfer': return 'ย้ายหน่วย';
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

  // Scroll to top function
  const scrollToTop = () => {
    if (isFullscreen) {
      // ถ้าอยู่ใน fullscreen mode ให้ scroll ใน fullscreen container
      const fullscreenContainer = document.getElementById('fullscreen-container');
      if (fullscreenContainer) {
        fullscreenContainer.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }
    }
    
    // หา main content container ที่มี scroll
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      // fallback ถ้าไม่เจอ main element
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <Layout>
      <Box 
        id="fullscreen-container"
        sx={isFullscreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1300, // ใช้ค่าเดียวกับ MUI Modal default
          bgcolor: 'background.default',
          overflow: 'auto',
          p: { xs: 2, sm: 3 }
        } : undefined}>
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
              <Tooltip title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "โหมดเต็มจอ (สำหรับ Present)"}>
                <IconButton
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  color="primary"
                  sx={{
                    bgcolor: isFullscreen ? 'primary.main' : 'action.hover',
                    color: isFullscreen ? 'white' : 'primary.main',
                    '&:hover': {
                      bgcolor: isFullscreen ? 'primary.dark' : 'action.selected'
                    }
                  }}
                >
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
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
                  <InputLabel>หน่วย</InputLabel>
                  <Select 
                    value={selectedUnit} 
                    label="หน่วย" 
                    onChange={handleUnitChange}
                    MenuProps={{
                      container: isFullscreen ? document.getElementById('fullscreen-container') : undefined,
                      style: { zIndex: isFullscreen ? 1301 : undefined }
                    }}
                  >
                    <MenuItem value="all">ทุกหน่วย</MenuItem>
                    {filterOptions.units.map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {unit}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>ตำแหน่ง (POS CODE)</InputLabel>
                  <Select 
                    value={selectedPosCode} 
                    label="ตำแหน่ง (POS CODE)" 
                    onChange={handlePosCodeChange}
                    MenuProps={{
                      container: isFullscreen ? document.getElementById('fullscreen-container') : undefined,
                      style: { zIndex: isFullscreen ? 1301 : undefined }
                    }}
                  >
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
                  <Select 
                    value={selectedStatus} 
                    label="สถานะตำแหน่ง" 
                    onChange={handleStatusChange}
                    MenuProps={{
                      container: isFullscreen ? document.getElementById('fullscreen-container') : undefined,
                      style: { zIndex: isFullscreen ? 1301 : undefined }
                    }}
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    <MenuItem value="occupied">มีคนดำรงตำแหน่ง</MenuItem>
                    <MenuItem value="vacant">ว่าง</MenuItem>
                    <MenuItem value="reserved">ว่าง (กันตำแหน่ง)</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>ประเภท</InputLabel>
                  <Select 
                    value={selectedSwapType} 
                    label="ประเภท" 
                    onChange={handleSwapTypeChange}
                    MenuProps={{
                      container: isFullscreen ? document.getElementById('fullscreen-container') : undefined,
                      style: { zIndex: isFullscreen ? 1301 : undefined }
                    }}
                  >
                    <MenuItem value="all">ทุกประเภท</MenuItem>
                    <MenuItem value="none">ยังไม่มีประเภท (ยังไม่จับคู่)</MenuItem>
                    <MenuItem value="two-way">สลับตำแหน่ง (2 คน)</MenuItem>
                    <MenuItem value="three-way">สลับสามเส้า (3 คน)</MenuItem>
                    <MenuItem value="promotion-chain">จัดคนเข้าตำแหน่งว่าง</MenuItem>
                    <MenuItem value="transfer">ย้ายหน่วย</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>ปี</InputLabel>
                  <Select 
                    value={selectedYear} 
                    label="ปี" 
                    onChange={handleYearChange}
                    MenuProps={{
                      container: isFullscreen ? document.getElementById('fullscreen-container') : undefined,
                      style: { zIndex: isFullscreen ? 1301 : undefined }
                    }}
                  >
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

        {/* Summary Cards - สรุปสถิติ */}
        {hasSearched && data?.summary && (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 3,
            mb: 3
          }}>
            {/* เลื่อนตำแหน่ง */}
            <Card
              sx={{
                position: 'relative',
                borderRadius: 1,
                p: 0,
                background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
                boxShadow: '0 4px 12px rgba(29, 233, 182, 0.2)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)', top: -60, right: -40 }} />
              <Box sx={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', bottom: -50, left: -30 }} />
              <CardContent sx={{ p: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    เลื่อนตำแหน่ง
                  </Typography>
                  <TrendingUpIcon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 0.25, lineHeight: 1 }}>
                  {data.summary.promoted}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 500 }}>
                  คน
                </Typography>
              </CardContent>
            </Card>

            {/* สลับตำแหน่ง */}
            <Card
              sx={{
                position: 'relative',
                borderRadius: 1,
                p: 0,
                background: 'linear-gradient(135deg, #4FC3F7 0%, #0288D1 100%)',
                boxShadow: '0 4px 12px rgba(79, 195, 247, 0.2)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)', top: -60, right: -40 }} />
              <Box sx={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', bottom: -50, left: -30 }} />
              <CardContent sx={{ p: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    สลับตำแหน่ง
                  </Typography>
                  <SwapHorizIcon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 0.25, lineHeight: 1 }}>
                  {data.summary.twoWaySwap || 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 500 }}>
                  คน
                </Typography>
              </CardContent>
            </Card>

            {/* สามเส้า */}
            <Card
              sx={{
                position: 'relative',
                borderRadius: 1,
                p: 0,
                background: 'linear-gradient(135deg, #AB47BC 0%, #8E24AA 100%)',
                boxShadow: '0 4px 12px rgba(171, 71, 188, 0.2)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)', top: -60, right: -40 }} />
              <Box sx={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', bottom: -50, left: -30 }} />
              <CardContent sx={{ p: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    สามเส้า
                  </Typography>
                  <ChangeHistory sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 0.25, lineHeight: 1 }}>
                  {data.summary.threeWaySwap || 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 500 }}>
                  คน
                </Typography>
              </CardContent>
            </Card>

            {/* ย้ายหน่วย */}
            <Card
              sx={{
                position: 'relative',
                borderRadius: 1,
                p: 0,
                background: 'linear-gradient(135deg, #26C6DA 0%, #00ACC1 100%)',
                boxShadow: '0 4px 12px rgba(38, 198, 218, 0.2)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)', top: -60, right: -40 }} />
              <Box sx={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', bottom: -50, left: -30 }} />
              <CardContent sx={{ p: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    ย้ายหน่วย
                  </Typography>
                  <LocationOn sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 0.25, lineHeight: 1 }}>
                  {data.summary.transfer || 0}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 500 }}>
                  คน
                </Typography>
              </CardContent>
            </Card>

            {/* ตำแหน่งว่าง */}
            <Card
              sx={{
                position: 'relative',
                borderRadius: 1,
                p: 0,
                background: 'linear-gradient(135deg, #7C5DFA 0%, #5B3FD6 100%)',
                boxShadow: '0 4px 12px rgba(124, 93, 250, 0.2)',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.12)', top: -60, right: -40 }} />
              <Box sx={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', bottom: -50, left: -30 }} />
              <CardContent sx={{ p: 1.5, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    ตำแหน่งว่าง
                  </Typography>
                  <PersonIcon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 24 }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.25 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', lineHeight: 1 }}>
                    {data.summary.vacantFilled}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, color: 'rgba(255,255,255,0.8)', lineHeight: 1 }}>
                    / {data.summary.totalVacant}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 500 }}>
                  เลือกแล้ว / ทั้งหมด
                </Typography>
                {data.summary.totalVacant > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Box sx={{
                      width: '100%',
                      height: 4,
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{
                        width: `${(data.summary.vacantFilled / data.summary.totalVacant * 100)}%`,
                        height: '100%',
                        bgcolor: 'white',
                        transition: 'width 0.3s ease'
                      }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                      {Math.round(data.summary.vacantFilled / data.summary.totalVacant * 100)}% เติมเต็มแล้ว
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Table - Desktop/Tablet - Material Design */}
        {!isMobile ? (
          <Paper elevation={2} sx={{
            p: 0,
            borderRadius: '0 0 8px 8px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Loading Indicator สำหรับการโหลดข้อมูลจำนวนมาก */}
            {loading && rowsPerPage === -1 && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bgcolor: alpha(theme.palette.primary.main, 0.95),
                color: 'white',
                py: 1.5,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                zIndex: 10,
                boxShadow: 2
              }}>
                <CircularProgress size={20} sx={{ color: 'white' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  กำลังโหลดข้อมูลทั้งหมด กรุณารอสักครู่...
                </Typography>
              </Box>
            )}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', width: 50, fontWeight: 600, py: 2 }}>
                      #
                    </TableCell>
                    <TableCell sx={{ color: 'white', width: '25%', fontWeight: 600, py: 2 }}>
                      คนเข้า
                    </TableCell>
                    <TableCell sx={{ color: 'white', width: '25%', fontWeight: 600, py: 2 }}>
                      คนครอง
                    </TableCell>
                    <TableCell sx={{ color: 'white', width: '25%', fontWeight: 600, py: 2 }}>
                      ตำแหน่งคนครอง
                    </TableCell>
                    <TableCell sx={{ color: 'white', width: '25%', fontWeight: 600, py: 2 }}>
                      ตำแหน่งใหม่
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600, width: 80, py: 2 }} align="center">
                      จัดการ
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    // Skeleton Loading Rows - แสดงจำนวนที่เหมาะสม
                    Array.from({ length: rowsPerPage === -1 ? 20 : Math.min(rowsPerPage, 20) }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell sx={{ py: 0.5, px: 1 }}>
                          <Skeleton variant="text" width={20} height={16} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 1 }}>
                          <Skeleton variant="text" width="85%" height={16} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 1 }}>
                          <Skeleton variant="text" width="75%" height={16} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 1 }}>
                          <Skeleton variant="text" width="80%" height={16} />
                        </TableCell>
                        <TableCell sx={{ py: 0.5, px: 1 }}>
                          <Skeleton variant="text" width="90%" height={16} />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.5, px: 1 }}>
                          <Skeleton variant="circular" width={20} height={20} sx={{ mx: 'auto' }} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredSwapDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ p: 0, border: 'none' }}>
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
                            '&:hover': {
                              bgcolor: 'action.hover'
                            },
                            borderTop: isNewGroup && index > 0 ? '2px solid' : 0,
                            borderTopColor: isNewGroup && index > 0 ? 'primary.main' : 'transparent',
                            borderBottom: '2px solid',
                            borderBottomColor: 'divider',
                            bgcolor: index % 2 === 0 ? 'background.paper' : alpha(theme.palette.grey[50], 0.5),
                            '& > td': {
                              borderBottom: 'none'
                            }
                          }}
                        >
                          {/* # */}
                          <TableCell sx={{ 
                            py: 0.75, 
                            px: 1
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              {page * rowsPerPage + index + 1}
                            </Typography>
                          </TableCell>

                          {/* เข้า - คนที่มี transaction - แสดงเมื่อมี transaction */}
                          <TableCell sx={{ 
                            py: 0.75, 
                            px: 1
                          }}>
                            {detail.transaction && detail.fullName && !['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(detail.fullName.trim()) ? (
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.2, fontSize: '0.875rem', color: 'text.primary', lineHeight: 1.4 }}>
                                    {joinInlineWithHighlight(highlightTerms, detail.rank, detail.fullName)}
                                    {detail.age && <Typography component="span" color="text.secondary" sx={{ fontSize: '0.8rem', ml: 0.5 }}>({detail.age})</Typography>}
                                  </Typography>
                                  {detail.seniority && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2, fontSize: '0.75rem' }}>
                                      อาวุโส {detail.seniority}
                                    </Typography>
                                  )}
                                  {detail.posCodeMaster && (
                                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600, mb: 0.2, fontSize: '0.75rem' }}>
                                      {highlightText(`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`, highlightTerms)}
                                    </Typography>
                                  )}
                                  <Typography variant="body2" color="text.primary" sx={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    {renderPositionWithHighlight(detail.fromPosition, detail.fromUnit, detail.fromPositionNumber)}
                                  </Typography>
                                </Box>
                                <Tooltip title="ดูข้อมูลบุคลากร">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPersonnelDetail(detail);
                                    }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                  >
                                    <InfoOutline sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : replaced ? (
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.2, fontSize: '0.875rem', lineHeight: 1.4 }}>
                                    {joinInline(replaced.rank, replaced.fullName)}
                                    {replaced.age && <Typography component="span" color="text.secondary" sx={{ fontSize: '0.8rem', ml: 0.5 }}>({replaced.age})</Typography>}
                                  </Typography>
                                  {replaced.seniority && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2, fontSize: '0.75rem' }}>
                                      อาวุโส {replaced.seniority}
                                    </Typography>
                                  )}
                                  {replaced.posCodeMaster && (
                                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600, mb: 0.2, fontSize: '0.75rem' }}>
                                      {replaced.posCodeMaster.id} - {replaced.posCodeMaster.name}
                                    </Typography>
                                  )}
                                  <Typography variant="body2" color="text.primary" sx={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    {joinInline(replaced.fromPosition, replaced.fromUnit, replaced.fromPositionNumber ? `#${replaced.fromPositionNumber}` : null)}
                                  </Typography>
                                </Box>
                                <Tooltip title="ดูข้อมูลบุคลากร">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPersonnelDetail(replaced);
                                    }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                  >
                                    <InfoOutline sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : null}
                          </TableCell>

                          {/* คนครอง - ชื่อคนเดิมที่ครองตำแหน่ง (replaced) หรือตำแหน่งว่าง */}
                          <TableCell sx={{ 
                            bgcolor: alpha(theme.palette.grey[100], 0.5),
                            py: 0.75, 
                            px: 1
                          }}>
                            {replaced ? (
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.2, fontSize: '0.875rem', color: 'text.primary', lineHeight: 1.4 }}>
                                    {joinInline(replaced.rank, replaced.fullName)}
                                    {replaced.age && <Typography component="span" color="text.secondary" sx={{ fontSize: '0.8rem', ml: 0.5 }}>({replaced.age})</Typography>}
                                  </Typography>
                                  {replaced.seniority && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                      อาวุโส {replaced.seniority}
                                    </Typography>
                                  )}
                                </Box>
                                <Tooltip title="ดูข้อมูลบุคลากร">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPersonnelDetail(replaced);
                                    }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                  >
                                    <InfoOutline sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : detail.transaction ? (
                              <Chip
                                label="ตำแหน่งว่าง"
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                              />
                            ) : detail.fullName && !['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(detail.fullName.trim()) ? (
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.2, fontSize: '0.875rem', lineHeight: 1.4 }}>
                                    {joinInlineWithHighlight(highlightTerms, detail.rank, detail.fullName)}
                                    {detail.age && <Typography component="span" color="text.secondary" sx={{ fontSize: '0.8rem', ml: 0.5 }}>({detail.age})</Typography>}
                                  </Typography>
                                  {detail.seniority && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                      อาวุโส {detail.seniority}
                                    </Typography>
                                  )}
                                </Box>
                                <Tooltip title="ดูข้อมูลบุคลากร">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPersonnelDetail(detail);
                                    }}
                                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                  >
                                    <InfoOutline sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Chip
                                label={['ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(detail.fullName?.trim() || '') ? 'ว่าง (กันตำแหน่ง)' : 'ตำแหน่งว่าง'}
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                              />
                            )}
                          </TableCell>

                          {/* ตำแหน่งคนครอง - ตำแหน่งของคนครอง */}
                          <TableCell sx={{ 
                            bgcolor: alpha(theme.palette.grey[100], 0.5),
                            py: 0.75, 
                            px: 1
                          }}>
                            <Box>
                              {/* ถ้ามี replaced แสดงตำแหน่งของ replaced */}
                              {replaced ? (
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.2, fontSize: '0.875rem', lineHeight: 1.4 }}>
                                    {replaced.fromPosition || '-'}
                                  </Typography>
                                  {replaced.posCodeMaster && (
                                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600, mb: 0.2, fontSize: '0.75rem' }}>
                                      {replaced.posCodeMaster.id} - {replaced.posCodeMaster.name}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                    {joinInline(replaced.fromUnit, replaced.fromPositionNumber ? `#${replaced.fromPositionNumber}` : null)}
                                  </Typography>
                                </>
                              ) : detail.transaction ? (
                                /* ถ้ามี transaction แต่ไม่มี replaced (ตำแหน่งว่าง) แสดงตำแหน่งที่จะไปรับ */
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.2, fontSize: '0.875rem', lineHeight: 1.4 }}>
                                    {highlightText(detail.toPosition || detail.fromPosition || '-', highlightTerms)}
                                  </Typography>
                                  {(detail.toPosCodeMaster || detail.posCodeMaster) && (
                                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600, mb: 0.2, fontSize: '0.75rem' }}>
                                      {detail.toPosCodeMaster ?
                                        highlightGeneral(`${detail.toPosCodeMaster.id} - ${detail.toPosCodeMaster.name}`) :
                                        detail.posCodeMaster ? highlightPosCode(`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`) : ''
                                      }
                                    </Typography>
                                  )}
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                    {detail.toUnit ?
                                      renderNewPositionWithHighlight(null, detail.toUnit, detail.toPositionNumber || null) :
                                      renderPositionWithHighlight(null, detail.fromUnit, detail.fromPositionNumber || null)
                                    }
                                  </Typography>
                                </>
                              ) : detail.fullName && !['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(detail.fullName.trim()) ? (
                                /* ถ้าไม่มี transaction และไม่ใช่ตำแหน่งว่าง แสดงตำแหน่งปัจจุบัน */
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.2, fontSize: '0.875rem', lineHeight: 1.4 }}>
                                    {highlightText(detail.fromPosition || '-', highlightTerms)}
                                  </Typography>
                                  {detail.posCodeMaster && (
                                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600, mb: 0.2, fontSize: '0.75rem' }}>
                                      {highlightText(`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`, highlightTerms)}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                    {joinInlineWithHighlight(highlightTerms, detail.fromUnit, detail.fromPositionNumber ? `#${detail.fromPositionNumber}` : null)}
                                  </Typography>
                                </>
                              ) : (
                                /* ตำแหน่งว่างและไม่มี transaction */
                                <>
                                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.2, fontSize: '0.875rem', lineHeight: 1.4 }}>
                                    {highlightText(detail.fromPosition || '-', highlightTerms)}
                                  </Typography>
                                  {detail.posCodeMaster && (
                                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600, mb: 0.2, fontSize: '0.75rem' }}>
                                      {highlightText(`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`, highlightTerms)}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                    {joinInlineWithHighlight(highlightTerms, detail.fromUnit, detail.fromPositionNumber ? `#${detail.fromPositionNumber}` : null)}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </TableCell>

                          {/* ตำแหน่งใหม่ - ตำแหน่งที่คนเข้าได้รับ (ตำแหน่งของคนครอง) */}
                          <TableCell sx={{
                            py: 0.5,
                            px: 1,
                            borderLeft: isPromotion ? 3 : isSameLevel ? 3 : 0,
                            borderLeftColor: isPromotion ? 'success.main' : isSameLevel ? 'grey.400' : 'transparent'
                          }}>
                            {detail.transaction?.swapType === 'transfer' ? (
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Chip
                                    icon={<SwapHorizIcon sx={{ fontSize: '1rem' }} />}
                                    label="ย้ายหน่วยงาน"
                                    size="small"
                                    color="info"
                                    sx={{ mb: 0.25, fontWeight: 500, height: 20, fontSize: '0.75rem', '& .MuiChip-icon': { fontSize: '1rem' } }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.2, fontSize: '0.875rem' }}>
                                    {joinInlineWithHighlight(highlightTerms, detail.rank, detail.fullName)}
                                    {detail.age && <Typography component="span" color="text.secondary" sx={{ fontSize: '0.8rem', ml: 0.5 }}>({detail.age})</Typography>}
                                  </Typography>
                                  {detail.seniority && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2, fontSize: '0.75rem' }}>
                                      อาวุโส {detail.seniority}
                                    </Typography>
                                  )}
                                  <Typography variant="body2" sx={{ display: 'block', mb: 0.2, fontSize: '0.75rem', fontWeight: 500 }}>
                                    ย้ายจากหน่วย: <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>{highlightUnit(detail.fromUnit || '-')}</Box>
                                  </Typography>
                                  <Typography variant="body2" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 500 }}>
                                    ไปหน่วย: <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>{highlightGeneral(detail.toUnit || '-')}</Box>
                                  </Typography>
                                </Box>
                              </Box>
                            ) : (detail.toPosCodeMaster || detail.toPosition) ? (
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                                <Box sx={{ flex: 1 }}>
                                  {isPromotion && (
                                    <Chip
                                      icon={<TrendingUpIcon sx={{ fontSize: '1rem' }} />}
                                      label="เลื่อนขึ้น"
                                      size="small"
                                      color="success"
                                      sx={{ mb: 0.25, fontWeight: 500, height: 20, fontSize: '0.75rem', '& .MuiChip-icon': { fontSize: '1rem' } }}
                                    />
                                  )}
                                  {detail.transaction?.swapType === 'two-way' && (
                                    <Chip
                                      icon={<SwapHorizIcon sx={{ fontSize: '1rem' }} />}
                                      label="สลับตำแหน่ง"
                                      size="small"
                                      color="info"
                                      sx={{ mb: 0.25, fontWeight: 500, height: 20, fontSize: '0.75rem', '& .MuiChip-icon': { fontSize: '1rem' } }}
                                    />
                                  )}
                                  {detail.transaction?.swapType === 'three-way' && (
                                    <Chip
                                      icon={<SwapHorizIcon sx={{ fontSize: '1rem' }} />}
                                      label="สามเส้า"
                                      size="small"
                                      color="secondary"
                                      sx={{ mb: 0.25, fontWeight: 500, height: 20, fontSize: '0.75rem', '& .MuiChip-icon': { fontSize: '1rem' } }}
                                    />
                                  )}
                                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.2, fontSize: '0.875rem' }}>
                                    {joinInlineWithHighlight(highlightTerms, detail.rank, detail.fullName)}
                                    {detail.age && <Typography component="span" color="text.secondary" sx={{ fontSize: '0.8rem', ml: 0.5 }}>({detail.age})</Typography>}
                                  </Typography>
                                  {detail.seniority && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2, fontSize: '0.75rem' }}>
                                      อาวุโส {detail.seniority}
                                    </Typography>
                                  )}
                                  {(detail.toPosCodeMaster || replaced?.posCodeMaster) && (
                                    <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600, mb: 0.2, fontSize: '0.75rem' }}>
                                      {highlightGeneral(
                                        detail.toPosCodeMaster ?
                                          `${detail.toPosCodeMaster.id} - ${detail.toPosCodeMaster.name}` :
                                          replaced?.posCodeMaster ? `${replaced.posCodeMaster.id} - ${replaced.posCodeMaster.name}` : ''
                                      )}
                                    </Typography>
                                  )}
                                  <Typography variant="body2" color="text.primary" sx={{ display: 'block', fontWeight: 'bold', fontSize: '0.8125rem' }}>
                                    {renderNewPositionWithHighlight(
                                      detail.toPosition || replaced?.fromPosition || null,
                                      detail.toUnit || replaced?.fromUnit || null,
                                      detail.toPositionNumber || replaced?.fromPositionNumber || null
                                    )}
                                  </Typography>
                                </Box>

                              </Box>
                            ) : (
                              <Chip
                                label="ยังไม่ได้จับคู่"
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ fontWeight: 500, height: 20, fontSize: '0.75rem' }}
                              />
                            )}
                          </TableCell>

                          {/* ข้อมูล */}
                          <TableCell align="center" sx={{ 
                            py: 0.75, 
                            px: 1
                          }}>
                            {detail.transaction && (
                              <Tooltip title="ดูรายละเอียด">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetail(detail);
                                  }}
                                  sx={{ 
                                    color: 'text.secondary',
                                    '&:hover': {
                                      color: 'primary.main'
                                    }
                                  }}
                                >
                                  <InfoIcon sx={{ fontSize: '1rem' }} />
                                </IconButton>
                              </Tooltip>
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
              rowsPerPageOptions={[5, 10, 25, 50, 100, -1]}
              variant="minimal"
              disabled={loading}
            />
          </Paper>
        ) : (
          /* Card View - Mobile */
          <Box>
            {/* Loading Indicator สำหรับการโหลดข้อมูลจำนวนมาก - Mobile */}
            {loading && rowsPerPage === -1 && (
              <Paper sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.95),
                color: 'white',
                py: 2,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                boxShadow: 2
              }}>
                <CircularProgress size={20} sx={{ color: 'white' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  กำลังโหลดข้อมูลทั้งหมด...
                </Typography>
              </Paper>
            )}
            {loading ? (
              // Skeleton Loading Cards - แสดงจำนวนที่เหมาะสม
              <Stack spacing={2}>
                {Array.from({ length: rowsPerPage === -1 ? 15 : Math.min(rowsPerPage, 15) }).map((_, index) => (
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
                    rowsPerPageOptions={[5, 10, 25, 50, -1]}
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

      {/* Back to Top Button - แสดงตลอดเวลาเพื่อ debug */}
      <Tooltip title="กลับไปด้านบน" placement="left">
        <IconButton
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            bgcolor: 'primary.main',
            color: 'white',
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 },
            boxShadow: 4,
            zIndex: 1302,
            opacity: showBackToTop ? 1 : 0.3,
            '&:hover': {
              bgcolor: 'primary.dark',
              boxShadow: 6,
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <KeyboardArrowUpIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
        </IconButton>
      </Tooltip>
    </Layout>
  );
}