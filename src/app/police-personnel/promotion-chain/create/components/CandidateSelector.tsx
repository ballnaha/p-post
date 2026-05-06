'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Button, TextField, InputAdornment, Box, Typography, CircularProgress, Paper, IconButton, Divider, FormControl, Select, MenuItem, SelectChangeEvent, Chip, Collapse, Stack, Pagination, Skeleton, useMediaQuery, useTheme, Badge, Tooltip } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon, FilterList as FilterListIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Person as PersonIcon, Badge as BadgeIcon, CalendarToday as CalendarIcon, School as EducationIcon, Star as StarIcon } from '@mui/icons-material';
// DataTablePagination removed in favor of MUI Pagination for consistency

// Types - ตรงกับ PolicePersonnel schema
interface SwapListPerson {
  id: string; // police_personnel.id
  
  // ข้อมูลบุคคล (Person Information)
  nationalId: string; // police_personnel.nationalId
  fullName: string; // police_personnel.fullName
  rank: string; // police_personnel.rank
  seniority?: string; // police_personnel.seniority
  age?: string; // police_personnel.age
  birthDate?: string | null;
  education?: string | null;
  
  // ข้อมูลตำแหน่ง (Position Information)
  posCodeId: number; // police_personnel.posCodeId
  posCodeMaster?: {
    id: number;
    name: string;
  } | null;
  posCodeName?: string; // posCodeMaster.name
  position: string; // police_personnel.position
  positionNumber?: string; // police_personnel.positionNumber
  unit: string; // police_personnel.unit
  actingAs?: string; // police_personnel.actingAs
  
  // ข้อมูลการแต่งตั้ง/ดำรงตำแหน่ง
  yearsOfService?: string; // police_personnel.yearsOfService
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  
  // ข้อมูลการฝึกอบรม
  trainingCourse?: string; // police_personnel.trainingCourse
  trainingLocation?: string | null;
  
  // ข้อมูลการเสนอชื่อ
  supporterName?: string; // police_personnel.supporterName
  supportReason?: string; // police_personnel.supportReason
  
  // Notes
  notes?: string | null;
  
  // Metadata
  rankLevel: number; // ใช้ posCodeId เป็น rankLevel
}

interface VacantPosition {
  id: string;
  posCodeId: number; // police_personnel.posCodeId
  posCodeName?: string; // posCodeMaster.name
  position: string; // police_personnel.position
  unit: string; // police_personnel.unit
  actingAs?: string; // police_personnel.actingAs - ทำหน้าที่
}

interface CandidateSelectorProps {
  open: boolean;
  onClose: () => void;
  targetRankLevel: number; // ระดับของตำแหน่งว่างที่ต้องการหาคนมาแทน
  onSelect: (candidate: SwapListPerson) => void;
  vacantPosition: VacantPosition | null;
  selectedPersonnelIds?: string[]; // รายชื่อผู้ที่ถูกเลือกแล้วใน chain เพื่อแสดงตัวบ่งชี้
  excludeTransactionId?: string; // Transaction ID ที่กำลังแก้ไข (ไม่กรองบุคลากรใน transaction นี้ออก)
  isInsertMode?: boolean; // กำลังอยู่ในโหมดแทรกหรือไม่
}

export default function CandidateSelector({
  open,
  onClose,
  targetRankLevel,
  onSelect,
  vacantPosition,
  selectedPersonnelIds = [],
  excludeTransactionId,
  isInsertMode = false,
}: CandidateSelectorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<SwapListPerson[]>([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [allUnits, setAllUnits] = useState<string[]>([]); // เก็บรายการหน่วยทั้งหมด
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<SwapListPerson | null>(null);
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterPosCode, setFilterPosCode] = useState<string>('all'); // Filter posCodeId
  const [filterSupporter, setFilterSupporter] = useState<string>('all'); // Filter by supporter status
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [showFilters, setShowFilters] = useState(false);  // Drilldown state - เก็บ ID ของ candidate ที่ถูกขยาย
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20); // เพิ่มจาก 10 เป็น 20 เพื่อลดการ re-render
  const [initialLoading, setInitialLoading] = useState(false);
  
  // Track if filter options are loaded
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // รอ 300ms หลังจากพิมพ์ค้างแล้วค่อยค้นหา

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (open) {
      // Reset all states immediately to prevent showing old data
      setCandidates([]);
      setTotalCandidates(0);
      setAllUnits([]);
      setPosCodeOptions([]);
      setSearchTerm('');
      setSelectedCandidate(null);
      setExpandedCandidateId(null);
      setFilterPosCode('all');
      setFilterSupporter('all');
      setPage(0);
      
      // Set loading states FIRST to prevent other useEffects from triggering
      setInitialLoading(true);
      setFilterOptionsLoaded(false);

      // Determine initial filter unit
      const initialUnit = vacantPosition?.unit || 'all';
      setFilterUnit(initialUnit);

      // Load all initial data before showing content
      (async () => {
        try {
          // Load all data in parallel for faster performance
          const [_, __, candidatesData] = await Promise.all([
            loadAllUnits(), 
            loadPosCodes(),
            // Load candidates data immediately in parallel
            (async () => {
              try {
                const params = new URLSearchParams();
                if (initialUnit && initialUnit !== 'all') params.set('unit', initialUnit);
                params.set('posCodeId', 'all');
                params.set('supporter', 'all');
                params.set('page', '0');
                params.set('limit', rowsPerPage.toString());

                const response = await fetch(`/api/police-personnel/candidates?${params.toString()}`);
                if (!response.ok) throw new Error('Failed to fetch candidates');

                const result = await response.json();
                let pageData: any[] = Array.isArray(result?.data) ? result.data : [];

                // Apply client-side filter by target rank level if set
                if (targetRankLevel !== undefined && targetRankLevel !== null) {
                  pageData = pageData.filter(c => {
                    const candidateRankLevel = c.rankLevel ?? c.posCodeId ?? 999;
                    return candidateRankLevel >= targetRankLevel;
                  });
                }

                return { data: pageData, total: result?.total || 0 };
              } catch (error) {
                console.error('Error loading candidates:', error);
                return { data: [], total: 0 };
              }
            })()
          ]);
          
          // Set all data at once after filtering is complete
          setCandidates(candidatesData.data as SwapListPerson[]);
          setTotalCandidates(candidatesData.total);
          setFilterOptionsLoaded(true);
          
        } catch (error) {
          console.error('Error in initial load:', error);
          setCandidates([]);
          setTotalCandidates(0);
          setFilterOptionsLoaded(true);
        } finally {
          setInitialLoading(false);
        }
      })();
    } else {
      // When closing, reset states
      setInitialLoading(false);
      setFilterOptionsLoaded(false);
    }
  }, [open, targetRankLevel, vacantPosition?.unit, rowsPerPage]);
  const loadPosCodes = async () => {
    try {
      const res = await fetch('/api/police-personnel/pos-codes');
      if (!res.ok) throw new Error('Failed to fetch pos codes');
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setPosCodeOptions(list.map((p: any) => ({ id: p.id, name: p.name })));
    } catch (e) {
      console.error('Error loading pos codes:', e);
      setPosCodeOptions([]);
    }
  };
  const loadAllUnits = async () => {
    try {
      // ดึงรายการหน่วยทั้งหมดจากฐานข้อมูล
      const response = await fetch('/api/police-personnel/units');
      if (!response.ok) {
        throw new Error('Failed to fetch units');
      }
      const result = await response.json();
      const units = result.data || [];
      setAllUnits(units);
      console.log('All units loaded:', units);
    } catch (error) {
      console.error('Error loading units:', error);
      // Fallback: ใช้หน่วยจาก candidates ถ้า API ล้มเหลว
      setAllUnits([]);
    }
  };

  const loadCandidatesWithFilter = async (
    unit: string, 
    posCode: string, 
    supporter: string,
    search: string, 
    currentPage: number, 
    pageSize: number
  ) => {
    setLoading(true);
    try {
      // Server-side pagination and filters
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (unit && unit !== 'all') params.set('unit', unit);
      if (posCode && posCode !== 'all') params.set('posCodeId', posCode);
      if (supporter && supporter !== 'all') params.set('supporter', supporter);
      params.set('page', currentPage.toString());
      params.set('limit', pageSize.toString());
      
      // ส่งปีปัจจุบัน (พ.ศ.) เพื่อกรองบุคลากรที่มีอยู่ใน swap transaction แล้ว
      const currentYear = new Date().getFullYear() + 543;
      params.set('year', currentYear.toString());
      
      // ส่ง transaction ID ที่กำลังแก้ไข เพื่อไม่กรองบุคลากรใน transaction นี้ออก
      if (excludeTransactionId) {
        params.set('excludeTransactionId', excludeTransactionId);
      }

      const response = await fetch(`/api/police-personnel/candidates?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }

      const result = await response.json();
      const pageData: any[] = Array.isArray(result?.data) ? result.data : [];
      setCandidates(pageData as SwapListPerson[]);
      setTotalCandidates(result?.total || 0);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async () => {
    await loadCandidatesWithFilter(
      filterUnit, 
      filterPosCode, 
      filterSupporter,
      debouncedSearchTerm, 
      page, 
      rowsPerPage
    );
  };

  

  // Format date utility function - แปลงเป็น พ.ศ.
  const formatDate = (dateString?: string | null): string => {
    if (!dateString || dateString === '-') return '-';
    
    // ถ้าเป็นรูปแบบ DD/MM/YYYY หรือ D/M/YYYY อยู่แล้ว
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parseInt(parts[2]);
        
        // ถ้าเป็น พ.ศ. อยู่แล้ว (มากกว่า 2500)
        if (year > 2500) {
          return `${day}/${month}/${year}`;
        }
        
        // ถ้าเป็น ค.ศ. ให้แปลงเป็น พ.ศ.
        if (year > 1900 && year < 2100) {
          const thaiYear = year + 543;
          return `${day}/${month}/${thaiYear}`;
        }
      }
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
      // ถ้า parse ไม่ได้ ให้ return ค่าเดิม
    }
    
    return dateString;
  };

  const getRankName = (posCodeId: number): string => {
    // ใช้ข้อมูลจาก vacantPosition.position ถ้ามี posCodeId ตรงกัน
    if (vacantPosition?.posCodeId === posCodeId) {
      return vacantPosition.position;
    }
    // ถ้าไม่ตรง ให้ค้นหาจาก candidates
    const candidate = candidates.find(c => c.posCodeId === posCodeId);
    return candidate?.position || `PosCode ${posCodeId}`;
  };

  // Get unique units for filter - ใช้ useMemo เพื่อไม่ให้คำนวณซ้ำ
  const uniqueUnits = useMemo(() => {
    if (allUnits.length > 0) {
      return [...allUnits].sort((a, b) => a.localeCompare(b, 'th'));
    }
    return Array.from(new Set(candidates.map(c => c.unit))).sort((a, b) => a.localeCompare(b, 'th'));
  }, [allUnits, candidates]);

  // Use full pos code list from API for complete options
  const uniquePosCodes = posCodeOptions;

  // Server-side data already filtered and paginated
  const filteredCandidates = candidates;
  const paginatedCandidates = candidates;

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Reset page when search or filter changes (ใช้ debouncedSearchTerm แทน searchTerm)
  useEffect(() => {
    if (!initialLoading) {
      setPage(0);
    }
  }, [debouncedSearchTerm, filterUnit, filterPosCode, filterSupporter, initialLoading]);

  // Fetch when paging or filters change (but not during initial loading)
  useEffect(() => {
    if (open && !initialLoading) {
      loadCandidates();
    }
  }, [page, rowsPerPage, debouncedSearchTerm, filterUnit, filterPosCode, filterSupporter, open, initialLoading]);

  const handleSelect = () => {
    if (selectedCandidate) {
      onSelect(selectedCandidate);
      setSelectedCandidate(null);
      setSearchTerm('');
      setPage(0); // Reset to page 1 after selection
    }
  };

  const handleClose = () => {
    setSelectedCandidate(null);
    setSearchTerm('');
    onClose();
  };

  // Toggle drilldown expansion
  const handleToggleExpand = (candidateId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the candidate
    setExpandedCandidateId(expandedCandidateId === candidateId ? null : candidateId);
  };

  // Double-click to select
  const handleDoubleClick = (candidate: SwapListPerson) => {
    setSelectedCandidate(candidate);
    // ถ้าผู้สมัครถูกเลือกไปแล้วใน chain ให้ไม่ทำการเลือกอัตโนมัติ
    if (selectedPersonnelIds.includes(candidate.id)) {
      return;
    }
    setTimeout(() => {
      onSelect(candidate);
      setSelectedCandidate(null);
      setSearchTerm('');
      setPage(0); // Reset to page 1 after selection
    }, 100);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'Enter' && selectedCandidate) {
        handleSelect();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open, selectedCandidate]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      ModalProps={{
        sx: {
          zIndex: 10001, // สูงกว่า AppBar และ components อื่นๆ
        }
      }}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: '90%', md: 800 }, 
          backgroundImage: 'none'
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
              {isInsertMode ? '🔄 แทรกผู้สมัคร' : 'เลือกผู้สมัคร'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
              {isInsertMode 
                ? 'เลือกบุคลากรที่ต้องการแทรกเข้าไปในลูกโซ่' 
                : 'เลือกบุคลากร'
              }
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon sx={{ fontSize: { xs: 22, md: 20 } }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, sm: 1.5 } }}>
        {(initialLoading || !filterOptionsLoaded) ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
            <CircularProgress size={isMobile ? 40 : 48} />
            <Typography variant="body1" color="text.secondary" sx={{ mt: 3, fontWeight: 500, fontSize: { xs: '0.9rem', md: '1rem' } }}>
              กำลังโหลดและกรองข้อมูลผู้สมัคร...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
              {!filterOptionsLoaded ? 'กำลังโหลด...' : 'กรุณารอสักครู่'}
            </Typography>
          </Box>
  ) : (
  <>
  {/* Info Card - Modern Design */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1.5, 
            mb: 1.5, 
            bgcolor: 'primary.main',
            borderRadius: 1.5,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Chip 
                label="ตำแหน่งว่าง" 
                size="small" 
                sx={{ 
                  fontWeight: 700, 
                  bgcolor: 'white',
                  color: 'primary.main',
                  fontSize: '0.75rem',
                  height: 22,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white', flex: 1 }}>
                {vacantPosition?.posCodeName}
              </Typography>
            </Box>
            
            <Typography variant="body1" sx={{ fontWeight: 600, color: 'white', mb: 1.25 }}>
              {vacantPosition?.position}
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              flexWrap: 'wrap',
              '& > *': {
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'white',
              }
            }}>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  📍 หน่วย:
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {vacantPosition?.unit}
                </Typography>
              </Box>
              
              {vacantPosition?.actingAs && vacantPosition?.actingAs !== '-' && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.5)' }} />
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                      💼 ทำหน้าที่:
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {vacantPosition?.actingAs}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Search and Filter Bar */}
        <Box sx={{ mb: 1.5 }}>
          {/* Search and Filter Toggle */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
            <TextField
              fullWidth
              placeholder="ค้นหา ชื่อ, ตำแหน่ง, หน่วย..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Mobile: Toggle Filter Button */}
            {isMobile && (
              <Badge 
                badgeContent={
                  (filterUnit !== 'all' ? 1 : 0) + 
                  (filterPosCode !== 'all' ? 1 : 0) +
                  (filterSupporter !== 'all' ? 1 : 0)
                } 
                color="primary"
                invisible={filterUnit === 'all' && filterPosCode === 'all' && filterSupporter === 'all'}
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
              <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 180 }}>
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
                        <Typography variant="body2" noWrap>{selected}</Typography>
                      </Box>
                    );
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        zIndex: 10002, // สูงกว่า Drawer
                      }
                    },
                    sx: { zIndex: 10002 },
                  }}
                >
                  <MenuItem value="all">
                    <Typography variant="body2">ทุกหน่วย</Typography>
                  </MenuItem>
                  {vacantPosition && (
                    <MenuItem value={vacantPosition.unit}>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        {vacantPosition.unit} (หน่วยเดียวกัน)
                      </Typography>
                    </MenuItem>
                )}
                <Divider />
                {uniqueUnits
                  .filter(unit => unit !== vacantPosition?.unit)
                  .map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      <Typography variant="body2">{unit}</Typography>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

              <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 180 }}>
                <Select
                  value={filterPosCode}
                  onChange={(e: SelectChangeEvent) => setFilterPosCode(e.target.value)}
                  displayEmpty
                  renderValue={(selected) => {
                    if (selected === 'all') {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FilterListIcon fontSize="small" />
                          <Typography variant="body2">ทุกระดับ</Typography>
                        </Box>
                      );
                    }
                    const posCode = uniquePosCodes.find(pc => pc.id.toString() === selected);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FilterListIcon fontSize="small" />
                        <Typography variant="body2" noWrap>
                          {posCode ? `${posCode.id} - ${posCode.name}` : selected}
                        </Typography>
                      </Box>
                    );
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        zIndex: 10002, // สูงกว่า Drawer
                      }
                    },
                    sx: { zIndex: 10002 },
                  }}
                >
                  <MenuItem value="all">
                    <Typography variant="body2">ทุกระดับ</Typography>
                  </MenuItem>
                  {vacantPosition?.posCodeId && (
                    <MenuItem value={vacantPosition.posCodeId.toString()}>
                      <Typography variant="body2" fontWeight={600} color="primary.main">
                        {vacantPosition.posCodeId} - {vacantPosition.posCodeName} (ระดับเดียวกัน)
                      </Typography>
                    </MenuItem>
                  )}
                  <Divider />
                  {uniquePosCodes
                    .filter(pc => pc.id !== vacantPosition?.posCodeId)
                    .map((posCode) => (
                      <MenuItem key={posCode.id} value={posCode.id.toString()}>
                        <Typography variant="body2">{posCode.id} - {posCode.name}</Typography>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 180 }}>
                <Select
                  value={filterSupporter}
                  onChange={(e: SelectChangeEvent) => setFilterSupporter(e.target.value)}
                  displayEmpty
                  renderValue={(selected) => {
                    if (selected === 'all') {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FilterListIcon fontSize="small" />
                          <Typography variant="body2">ทุกคน</Typography>
                        </Box>
                      );
                    }
                    const labels = {
                      'with-supporter': 'มีผู้สนับสนุน',
                      'without-supporter': 'ไม่มีผู้สนับสนุน'
                    };
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FilterListIcon fontSize="small" />
                        <Typography variant="body2" noWrap>
                          {labels[selected as keyof typeof labels] || selected}
                        </Typography>
                      </Box>
                    );
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        zIndex: 10002, // สูงกว่า Drawer
                      }
                    },
                    sx: { zIndex: 10002 },
                  }}
                >
                  <MenuItem value="all">
                    <Typography variant="body2">ทุกคน</Typography>
                  </MenuItem>
                  <MenuItem value="with-supporter">
                    <Typography variant="body2">มีผู้สนับสนุน</Typography>
                  </MenuItem>
                  <MenuItem value="without-supporter">
                    <Typography variant="body2">ไม่มีผู้สนับสนุน</Typography>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Collapse>
          
          {loading ? (
            <Skeleton variant="rounded" height={28} sx={{ borderRadius: 0.75 }} />
          ) : totalCandidates > 0 && (
            <Paper 
              elevation={0} 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 0.75,
                bgcolor: 'grey.50',
                borderRadius: 0.75,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                📊 พบ {totalCandidates} รายการ • หน้า {page + 1}/{Math.ceil(totalCandidates / rowsPerPage) || 1}
              </Typography>
              <Chip 
                label="💡 Double-click = เลือกด่วน"
                size="small"
                sx={{ 
                  bgcolor: 'primary.main',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 22,
                }}
              />
            </Paper>
          )}
        </Box>

        {/* Candidates List */}
        {loading ? (
          <Box sx={{ p: 1 }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Paper key={idx} elevation={0} sx={{ p: 1.25, mb: 0.75 }}>
                <Skeleton variant="text" width="40%" height={24} />
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Skeleton variant="rounded" width={100} height={22} />
                  <Skeleton variant="rounded" width={160} height={22} />
                  <Skeleton variant="rounded" width={120} height={22} />
                </Box>
                <Skeleton variant="text" width="60%" height={20} sx={{ mt: 0.75 }} />
              </Paper>
            ))}
          </Box>
        ) : totalCandidates === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            p: 5,
            bgcolor: 'grey.50',
            borderRadius: 1
          }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              ไม่พบผู้สมัครในหน่วย "{filterUnit === 'all' ? 'ทุกหน่วย' : filterUnit}"
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ผู้สมัครต้องมียศต่ำกว่าหรือเท่ากับตำแหน่งว่างที่เลือก
            </Typography>
          </Box>
        ) : (
          <Box>
            {paginatedCandidates.map((candidate, index) => {
              const alreadySelected = selectedPersonnelIds.includes(candidate.id);
              return (
              <Paper
                key={candidate.id}
                elevation={selectedCandidate?.id === candidate.id ? 3 : 0}
                sx={{ 
                  p: 1.25,
                  mb: 0.75,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: selectedCandidate?.id === candidate.id 
                    ? 'primary.main' 
                    : alreadySelected ? 'grey.300' : 'grey.200',
                  bgcolor: selectedCandidate?.id === candidate.id 
                    ? 'primary.50'
                    : alreadySelected ? 'grey.100' : 'background.paper',
                  
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  '&:hover': {
                    borderColor: alreadySelected ? 'grey.400' : 'primary.main',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
                    transform: 'translateY(-2px)',
                  },
                  '&::before': selectedCandidate?.id === candidate.id ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    bgcolor: 'primary.main',
                    
                  } : {},
                }}
                onClick={() => {
                  // Toggle select/deselect on card click
                  if (selectedCandidate?.id === candidate.id) {
                    setSelectedCandidate(null);
                  } else {
                    setSelectedCandidate(candidate);
                  }
                }}
                onDoubleClick={() => handleDoubleClick(candidate)}
              >
                {/* Main Content with Expand Button */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25, flexWrap: 'wrap' }}>
                      <Typography variant="body1" fontWeight={700} sx={{ color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {candidate.rank} {candidate.fullName}
                        {(candidate.supporterName || candidate.supportReason) && (
                          <Tooltip 
                            title="มีผู้สนับสนุน"
                            arrow
                            placement="top"
                            enterDelay={300}
                            leaveDelay={100}
                            PopperProps={{
                              sx: {
                                zIndex: 10002, // สูงกว่า Drawer
                              }
                            }}
                          >
                            <Box
                              component="span"
                              sx={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                cursor: 'help'
                              }}
                            >
                              <StarIcon 
                                sx={{ 
                                  fontSize: 18, 
                                  color: 'warning.main',
                                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                }} 
                              />
                            </Box>
                          </Tooltip>
                        )}
                      </Typography>
                      {candidate.age && candidate.age !== '-' && (
                        <Chip 
                          label={`${candidate.age}`}
                          size="small"
                          sx={{ 
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: 'grey.100',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.25 }}>
                      <Chip 
                        label={candidate.posCodeName }
                        size="small"
                        sx={{ 
                          height: 22,
                          fontSize: '0.75rem',
                          bgcolor: 'primary.50',
                          color: 'primary.main',
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', alignSelf: 'center' }}>
                        {candidate.position}
                      </Typography>
                      {candidate.positionNumber && (
                        <Chip 
                          label={candidate.positionNumber}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.75rem' }}
                        />
                      )}
                      <Chip 
                        label={candidate.unit}
                        size="small"
                        sx={{ 
                          height: 22,
                          fontSize: '0.75rem',
                          bgcolor: candidate.unit === vacantPosition?.unit ? 'success.50' : 'grey.100',
                          color: candidate.unit === vacantPosition?.unit ? 'success.main' : 'text.secondary',
                          fontWeight: candidate.unit === vacantPosition?.unit ? 600 : 400,
                        }}
                      />
                      {alreadySelected && (
                        <Chip 
                          label="เลือกแล้ว"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    {(candidate.actingAs || candidate.yearsOfService || candidate.trainingCourse) && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.25 }}>
                        {candidate.actingAs && candidate.actingAs !== '-' && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                            💼 {candidate.actingAs}
                          </Typography>
                        )}
                        {candidate.yearsOfService && candidate.yearsOfService !== '-' && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                            📅 {candidate.yearsOfService}
                          </Typography>
                        )}
                        {candidate.trainingCourse && candidate.trainingCourse !== '-' && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                            🎓 นรต. {candidate.trainingCourse}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                  
                  <IconButton
                    size="small"
                    onClick={(e) => handleToggleExpand(candidate.id, e)}
                    sx={{ 
                      flexShrink: 0,
                      bgcolor: expandedCandidateId === candidate.id ? 'primary.50' : 'transparent',
                      color: expandedCandidateId === candidate.id ? 'primary.main' : (alreadySelected ? 'text.secondary' : 'text.secondary'),
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: alreadySelected ? 'grey.100' : 'primary.100',
                        color: alreadySelected ? 'text.secondary' : 'primary.main',
                      }
                    }}
                  >
                    {expandedCandidateId === candidate.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                </Box>

                {/* Drilldown Section - แสดงข้อมูลเพิ่มเติมเมื่อขยาย */}
                <Collapse in={expandedCandidateId === candidate.id}>
                  <Divider sx={{ my: 1 }} />
                  
                  <Stack spacing={1.5}>
                    {/* ข้อมูลส่วนตัว */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                        <PersonIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                          ข้อมูลส่วนตัว
                        </Typography>
                      </Box>
                      <Box sx={{ pl: 3.5 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">เลขบัตรประชาชน</Typography>
                            <Typography variant="body2">{candidate.nationalId || '-'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันเกิด</Typography>
                            <Typography variant="body2">{formatDate(candidate.birthDate)}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">อายุ</Typography>
                            <Typography variant="body2">
                              {candidate.age && candidate.age !== '-' ? `${candidate.age}` : '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">อาวุโส</Typography>
                            <Typography variant="body2">{candidate.seniority || '-'}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* ข้อมูลตำแหน่ง */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                        <BadgeIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                          ข้อมูลตำแหน่ง
                        </Typography>
                      </Box>
                      <Box sx={{ pl: 3.5 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">ยศ</Typography>
                            <Typography variant="body2">{candidate.rank || '-'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                            <Typography variant="body2">{candidate.position || '-'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">เลขตำแหน่ง</Typography>
                            <Typography variant="body2">{candidate.positionNumber || '-'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">หน่วย</Typography>
                            <Typography variant="body2">{candidate.unit || '-'}</Typography>
                          </Box>
                          {candidate.actingAs && candidate.actingAs !== '-' && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                              <Typography variant="caption" color="text.secondary">ทำหน้าที่</Typography>
                              <Typography variant="body2">{candidate.actingAs}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* ข้อมูลการแต่งตั้ง */}
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                        <CalendarIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                          ข้อมูลการแต่งตั้ง
                        </Typography>
                      </Box>
                      <Box sx={{ pl: 3.5 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">จำนวนปี</Typography>
                            <Typography variant="body2">
                              {candidate.yearsOfService && candidate.yearsOfService !== '-' ? `${candidate.yearsOfService} ปี` : '-'}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันบรรจุ</Typography>
                            <Typography variant="body2">{formatDate(candidate.enrollmentDate)}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">ระดับนี้เมื่อ</Typography>
                            <Typography variant="body2">{formatDate(candidate.currentRankSince)}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">วันเกษียณ</Typography>
                            <Typography variant="body2">{formatDate(candidate.retirementDate)}</Typography>
                          </Box>
                          {candidate.lastAppointment && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                              <Typography variant="caption" color="text.secondary">แต่งตั้งครั้งสุดท้าย</Typography>
                              <Typography variant="body2">{formatDate(candidate.lastAppointment)}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* ข้อมูลการศึกษาและฝึกอบรม */}
                    {(candidate.education || candidate.trainingCourse || candidate.trainingLocation) && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                          <EducationIcon fontSize="small" color="primary" />
                          <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                            การศึกษาและฝึกอบรม
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 3.5 }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            {candidate.education && (
                              <Box sx={{ gridColumn: '1 / -1' }}>
                                <Typography variant="caption" color="text.secondary">คุณวุฒิ</Typography>
                                <Typography variant="body2">{candidate.education}</Typography>
                              </Box>
                            )}
                            {candidate.trainingCourse && candidate.trainingCourse !== '-' && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">นรต</Typography>
                                <Typography variant="body2">{candidate.trainingCourse}</Typography>
                              </Box>
                            )}
                            {candidate.trainingLocation && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">สถานที่ฝึก</Typography>
                                <Typography variant="body2">{candidate.trainingLocation}</Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* ข้อมูลการเสนอชื่อ/ผู้สนับสนุน */}
                    {(candidate.supporterName || candidate.supportReason) && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                          <PersonIcon fontSize="small" color="success" />
                          <Typography variant="subtitle2" fontWeight={600} color="success.main">
                            ข้อมูลการเสนอชื่อ
                          </Typography>
                        </Box>
                        <Box sx={{ pl: 3.5 }}>
                          {candidate.supporterName && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">ผู้สนับสนุน</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {candidate.supporterName}
                              </Typography>
                            </Box>
                          )}
                          {candidate.supportReason && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">เหตุผลในการสนับสนุน</Typography>
                              <Paper sx={{ p: 1, mt: 0.5, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                  {candidate.supportReason}
                                </Typography>
                              </Paper>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* หมายเหตุ */}
                    {candidate.notes && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">หมายเหตุ</Typography>
                        <Paper sx={{ p: 0.75, mt: 0.5, bgcolor: 'grey.50' }}>
                          <Typography variant="body2">{candidate.notes}</Typography>
                        </Paper>
                      </Box>
                    )}
                  </Stack>
                </Collapse>
              </Paper>
            );})}

            {/* Pagination */}
            {totalCandidates > 0 && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                py: { xs: 0.75, sm: 1 },
                mt: 0.5,
                borderTop: 1,
                borderColor: 'divider',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    แสดง
                  </Typography>
                  <FormControl size="small" variant="standard" sx={{ minWidth: 60 }} disabled={loading}>
                    <Select
                      value={rowsPerPage}
                      onChange={(e) => handleChangeRowsPerPage(Number(e.target.value))}
                      sx={{ fontSize: '0.875rem' }}
                      MenuProps={{
                        sx: { zIndex: 10002 }, // สูงกว่า Drawer (10001)
                        PaperProps: { sx: { zIndex: 10002 } },
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {loading ? (
                    <Skeleton variant="rounded" width={140} height={24} />
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      หน้า {page + 1} จาก {Math.ceil(totalCandidates / rowsPerPage) || 1}
                    </Typography>
                  )}
                  <Pagination
                    count={Math.ceil(totalCandidates / rowsPerPage) || 1}
                    page={page + 1}
                    onChange={(_event, p) => handleChangePage(p - 1)}
                    disabled={loading}
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
        )}
        </>
        )}

        {/* Selected Summary - Modern Design */}
        {selectedCandidate && (
          <Paper 
            elevation={3}
            sx={{ 
              mt: 1.5, 
              p: 1.5, 
              bgcolor: 'success.main',
              borderRadius: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%',
                bgcolor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'success.main',
                flexShrink: 0,
                fontSize: '16px',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                ✓
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'white', opacity: 0.9, fontSize: '0.7rem', display: 'block', mb: 0.25 }}>
                  ผู้ที่เลือก
                </Typography>
                <Typography variant="body1" fontWeight={700} sx={{ color: 'white', mb: 0.25 }}>
                  {selectedCandidate.rank} {selectedCandidate.fullName}
                  {selectedCandidate.age && selectedCandidate.age !== '-' && ` (${selectedCandidate.age} ปี)`}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                  <Typography variant="caption" sx={{ color: 'white', opacity: 0.95, fontSize: '0.75rem' }}>
                    {selectedCandidate.position}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'white', opacity: 0.8, fontSize: '0.75rem' }}>
                    →
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>
                    {vacantPosition?.position}
                  </Typography>
                </Box>
                {(selectedCandidate.yearsOfService && selectedCandidate.yearsOfService !== '-') && (
                  <Typography variant="caption" sx={{ color: 'white', opacity: 0.85, fontSize: '0.7rem', display: 'block', mt: 0.25 }}>
                    📅 อายุราชการ: {selectedCandidate.yearsOfService} ปี
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        )}
        </Box>

        {/* Footer Actions */}
        <Box sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          borderTop: 1, 
          borderColor: 'divider', 
          bgcolor: 'background.paper', 
          display: 'flex', 
          gap: { xs: 1, sm: 1.5 },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
        }}>
          <Box sx={{ flex: 1 }}>
            {selectedCandidate ? (
              <Box>
                <Typography variant="body2" fontWeight={600} color="success.main" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
                  ✓ เลือก: {selectedCandidate.rank} {selectedCandidate.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.8rem' } }}>
                   • {selectedCandidate.unit} • {selectedCandidate.position}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.8rem' } }}>
                กรุณาเลือกผู้สมัคร 1 คน
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleSelect}
              disabled={!selectedCandidate || selectedPersonnelIds.includes(selectedCandidate.id)}
              size={isMobile ? 'medium' : 'large'}
              fullWidth={isMobile}
              sx={{ minWidth: { xs: '100%', sm: 120 } }}
            >
              {selectedCandidate 
                ? (selectedPersonnelIds.includes(selectedCandidate.id) ? 'ถูกเลือกแล้ว' : 'ยืนยัน')
                : 'ยืนยัน'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
