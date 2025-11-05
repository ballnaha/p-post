'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Drawer, 
  Button, 
  TextField, 
  InputAdornment, 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  IconButton, 
  Divider, 
  FormControl, 
  Select, 
  MenuItem, 
  SelectChangeEvent, 
  Chip, 
  Collapse, 
  Stack, 
  Pagination, 
  Skeleton 
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Close as CloseIcon, 
  FilterList as FilterListIcon, 
  ExpandMore as ExpandMoreIcon, 
  ExpandLess as ExpandLessIcon, 
  Person as PersonIcon, 
  Badge as BadgeIcon, 
  CalendarToday as CalendarIcon, 
  School as EducationIcon 
} from '@mui/icons-material';

interface PolicePersonnel {
  id: string;
  noId?: string;
  posCodeId?: number;
  posCodeMaster?: {
    id: number;
    name: string;
  } | null;
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
  age?: string;
  seniority?: string;
  birthDate?: string | null;
  education?: string | null;
  yearsOfService?: string;
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  trainingCourse?: string;
  trainingLocation?: string | null;
  actingAs?: string;
  notes?: string | null;
  rankLevel?: number;
}

interface PersonnelDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (personnel: PolicePersonnel) => void;
  title?: string;
  excludePersonnelId?: string | string[]; // ID ของบุคลากรที่ต้องการยกเว้น (สามารถเป็น single ID หรือ array)
  initialFilterUnit?: string; // หน่วยเริ่มต้นสำหรับ filter
  initialFilterPosCode?: number; // posCode เริ่มต้นสำหรับ filter
  excludeTransactionId?: string; // Transaction ID ที่กำลังแก้ไข (ไม่กรองบุคลากรใน transaction นี้ออก)
}

export default function PersonnelDrawer({
  open,
  onClose,
  onSelect,
  title = 'เลือกบุคลากร',
  excludePersonnelId,
  initialFilterUnit,
  initialFilterPosCode,
  excludeTransactionId,
}: PersonnelDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [personnel, setPersonnel] = useState<PolicePersonnel[]>([]);
  const [totalPersonnel, setTotalPersonnel] = useState(0);
  const [allUnits, setAllUnits] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<PolicePersonnel | null>(null);
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterPosCode, setFilterPosCode] = useState<string>('all');
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [expandedPersonnelId, setExpandedPersonnelId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [initialLoading, setInitialLoading] = useState(false);
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (open) {
      setInitialLoading(true);
      setFilterOptionsLoaded(false);
      
      setPersonnel([]);
      setTotalPersonnel(0);
      setSearchTerm('');
      
      // ตั้งค่า filter เริ่มต้นตาม props ที่ส่งมา
      const initialUnit = initialFilterUnit || 'all';
      const initialPosCode = initialFilterPosCode ? initialFilterPosCode.toString() : 'all';
      
      setFilterUnit(initialUnit);
      setFilterPosCode(initialPosCode);
      setPage(0);

      (async () => {
        // Load all data in parallel for faster performance
        const [_, __, personnelData] = await Promise.all([
          loadAllUnits(), 
          loadPosCodes(),
          // Load personnel data immediately in parallel
          (async () => {
            try {
              const params = new URLSearchParams();
              if (initialUnit && initialUnit !== 'all') params.set('unit', initialUnit);
              if (initialPosCode && initialPosCode !== 'all') params.set('posCodeId', initialPosCode);
              params.set('page', '0');
              params.set('limit', rowsPerPage.toString());
              
              const currentYear = new Date().getFullYear() + 543;
              params.set('year', currentYear.toString());
              
              if (excludeTransactionId) {
                params.set('excludeTransactionId', excludeTransactionId);
              }

              const response = await fetch(`/api/police-personnel/candidates?${params.toString()}`);
              if (!response.ok) throw new Error('Failed to fetch personnel');
              
              const result = await response.json();
              let pageData: any[] = Array.isArray(result?.data) ? result.data : [];
              
              if (excludePersonnelId) {
                const excludeIds = Array.isArray(excludePersonnelId) ? excludePersonnelId : [excludePersonnelId];
                pageData = pageData.filter(p => !excludeIds.includes(p.id));
              }
              
              return { data: pageData, total: result?.total || 0 };
            } catch (error) {
              console.error('Error loading personnel:', error);
              return { data: [], total: 0 };
            }
          })()
        ]);
        
        // Set personnel data from parallel load
        setPersonnel(personnelData.data as PolicePersonnel[]);
        setTotalPersonnel(personnelData.total);
        
        setFilterOptionsLoaded(true);
        setInitialLoading(false);
      })();
    } else {
      setInitialLoading(false);
      setFilterOptionsLoaded(false);
    }
  }, [open, rowsPerPage, initialFilterUnit, initialFilterPosCode]);

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
      const response = await fetch('/api/police-personnel/units');
      if (!response.ok) {
        throw new Error('Failed to fetch units');
      }
      const result = await response.json();
      const units = result.data || [];
      setAllUnits(units);
    } catch (error) {
      console.error('Error loading units:', error);
      setAllUnits([]);
    }
  };

  const loadPersonnelWithFilter = async (
    unit: string, 
    posCode: string, 
    search: string, 
    currentPage: number, 
    pageSize: number
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (unit && unit !== 'all') params.set('unit', unit);
      if (posCode && posCode !== 'all') params.set('posCodeId', posCode);
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
        throw new Error('Failed to fetch personnel');
      }

      const result = await response.json();
      let pageData: any[] = Array.isArray(result?.data) ? result.data : [];
      
      // Filter out excluded personnel
      if (excludePersonnelId) {
        const excludeIds = Array.isArray(excludePersonnelId) ? excludePersonnelId : [excludePersonnelId];
        pageData = pageData.filter(p => !excludeIds.includes(p.id));
      }
      
      setPersonnel(pageData as PolicePersonnel[]);
      setTotalPersonnel(result?.total || 0);
    } catch (error) {
      console.error('Error loading personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonnel = async () => {
    await loadPersonnelWithFilter(
      filterUnit, 
      filterPosCode, 
      debouncedSearchTerm, 
      page, 
      rowsPerPage
    );
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString || dateString === '-') return '-';
    
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parseInt(parts[2]);
        
        if (year > 2500) {
          return `${day}/${month}/${year}`;
        }
        
        if (year > 1900 && year < 2100) {
          const thaiYear = year + 543;
          return `${day}/${month}/${thaiYear}`;
        }
      }
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
    } catch (error) {
      // Return original string if parsing fails
    }
    
    return dateString;
  };

  const uniqueUnits = useMemo(() => {
    if (allUnits.length > 0) {
      return [...allUnits].sort((a, b) => a.localeCompare(b, 'th'));
    }
    return Array.from(new Set(personnel.map(c => c.unit || ''))).sort((a, b) => a.localeCompare(b, 'th'));
  }, [allUnits, personnel]);

  const uniquePosCodes = posCodeOptions;

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  useEffect(() => {
    if (!initialLoading) {
      setPage(0);
    }
  }, [debouncedSearchTerm, filterUnit, filterPosCode, excludePersonnelId, initialLoading]);

  useEffect(() => {
    if (open && !initialLoading) {
      loadPersonnel();
    }
  }, [page, rowsPerPage, debouncedSearchTerm, filterUnit, filterPosCode, excludePersonnelId, open, initialLoading]);

  const handleSelect = () => {
    if (selectedPersonnel) {
      onSelect(selectedPersonnel);
      setSelectedPersonnel(null);
      setSearchTerm('');
      setPage(0);
    }
  };

  const handleClose = () => {
    setSelectedPersonnel(null);
    setSearchTerm('');
    onClose();
  };

  const handleToggleExpand = (personnelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPersonnelId(expandedPersonnelId === personnelId ? null : personnelId);
  };

  const handleDoubleClick = (person: PolicePersonnel) => {
    setSelectedPersonnel(person);
    setTimeout(() => {
      onSelect(person);
      setSelectedPersonnel(null);
      setSearchTerm('');
      setPage(0);
    }, 100);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'Enter' && selectedPersonnel) {
        handleSelect();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open, selectedPersonnel]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      ModalProps={{
        sx: {
          zIndex: 1400,
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
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              เลือกบุคลากรจากฐานข้อมูล
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
          {(initialLoading || !filterOptionsLoaded) ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
              <CircularProgress size={48} />
              <Typography variant="body1" color="text.secondary" sx={{ mt: 3, fontWeight: 500 }}>
                กำลังโหลดและกรองข้อมูลบุคลากร...
              </Typography>
            </Box>
          ) : (
            <>
              {/* Info Badge - แสดงเมื่อมีการกรองตามบุคลากรอื่น */}
              {(initialFilterUnit || initialFilterPosCode) && (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 1.5, 
                    mb: 1.5, 
                    bgcolor: 'info.50',
                    borderLeft: 4,
                    borderColor: 'info.main',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="info.main" sx={{ mb: 0.5 }}>
                    🔍 กรองตามบุคลากร A
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {initialFilterUnit && (
                      <Chip 
                        label={`หน่วย: ${initialFilterUnit}`}
                        size="small"
                        color="info"
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    )}
                    {initialFilterPosCode && (
                      <Chip 
                        label={`PosCode: ${posCodeOptions.find(pc => pc.id === initialFilterPosCode)?.name || initialFilterPosCode}`}
                        size="small"
                        color="info"
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                </Paper>
              )}

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
                      {uniqueUnits.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          <Typography variant="body2">{unit}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

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
                      {uniquePosCodes.map((posCode) => (
                        <MenuItem key={posCode.id} value={posCode.id.toString()}>
                          <Typography variant="body2">{posCode.name}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                {loading ? (
                  <Skeleton variant="rounded" height={28} sx={{ borderRadius: 0.75 }} />
                ) : totalPersonnel > 0 && (
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
                      📊 พบ {totalPersonnel} รายการ • หน้า {page + 1}/{Math.ceil(totalPersonnel / rowsPerPage) || 1}
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

              {/* Personnel List */}
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
              ) : totalPersonnel === 0 ? (
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
                    ไม่พบบุคลากร
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ลองเปลี่ยนตัวกรองหรือคำค้นหา
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {personnel.map((person) => (
                    <Paper
                      key={person.id}
                      elevation={selectedPersonnel?.id === person.id ? 3 : 0}
                      sx={{ 
                        p: 1.25,
                        mb: 0.75,
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: selectedPersonnel?.id === person.id 
                          ? 'primary.main' 
                          : 'grey.200',
                        bgcolor: selectedPersonnel?.id === person.id 
                          ? 'primary.50'
                          : 'background.paper',
                        
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
                          transform: 'translateY(-2px)',
                        },
                        '&::before': selectedPersonnel?.id === person.id ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,

                        } : {},
                      }}
                      onClick={() => {
                        if (selectedPersonnel?.id === person.id) {
                          setSelectedPersonnel(null);
                        } else {
                          setSelectedPersonnel(person);
                        }
                      }}
                      onDoubleClick={() => handleDoubleClick(person)}
                    >
                      {/* Main Content */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25, flexWrap: 'wrap' }}>
                            <Typography variant="body1" fontWeight={700} sx={{ color: 'text.primary' }}>
                              {person.rank} {person.fullName}
                            </Typography>
                            {person.age && person.age !== '-' && (
                              <Chip 
                                label={`${person.age}`}
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
                              label={person.posCodeMaster?.name || '-'}
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
                              {person.position}
                            </Typography>
                            {person.positionNumber && (
                              <Chip 
                                label={person.positionNumber}
                                size="small"
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.75rem' }}
                              />
                            )}
                            <Chip 
                              label={person.unit}
                              size="small"
                              sx={{ 
                                height: 22,
                                fontSize: '0.75rem',
                                bgcolor: 'grey.100',
                                color: 'text.secondary',
                              }}
                            />
                          </Box>

                          {(person.actingAs || person.yearsOfService || person.trainingCourse) && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.25 }}>
                              {person.actingAs && person.actingAs !== '-' && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                  💼 {person.actingAs}
                                </Typography>
                              )}
                              {person.yearsOfService && person.yearsOfService !== '-' && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                  📅 {person.yearsOfService}
                                </Typography>
                              )}
                              {person.trainingCourse && person.trainingCourse !== '-' && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                  🎓 นรต. {person.trainingCourse}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                        
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleExpand(person.id, e)}
                          sx={{ 
                            flexShrink: 0,
                            bgcolor: expandedPersonnelId === person.id ? 'primary.50' : 'transparent',
                            color: expandedPersonnelId === person.id ? 'primary.main' : 'text.secondary',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'primary.100',
                              color: 'primary.main',
                            }
                          }}
                        >
                          {expandedPersonnelId === person.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      </Box>

                      {/* Drilldown Section */}
                      <Collapse in={expandedPersonnelId === person.id}>
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
                                  <Typography variant="body2">{person.nationalId || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">วันเกิด</Typography>
                                  <Typography variant="body2">{formatDate(person.birthDate)}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">อายุ</Typography>
                                  <Typography variant="body2">
                                    {person.age && person.age !== '-' ? `${person.age}` : '-'}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">อาวุโส</Typography>
                                  <Typography variant="body2">{person.seniority || '-'}</Typography>
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
                                  <Typography variant="body2">{person.rank || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                                  <Typography variant="body2">{person.position || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">เลขตำแหน่ง</Typography>
                                  <Typography variant="body2">{person.positionNumber || '-'}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">หน่วย</Typography>
                                  <Typography variant="body2">{person.unit || '-'}</Typography>
                                </Box>
                                {person.actingAs && person.actingAs !== '-' && (
                                  <Box sx={{ gridColumn: '1 / -1' }}>
                                    <Typography variant="caption" color="text.secondary">ทำหน้าที่</Typography>
                                    <Typography variant="body2">{person.actingAs}</Typography>
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
                                  <Typography variant="caption" color="text.secondary">อายุราชการ</Typography>
                                  <Typography variant="body2">
                                    {person.yearsOfService && person.yearsOfService !== '-' ? `${person.yearsOfService}` : '-'}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">วันบรรจุ</Typography>
                                  <Typography variant="body2">{formatDate(person.enrollmentDate)}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">ระดับนี้เมื่อ</Typography>
                                  <Typography variant="body2">{formatDate(person.currentRankSince)}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">วันเกษียณ</Typography>
                                  <Typography variant="body2">{formatDate(person.retirementDate)}</Typography>
                                </Box>
                                {person.lastAppointment && (
                                  <Box sx={{ gridColumn: '1 / -1' }}>
                                    <Typography variant="caption" color="text.secondary">แต่งตั้งครั้งสุดท้าย</Typography>
                                    <Typography variant="body2">{person.lastAppointment}</Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Box>

                          {/* ข้อมูลการศึกษาและฝึกอบรม */}
                          {(person.education || person.trainingCourse || person.trainingLocation) && (
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                <EducationIcon fontSize="small" color="primary" />
                                <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                                  การศึกษาและฝึกอบรม
                                </Typography>
                              </Box>
                              <Box sx={{ pl: 3.5 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                  {person.education && (
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                      <Typography variant="caption" color="text.secondary">คุณวุฒิ</Typography>
                                      <Typography variant="body2">{person.education}</Typography>
                                    </Box>
                                  )}
                                  {person.trainingCourse && person.trainingCourse !== '-' && (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">นรต</Typography>
                                      <Typography variant="body2">{person.trainingCourse}</Typography>
                                    </Box>
                                  )}
                                  {person.trainingLocation && (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">สถานที่ฝึก</Typography>
                                      <Typography variant="body2">{person.trainingLocation}</Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          )}

                          {/* หมายเหตุ */}
                          {person.notes && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">หมายเหตุ</Typography>
                              <Paper sx={{ p: 0.75, mt: 0.5, bgcolor: 'grey.50' }}>
                                <Typography variant="body2">{person.notes}</Typography>
                              </Paper>
                            </Box>
                          )}
                        </Stack>
                      </Collapse>
                    </Paper>
                  ))}

                  {/* Pagination */}
                  {totalPersonnel > 0 && (
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
                            หน้า {page + 1} จาก {Math.ceil(totalPersonnel / rowsPerPage) || 1}
                          </Typography>
                        )}
                        <Pagination
                          count={Math.ceil(totalPersonnel / rowsPerPage) || 1}
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

              {/* Selected Summary */}
              {selectedPersonnel && (
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
                        {selectedPersonnel.rank} {selectedPersonnel.fullName}
                        {selectedPersonnel.age && selectedPersonnel.age !== '-' && ` (${selectedPersonnel.age})`}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: 'white', opacity: 0.95, fontSize: '0.75rem' }}>
                          {selectedPersonnel.position} • {selectedPersonnel.unit}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              )}
            </>
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
            {selectedPersonnel ? (
              <Box>
                <Typography variant="body2" fontWeight={600} color="success.main" sx={{ fontSize: '0.875rem' }}>
                  ✓ เลือก: {selectedPersonnel.rank} {selectedPersonnel.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {selectedPersonnel.unit} • {selectedPersonnel.position}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                กรุณาเลือกบุคลากร 1 คน
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleSelect}
              disabled={!selectedPersonnel}
              size="large"
            >
              ยืนยัน
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
