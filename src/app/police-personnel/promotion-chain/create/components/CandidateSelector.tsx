'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Button, TextField, InputAdornment, Box, Typography, CircularProgress, Paper, IconButton, Divider, FormControl, Select, MenuItem, SelectChangeEvent, Chip, Collapse, Stack, Pagination, Skeleton } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon, FilterList as FilterListIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Person as PersonIcon, Badge as BadgeIcon, CalendarToday as CalendarIcon, School as EducationIcon } from '@mui/icons-material';
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
}

export default function CandidateSelector({
  open,
  onClose,
  targetRankLevel,
  onSelect,
  vacantPosition,
  selectedPersonnelIds = [],
}: CandidateSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<SwapListPerson[]>([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [allUnits, setAllUnits] = useState<string[]>([]); // เก็บรายการหน่วยทั้งหมด
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<SwapListPerson | null>(null);
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterPosCode, setFilterPosCode] = useState<string>('all'); // Filter posCodeId
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);
  
  // Drilldown state - เก็บ ID ของ candidate ที่ถูกขยาย
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20); // เพิ่มจาก 10 เป็น 20 เพื่อลดการ re-render
  const [initialLoading, setInitialLoading] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // รอ 300ms หลังจากพิมพ์ค้างแล้วค่อยค้นหา

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (open) {
      // Default unit to vacantPosition's unit on first open
      if (vacantPosition?.unit) {
        setFilterUnit(vacantPosition.unit);
      } else {
        setFilterUnit('all');
      }

      // Reset transient states to avoid flashing stale content
      setCandidates([]);
      setTotalCandidates(0);
      setSearchTerm('');
      setFilterPosCode('all');

      // Load all initial data before showing content
      setInitialLoading(true);
      (async () => {
        await Promise.all([loadAllUnits(), loadCandidates(), loadPosCodes()]);
        setInitialLoading(false);
      })();
    }
  }, [open, targetRankLevel, vacantPosition?.unit]);
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

  const loadCandidates = async () => {
    setLoading(true);
    try {
      // Server-side pagination and filters
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
      if (filterUnit && filterUnit !== 'all') params.set('unit', filterUnit);
      if (filterPosCode && filterPosCode !== 'all') params.set('posCodeId', filterPosCode);
      params.set('page', page.toString());
      params.set('limit', rowsPerPage.toString());
      
      // ส่งปีปัจจุบัน (พ.ศ.) เพื่อกรองบุคลากรที่มีอยู่ใน swap transaction แล้ว
      const currentYear = new Date().getFullYear() + 543;
      params.set('year', currentYear.toString());

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
    setPage(0);
  }, [debouncedSearchTerm, filterUnit, filterPosCode]);

  // Fetch when paging or filters change
  useEffect(() => {
    if (open && !initialLoading) {
      loadCandidates();
    }
  }, [page, rowsPerPage, debouncedSearchTerm, filterUnit, filterPosCode, open, initialLoading]);

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
          zIndex: 1400, // สูงกว่า AppBar (1200)
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
          <Box sx={{ lineHeight: 1, pl: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              เลือกผู้สมัคร
            </Typography>
            <Typography variant="caption" color="text.secondary">
              เลือกบุคลากรที่ต้องการเลื่อนขึ้นมาแทนตำแหน่งว่าง
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {initialLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              กำลังเตรียมข้อมูลผู้สมัคร...
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
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
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
            
            {initialLoading ? (
              <Skeleton variant="rounded" width={180} height={36} sx={{ borderRadius: 1 }} />
            ) : (
            <FormControl size="small" sx={{ minWidth: 180 }}>
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
            )}

            {initialLoading ? (
              <Skeleton variant="rounded" width={180} height={36} sx={{ borderRadius: 1 }} />
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
                        <Typography variant="body2">ทุกระดับ</Typography>
                      </Box>
                    );
                  }
                  const posCode = uniquePosCodes.find(pc => pc.id.toString() === selected);
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FilterListIcon fontSize="small" />
                      <Typography variant="body2" noWrap>{posCode?.name || selected}</Typography>
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
              >
                <MenuItem value="all">
                  <Typography variant="body2">ทุกระดับ</Typography>
                </MenuItem>
                {vacantPosition?.posCodeId && (
                  <MenuItem value={vacantPosition.posCodeId.toString()}>
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {vacantPosition.posCodeName} (ระดับเดียวกัน)
                    </Typography>
                  </MenuItem>
                )}
                <Divider />
                {uniquePosCodes
                  .filter(pc => pc.id !== vacantPosition?.posCodeId)
                  .map((posCode) => (
                    <MenuItem key={posCode.id} value={posCode.id.toString()}>
                      <Typography variant="body2">{posCode.name}</Typography>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            )}
          </Box>
          
          {(initialLoading || loading) ? (
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
                      <Typography variant="body1" fontWeight={700} sx={{ color: 'text.primary' }}>
                        {candidate.rank} {candidate.fullName}
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
                              <Typography variant="body2">{candidate.lastAppointment}</Typography>
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
                        sx: { zIndex: 9999 },
                        PaperProps: { sx: { zIndex: 9999 } },
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
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider', 
          bgcolor: 'background.paper', 
          display: 'flex', 
          gap: 1.5, 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
        }}>
          <Box sx={{ flex: 1 }}>
            {selectedCandidate ? (
              <Box>
                <Typography variant="body2" fontWeight={600} color="success.main" sx={{ fontSize: '0.875rem' }}>
                  ✓ เลือก: {selectedCandidate.rank} {selectedCandidate.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                   • {selectedCandidate.unit} • {selectedCandidate.position}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                กรุณาเลือกผู้สมัคร 1 คน
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleClose} 
              variant="outlined"
              size="medium"
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSelect}
              disabled={!selectedCandidate || selectedPersonnelIds.includes(selectedCandidate.id)}
              size="medium"
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
