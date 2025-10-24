'use client';
import { useState, useEffect } from 'react';
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
  EventAvailable as VacantIcon,
  ChangeHistory as ChangeHistoryIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useTheme, useMediaQuery } from '@mui/material';
import DataTablePagination from '@/components/DataTablePagination';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

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
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export default function PolicePersonnelPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
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
  const [positionTypeFilter, setPositionTypeFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [swapFilter, setSwapFilter] = useState<'all' | 'in-swap' | 'in-threeway' | 'in-vacant'>('all');
  const [posCodeFilter, setPosCodeFilter] = useState<string>('all');
  const [units, setUnits] = useState<string[]>([]);
  const [ranks, setRanks] = useState<string[]>([]);
  const [positionTypes, setPositionTypes] = useState<string[]>([]);
  const [posCodes, setPosCodes] = useState<Array<{ id: number; name: string }>>([]);
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

  // Vacant Position states
  const [vacantListData, setVacantListData] = useState<Set<string>>(new Set());

  // Loading states สำหรับ icon actions (เก็บ nationalId ของคนที่กำลัง process)
  const [loadingSwap, setLoadingSwap] = useState<Set<string>>(new Set());
  const [loadingThreeWay, setLoadingThreeWay] = useState<Set<string>>(new Set());
  const [loadingVacant, setLoadingVacant] = useState<Set<string>>(new Set());

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPersonnel, setMenuPersonnel] = useState<PolicePersonnel | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, personnel: PolicePersonnel) => {
    setAnchorEl(event.currentTarget);
    setMenuPersonnel(personnel);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuPersonnel(null);
  };

  // ดึงรายการหน่วยและยศทั้งหมด
  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/police-personnel/units');
      const result = await response.json();
      if (result.success) {
        setUnits(result.data);
      }
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  const fetchRanks = async () => {
    try {
      const response = await fetch('/api/police-personnel/ranks');
      const result = await response.json();
      if (result.success) {
        setRanks(result.data);
      }
    } catch (err) {
      console.error('Error fetching ranks:', err);
    }
  };

  const fetchPositionTypes = async () => {
    try {
      const response = await fetch('/api/police-personnel/positions');
      const result = await response.json();
      if (result.success) {
        setPositionTypes(result.data);
      }
    } catch (err) {
      console.error('Error fetching position types:', err);
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

  // ดึงรายการ Swap List สำหรับปีปัจจุบัน (เฉพาะ two-way)
  const fetchSwapListForCurrentYear = async () => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/swap-list?year=${currentYear}&swapType=two-way`);
      const result = await response.json();
      if (result.success) {
        // ใช้ nationalId แทน originalPersonnelId เพื่อให้ทำงานได้แม้ import ข้อมูลใหม่
        const nationalIds = new Set<string>(
          result.data
            .map((item: any) => item.nationalId)
            .filter((id: string) => id) // กรองเฉพาะที่มีค่า
        );
        setSwapListData(nationalIds);
      }
    } catch (err) {
      console.error('Error fetching swap list:', err);
    }
  };

  // ดึงรายการ Three Way Swap สำหรับปีปัจจุบัน
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

  // ดึงรายการ Vacant Position สำหรับปีปัจจุบัน
  const fetchVacantListForCurrentYear = async () => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/vacant-position?year=${currentYear}`);
      const result = await response.json();
      
      if (Array.isArray(result)) {
        // ใช้ nationalId แทน originalPersonnelId
        const nationalIds = new Set<string>(
          result
            .map((item: any) => item.nationalId)
            .filter((id: string) => id) // กรองเฉพาะที่มีค่า
        );
        setVacantListData(nationalIds);
      }
    } catch (err) {
      console.error('Error fetching vacant position list:', err);
    }
  };
  const fetchNameOptions = async (query: string) => {
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
  };

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
  }, [nameInputValue]);

  useEffect(() => {
    fetchUnits();
    fetchRanks();
    fetchPositionTypes();
    fetchPosCodes();
    fetchSwapListForCurrentYear();
    fetchThreeWayListForCurrentYear();
    fetchVacantListForCurrentYear();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const searchParam = nameSearch || search || '';
      const response = await fetch(
        `/api/police-personnel?page=${page + 1}&limit=${rowsPerPage}&search=${encodeURIComponent(searchParam)}&position=${positionFilter}&positionType=${positionTypeFilter}&unit=${unitFilter}&rank=${rankFilter}&swapFilter=${swapFilter}&posCode=${posCodeFilter}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTotal(result.pagination.total);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, positionFilter, positionTypeFilter, unitFilter, rankFilter, nameSearch, swapFilter, posCodeFilter]);

  const handleSearch = () => {
    setPage(0);
    fetchData();
  };

  const handleReset = () => {
    setSearch('');
    setNameSearch(null);
    setNameInputValue('');
    setNameOptions([]);
    setPositionFilter('all');
    setPositionTypeFilter('all');
    setUnitFilter('all');
    setRankFilter('all');
    setSwapFilter('all');
    setPosCodeFilter('all');
    setPage(0);
  };

  const handleSwapFilterChange = (value: 'all' | 'in-swap' | 'in-threeway' | 'in-vacant') => {
    setSwapFilter(value);
    setPage(0); // Reset to first page when filter changes
  };

  const handlePositionFilterChange = (value: 'all' | 'occupied' | 'vacant' | 'reserved') => {
    setPositionFilter(value);
    setPage(0);
  };

  const handlePositionTypeFilterChange = (value: string) => {
    setPositionTypeFilter(value);
    setPage(0);
  };

  const handleRankFilterChange = (value: string) => {
    setRankFilter(value);
    setPage(0);
  };

  const handleUnitFilterChange = (value: string) => {
    setUnitFilter(value);
    setPage(0);
  };

  const handlePosCodeFilterChange = (value: string) => {
    setPosCodeFilter(value);
    setPage(0);
  };

  const handleViewDetail = (personnel: PolicePersonnel) => {
    setSelectedPersonnel(personnel);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
  };

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

  // Handler สำหรับ Add to Swap
  const handleAddToSwap = (personnel: PolicePersonnel) => {
    // ตรวจสอบว่าอยู่ในรายการอื่นแล้วหรือไม่
    if (personnel.nationalId && threeWayListData.has(personnel.nationalId)) {
      toast.error('บุคคลนี้อยู่ในรายการสามเส้าแล้ว กรุณาลบออกจากรายการสามเส้าก่อน');
      return;
    }
    if (personnel.nationalId && vacantListData.has(personnel.nationalId)) {
      toast.error('บุคคลนี้อยู่ในรายการตำแหน่งว่างแล้ว กรุณาลบออกจากรายการตำแหน่งว่างก่อน');
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
        
        // อัพเดท swap list และ reset page ถ้ากำลัง filter swap list อยู่
        fetchSwapListForCurrentYear();
        if (swapFilter === 'in-swap') {
          setPage(0); // Reset to first page to see the newly added person
        }
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
      toast.error('บุคคลนี้อยู่ในรายการตำแหน่งว่างแล้ว กรุณาลบออกจากรายการตำแหน่งว่างก่อน');
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
        if (swapFilter === 'in-threeway') {
          setPage(0); // Reset to first page to see the newly added person
        }
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

      if (result.success) {
        toast.success('ลบออกจากรายการสามเส้าแล้ว');
        
        // อัพเดท state ทันที
        setThreeWayListData(prev => {
          const newSet = new Set(prev);
          newSet.delete(nationalId);
          return newSet;
        });
        
        fetchThreeWayListForCurrentYear();
        if (swapFilter === 'in-threeway') {
          setPage(0); // Reset to first page for consistent view
        }
      } else {
        toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (error) {
      console.error('Remove from three way swap error:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
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
      const response = await fetch('/api/swap-list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nationalId: nationalId,  // ใช้ nationalId แทน originalPersonnelId
          year: currentYear
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('ลบออกจากรายการสลับตำแหน่งสำเร็จ');
        
        // อัพเดท state ทันที
        setSwapListData(prev => {
          const newSet = new Set(prev);
          newSet.delete(nationalId);
          return newSet;
        });
        
        fetchSwapListForCurrentYear();
        // ถ้ากำลัง filter swap list และลบคนที่อยู่ในหน้าปัจจุบันออก อาจต้อง reset page
        if (swapFilter === 'in-swap') {
          setPage(0); // Reset to first page for consistent view
        }
      } else {
        // แสดง error message ที่ละเอียดขึ้น
        const errorMessage = result.detail 
          ? `${result.error}\n${result.detail}` 
          : result.error || 'เกิดข้อผิดพลาดในการลบข้อมูล';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Remove from swap error:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
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
    if (personnel.nationalId && swapListData.has(personnel.nationalId)) {
      toast.error('บุคคลนี้อยู่ในรายการสลับตำแหน่งแล้ว กรุณาลบออกจากรายการสลับตำแหน่งก่อน');
      return;
    }
    if (personnel.nationalId && threeWayListData.has(personnel.nationalId)) {
      toast.error('บุคคลนี้อยู่ในรายการสามเส้าแล้ว กรุณาลบออกจากรายการสามเส้าก่อน');
      return;
    }

    // เพิ่ม loading state
    if (personnel.nationalId) {
      setLoadingVacant(prev => new Set(prev).add(personnel.nationalId!));
    }

    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch('/api/vacant-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...personnel,
          originalPersonnelId: personnel.id,
          year: currentYear,
          notes: null
        }),
      });

      if (response.ok) {
        toast.success('เพิ่มเข้ารายการตำแหน่งว่างสำเร็จ');
        
        // อัพเดท state ทันที (ใช้ nationalId)
        if (personnel.nationalId) {
          setVacantListData(prev => new Set(prev).add(personnel.nationalId!));
        }
        
        fetchVacantListForCurrentYear();
        if (swapFilter === 'in-vacant') {
          setPage(0); // Reset to first page to see the newly added person
        }
      } else {
        const result = await response.json();
        toast.error(result.error || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
      }
    } catch (error) {
      console.error('Add to vacant position error:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
    } finally {
      // ลบ loading state
      if (personnel.nationalId) {
        setLoadingVacant(prev => {
          const newSet = new Set(prev);
          newSet.delete(personnel.nationalId!);
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
        toast.success('ลบออกจากรายการตำแหน่งว่างแล้ว');
        
        // อัพเดท state ทันที
        setVacantListData(prev => {
          const newSet = new Set(prev);
          newSet.delete(nationalId);
          return newSet;
        });
        
        fetchVacantListForCurrentYear();
        if (swapFilter === 'in-vacant') {
          setPage(0); // Reset to first page for consistent view
        }
      } else {
        toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
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
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            ไม่พบข้อมูล
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => router.push('/police-personnel/import')}
          >
            นำเข้าข้อมูล
          </Button>
        </Box>
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
                  {person.rank ? (
                    <Chip
                      label="มีผู้ดำรง"
                      color="success"
                      size="small"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    />
                  ) : (
                    <Chip
                      label="ว่าง"
                      color="default"
                      size="small"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    />
                  )}
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
                      'ตำแหน่งว่าง'
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
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {/* Chip แสดงสถานะ Swap List */}
                {person.rank && person.nationalId && swapListData.has(person.nationalId) && (
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
                {/* Chip แสดงสถานะ Vacant Position */}
                {person.rank && person.nationalId && vacantListData.has(person.nationalId) && (
                  <Chip 
                    label="อยู่ในตำแหน่งว่าง" 
                    size="small" 
                    color="success"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
                
                {/* Swap, สามเส้า, ตำแหน่งว่าง (ซ้าย) | Menu (ขวา) */}
                <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* ปุ่มฝั่งซ้าย: Swap, สามเส้า, ตำแหน่งว่าง */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!person.rank ? (
                      // ถ้าเป็นตำแหน่งว่าง แสดงแค่ปุ่มตำแหน่งว่างอย่างเดียว
                      <Tooltip title="ตำแหน่งว่าง">
                        <IconButton
                          size="medium"
                          color="success"
                          sx={{
                            border: 2,
                            borderColor: 'success.main',
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                          }}
                        >
                          <VacantIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      // ถ้ามีคน แสดง Swap, สามเส้า, ตำแหน่งว่าง
                      <>
                        <Tooltip title={person.nationalId && swapListData.has(person.nationalId) ? "ลบออกจาก Swap List" : "เพิ่มเข้า Swap List"}>
                          <IconButton
                            size="medium"
                            color="info"
                            onClick={() => person.nationalId && swapListData.has(person.nationalId) ? handleRemoveFromSwap(person.nationalId) : handleAddToSwap(person)}
                            disabled={person.nationalId ? loadingSwap.has(person.nationalId) : false}
                            sx={{
                              borderRadius: '50%',
                              width: 32,
                              height: 32,
                              ...(person.nationalId && swapListData.has(person.nationalId) ? {
                                // Contained style (เต็มสี)
                                bgcolor: 'info.main',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'info.dark',
                                },
                              } : {
                                // Outlined style (ขอบเส้น)
                                border: 2,
                                borderColor: 'info.main',
                              }),
                            }}
                          >
                            {person.nationalId && loadingSwap.has(person.nationalId) ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <SwapHorizIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={person.nationalId && threeWayListData.has(person.nationalId) ? "ลบออกจากสามเส้า" : "เพิ่มเข้าสามเส้า"}>
                          <IconButton
                            size="medium"
                            color="warning"
                            onClick={() => person.nationalId && threeWayListData.has(person.nationalId) ? handleRemoveFromThreeWay(person.nationalId) : handleAddToThreeWay(person)}
                            disabled={person.nationalId ? loadingThreeWay.has(person.nationalId) : false}
                            sx={{
                              borderRadius: '50%',
                              width: 32,
                              height: 32,
                              ...(person.nationalId && threeWayListData.has(person.nationalId) ? {
                                // Contained style (เต็มสี)
                                bgcolor: 'warning.main',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'warning.dark',
                                },
                              } : {
                                // Outlined style (ขอบเส้น)
                                border: 2,
                                borderColor: 'warning.main',
                              }),
                            }}
                          >
                            {person.nationalId && loadingThreeWay.has(person.nationalId) ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <ChangeHistoryIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={person.nationalId && vacantListData.has(person.nationalId) ? "ลบออกจากตำแหน่งว่าง" : "เพิ่มเข้าตำแหน่งว่าง"}>
                          <IconButton
                            size="medium"
                            color="success"
                            onClick={() => person.nationalId && vacantListData.has(person.nationalId) ? handleRemoveFromVacant(person.nationalId) : handleAddToVacant(person)}
                            disabled={person.nationalId ? loadingVacant.has(person.nationalId) : false}
                            sx={{
                              borderRadius: '50%',
                              width: 32,
                              height: 32,
                              ...(person.nationalId && vacantListData.has(person.nationalId) ? {
                                // Contained style (เต็มสี)
                                bgcolor: 'success.main',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'success.dark',
                                },
                              } : {
                                // Outlined style (ขอบเส้น)
                                border: 2,
                                borderColor: 'success.main',
                              }),
                            }}
                          >
                            {person.nationalId && loadingVacant.has(person.nationalId) ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              <VacantIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>

                  {/* เส้นคั่น */}
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

                  {/* ปุ่มฝั่งขวา: Menu */}
                  <Tooltip title="เมนู">
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

          {/* Search by Name - Autocomplete + Filter รายการ + สถานะตำแหน่ง + รหัสตำแหน่ง */}
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
                <MenuItem value="vacant">ตำแหน่งว่าง</MenuItem>
                <MenuItem value="reserved">ว่าง (กันตำแหน่ง)</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ 
              flex: { 
                xs: '1 1 100%',              // Mobile: full width
                sm: '1 1 calc(50% - 8px)',   // Small tablet: 2 columns
                md: '0 1 180px'              // Desktop/iPad landscape: fixed width
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
                md: '0 1 180px'              // Desktop/iPad landscape: fixed width
              }, 
              minWidth: 150 
            }}>
              <InputLabel>รายการ</InputLabel>
              <Select
                value={swapFilter}
                label="รายการ"
                onChange={(e) => handleSwapFilterChange(e.target.value as 'all' | 'in-swap' | 'in-threeway' | 'in-vacant')}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="in-swap">อยู่ในสลับตำแหน่ง</MenuItem>
                <MenuItem value="in-threeway">อยู่ในสามเส้า</MenuItem>
                <MenuItem value="in-vacant">อยู่ในตำแหน่งว่าง</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Search and Filter */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
            {/* ช่องค้นหาหลัก - ให้ใหญ่ขึ้นบน iPad */}
            <TextField
              size="small"
              placeholder="ค้นหาด้วย เลขบัตรประชาชน , เลขตำแหน่ง..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ 
                flex: { 
                  xs: '1 1 100%',           // Mobile: full width
                  sm: '1 1 100%',           // Tablet: full width
                  md: '1 1 auto'            // Desktop: auto flex
                },
                minWidth: { xs: '100%', sm: '100%', md: 300 }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Autocomplete
              size="small"
              options={['ทั้งหมด', ...positionTypes]}
              value={positionTypeFilter === 'all' ? 'ทั้งหมด' : positionTypeFilter}
              onChange={(event, newValue) => {
                handlePositionTypeFilterChange(newValue === 'ทั้งหมด' ? 'all' : newValue || 'all');
              }}
              sx={{ 
                flex: { 
                  xs: '1 1 100%',                    // Mobile: full width
                  sm: '1 1 calc(33.33% - 11px)',     // Tablet: 3 columns
                  md: '0 1 200px'                    // Desktop: fixed width
                },
                minWidth: { xs: '100%', sm: 150, md: 200 }
              }}
              renderInput={(params) => <TextField {...params} label="ตำแหน่ง" />}
            />

            <Autocomplete
              size="small"
              options={['ทั้งหมด', ...ranks]}
              value={rankFilter === 'all' ? 'ทั้งหมด' : rankFilter}
              onChange={(event, newValue) => {
                handleRankFilterChange(newValue === 'ทั้งหมด' ? 'all' : newValue || 'all');
              }}
              sx={{ 
                flex: { 
                  xs: '1 1 100%',                    // Mobile: full width
                  sm: '1 1 calc(33.33% - 11px)',     // Tablet: 3 columns
                  md: '0 1 200px'                    // Desktop: fixed width
                },
                minWidth: { xs: '100%', sm: 150, md: 200 }
              }}
              renderInput={(params) => <TextField {...params} label="ยศ" />}
            />

            <Autocomplete
              size="small"
              options={['ทั้งหมด', ...units]}
              value={unitFilter === 'all' ? 'ทั้งหมด' : unitFilter}
              onChange={(event, newValue) => {
                handleUnitFilterChange(newValue === 'ทั้งหมด' ? 'all' : newValue || 'all');
              }}
              sx={{ 
                flex: { 
                  xs: '1 1 100%',                    // Mobile: full width
                  sm: '1 1 calc(33.33% - 11px)',     // Tablet: 3 columns
                  md: '0 1 200px'                    // Desktop: fixed width
                },
                minWidth: { xs: '100%', sm: 150, md: 200 }
              }}
              renderInput={(params) => <TextField {...params} label="หน่วย" />}
            />

            <Button 
              variant="contained" 
              onClick={handleSearch} 
              sx={{ 
                minWidth: { xs: '100%', sm: 100, md: 100 },
                flex: { xs: '1 1 100%', sm: '0 0 auto' }
              }}
            >
              ค้นหา
            </Button>
            <Tooltip title="รีเซ็ต">
              <IconButton 
                onClick={handleReset} 
                color="secondary"
                sx={{ 
                  display: { xs: 'none', sm: 'inline-flex' }  // ซ่อนบน mobile เพื่อประหยัดพื้นที่
                }}
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
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        กำลังโหลดข้อมูล...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        ไม่พบข้อมูล
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<ImportIcon />}
                        onClick={() => router.push('/police-personnel/import')}
                        sx={{ mt: 2 }}
                      >
                        นำเข้าข้อมูล
                      </Button>
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
                          {row.fullName || '-'}
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
                        {row.rank ? (
                          <Chip label="มีผู้ดำรง" color="success" size="small" />
                        ) : (
                          <Chip label="ตำแหน่งว่าง" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                          {/* Chip แสดงสถานะ Swap List */}
                          {row.rank && row.nationalId && swapListData.has(row.nationalId) && (
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
                              label="อยู่ในตำแหน่งว่าง" 
                              size="small" 
                              color="success"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                          
                          {/* Swap, สามเส้า, ตำแหน่งว่าง (ซ้าย) | Menu (ขวา) */}
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            {/* ปุ่มฝั่งซ้าย */}
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {!row.rank ? (
                                // ถ้าเป็นตำแหน่งว่าง แสดงแค่ปุ่มตำแหน่งว่างอย่างเดียว
                                <Tooltip title="ตำแหน่งว่าง">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    sx={{
                                      border: 1.5,
                                      borderColor: 'success.main',
                                      borderRadius: '50%',
                                      width: 32,
                                      height: 32,
                                    }}
                                  >
                                    <VacantIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                // ถ้ามีคน แสดง Swap, สามเส้า, ตำแหน่งว่าง
                                <>
                                  <Tooltip title={row.nationalId && swapListData.has(row.nationalId) ? "ลบออกจาก Swap List" : "เพิ่มเข้า Swap List"}>
                                    <IconButton
                                      size="small"
                                      color="info"
                                      onClick={() => row.nationalId && swapListData.has(row.nationalId) ? handleRemoveFromSwap(row.nationalId) : handleAddToSwap(row)}
                                      disabled={row.nationalId ? loadingSwap.has(row.nationalId) : false}
                                      sx={{
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        ...(row.nationalId && swapListData.has(row.nationalId) ? {
                                          // Contained style (เต็มสี)
                                          bgcolor: 'info.main',
                                          color: 'white',
                                          '&:hover': {
                                            bgcolor: 'info.dark',
                                          },
                                        } : {
                                          // Outlined style (ขอบเส้น)
                                          border: 1.5,
                                          borderColor: 'info.main',
                                        }),
                                      }}
                                    >
                                      {row.nationalId && loadingSwap.has(row.nationalId) ? (
                                        <CircularProgress size={16} color="inherit" />
                                      ) : (
                                        <SwapHorizIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={row.nationalId && threeWayListData.has(row.nationalId) ? "ลบออกจากสามเส้า" : "เพิ่มเข้าสามเส้า"}>
                                    <IconButton
                                      size="small"
                                      color="warning"
                                      onClick={() => row.nationalId && threeWayListData.has(row.nationalId) ? handleRemoveFromThreeWay(row.nationalId) : handleAddToThreeWay(row)}
                                      disabled={row.nationalId ? loadingThreeWay.has(row.nationalId) : false}
                                      sx={{
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                        ...(row.nationalId && threeWayListData.has(row.nationalId) ? {
                                          // Contained style (เต็มสี)
                                          bgcolor: 'warning.main',
                                          color: 'white',
                                          '&:hover': {
                                            bgcolor: 'warning.dark',
                                          },
                                        } : {
                                          // Outlined style (ขอบเส้น)
                                          border: 1.5,
                                          borderColor: 'warning.main',
                                        }),
                                      }}
                                    >
                                      {row.nationalId && loadingThreeWay.has(row.nationalId) ? (
                                        <CircularProgress size={16} color="inherit" />
                                      ) : (
                                        <ChangeHistoryIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="ตำแหน่งว่าง">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() =>
                                        row.nationalId && vacantListData.has(row.nationalId)
                                          ? handleRemoveFromVacant(row.nationalId)
                                          : handleAddToVacant(row)
                                      }
                                      disabled={row.nationalId ? loadingVacant.has(row.nationalId) : false}
                                      sx={{
                                        ...(row.nationalId && vacantListData.has(row.nationalId) ? {
                                          // Contained style (มีพื้นสี)
                                          bgcolor: 'success.main',
                                          color: 'white',
                                          '&:hover': {
                                            bgcolor: 'success.dark',
                                          },
                                        } : {
                                          // Outlined style (ขอบเส้น)
                                          border: 1.5,
                                          borderColor: 'success.main',
                                        }),
                                        borderRadius: '50%',
                                        width: 32,
                                        height: 32,
                                      }}
                                    >
                                      {row.nationalId && loadingVacant.has(row.nationalId) ? (
                                        <CircularProgress size={16} color="inherit" />
                                      ) : (
                                        <VacantIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Box>

                            {/* เส้นคั่น */}
                            <Divider orientation="vertical" flexItem sx={{ height: 32 }} />

                            {/* ปุ่มฝั่งขวา: Menu */}
                            <Tooltip title="เมนู">
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
          open={editModalOpen} 
          onClose={handleEditClose} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', py: 1.5, px: 2 }}>
            <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
              แก้ไขข้อมูลบุคลากร
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 2, px: 2, pb: 2 }}>
            <Stack spacing={2}>
              {/* ข้อมูลบุคคล */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="primary" mb={1} mt={1}>
                  ข้อมูลบุคคล
                </Typography>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      label="ยศ"
                      value={editFormData.rank || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, rank: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ชื่อ-สกุล"
                      value={editFormData.fullName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      label="เลขบัตรประชาชน"
                      value={editFormData.nationalId || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, nationalId: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="อายุ"
                      value={editFormData.age || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      label="อาวุโส"
                      value={editFormData.seniority || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, seniority: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="คุณวุฒิ"
                      value={editFormData.education || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, education: e.target.value })}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* ข้อมูลตำแหน่ง */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="primary" mb={1}>
                  ข้อมูลตำแหน่ง
                </Typography>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      label="ตำแหน่ง"
                      value={editFormData.position || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="เลขตำแหน่ง"
                      value={editFormData.positionNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, positionNumber: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      label="หน่วย"
                      value={editFormData.unit || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="ทำหน้าที่"
                      value={editFormData.actingAs || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, actingAs: e.target.value })}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* ข้อมูลวันที่ */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="primary" mb={1}>
                  ข้อมูลวันที่
                </Typography>
                <Stack spacing={1.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      label="วันเกิด"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.birthDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="แต่งตั้งครั้งสุดท้าย"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.lastAppointment || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, lastAppointment: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      label="ระดับนี้เมื่อ"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.currentRankSince || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, currentRankSince: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="บรรจุ"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.enrollmentDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, enrollmentDate: e.target.value })}
                      size="small"
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      fullWidth
                      label="เกษียณ"
                      placeholder="DD/MM/YYYY"
                      value={editFormData.retirementDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, retirementDate: e.target.value })}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="จำนวนปี"
                      value={editFormData.yearsOfService || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, yearsOfService: e.target.value })}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </Box>

              {/* ข้อมูลการฝึกอบรม */}
              <Box>
                <Typography variant="body2" fontWeight={600} color="primary" mb={1}>
                  ข้อมูลการฝึกอบรม
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    label="สถานที่ฝึกอบรม (ตท.)"
                    value={editFormData.trainingLocation || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, trainingLocation: e.target.value })}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="หลักสูตร (นรต.)"
                    value={editFormData.trainingCourse || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, trainingCourse: e.target.value })}
                    size="small"
                  />
                </Stack>
              </Box>

              {/* หมายเหตุ */}
              <TextField
                fullWidth
                multiline
                rows={2}
                label="หมายเหตุ"
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                size="small"
              />
            </Stack>
          </DialogContent>
          
          <DialogActions sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={handleEditClose} variant="outlined" size="medium" disabled={isSaving}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleEditSave} 
              variant="contained" 
              size="medium" 
              sx={{ minWidth: 100 }}
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
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

        {/* Menu สำหรับ View, Edit, Delete */}
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
              if (menuPersonnel) handleViewDetail(menuPersonnel);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <ViewIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>ดูรายละเอียด</ListItemText>
          </MenuItem>
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
