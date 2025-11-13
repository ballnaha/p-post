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
  const [loading, setLoading] = useState(false); // เริ่มต้นเป็น false - ไม่โหลดอัตโนมัติ
  const [loadingFilters, setLoadingFilters] = useState(true); // Track filter loading
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load
  const [hasSearched, setHasSearched] = useState(false); // Track ว่าเคย search แล้วหรือยัง
  
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedPosCode, setSelectedPosCode] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all, vacant, reserved, occupied
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
  
  // Store replaced persons for table display
  const [replacedPersonsMap, setReplacedPersonsMap] = useState<Map<string, SwapDetail>>(new Map());
  const [loadingReplacedPersons, setLoadingReplacedPersons] = useState(false);
  
  // Store filter options (loaded once)
  const [filterOptions, setFilterOptions] = useState<{
    units: string[];
    positionCodes: { id: number; name: string }[];
  }>({
    units: [],
    positionCodes: []
  });
  
  // Cache for transaction details to avoid duplicate API calls
  const transactionCacheRef = useRef<Map<string, any>>(new Map());
  
  // Page-level cache (เหมือน police-personnel)
  const dataCacheRef = useRef<{
    data: InOutData | null;
    replacedPersonsMap: Map<string, SwapDetail>;
    timestamp: number;
    filters: string; // cache key based on filters
  }>({
    data: null,
    replacedPersonsMap: new Map(),
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
      const response = await fetch('/api/in-out?page=0&pageSize=1');
      if (!response.ok) return;
      
      const result = await response.json();
      if (result.success && result.data.filters) {
        setFilterOptions({
          units: result.data.filters.units || [],
          positionCodes: result.data.filters.positionCodes || []
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
      const cacheKey = `${selectedUnit}-${selectedPosCode}-${selectedStatus}-${selectedYear}-${page}-${rowsPerPage}-${searchText}`;
      const now = Date.now();
      const cacheAge = now - dataCacheRef.current.timestamp;
      const CACHE_DURATION = 30000; // 30 วินาที (เหมือน police-personnel)
      
      // ใช้ cache ถ้าข้อมูลยังไม่เก่าเกินไปและ filters เหมือนเดิม (และไม่ได้ force reload)
      if (!forceReload && dataCacheRef.current.filters === cacheKey && cacheAge < CACHE_DURATION) {
        setData(dataCacheRef.current.data);
        setReplacedPersonsMap(dataCacheRef.current.replacedPersonsMap);
        setInitialLoad(false);
        setLoading(false);
        return;
      }
      
      // Clear old data
      setReplacedPersonsMap(new Map());
      
      const params = new URLSearchParams({
        unit: selectedUnit,
        posCodeId: selectedPosCode,
        status: selectedStatus,
        year: selectedYear.toString(),
        page: page.toString(),
        pageSize: rowsPerPage.toString(),
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
      console.log('API result:', { success: result.success, dataCount: result.data?.swapDetails?.length, totalCount: result.data?.totalCount });
      
      if (result.success) {
        // แสดงข้อมูลทันที (ไม่รอ replaced persons)
        setData(result.data);
        setInitialLoad(false);
        
        // อัพเดท cache
        dataCacheRef.current = {
          data: result.data,
          replacedPersonsMap: new Map(),
          timestamp: Date.now(),
          filters: cacheKey
        };
        
        // โหลด replaced persons ในพื้นหลัง (ไม่ block UI)
        if (result.data.swapDetails && result.data.swapDetails.length > 0) {
          setLoadingReplacedPersons(true);
          fetchReplacedPersons(result.data.swapDetails)
            .catch(error => {
              console.error('Error fetching replaced persons:', error);
            })
            .finally(() => {
              setLoadingReplacedPersons(false);
            });
        }
      } else {
        console.error('API returned success: false', result);
        setData({ swapDetails: [], totalCount: 0, page: 0, pageSize: rowsPerPage, filters: { units: [], positionCodes: [] } });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch in-out data:', error);
        // ไม่ clear data ที่มีอยู่ เพื่อไม่ให้หน้าจอว่างเปล่า
      }
    } finally {
      if (!abortSignal?.aborted) {
        setLoading(false);
      }
    }
  };

  const fetchReplacedPersons = async (swapDetails: SwapDetail[]) => {
    const newMap = new Map<string, SwapDetail>();
    
    // Filter only those who have transaction (already swapped)
    const swappedDetails = swapDetails.filter(d => d.transaction);
    
    // Group by transaction ID to minimize API calls
    const transactionIds = [...new Set(swappedDetails.map(d => d.transaction!.id))];
    
    // แยก transactions ที่มี cache และไม่มี cache
    const cachedResults: any[] = [];
    const uncachedIds: string[] = [];
    
    transactionIds.forEach(id => {
      if (transactionCacheRef.current.has(id)) {
        cachedResults.push(transactionCacheRef.current.get(id));
      } else {
        uncachedIds.push(id);
      }
    });
    
    // โหลดเฉพาะ transactions ที่ยังไม่มี cache
    const transactionResults: any[] = [...cachedResults];
    
    if (uncachedIds.length > 0) {
      const batchSize = 10;
      
      for (let i = 0; i < uncachedIds.length; i += batchSize) {
        const batch = uncachedIds.slice(i, i + batchSize);
        const batchPromises = batch.map(transactionId =>
          fetch(`/api/swap-transactions/${transactionId}`)
            .then(response => response.ok ? response.json() : null)
            .catch(error => {
              console.error('Error fetching transaction details:', error);
              return null;
            })
        );
        const batchResults = await Promise.all(batchPromises);
        
        // เก็บใน cache
        batch.forEach((id, index) => {
          if (batchResults[index]) {
            transactionCacheRef.current.set(id, batchResults[index]);
          }
        });
        
        transactionResults.push(...batchResults);
      }
    }
    
    transactionResults.forEach((result, index) => {
      if (result && result.success && result.data.swapDetails) {
        const transactionId = transactionIds[index];
        try {
          // For each detail in current page, find who previously held the NEW position
          // (คนที่เราไปแทน = คนที่เดิมอยู่ในตำแหน่งใหม่ของเรา)
          const txDetails: SwapDetail[] = swappedDetails.filter(d => d.transaction!.id === transactionId);
          const rawTxDetails: SwapDetail[] = result.data.swapDetails;
          const swapTypeFromApi: string | undefined = result?.data?.swapType;
          const isTwoWay = swapTypeFromApi === 'two-way' && rawTxDetails.length >= 2;
          
          console.log('[In-Out] Transaction debug', {
            transactionId,
            swapType: swapTypeFromApi,
            apiRecords: rawTxDetails.length,
            apiDetails: rawTxDetails.map(d => ({ id: d.id, fullName: d.fullName })),
            pageRecords: txDetails.length,
            pageDetails: txDetails.map(d => ({ id: d.id, fullName: d.fullName }))
          });

          txDetails.forEach(detail => {
            let replaced: SwapDetail | undefined;

            if (isTwoWay) {
              // Two-way: ใช้ personnelId หรือ nationalId ในการ match (เพราะ ID ของ detail ไม่ตรงกัน)
              if (rawTxDetails.length === 2) {
                // เอาคนอื่นใน transaction (match by personnelId or nationalId)
                replaced = rawTxDetails.find(d => 
                  d.personnelId !== detail.personnelId || 
                  d.nationalId !== detail.nationalId
                );
                console.log('[In-Out] Two-way match by personnelId:', {
                  person: detail.fullName,
                  personPersonnelId: detail.personnelId,
                  personNationalId: detail.nationalId,
                  otherPerson: replaced?.fullName || 'NOT FOUND',
                  otherPersonnelId: replaced?.personnelId,
                  otherNationalId: replaced?.nationalId
                });
              } else if (detail.toPositionNumber) {
                // Fallback: ใช้ position_number
                replaced = rawTxDetails.find((d: SwapDetail) => 
                  (d.personnelId !== detail.personnelId || d.nationalId !== detail.nationalId) && 
                  d.fromPositionNumber === detail.toPositionNumber
                );
              } else if (detail.toPosition) {
                // Fallback: ใช้ position
                replaced = rawTxDetails.find((d: SwapDetail) => 
                  (d.personnelId !== detail.personnelId || d.nationalId !== detail.nationalId) && 
                  d.fromPosition === detail.toPosition
                );
              }
            } else {
              // Three-way หรือ multi-way: หาคนที่ตำแหน่งเดิม (fromPosition/fromPositionNumber) ตรงกับตำแหน่งใหม่ของเรา (toPosition/toPositionNumber)
              // ลำดับความสำคัญ: position_number > position (เพราะ position_number แม่นยำกว่า)
              if (detail.toPositionNumber) {
                // ใช้ position_number ในการ match (แม่นยำที่สุด)
                replaced = rawTxDetails.find((d: SwapDetail) => 
                  (d.personnelId !== detail.personnelId || d.nationalId !== detail.nationalId) && 
                  d.fromPositionNumber === detail.toPositionNumber
                );
              } else if (detail.toPosition) {
                // ถ้าไม่มี toPositionNumber ให้ match จาก position
                replaced = rawTxDetails.find((d: SwapDetail) => 
                  (d.personnelId !== detail.personnelId || d.nationalId !== detail.nationalId) && 
                  d.fromPosition === detail.toPosition
                );
              }
              
              console.log('[In-Out] Three-way match:', {
                person: detail.fullName,
                toPosition: detail.toPosition,
                toPositionNumber: detail.toPositionNumber,
                replaced: replaced?.fullName || 'NOT FOUND',
                replacedFromPosition: replaced?.fromPosition,
                replacedFromPositionNumber: replaced?.fromPositionNumber,
                allDetails: rawTxDetails.map(d => ({ 
                  name: d.fullName, 
                  fromPosition: d.fromPosition,
                  fromPositionNumber: d.fromPositionNumber,
                  toPosition: d.toPosition,
                  toPositionNumber: d.toPositionNumber
                }))
              });
            }

            if (replaced) {
              newMap.set(detail.id, replaced);
            }
          });
        } catch (error) {
          console.error('Error processing transaction:', error);
        }
      }
    });
    
    setReplacedPersonsMap(newMap);
    
    // อัพเดท cache
    const cacheKey = `${selectedUnit}-${selectedPosCode}-${selectedStatus}-${selectedYear}-${page}-${rowsPerPage}-${searchText}`;
    dataCacheRef.current = {
      data: data,
      replacedPersonsMap: newMap,
      timestamp: Date.now(),
      filters: cacheKey
    };
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
  }, [selectedUnit, selectedPosCode, selectedStatus, selectedYear, page, rowsPerPage, searchText]);

  const filteredSwapDetails = useMemo(() => {
    if (!data?.swapDetails) return [];
    return data.swapDetails;
  }, [data?.swapDetails]);

  const handleUnitChange = (event: SelectChangeEvent<string>) => {
    setInitialLoad(false); // Mark that user has interacted
    setSelectedUnit(event.target.value);
    setPage(0);
  };

  const handlePosCodeChange = (event: SelectChangeEvent<string>) => {
    setInitialLoad(false); // Mark that user has interacted
    setSelectedPosCode(event.target.value);
    setPage(0);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setInitialLoad(false); // Mark that user has interacted
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
    setSearchText('');
    setSelectedUnit('all');
    setSelectedPosCode('all');
    setSelectedStatus('all');
    setPage(0);
  };

  const handleLoadData = () => {
    setHasSearched(true);
    setInitialLoad(false);
    
    // Clear cache และ force reload ข้อมูลใหม่
    dataCacheRef.current = {
      data: null,
      replacedPersonsMap: new Map(),
      timestamp: 0,
      filters: ''
    };
    
    // โหลดเฉพาะข้อมูล (filters โหลดแล้วตอน mount) - force reload
    fetchData(undefined, true);
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setInitialLoad(false); // Mark that user has interacted
    setSelectedStatus(event.target.value);
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setInitialLoad(false); // Mark that user has interacted
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
      case 'promotion-chain': return 'เลื่อนตำแหน่งแบบลูกโซ่';
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
          // หาคนที่ไปอยู่ตำแหน่งเดิมของเรา (fromPosition)
          const partner = result.data.swapDetails.find((d: SwapDetail) => 
            d.id !== detail.id && d.toPosCodeId === detail.posCodeId
          );
          setSwapPartner(partner || null);
          
          // หาคนที่เราไปแทน (คนที่อยู่ในตำแหน่งใหม่ของเรา)
          const replaced = result.data.swapDetails.find((d: SwapDetail) => 
            d.id !== detail.id && d.posCodeId === detail.toPosCodeId
          );
          setReplacedPerson(replaced || null);
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
            gap: 2
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
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
            gap: 2,
            mb: 2
          }}>
            {loadingFilters ? (
              <>
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

        {/* Table - Desktop/Tablet */}
        {!isMobile ? (
          <Paper sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50, py: 1.5, fontWeight: 600 }}>#</TableCell>                  
                    <TableCell sx={{ minWidth: isTablet ? 200 : 280, py: 1.5, fontWeight: 600 }}>ชื่อ-สกุล / ตำแหน่งเดิม</TableCell>
                    <TableCell sx={{ minWidth: isTablet ? 180 : 240, py: 1.5, fontWeight: 600 }}>ตำแหน่งใหม่</TableCell>
                    <TableCell sx={{ width: isTablet ? 100 : 120, py: 1.5, fontWeight: 600 }}>ประเภท</TableCell>
                    <TableCell align="center" sx={{ width: 80, py: 1.5, fontWeight: 600 }}>ดูข้อมูล</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    // Skeleton Loading Rows
                    Array.from({ length: rowsPerPage }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell sx={{ py: 1.5 }}>
                          <Skeleton variant="text" width={30} />
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box>
                            <Skeleton variant="text" width="80%" height={20} />
                            <Skeleton variant="text" width="90%" height={16} sx={{ mt: 0.5 }} />
                            <Skeleton variant="text" width="60%" height={14} sx={{ mt: 0.25 }} />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Box>
                            <Skeleton variant="text" width="70%" height={16} />
                            <Skeleton variant="text" width="85%" height={20} sx={{ mt: 0.25 }} />
                            <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.25 }} />
                            <Skeleton variant="text" width="75%" height={14} sx={{ mt: 0.5 }} />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Skeleton variant="rounded" width={80} height={24} />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.5 }}>
                          <Skeleton variant="circular" width={32} height={32} sx={{ mx: 'auto' }} />
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
                    filteredSwapDetails.map((detail, index) => (
                      <TableRow key={detail.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {page * rowsPerPage + index + 1}
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ py: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: isTablet ? '0.8125rem' : '0.875rem' }}>
                                {joinInline(detail.rank || '-', detail.fullName || '-')}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                sx={{ 
                                  fontSize: isTablet ? '0.75rem' : '0.8125rem', 
                                  display: 'block', 
                                  mt: 0.25,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {(() => {
                                  const code = detail.posCodeMaster ? `${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}` : '';
                                  const unit = detail.fromUnit ? `หน่วย: ${detail.fromUnit}` : '';
                                  return joinInline(code, detail.fromPosition || undefined, unit) || '-';
                                })()}
                              </Typography>
                              {detail.nationalId && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.25 }}>
                                  เลขตำแหน่ง: {detail.nationalId}
                                </Typography>
                              )}
                            </Box>
                            {!isTablet && (
                              <Tooltip title="ดูข้อมูลเต็ม">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewPersonnelDetail(detail)}
                                  sx={{
                                    color: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.50' }
                                  }}
                                >
                                  <InfoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, bgcolor: (detail.toPosCodeMaster || detail.toPosition) ? alpha('#4caf50', 0.05) : 'transparent' }}>
                          {(detail.toPosCodeMaster || detail.toPosition) ? (
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                {detail.toPosCodeMaster && (
                                  <Typography 
                                    variant="caption" 
                                    color="success.main" 
                                    sx={{ 
                                      fontSize: isTablet ? '0.7rem' : '0.75rem', 
                                      display: 'block', 
                                      fontWeight: 600,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {detail.toPosCodeMaster.id} - {detail.toPosCodeMaster.name}
                                  </Typography>
                                )}
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    color: 'success.main', 
                                    fontSize: isTablet ? '0.8125rem' : '0.875rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {(() => {
                                    const unit = detail.toUnit ? `หน่วย: ${detail.toUnit}` : '';
                                    return joinInline(detail.toPosition || undefined, unit);
                                  })()}
                                </Typography>
                                {detail.toPositionNumber && (
                                  <Typography variant="caption" color="success.dark" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.25 }}>
                                    เลขตำแหน่ง: {detail.toPositionNumber}
                                  </Typography>
                                )}
                                {/* ผู้ที่เดิมครองตำแหน่งนี้ */}
                                <Box sx={{ mt: 0.4 }}>
                                  {(() => {
                                    // แสดง skeleton loading ถ้ากำลังโหลด replaced persons
                                    if (loadingReplacedPersons && !replacedPersonsMap.has(detail.id)) {
                                      return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Skeleton variant="text" width={120} height={14} />
                                        </Box>
                                      );
                                    }
                                    
                                    const replaced = replacedPersonsMap.get(detail.id);
                                    if (replaced) {
                                      return (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                          <Typography 
                                            variant="caption" 
                                            sx={{ 
                                              fontSize: isTablet ? '0.7rem' : '0.75rem', 
                                              color: 'warning.dark', 
                                              fontWeight: 600 
                                            }}
                                          >
                                            เดิม: {joinInline(replaced.rank || '', replaced.fullName || '')}
                                          </Typography>
                                          {!isTablet && (
                                            <Tooltip title="ดูข้อมูลเต็ม">
                                              <IconButton
                                                size="small"
                                                onClick={() => handleViewPersonnelDetail(replaced)}
                                                sx={{
                                                  color: 'warning.dark',
                                                  p: 0.25,
                                                  '&:hover': { bgcolor: 'warning.50' }
                                                }}
                                              >
                                                <InfoIcon sx={{ fontSize: 14 }} />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </Box>
                                      );
                                    }
                                    // ถ้าไม่มีคนเดิม
                                    // ถ้าเป็น two-way หรือ three-way แต่ไม่พบข้อมูลคนเดิม (ผิดปกติ)
                                    if ((detail.transaction?.swapType === 'two-way' || detail.transaction?.swapType === 'three-way' || detail.transaction?.swapType === 'multi-way') && detail.toPosCodeId) {
                                      return (
                                        <Typography variant="caption" color="error.main" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                          เดิม: ข้อมูลไม่พบ
                                        </Typography>
                                      );
                                    }
                                    // กรณีอื่นๆ (promotion, promotion-chain หรือตำแหน่งว่าง)
                                    return (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                        เดิม: ตำแหน่งว่าง
                                      </Typography>
                                    );
                                  })()}
                                </Box>
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                              ยังไม่ได้สลับตำแหน่ง
                            </Typography>
                          )}
                        </TableCell>
                        
                        {/* ประเภทการสลับ */}
                        <TableCell sx={{ py: 1.5 }}>
                          {detail.transaction ? (
                            <Chip 
                              label={getSwapTypeLabel(detail.transaction.swapType)}
                              size="small"
                              color={detail.transaction.swapType === 'three-way' ? 'warning' : (detail.transaction.swapType === 'promotion' ? 'info' : 'primary')}
                              sx={{ fontSize: isTablet ? '0.7rem' : '0.75rem' }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.disabled">-</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1.5 }}>
                          {detail.transaction ? (
                            <Tooltip title="ดูรายละเอียด">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetail(detail)}
                                sx={{
                                  color: 'primary.main',
                                  '&:hover': {
                                    bgcolor: 'primary.50',
                                  }
                                }}
                              >
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              -
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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

                        {/* Personnel Info */}
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {joinInline(detail.rank || '-', detail.fullName || '-')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                            {(() => {
                              const code = detail.posCodeMaster ? `${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}` : '';
                              return code || '-';
                            })()}
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

                        {/* From Position */}
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            ตำแหน่งเดิม
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                            {detail.fromPosition || '-'}
                          </Typography>
                          {detail.fromUnit && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                              หน่วย: {detail.fromUnit}
                            </Typography>
                          )}
                          {detail.nationalId && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                              เลขตำแหน่ง: {detail.nationalId}
                            </Typography>
                          )}
                        </Box>

                        {/* To Position */}
                        {(detail.toPosCodeMaster || detail.toPosition) ? (
                          <Box sx={{ p: 1.5, bgcolor: alpha('#4caf50', 0.08), borderRadius: 1 }}>
                            <Typography variant="caption" color="success.dark" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                              ตำแหน่งใหม่
                            </Typography>
                            {detail.toPosCodeMaster && (
                              <Typography variant="caption" color="success.main" sx={{ fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>
                                {detail.toPosCodeMaster.id} - {detail.toPosCodeMaster.name}
                              </Typography>
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', fontSize: '0.8125rem' }}>
                              {detail.toPosition || '-'}
                            </Typography>
                            {detail.toUnit && (
                              <Typography variant="caption" color="success.dark" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                หน่วย: {detail.toUnit}
                              </Typography>
                            )}
                            {detail.toPositionNumber && (
                              <Typography variant="caption" color="success.dark" sx={{ fontSize: '0.7rem', display: 'block' }}>
                                เลขตำแหน่ง: {detail.toPositionNumber}
                              </Typography>
                            )}
                            
                            {/* Replaced Person */}
                            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'success.light' }}>
                              {(() => {
                                // แสดง skeleton loading ถ้ากำลังโหลด replaced persons
                                if (loadingReplacedPersons && !replacedPersonsMap.has(detail.id)) {
                                  return <Skeleton variant="text" width={140} height={16} />;
                                }
                                
                                const replaced = replacedPersonsMap.get(detail.id);
                                if (replaced) {
                                  return (
                                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'warning.dark', fontWeight: 600 }}>
                                      เดิม: {joinInline(replaced.rank || '', replaced.fullName || '')}
                                    </Typography>
                                  );
                                }
                                // ถ้าไม่มีคนเดิม
                                // ถ้าเป็น two-way หรือ three-way แต่ไม่พบข้อมูลคนเดิม (ผิดปกติ)
                                if ((detail.transaction?.swapType === 'two-way' || detail.transaction?.swapType === 'three-way' || detail.transaction?.swapType === 'multi-way') && detail.toPosCodeId) {
                                  return (
                                    <Typography variant="caption" color="error.main" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                      เดิม: ข้อมูลไม่พบ
                                    </Typography>
                                  );
                                }
                                // กรณีอื่นๆ (promotion, promotion-chain หรือตำแหน่งว่าง)
                                return (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                    เดิม: ตำแหน่งว่าง
                                  </Typography>
                                );
                              })()}
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                              ยังไม่ได้สลับตำแหน่ง
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