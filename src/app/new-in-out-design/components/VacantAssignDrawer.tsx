"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Button,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Divider,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Stack,
  Badge,
  Tooltip,
  Pagination,
  SelectChangeEvent
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Star as StarIcon,
  School as EducationIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

interface SwapListPerson {
  id: string;
  nationalId: string;
  fullName: string;
  rank: string;
  seniority?: string;
  age?: string;
  birthDate?: string | null;
  education?: string | null;
  posCodeId: number;
  posCodeMaster?: { id: number; name: string } | null;
  posCodeName?: string;
  position: string;
  positionNumber?: string;
  unit: string;
  actingAs?: string;
  yearsOfService?: string;
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  trainingCourse?: string;
  trainingLocation?: string | null;
  supporterName?: string;
  supportReason?: string;
  notes?: string | null;
  rankLevel: number;
}

interface VacantMatchCandidate {
  position?: string | null;
  unit?: string | null;
  positionNumber?: string | null;
  toPosCodeId?: number | null;
  year: number;
}

interface VacantAssignDrawerProps {
  open: boolean;
  onClose: () => void;
  candidate: VacantMatchCandidate | null;
  onNavigateCreate?: (vacantId: string) => void;
}

export default function VacantAssignDrawer({ open, onClose, candidate, onNavigateCreate }: VacantAssignDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<SwapListPerson[]>([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [selectedPersonnel, setSelectedPersonnel] = useState<SwapListPerson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterPosCode, setFilterPosCode] = useState<string>('all');
  const [filterSupporter, setFilterSupporter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(20);
  const [allUnits, setAllUnits] = useState<string[]>([]);
  const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!open || !candidate) return;
    setCandidates([]);
    setTotalCandidates(0);
    setSelectedPersonnel(null);
    setSearchTerm('');
    setExpandedId(null);
    setFilterPosCode('all');
    setFilterSupporter('all');
    setPage(0);
    const initialUnit = candidate.unit || 'all';
    setFilterUnit(initialUnit);
    loadUnits();
    loadPosCodes();
  }, [open, candidate]);

  useEffect(() => {
    if (!open || !candidate) return;
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debouncedSearchTerm, filterUnit, filterPosCode, filterSupporter, page]);

  const loadUnits = async () => {
    try {
      const res = await fetch('/api/police-personnel/units');
      if (res.ok) {
        const json = await res.json();
        setAllUnits(json.data || []);
      }
    } catch (e) {
      console.error('Error loading units:', e);
    }
  };

  const loadPosCodes = async () => {
    try {
      const res = await fetch('/api/police-personnel/pos-codes');
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : [];
        setPosCodeOptions(list.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (e) {
      console.error('Error loading pos codes:', e);
    }
  };

  const loadCandidates = async () => {
    if (!candidate) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
      if (filterUnit && filterUnit !== 'all') params.set('unit', filterUnit);
      if (filterPosCode && filterPosCode !== 'all') params.set('posCodeId', filterPosCode);
      if (filterSupporter && filterSupporter !== 'all') params.set('supporter', filterSupporter);
      params.set('page', page.toString());
      params.set('limit', rowsPerPage.toString());
      params.set('year', candidate.year.toString());

      const res = await fetch(`/api/police-personnel/candidates?${params.toString()}`);
      if (!res.ok) throw new Error('โหลดข้อมูลบุคลากรล้มเหลว');
      const result = await res.json();
      const pageData: SwapListPerson[] = Array.isArray(result?.data) ? result.data : [];

      setCandidates(pageData);
      setTotalCandidates(result?.total || pageData.length);
    } catch (e: any) {
      console.error('Error loading candidates:', e);
      setCandidates([]);
      setTotalCandidates(0);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString || dateString === '-') return '-';
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[2]);
        if (year > 2500) return dateString;
        return `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${year + 543}`;
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
    } catch { }
    return dateString;
  };

  const handleSelect = () => {
    if (!selectedPersonnel) return;
    // Navigate to promotion-chain/create with pre-filled personnel data
    const query = new URLSearchParams({
      personnelId: selectedPersonnel.id,
      targetPosition: candidate?.position || '',
      targetUnit: candidate?.unit || '',
      targetPosCodeId: candidate?.toPosCodeId?.toString() || ''
    });
    if (onNavigateCreate) onNavigateCreate(selectedPersonnel.id);
    else window.location.href = `/police-personnel/promotion-chain/create?${query.toString()}`;
  };

  const totalPages = Math.ceil(totalCandidates / rowsPerPage);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 700, md: 800 },
          maxWidth: '100%',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 10,
        }}
      >
        <Typography variant="h6" component="div">
          เลือกบุคลากรเข้าตำแหน่งว่าง
        </Typography>
        <IconButton onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Target Position Info */}
        {candidate && (
          <Paper sx={{ m: 2, p: 2, bgcolor: alpha('#1976d2', 0.08) }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <BadgeIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                ตำแหน่งที่ต้องการ
              </Typography>
            </Stack>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {candidate.position || '-'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {candidate.unit || '-'}
            </Typography>
            {candidate.positionNumber && (
              <Chip label={`เลขที่ ${candidate.positionNumber}`} size="small" sx={{ mt: 1 }} />
            )}
          </Paper>
        )}

        {/* Search & Filter */}
        <Box sx={{ px: 2, pb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="ค้นหาชื่อ, เลขประจำตัว, ตำแหน่ง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
          <Button
            size="small"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ textTransform: 'none' }}
          >
            ตัวกรอง {showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Button>
          <Collapse in={showFilters}>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>หน่วย</InputLabel>
                <Select
                  value={filterUnit}
                  label="หน่วย"
                  onChange={(e: SelectChangeEvent) => setFilterUnit(e.target.value)}
                >
                  <MenuItem value="all">ทั้งหมด</MenuItem>
                  {allUnits.map((u) => (
                    <MenuItem key={u} value={u}>
                      {u}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>ระดับตำแหน่ง</InputLabel>
                <Select
                  value={filterPosCode}
                  label="ระดับตำแหน่ง"
                  onChange={(e: SelectChangeEvent) => setFilterPosCode(e.target.value)}
                >
                  <MenuItem value="all">ทั้งหมด</MenuItem>
                  {posCodeOptions.map((pc) => (
                    <MenuItem key={pc.id} value={pc.id.toString()}>
                      {pc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>ผู้สนับสนุน</InputLabel>
                <Select
                  value={filterSupporter}
                  label="ผู้สนับสนุน"
                  onChange={(e: SelectChangeEvent) => setFilterSupporter(e.target.value)}
                >
                  <MenuItem value="all">ทั้งหมด</MenuItem>
                  <MenuItem value="yes">มีผู้สนับสนุน</MenuItem>
                  <MenuItem value="no">ไม่มีผู้สนับสนุน</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Collapse>
        </Box>

        <Divider />

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Candidate List */}
        {!loading && candidates.length === 0 && (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">ไม่พบบุคลากรที่เหมาะสม</Alert>
          </Box>
        )}

        {!loading && candidates.length > 0 && (
          <List sx={{ px: 2, py: 1 }}>
            {candidates.map((person) => {
              const isSelected = selectedPersonnel?.id === person.id;
              const isExpanded = expandedId === person.id;
              return (
                <Paper
                  key={person.id}
                  elevation={isSelected ? 3 : 1}
                  sx={{
                    mb: 1.5,
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? alpha('#1976d2', 0.05) : 'background.paper',
                  }}
                >
                  <ListItemButton
                    onClick={() => {
                      setSelectedPersonnel(isSelected ? null : person);
                      setExpandedId(null);
                    }}
                    sx={{ p: 1.5 }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <PersonIcon color={isSelected ? 'primary' : 'action'} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                          {person.fullName}
                        </Typography>
                        {isSelected && <Chip label="✓ เลือก" size="small" color="primary" />}
                        {person.supporterName && (
                          <Tooltip title={`ผู้สนับสนุน: ${person.supporterName}`}>
                            <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
                          </Tooltip>
                        )}
                      </Stack>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>ยศ:</strong> {person.rank} | <strong>อายุ:</strong> {person.age || '-'} | <strong>อายุงาน:</strong> {person.seniority || '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>ตำแหน่ง:</strong> {person.position} ({person.posCodeName || person.posCodeMaster?.name || '-'})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>หน่วย:</strong> {person.unit}
                        </Typography>
                      </Stack>
                    </Box>
                  </ListItemButton>
                  <Box sx={{ px: 1.5, pb: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setExpandedId(isExpanded ? null : person.id)}
                      endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      {isExpanded ? 'ซ่อน' : 'แสดง'}รายละเอียด
                    </Button>
                  </Box>
                  <Collapse in={isExpanded}>
                    <Divider />
                    <Box sx={{ p: 2, bgcolor: alpha('#000', 0.02) }}>
                      <Stack spacing={1.5}>
                        {person.education && (
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <EducationIcon fontSize="small" color="action" />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                การศึกษา
                              </Typography>
                              <Typography variant="body2">{person.education}</Typography>
                            </Box>
                          </Stack>
                        )}
                        {person.birthDate && (
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <CalendarIcon fontSize="small" color="action" />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                วันเกิด
                              </Typography>
                              <Typography variant="body2">{formatDate(person.birthDate)}</Typography>
                            </Box>
                          </Stack>
                        )}
                        {person.enrollmentDate && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              วันบรรจุ: {formatDate(person.enrollmentDate)}
                            </Typography>
                          </Box>
                        )}
                        {person.currentRankSince && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              ดำรงตำแหน่งปัจจุบันตั้งแต่: {formatDate(person.currentRankSince)}
                            </Typography>
                          </Box>
                        )}
                        {person.trainingCourse && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              หลักสูตรฝึกอบรม
                            </Typography>
                            <Typography variant="body2">{person.trainingCourse}</Typography>
                            {person.trainingLocation && (
                              <Typography variant="caption" color="text.secondary">
                                สถานที่: {person.trainingLocation}
                              </Typography>
                            )}
                          </Box>
                        )}
                        {person.supporterName && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              ผู้สนับสนุน
                            </Typography>
                            <Typography variant="body2">{person.supporterName}</Typography>
                            {person.supportReason && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                เหตุผล: {person.supportReason}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </List>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination
              count={totalPages}
              page={page + 1}
              onChange={(_, newPage) => setPage(newPage - 1)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={1}>
          {selectedPersonnel && (
            <Alert severity="success" icon={<PersonIcon />}>
              เลือก: <strong>{selectedPersonnel.fullName}</strong> ({selectedPersonnel.rank})
            </Alert>
          )}
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSelect}
            disabled={!selectedPersonnel}
          >
            ยืนยันและสร้าง
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
