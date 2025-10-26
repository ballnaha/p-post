'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Autocomplete,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Fade,
  Card,
  CardContent,
  CardActions,
  Divider,
  alpha,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  AssignmentTurnedIn as VacantIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
  DragIndicator as DragIndicatorIcon,
  ViewComfy as ViewComfyIcon,
  ViewCompact as ViewCompactIcon,
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
  defaultDropAnimationSideEffects,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
  InfoOutlined as InfoOutlinedIcon,
  Business as UnitIcon,
  School as EducationIcon,
  Work as ServiceIcon,
  AssignmentInd as PositionIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';
import DataTablePagination from '@/components/DataTablePagination';
import { EmptyState } from '@/app/components/EmptyState';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

interface VacantPositionData {
  id: string;
  year: number;
  notes?: string;
  displayOrder?: number; // ลำดับการแสดงผล
  nominator?: string; // ผู้สนับสนุน
  requestedPosition?: string; // ตำแหน่งที่ขอ (deprecated - ใช้ requestedPosCode แทน)
  requestedPositionId?: number; // รหัสตำแหน่งที่ขอ (FK)
  requestedPosCode?: {
    id: number;
    name: string;
  };
  originalPersonnelId?: string;
  noId?: number;
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
  age?: string;
  education?: string;
  seniority?: string;
  actingAs?: string;
  birthDate?: string;
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  trainingLocation?: string;
  trainingCourse?: string;
  createdAt: string;
  posCodeMaster?: {
    id: number;
    name: string;
  };
}

// SortableCard Component for drag and drop
interface SortableCardProps {
  item: VacantPositionData;
  displayOrder: number;
  compact?: boolean;
  onViewDetail: (item: VacantPositionData) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, item: VacantPositionData) => void;
  draggedItem?: VacantPositionData | null; // เพิ่ม prop เพื่อรู้ว่า card ไหนกำลังลาก
}

function SortableCard({ item, displayOrder, compact, onViewDetail, onMenuOpen, draggedItem }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id: item.id,
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
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        // ปิด transition จาก sx เพื่อไม่ให้ card อื่นขยับ
        transition: (isDragging || isOver) ? 'all 0.2s ease-out' : 'none',
        border: isOver ? 2 : 1,
        borderStyle: isOver ? 'dashed' : 'solid',
        borderColor: isOver 
          ? 'primary.main' 
          : (isDragging ? 'primary.main' : 'success.main'),
        backgroundColor: isOver 
          ? (theme) => alpha(theme.palette.primary.main, 0.08) 
          : 'background.paper',
        boxShadow: isDragging 
          ? '0 12px 40px rgba(0,0,0,0.15)' 
          : (isOver ? '0 4px 20px rgba(25, 118, 210, 0.2)' : 1),
        zIndex: isDragging ? 1000 : (isOver ? 100 : 1),
        '&:hover': {
          boxShadow: !isDragging && !isOver 
            ? (theme) => `0 12px 24px ${alpha(theme.palette.success.main, 0.15)}` 
            : undefined,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: compact ? 1 : 2 }}>
        {/* Drag Handle */}
        <Box 
          {...attributes}
          {...listeners}
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: compact ? 0.5 : 1, 
            opacity: 0.5,
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing',
            },
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: compact ? 16 : 20, color: 'text.secondary' }} />
        </Box>

        {compact ? (
          // Compact View
          <>
            {/* ลำดับที่ และชื่อ */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  label={`#${displayOrder + 1}`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.7rem', height: 20 }}
                />
                <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
                  {item.rank ? `${item.rank} ${item.fullName || ''}` : (item.fullName || 'ว่าง')}
                </Typography>
              </Box>
              
              {/* ตำแหน่ง */}
              <Typography variant="caption" color="primary.main" fontWeight={500}>
                {item.position || 'ไม่ระบุตำแหน่ง'}
              </Typography>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {/* ตำแหน่งที่ขอ */}
            <Typography variant="caption" color="text.secondary">
              ตำแหน่งที่ขอ:
            </Typography>
            <Typography variant="body2" color="secondary.main" fontWeight={600} sx={{ mb: 0.5 }}>
              {item.requestedPosCode 
                ? `${item.requestedPosCode.id} - ${item.requestedPosCode.name}` 
                : (item.requestedPosition || '-')}
            </Typography>

            {/* ผู้สนับสนุน */}
            {item.nominator && (
              <Typography variant="caption" color="text.secondary">
                ผู้สนับสนุน: <strong>{item.nominator}</strong>
              </Typography>
            )}
          </>
        ) : (
          // Full View
          <>
        {/* ลำดับที่, รหัสตำแหน่ง และ Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`ลำดับที่ ${displayOrder + 1}`}
              color="primary"
              size="small"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
            {item.posCodeMaster && (
              <Chip 
                label={`${item.posCodeMaster.id} - ${item.posCodeMaster.name}`} 
                size="small" 
                color="primary"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
              />
            )}
          </Box>
          <Chip
            label="ยื่นขอตำแหน่ง"
            color="success"
            size="small"
            sx={{ fontWeight: 500, fontSize: '0.75rem' }}
          />
        </Box>

        {/* ยศ ชื่อ-สกุล */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <PersonIcon sx={{ fontSize: 20, color: 'primary.main', mt: 0.3 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.125rem',
              lineHeight: 1.4,
              color: 'text.primary',
              flex: 1,
            }}
          >
            {item.rank ? `${item.rank} ${item.fullName || ''}` : (item.fullName || 'ว่าง')}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* ตำแหน่ง */}
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
            {item.position || 'ไม่ระบุตำแหน่ง'}
          </Typography>
        </Box>

        {/* เลขตำแหน่ง */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <BadgeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            เลขตำแหน่ง: {item.positionNumber || '-'}
          </Typography>
        </Box>

        {/* คุณวุฒิ / อายุ / จำนวนปี / นรต. */}
        {(item.education || item.age || item.yearsOfService || item.trainingCourse) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
            {/* คุณวุฒิ */}
            {item.education && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EducationIcon sx={{ fontSize: 16, color: 'info.main' }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    lineHeight: 1.6,
                  }}
                >
                  {item.education}
                </Typography>
              </Box>
            )}

            {/* อายุ / จำนวนปี / นรต. */}
            {(item.age || item.yearsOfService || item.trainingCourse) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {item.age && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ServiceIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        lineHeight: 1.6,
                      }}
                    >
                      อายุ {item.age}
                    </Typography>
                  </Box>
                )}
                {item.yearsOfService && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ServiceIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        lineHeight: 1.6,
                      }}
                    >
                      จำนวนปี {item.yearsOfService}
                    </Typography>
                  </Box>
                )}
                {item.trainingCourse && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EducationIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        lineHeight: 1.6,
                      }}
                    >
                      นรต.{item.trainingCourse}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* ทำหน้าที่ และ หน่วย */}
        {(item.actingAs || item.unit) && (
          <Box sx={{ mb: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {item.actingAs && (
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: item.unit ? 0.5 : 0 }}>
                ทำหน้าที่: {item.actingAs}
              </Typography>
            )}
            {item.unit && (
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                หน่วย: {item.unit}
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ mb: 1.5 }} />

        {/* ตำแหน่งที่ขอ */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            ตำแหน่งที่ขอ
          </Typography>
          <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600, mt: 0.5 }}>
            {item.requestedPosCode 
              ? `${item.requestedPosCode.id} - ${item.requestedPosCode.name}` 
              : (item.requestedPosition || '-')}
          </Typography>
        </Box>

        {/* ผู้สนับสนุน */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            ผู้สนับสนุน
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, mt: 0.5 }}>
            {item.nominator || '-'}
          </Typography>
        </Box>

        {/* หมายเหตุ */}
        {item.notes && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.85rem' }}>
                <strong>หมายเหตุ:</strong> {item.notes}
              </Typography>
            </Alert>
          </Box>
        )}
          </>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Tooltip title="ดูรายละเอียด" leaveDelay={0} disableFocusListener>
          <IconButton
            size="small"
            onClick={() => onViewDetail(item)}
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
            onClick={(e) => onMenuOpen(e, item)}
            sx={{
              border: 1,
              borderColor: 'grey.400',
              borderRadius: 2,
              '&:hover': {
                bgcolor: 'grey.100',
              }
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

// Skeleton Loading Components
function CardSkeleton() {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, pb: 2 }}>
        {/* Drag Indicator */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Skeleton variant="circular" width={20} height={20} />
        </Box>

        {/* ลำดับที่ & Badge */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rectangular" width={120} height={24} sx={{ borderRadius: 3 }} />
          </Box>
          <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 3 }} />
        </Box>

        {/* ชื่อ */}
        <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={1} sx={{ mb: 1.5 }} />

        {/* ตำแหน่ง */}
        <Skeleton variant="text" width="90%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1.5 }} />

        {/* คุณวุฒิ */}
        <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="50%" height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="55%" height={20} sx={{ mb: 1.5 }} />

        {/* ข้อมูลเพิ่มเติม */}
        <Skeleton variant="rectangular" width="100%" height={1} sx={{ mb: 1.5 }} />
        <Skeleton variant="text" width="70%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={20} />
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Skeleton variant="circular" width={36} height={36} />
        <Skeleton variant="circular" width={36} height={36} />
      </CardActions>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <TableBody>
      {[...Array(5)].map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 3 }} /></TableCell>
          <TableCell><Skeleton variant="rectangular" width={150} height={24} sx={{ borderRadius: 3 }} /></TableCell>
          <TableCell><Skeleton variant="text" width="100%" /></TableCell>
          <TableCell><Skeleton variant="text" width="90%" /></TableCell>
          <TableCell><Skeleton variant="text" width="80%" /></TableCell>
          <TableCell><Skeleton variant="text" width="70%" /></TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </Box>
          </TableCell>
          <TableCell><Skeleton variant="text" width="85%" /></TableCell>
          <TableCell><Skeleton variant="text" width="75%" /></TableCell>
          <TableCell><Skeleton variant="text" width="90%" /></TableCell>
          <TableCell><Skeleton variant="text" width="80%" /></TableCell>
          <TableCell><Skeleton variant="text" width="70%" /></TableCell>
          <TableCell align="center">
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="circular" width={32} height={32} />
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function VacantPositionPage() {
  const toast = useToast();
  const [data, setData] = useState<VacantPositionData[]>([]);
  const [filteredData, setFilteredData] = useState<VacantPositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [compactView, setCompactView] = useState(false); // Compact card view
  const [activeId, setActiveId] = useState<string | null>(null); // Active drag item
  const [draggedItem, setDraggedItem] = useState<VacantPositionData | null>(null); // ข้อมูลของ item ที่ลาก
  
  // Filter states
  const [requestedPositionFilter, setRequestedPositionFilter] = useState<number | null>(null);
  const [requestedPositionOptions, setRequestedPositionOptions] = useState<Array<{ id: number; name: string }>>([]);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12); // Default for card view

  // Personnel detail modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<VacantPositionData | null>(null);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<VacantPositionData | null>(null);

  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    nominator: string;
    requestedPositionId: number | null;
    notes: string;
  }>({
    nominator: '',
    requestedPositionId: null,
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VacantPositionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Swap confirmation states
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [swapData, setSwapData] = useState<{
    activeItem: VacantPositionData | null;
    overItem: VacantPositionData | null;
  }>({ activeItem: null, overItem: null });
  const [isSwapping, setIsSwapping] = useState(false);

  // PosCode options for edit
  const [posCodes, setPosCodes] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetchAvailableYears();
    fetchPosCodes();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchData();
    }
  }, [selectedYear]);

  // Update filtered data and options when data changes
  useEffect(() => {
    if (!loading) {
      applyFilters();
      updateFilterOptions();
    }
  }, [data, requestedPositionFilter, loading]);

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

  const fetchAvailableYears = async () => {
    try {
      const years = getAvailableYears();
      setAvailableYears(years);
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchPosCodes = async () => {
    try {
      const response = await fetch('/api/police-personnel/pos-codes');
      const result = await response.json();
      if (result.success) {
        setPosCodes(result.data);
      }
    } catch (err) {
      console.error('Error fetching pos codes:', err);
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // หา item ที่กำลังลาก
    const item = data.find(d => d.id === event.active.id);
    setDraggedItem(item || null);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
    setDraggedItem(null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null); // Reset active item
    setDraggedItem(null); // Reset dragged item

    if (over && active.id !== over.id) {
      // Get items being swapped from data array (not filtered)
      const activeItem = data.find(item => item.id === active.id);
      const overItem = data.find(item => item.id === over.id);
      
      if (!activeItem || !overItem) {
        console.error('Items not found:', { active: active.id, over: over.id });
        return;
      }

      // เปิด dialog ยืนยัน
      setSwapData({ activeItem, overItem });
      setSwapConfirmOpen(true);
    }
  };

  // ยืนยันการสลับจาก Dialog
  const handleSwapConfirm = async () => {
    const { activeItem, overItem } = swapData;
    
    if (!activeItem || !overItem) return;

    setIsSwapping(true);

    try {
      // Get displayOrder - use actual value or current index in data array
      const activeDisplayOrder = activeItem.displayOrder !== null && activeItem.displayOrder !== undefined 
        ? activeItem.displayOrder 
        : data.findIndex(item => item.id === activeItem.id);
      
      const overDisplayOrder = overItem.displayOrder !== null && overItem.displayOrder !== undefined 
        ? overItem.displayOrder 
        : data.findIndex(item => item.id === overItem.id);

      // Debug log
      console.log('Swapping:', {
        active: { id: activeItem.id, oldOrder: activeDisplayOrder, newOrder: overDisplayOrder },
        over: { id: overItem.id, oldOrder: overDisplayOrder, newOrder: activeDisplayOrder }
      });

      // Check if orders are the same (shouldn't happen but just in case)
      if (activeDisplayOrder === overDisplayOrder) {
        console.warn('Display orders are the same, skipping update');
        setSwapConfirmOpen(false);
        return;
      }

      // Update in main data
      const newData = data.map(item => {
        if (item.id === activeItem.id) {
          return { ...item, displayOrder: overDisplayOrder };
        }
        if (item.id === overItem.id) {
          return { ...item, displayOrder: activeDisplayOrder };
        }
        return item;
      });

      // Sort by displayOrder
      const sortedData = newData.sort((a, b) => {
        if (a.displayOrder === null || a.displayOrder === undefined) return 1;
        if (b.displayOrder === null || b.displayOrder === undefined) return -1;
        return a.displayOrder - b.displayOrder;
      });

      setData(sortedData);

      // Update filtered data as well
      const newFilteredData = filteredData.map(item => {
        if (item.id === activeItem.id) {
          return { ...item, displayOrder: overDisplayOrder };
        }
        if (item.id === overItem.id) {
          return { ...item, displayOrder: activeDisplayOrder };
        }
        return item;
      }).sort((a, b) => {
        if (a.displayOrder === null || a.displayOrder === undefined) return 1;
        if (b.displayOrder === null || b.displayOrder === undefined) return -1;
        return a.displayOrder - b.displayOrder;
      });

      setFilteredData(newFilteredData);

      // Send only the two swapped items to API
      const updates = [
        { id: activeItem.id, displayOrder: overDisplayOrder },
        { id: overItem.id, displayOrder: activeDisplayOrder }
      ];

      console.log('Sending to API:', updates);

      const response = await fetch('/api/vacant-position/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) throw new Error('Failed to update order');
      
      toast.success('อัปเดตลำดับเรียบร้อย');
      setSwapConfirmOpen(false);
      
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตลำดับ');
      // Revert on error
      setFilteredData(filteredData);
      setData(data);
    } finally {
      setIsSwapping(false);
    }
  };

  // ยกเลิกการสลับ
  const handleSwapCancel = () => {
    setSwapConfirmOpen(false);
    setSwapData({ activeItem: null, overItem: null });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Clear data immediately when starting to load
      setData([]);
      setFilteredData([]);
      
      const response = await fetch(`/api/vacant-position?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      
      // Sort by displayOrder (null values go to the end)
      const sortedData = result.sort((a: VacantPositionData, b: VacantPositionData) => {
        if (a.displayOrder === null || a.displayOrder === undefined) return 1;
        if (b.displayOrder === null || b.displayOrder === undefined) return -1;
        return a.displayOrder - b.displayOrder;
      });
      
      setData(sortedData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const updateFilterOptions = () => {
    // Extract unique requested positions (from requestedPosCode)
    const requestedPositions = data
      .filter(item => item.requestedPosCode)
      .map(item => item.requestedPosCode!)
      .filter((value, index, self) => 
        index === self.findIndex((t) => t.id === value.id)
      )
      .sort((a, b) => a.id - b.id);
    
    setRequestedPositionOptions(requestedPositions);
  };

  const applyFilters = () => {
    let filtered = [...data];

    if (requestedPositionFilter) {
      filtered = filtered.filter(item => item.requestedPositionId === requestedPositionFilter);
    }

    setFilteredData(filtered);
    setPage(0); // Reset to first page when filters change
  };

  const handleResetFilters = () => {
    setRequestedPositionFilter(null);
    setPage(0);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'table' | 'card' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
      setPage(0);
      // Set appropriate rowsPerPage for each view
      if (newMode === 'table') {
        setRowsPerPage(10);
      } else {
        setRowsPerPage(12);
      }
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Get paginated data
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    
    // ถ้าเป็นรูปแบบวันที่ไทยอยู่แล้ว (DD/MM/YYYY) ให้ return เลย
    if (typeof dateString === 'string' && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
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
      return dateString;
    }
    
    return dateString;
  };

  const handleDelete = async (item: VacantPositionData) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/vacant-position?nationalId=${itemToDelete.nationalId}&year=${itemToDelete.year}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      toast.success('ลบออกจากรายการยื่นขอตำแหน่งแล้ว');
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: VacantPositionData) => {
    setAnchorEl(event.currentTarget);
    setMenuItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuItem(null);
  };

  const handleEdit = (item: VacantPositionData) => {
    setSelectedPersonnel(item);
    setEditFormData({
      nominator: item.nominator || '',
      requestedPositionId: item.requestedPositionId || null,
      notes: item.notes || '',
    });
    setEditModalOpen(true);
    handleMenuClose();
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setSelectedPersonnel(null);
    setEditFormData({
      nominator: '',
      requestedPositionId: null,
      notes: '',
    });
  };

  const handleEditSave = async () => {
    if (!selectedPersonnel) return;

    if (!editFormData.requestedPositionId) {
      toast.error('กรุณาเลือกตำแหน่งที่ขอ');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/vacant-position/${selectedPersonnel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const result = await response.json();

      if (result.success || response.ok) {
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

  const handleViewDetail = (item: VacantPositionData) => {
    setSelectedPersonnel(item);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                  รายการยื่นขอตำแหน่ง
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  จัดการและตรวจสอบรายการยื่นขอตำแหน่งของบุคลากร
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* View Mode Toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
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

              {/* Compact View Toggle - Show only in card view */}
              {viewMode === 'card' && (
                <Tooltip title={compactView ? "มุมมองเต็ม" : "มุมมองย่อ"}>
                  <IconButton
                    size="small"
                    onClick={() => setCompactView(!compactView)}
                    color={compactView ? "primary" : "default"}
                    sx={{ ml: 1 }}
                  >
                    {compactView ? <ViewComfyIcon /> : <ViewCompactIcon />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, 
            gap: 2,
            alignItems: 'start'
          }}>
            <FormControl size="small">
              <InputLabel id="year-filter-label">ปีที่ยื่นขอตำแหน่ง</InputLabel>
              <Select
                labelId="year-filter-label"
                id="year-filter"
                value={selectedYear}
                label="ปีที่ยื่นขอตำแหน่ง"
                onChange={handleYearChange}
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Autocomplete
                fullWidth
                options={requestedPositionOptions}
                value={requestedPositionOptions.find(opt => opt.id === requestedPositionFilter) || null}
                onChange={(event, newValue) => setRequestedPositionFilter(newValue?.id || null)}
                getOptionLabel={(option) => `${option.id} - ${option.name}`}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="ตำแหน่งที่ขอ" 
                    placeholder="เลือกตำแหน่งที่ขอ..."
                    size="small"
                  />
                )}
                noOptionsText="ไม่พบข้อมูล"
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
              {requestedPositionFilter && (
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={handleResetFilters}
                  startIcon={<RefreshIcon />}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  ล้างตัวกรอง
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Content */}
        {loading ? (
          <>
            {/* Skeleton Loading */}
            {viewMode === 'table' ? (
              <Paper elevation={2}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.main' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 600, width: 80 }}>ลำดับที่</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>รหัสตำแหน่ง</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ยศ-ชื่อ</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ตำแหน่ง</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>เลขตำแหน่ง</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>คุณวุฒิ</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>อายุ/ปีรับราชการ/นรต.</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ทำหน้าที่</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>หน่วย</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ผู้สนับสนุน</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>ตำแหน่งที่ขอ</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>หมายเหตุ</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600, width: 120 }} align="center">จัดการ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableSkeleton />
                  </Table>
                </TableContainer>
              </Paper>
            ) : (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { 
                  xs: '1fr', 
                  sm: 'repeat(2, 1fr)', 
                  md: 'repeat(3, 1fr)', 
                  lg: 'repeat(4, 1fr)' 
                }, 
                gap: 3 
              }}>
                {[...Array(12)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </Box>
            )}
          </>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <Fade in={!loading} timeout={800}>
                <Paper sx={{ borderRadius: 2 }}>
                  <EmptyState
                    icon={VacantIcon}
                    title={requestedPositionFilter ? 'ไม่พบข้อมูลที่ตรงกับการกรอง' : 'ไม่พบรายการยื่นขอตำแหน่ง'}
                    description={requestedPositionFilter 
                      ? 'ลองปรับเปลี่ยนตัวกรองหรือล้างตัวกรอง' 
                      : `ยังไม่มีรายการยื่นขอตำแหน่งในปี ${selectedYear}`
                    }
                  />
                </Paper>
              </Fade>
            ) : (
              <>
                {/* Table View */}
                {viewMode === 'table' ? (
                  <Paper elevation={2}>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'primary.main' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 600, width: 80 }}>ลำดับที่</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>รหัสตำแหน่ง</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ยศ-ชื่อ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ตำแหน่ง</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>เลขตำแหน่ง</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>คุณวุฒิ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>อายุ/ปีรับราชการ/นรต.</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ทำหน้าที่</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>หน่วย</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ผู้สนับสนุน</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ตำแหน่งที่ขอ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>หมายเหตุ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600, width: 120 }} align="center">จัดการ</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedData.map((item, index) => (
                            <TableRow 
                              key={item.id}
                              hover
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: 'action.hover'
                                }
                              }}
                            >
                              <TableCell>
                                <Chip
                                  label={(item.displayOrder ?? index) + 1}
                                  color="primary"
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell>
                                {item.posCodeMaster ? (
                                  <Chip 
                                    label={`${item.posCodeMaster.id} - ${item.posCodeMaster.name}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary">-</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {item.rank ? `${item.rank} ${item.fullName || ''}` : (item.fullName || 'ว่าง')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {item.position || 'ไม่ระบุตำแหน่ง'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.positionNumber || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.education || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  {item.age && (
                                    <Typography variant="caption" color="text.secondary">
                                      อายุ {item.age}
                                    </Typography>
                                  )}
                                  {item.yearsOfService && (
                                    <Typography variant="caption" color="text.secondary">
                                      {item.yearsOfService}
                                    </Typography>
                                  )}
                                  {item.trainingCourse && (
                                    <Typography variant="caption" color="text.secondary">
                                      นรต.{item.trainingCourse}
                                    </Typography>
                                  )}
                                  {!item.age && !item.yearsOfService && !item.trainingCourse && (
                                    <Typography variant="body2" color="text.secondary">-</Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.actingAs || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.unit || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                                  {item.nominator || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 500 }}>
                                  {item.requestedPosCode 
                                    ? `${item.requestedPosCode.id} - ${item.requestedPosCode.name}` 
                                    : (item.requestedPosition || '-')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ 
                                    maxWidth: 150,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {item.notes || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                  <Tooltip title="ดูรายละเอียด">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleViewDetail(item)}
                                    >
                                      <InfoOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="เมนู">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleMenuOpen(e, item)}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Pagination for Table View */}
                    {filteredData.length > 0 && (
                      <DataTablePagination
                        count={filteredData.length}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50, 100]}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        variant="minimal"
                      />
                    )}
                  </Paper>
                ) : (
                  /* Card View with Drag and Drop */
                  <>
                    {/* Info Alert for Drag and Drop */}
                    <Alert 
                      severity="info" 
                      icon={<DragIndicatorIcon />}
                      sx={{ mb: 3 }}
                    >
                      <Typography variant="body2">
                        <strong>เคล็ดลับ:</strong> คลิกและลากการ์ดเพื่อจัดเรียงลำดับความสำคัญได้ (การลากจะสลับลำดับของทั้งสองการ์ด)
                      </Typography>
                    </Alert>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragCancel={handleDragCancel}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={paginatedData.map(item => item.id)}
                        strategy={rectSortingStrategy}
                      >
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: { 
                            xs: '1fr', 
                            sm: 'repeat(2, 1fr)', 
                            md: 'repeat(3, 1fr)', 
                            lg: 'repeat(4, 1fr)' 
                          }, 
                          gap: 3 
                        }}>
                          {paginatedData.map((item, index) => (
                            <SortableCard 
                              key={item.id}
                              item={item}
                              displayOrder={item.displayOrder ?? index}
                              compact={compactView}
                              onViewDetail={handleViewDetail}
                              onMenuOpen={handleMenuOpen}
                              draggedItem={draggedItem}
                            />
                          ))}
                        </Box>
                      </SortableContext>
                      <DragOverlay
                        dropAnimation={{
                          sideEffects: defaultDropAnimationSideEffects({
                            styles: {
                              active: {
                                opacity: '0.5',
                              },
                            },
                          }),
                        }}
                      >
                        {activeId ? (
                          <Card
                            sx={{
                              cursor: 'grabbing',
                              transform: 'rotate(5deg)',
                              boxShadow: 8,
                              opacity: 0.9,
                            }}
                          >
                            <CardContent>
                              <Typography variant="h6" color="primary">
                                กำลังย้าย...
                              </Typography>
                            </CardContent>
                          </Card>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  
                    {/* Pagination for Card View */}
                    {filteredData.length > 0 && (
                      <Paper sx={{ mt: 3 }}>
                        <DataTablePagination
                          count={filteredData.length}
                          page={page}
                          rowsPerPage={rowsPerPage}
                          rowsPerPageOptions={[8, 12, 16, 24, 48]}
                          onPageChange={handlePageChange}
                          onRowsPerPageChange={handleRowsPerPageChange}
                          variant="minimal"
                        />
                      </Paper>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Personnel Detail Modal */}
        <PersonnelDetailModal 
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          personnel={selectedPersonnel}
          loading={loadingPersonnel}
          onClearData={() => setSelectedPersonnel(null)}
        />

        {/* More Menu */}
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
          <MenuItem onClick={() => menuItem && handleEdit(menuItem)}>
            <ListItemIcon>
              <EditIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>แก้ไข</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => menuItem && handleDelete(menuItem)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>ลบ</ListItemText>
          </MenuItem>
        </Menu>

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon color="action" />
              <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                แก้ไขข้อมูลยื่นขอตำแหน่ง
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 2, mt: 2 }}>
            <Stack spacing={2.5}>
              {/* แสดงข้อมูลบุคลากร */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  บุคลากร
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {selectedPersonnel?.rank} {selectedPersonnel?.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ตำแหน่ง: {selectedPersonnel?.position || '-'}
                </Typography>
              </Box>

              
              {/* ตำแหน่งที่ขอ */}
              <FormControl fullWidth required>
                <InputLabel>ตำแหน่งที่ขอ</InputLabel>
                <Select
                  value={editFormData.requestedPositionId || ''}
                  label="ตำแหน่งที่ขอ"
                  onChange={(e) => setEditFormData({ ...editFormData, requestedPositionId: Number(e.target.value) })}
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
                value={editFormData.nominator}
                onChange={(e) => setEditFormData({ ...editFormData, nominator: e.target.value })}
              />


              {/* หมายเหตุ */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="หมายเหตุ (ถ้ามี)"
                placeholder="เช่น เหตุผล, ข้อมูลเพิ่มเติม..."
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button 
              onClick={handleEditClose} 
              variant="outlined" 
              size="medium"
              disabled={isSaving}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleEditSave} 
              variant="contained" 
              size="medium"
              sx={{ minWidth: 120 }}
              disabled={isSaving || !editFormData.requestedPositionId}
              startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <EditIcon />}
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Swap Confirmation Dialog */}
        <Dialog
          open={swapConfirmOpen}
          onClose={() => !isSwapping && handleSwapCancel()}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>ยืนยันการสลับลำดับความสำคัญ</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 3 }}>
              คุณต้องการสลับลำดับความสำคัญระหว่าง:
            </Typography>
            
            <Stack spacing={2}>
              <Paper sx={{ p: 2, bgcolor: 'primary.50', border: 1, borderColor: 'primary.main' }}>
                <Typography variant="subtitle2" color="primary.main" gutterBottom>
                  ลำดับที่ {swapData.activeItem?.displayOrder !== null && swapData.activeItem?.displayOrder !== undefined 
                    ? swapData.activeItem.displayOrder + 1 
                    : '-'}
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {swapData.activeItem?.rank} {swapData.activeItem?.fullName || 'ไม่ระบุชื่อ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ตำแหน่งที่ขอ: {swapData.activeItem?.requestedPosCode?.name || 'ไม่ระบุ'}
                </Typography>
              </Paper>

              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h4" color="primary.main">⇅</Typography>
              </Box>

              <Paper sx={{ p: 2, bgcolor: 'secondary.50', border: 1, borderColor: 'secondary.main' }}>
                <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                  ลำดับที่ {swapData.overItem?.displayOrder !== null && swapData.overItem?.displayOrder !== undefined 
                    ? swapData.overItem.displayOrder + 1 
                    : '-'}
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {swapData.overItem?.rank} {swapData.overItem?.fullName || 'ไม่ระบุชื่อ'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ตำแหน่งที่ขอ: {swapData.overItem?.requestedPosCode?.name || 'ไม่ระบุ'}
                </Typography>
              </Paper>
            </Stack>

            <Alert severity="info" sx={{ mt: 3 }}>
              การสลับลำดับจะส่งผลต่อความสำคัญในการพิจารณาตำแหน่ง
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleSwapCancel} disabled={isSwapping}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSwapConfirm} 
              color="primary" 
              variant="contained"
              disabled={isSwapping}
              startIcon={isSwapping ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isSwapping ? 'กำลังสลับ...' : 'ยืนยันการสลับ'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => !isDeleting && handleDeleteCancel()}
        >
          <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              คุณต้องการลบรายการยื่นขอตำแหน่ง{' '}
              {itemToDelete?.rank && itemToDelete?.fullName && (
                <>
                  ของ <strong>{itemToDelete.rank} {itemToDelete.fullName}</strong>
                </>
              )}{' '}
              ใช่หรือไม่?
            </Typography>
            <Typography variant="body2" color="error">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={isDeleting}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={isDeleting}
              startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isDeleting ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
