'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  Badge,
  Stack,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Skeleton,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  ArrowForward as ArrowIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  AccountBox as AccountBoxIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  DragIndicator as DragIndicatorIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';
import DataTablePagination from '@/components/DataTablePagination';

interface VacantPosition {
  id: string;
  posCodeId: number;
  posCodeName: string;
  unit: string;
  position: string;
  positionNumber: string;
  actingAs: string;
  notes: string;
  fullName?: string; // เพิ่ม fullName เพื่อใช้ filter ประเภทตำแหน่งว่าง
  assignmentInfo?: {
    assignedPersonName: string;
    assignedPersonRank: string;
    assignedDate: string;
    assignedYear: number;
    fromPosition: string;
    fromUnit: string;
  } | null;
}

interface Applicant {
  id: string;
  fullName: string;
  rank: string;
  unit: string;
  position: string;
  displayOrder: number;
  nominator: string;
  notes: string;
  requestedPosition: string;
  requestedPositionId: number;
  nationalId: string;
  birthDate: Date | null;
  seniority: number | null;
  age?: number | string;
  yearsOfService?: number | string;
  isAssigned?: boolean; // เพิ่ม field สถานะจับคู่แล้ว
  requestedPosCode: {
    name: string;
  };
  assignmentInfo?: {
    assignedPosition: string;
    assignedUnit: string;
    assignedDate: string;
    assignedYear: number;
  } | null;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  units: FilterOption[];
  posCodes: FilterOption[];
}

// Sortable Item Component
function SortableApplicantItem({ 
  applicant, 
  index, 
  onAssign, 
  onUnassign,
  loading,
  selectedPosition,
}: { 
  applicant: Applicant; 
  index: number;
  onAssign: (applicant: Applicant, vacantPosition: VacantPosition) => void;
  onUnassign: (applicant: Applicant) => void;
  loading: boolean;
  selectedPosition: VacantPosition | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id: applicant.id,
    // ปิด animation ของตำแหน่งอื่น
    animateLayoutChanges: () => false,
  });

  const style = {
    // ให้เฉพาะตัวที่ลากมี transform
    transform: isDragging ? CSS.Transform.toString(transform) : undefined,
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        py: 0.5,
        pr: 14, // เพิ่ม padding ขวาเพื่อให้พื้นที่สำหรับปุ่ม
        bgcolor: applicant.isAssigned 
          ? (theme) => theme.palette.grey[100] // สีเทาสำหรับคนที่จับคู่แล้ว
          : (isOver 
            ? (theme) => `rgba(25, 118, 210, 0.08)` 
            : 'background.paper'),
        borderRadius: 1,
        mb: 0.5,
        border: isOver ? 2 : 1,
        borderStyle: isOver ? 'dashed' : 'solid',
        borderColor: applicant.isAssigned
          ? 'grey.300' // เส้นขอบเทาสำหรับคนที่จับคู่แล้ว
          : (isOver 
            ? 'primary.main' 
            : (isDragging ? 'primary.main' : 'divider')),
        // ปิด transition จาก sx เพื่อไม่ให้ item อื่นขยับ
        transition: (isDragging || isOver) ? 'all 0.2s ease-out' : 'none',
        boxShadow: isDragging 
          ? '0 12px 40px rgba(0,0,0,0.15)' 
          : (isOver ? '0 4px 20px rgba(25, 118, 210, 0.2)' : 'none'),
        zIndex: isDragging ? 1000 : (isOver ? 100 : 1),
        alignItems: 'flex-start', // จัดให้ปุ่มอยู่ตำแหน่งที่ถูกต้อง
        opacity: applicant.isAssigned ? 0.7 : 1, // โปร่งแสงเล็กน้อยสำหรับคนที่จับคู่แล้ว
        // จำกัดขนาดเมื่อลาก
        ...(isDragging && {
          maxWidth: '100%',
          width: '100%',
          position: 'relative',
        }),
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          mr: 1,
          color: 'text.secondary',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`อันดับ ${applicant.displayOrder || index + 1}`} 
              size="small" 
              color="primary"
            />
            <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {applicant.rank} {applicant.fullName} ({applicant.age ? `${applicant.age}` : 'อายุไม่ระบุ'}) <br />
              <Typography 
                component="span" 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '0.8rem' }}
              >
                จำนวนปี: {applicant.yearsOfService || '-'}
              </Typography>
            </Box>
          </Box>
        }
        secondary={
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="body2" component="span">
                <strong>ตำแหน่งปัจจุบัน:</strong> {applicant.position} | {applicant.unit}
              </Typography>
              {!applicant.isAssigned && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ArrowIcon fontSize="small" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPosition) {
                      onAssign(applicant, selectedPosition);
                    }
                  }}
                  disabled={loading || !selectedPosition || selectedPosition.assignmentInfo !== null}
                  color="success"
                  sx={{ 
                    minWidth: 100, 
                    py: 1, 
                    fontSize: '0.75rem',
                    flexShrink: 0,
                    borderRadius: 2,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  จับคู่
                </Button>
              )}
            </Box>
            {!applicant.isAssigned && selectedPosition?.assignmentInfo && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontWeight: 500 }}>
                ⚠️ ตำแหน่งนี้ถูกจับคู่ให้กับ {selectedPosition.assignmentInfo.assignedPersonName} แล้ว
              </Typography>
            )}
            {applicant.nominator && (
              <>
                <br />
                <strong>ผู้เสนอ:</strong> {applicant.nominator}
              </>
            )}
            {applicant.notes && (
              <>
                <br />
                <strong>หมายเหตุ:</strong> {applicant.notes}
              </>
            )}
            {applicant.isAssigned && applicant.assignmentInfo && (
              <>
                <br />
                <Box sx={{ mt: 1, p: 1, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                  <Typography variant="caption" color="success.dark" sx={{ fontWeight: 600 }}>
                    ✓ จับคู่แล้ว: {applicant.assignmentInfo.assignedPosition} - {applicant.assignmentInfo.assignedUnit}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    วันที่: {new Date(applicant.assignmentInfo.assignedDate).toLocaleDateString('th-TH')}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<CloseIcon fontSize="small" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnassign(applicant);
                      }}
                      disabled={loading}
                      sx={{ 
                        py: 0.25,
                        fontSize: '0.7rem',
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      ยกเลิกการจับคู่
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        }
        secondaryTypographyProps={{ component: 'div' }}
      />
    </ListItem>
  );
}

export default function VacantPositionAssignmentPage() {
  const [allVacantPositions, setAllVacantPositions] = useState<VacantPosition[]>([]); // เก็บข้อมูลทั้งหมด
  const [vacantPositions, setVacantPositions] = useState<VacantPosition[]>([]); // ข้อมูลที่แสดง (หลัง filter)
  const [selectedPosition, setSelectedPosition] = useState<VacantPosition | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [selectedVacantSlot, setSelectedVacantSlot] = useState<VacantPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(false); // เพิ่ม state สำหรับ loading applicants
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignNotes, setAssignNotes] = useState('');
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [unassignApplicant, setUnassignApplicant] = useState<Applicant | null>(null);
  const [unassignReason, setUnassignReason] = useState('');
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAssignedInModal, setShowAssignedInModal] = useState(false); // Default: ซ่อนคนที่จับคู่แล้ว
  
  // State สำหรับสถิติ
  const [stats, setStats] = useState<{
    policePersonnel: {
      totalVacant: number;
      vacant: number;
      reserved: number;
      emptyName: number;
      other: number;
    };
    applicants: {
      total: number;
      assigned: number;
      pending: number;
      pendingByPosition: Array<{
        positionId: number;
        positionName: string;
        count: number;
      }>;
      assignedByPosition: Array<{
        positionId: number;
        positionName: string;
        count: number;
      }>;
    };
  } | null>(null);
  
  // Swap confirmation states
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [swapData, setSwapData] = useState<{
    activeItem: Applicant | null;
    overItem: Applicant | null;
  }>({ activeItem: null, overItem: null });
  const [isSwapping, setIsSwapping] = useState(false);
  
  // Filter states
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ units: [], posCodes: [] });
  const [filters, setFilters] = useState({
    search: '',
    unit: 'all',
    posCode: 'all',
  });
  
  // Vacant position type tab state
  const [vacantTypeTab, setVacantTypeTab] = useState<'all' | 'vacant' | 'reserved'>('all');
  
  // Applicant filter tab state (เพิ่ม)
  const [applicantFilterTab, setApplicantFilterTab] = useState<'all' | 'assigned' | 'pending'>('all');
  
  // Modal refresh state
  const [modalRefreshKey, setModalRefreshKey] = useState(0);
  const [showRefreshIndicator, setShowRefreshIndicator] = useState(false);
  
  // Year filter state
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear() + 543);
  
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
  
  // View mode state
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  // Pagination state for table view
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12); // Default เหมาะกับ card grid 4 คอลัมน์ x 3 แถว
  
  // Summary states
  const [total, setTotal] = useState(0);
  
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchFilterOptions();
    fetchStats(); // ดึงสถิติทันทีเมื่อโหลดหน้า
  }, []);

  useEffect(() => {
    fetchStats(); // อัพเดทสถิติเมื่อเปลี่ยนปี
  }, [currentYear]);

  useEffect(() => {
    // แสดงข้อมูลเฉพาะเมื่อมีการเลือก filter หน่วยหรือ pos code
    if (filters.unit !== 'all' || filters.posCode !== 'all' || filters.search) {
      fetchVacantPositions();
    } else {
      // ถ้าไม่มี filter ให้ล้างข้อมูล
      setAllVacantPositions([]);
      setVacantPositions([]);
      setTotal(0);
    }
  }, [filters.search, filters.unit, filters.posCode, currentYear]); // ลบ vacantTypeTab ออก

  // useEffect แยกสำหรับ filter ตาม tab (ไม่ต้องเรียก API ใหม่)
  useEffect(() => {
    if (allVacantPositions.length > 0) {
      applyVacantTypeFilter(allVacantPositions, vacantTypeTab);
    }
  }, [vacantTypeTab, applicantFilterTab]); // เมื่อเปลี่ยน tab ให้ filter ข้อมูลที่มีอยู่

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/vacant-position/filters');
      if (response.ok) {
        const result = await response.json();
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        year: currentYear.toString(),
      });
      
      const response = await fetch(`/api/vacant-position/stats?${params}`);
      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchVacantPositions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        // ไม่ส่ง page และ limit เพื่อดึงทั้งหมด
        ...(filters.search && { search: filters.search }),
        ...(filters.unit !== 'all' && { unit: filters.unit }),
        ...(filters.posCode !== 'all' && { posCode: filters.posCode }),
        year: currentYear.toString(), // เพิ่ม year parameter
      });

      const response = await fetch(`/api/vacant-position/actual?${params}`);
      if (response.ok) {
        const result = await response.json();
        const allPositions = result.data || result;
        
        // เก็บข้อมูลทั้งหมด
        setAllVacantPositions(allPositions);
        setTotal(allPositions.length);
        
        // Filter ตามประเภทตำแหน่งว่างทันที
        applyVacantTypeFilter(allPositions, vacantTypeTab);
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลตำแหน่งที่ว่างได้');
      }
    } catch (error) {
      console.error('Error fetching vacant positions:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชัน filter ตามประเภทตำแหน่งว่าง
  const applyVacantTypeFilter = (positions: VacantPosition[], filterType: 'all' | 'vacant' | 'reserved') => {
    let filteredPositions = positions;
    
    if (filterType === 'vacant') {
      // แสดงเฉพาะ "ว่าง"
      filteredPositions = positions.filter(pos => 
        pos.fullName === 'ว่าง'
      );
    } else if (filterType === 'reserved') {
      // แสดงเฉพาะ "ว่าง (กันตำแหน่ง)" หรือ "ว่าง(กันตำแหน่ง)"
      filteredPositions = positions.filter(pos => 
        pos.fullName === 'ว่าง (กันตำแหน่ง)' || 
        pos.fullName === 'ว่าง(กันตำแหน่ง)'
      );
    }
    // ถ้าเป็น 'all' ให้แสดงทั้งหมด
    
    // Apply applicant filter (จับคู่แล้ว/รอจับคู่)
    if (applicantFilterTab === 'assigned') {
      filteredPositions = filteredPositions.filter(pos => pos.assignmentInfo);
    } else if (applicantFilterTab === 'pending') {
      filteredPositions = filteredPositions.filter(pos => !pos.assignmentInfo);
    }
    
    // เรียงตามสถานะการจับคู่ (จับคู่แล้วขึ้นก่อน) สำหรับทุกกรณี
    filteredPositions = filteredPositions.sort((a, b) => {
      const aHasAssignment = a.assignmentInfo ? 1 : 0;
      const bHasAssignment = b.assignmentInfo ? 1 : 0;
      // เรียงให้ที่จับคู่แล้วอยู่ด้านบน (1 มาก่อน 0)
      return bHasAssignment - aHasAssignment;
    });
    
    setVacantPositions(filteredPositions);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    // ไม่ต้องรีเซ็ต page เพราะไม่มี pagination
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    // ไม่ต้องรีเซ็ต page เพราะไม่มี pagination
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      unit: 'all',
      posCode: 'all',
    });
    setVacantTypeTab('all'); // รีเซ็ต tab ด้วย
    setApplicantFilterTab('all'); // รีเซ็ต applicant filter ด้วย
    setPage(0); // Reset page when filters change
    // ล้างข้อมูลและโหลดใหม่
    setAllVacantPositions([]);
    setVacantPositions([]);
    setTotal(0);
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setCurrentYear(Number(event.target.value));
    setPage(0); // Reset page when year changes
  };

  const fetchApplicants = async (posCodeId: number) => {
    setLoadingApplicants(true);
    setApplicants([]); // เคลียร์ข้อมูลเก่าก่อน
    try {
      // ดึงรายการผู้สมัครเฉพาะตำแหน่งนั้น
      const response = await fetch(`/api/vacant-position/applicants/${posCodeId}?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched applicants:', data);
        setApplicants(data);
        setModalRefreshKey(prev => prev + 1); // Trigger modal refresh
        
        // แสดง refresh indicator ชั่วคราว
        setShowRefreshIndicator(true);
        setTimeout(() => setShowRefreshIndicator(false), 3000);
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลผู้ยื่นขอได้');
      }
    } catch (error) {
      console.error('Error fetching applicants:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleViewApplicants = (position: VacantPosition) => {
    setSelectedPosition(position);
    fetchApplicants(position.posCodeId);
    setDialogOpen(true);
    setHasOrderChanged(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);

    if (over && active.id !== over.id) {
      const activeItem = applicants.find((item) => item.id === active.id);
      const overItem = applicants.find((item) => item.id === over.id);

      if (activeItem && overItem) {
        // เปิด dialog ยืนยัน
        setSwapData({ activeItem, overItem });
        setSwapConfirmOpen(true);
      }
    }
  };

  // ยืนยันการสลับจาก Dialog
  const handleSwapConfirm = async () => {
    const { activeItem, overItem } = swapData;
    
    if (!activeItem || !overItem || !selectedPosition) return;

    setIsSwapping(true);

    try {
      // คำนวณข้อมูลที่สลับแล้วก่อน
      const oldIndex = applicants.findIndex((item) => item.id === activeItem.id);
      const newIndex = applicants.findIndex((item) => item.id === overItem.id);
      
      // สลับตำแหน่งเฉพาะ 2 items ที่เลือก
      const newItems = [...applicants];
      [newItems[oldIndex], newItems[newIndex]] = [newItems[newIndex], newItems[oldIndex]];
      
      // Update displayOrder for all items
      const updatedApplicants = newItems.map((item, index) => ({
        ...item,
        displayOrder: index + 1,
      }));

      // บันทึกลงฐานข้อมูลก่อน
      const updates = updatedApplicants.map((applicant, index) => ({
        id: applicant.id,
        displayOrder: index + 1,
      }));

      const response = await fetch('/api/vacant-position/applicants/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        // อัพเดท state หลังจากบันทึกสำเร็จ
        setApplicants(updatedApplicants);
        setHasOrderChanged(false);
        setSwapConfirmOpen(false);
        toast.success('สลับตำแหน่งและบันทึกเรียบร้อย');
      } else {
        toast.error('ไม่สามารถบันทึกการสลับตำแหน่งได้');
      }
    } catch (error) {
      console.error('Error swapping:', error);
      toast.error('เกิดข้อผิดพลาดในการสลับตำแหน่ง');
    } finally {
      setIsSwapping(false);
    }
  };

  // ยกเลิกการสลับ
  const handleSwapCancel = () => {
    setSwapConfirmOpen(false);
    setSwapData({ activeItem: null, overItem: null });
  };

  const handleSaveOrder = async () => {
    if (!selectedPosition) return;

    setLoading(true);
    try {
      const updates = applicants.map((applicant, index) => ({
        id: applicant.id,
        displayOrder: index + 1,
      }));

      const response = await fetch('/api/vacant-position/applicants/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (response.ok) {
        toast.success('บันทึกลำดับสำเร็จ');
        setHasOrderChanged(false);
      } else {
        toast.error('ไม่สามารถบันทึกลำดับได้');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกลำดับ');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPosition = (applicant: Applicant, vacantPosition: VacantPosition) => {
    // ตรวจสอบว่าผู้สมัครถูกจับคู่ไปแล้วหรือไม่
    if (applicant.isAssigned) {
      toast.error(`${applicant.fullName} ถูกจับคู่ตำแหน่งไปแล้ว`);
      return;
    }

    // ตรวจสอบว่าตำแหน่งถูกจับคู่ไปแล้วหรือไม่
    if (vacantPosition.assignmentInfo) {
      toast.error(`ตำแหน่งนี้ถูกจับคู่ให้กับ ${vacantPosition.assignmentInfo.assignedPersonName} ไปแล้ว`);
      return;
    }

    setSelectedApplicant(applicant);
    setSelectedVacantSlot(vacantPosition);
    setAssignNotes('');
    setAssignDialogOpen(true);
  };

  const confirmAssignment = async () => {
    if (!selectedApplicant || !selectedVacantSlot) {
      console.log('❌ Missing data:', { selectedApplicant, selectedVacantSlot });
      return;
    }

    console.log('🚀 Starting assignment:', {
      applicantId: selectedApplicant.id,
      vacantPositionId: selectedVacantSlot.id,
      applicant: selectedApplicant.fullName,
      position: `${selectedVacantSlot.position} ${selectedVacantSlot.unit}`,
      notes: assignNotes,
    });

    setLoading(true);
    try {
      const response = await fetch('/api/vacant-position/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantId: selectedApplicant.id,
          vacantPositionId: selectedVacantSlot.id,
          notes: assignNotes,
        }),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Assignment successful:', result);
        
        // ปิด assign dialog
        setAssignDialogOpen(false);
        
        // รีเฟรชข้อมูลก่อน (โดยไม่แสดง toast ระหว่างโหลด)
        console.log('🔄 Refreshing data...');
        
        // รีเฟรชรายการผู้สมัครใน modal ทันที (ไม่ปิด modal)
        if (selectedPosition && dialogOpen) {
          console.log('🔄 Refreshing applicants in modal for posCodeId:', selectedPosition.posCodeId);
          await fetchApplicants(selectedPosition.posCodeId);
          
          // อัปเดต selectedPosition ด้วยเพื่อให้ข้อมูลตรงกับ vacant position ล่าสุด
          const updatedPosition = await fetch(`/api/vacant-position/actual?year=${currentYear}`)
            .then(res => res.json())
            .then(data => {
              const positions = data.data || data;
              return positions.find((p: VacantPosition) => p.id === selectedPosition.id);
            })
            .catch(err => {
              console.error('Error updating position:', err);
              return null;
            });
          
          if (updatedPosition) {
            setSelectedPosition(updatedPosition);
          }
        }
        
        // รีเฟรชข้อมูลตำแหน่งว่างและสถิติ
        await fetchVacantPositions();
        await fetchStats();
        
        console.log('✅ All data refreshed');
        
        // แสดง success message หลังจากโหลดข้อมูลเสร็จแล้ว
        toast.success('จับคู่ตำแหน่งสำเร็จ');
      } else {
        const error = await response.json();
        console.error('❌ Assignment failed:', { status: response.status, error });
        
        if (response.status === 409) {
          // ตำแหน่งไม่ว่างแล้วหรือผู้สมัครถูกจับคู่แล้ว
          toast.error(error.details || 'ตำแหน่งนี้ไม่ว่างแล้วหรือผู้สมัครถูกจับคู่แล้ว');
          
          // ปิด dialog และรีเฟรชข้อมูลเพื่อแสดงสถานะล่าสุด
          setAssignDialogOpen(false);
          
          console.log('🔄 Reloading data due to conflict...');
          await fetchVacantPositions();
          
          // รีเฟรชรายการผู้สมัครใน modal ด้วย
          if (selectedPosition && dialogOpen) {
            console.log('🔄 Reloading modal applicants...');
            toast.info('กำลังอัปเดตรายการผู้ยื่นขอ...', 2000);
            await fetchApplicants(selectedPosition.posCodeId);
          }
          
          await fetchStats();
        } else if (response.status === 503) {
          // Service Unavailable - Transaction timeout
          toast.error(error.error || 'ระบบไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
          setAssignDialogOpen(false);
        } else {
          toast.error(error.error || 'ไม่สามารถจับคู่ตำแหน่งได้');
        }
      }
    } catch (error) {
      console.error('💥 Error assigning position:', error);
      toast.error('เกิดข้อผิดพลาดในการจับคู่ตำแหน่ง');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (applicant: Applicant) => {
    setUnassignApplicant(applicant);
    setUnassignReason('');
    setUnassignDialogOpen(true);
  };

  const confirmUnassign = async () => {
    if (!unassignApplicant) return;

    setLoading(true);
    
    // ปิด dialog ทันทีเพื่อให้รู้สึก responsive
    setUnassignDialogOpen(false);
    
    try {
      console.log('🔄 Unassigning applicant:', unassignApplicant.id);
      
      const response = await fetch('/api/vacant-position/unassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantId: unassignApplicant.id,
          reason: unassignReason || 'ไม่ระบุเหตุผล',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Unassignment successful:', result);
        
        // แสดง success message ทันที
        toast.success('ยกเลิกการจับคู่สำเร็จ');
        
        // เคลียร์ข้อมูล dialog
        setUnassignApplicant(null);
        setUnassignReason('');
        
        // รีเฟรชข้อมูล (modal ผู้ยื่นขอจะแสดง loading ถ้าเปิดอยู่)
        console.log('🔄 Refreshing data...');
        
        // รีเฟรชรายการผู้สมัครใน modal ก่อน (ถ้า modal เปิดอยู่)
        if (selectedPosition && dialogOpen) {
          console.log('🔄 Reloading modal applicants after unassign...');
          
          // โหลดข้อมูล applicants และ position แบบ parallel
          const [_, updatedPosition] = await Promise.all([
            fetchApplicants(selectedPosition.posCodeId),
            fetch(`/api/vacant-position/actual?year=${currentYear}`)
              .then(res => res.json())
              .then(data => {
                const positions = data.data || data;
                return positions.find((p: VacantPosition) => p.id === selectedPosition.id);
              })
              .catch(err => {
                console.error('Error updating position:', err);
                return null;
              })
          ]);
          
          if (updatedPosition) {
            setSelectedPosition(updatedPosition);
          }
        }
        
        // รีเฟรชข้อมูลตำแหน่งว่างและสถิติ (ทำพร้อมกัน)
        await Promise.all([
          fetchVacantPositions(),
          fetchStats()
        ]);
        
        console.log('✅ All data refreshed');
      } else {
        const error = await response.json();
        console.error('❌ Unassignment failed:', error);
        
        if (response.status === 503) {
          // Service Unavailable - Transaction timeout
          toast.error(error.error || 'ระบบไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
        } else {
          toast.error(error.error || 'ไม่สามารถยกเลิกการจับคู่ได้');
        }
        
        // เคลียร์ข้อมูล dialog เมื่อเกิด error
        setUnassignApplicant(null);
        setUnassignReason('');
      }
    } catch (error) {
      console.error('💥 Error unassigning:', error);
      toast.error('เกิดข้อผิดพลาดในการยกเลิกการจับคู่');
      
      // เคลียร์ข้อมูล dialog เมื่อเกิด error
      setUnassignApplicant(null);
      setUnassignReason('');
    } finally {
      setLoading(false);
    }
  };

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
              <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                จัดการจับคู่ตำแหน่งที่ว่าง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                เลือกหน่วยหรือรหัสตำแหน่งเพื่อแสดงตำแหน่งที่ว่างและดูรายการผู้สมัคร
              </Typography>
            </Box>
            
            {/* Summary and View Toggle */}
            {!loading && total > 0 && vacantPositions.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip
                  icon={<AssignmentIcon />}
                  label={`ตำแหน่งว่าง: ${total} ตำแหน่ง`}
                  color="warning"
                  variant="filled"
                  size="medium"
                />
                
                {/* View Toggle */}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                  aria-label="view mode"
                >
                  <ToggleButton value="card" aria-label="card view">
                    <Tooltip title="มุมมองการ์ด">
                      <ViewModuleIcon />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value="table" aria-label="table view">
                    <Tooltip title="มุมมองตาราง">
                      <ViewListIcon />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Filter Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                ตัวกรองข้อมูล
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 2fr' }, 
              gap: 2,
              alignItems: 'start'
            }}>
              
              {/* Search */}
              <TextField
                label="ค้นหา"
                placeholder="ค้นหาชื่อตำแหน่ง..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Year Filter */}
              <FormControl size="small">
                <InputLabel id="year-filter-label">ปี</InputLabel>
                <Select
                  labelId="year-filter-label"
                  id="year-filter"
                  value={currentYear}
                  label="ปี"
                  onChange={handleYearChange}
                >
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Unit and PosCode in one column */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Unit Filter */}
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>หน่วย</InputLabel>
                  <Select
                    value={filters.unit}
                    label="หน่วย"
                    onChange={(e) => handleFilterChange('unit', e.target.value)}
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    {filterOptions.units.map((unit) => (
                      <MenuItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Position Code Filter */}
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>รหัสตำแหน่ง</InputLabel>
                  <Select
                    value={filters.posCode}
                    label="รหัสตำแหน่ง"
                    onChange={(e) => handleFilterChange('posCode', e.target.value)}
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    {filterOptions.posCodes.map((posCode) => (
                      <MenuItem key={posCode.value} value={posCode.value}>
                        {posCode.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Assignment Status Filter */}
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>สถานะการจับคู่</InputLabel>
                  <Select
                    value={applicantFilterTab}
                    label="สถานะการจับคู่"
                    onChange={(e) => setApplicantFilterTab(e.target.value as 'all' | 'assigned' | 'pending')}
                  >
                    <MenuItem value="all">ทั้งหมด</MenuItem>
                    <MenuItem value="assigned">จับคู่แล้ว</MenuItem>
                    <MenuItem value="pending">รอจับคู่</MenuItem>
                  </Select>
                </FormControl>
              </Box>

            </Box>
            
            {/* Summary and Reset */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {total > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    พบตำแหน่งที่ว่าง: <strong>{total}</strong> ตำแหน่ง
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    
                  </Typography>
                )}
                {(filters.search || filters.unit !== 'all' || filters.posCode !== 'all') && (
                  <Chip
                    label="มีการกรองข้อมูล"
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
              
              {/* Reset Button */}
              {(filters.search || filters.unit !== 'all' || filters.posCode !== 'all') && (
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={resetFilters}
                  size="small"
                >
                  ล้างตัวกรอง
                </Button>
              )}
            </Box>
          </Stack>
        </Paper>


        {/* Statistics Section - Compact but Readable */}
        {stats && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Header */}
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                📊 สถิติตำแหน่งว่าง
              </Typography>
              
              {/* Stats Row */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
                {/* DB Stats */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary' }}>
                    Database (ปัจจุบัน):
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`ว่างทั้งหมด: ${stats.policePersonnel.totalVacant}`} 
                      color="info"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip 
                      label={`ว่าง: ${stats.policePersonnel.vacant}`} 
                      color="warning"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip 
                      label={`กันตำแหน่ง: ${stats.policePersonnel.reserved}`} 
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                    {stats.policePersonnel.emptyName > 0 && (
                      <Chip 
                        label={`ไม่มีชื่อ: ${stats.policePersonnel.emptyName}`}
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                </Box>
                
                <Divider orientation="vertical" flexItem />
                
                {/* Applicants Stats */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary' }}>
                    ผู้ยื่นขอตำแหน่ง (ปี {currentYear}):
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`ทั้งหมด: ${stats.applicants.total}`} 
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip 
                      label={`จับคู่แล้ว: ${stats.applicants.assigned}`} 
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip 
                      label={`รอจับคู่: ${stats.applicants.pending}`} 
                      color="warning"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>

                {/* รายละเอียดรอจับคู่และจับคู่แล้ว */}
                {((stats.applicants.pendingByPosition && stats.applicants.pendingByPosition.length > 0) ||
                  (stats.applicants.assignedByPosition && stats.applicants.assignedByPosition.length > 0)) && (
                  <>
                    <Divider orientation="vertical" flexItem />
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                      {/* รายละเอียดรอจับคู่แต่ละตำแหน่ง */}
                      {stats.applicants.pendingByPosition && stats.applicants.pendingByPosition.length > 0 && (
                        <Box>
                          <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'warning.dark', mb: 0.5, display: 'block' }}>
                            รอจับคู่:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {stats.applicants.pendingByPosition.map((pos) => (
                              <Chip 
                                key={`pending-${pos.positionId}`}
                                label={`${pos.positionName}: ${pos.count} คน`}
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ 
                                  fontSize: '0.85rem',
                                  height: 24,
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* รายละเอียดจับคู่แล้วแต่ละตำแหน่ง */}
                      {stats.applicants.assignedByPosition && stats.applicants.assignedByPosition.length > 0 && (
                        <Box>
                          <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'success.dark', mb: 0.5, display: 'block' }}>
                            จับคู่แล้ว:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {stats.applicants.assignedByPosition.map((pos) => (
                              <Chip 
                                key={`assigned-${pos.positionId}`}
                                label={`${pos.positionName}: ${pos.count} คน`}
                                size="small"
                                variant="outlined"
                                color="success"
                                sx={{ 
                                  fontSize: '0.85rem',
                                  height: 24,
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </>
                )}
              </Box>
            </Box>
          </Paper>
        )}


        {/* Vacant Position Type Tabs - Minimal Style */}
        {(filters.unit !== 'all' || filters.posCode !== 'all' || filters.search) && (
          <Box sx={{ mb: 3 }}>
            <Tabs
              value={vacantTypeTab}
              onChange={(e, newValue) => setVacantTypeTab(newValue)}
              sx={{
                minHeight: 40,
                '& .MuiTabs-indicator': {
                  height: 2,
                },
              }}
            >
              <Tab 
                label={`ทั้งหมด${total > 0 ? ` (${allVacantPositions.filter(p => p.assignmentInfo).length}/${allVacantPositions.length})` : ''}`}
                value="all"
                sx={{ 
                  minHeight: 40,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                }}
              />
              <Tab 
                label={`ว่าง${total > 0 ? ` (${allVacantPositions.filter(p => p.fullName === 'ว่าง' && p.assignmentInfo).length}/${allVacantPositions.filter(p => p.fullName === 'ว่าง').length})` : ''}`}
                value="vacant"
                sx={{ 
                  minHeight: 40,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                }}
              />
              <Tab 
                label={`ว่าง (กันตำแหน่ง)${total > 0 ? ` (${allVacantPositions.filter(p => (p.fullName === 'ว่าง (กันตำแหน่ง)' || p.fullName === 'ว่าง(กันตำแหน่ง)') && p.assignmentInfo).length}/${allVacantPositions.filter(p => p.fullName === 'ว่าง (กันตำแหน่ง)' || p.fullName === 'ว่าง(กันตำแหน่ง)').length})` : ''}`}
                value="reserved"
                sx={{ 
                  minHeight: 40,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                }}
              />
            </Tabs>
            <Divider />
          </Box>
        )}

        {loading && vacantPositions.length === 0 ? (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)', 
              lg: 'repeat(4, 1fr)',
            }, 
            gap: 2,
            mt: 1
          }}>
            {Array.from({ length: rowsPerPage }).map((_, index) => (
              <Card key={index} sx={{ borderRadius: 2 }}>
                <Box sx={{ height: 4, bgcolor: 'grey.300' }} />
                <CardContent sx={{ p: 1.5, pb: 1 }}>
                  <Skeleton variant="text" width="60%" height={24} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="80%" height={20} />
                  <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                    <Skeleton variant="rounded" width={80} height={24} />
                    <Skeleton variant="rounded" width={60} height={24} />
                  </Box>
                  <Skeleton variant="text" width="90%" height={16} />
                  <Skeleton variant="text" width="70%" height={16} />
                </CardContent>
                <CardActions sx={{ p: 1.5, pt: 0 }}>
                  <Skeleton variant="rounded" width="100%" height={32} />
                </CardActions>
              </Card>
            ))}
          </Box>
        ) : viewMode === 'card' ? (
          <>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)', 
                lg: 'repeat(4, 1fr)',
              }, 
              gap: 2,
              mt: 1
            }}>
              {vacantPositions
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((position) => (
              <Card 
                key={position.id}
                sx={{ 
                  height: 'fit-content',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: position.assignmentInfo ? 'grey.400' : 'divider',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  bgcolor: position.assignmentInfo ? 'grey.100' : 'background.paper', // เทาเข้มขึ้น
                  opacity: position.assignmentInfo ? 0.85 : 1,
                  '&:hover': {
                    boxShadow: position.assignmentInfo 
                      ? '0 2px 8px rgba(0, 0, 0, 0.15)' 
                      : '0 4px 16px rgba(25, 118, 210, 0.15)',
                    borderColor: position.assignmentInfo ? 'grey.500' : 'primary.main',
                    transform: 'translateY(-2px)',
                  },
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px', // เพิ่มความสูงจาก 3px เป็น 4px
                    background: position.assignmentInfo 
                      ? 'linear-gradient(90deg, #66bb6a 0%, #81c784 100%)'
                      : 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                  }
                }}
                onClick={() => handleViewApplicants(position)}
              >
                <CardContent sx={{ p: 1.5, pb: 1 }}>
                  <Stack spacing={1.25}>
                    {/* Header - Compact with Assignment Badge */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <Box sx={{ 
                        p: 0.75, 
                        borderRadius: 1.5, 
                        bgcolor: position.assignmentInfo ? 'success.50' : 'primary.50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {position.assignmentInfo ? (
                          <CheckIcon color="success" sx={{ fontSize: '1.25rem' }} />
                        ) : (
                          <BusinessIcon color="primary" sx={{ fontSize: '1.25rem' }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Typography 
                            variant="subtitle2"
                            sx={{ 
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              lineHeight: 1.4,
                              color: 'text.primary',
                            }}
                          >
                            {position.posCodeId} - {position.posCodeName}
                          </Typography>
                          {position.assignmentInfo && (
                            <Chip 
                              label="จับคู่แล้ว" 
                              size="small" 
                              color="success"
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Info Section - Compact */}
                    <Box sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.75,
                    }}>
                      {/* ตำแหน่ง */}
                      <Box sx={{ 
                        
                        borderLeft: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: 1,
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1
                      }}>
                        <Box>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              display: 'block',
                              mb: 0.25
                            }}
                          >
                            ตำแหน่ง
                          </Typography>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              fontWeight: 600,
                              color: 'primary.main',
                              fontSize: '0.85rem',
                              lineHeight: 1.3,
                            }}
                          >
                            {position.position || '-'}
                          </Typography>
                        </Box>
                        
                        {/* หน่วย - ชิดขวา */}
                        <Box sx={{ 
                          bgcolor: 'rgba(25, 118, 210, 0.08)',
                          borderRadius: 1,
                          px: 1.5,
                          py: 0.75,
                          textAlign: 'right',
                          flexShrink: 0
                        }}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              display: 'block',
                            }}
                          >
                            หน่วย
                          </Typography>
                          <Typography 
                            variant="body2"
                            sx={{ 
                              fontWeight: 700,
                              color: 'primary.main',
                              fontSize: '0.9rem',
                              lineHeight: 1.2,
                            }}
                          >
                            {position.unit || '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* Position Number - Inline style */}
                    {position.positionNumber && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5
                      }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                        >
                          เลขตำแหน่ง
                        </Typography>
                        <Typography 
                          variant="caption"
                          sx={{ 
                            fontWeight: 700,
                            color: 'info.main',
                            fontSize: '0.75rem'
                          }}
                        >
                          {position.positionNumber}
                        </Typography>
                      </Box>
                    )}

                    {/* แสดงข้อมูลการจับคู่ */}
                    {position.assignmentInfo && (
                      <Box sx={{ 
                        bgcolor: 'success.50',
                        border: '1px solid',
                        borderColor: 'success.200',
                        borderRadius: 1,
                        p: 1,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <CheckIcon sx={{ fontSize: '0.9rem', color: 'success.main' }} />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: 'success.dark'
                            }}
                          >
                            จับคู่แล้ว
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2"
                          sx={{ 
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: 'success.dark',
                            mb: 0.25
                          }}
                        >
                          {position.assignmentInfo.assignedPersonRank} {position.assignmentInfo.assignedPersonName}
                        </Typography>
                        <Typography 
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: '0.7rem' }}
                        >
                          จาก: {position.assignmentInfo.fromPosition} - {position.assignmentInfo.fromUnit}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
                
                <CardActions sx={{ 
                  p: 1.5, 
                  pt: 0.5,
                }}>
                  <Button
                    startIcon={<ViewIcon sx={{ fontSize: '1rem' }} />}
                    onClick={() => handleViewApplicants(position)}
                    variant="contained"
                    fullWidth
                    size="small"
                    sx={{ 
                      py: 0.75,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      boxShadow: 'none',
                      '&:hover': {
                        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
                      }
                    }}
                  >
                    ดูผู้สมัคร
                  </Button>
                </CardActions>
              </Card>
              ))}
            </Box>
            
            {/* Pagination for Card View */}
            {vacantPositions.length > 0 && (
              <Paper sx={{ mt: 2 }}>
                <DataTablePagination
                  count={vacantPositions.length}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[8, 12, 24, 48]}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  variant="minimal"
                />
              </Paper>
            )}
          </>
        ) : (
          /* Table View */
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>รหัสตำแหน่ง - ชื่อตำแหน่ง</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>หน่วย</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ตำแหน่ง</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>เลขตำแหน่ง</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>การดำเนินการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vacantPositions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((position) => (
                  <TableRow 
                    key={position.id}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => handleViewApplicants(position)}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>
                      {position.posCodeId} - {position.posCodeName}
                    </TableCell>
                    <TableCell>{position.unit}</TableCell>
                    <TableCell>{position.position}</TableCell>
                    <TableCell>{position.positionNumber || '-'}</TableCell>
                    <TableCell>
                      {position.assignmentInfo ? (
                        <Chip
                          icon={<CheckIcon />}
                          label={`${position.assignmentInfo.assignedPersonRank} ${position.assignmentInfo.assignedPersonName}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label="ยังไม่จับคู่"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        startIcon={<ViewIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewApplicants(position);
                        }}
                        variant="contained"
                        size="small"
                        sx={{ 
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          boxShadow: 'none',
                          '&:hover': {
                            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
                          }
                        }}
                      >
                        ดูผู้สมัคร
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {vacantPositions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <DataTablePagination
              count={vacantPositions.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              variant="minimal"
            />
          </TableContainer>
        )}

        {/* แสดงข้อความแนะนำเมื่อยังไม่มีการ filter */}
        {!loading && vacantPositions.length === 0 && filters.unit === 'all' && filters.posCode === 'all' && !filters.search && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              กรุณาเลือกหน่วยหรือรหัสตำแหน่งเพื่อแสดงตำแหน่งที่ว่าง
            </Typography>
          </Alert>
        )}

        {/* แสดงข้อความเมื่อไม่พบข้อมูลตามเงื่อนไข */}
        {!loading && vacantPositions.length === 0 && (filters.unit !== 'all' || filters.posCode !== 'all' || filters.search) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            ไม่พบตำแหน่งที่ว่างตามเงื่อนไขที่กำหนด
          </Alert>
        )}

        {/* Dialog แสดงรายการผู้ยื่นขอ */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
          sx={{
            '& .MuiDialog-paper': {
              margin: { xs: 0, sm: 2 },
              width: { xs: '100%' },
              maxHeight: { xs: '100%', sm: 'calc(100% - 64px)' },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <AccountBoxIcon fontSize="small" />
                <Box>
                  <Typography variant="subtitle1">
                    ผู้ยื่นขอตำแหน่ง: {selectedPosition?.posCodeName}
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.9rem' }}>
                    หน่วย: {selectedPosition?.unit} | ตำแหน่ง: {selectedPosition?.position}
                  </Typography>
                </Box>
              </Stack>
              {hasOrderChanged && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveOrder}
                  disabled={loadingApplicants}
                  color="primary"
                >
                  บันทึกลำดับ
                </Button>
              )}
            </Stack>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 0, minHeight: '400px', maxHeight: '600px', overflow: 'auto', position: 'relative' }}>
            {loadingApplicants || loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 2 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary">
                  {loading ? 'กำลังโหลด...' : 'กำลังโหลดรายการผู้ยื่นขอ...'}
                </Typography>
              </Box>
            ) : applicants.length === 0 ? (
              <Alert severity="info" sx={{ py: 1 }}>
                ไม่มีผู้ยื่นขอตำแหน่งนี้
              </Alert>
            ) : (
              <>
                
                {/* แสดง Alert เมื่อตำแหน่งถูกจับคู่แล้ว */}
                {selectedPosition?.assignmentInfo && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      ⚠️ ไม่อนุญาตให้จับคู่ซ้ำ
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      ตำแหน่งนี้ถูกจับคู่ให้กับ <strong>{selectedPosition.assignmentInfo.assignedPersonName}</strong> ({selectedPosition.assignmentInfo.assignedPersonRank}) แล้ว
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      จับคู่เมื่อ: {new Date(selectedPosition.assignmentInfo.assignedDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Alert>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Alert severity="info" sx={{ py: 0.5, flex: 1, mr: 2 }}>
                    <Typography variant="body2">
                      รายการผู้ยื่นขอตำแหน่งนี้: {applicants.length} คน
                      {applicants.filter(a => a.isAssigned).length > 0 && ` (จับคู่แล้ว: ${applicants.filter(a => a.isAssigned).length} คน)`}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        💡 ลากและวางเพื่อจัดเรียงลำดับผู้สมัคร
                        {modalRefreshKey > 0 && ' • อัปเดตล่าสุด'}
                      </Typography>
                    </Typography>
                  </Alert>
                  
                  {applicants.filter(a => a.isAssigned).length > 0 && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showAssignedInModal}
                          onChange={(e) => setShowAssignedInModal(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          แสดงคนที่จับคู่แล้ว
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  )}
                </Box>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={applicants.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <List 
                      dense 
                      sx={{ 
                        py: 0,
                      }}
                    >
                      {applicants
                        .filter(applicant => showAssignedInModal ? true : !applicant.isAssigned)
                        .map((applicant, index) => (
                        <SortableApplicantItem
                          key={applicant.id}
                          applicant={applicant}
                          index={index}
                          onAssign={handleAssignPosition}
                          onUnassign={handleUnassign}
                          loading={loading}
                          selectedPosition={selectedPosition}
                        />
                      ))}
                    </List>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <ListItem
                        sx={{
                          py: 0.5,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          border: 2,
                          borderColor: 'primary.main',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                          opacity: 0.9,
                          maxWidth: '700px',
                          width: '700px',
                        }}
                      >
                        <Box
                          sx={{
                            cursor: 'grabbing',
                            display: 'flex',
                            alignItems: 'center',
                            mr: 1,
                            color: 'text.secondary',
                          }}
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </Box>
                        {(() => {
                          const applicant = applicants.find(a => a.id === activeId);
                          const index = applicants.findIndex(a => a.id === activeId);
                          if (!applicant) return null;
                          return (
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Chip 
                                    label={`อันดับ ${applicant.displayOrder || index + 1}`} 
                                    size="small" 
                                    color="primary"
                                  />
                                  <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                    {applicant.rank} {applicant.fullName} ({applicant.age ? `${applicant.age}` : 'อายุไม่ระบุ'}) <br />
                                    <Typography 
                                      component="span" 
                                      variant="caption" 
                                      color="text.secondary"
                                      sx={{ fontSize: '0.75rem' }}
                                    >
                                      จำนวนปี: {applicant.yearsOfService || '-'}
                                    </Typography>
                                  </Box>
                                </Box>
                              }
                              secondary={
                                <>
                                  <strong>ตำแหน่งปัจจุบัน:</strong> {applicant.position} | {applicant.unit}
                                  {applicant.nominator && (
                                    <>
                                      <br />
                                      <strong>ผู้เสนอ:</strong> {applicant.nominator}
                                    </>
                                  )}
                                  {applicant.notes && (
                                    <>
                                      <br />
                                      <strong>หมายเหตุ:</strong> {applicant.notes}
                                    </>
                                  )}
                                </>
                              }
                            />
                          );
                        })()}
                      </ListItem>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDialogOpen(false)} size="small">
              ปิด
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog ยืนยันการจับคู่ */}
        <Dialog 
          open={assignDialogOpen} 
          onClose={() => setAssignDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckIcon color="success" fontSize="small" />
              <Typography variant="subtitle1">
                ยืนยันการจับคู่ตำแหน่ง
              </Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 1 }}>
            {selectedApplicant && selectedVacantSlot && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ py: 1 }}>
                  <Box component="div">
                    <Box component="div" sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>
                      การจับคู่ที่จะดำเนินการ:
                    </Box>
                    <Box component="div" sx={{ fontSize: '0.8rem', mb: 1 }}>
                      <strong>👤 ผู้ย้าย:</strong> {selectedApplicant.fullName}
                      <br />
                      <strong>📍 จาก:</strong> {selectedApplicant.position} | {selectedApplicant.unit}
                      <br />
                      <strong>🎯 ไป:</strong> {selectedVacantSlot.position} | {selectedVacantSlot.unit}
                      {selectedVacantSlot.positionNumber && (
                        <>
                          <br />
                          <strong>🏷️ เลขตำแหน่ง:</strong> {selectedVacantSlot.positionNumber}
                        </>
                      )}
                    </Box>
                  </Box>
                </Alert>
                
                <TextField
                  label="หมายเหตุ (ไม่บังคับ)"
                  multiline
                  rows={2}
                  size="small"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  fullWidth
                  placeholder="เพิ่มหมายเหตุ..."
                />
              </Stack>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button 
              onClick={() => setAssignDialogOpen(false)}
              disabled={loading}
              size="small"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmAssignment}
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
              disabled={loading}
              size="small"
            >
              ยืนยัน
            </Button>
          </DialogActions>
        </Dialog>

        {/* Unassign Confirmation Dialog */}
        <Dialog
          open={unassignDialogOpen}
          onClose={() => !loading && setUnassignDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloseIcon color="error" />
              <Typography variant="h6" component="span">
                ยืนยันการยกเลิกการจับคู่
              </Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent dividers>
            {unassignApplicant && (
              <Stack spacing={2}>
                <Alert severity="warning">
                  การยกเลิกจะทำให้สามารถจับคู่ตำแหน่งนี้ใหม่ได้อีกครั้ง
                </Alert>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ผู้ยื่นคำขอ
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {unassignApplicant.rank} {unassignApplicant.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {unassignApplicant.position} - {unassignApplicant.unit}
                  </Typography>
                </Box>

                {unassignApplicant.assignmentInfo && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      ตำแหน่งที่จับคู่
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {unassignApplicant.assignmentInfo.assignedPosition}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {unassignApplicant.assignmentInfo.assignedUnit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      จับคู่เมื่อ: {new Date(unassignApplicant.assignmentInfo.assignedDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Box>
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="เหตุผลในการยกเลิก"
                  value={unassignReason}
                  onChange={(e) => setUnassignReason(e.target.value)}
                  placeholder="ระบุเหตุผล (ไม่บังคับ)..."
                  helperText="ระบุเหตุผลเพื่อบันทึกไว้ตรวจสอบในอนาคต"
                />
              </Stack>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button 
              onClick={() => {
                setUnassignDialogOpen(false);
                setUnassignApplicant(null);
                setUnassignReason('');
              }}
              disabled={loading}
              size="small"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={confirmUnassign}
              variant="contained"
              color="error"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CloseIcon fontSize="small" />}
              disabled={loading}
              size="small"
            >
              {loading ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิกการจับคู่'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Swap Confirmation Dialog */}
        <Dialog
          open={swapConfirmOpen}
          onClose={() => !isSwapping && handleSwapCancel()}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              width: { xs: '100%', sm: 'auto' },
              height: { xs: '100%', sm: 'auto' },
              maxHeight: { xs: '100%', sm: '90vh' },
              margin: { xs: 0, sm: '32px' },
              borderRadius: { xs: 0, sm: 1 },
              display: 'flex',
              flexDirection: 'column'
            }
          }}
        >
          <DialogTitle sx={{ flexShrink: 0 }}>ยืนยันการสลับลำดับความสำคัญ</DialogTitle>
          <DialogContent
            sx={{
              flex: 1,
              overflow: 'auto',
              px: { xs: 2, sm: 3 },
              minHeight: 0
            }}
          >
            <Typography variant="body1" sx={{ mb: 3 }}>
              คุณต้องการสลับลำดับความสำคัญระหว่าง:
            </Typography>
            
            <Stack spacing={2}>
              <Paper sx={{ p: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.main' }}>
                <Typography variant="subtitle2" color="primary.main" gutterBottom>
                  ลำดับที่ {swapData.activeItem?.displayOrder || '-'}
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {swapData.activeItem?.rank} {swapData.activeItem?.fullName || 'ไม่ระบุชื่อ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ตำแหน่งปัจจุบัน: {swapData.activeItem?.position || 'ไม่ระบุ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  หน่วย: {swapData.activeItem?.unit || 'ไม่ระบุ'}
                </Typography>
              </Paper>

              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h4" color="primary.main">⇅</Typography>
              </Box>

              <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: 1, borderColor: 'secondary.main' }}>
                <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                  ลำดับที่ {swapData.overItem?.displayOrder || '-'}
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {swapData.overItem?.rank} {swapData.overItem?.fullName || 'ไม่ระบุชื่อ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ตำแหน่งปัจจุบัน: {swapData.overItem?.position || 'ไม่ระบุ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  หน่วย: {swapData.overItem?.unit || 'ไม่ระบุ'}
                </Typography>
              </Paper>
            </Stack>

            <Alert severity="info" sx={{ mt: 3 }}>
              การสลับลำดับจะส่งผลต่อความสำคัญในการพิจารณาตำแหน่ง
            </Alert>
          </DialogContent>
          <DialogActions sx={{ 
            px: { xs: 2, sm: 3 }, 
            py: { xs: 2, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            flexShrink: 0,
            '& .MuiButton-root': {
              minWidth: { xs: '100%', sm: 'auto' }
            }
          }}>
            <Button 
              onClick={handleSwapCancel} 
              disabled={isSwapping}
              sx={{ order: { xs: 2, sm: 1 } }}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSwapConfirm} 
              color="primary" 
              variant="contained"
              disabled={isSwapping}
              startIcon={isSwapping ? <CircularProgress size={20} color="inherit" /> : undefined}
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              {isSwapping ? 'กำลังสลับ...' : 'ยืนยันการสลับ'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}