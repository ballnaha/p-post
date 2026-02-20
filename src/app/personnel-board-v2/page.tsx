'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import Link from 'next/link';
import {
    Box,
    Typography,
    Paper,
    Button,
    IconButton,
    TextField,
    Chip,
    CircularProgress,
    FormControl,
    Select,
    MenuItem,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    alpha,
    InputAdornment,
    Collapse,
    Pagination,
    Autocomplete,
    Tabs,
    Tab,
    Drawer,
    Divider,
    Slide,
    AppBar,
    Toolbar,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import InOutView from '@/components/InOutView';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Search as SearchIcon,
    DragIndicator as DragIndicatorIcon,
    KeyboardArrowUp as ArrowUpIcon,
    KeyboardArrowDown as ArrowDownIcon,
    Star as StarIcon,
    CalendarMonth as CalendarMonthIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    FilterList as FilterListIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    Close as CloseIcon,
    Home as HomeIcon,
    Sort as SortIcon,
    Tune as TuneIcon,
    RemoveCircleOutline as PlaceholderIcon,
    TableChart as TableChartIcon,
    Print as PrintIcon,
} from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// Pragmatic DnD imports
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';

import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import { Personnel, Column } from './types';
import CreateSwapLaneTab from './components/CreateSwapLaneTab';
import CreateThreeWayLaneTab from './components/CreateThreeWayLaneTab';
import CreateTransferLaneTab from './components/CreateTransferLaneTab';

// Components
import DraggableCard from './components/DraggableCard';
import DroppableLane from './components/DroppableLane';
import DraggablePersonnelItem from './components/DraggablePersonnelItem';
import LaneSummaryButton from './components/LaneSummaryButton';
import { useBoardHistory } from './hooks/useBoardHistory';
import UndoRedoControls from './components/UndoRedoControls';
import LaneSummaryModal from './components/LaneSummaryModal';
import TransferSummaryReport from './components/TransferSummaryReport';

// --- Main Page Component ---
export default function PersonnelBoardV2Page() {
    const currentYear = new Date().getFullYear() + 543;

    const getTransferLaneTitle = useCallback((col: Column, itemIds: string[], map: Record<string, Personnel>) => {
        const firstPersonId = itemIds[0];
        const personName = firstPersonId ? (map[firstPersonId]?.fullName || '?') : '?';
        const toUnit = (col.vacantPosition?.unit as string | undefined) || (firstPersonId ? (map[firstPersonId]?.toUnit as string | undefined) : undefined);
        if (toUnit) return `ย้ายหน่วย: ${personName} → ${toUnit}`;
        return `ย้ายหน่วย: ${personName}`;
    }, []);

    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [columns, setColumns] = useState<Column[]>([]);
    const [personnelMap, setPersonnelMap] = useState<Record<string, Personnel>>({});

    useEffect(() => {
        setColumns(prev => {
            let changed = false;
            const next = prev.map(col => {
                const isTransferLane = col.chainType === 'transfer' || (col.vacantPosition?.isTransaction && col.vacantPosition.transactionType === 'transfer');
                if (!isTransferLane) return col;

                const nextTitle = getTransferLaneTitle(col, col.itemIds, personnelMap);
                if (col.title === nextTitle) return col;
                changed = true;
                return { ...col, title: nextTitle };
            });
            return changed ? next : prev;
        });
    }, [columns, personnelMap, getTransferLaneTitle]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // History Hook
    const { takeSnapshot, undo, redo, canUndo, canRedo, clearHistory } = useBoardHistory(columns, personnelMap, selectedIds);

    const handleUndo = useCallback(() => {
        const prevState = undo(columns, personnelMap, selectedIds);
        if (prevState) {
            setColumns(prevState.columns);
            setPersonnelMap(prevState.personnelMap);
            setSelectedIds(prevState.selectedIds);
            setHasUnsavedChanges(true);
            setSnackbar({ open: true, message: '⏪ ย้อนกลับเรียบร้อย', severity: 'info' });
        }
    }, [undo, columns, personnelMap, selectedIds]);

    const handleRedo = useCallback(() => {
        const nextState = redo(columns, personnelMap, selectedIds);
        if (nextState) {
            setColumns(nextState.columns);
            setPersonnelMap(nextState.personnelMap);
            setSelectedIds(nextState.selectedIds);
            setHasUnsavedChanges(true);
            setSnackbar({ open: true, message: '⏩ ทำซ้ำเรียบร้อย', severity: 'info' });
        }
    }, [redo, columns, personnelMap, selectedIds]);

    // Helper to commit changes with history
    const commitAction = useCallback((actionName?: string) => {
        takeSnapshot(columns, personnelMap, selectedIds);
    }, [columns, personnelMap, selectedIds, takeSnapshot]);

    // Left Panel State
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(20);
    const [totalPersonnel, setTotalPersonnel] = useState(0);

    // Filter State
    const [filterUnit, setFilterUnit] = useState<string>('all');
    const [filterPosCode, setFilterPosCode] = useState<string>('all');
    const [filterHasRequestedPosition, setFilterHasRequestedPosition] = useState<string>('all');
    const [filterMinPosCode, setFilterMinPosCode] = useState<string | null>(null);
    const [allUnits, setAllUnits] = useState<string[]>([]);
    const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);

    // Dialog State
    const [isNewLaneDialogOpen, setIsNewLaneDialogOpen] = useState(false);
    const [newLaneTitle, setNewLaneTitle] = useState('');
    const [addLaneTab, setAddLaneTab] = useState(0); // 0: Manual, 1: Vacant Position
    const [selectedVacantPosition, setSelectedVacantPosition] = useState<any | null>(null);
    const [isNewLaneDrawerOpen, setIsNewLaneDrawerOpen] = useState(false);
    const [showCompletedLanes, setShowCompletedLanes] = useState(false); // Toggle to show/hide completed lanes
    const [isInOutTableOpen, setIsInOutTableOpen] = useState(false); // State for In-Out Table Dialog
    const [isReportOpen, setIsReportOpen] = useState(false); // State for Report Dialog

    // Board Filter State
    const [boardFilterAnchor, setBoardFilterAnchor] = useState<null | HTMLElement>(null);
    const [filterBoardType, setFilterBoardType] = useState<string>('all'); // all, swap, three-way, promotion, custom
    const [showOnlyWithPlaceholder, setShowOnlyWithPlaceholder] = useState(false); // Show only lanes with placeholder
    const [boardSearchTerm, setBoardSearchTerm] = useState('');

    // Fetch vacant positions
    const [vacantPositions, setVacantPositions] = useState<any[]>([]);
    const [loadingVacantPositions, setLoadingVacantPositions] = useState(false);
    const [vacantPage, setVacantPage] = useState(0);
    const [vacantRowsPerPage] = useState(20);
    const [vacantTotal, setVacantTotal] = useState(0);

    // Vacant Position Filters for Drawer
    const [vacantSearch, setVacantSearch] = useState('');
    const [debouncedVacantSearch, setDebouncedVacantSearch] = useState('');
    const [vacantFilterUnit, setVacantFilterUnit] = useState('all');
    const [vacantFilterPosCode, setVacantFilterPosCode] = useState('all');
    const [vacantFilterStatus, setVacantFilterStatus] = useState('all'); // all, vacant, reserved
    const [isVacantFilterCollapsed, setIsVacantFilterCollapsed] = useState(true); // Drawer filter toggle

    // Swap Transactions for Drawer
    const [swapTransactions, setSwapTransactions] = useState<any[]>([]);
    const [loadingSwapTransactions, setLoadingSwapTransactions] = useState(false);
    const [threeWayTransactions, setThreeWayTransactions] = useState<any[]>([]);
    const [loadingThreeWayTransactions, setLoadingThreeWayTransactions] = useState(false);



    // Debounce vacant search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedVacantSearch(vacantSearch), 300);
        return () => clearTimeout(timer);
    }, [vacantSearch]);

    // Reset page when filters change
    useEffect(() => {
        setVacantPage(0);
    }, [debouncedVacantSearch, vacantFilterUnit, vacantFilterPosCode, vacantFilterStatus]);

    const [deleteLaneConfirm, setDeleteLaneConfirm] = useState<{ open: boolean; laneId: string | null; laneTitle: string }>({
        open: false,
        laneId: null,
        laneTitle: ''
    });

    // Clear Board Dialog State
    const [clearBoardConfirm, setClearBoardConfirm] = useState(false);

    // Vacant Position Detail Modal State
    const [selectedVacantDetail, setSelectedVacantDetail] = useState<any | null>(null);

    // Centralized Personnel Detail Modal State
    // Centralized Personnel Detail Modal State
    const [selectedPersonnelDetail, setSelectedPersonnelDetail] = useState<{
        personnel: Personnel;
        targetInfo?: any;
    } | null>(null);

    // Lane Summary Modal State
    const [selectedLaneSummary, setSelectedLaneSummary] = useState<Column | null>(null);

    // Drag & Selection State
    const [draggedItem, setDraggedItem] = useState<Personnel | null>(null);

    const toggleSelection = useCallback((id: string) => {
        commitAction();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, [commitAction]);

    const clearSelection = useCallback(() => {
        if (selectedIds.length > 0) {
            commitAction();
            setSelectedIds([]);
        }
    }, [selectedIds, commitAction]);

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>(
        { open: false, message: '', severity: 'success' }
    );

    // Loading/Saving State
    const [loadingBoard, setLoadingBoard] = useState(false);
    const [savingBoard, setSavingBoard] = useState(false);
    const [isDeletingLane, setIsDeletingLane] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Filter IDs already on board
    const assignedIds = useMemo(() => {
        const ids: string[] = [];
        Object.values(personnelMap).forEach(p => {
            if (p.noId) ids.push(String(p.noId));
            if (p.id) ids.push(String(p.id));
            if ((p as any).originalId) ids.push(String((p as any).originalId));
        });
        return ids.filter(Boolean);
    }, [personnelMap]);

    // Filter Vacant Position IDs already on board
    const assignedVacantIds = useMemo(() => {
        return columns
            .map(c => c.vacantPosition?.id)
            .filter(Boolean)
            .map(id => String(id));
    }, [columns]);

    // Count how many people on board match current filters
    const matchingAssignedCount = useMemo(() => {
        // We only care about unique persons (originalId)
        const uniqueOnBoard = new Set();
        Object.values(personnelMap).forEach(p => {
            // Apply current filters to people on board
            if (searchTerm && !p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) && !p.position?.toLowerCase().includes(searchTerm.toLowerCase())) return;
            if (filterUnit !== 'all' && p.unit !== filterUnit) return;
            if (filterPosCode !== 'all' && String(p.posCodeId) !== filterPosCode) return;
            if (filterMinPosCode && p.posCodeId && p.posCodeId < Number(filterMinPosCode)) return;
            if (filterHasRequestedPosition && filterHasRequestedPosition !== 'all') {
                const hasReq = !!(p.supporterName || p.supportReason || (p as any).requestedPosition);
                if (filterHasRequestedPosition === 'with-supporter' && !hasReq) return;
                if (filterHasRequestedPosition === 'without-supporter' && hasReq) return;
            }
            const pId = (p as any).originalId || p.id;
            if (pId) uniqueOnBoard.add(String(pId));
        });
        return uniqueOnBoard.size;
    }, [personnelMap, searchTerm, filterUnit, filterPosCode, filterMinPosCode, filterHasRequestedPosition]);

    // Filtered personnel list
    const filteredPersonnelList = useMemo(() => {
        return personnelList.filter((p: any) => {
            const pNoId = String(p.noId || '');
            const pId = String(p.id || '');
            return !assignedIds.includes(pId) && !assignedIds.includes(pNoId);
        });
    }, [personnelList, assignedIds]);

    // Filter columns for board display
    const filteredColumns = useMemo(() => {
        return columns.filter(col => {
            // Filter by completed status
            if (showCompletedLanes && !col.isCompleted) return false;
            if (!showCompletedLanes && col.isCompleted) return false;

            // Filter by lane type
            if (filterBoardType !== 'all') {
                const colType = col.chainType || 'custom';
                if (colType !== filterBoardType) return false;
            }

            // Filter by placeholder
            if (showOnlyWithPlaceholder) {
                const hasPlaceholder = col.itemIds.some(id => {
                    const person = personnelMap[id];
                    return person?.isPlaceholder || id.startsWith('placeholder-');
                });
                if (!hasPlaceholder) return false;
            }

            // Filter by Search Term (Group, Name, Position)
            if (boardSearchTerm) {
                const term = boardSearchTerm.toLowerCase();
                const matchesGroup = col.groupNumber?.toLowerCase().includes(term);
                const matchesTitle = col.title?.toLowerCase().includes(term);
                const matchesPersonnel = col.itemIds.some(id => {
                    const p = personnelMap[id];
                    return p && (
                        (p.fullName || '').toLowerCase().includes(term) ||
                        (p.position || '').toLowerCase().includes(term) ||
                        (p.rank || '').toLowerCase().includes(term)
                    );
                });

                if (!matchesGroup && !matchesTitle && !matchesPersonnel) return false;
            }

            return true;
        });
    }, [columns, showCompletedLanes, filterBoardType, showOnlyWithPlaceholder, personnelMap, boardSearchTerm]);

    // Count lanes with placeholder
    const lanesWithPlaceholderCount = useMemo(() => {
        return columns.filter(col => !col.isCompleted).filter(col => {
            return col.itemIds.some(id => {
                const person = personnelMap[id];
                return person?.isPlaceholder || id.startsWith('placeholder-');
            });
        }).length;
    }, [columns, personnelMap]);



    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Load filters
    const loadFilters = async () => {
        try {
            const [uRes, pRes] = await Promise.all([
                fetch('/api/police-personnel/units'),
                fetch('/api/police-personnel/pos-codes')
            ]);
            if (uRes.ok) {
                const uData = await uRes.json();
                setAllUnits(uData.data || []);
            }
            if (pRes.ok) {
                const pData = await pRes.json();
                setPosCodeOptions((pData.data || []).map((p: any) => ({ id: p.id, name: p.name })));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        loadFilters();
    }, []);

    // Fetch personnel list
    const fetchPersonnelList = useCallback(async () => {
        setListLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('year', selectedYear.toString()); // เพิ่มการกรองตามปีที่เลือก
            if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
            if (filterUnit && filterUnit !== 'all') params.set('unit', filterUnit);
            if (filterPosCode && filterPosCode !== 'all') {
                params.set('posCodeId', filterPosCode);
            } else if (filterMinPosCode) {
                params.set('minPosCodeId', filterMinPosCode);
            }
            if (filterHasRequestedPosition && filterHasRequestedPosition !== 'all') params.set('hasRequestedPosition', filterHasRequestedPosition);
            params.set('page', page.toString());
            params.set('limit', rowsPerPage.toString());

            const res = await fetch(`/api/police-personnel/candidates?${params.toString()}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            setPersonnelList(Array.isArray(data?.data) ? data.data : []);
            setTotalPersonnel(data?.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setListLoading(false);
        }
    }, [debouncedSearchTerm, filterUnit, filterPosCode, filterMinPosCode, filterHasRequestedPosition, page, rowsPerPage, selectedYear]);

    useEffect(() => {
        fetchPersonnelList();
    }, [fetchPersonnelList]);





    const fetchVacantPositions = useCallback(async () => {
        setLoadingVacantPositions(true);
        try {
            const params = new URLSearchParams();
            params.set('year', selectedYear.toString());
            params.set('unassignedOnly', 'true');
            params.set('page', vacantPage.toString());
            params.set('limit', vacantRowsPerPage.toString());
            if (debouncedVacantSearch) params.set('search', debouncedVacantSearch);
            if (vacantFilterPosCode && vacantFilterPosCode !== 'all') params.set('posCodeId', vacantFilterPosCode);
            if (vacantFilterUnit && vacantFilterUnit !== 'all') params.set('unit', vacantFilterUnit);
            if (vacantFilterStatus && vacantFilterStatus !== 'all') params.set('status', vacantFilterStatus);

            const res = await fetch(`/api/vacant-position/available?${params.toString()}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            // Flatten all positions from groups
            const allPositions: any[] = [];
            if (data.groups) {
                data.groups.forEach((group: any) => {
                    group.positions.forEach((pos: any) => {
                        allPositions.push({
                            ...pos,
                            posCodeId: group.posCodeId,
                            posCodeMaster: { id: group.posCodeId, name: group.posCodeName }
                        });
                    });
                });
            }
            setVacantPositions(allPositions);
            setVacantTotal(data.total || allPositions.length);
        } catch (err) {
            console.error('Error fetching vacant positions:', err);
        } finally {
            setLoadingVacantPositions(false);
        }
    }, [selectedYear, vacantPage, vacantRowsPerPage, debouncedVacantSearch, vacantFilterPosCode, vacantFilterUnit, vacantFilterStatus]);

    // Fetch vacant positions when drawer is open or filters change
    useEffect(() => {
        if (isNewLaneDrawerOpen && addLaneTab === 0) {
            fetchVacantPositions();
        }
    }, [isNewLaneDrawerOpen, addLaneTab, fetchVacantPositions]);

    // Fetch swap transactions
    const fetchSwapTransactions = useCallback(async () => {
        setLoadingSwapTransactions(true);
        try {
            const res = await fetch(`/api/swap-transactions?year=${selectedYear}&swapType=two-way`);
            if (res.ok) {
                const data = await res.json();
                setSwapTransactions(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching swap transactions:', err);
        } finally {
            setLoadingSwapTransactions(false);
        }
    }, [selectedYear]);

    // Fetch three-way transactions
    const fetchThreeWayTransactions = useCallback(async () => {
        setLoadingThreeWayTransactions(true);
        try {
            const res = await fetch(`/api/swap-transactions?year=${selectedYear}&swapType=three-way`);
            if (res.ok) {
                const data = await res.json();
                setThreeWayTransactions(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching three-way transactions:', err);
        } finally {
            setLoadingThreeWayTransactions(false);
        }
    }, [selectedYear]);

    // Fetch swap/three-way when drawer is open and tab changes
    useEffect(() => {
        if (isNewLaneDrawerOpen) {
            // Logic for other tabs can remain if needed
        }
    }, [isNewLaneDrawerOpen, addLaneTab]);




    // Load board data from API
    const loadBoardData = useCallback(async (year: number) => {
        setLoadingBoard(true);
        try {
            const res = await fetch(`/api/personnel-board?year=${year}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            if (data.columns && data.columns.length > 0) {
                // Use columns directly from API (which are already sorted by saved layout)
                setColumns(data.columns);
                setPersonnelMap(data.personnelMap || {});
            } else {
                setColumns([]);
                setPersonnelMap({});
            }
            setHasUnsavedChanges(false);
        } catch (err) {
            console.error('Error loading board data:', err);
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', severity: 'error' });
        } finally {
            setLoadingBoard(false);
        }
    }, [fetchVacantPositions]);

    // Save board data to API
    const saveBoardData = useCallback(async (year: number, cols: Column[], persMap: Record<string, Personnel>) => {
        setSavingBoard(true);
        try {
            const res = await fetch('/api/personnel-board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, columns: cols, personnelMap: persMap }),
            });
            const resData = await res.json();
            if (!res.ok) throw new Error(resData.error || 'API Error');

            // อัปเดต columns state ด้วยข้อมูลใหม่ที่ได้จาก API (ที่มี linkedTransactionId แล้ว)
            if (resData.lanes && Array.isArray(resData.lanes)) {
                setColumns(prev => {
                    const newCols = prev.map(col => {
                        const matcher = resData.lanes.find((l: any) => l.title === col.title && (l.transactionId === col.linkedTransactionId || !col.linkedTransactionId));
                        if (matcher) {
                            return {
                                ...col,
                                linkedTransactionId: matcher.transactionId,
                                linkedTransactionType: col.linkedTransactionType || 'promotion-chain',
                                id: matcher.transactionId, // ใช้ transactionId เป็น ID ของเลนเลยเพื่อให้ sync กัน
                            };
                        }
                        return col;
                    });
                    return newCols;
                });
            }

            setLastSavedAt(new Date());
            setHasUnsavedChanges(false);
            return true;
        } catch (err: any) {
            console.error('Error saving board data:', err);
            setSnackbar({
                open: true,
                message: `บันทึกข้อมูลไม่สำเร็จ: ${err.message || 'Unknown error'}`,
                severity: 'error'
            });
            return false;
        } finally {
            setSavingBoard(false);
        }
    }, []);

    // Load data on mount and year change
    useEffect(() => {
        loadBoardData(selectedYear);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    // Auto-save (debounced)
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (!hasUnsavedChanges || savingBoard) {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
            return;
        }

        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
            saveBoardData(selectedYear, columns, personnelMap);
        }, 2000); // 2 seconds for responsive auto-save
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [hasUnsavedChanges, savingBoard, personnelMap, columns, selectedYear, saveBoardData]);

    // Sort lanes by type
    const handleSortByType = useCallback(async () => {
        const TYPE_ORDER: Record<string, number> = {
            'swap': 1,
            'three-way': 2,
            'promotion': 3,
            'custom': 4,
        };

        const activeLanes = columns.filter(c => !c.isCompleted);
        const completedLanes = columns.filter(c => c.isCompleted);

        const sortedActive = [...activeLanes].sort((a, b) => {
            const orderA = TYPE_ORDER[a.chainType || 'custom'] || 99;
            const orderB = TYPE_ORDER[b.chainType || 'custom'] || 99;
            return orderA - orderB;
        });

        const newColumns = [...sortedActive, ...completedLanes];
        setColumns(newColumns);
        // Mark as unsaved initially
        setHasUnsavedChanges(true);

        // Save immediately to persist order
        const success = await saveBoardData(selectedYear, newColumns, personnelMap);

        if (success) {
            setSnackbar({ open: true, message: 'จัดกลุ่มเลนตามประเภทและบันทึกเรียบร้อย', severity: 'success' });
        }
    }, [columns, personnelMap, selectedYear, saveBoardData]);

    // Manual save
    const handleSaveData = async () => {
        setSavingBoard(true);
        try {
            const res = await fetch('/api/personnel-board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year: selectedYear, columns, personnelMap }),
            });
            if (!res.ok) throw new Error('API Error');
            setLastSavedAt(new Date());
            setHasUnsavedChanges(false);
            setSnackbar({ open: true, message: `บันทึกข้อมูลปี ${selectedYear} เรียบร้อยแล้ว`, severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการบันทึก', severity: 'error' });
        } finally {
            setSavingBoard(false);
        }
    };

    // Monitor for drag events
    useEffect(() => {
        return monitorForElements({
            onDragStart: ({ source }) => {
                const sourceData = source.data;
                if (sourceData.type === 'personnel') {
                    setDraggedItem(sourceData.person as Personnel);
                } else if (sourceData.type === 'card' && sourceData.personnel) {
                    const pid = sourceData.personnelId as string;
                    // If the dragged card is part of the selection, drag all selected items
                    if (selectedIds.includes(pid)) {
                        setDraggedItem({
                            ...sourceData.personnel as Personnel,
                            fullName: `ย้ายบุคลากร ${selectedIds.length} คน`
                        });
                    } else {
                        setDraggedItem(sourceData.personnel as Personnel);
                    }
                }
            },
            onDrop: ({ source, location }) => {
                setDraggedItem(null);

                const destination = location.current.dropTargets[0];
                const sourceData = source.data;
                const destData = destination?.data;

                if (!destination) {
                    // Alert if user tries to drop personnel but no lanes exist
                    if (sourceData.type === 'personnel' && columns.length === 0) {
                        setSnackbar({
                            open: true,
                            message: 'กรุณาเพิ่ม Lane (เลน) ก่อนลากบุคลากรมาวาง',
                            severity: 'error'
                        });
                    }
                    return;
                }

                // Handle personnel drop from left panel
                if (sourceData.type === 'personnel') {
                    const person = sourceData.person as Personnel;
                    const boardId = `${person.id}-board-${Date.now()}`;
                    let newPerson: Personnel = { ...person, id: boardId, originalId: person.id };

                    // Dropped on a lane directly (empty space or bottom)
                    if (destData.type === 'lane') {
                        commitAction(); // Save history before drop
                        const laneId = destData.laneId as string;
                        const targetLane = columns.find(c => c.id === laneId);

                        // Enforce limits for Swap (2) and Three-way (3)
                        if (targetLane) {
                            const maxLimit = targetLane.chainType === 'swap' ? 2
                                : targetLane.chainType === 'three-way' ? 3
                                    : Infinity;

                            // Also check transactionType if available (backward compatibility)
                            let limitType = '';
                            if (targetLane.chainType === 'swap' || (targetLane.vacantPosition?.transactionType === 'two-way')) {
                                if (targetLane.itemIds.length >= 2) limitType = 'สลับตำแหน่ง (2 คน)';
                            } else if (targetLane.chainType === 'three-way' || (targetLane.vacantPosition?.transactionType === 'three-way')) {
                                if (targetLane.itemIds.length >= 3) limitType = 'สามเส้า (3 คน)';
                            }

                            if (limitType || targetLane.itemIds.length >= maxLimit) {
                                setSnackbar({
                                    open: true,
                                    message: limitType ? `❌ รายการ "${limitType}" เต็มแล้ว` : `❌ เลนนี้จำกัดสูงสุด ${maxLimit} คน`,
                                    severity: 'error'
                                });
                                return;
                            }
                        }

                        if (targetLane?.vacantPosition?.isTransaction) {
                            const type = targetLane.vacantPosition.transactionType;
                            // Pre-existing checks removed as they are covered above, but keeping logic for swap processing below


                            // For swap lanes: set toPosition based on existing person in lane
                            if (type === 'two-way' && targetLane.itemIds.length === 1) {
                                const existingPersonId = targetLane.itemIds[0];
                                const existingPerson = personnelMap[existingPersonId];
                                if (existingPerson) {
                                    // Set new person's toPosition = existing person's position
                                    newPerson = {
                                        ...newPerson,
                                        toPosCodeId: existingPerson.posCodeId,
                                        toPosCodeMaster: existingPerson.posCodeMaster,
                                        toPosition: existingPerson.position,
                                        toPositionNumber: existingPerson.positionNumber,
                                        toUnit: existingPerson.unit,
                                    };

                                    // Update existing person's toPosition = new person's position
                                    setPersonnelMap(prev => ({
                                        ...prev,
                                        [existingPersonId]: {
                                            ...existingPerson,
                                            toPosCodeId: person.posCodeId,
                                            toPosCodeMaster: person.posCodeMaster,
                                            toPosition: person.position,
                                            toPositionNumber: person.positionNumber,
                                            toUnit: person.unit,
                                        },
                                        [boardId]: newPerson
                                    }));

                                    // Update Lane Title
                                    const newTitle = `สลับ: ${existingPerson.fullName} ↔ ${newPerson.fullName}`;

                                    setColumns(prev => prev.map(c =>
                                        c.id === laneId ? { ...c, title: newTitle, itemIds: [...c.itemIds, boardId] } : c
                                    ));

                                    if (targetLane) {
                                        triggerChainReaction(newPerson, targetLane);
                                    }
                                    return; // Exit early since we handled everything
                                }
                            }
                        }

                        // For three-way lanes: set transaction metadata
                        const isSwapLane = targetLane?.chainType === 'swap' || (targetLane?.vacantPosition?.isTransaction && targetLane?.vacantPosition.transactionType === 'two-way');
                        const isThreeWayLane = targetLane?.chainType === 'three-way' || (targetLane?.vacantPosition?.isTransaction && targetLane?.vacantPosition.transactionType === 'three-way');

                        if (isThreeWayLane) {
                            newPerson = {
                                ...newPerson,
                                transactionType: 'three-way',
                                transactionId: targetLane?.vacantPosition?.id || targetLane?.id
                            };
                        }

                        // For promotion lanes: set toPosition from vacantPosition
                        if (!isSwapLane && !isThreeWayLane && targetLane?.vacantPosition) {
                            newPerson = {
                                ...newPerson,
                                toPosCodeId: targetLane.vacantPosition.posCodeMaster?.id || targetLane.vacantPosition.posCodeId,
                                toPosCodeMaster: targetLane.vacantPosition.posCodeMaster,
                                toPosition: targetLane.vacantPosition.position,
                                toPositionNumber: targetLane.vacantPosition.positionNumber,
                                toUnit: targetLane.vacantPosition.unit,
                            };
                        }

                        setPersonnelMap(prev => ({ ...prev, [boardId]: newPerson }));
                        setColumns(prev => prev.map(c => {
                            if (c.id !== laneId) return c;

                            let newTitle = c.title;
                            const newItemIds = [...c.itemIds, boardId];

                            const isSwapLane = c.chainType === 'swap' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'two-way');
                            const isThreeWayLane = c.chainType === 'three-way' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'three-way');
                            const isTransferLane = c.chainType === 'transfer' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'transfer');

                            // Update title for swap lanes
                            if (isSwapLane) {
                                const names = newItemIds.map(itemId => {
                                    if (itemId === boardId) return newPerson.fullName || '?';
                                    return personnelMap[itemId]?.fullName || '?';
                                });
                                if (names.length === 1) {
                                    newTitle = `สลับ: ${names[0]} ↔ ?`;
                                } else if (names.length === 2) {
                                    newTitle = `สลับ: ${names[0]} ↔ ${names[1]}`;
                                }
                            }

                            // Update title for three-way lanes
                            if (isThreeWayLane) {
                                const names = newItemIds.map(itemId => {
                                    if (itemId === boardId) return newPerson.fullName || '?';
                                    return personnelMap[itemId]?.fullName || '?';
                                });
                                newTitle = `สามเส้า: ${names.join(' → ')}`;
                            }

                            if (isTransferLane) {
                                const nextMap: Record<string, Personnel> = {
                                    ...personnelMap,
                                    [boardId]: newPerson,
                                };
                                newTitle = getTransferLaneTitle(c, newItemIds, nextMap);
                            }

                            return { ...c, title: newTitle, itemIds: newItemIds };
                        }));

                        if (targetLane) {
                            const updatedLane = {
                                ...targetLane,
                                itemIds: [...targetLane.itemIds, boardId]
                            };
                            triggerChainReaction(newPerson, updatedLane as Column);
                        }
                    }
                    // Dropped on another card to insert at specific position
                    else if (destData.personnelId && (destData.type === 'card')) {
                        const destPersonnelId = destData.personnelId as string;
                        const edge = extractClosestEdge(destData);
                        const destColumn = columns.find(c => c.itemIds.includes(destPersonnelId));

                        if (destColumn) {
                            commitAction(); // Save history before drop
                            // Check if target is a placeholder - REPLACE instead of insert
                            const targetPerson = personnelMap[destPersonnelId];
                            const isTargetPlaceholder = targetPerson?.isPlaceholder || destPersonnelId.startsWith('placeholder-');

                            if (isTargetPlaceholder) {
                                // Replace placeholder with new person
                                // Copy target position info from placeholder to new person
                                newPerson = {
                                    ...newPerson,
                                    toPosCodeId: targetPerson?.toPosCodeId || targetPerson?.posCodeId,
                                    toPosCodeMaster: targetPerson?.toPosCodeMaster || targetPerson?.posCodeMaster,
                                    toPosition: targetPerson?.toPosition || targetPerson?.position,
                                    toPositionNumber: targetPerson?.toPositionNumber || targetPerson?.positionNumber,
                                    toUnit: targetPerson?.toUnit || targetPerson?.unit,
                                    toActingAs: targetPerson?.toActingAs,
                                    // Preserve transaction metadata
                                    swapDetailId: targetPerson?.swapDetailId,
                                    transactionId: targetPerson?.transactionId,
                                    transactionType: targetPerson?.transactionType || (destColumn.chainType === 'three-way' ? 'three-way' : (destColumn.chainType === 'swap' ? 'two-way' : undefined)),
                                };


                                // Remove placeholder from personnelMap
                                setPersonnelMap(prev => {
                                    const newMap = { ...prev };
                                    delete newMap[destPersonnelId];
                                    return { ...newMap, [boardId]: newPerson };
                                });

                                // Replace placeholder ID with new person ID in column
                                setColumns(prev => prev.map(c => {
                                    if (c.id === destColumn.id) {
                                        const newItemIds = c.itemIds.map(id =>
                                            id === destPersonnelId ? boardId : id
                                        );

                                        let newTitle = c.title;
                                        const isSwapLane = c.chainType === 'swap' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'two-way');
                                        const isThreeWayLane = c.chainType === 'three-way' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'three-way');

                                        if (isSwapLane) {
                                            const names = newItemIds.map(itemId => {
                                                if (itemId === boardId) return newPerson.fullName || '?';
                                                return personnelMap[itemId]?.fullName || '?';
                                            });
                                            if (names.length === 1) {
                                                newTitle = `สลับ: ${names[0]} ↔ ?`;
                                            } else if (names.length === 2) {
                                                newTitle = `สลับ: ${names[0]} ↔ ${names[1]}`;
                                            }
                                        } else if (isThreeWayLane) {
                                            const names = newItemIds.map(itemId => {
                                                if (itemId === boardId) return newPerson.fullName || '?';
                                                return personnelMap[itemId]?.fullName || '?';
                                            });
                                            newTitle = `สามเส้า: ${names.join(' → ')}`;
                                        }

                                        return { ...c, title: newTitle, itemIds: newItemIds };
                                    }
                                    return c;
                                }));

                                setHasUnsavedChanges(true);

                                // Calculate position in chain
                                const positionIndex = destColumn.itemIds.indexOf(destPersonnelId) + 1;
                                const chainLabel = destColumn.chainType === 'promotion'
                                    ? `เข้าสู่สายพาน (ลำดับที่ ${positionIndex})`
                                    : destColumn.chainType === 'swap' || destColumn.chainType === 'three-way'
                                        ? `(คนที่ ${positionIndex})`
                                        : '';

                                setSnackbar({
                                    open: true,
                                    message: `✅ เพิ่ม ${newPerson.rank || ''} ${newPerson.fullName} ${chainLabel}`.trim(),
                                    severity: 'success'
                                });

                                const updatedColumn = {
                                    ...destColumn,
                                    itemIds: destColumn.itemIds.map(id => id === destPersonnelId ? boardId : id)
                                };
                                triggerChainReaction(newPerson, updatedColumn);
                                return; // Exit early - replacement done
                            }
                            // Enforce limits for Swap (2) and Three-way (3)
                            const maxLimit = destColumn.chainType === 'swap' ? 2
                                : destColumn.chainType === 'three-way' ? 3
                                    : Infinity;

                            // Also check transactionType if available
                            let limitType = '';
                            if (destColumn.chainType === 'swap' || (destColumn.vacantPosition?.transactionType === 'two-way')) {
                                if (destColumn.itemIds.length >= 2) limitType = 'สลับตำแหน่ง (2 คน)';
                            } else if (destColumn.chainType === 'three-way' || (destColumn.vacantPosition?.transactionType === 'three-way')) {
                                if (destColumn.itemIds.length >= 3) limitType = 'สามเส้า (3 คน)';
                            }

                            if (limitType || destColumn.itemIds.length >= maxLimit) {
                                setSnackbar({
                                    open: true,
                                    message: limitType ? `❌ รายการ "${limitType}" เต็มแล้ว` : `❌ เลนนี้จำกัดสูงสุด ${maxLimit} คน`,
                                    severity: 'error'
                                });
                                return;
                            }

                            // For swap lanes: set toPosition based on existing person
                            if (destColumn.vacantPosition?.isTransaction) {
                                const type = destColumn.vacantPosition.transactionType;

                                if (type === 'two-way' && destColumn.itemIds.length === 1) {
                                    const existingPersonId = destColumn.itemIds[0];
                                    const existingPerson = personnelMap[existingPersonId];
                                    if (existingPerson) {
                                        // Set new person's toPosition = existing person's position
                                        newPerson = {
                                            ...newPerson,
                                            toPosCodeId: existingPerson.posCodeId,
                                            toPosCodeMaster: existingPerson.posCodeMaster,
                                            toPosition: existingPerson.position,
                                            toPositionNumber: existingPerson.positionNumber,
                                            toUnit: existingPerson.unit,
                                        };

                                        let destIndex = destColumn.itemIds.indexOf(destPersonnelId);
                                        if (edge === 'bottom') destIndex++;

                                        // Update existing person's toPosition = new person's position
                                        setPersonnelMap(prev => ({
                                            ...prev,
                                            [existingPersonId]: {
                                                ...existingPerson,
                                                toPosCodeId: person.posCodeId,
                                                toPosCodeMaster: person.posCodeMaster,
                                                toPosition: person.position,
                                                toPositionNumber: person.positionNumber,
                                                toUnit: person.unit,
                                            },
                                            [boardId]: newPerson
                                        }));
                                        setColumns(prev => prev.map(c => {
                                            if (c.id === destColumn.id) {
                                                const newItemIds = [...c.itemIds];
                                                newItemIds.splice(destIndex, 0, boardId);
                                                const newTitle = `สลับ: ${existingPerson.fullName} ↔ ${newPerson.fullName}`;
                                                return { ...c, title: newTitle, itemIds: newItemIds };
                                            }
                                            return c;
                                        }));

                                        triggerChainReaction(newPerson, destColumn);
                                        return; // Exit early
                                    }
                                }
                            }

                            let destIndex = destColumn.itemIds.indexOf(destPersonnelId);
                            if (edge === 'bottom') destIndex++;

                            const newItemIds = [...destColumn.itemIds];
                            newItemIds.splice(destIndex, 0, boardId);

                            setPersonnelMap(prev => ({ ...prev, [boardId]: newPerson }));
                            setColumns(prev => prev.map(c => {
                                if (c.id === destColumn.id) {
                                    let newTitle = c.title;
                                    const isSwapLane = c.chainType === 'swap' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'two-way');
                                    const isThreeWayLane = c.chainType === 'three-way' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'three-way');

                                    if (isSwapLane) {
                                        const names = newItemIds.map(itemId => {
                                            if (itemId === boardId) return newPerson.fullName || '?';
                                            return (personnelMap[itemId]?.fullName || '?');
                                        });
                                        if (names.length === 1) {
                                            newTitle = `สลับ: ${names[0]} ↔ ?`;
                                        } else if (names.length === 2) {
                                            newTitle = `สลับ: ${names[0]} ↔ ${names[1]}`;
                                        }
                                    } else if (isThreeWayLane) {
                                        const names = newItemIds.map(itemId => {
                                            if (itemId === boardId) return newPerson.fullName || '?';
                                            return (personnelMap[itemId]?.fullName || '?');
                                        });
                                        newTitle = `สามเส้า: ${names.join(' → ')}`;
                                    }

                                    return { ...c, title: newTitle, itemIds: newItemIds };
                                }
                                return c;
                            }));

                            const updatedColumn = { ...destColumn, itemIds: newItemIds };
                            triggerChainReaction(newPerson, updatedColumn);
                        }

                    }
                }

                // Handle card reorder within/between lanes (Supports Multiple Selection)
                if (sourceData.type === 'card') {
                    const sourcePersonnelId = sourceData.personnelId as string;
                    const isMultiple = selectedIds.includes(sourcePersonnelId);
                    const movingIds = isMultiple ? selectedIds : [sourcePersonnelId];

                    // Find where we are dropping
                    let destColumnId: string | null = null;
                    let targetIndex: number | null = null;

                    if (destData.type === 'lane') {
                        destColumnId = destData.laneId as string;
                        targetIndex = columns.find(c => c.id === destColumnId)?.itemIds.length || 0;
                    } else if (destData.type === 'card' && destData.personnelId) {
                        const destPersonnelId = destData.personnelId as string;
                        const edge = extractClosestEdge(destData);
                        const destColumn = columns.find(c => c.itemIds.includes(destPersonnelId));
                        if (destColumn) {
                            destColumnId = destColumn.id;
                            targetIndex = destColumn.itemIds.indexOf(destPersonnelId);
                            if (edge === 'bottom') targetIndex++;
                        }
                    }

                    if (destColumnId && targetIndex !== null) {
                        const destCol = columns.find(c => c.id === destColumnId);

                        if (destCol) {
                            // Enforce limits for Swap (2) and Three-way (3)
                            const maxLimit = destCol.chainType === 'swap' ? 2
                                : destCol.chainType === 'three-way' ? 3
                                    : Infinity;

                            const currentCount = destCol.itemIds.length;
                            const itemsAlreadyInColumn = movingIds.filter(id => destCol.itemIds.includes(id)).length;
                            const newProspectiveCount = currentCount - itemsAlreadyInColumn + movingIds.length;

                            // Also check transactionType if available
                            let limitType = '';
                            if (destCol.chainType === 'swap' || (destCol.vacantPosition?.transactionType === 'two-way')) {
                                if (newProspectiveCount > 2) limitType = 'สลับตำแหน่ง (2 คน)';
                            } else if (destCol.chainType === 'three-way' || (destCol.vacantPosition?.transactionType === 'three-way')) {
                                if (newProspectiveCount > 3) limitType = 'สามเส้า (3 คน)';
                            }

                            if (limitType || newProspectiveCount > maxLimit) {
                                setSnackbar({
                                    open: true,
                                    message: limitType ? `❌ รายการ "${limitType}" เต็มแล้ว` : `❌ เลนนี้จำกัดสูงสุด ${maxLimit} คน`,
                                    severity: 'error'
                                });
                                return;
                            }
                        }



                        const personObject = personnelMap[movingIds[0]]; // Just trigger for the first one if multiple

                        // Check if this is a cross-lane move and update toPosition
                        const sourceColId = columns.find(c => c.itemIds.some(id => movingIds.includes(id)))?.id;
                        const isMovingToNewLane = sourceColId !== destColumnId;

                        if (isMovingToNewLane && destCol) {
                            const isDestSwapLane = destCol.chainType === 'swap' || (destCol.vacantPosition?.isTransaction && destCol.vacantPosition.transactionType === 'two-way');
                            const isDestThreeWayLane = destCol.chainType === 'three-way' || (destCol.vacantPosition?.isTransaction && destCol.vacantPosition.transactionType === 'three-way');
                            const isDestPromotionLane = !isDestSwapLane && !isDestThreeWayLane && destCol.vacantPosition;

                            // Update toPosition for all moving personnel
                            setPersonnelMap(prev => {
                                const newMap = { ...prev };
                                for (const id of movingIds) {
                                    const person = newMap[id];
                                    if (person) {
                                        if (isDestPromotionLane && destCol.vacantPosition) {
                                            // Promotion/Transfer lane: 
                                            // We don't overwrite blindly here because recalculateColumnToPositions 
                                            // will handle the chain succession for Lv 1, Lv 2, etc.
                                        } else if (isDestSwapLane) {
                                            // Swap lane: will be handled below after columns update
                                        } else {
                                            // Clear toPosition for non-promotion lanes without vacantPosition
                                            newMap[id] = {
                                                ...person,
                                                toPosCodeId: undefined,
                                                toPosCodeMaster: undefined,
                                                toPosition: undefined,
                                                toPositionNumber: undefined,
                                                toUnit: undefined,
                                            };
                                        }
                                    }
                                }
                                return newMap;
                            });
                        }

                        commitAction();
                        // Multi-drop logic
                        setColumns(prev => {
                            // 1. Remove all moving IDs from their current columns
                            const cleanedColumns = prev.map(c => ({
                                ...c,
                                itemIds: c.itemIds.filter(id => !movingIds.includes(id))
                            }));

                            // 2. Insert all moving IDs into the destination column at targetIndex
                            return cleanedColumns.map(c => {
                                if (c.id === destColumnId) {
                                    const newItemIds = [...c.itemIds];
                                    // Adjust target index if some items were removed before it in the same column
                                    const itemsRemovedBeforeTarget = prev.find(col => col.id === destColumnId)!.itemIds
                                        .slice(0, targetIndex)
                                        .filter(id => movingIds.includes(id)).length;

                                    const actualIndex = targetIndex - itemsRemovedBeforeTarget;
                                    newItemIds.splice(actualIndex, 0, ...movingIds);

                                    // Update title for three-way lanes
                                    let newTitle = c.title;
                                    const isThreeWayLane = c.chainType === 'three-way' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'three-way');
                                    if (isThreeWayLane && newItemIds.length >= 2) {
                                        const names = newItemIds.map(itemId => personnelMap[itemId]?.fullName || '?');
                                        newTitle = `สามเส้า: ${names.join(' → ')}`;
                                    }

                                    // Update title for swap lanes
                                    const isSwapLane = c.chainType === 'swap' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'two-way');
                                    if (isSwapLane && newItemIds.length === 2) {
                                        const p1 = personnelMap[newItemIds[0]];
                                        const p2 = personnelMap[newItemIds[1]];
                                        newTitle = `สลับ: ${p1?.fullName || '?'} ↔ ${p2?.fullName || '?'}`;
                                    }

                                    return { ...c, title: newTitle, itemIds: newItemIds };
                                }
                                return c;
                            });
                        });

                        // After reorder or adding - Recalculate 'toPosition' for chains
                        const isDestChain = destCol && (destCol.chainType === 'promotion' ||
                            (destCol.vacantPosition && (destCol.vacantPosition.transactionType === 'transfer' || destCol.vacantPosition.transactionType === 'promotion-chain')) ||
                            (destCol.vacantPosition && !destCol.vacantPosition.isTransaction));

                        if (isDestChain) {
                            // Trigger recalculation after state update to ensure itemIds are correct
                            setTimeout(() => {
                                setColumns(currentCols => {
                                    const col = currentCols.find(c => c.id === destColumnId);
                                    if (col) {
                                        recalculateColumnToPositions(destColumnId, col.itemIds, col.vacantPosition, col);
                                    }
                                    return currentCols;
                                });
                            }, 50);
                        }

                        // For swap lanes: update toPosition for both people when lane has 2 people
                        if (destCol && isMovingToNewLane) {
                            const isDestSwapLane = destCol.chainType === 'swap' || (destCol.vacantPosition?.isTransaction && destCol.vacantPosition.transactionType === 'two-way');
                            if (isDestSwapLane) {
                                // Get final itemIds for destCol after columns update
                                setTimeout(() => {
                                    const finalDestCol = columns.find(c => c.id === destColumnId);
                                    if (finalDestCol && finalDestCol.itemIds.length === 2) {
                                        const [id1, id2] = finalDestCol.itemIds;
                                        const p1 = personnelMap[id1];
                                        const p2 = personnelMap[id2];
                                        if (p1 && p2) {
                                            setPersonnelMap(prev => ({
                                                ...prev,
                                                [id1]: {
                                                    ...prev[id1],
                                                    toPosCodeId: p2.posCodeId,
                                                    toPosCodeMaster: p2.posCodeMaster,
                                                    toPosition: p2.position,
                                                    toPositionNumber: p2.positionNumber,
                                                    toUnit: p2.unit,
                                                },
                                                [id2]: {
                                                    ...prev[id2],
                                                    toPosCodeId: p1.posCodeId,
                                                    toPosCodeMaster: p1.posCodeMaster,
                                                    toPosition: p1.position,
                                                    toPositionNumber: p1.positionNumber,
                                                    toUnit: p1.unit,
                                                }
                                            }));
                                        }
                                    }
                                }, 100);
                            }
                        }

                        if (destCol && personObject) {
                            triggerChainReaction(personObject, destCol);
                        }
                        // Clear selection after move
                        if (isMultiple) clearSelection();
                    }
                }

                // Handle lane reorder
                if (sourceData.type === 'lane' && destData.type === 'lane') {
                    const sourceId = sourceData.laneId as string;
                    const targetId = destData.laneId as string;
                    if (sourceId === targetId) return;

                    const startIndex = columns.findIndex(c => c.id === sourceId);
                    const targetIndex = columns.findIndex(c => c.id === targetId);
                    if (startIndex === -1 || targetIndex === -1) return;

                    const edge = extractClosestEdge(destData);

                    // Compute new order first
                    const reorderedColumns = reorder({
                        list: columns,
                        startIndex: startIndex,
                        finishIndex: targetIndex,
                    });

                    commitAction();
                    setColumns(reorderedColumns);
                    setHasUnsavedChanges(true);

                    // Save immediately with the reordered columns
                    saveBoardData(selectedYear, reorderedColumns, personnelMap);

                    return; // Exit early to prevent double setting
                }
                setHasUnsavedChanges(true);
            },
        });
    }, [columns, selectedIds, clearSelection, commitAction, personnelMap, selectedYear, saveBoardData]);

    // Add to lane handler
    // Recalculate 'toPosition' fields for all personnel in a specific column (for chains)
    const recalculateColumnToPositions = useCallback((columnId: string, customItemIds?: string[], customVacantPos?: any, customColumn?: Column) => {
        setPersonnelMap(prevMap => {
            const columnFromState = columns.find(c => c.id === columnId);
            const activeColumn = customColumn || columnFromState;
            const itemIds = customItemIds || activeColumn?.itemIds;
            const vacantPos = customVacantPos || activeColumn?.vacantPosition;

            if (!itemIds) return prevMap;

            // Determine if this is a chain-type lane (Promotion, Transfer, or anything with a vacant destination)
            const isChain = activeColumn?.chainType === 'promotion' ||
                activeColumn?.chainType === 'transfer' ||
                (vacantPos?.transactionType === 'transfer' || vacantPos?.transactionType === 'promotion-chain') ||
                (vacantPos && !vacantPos.isTransaction);

            const isSwap = activeColumn?.chainType === 'swap' || (vacantPos?.isTransaction && vacantPos.transactionType === 'two-way');
            const isThreeWay = activeColumn?.chainType === 'three-way' || (vacantPos?.isTransaction && vacantPos.transactionType === 'three-way');

            const newMap = { ...prevMap };

            if (!isChain && !isSwap && !isThreeWay) {
                return prevMap;
            }

            if (isChain && vacantPos) {
                itemIds.forEach((itemId, index) => {
                    const person = newMap[itemId];
                    if (!person) return;

                    if (index === 0) {
                        // Level 1 -> Points to the Vacant Position / Destination Unit
                        newMap[itemId] = {
                            ...person,
                            toPosCodeId: vacantPos.posCodeMaster?.id || vacantPos.posCodeId || null,
                            toPosCodeMaster: vacantPos.posCodeMaster || null,
                            toPosition: vacantPos.position || null,
                            toPositionNumber: vacantPos.positionNumber || null,
                            toUnit: vacantPos.unit || null,
                            toActingAs: vacantPos.actingAs || null
                        };
                    } else {
                        // Level 2+ -> Points to the previous person's ORIGINAL position (succession)
                        const prevId = itemIds[index - 1];
                        const prevPerson = newMap[prevId];
                        if (prevPerson) {
                            newMap[itemId] = {
                                ...person,
                                toPosCodeId: prevPerson.posCodeId || null,
                                toPosCodeMaster: prevPerson.posCodeMaster || null,
                                toPosition: prevPerson.position || null,
                                toPositionNumber: prevPerson.positionNumber || null,
                                toUnit: prevPerson.unit || null,
                                toActingAs: prevPerson.actingAs || null
                            };
                        } else {
                            newMap[itemId] = {
                                ...person,
                                toPosCodeId: null,
                                toPosCodeMaster: null,
                                toPosition: null,
                                toPositionNumber: null,
                                toUnit: null,
                                toActingAs: null
                            };
                        }
                    }
                });
            } else if (isSwap && itemIds.length === 2) {
                // Circular swap A <-> B
                itemIds.forEach((itemId, index) => {
                    const person = newMap[itemId];
                    if (!person) return;

                    const otherItemId = itemIds[index === 0 ? 1 : 0];
                    const otherPerson = newMap[otherItemId];
                    if (otherPerson) {
                        newMap[itemId] = {
                            ...person,
                            toPosCodeId: otherPerson.posCodeId || null,
                            toPosCodeMaster: otherPerson.posCodeMaster || null,
                            toPosition: otherPerson.position || null,
                            toPositionNumber: otherPerson.positionNumber || null,
                            toUnit: otherPerson.unit || null,
                            toActingAs: otherPerson.actingAs || null
                        };
                    }
                });
            } else if (isThreeWay && itemIds.length === 3) {
                // Circular swap A -> B -> C -> A
                itemIds.forEach((itemId, index) => {
                    const person = newMap[itemId];
                    if (!person) return;

                    const nextIndex = (index + 1) % 3;
                    const nextItemId = itemIds[nextIndex];
                    const nextPerson = newMap[nextItemId];
                    if (nextPerson) {
                        newMap[itemId] = {
                            ...person,
                            toPosCodeId: nextPerson.posCodeId || null,
                            toPosCodeMaster: nextPerson.posCodeMaster || null,
                            toPosition: nextPerson.position || null,
                            toPositionNumber: nextPerson.positionNumber || null,
                            toUnit: nextPerson.unit || null,
                            toActingAs: nextPerson.actingAs || null
                        };
                    }
                });
            }

            return newMap;
        });
    }, [columns]);

    const handleAddToLane = useCallback((person: Personnel, laneId: string) => {
        commitAction();
        const lane = columns.find(c => c.id === laneId);

        // Enforce limits for Swap (2) and Three-way (3)
        if (lane) {
            const maxLimit = lane.chainType === 'swap' ? 2
                : lane.chainType === 'three-way' ? 3
                    : Infinity;

            // Also check transactionType if available
            let limitType = '';
            if (lane.chainType === 'swap' || (lane.vacantPosition?.transactionType === 'two-way')) {
                if (lane.itemIds.length >= 2) limitType = 'สลับตำแหน่ง (2 คน)';
            } else if (lane.chainType === 'three-way' || (lane.vacantPosition?.transactionType === 'three-way')) {
                if (lane.itemIds.length >= 3) limitType = 'สามเส้า (3 คน)';
            }

            if (limitType || lane.itemIds.length >= maxLimit) {
                setSnackbar({
                    open: true,
                    message: limitType ? `❌ รายการ "${limitType}" เต็มแล้ว` : `❌ เลนนี้จำกัดสูงสุด ${maxLimit} คน`,
                    severity: 'error'
                });
                return;
            }
        }



        const boardId = `${person.id}-board-${Date.now()}`;
        let newPerson: Personnel = { ...person, id: boardId, originalId: person.id };

        // Determine to position based on lane type
        const isSwapLane = lane?.chainType === 'swap' || (lane?.vacantPosition?.isTransaction && lane?.vacantPosition.transactionType === 'two-way');
        const isThreeWayLane = lane?.chainType === 'three-way' || (lane?.vacantPosition?.isTransaction && lane?.vacantPosition.transactionType === 'three-way');
        const isPromotionLane = lane?.chainType === 'promotion' || (!isSwapLane && !isThreeWayLane && lane?.vacantPosition);

        if (isSwapLane && lane && lane.itemIds.length === 1) {
            // Swap lane with 1 person already: set toPosition for both
            const existingPersonId = lane.itemIds[0];
            const existingPerson = personnelMap[existingPersonId];
            if (existingPerson) {
                // Set new person's toPosition = existing person's position
                newPerson = {
                    ...newPerson,
                    toPosCodeId: existingPerson.posCodeId,
                    toPosCodeMaster: existingPerson.posCodeMaster,
                    toPosition: existingPerson.position,
                    toPositionNumber: existingPerson.positionNumber,
                    toUnit: existingPerson.unit,
                };

                // Update existing person's toPosition = new person's position
                setPersonnelMap(prev => ({
                    ...prev,
                    [existingPersonId]: {
                        ...existingPerson,
                        toPosCodeId: person.posCodeId,
                        toPosCodeMaster: person.posCodeMaster,
                        toPosition: person.position,
                        toPositionNumber: person.positionNumber,
                        toUnit: person.unit,
                    },
                    [boardId]: newPerson
                }));

                setColumns(prev => prev.map(c => {
                    if (c.id !== laneId) return c;
                    const newItemIds = [...c.itemIds, boardId];
                    const newTitle = `สลับ: ${existingPerson.fullName} ↔ ${newPerson.fullName}`;
                    return { ...c, title: newTitle, itemIds: newItemIds };
                }));
                setHasUnsavedChanges(true);
                return; // Exit early
            }
        } else if (isPromotionLane && lane?.vacantPosition) {
            // Promotion/Transfer chain lane: 
            // Level 1: points to vacantPosition/destinationUnit
            // Level 2+: points to former position of the person in front (Level N-1)

            if (lane.itemIds.length === 0) {
                // First person (Level 1)
                newPerson = {
                    ...newPerson,
                    toPosCodeId: lane.vacantPosition.posCodeMaster?.id || lane.vacantPosition.posCodeId,
                    toPosCodeMaster: lane.vacantPosition.posCodeMaster,
                    toPosition: lane.vacantPosition.position,
                    toPositionNumber: lane.vacantPosition.positionNumber,
                    toUnit: lane.vacantPosition.unit,
                };
            } else {
                // Subsequent person (Level 2+) -> points to previous person
                const prevPersonId = lane.itemIds[lane.itemIds.length - 1];
                const prevPerson = personnelMap[prevPersonId];
                if (prevPerson) {
                    newPerson = {
                        ...newPerson,
                        toPosCodeId: prevPerson.posCodeId,
                        toPosCodeMaster: prevPerson.posCodeMaster,
                        toPosition: prevPerson.position,
                        toPositionNumber: prevPerson.positionNumber,
                        toUnit: prevPerson.unit,
                    };
                }
            }
        }

        setPersonnelMap(prev => ({ ...prev, [boardId]: newPerson }));
        setColumns(prev => prev.map(c => {
            if (c.id !== laneId) return c;

            const newItemIds = [...c.itemIds, boardId];
            let newTitle = c.title;

            // Update title for three-way lanes
            if (isThreeWayLane) {
                const names = newItemIds.map(itemId => {
                    if (itemId === boardId) return newPerson.fullName || '?';
                    return personnelMap[itemId]?.fullName || '?';
                });
                newTitle = `สามเส้า: ${names.join(' → ')}`;
            }

            // Update title for swap lanes
            if (isSwapLane) {
                if (newItemIds.length === 1) {
                    newTitle = `สลับ: ${newPerson.fullName || '?'} ↔ ?`;
                } else if (newItemIds.length === 2) {
                    const p1 = personnelMap[newItemIds[0]] || newPerson;
                    const p2 = newItemIds[1] === boardId ? newPerson : personnelMap[newItemIds[1]];
                    newTitle = `สลับ: ${p1?.fullName || '?'} ↔ ${p2?.fullName || '?'}`;
                }
            }

            const isTransferLane = c.chainType === 'transfer' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'transfer');
            if (isTransferLane) {
                const nextMap: Record<string, Personnel> = {
                    ...personnelMap,
                    [boardId]: newPerson,
                };
                newTitle = getTransferLaneTitle(c, newItemIds, nextMap);
            }

            return { ...c, title: newTitle, itemIds: newItemIds };
        }));
        setHasUnsavedChanges(true);

        // Recalculate chain toPositions
        setTimeout(() => {
            setColumns(currentCols => {
                const col = currentCols.find(c => c.id === laneId);
                if (col) {
                    recalculateColumnToPositions(laneId, col.itemIds, col.vacantPosition, col);
                }
                return currentCols;
            });
        }, 50);
    }, [columns, commitAction, personnelMap, recalculateColumnToPositions]);

    // Remove from board handler
    const handleRemoveFromBoard = (personId: string) => {
        commitAction();

        // Find the lane containing this person
        const sourceLane = columns.find(c => c.itemIds.includes(personId));

        setColumns(prev => prev.map(col => {
            if (!col.itemIds.includes(personId)) return col;

            const newItemIds = col.itemIds.filter(id => id !== personId);
            let newTitle = col.title;

            // Update title for three-way lanes
            const isThreeWayLane = col.chainType === 'three-way' || (col.vacantPosition?.isTransaction && col.vacantPosition.transactionType === 'three-way');
            if (isThreeWayLane) {
                if (newItemIds.length >= 2) {
                    const names = newItemIds.map(itemId => personnelMap[itemId]?.fullName || '?');
                    newTitle = `สามเส้า: ${names.join(' → ')}`;
                } else if (newItemIds.length === 1) {
                    newTitle = `สามเส้า: ${personnelMap[newItemIds[0]]?.fullName || '?'} → ?`;
                } else {
                    newTitle = 'สามเส้า: ? → ? → ?';
                }
            }

            // Update title for swap lanes
            const isSwapLane = col.chainType === 'swap' || (col.vacantPosition?.isTransaction && col.vacantPosition.transactionType === 'two-way');
            if (isSwapLane) {
                if (newItemIds.length === 1) {
                    newTitle = `สลับ: ${personnelMap[newItemIds[0]]?.fullName || '?'} ↔ ?`;
                } else if (newItemIds.length === 0) {
                    newTitle = 'สลับตำแหน่ง';
                }
            }

            const isTransferLane = col.chainType === 'transfer' || (col.vacantPosition?.isTransaction && col.vacantPosition.transactionType === 'transfer');
            if (isTransferLane) {
                newTitle = getTransferLaneTitle(col, newItemIds, personnelMap);
            }

            return { ...col, title: newTitle, itemIds: newItemIds };
        }));

        // Remove from personnelMap so assignedIds updates and person reappears in left panel
        setPersonnelMap(prev => {
            const newMap = { ...prev };
            delete newMap[personId];
            return newMap;
        });

        if (sourceLane) {
            setTimeout(() => {
                setColumns(currentCols => {
                    const col = currentCols.find(c => c.id === sourceLane.id);
                    if (col) {
                        recalculateColumnToPositions(sourceLane.id, col.itemIds, col.vacantPosition, col);
                    }
                    return currentCols;
                });
            }, 50);
        }

        setHasUnsavedChanges(true);
    };


    const handleUpdatePersonnel = useCallback((id: string, updates: Partial<Personnel>) => {
        commitAction();
        setPersonnelMap(prev => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], ...updates }
            };
        });

        // If fullName was updated, also update the lane title for swap/three-way lanes
        if (updates.fullName) {
            setColumns(prev => prev.map(col => {
                // Only update if this person is in this lane AND it's a swap or three-way lane
                if (!col.itemIds.includes(id)) return col;

                const isSwapLane = col.chainType === 'swap' || (col.vacantPosition?.isTransaction && col.vacantPosition.transactionType === 'two-way');
                const isThreeWayLane = col.chainType === 'three-way' || (col.vacantPosition?.isTransaction && col.vacantPosition.transactionType === 'three-way');
                const isTransferLane = col.chainType === 'transfer' || (col.vacantPosition?.isTransaction && col.vacantPosition.transactionType === 'transfer');

                if (isSwapLane && col.itemIds.length === 2) {
                    // Swap: 2 people - format "สลับ: A ↔ B"
                    const p1 = col.itemIds[0] === id ? { ...personnelMap[col.itemIds[0]], ...updates } : personnelMap[col.itemIds[0]];
                    const p2 = col.itemIds[1] === id ? { ...personnelMap[col.itemIds[1]], ...updates } : personnelMap[col.itemIds[1]];
                    const newTitle = `สลับ: ${p1?.fullName || '?'} ↔ ${p2?.fullName || '?'}`;
                    return { ...col, title: newTitle };
                } else if (isThreeWayLane && col.itemIds.length >= 2) {
                    // Three-way: up to 3 people - format "สามเส้า: A → B → C"
                    const names = col.itemIds.map(itemId => {
                        if (itemId === id) return updates.fullName;
                        return personnelMap[itemId]?.fullName || '?';
                    });
                    const newTitle = `สามเส้า: ${names.join(' → ')}`;
                    return { ...col, title: newTitle };
                } else if (isTransferLane) {
                    const nextMap: Record<string, Personnel> = {
                        ...personnelMap,
                        [id]: { ...personnelMap[id], ...updates },
                    };
                    const newTitle = getTransferLaneTitle(col, col.itemIds, nextMap);
                    return { ...col, title: newTitle };
                }

                return col;
            }));
        }

        setHasUnsavedChanges(true);
    }, [commitAction]);

    // Toggle lane completion status
    const handleToggleComplete = useCallback((columnId: string) => {
        commitAction();
        setColumns(prev => prev.map(col =>
            col.id === columnId ? { ...col, isCompleted: !col.isCompleted } : col
        ));
        setHasUnsavedChanges(true);
    }, []);



    // Handle card click to open personnel detail
    const handleCardClick = useCallback((person: Personnel, targetInfo?: any) => {
        setSelectedPersonnelDetail({ personnel: person, targetInfo });
    }, []);

    // Add placeholder card to a lane
    const handleAddPlaceholder = useCallback((columnId: string) => {
        commitAction();
        // Find the column
        const column = columns.find(c => c.id === columnId);
        if (!column) return;

        // Check lane capacity based on type
        const maxCapacity = column.chainType === 'swap' ? 2
            : column.chainType === 'three-way' ? 3
                : Infinity; // promotion and custom have no limit

        if (column.itemIds.length >= maxCapacity) {
            const typeName = column.chainType === 'swap' ? 'สลับตำแหน่ง (2 คน)'
                : column.chainType === 'three-way' ? 'สามเส้า (3 คน)'
                    : '';
            setSnackbar({
                open: true,
                message: `❌ เลนประเภท${typeName}ไม่สามารถเพิ่มได้มากกว่านี้`,
                severity: 'warning'
            });
            return;
        }

        const placeholderId = `placeholder-${Date.now()}`;

        // Create placeholder personnel
        const placeholderPersonnel: Personnel = {
            id: placeholderId,
            isPlaceholder: true,
            fullName: '(ยังไม่ระบุตัวบุคคล)',
            rank: null,
            position: null,
            unit: null,
            positionNumber: null,
            avatarUrl: null,
            notes: 'รอระบุตัวบุคคล',
        };

        // Add to personnel map
        setPersonnelMap(prev => ({
            ...prev,
            [placeholderId]: placeholderPersonnel
        }));

        // Add to column
        setColumns(prev => {
            const newCols = prev.map(col => {
                if (col.id === columnId) {
                    return { ...col, itemIds: [...col.itemIds, placeholderId] };
                }
                return col;
            });

            // Trigger recalculation for chain lanes so people after this placeholder (if any) are updated
            const targetCol = newCols.find(c => c.id === columnId);
            if (targetCol) {
                setTimeout(() => {
                    setColumns(currentCols => {
                        const col = currentCols.find(c => c.id === columnId);
                        if (col) {
                            recalculateColumnToPositions(columnId, col.itemIds, col.vacantPosition, col);
                        }
                        return currentCols;
                    });
                }, 50);
            }

            return newCols;
        });

        setHasUnsavedChanges(true);
        setSnackbar({
            open: true,
            message: '➕ เพิ่มช่องว่างในเลนเรียบร้อยแล้ว',
            severity: 'info'
        });
    }, [columns, commitAction, recalculateColumnToPositions]);

    // Remove lane handler (actual deletion)
    const handleRemoveLane = useCallback(async (laneId: string) => {
        commitAction();
        setIsDeletingLane(true);
        try {
            const lane = columns.find(c => c.id === laneId);
            if (lane) {
                lane.itemIds.forEach(id => {
                    setPersonnelMap(prev => {
                        const next = { ...prev };
                        delete next[id];
                        return next;
                    });
                });

                // ถ้าเลนเชื่อมกับ SwapTransaction ให้ลบใน DB ด้วย
                if (lane.linkedTransactionId) {
                    try {
                        const res = await fetch(`/api/swap-transactions/${lane.linkedTransactionId}?force=true`, {
                            method: 'DELETE',
                        });
                        if (res.ok) {
                            console.log(`Deleted transaction ${lane.linkedTransactionId} from DB`);
                        } else if (res.status === 404) {
                            // Transaction ไม่มีอยู่แล้ว - ถือว่าสำเร็จ
                            console.log(`Transaction ${lane.linkedTransactionId} not found in DB (already deleted)`);
                        } else {
                            const errData = await res.json().catch(() => ({}));
                            console.error('Failed to delete transaction from DB:', errData?.error || res.statusText);
                        }
                    } catch (err) {
                        console.error('Error deleting transaction:', err);
                    }
                }
            }
            setColumns(prev => prev.filter(c => c.id !== laneId));
            setHasUnsavedChanges(true);
            setDeleteLaneConfirm({ open: false, laneId: null, laneTitle: '' });
        } finally {
            setIsDeletingLane(false);
        }
    }, [columns, commitAction]);

    // Confirm remove lane (show dialog)
    const confirmRemoveLane = useCallback((laneId: string) => {
        const lane = columns.find(c => c.id === laneId);
        setDeleteLaneConfirm({
            open: true,
            laneId,
            laneTitle: lane?.title || ''
        });
    }, [columns]);

    const triggerChainReaction = useCallback((personnel: Personnel, targetColumn: Column) => {
        // Trigger if dropping into a vacant position OR a promotion chain
        if (!targetColumn.vacantPosition) {
            // Even without vacantPosition, we might need to recalculate if it's a swap/three-way
            if (targetColumn.chainType === 'swap' || targetColumn.chainType === 'three-way') {
                recalculateColumnToPositions(targetColumn.id, targetColumn.itemIds, targetColumn.vacantPosition, targetColumn);
            }
            return;
        }

        // If it's a promotion-type lane, mark it if not already
        const isPromotionType = targetColumn.chainType === 'promotion' ||
            (targetColumn.vacantPosition.isTransaction && (targetColumn.vacantPosition.transactionType === 'transfer' || targetColumn.vacantPosition.transactionType === 'promotion-chain'));

        if (isPromotionType && targetColumn.chainType !== 'promotion') {
            setColumns(prev => prev.map(c =>
                c.id === targetColumn.id
                    ? { ...c, chainType: 'promotion', chainId: targetColumn.chainId || `chain-${Date.now()}` }
                    : c
            ));
        }

        // Recalculate toPosition for the whole column
        recalculateColumnToPositions(targetColumn.id, targetColumn.itemIds, targetColumn.vacantPosition, targetColumn);
    }, [recalculateColumnToPositions]);

    // Add new lane
    const handleMovePersonToLane = useCallback((personId: string, targetLaneId: string) => {
        commitAction();
        const sourceLane = columns.find(c => c.itemIds.includes(personId));
        if (!sourceLane) return;

        const person = personnelMap[personId];
        if (!person) return;

        const targetLane = columns.find(c => c.id === targetLaneId);
        if (!targetLane) return;

        // Enforce limits for Swap (2) and Three-way (3)
        const maxLimit = targetLane.chainType === 'swap' ? 2
            : targetLane.chainType === 'three-way' ? 3
                : Infinity;

        let limitType = '';
        if (targetLane.chainType === 'swap' || (targetLane.vacantPosition?.transactionType === 'two-way')) {
            if (targetLane.itemIds.length >= 2) limitType = 'สลับตำแหน่ง (2 คน)';
        } else if (targetLane.chainType === 'three-way' || (targetLane.vacantPosition?.transactionType === 'three-way')) {
            if (targetLane.itemIds.length >= 3) limitType = 'สามเส้า (3 คน)';
        }

        if (limitType || targetLane.itemIds.length >= maxLimit) {
            setSnackbar({
                open: true,
                message: limitType ? `❌ รายการ "${limitType}" เต็มแล้ว` : `❌ เลนนี้จำกัดสูงสุด ${maxLimit} คน`,
                severity: 'error'
            });
            return;
        }

        let newPerson: Personnel = {
            ...person,
            // Reset toPosition fields when moving to a new lane context
            // They will be recalculated shortly if it's a chain lane
            toPosCodeId: null,
            toPosCodeMaster: null,
            toPosition: null,
            toPositionNumber: null,
            toUnit: null,
            toActingAs: null
        };
        const boardId = personId;

        // Special logic for Swap (2-way) - auto-set toPosition if 2nd person
        if (targetLane.vacantPosition?.isTransaction && targetLane.vacantPosition.transactionType === 'two-way' && targetLane.itemIds.length === 1) {
            const existingPersonId = targetLane.itemIds[0];
            const existingPerson = personnelMap[existingPersonId];
            if (existingPerson) {
                newPerson = {
                    ...newPerson,
                    toPosCodeId: existingPerson.posCodeId || null,
                    toPosCodeMaster: existingPerson.posCodeMaster || null,
                    toPosition: existingPerson.position || null,
                    toPositionNumber: existingPerson.positionNumber || null,
                    toUnit: existingPerson.unit || null,
                    toActingAs: existingPerson.actingAs || null,
                };

                const updatedExistingPerson: Personnel = {
                    ...existingPerson,
                    toPosCodeId: person.posCodeId || null,
                    toPosCodeMaster: person.posCodeMaster || null,
                    toPosition: person.position || null,
                    toPositionNumber: person.positionNumber || null,
                    toUnit: person.unit || null,
                    toActingAs: person.actingAs || null,
                };

                setPersonnelMap(prev => ({
                    ...prev,
                    [existingPersonId]: updatedExistingPerson,
                    [boardId]: newPerson
                }));

                setColumns(prev => prev.map(c => {
                    if (c.id === sourceLane.id) {
                        return { ...c, itemIds: c.itemIds.filter(id => id !== personId) };
                    }
                    if (c.id === targetLaneId) {
                        const newTitle = `สลับ: ${existingPerson.fullName} ↔ ${newPerson.fullName}`;
                        return { ...c, title: newTitle, itemIds: [...c.itemIds, boardId] };
                    }
                    return c;
                }));

                triggerChainReaction(newPerson, targetLane);
                setHasUnsavedChanges(true);
                setSnackbar({ open: true, message: `ย้าย ${person.fullName} ไปยัง ${targetLane.title} แล้ว`, severity: 'success' });
                return;
            }
        }

        setPersonnelMap(prev => ({ ...prev, [boardId]: newPerson }));
        setColumns(prev => prev.map(c => {
            if (c.id === sourceLane.id) {
                return { ...c, itemIds: c.itemIds.filter(id => id !== personId) };
            }
            if (c.id === targetLaneId) {
                let newTitle = c.title;
                const newItemIds = [...c.itemIds, boardId];

                const isSwapLane = c.chainType === 'swap' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'two-way');
                const isThreeWayLane = c.chainType === 'three-way' || (c.vacantPosition?.isTransaction && c.vacantPosition.transactionType === 'three-way');

                // Update title for two-way (swap) lanes
                if (isSwapLane) {
                    if (newItemIds.length === 1) {
                        newTitle = `สลับ: ${newPerson.fullName || '?'} ↔ ?`;
                    } else if (newItemIds.length === 2) {
                        const p1 = personnelMap[newItemIds[0]] || newPerson;
                        const p2 = newItemIds[1] === boardId ? newPerson : personnelMap[newItemIds[1]];
                        newTitle = `สลับ: ${p1?.fullName || '?'} ↔ ${p2?.fullName || '?'}`;
                    }
                } else if (isThreeWayLane) {
                    // Get all person names including the new one
                    const names = newItemIds.map(itemId => {
                        if (itemId === boardId) return newPerson.fullName || '?';
                        return personnelMap[itemId]?.fullName || '?';
                    });
                    newTitle = `สามเส้า: ${names.join(' → ')}`;
                }


                return { ...c, title: newTitle, itemIds: newItemIds };
            }
            return c;
        }));

        triggerChainReaction(newPerson, targetLane);
        setHasUnsavedChanges(true);

        // Recalculate chain toPositions
        setTimeout(() => {
            setColumns(currentCols => {
                const col = currentCols.find(c => c.id === targetLaneId);
                if (col) {
                    recalculateColumnToPositions(targetLaneId, col.itemIds, col.vacantPosition, col);
                }
                return currentCols;
            });
        }, 50);

        setSnackbar({ open: true, message: `ย้าย ${person.fullName} ไปยัง ${targetLane.title} แล้ว`, severity: 'success' });

    }, [columns, personnelMap, triggerChainReaction, commitAction, recalculateColumnToPositions]);

    // Add new lane
    const handleAddLane = (data?: any) => {
        commitAction();
        const newId = `lane-${Date.now()}`;

        // Find max existing group number to avoid duplicates
        const existingNumbers = columns
            .filter(c => c.groupNumber?.includes('/WF-'))
            .map(c => {
                const match = c.groupNumber?.match(/WF-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            });
        const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        const runningNumber = (maxNumber + 1).toString().padStart(3, '0');
        const generatedGroupNumber = `${selectedYear}/WF-${runningNumber}`;

        let laneTitle = '';
        let vacantPositionData = null;
        let itemIds: string[] = [];
        let newPersonnel: Record<string, Personnel> = {};

        if (data?._isTransaction) {
            // Add from Transaction (Swap/Three-way)
            const tx = data._transactionData;
            laneTitle = tx.groupName || (data.fullName || 'รายการสลับ');

            // The API returns swapDetails. Iterate and create cards for each person
            const detailsList = tx.swapDetails || tx.details || [];

            if (detailsList.length > 0) {
                detailsList.forEach((detail: any, idx: number) => {
                    // Skip placeholders if they don't have personnel info and we only want real people
                    // but usually in a board we want to see everything.
                    if (detail.isPlaceholder && !detail.fullName) return;

                    const pId = detail.personnelId || detail.id || `temp-${idx}`;
                    const boardId = `board-${pId}-${Date.now()}-${idx}`;

                    const p: any = {
                        id: boardId,
                        originalId: pId,
                        noId: detail.noId,
                        nationalId: detail.nationalId,
                        fullName: detail.fullName,
                        rank: detail.rank,
                        position: detail.fromPosition || detail.position,
                        positionNumber: detail.fromPositionNumber || detail.positionNumber,
                        unit: detail.fromUnit || detail.unit,
                        posCodeId: detail.posCodeId,
                        posCodeMaster: detail.posCodeMaster,
                        // ข้อมูลส่วนตัว
                        birthDate: detail.birthDate,
                        age: detail.age,
                        education: detail.education,
                        // ข้อมูลการแต่งตั้ง
                        seniority: detail.seniority,
                        lastAppointment: detail.lastAppointment,
                        currentRankSince: detail.currentRankSince,
                        enrollmentDate: detail.enrollmentDate,
                        retirementDate: detail.retirementDate,
                        yearsOfService: detail.yearsOfService,
                        // ข้อมูลการฝึกอบรม
                        trainingLocation: detail.trainingLocation,
                        trainingCourse: detail.trainingCourse,
                        // ข้อมูลการเสนอชื่อ
                        supporterName: detail.supportName || detail.supporterName,
                        supportReason: detail.supportReason,
                        requestedPosition: detail.requestedPosition,
                        actingAs: detail.fromActingAs || detail.actingAs,
                        notes: detail.notes,
                        // ตำแหน่งปลายทาง
                        toPosCodeId: detail.toPosCodeId,
                        toPosCodeMaster: detail.toPosCodeMaster,
                        toPosition: detail.toPosition,
                        toPositionNumber: detail.toPositionNumber,
                        toUnit: detail.toUnit,
                        toActingAs: detail.toActingAs,
                        // Metadata for syncing back to SwapTransactionDetail
                        swapDetailId: detail.id, // ID of SwapTransactionDetail record
                        transactionId: tx.id,
                        transactionType: tx.swapType,
                        isPlaceholder: !detail.personnelId
                    };

                    newPersonnel[boardId] = p;
                    itemIds.push(boardId);
                });
            }

            // Still keep some metadata in vacantPosition slot if needed
            vacantPositionData = {
                id: tx.id,
                isTransaction: true,
                transactionType: tx.swapType,
                groupNumber: tx.groupNumber
            };
        } else if (data) {
            // Add from direct selection (Drawer - Vacant Position)
            const posRank = data.posCodeMaster?.name || '';
            const posTitle = data.position || '';
            const displayTitle = posRank === posTitle ? posRank : `${posRank} ${posTitle}`.trim();
            laneTitle = `${displayTitle || 'ตำแหน่งว่าง'} (${data.unit || ''})`;
            vacantPositionData = {
                id: data.id,
                noId: data.noId,
                position: data.position,
                unit: data.unit,
                positionNumber: data.positionNumber,
                posCodeMaster: data.posCodeMaster,
                actingAs: data.actingAs
            };
        } else if (addLaneTab === 4) {
            // Manual mode (สร้างเอง - Tab index 4)
            if (!newLaneTitle.trim()) return;
            laneTitle = newLaneTitle.trim();
        } else {
            // Legacy/Fallback (not used much now with newer drawer)
            if (!selectedVacantPosition) return;
            const fallbackRank = selectedVacantPosition.posCodeMaster?.name || '';
            const fallbackTitle = selectedVacantPosition.position || '';
            const fallbackDisplay = fallbackRank === fallbackTitle ? fallbackRank : `${fallbackRank} ${fallbackTitle}`.trim();
            laneTitle = `${fallbackDisplay || 'ตำแหน่งว่าง'} (${selectedVacantPosition.unit || ''})`;
            vacantPositionData = {
                id: selectedVacantPosition.id,
                noId: selectedVacantPosition.noId,
                position: selectedVacantPosition.position,
                unit: selectedVacantPosition.unit,
                positionNumber: selectedVacantPosition.positionNumber,
                posCodeMaster: selectedVacantPosition.posCodeMaster,
                actingAs: selectedVacantPosition.actingAs
            };
        }

        // Use transaction ID as Lane ID when importing from SwapTransaction
        // This maintains the link to the original transaction
        const laneId = data?._isTransaction ? data._transactionData.id : newId;

        const newColumn: Column = {
            id: laneId,
            title: laneTitle,
            groupNumber: data?._isTransaction ? data._transactionData.groupNumber : generatedGroupNumber,
            itemIds: itemIds,
            vacantPosition: vacantPositionData,
            level: 1,
            chainId: data?._isTransaction ? `chain-tx-${data._transactionData.id}` : `chain-${Date.now()}`,
            chainType: data?._isTransaction
                ? (data._transactionData.swapType === 'three-way' ? 'three-way' : (data._transactionData.swapType === 'promotion-chain' ? 'promotion' : 'swap'))
                : (vacantPositionData ? 'promotion' : 'custom'),
            // Mark as linked to original transaction (not a copy)
            linkedTransactionId: data?._isTransaction ? data._transactionData.id : undefined,
            linkedTransactionType: data?._isTransaction ? data._transactionData.swapType : undefined
        };

        if (Object.keys(newPersonnel).length > 0) {
            setPersonnelMap(prev => ({ ...prev, ...newPersonnel }));
        }

        setColumns(prev => [newColumn, ...prev]);
        setIsNewLaneDrawerOpen(false);
        setNewLaneTitle('');
        setSelectedVacantPosition(null);
        setHasUnsavedChanges(true);
        setSnackbar({ open: true, message: `เพิ่ม Lane "${laneTitle}" เรียบร้อยแล้ว`, severity: 'success' });
    };

    // Create new swap lane from selected 2 personnel (Called from Component)
    const handleCreateSwapLane = async (p1: Personnel, p2: Personnel, laneTitle: string) => {
        commitAction();
        // Find max existing SWAP number to avoid duplicates
        const existingSwapNumbers = columns
            .filter(c => c.groupNumber?.includes('/SWAP-'))
            .map(c => {
                const match = c.groupNumber?.match(/SWAP-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            });
        const maxSwapNumber = existingSwapNumbers.length > 0 ? Math.max(...existingSwapNumbers) : 0;
        const runningNumber = (maxSwapNumber + 1).toString().padStart(3, '0');
        const generatedGroupNumber = `${selectedYear}/SWAP-${runningNumber}`;

        // Generate lane title
        const title = laneTitle.trim() || `สลับ: ${p1.fullName} ↔ ${p2.fullName}`;

        try {
            // สร้าง SwapTransaction ก่อนผ่าน API
            const createRes = await fetch('/api/swap-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: selectedYear,
                    swapDate: new Date().toISOString(), // เพิ่ม swapDate
                    swapType: 'two-way',
                    groupName: title,
                    groupNumber: generatedGroupNumber,
                    swapDetails: [
                        {
                            sequence: 1,
                            personnelId: p1.id,
                            noId: p1.noId,
                            nationalId: p1.nationalId,
                            fullName: p1.fullName,
                            rank: p1.rank,
                            seniority: p1.seniority,
                            posCodeId: p1.posCodeId,
                            toPosCodeId: p2.posCodeId,
                            // ข้อมูลส่วนตัว
                            birthDate: p1.birthDate,
                            age: p1.age,
                            education: p1.education,
                            // ข้อมูลการแต่งตั้ง
                            lastAppointment: p1.lastAppointment,
                            currentRankSince: p1.currentRankSince,
                            enrollmentDate: p1.enrollmentDate,
                            retirementDate: p1.retirementDate,
                            yearsOfService: p1.yearsOfService,
                            // ข้อมูลการฝึกอบรม
                            trainingLocation: p1.trainingLocation,
                            trainingCourse: p1.trainingCourse,
                            // ข้อมูลการเสนอชื่อ
                            supportName: p1.supporterName,
                            supportReason: p1.supportReason,
                            requestedPosition: p1.requestedPosition,
                            // หมายเหตุ
                            notes: p1.notes,
                            // ตำแหน่ง
                            fromPosition: p1.position,
                            fromPositionNumber: p1.positionNumber,
                            fromUnit: p1.unit,
                            fromActingAs: p1.actingAs,
                            toPosition: p2.position,
                            toPositionNumber: p2.positionNumber,
                            toUnit: p2.unit,
                            toActingAs: p2.actingAs,
                        },
                        {
                            sequence: 2,
                            personnelId: p2.id,
                            noId: p2.noId,
                            nationalId: p2.nationalId,
                            fullName: p2.fullName,
                            rank: p2.rank,
                            seniority: p2.seniority,
                            posCodeId: p2.posCodeId,
                            toPosCodeId: p1.posCodeId,
                            // ข้อมูลส่วนตัว
                            birthDate: p2.birthDate,
                            age: p2.age,
                            education: p2.education,
                            // ข้อมูลการแต่งตั้ง
                            lastAppointment: p2.lastAppointment,
                            currentRankSince: p2.currentRankSince,
                            enrollmentDate: p2.enrollmentDate,
                            retirementDate: p2.retirementDate,
                            yearsOfService: p2.yearsOfService,
                            // ข้อมูลการฝึกอบรม
                            trainingLocation: p2.trainingLocation,
                            trainingCourse: p2.trainingCourse,
                            // ข้อมูลการเสนอชื่อ
                            supportName: p2.supporterName,
                            supportReason: p2.supportReason,
                            requestedPosition: p2.requestedPosition,
                            // หมายเหตุ
                            notes: p2.notes,
                            // ตำแหน่ง
                            fromPosition: p2.position,
                            fromPositionNumber: p2.positionNumber,
                            fromUnit: p2.unit,
                            fromActingAs: p2.actingAs,
                            toPosition: p1.position,
                            toPositionNumber: p1.positionNumber,
                            toUnit: p1.unit,
                            toActingAs: p1.actingAs,
                        }
                    ]
                }),
            });

            if (!createRes.ok) {
                throw new Error('Failed to create swap transaction');
            }

            const createData = await createRes.json();
            const transactionId = createData.data?.id;

            if (!transactionId) {
                throw new Error('No transaction ID returned');
            }

            // ใช้ transaction details จาก API response
            const details = createData.data?.swapDetails || createData.data?.details || [];

            // สร้าง personnel entries สำหรับ lane
            const itemIds: string[] = [];
            const newPersonnel: Record<string, Personnel> = {};

            if (details.length >= 2) {
                // ใช้ ID จาก SwapTransactionDetail
                const detail1 = details[0];
                const detail2 = details[1];

                const person1OnBoard: Personnel = {
                    ...p1,
                    id: detail1.id,
                    originalId: p1.id,
                    swapDetailId: detail1.id,
                    transactionId: transactionId,
                    transactionType: 'two-way',
                    toPosCodeId: p2.posCodeId,
                    toPosCodeMaster: p2.posCodeMaster,
                    toPosition: p2.position,
                    toPositionNumber: p2.positionNumber,
                    toUnit: p2.unit,
                };

                const person2OnBoard: Personnel = {
                    ...p2,
                    id: detail2.id,
                    originalId: p2.id,
                    swapDetailId: detail2.id,
                    transactionId: transactionId,
                    transactionType: 'two-way',
                    toPosCodeId: p1.posCodeId,
                    toPosCodeMaster: p1.posCodeMaster,
                    toPosition: p1.position,
                    toPositionNumber: p1.positionNumber,
                    toUnit: p1.unit,
                };

                itemIds.push(detail1.id, detail2.id);
                newPersonnel[detail1.id] = person1OnBoard;
                newPersonnel[detail2.id] = person2OnBoard;
            }

            const newColumn: Column = {
                id: transactionId, // ใช้ transaction ID เป็น lane ID
                title: title,
                groupNumber: generatedGroupNumber,
                itemIds: itemIds,
                vacantPosition: {
                    isTransaction: true,
                    transactionType: 'two-way',
                    groupNumber: generatedGroupNumber
                },
                level: 1,
                chainId: `chain-tx-${transactionId}`,
                chainType: 'swap',
                // เชื่อมโยงกับ transaction ID เพื่อไม่ให้สร้างซ้ำ
                linkedTransactionId: transactionId,
                linkedTransactionType: 'two-way',
            };

            // Add personnel to map
            setPersonnelMap(prev => ({
                ...prev,
                ...newPersonnel
            }));

            // Add column
            setColumns(prev => [newColumn, ...prev]);

            setIsNewLaneDrawerOpen(false);
            setHasUnsavedChanges(true); // เปลี่ยนเป็น true เพื่อให้ user กด save อีกที หรือ autosave ทำงาน
            setSnackbar({ open: true, message: `สร้างเลน "สลับตำแหน่ง" สำเร็จ`, severity: 'success' });

        } catch (error) {
            console.error('Error creating swap lane:', error);
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการสร้างเลน', severity: 'error' });
        }
    };

    // Create new 3-way swap lane (Called from Component)
    const handleCreateThreeWayLane = async (p1: Personnel, p2: Personnel, p3: Personnel, laneTitle: string) => {
        commitAction();
        // Find max existing THREE number to avoid duplicates
        const existingThreeNumbers = columns
            .filter(c => c.groupNumber?.includes('/THREE-'))
            .map(c => {
                const match = c.groupNumber?.match(/THREE-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            });
        const maxThreeNumber = existingThreeNumbers.length > 0 ? Math.max(...existingThreeNumbers) : 0;
        const runningNumber = (maxThreeNumber + 1).toString().padStart(3, '0');
        const generatedGroupNumber = `${selectedYear}/THREE-${runningNumber}`;
        const title = laneTitle.trim() || `สามเส้า: ${p1.fullName} → ${p2.fullName} → ${p3.fullName} → ${p1.fullName}`;

        try {
            const createRes = await fetch('/api/swap-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: selectedYear,
                    swapDate: new Date().toISOString(),
                    swapType: 'three-way',
                    groupName: title,
                    groupNumber: generatedGroupNumber,
                    swapDetails: [
                        {
                            sequence: 1,
                            personnelId: p1.id,
                            noId: p1.noId,
                            nationalId: p1.nationalId,
                            fullName: p1.fullName,
                            rank: p1.rank,
                            seniority: p1.seniority,
                            posCodeId: p1.posCodeId,
                            toPosCodeId: p2.posCodeId,
                            // ข้อมูลส่วนตัว
                            birthDate: p1.birthDate,
                            age: p1.age,
                            education: p1.education,
                            // ข้อมูลการแต่งตั้ง
                            lastAppointment: p1.lastAppointment,
                            currentRankSince: p1.currentRankSince,
                            enrollmentDate: p1.enrollmentDate,
                            retirementDate: p1.retirementDate,
                            yearsOfService: p1.yearsOfService,
                            // ข้อมูลการฝึกอบรม
                            trainingLocation: p1.trainingLocation,
                            trainingCourse: p1.trainingCourse,
                            // ข้อมูลการเสนอชื่อ
                            supportName: p1.supporterName,
                            supportReason: p1.supportReason,
                            requestedPosition: p1.requestedPosition,
                            // หมายเหตุ
                            notes: p1.notes,
                            // ตำแหน่ง
                            fromPosition: p1.position,
                            fromPositionNumber: p1.positionNumber,
                            fromUnit: p1.unit,
                            fromActingAs: p1.actingAs,
                            toPosition: p2.position,
                            toPositionNumber: p2.positionNumber,
                            toUnit: p2.unit,
                            toActingAs: p2.actingAs,
                        },
                        {
                            sequence: 2,
                            personnelId: p2.id,
                            noId: p2.noId,
                            nationalId: p2.nationalId,
                            fullName: p2.fullName,
                            rank: p2.rank,
                            seniority: p2.seniority,
                            posCodeId: p2.posCodeId,
                            toPosCodeId: p3.posCodeId,
                            // ข้อมูลส่วนตัว
                            birthDate: p2.birthDate,
                            age: p2.age,
                            education: p2.education,
                            // ข้อมูลการแต่งตั้ง
                            lastAppointment: p2.lastAppointment,
                            currentRankSince: p2.currentRankSince,
                            enrollmentDate: p2.enrollmentDate,
                            retirementDate: p2.retirementDate,
                            yearsOfService: p2.yearsOfService,
                            // ข้อมูลการฝึกอบรม
                            trainingLocation: p2.trainingLocation,
                            trainingCourse: p2.trainingCourse,
                            // ข้อมูลการเสนอชื่อ
                            supportName: p2.supporterName,
                            supportReason: p2.supportReason,
                            requestedPosition: p2.requestedPosition,
                            // หมายเหตุ
                            notes: p2.notes,
                            // ตำแหน่ง
                            fromPosition: p2.position,
                            fromPositionNumber: p2.positionNumber,
                            fromUnit: p2.unit,
                            fromActingAs: p2.actingAs,
                            toPosition: p3.position,
                            toPositionNumber: p3.positionNumber,
                            toUnit: p3.unit,
                            toActingAs: p3.actingAs,
                        },
                        {
                            sequence: 3,
                            personnelId: p3.id,
                            noId: p3.noId,
                            nationalId: p3.nationalId,
                            fullName: p3.fullName,
                            rank: p3.rank,
                            seniority: p3.seniority,
                            posCodeId: p3.posCodeId,
                            toPosCodeId: p1.posCodeId,
                            // ข้อมูลส่วนตัว
                            birthDate: p3.birthDate,
                            age: p3.age,
                            education: p3.education,
                            // ข้อมูลการแต่งตั้ง
                            lastAppointment: p3.lastAppointment,
                            currentRankSince: p3.currentRankSince,
                            enrollmentDate: p3.enrollmentDate,
                            retirementDate: p3.retirementDate,
                            yearsOfService: p3.yearsOfService,
                            // ข้อมูลการฝึกอบรม
                            trainingLocation: p3.trainingLocation,
                            trainingCourse: p3.trainingCourse,
                            // ข้อมูลการเสนอชื่อ
                            supportName: p3.supporterName,
                            supportReason: p3.supportReason,
                            requestedPosition: p3.requestedPosition,
                            // หมายเหตุ
                            notes: p3.notes,
                            // ตำแหน่ง
                            fromPosition: p3.position,
                            fromPositionNumber: p3.positionNumber,
                            fromUnit: p3.unit,
                            fromActingAs: p3.actingAs,
                            toPosition: p1.position,
                            toPositionNumber: p1.positionNumber,
                            toUnit: p1.unit,
                            toActingAs: p1.actingAs,
                        }
                    ]
                }),
            });

            if (!createRes.ok) throw new Error('Failed to create three-way transaction');

            const createData = await createRes.json();
            const transactionId = createData.data?.id;
            const details = createData.data?.swapDetails || [];

            const itemIds: string[] = [];
            const newPersonnel: Record<string, Personnel> = {};

            if (details.length >= 3) {
                const sourcePersons = [p1, p2, p3];
                details.forEach((detail: any, idx: number) => {
                    const originalPerson = sourcePersons[idx];
                    const boardPerson: Personnel = {
                        ...originalPerson,
                        id: detail.id,
                        originalId: originalPerson.id,
                        swapDetailId: detail.id,
                        transactionId: transactionId,
                        transactionType: 'three-way',
                        toPosition: detail.toPosition,
                        toPositionNumber: detail.toPositionNumber,
                        toUnit: detail.toUnit,
                        toPosCodeId: detail.toPosCodeId,
                        toPosCodeMaster: detail.toPosCodeMaster,
                    };
                    newPersonnel[detail.id] = boardPerson;
                    itemIds.push(detail.id);
                });
            }

            const newColumn: Column = {
                id: `lane-tx-${transactionId}`,
                title: title,
                groupNumber: generatedGroupNumber,
                itemIds: itemIds,
                vacantPosition: {
                    isTransaction: true,
                    transactionType: 'three-way',
                    groupNumber: generatedGroupNumber
                },
                level: 1,
                chainId: `chain-tx-${transactionId}`,
                chainType: 'three-way',
                linkedTransactionId: transactionId,
                linkedTransactionType: 'three-way'
            };

            setPersonnelMap(prev => ({ ...prev, ...newPersonnel }));
            setColumns(prev => [newColumn, ...prev]);
            setIsNewLaneDrawerOpen(false);
            setHasUnsavedChanges(true);
            setSnackbar({ open: true, message: `สร้างเลน "สามเส้า" สำเร็จ`, severity: 'success' });

        } catch (error) {
            console.error('Error creating three-way lane:', error);
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการสร้างเลน', severity: 'error' });
        }
    };

    // Create new transfer lane (Called from Component)
    const handleCreateTransferLane = async (p1: Personnel, toUnit: string, laneTitle: string) => {
        commitAction();
        // Find max existing TF number to avoid duplicates
        const existingTransferNumbers = columns
            .filter(c => c.groupNumber?.includes('/TF-'))
            .map(c => {
                const match = c.groupNumber?.match(/TF-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            });
        const maxTransferNumber = existingTransferNumbers.length > 0 ? Math.max(...existingTransferNumbers) : 0;
        const runningNumber = (maxTransferNumber + 1).toString().padStart(3, '0');
        const generatedGroupNumber = `${selectedYear}/TF-${runningNumber}`;
        const title = laneTitle.trim() || `ย้ายหน่วย: ${p1.fullName} → ${toUnit}`;

        try {
            const createRes = await fetch('/api/swap-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year: selectedYear,
                    swapDate: new Date().toISOString(),
                    swapType: 'transfer',
                    groupName: title,
                    groupNumber: generatedGroupNumber,
                    swapDetails: [
                        {
                            sequence: 1,
                            personnelId: p1.id,
                            noId: p1.noId,
                            nationalId: p1.nationalId,
                            fullName: p1.fullName,
                            rank: p1.rank,
                            seniority: p1.seniority,
                            posCodeId: p1.posCodeId,
                            // ตำแหน่งเดิม
                            fromPosition: p1.position,
                            fromPositionNumber: p1.positionNumber,
                            fromUnit: p1.unit,
                            fromActingAs: p1.actingAs,
                            // ตำแหน่งใหม่ (ระบุหน่วย)
                            toUnit: toUnit,
                            toPosition: `ย้ายหน่วยงาน (${toUnit})`
                        }
                    ]
                }),
            });

            if (!createRes.ok) throw new Error('Failed to create transfer transaction');

            const createData = await createRes.json();
            const transactionId = createData.data?.id;
            const details = createData.data?.swapDetails || [];

            const itemIds: string[] = [];
            const newPersonnel: Record<string, Personnel> = {};

            if (details.length >= 1) {
                const detail = details[0];
                const boardPerson: Personnel = {
                    ...p1,
                    id: detail.id,
                    originalId: p1.id,
                    swapDetailId: detail.id,
                    transactionId: transactionId,
                    transactionType: 'transfer',
                    toUnit: toUnit,
                    toPosition: `ย้ายหน่วยงาน (${toUnit})`
                };
                newPersonnel[detail.id] = boardPerson;
                itemIds.push(detail.id);
            }

            const newColumn: Column = {
                id: `lane-tx-${transactionId}`,
                title: title,
                groupNumber: generatedGroupNumber,
                itemIds: itemIds,
                vacantPosition: {
                    isTransaction: true,
                    transactionType: 'transfer',
                    groupNumber: generatedGroupNumber,
                    unit: toUnit,
                    position: `ย้ายหน่วยงาน (${toUnit})`
                },
                level: 1,
                chainId: `chain-tx-${transactionId}`,
                chainType: 'transfer',
                linkedTransactionId: transactionId,
                linkedTransactionType: 'transfer'
            };

            setPersonnelMap(prev => ({ ...prev, ...newPersonnel }));
            setColumns(prev => [newColumn, ...prev]);
            setIsNewLaneDrawerOpen(false);
            setHasUnsavedChanges(true);
            setSnackbar({ open: true, message: `สร้างเลน "ย้ายหน่วย" สำเร็จ`, severity: 'success' });

        } catch (error) {
            console.error('Error creating transfer lane:', error);
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการสร้างเลน', severity: 'error' });
        }
    };

    const handleSuggest = useCallback((column: Column) => {
        // Clear existing filters first
        setFilterUnit('all');
        setFilterPosCode('all');
        setFilterMinPosCode(null);
        setSearchTerm('');

        // Find the target to fill
        let targetPosCodeId: number | undefined;
        let targetUnit: string | undefined;
        let chainLevel = 1;

        // Priority 1: If it's a person object directly (passed from a card suggest button)
        const isTargetAPerson = column.vacantPosition?.rank || column.vacantPosition?.fullName;

        if (isTargetAPerson) {
            targetPosCodeId = column.vacantPosition.posCodeId || undefined;
            targetUnit = column.vacantPosition.unit as string | undefined;
        }
        // Priority 2: If it's a real column from the board with items, check the last person
        else if (column.id && column.itemIds && column.itemIds.length > 0) {
            const lastPersonId = column.itemIds[column.itemIds.length - 1];
            const lastPerson = personnelMap[lastPersonId];
            if (lastPerson) {
                targetPosCodeId = lastPerson.posCodeId || undefined;
                targetUnit = lastPerson.unit as string | undefined;
                chainLevel = column.itemIds.length + 1;
            } else {
                targetPosCodeId = column.vacantPosition?.posCodeMaster?.id;
                targetUnit = column.vacantPosition?.unit as string | undefined;
            }
        }
        // Priority 3: Vacant Position metadata
        else {
            targetPosCodeId = column.vacantPosition?.posCodeMaster?.id;
            targetUnit = column.vacantPosition?.unit as string | undefined;
        }

        if (targetPosCodeId) {
            let suggestedPosCode = targetPosCodeId;
            let recommendationType = `สืบต่อลำดับที่ ${chainLevel}`;

            // Detect lane types
            const isSwapOrThreeWay = column.chainType === 'swap' ||
                column.chainType === 'three-way' ||
                (column.vacantPosition?.isTransaction &&
                    (column.vacantPosition.transactionType === 'two-way' ||
                        column.vacantPosition.transactionType === 'three-way'));

            const isTransferLane = column.chainType === 'transfer' ||
                (column.vacantPosition?.isTransaction && column.vacantPosition.transactionType === 'transfer');

            // Rule 1: For Vacant Position, Promotion Chain, or Transfer -> Suggest 1 step higher (numerically)
            // Rule 2: For Swap (2-way) or Three-way -> Suggest SAME rank
            if (!isSwapOrThreeWay) {
                // Find the NEXT available posCode from options
                const nextPossibleId = posCodeOptions
                    .map(o => o.id)
                    .sort((a, b) => a - b)
                    .find(id => id > targetPosCodeId!);

                if (!nextPossibleId) {
                    setSnackbar({
                        open: true,
                        message: `ไม่พบรหัสตำแหน่งที่สูงกว่าระดับปัจจุบัน (${targetPosCodeId}) ในฐานข้อมูล`,
                        severity: 'info'
                    });
                    suggestedPosCode = targetPosCodeId;
                } else {
                    suggestedPosCode = nextPossibleId;
                }

                // Set specific message for transfer lanes
                if (isTransferLane) {
                    recommendationType = `ผู้มาทดแทนลำดับที่ ${chainLevel} (ย้ายหน่วย)`;
                }
            } else {
                recommendationType = (column.chainType === 'three-way' || column.vacantPosition?.transactionType === 'three-way')
                    ? 'รายการสามเส้า' : 'สลับตำแหน่ง';
            }

            // Set filters
            setFilterPosCode(String(suggestedPosCode));
            setFilterUnit(targetUnit || 'all');

            setPage(0);
            setIsFilterCollapsed(false);
            setIsLeftPanelCollapsed(false);

            setSnackbar({
                open: true,
                message: `แนะนำผู้สมัครระดับ ${suggestedPosCode} ${targetUnit ? `จากหน่วย ${targetUnit}` : ''} (${recommendationType})`,
                severity: 'info'
            });
        }
    }, [personnelMap, posCodeOptions, setFilterPosCode, setFilterMinPosCode, setFilterUnit, setPage, setIsFilterCollapsed, setIsLeftPanelCollapsed, setSnackbar]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9' }}>
            {/* Header - Professional Layout */}
            <Box sx={{
                px: 3,
                height: 72,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                position: 'sticky',
                top: 0,
                zIndex: 1100,
                boxShadow: '0 4px 20px -10px rgba(0,0,0,0.05)'
            }}>
                {/* Left Section: Brand & Status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Link href="/" passHref>
                        <IconButton
                            size="small"
                            sx={{
                                width: 36,
                                height: 36,
                                border: '1px solid',
                                borderColor: 'grey.200',
                                borderRadius: 3,
                                color: 'text.secondary',
                                bgcolor: 'white',
                                '&:hover': { bgcolor: 'primary.50', color: 'primary.main', borderColor: 'primary.main' }
                            }}
                        >
                            <HomeIcon fontSize="small" />
                        </IconButton>
                    </Link>

                    <Divider orientation="vertical" flexItem sx={{ height: 24, my: 'auto' }} />

                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1, fontSize: '1.1rem', letterSpacing: '-0.5px' }}>
                                Personnel Board
                            </Typography>
                            <Chip label="V2.0" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, borderRadius: 1 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, minWidth: 140 }}>
                            {/* Status */}
                            {savingBoard ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CircularProgress size={10} color="info" />
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>กำลังบันทึก...</Typography>
                                </Box>
                            ) : hasUnsavedChanges ? (
                                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main' }} />
                                    ยังไม่ได้บันทึก
                                </Typography>
                            ) : lastSavedAt ? (
                                <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                                    บันทึกแล้ว {lastSavedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            ) : (
                                <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.5 }}>พร้อมใช้งาน</Typography>
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Center Section: View Toggle */}
                <Box sx={{
                    bgcolor: '#f1f5f9',
                    p: 0.5,
                    borderRadius: 3,
                    display: 'flex',
                    border: '1px solid',
                    borderColor: '#e2e8f0'
                }}>
                    <Button
                        variant={!showCompletedLanes ? 'contained' : 'text'}
                        size="small"
                        onClick={() => setShowCompletedLanes(false)}
                        sx={{
                            borderRadius: 2.5,
                            px: 3,
                            py: 0.5,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: !showCompletedLanes ? 'white' : 'transparent',
                            color: !showCompletedLanes ? 'primary.main' : 'text.secondary',
                            boxShadow: !showCompletedLanes ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                            '&:hover': {
                                bgcolor: !showCompletedLanes ? 'white' : 'rgba(0,0,0,0.02)',
                            }
                        }}
                    >
                        🔄 ดำเนินการ ({columns.filter(c => !c.isCompleted).length})
                    </Button>
                    <Button
                        variant={showCompletedLanes ? 'contained' : 'text'}
                        size="small"
                        onClick={() => setShowCompletedLanes(true)}
                        sx={{
                            borderRadius: 2.5,
                            px: 3,
                            py: 0.5,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: showCompletedLanes ? 'white' : 'transparent',
                            color: showCompletedLanes ? 'success.main' : 'text.secondary',
                            boxShadow: showCompletedLanes ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                            '&:hover': {
                                bgcolor: showCompletedLanes ? 'white' : 'rgba(0,0,0,0.02)',
                            }
                        }}
                    >
                        ✅ เสร็จสิ้น ({columns.filter(c => c.isCompleted).length})
                    </Button>
                </Box>

                {/* Right Section: Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {/* Year Select - Minimal */}
                    <FormControl size="small">
                        <Select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value as number)}
                            variant="standard"
                            disableUnderline
                            sx={{
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                color: 'text.primary',
                                '& .MuiSelect-select': { py: 0.5, pl: 1, pr: 3, display: 'flex', alignItems: 'center', gap: 1 },
                                '&:hover': { bgcolor: 'grey.50', borderRadius: 1 }
                            }}
                            renderValue={(value) => (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarMonthIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <span>ปี {value}</span>
                                </Box>
                            )}
                        >
                            {Array.from({ length: 6 }, (_, i) => currentYear - i).map(year => (
                                <MenuItem key={year} value={year} sx={{ fontWeight: 600 }}>ปี {year}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>



                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TableChartIcon />}
                        onClick={() => setIsInOutTableOpen(true)}
                        sx={{
                            borderRadius: 3,
                            px: 2,
                            height: 40,
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'grey.300',
                            color: 'text.primary',
                            '&:hover': {
                                bgcolor: 'grey.50',
                                borderColor: 'primary.main',
                                color: 'primary.main',
                            }
                        }}
                    >
                        ตาราง In-Out
                    </Button>

                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PrintIcon fontSize="small" />}
                        onClick={() => setIsReportOpen(true)}
                        sx={{
                            borderRadius: 3,
                            px: 2,
                            height: 40,
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: '#1e293b',
                            color: '#fff',
                            '&:hover': {
                                bgcolor: '#0f172a',
                            }
                        }}
                    >
                        รายงาน
                    </Button>

                    <Button
                        variant="contained"
                        size="small"
                        startIcon={savingBoard ? <CircularProgress size={16} color="inherit" /> : <SaveIcon fontSize="small" />}
                        onClick={handleSaveData}
                        disabled={savingBoard || loadingBoard}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            height: 40,
                            minWidth: 230,
                            fontWeight: 700,
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            textTransform: 'none',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        }}
                    >
                        {savingBoard ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                    </Button>
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ display: 'flex', height: 'calc(100vh - 72px)' }}>
                {/* Left Panel - Personnel List */}
                <Box sx={{
                    width: isLeftPanelCollapsed ? 40 : 360,
                    flexShrink: 0,
                    bgcolor: 'white',
                    borderRight: '1px solid #e2e8f0',
                    transition: 'width 0.3s ease',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header with Toggle */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isLeftPanelCollapsed ? 'center' : 'space-between',
                        py: 0.5,
                        px: isLeftPanelCollapsed ? 0 : 1,
                        borderBottom: '1px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                        minHeight: 36
                    }}>
                        {!isLeftPanelCollapsed && (
                            <Box
                                onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    cursor: 'pointer',
                                    flex: 1,
                                    '&:hover': { opacity: 0.8 }
                                }}
                            >
                                <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                    ค้นหา / ตัวกรอง
                                </Typography>
                                {isFilterCollapsed ?
                                    <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> :
                                    <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                }
                                {/* Show active filter count - Fixed Condition */}
                                {(searchTerm || filterUnit !== 'all' || filterPosCode !== 'all' || filterHasRequestedPosition !== 'all' || filterMinPosCode) && (
                                    <Chip
                                        label={[
                                            searchTerm ? 1 : 0,
                                            filterUnit !== 'all' ? 1 : 0,
                                            filterPosCode !== 'all' ? 1 : 0,
                                            filterMinPosCode ? 1 : 0,
                                            filterHasRequestedPosition !== 'all' ? 1 : 0
                                        ].reduce((a, b) => a + b, 0)}
                                        size="small"
                                        color="primary"
                                        sx={{ height: 18, fontSize: '0.7rem', ml: 0.5, '& .MuiChip-label': { px: 0.75 } }}
                                    />
                                )}
                                {filterMinPosCode && (
                                    <Chip
                                        label="แนะนำ"
                                        size="small"
                                        color="warning"
                                        sx={{
                                            height: 18,
                                            fontSize: '0.6rem',
                                            fontWeight: 800,
                                            ml: 1,

                                        }}
                                    />
                                )}
                            </Box>
                        )}
                        {!isLeftPanelCollapsed && (searchTerm || filterUnit !== 'all' || filterPosCode !== 'all' || filterHasRequestedPosition !== 'all' || filterMinPosCode) && (
                            <Button
                                size="small"
                                color="error"
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterUnit('all');
                                    setFilterPosCode('all');
                                    setFilterHasRequestedPosition('all');
                                    setFilterMinPosCode(null);
                                    setPage(0);
                                }}
                                sx={{
                                    minWidth: 0,
                                    mr: 1,
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    textTransform: 'none',
                                    borderRadius: 1,
                                    py: 0,
                                    height: 22
                                }}
                            >
                                ล้างทั้งหมด
                            </Button>
                        )}
                        <IconButton size="small" onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}>
                            {isLeftPanelCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                        </IconButton>
                    </Box>

                    {!isLeftPanelCollapsed && (
                        <Box sx={{ height: 'calc(100% - 36px)', display: 'flex', flexDirection: 'column' }}>
                            {/* Collapsible Search & Filters */}
                            <Collapse in={!isFilterCollapsed}>
                                <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    {/* Search */}
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="ค้นหาชื่อ, ตำแหน่ง..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                                            sx: { bgcolor: 'white' }
                                        }}
                                        sx={{ mb: 1.5 }}
                                    />

                                    {/* Filters */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                                            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>หน่วยงาน</Typography>
                                            <Select
                                                value={filterUnit}
                                                onChange={(e) => setFilterUnit(e.target.value)}
                                            >
                                                <MenuItem value="all">ทุกหน่วย</MenuItem>
                                                {allUnits.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                                                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>ระดับ</Typography>
                                                <Select
                                                    value={filterPosCode}
                                                    onChange={(e) => {
                                                        setFilterPosCode(e.target.value);
                                                        if (e.target.value !== 'all') setFilterMinPosCode(null);
                                                    }}
                                                >
                                                    <MenuItem value="all">ทุกระดับ</MenuItem>
                                                    {posCodeOptions.map((pc) => (
                                                        <MenuItem key={pc.id} value={pc.id.toString()}>
                                                            {pc.id} - {pc.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                                                <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>มีการร้องขอตำแหน่ง</Typography>
                                                <Select
                                                    value={filterHasRequestedPosition}
                                                    onChange={(e) => setFilterHasRequestedPosition(e.target.value)}
                                                >
                                                    <MenuItem value="all">ทุกคน</MenuItem>
                                                    <MenuItem value="with-supporter">มีการร้องขอตำแหน่ง</MenuItem>
                                                    <MenuItem value="without-supporter">ไม่มีการร้องขอตำแหน่ง</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Box>

                                        {filterMinPosCode && (
                                            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5, bgcolor: alpha('#f59e0b', 0.1), p: 1.5, borderRadius: 2, border: '1px dashed', borderColor: 'warning.main' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        🎯 ระบบแนะนำ: ระดับ {filterMinPosCode} {filterPosCode !== 'all' ? '(ระบุเจาะจง)' : 'ขึ้นไป'}
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            setSearchTerm('');
                                                            setFilterUnit('all');
                                                            setFilterPosCode('all');
                                                            setFilterHasRequestedPosition('all');
                                                            setFilterMinPosCode(null);
                                                            setPage(0);
                                                        }}
                                                        sx={{ minWidth: 0, p: 0, px: 1, height: 20, fontSize: '0.65rem', fontWeight: 800, textTransform: 'none', bgcolor: 'warning.main', color: 'white', '&:hover': { bgcolor: 'warning.dark' }, borderRadius: 1 }}
                                                    >
                                                        ล้างทั้งหมด
                                                    </Button>
                                                </Box>
                                                {filterUnit !== 'all' && (
                                                    <Typography variant="caption" sx={{ color: 'warning.dark', opacity: 0.8, fontWeight: 700, ml: 2.5 }}>
                                                        • เฉพาะหน่วย: {filterUnit}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Collapse>

                            {/* Personnel List */}
                            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: 2, bgcolor: '#f1f5f9' }}>
                                {!listLoading && totalPersonnel > 0 && (
                                    <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: alpha('#3b82f6', 0.05), p: 1, borderRadius: 1.5, border: '1px solid', borderColor: alpha('#3b82f6', 0.1) }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.7rem' }}>
                                            พบ {Math.max(0, totalPersonnel - matchingAssignedCount)} รายชื่อ {matchingAssignedCount > 0 && `(บนบอร์ด ${matchingAssignedCount})`}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>
                                            หน้า {page + 1}
                                        </Typography>
                                    </Box>
                                )}
                                {listLoading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                                ) : filteredPersonnelList.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
                                        <Typography>ไม่พบข้อมูล</Typography>
                                    </Box>
                                ) : (
                                    <>
                                        {filteredPersonnelList.map(person => (
                                            <DraggablePersonnelItem
                                                key={person.id}
                                                person={person}
                                                columns={columns}
                                                onAddToLane={handleAddToLane}
                                            />
                                        ))}

                                        {/* Pagination */}
                                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
                                            <Pagination
                                                count={Math.ceil(totalPersonnel / rowsPerPage)}
                                                page={page + 1}
                                                onChange={(e, p) => setPage(p - 1)}
                                                size="small"
                                                color="primary"
                                            />
                                        </Box>
                                    </>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box >

                {/* Right Panel - Board */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                    {/* Board Toolbar (Search & Tools) */}
                    <Box sx={{
                        px: 3,
                        py: 1.5,
                        borderBottom: '1px solid #e2e8f0',
                        bgcolor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        zIndex: 10
                    }}>
                        <TextField
                            size="small"
                            placeholder="🔍 ค้นหา Group / ชื่อ / ตำแหน่ง"
                            value={boardSearchTerm}
                            onChange={(e) => setBoardSearchTerm(e.target.value)}
                            InputProps={{
                                endAdornment: boardSearchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setBoardSearchTerm('')} edge="end">
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: {
                                    borderRadius: 2,
                                    bgcolor: 'white',
                                    height: 36,
                                    fontSize: '0.85rem',
                                    '& fieldset': { borderColor: '#cbd5e1' },
                                    '&:hover fieldset': { borderColor: 'primary.main' }
                                }
                            }}
                            sx={{ width: 360 }}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            {boardSearchTerm && `พบ ${filteredColumns.length} เลน`}
                        </Typography>

                        <Box sx={{ flex: 1 }} />

                        {/* Lane Summary Button */}
                        <LaneSummaryButton
                            columns={columns}
                            personnelMap={personnelMap}
                            onOpenDetail={(person, targetInfo) => setSelectedPersonnelDetail({ personnel: person, targetInfo })}
                        />

                        {/* Board Filter Dropdown */}
                        {!showCompletedLanes && (
                            <>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<TuneIcon fontSize="small" />}
                                    endIcon={<ExpandMoreIcon fontSize="small" />}
                                    onClick={(e) => setBoardFilterAnchor(e.currentTarget)}
                                    disabled={savingBoard || loadingBoard}
                                    sx={{
                                        borderRadius: 2,
                                        px: 2,
                                        height: 36,
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        borderColor: (filterBoardType !== 'all' || showOnlyWithPlaceholder) ? 'primary.main' : 'divider',
                                        color: (filterBoardType !== 'all' || showOnlyWithPlaceholder) ? 'primary.main' : 'text.secondary',
                                        bgcolor: (filterBoardType !== 'all' || showOnlyWithPlaceholder) ? alpha('#3b82f6', 0.05) : 'transparent',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            color: 'primary.main',
                                            bgcolor: 'primary.50',
                                        }
                                    }}
                                >
                                    จัดการ/กรอง
                                    {(filterBoardType !== 'all' || showOnlyWithPlaceholder) && (
                                        <Chip
                                            label={[filterBoardType !== 'all' ? 1 : 0, showOnlyWithPlaceholder ? 1 : 0].reduce((a, b) => a + b, 0)}
                                            size="small"
                                            color="primary"
                                            sx={{ height: 18, fontSize: '0.65rem', ml: 0.5, '& .MuiChip-label': { px: 0.5 } }}
                                        />
                                    )}
                                </Button>

                                {/* Dropdown Menu */}
                                {boardFilterAnchor && (
                                    <Paper
                                        sx={{
                                            position: 'fixed',
                                            zIndex: 1300,
                                            top: boardFilterAnchor.getBoundingClientRect().bottom + 4,
                                            left: boardFilterAnchor.getBoundingClientRect().left,
                                            minWidth: 280,
                                            maxWidth: 320,
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {/* Sort Section */}
                                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                จัดเรียง
                                            </Typography>
                                        </Box>
                                        <MenuItem
                                            onClick={() => { handleSortByType(); setBoardFilterAnchor(null); }}
                                            sx={{ py: 1.5, fontSize: '0.9rem' }}
                                        >
                                            <SortIcon sx={{ mr: 1.5, fontSize: 18, color: 'text.secondary' }} />
                                            จัดกลุ่มตามประเภท
                                        </MenuItem>

                                        {/* Filter Section */}
                                        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                กรองประเภทเลน
                                            </Typography>
                                        </Box>
                                        <MenuItem
                                            onClick={() => { setFilterBoardType('all'); }}
                                            selected={filterBoardType === 'all'}
                                            sx={{ py: 1, fontSize: '0.85rem' }}
                                        >
                                            <Box sx={{ width: 18, mr: 1.5 }} />
                                            ทั้งหมด
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => { setFilterBoardType('swap'); }}
                                            selected={filterBoardType === 'swap'}
                                            sx={{ py: 1, fontSize: '0.85rem' }}
                                        >
                                            <Box sx={{ width: 18, mr: 1.5, color: '#f59e0b' }}>🔄</Box>
                                            สลับตำแหน่ง
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => { setFilterBoardType('three-way'); }}
                                            selected={filterBoardType === 'three-way'}
                                            sx={{ py: 1, fontSize: '0.85rem' }}
                                        >
                                            <Box sx={{ width: 18, mr: 1.5, color: '#f43f5e' }}>🔺</Box>
                                            สามเส้า
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => { setFilterBoardType('promotion'); }}
                                            selected={filterBoardType === 'promotion'}
                                            sx={{ py: 1, fontSize: '0.85rem' }}
                                        >
                                            <Box sx={{ width: 18, mr: 1.5, color: '#10b981' }}>📈</Box>
                                            เลื่อนตำแหน่ง
                                        </MenuItem>
                                        <MenuItem
                                            onClick={() => { setFilterBoardType('custom'); }}
                                            selected={filterBoardType === 'custom'}
                                            sx={{ py: 1, fontSize: '0.85rem' }}
                                        >
                                            <Box sx={{ width: 18, mr: 1.5, color: '#6366f1' }}>📦</Box>
                                            อื่นๆ
                                        </MenuItem>

                                        {/* Placeholder Filter */}
                                        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                กรองสถานะ
                                            </Typography>
                                        </Box>
                                        <MenuItem
                                            onClick={() => { setShowOnlyWithPlaceholder(!showOnlyWithPlaceholder); }}
                                            selected={showOnlyWithPlaceholder}
                                            sx={{
                                                py: 1.5,
                                                fontSize: '0.85rem',
                                                bgcolor: showOnlyWithPlaceholder ? alpha('#f59e0b', 0.1) : 'transparent',
                                                '&:hover': {
                                                    bgcolor: showOnlyWithPlaceholder ? alpha('#f59e0b', 0.15) : 'action.hover',
                                                }
                                            }}
                                        >
                                            <PlaceholderIcon sx={{ mr: 1.5, fontSize: 18, color: showOnlyWithPlaceholder ? 'warning.main' : 'text.disabled' }} />
                                            <Typography sx={{
                                                fontWeight: showOnlyWithPlaceholder ? 700 : 400,
                                                color: showOnlyWithPlaceholder ? 'warning.dark' : 'text.primary'
                                            }}>
                                                เฉพาะที่มี Placeholder
                                            </Typography>
                                            {lanesWithPlaceholderCount > 0 && (
                                                <Chip
                                                    label={lanesWithPlaceholderCount}
                                                    size="small"
                                                    color="warning"
                                                    sx={{ ml: 'auto', height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
                                                />
                                            )}
                                        </MenuItem>

                                        {/* Clear Filters */}
                                        {(filterBoardType !== 'all' || showOnlyWithPlaceholder) && (
                                            <Box sx={{ p: 1.5, borderTop: '1px solid #e2e8f0' }}>
                                                <Button
                                                    fullWidth
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => {
                                                        setFilterBoardType('all');
                                                        setShowOnlyWithPlaceholder(false);
                                                        setBoardFilterAnchor(null);
                                                    }}
                                                    sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
                                                >
                                                    ล้างตัวกรองทั้งหมด
                                                </Button>
                                            </Box>
                                        )}

                                        {/* Backdrop to close menu */}
                                        <Box sx={{ position: 'fixed', inset: 0, zIndex: -1 }} onClick={() => setBoardFilterAnchor(null)} />
                                    </Paper>
                                )}

                                <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    onClick={() => setClearBoardConfirm(true)}
                                    disabled={columns.length === 0}
                                    sx={{
                                        minWidth: 40, width: 40, height: 40,
                                        borderRadius: '50%',
                                        border: '1px solid',
                                        borderColor: 'error.light',
                                        color: 'error.main',
                                        p: 0,
                                        '&:hover': { bgcolor: 'error.50', borderColor: 'error.main' }
                                    }}
                                >
                                    <Tooltip title="ล้างกระดาน">
                                        <DeleteIcon fontSize="small" />
                                    </Tooltip>
                                </Button>

                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon fontSize="small" />}
                                    onClick={() => setIsNewLaneDrawerOpen(true)}
                                    disabled={savingBoard || loadingBoard}
                                    sx={{
                                        borderRadius: 2,
                                        px: 2,
                                        height: 36,
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                        '&:hover': {
                                            bgcolor: 'primary.dark',
                                        }
                                    }}
                                >
                                    เพิ่มเลนใหม่
                                </Button>
                            </>
                        )}
                    </Box>

                    {/* Scrollable Board Area */}
                    <Box
                        sx={{ flex: 1, display: 'flex', gap: 2, p: 3, overflow: 'auto', alignItems: 'flex-start', bgcolor: '#f1f5f9' }}
                        onClick={() => clearSelection()}
                    >
                        {
                            loadingBoard ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mt: 10 }} >
                                    <CircularProgress />
                                </Box >
                            ) : (
                                <>
                                    {filteredColumns
                                        .map((column, index) => (
                                            <DroppableLane
                                                key={column.id}
                                                column={column}
                                                index={index}
                                                personnelMap={personnelMap}
                                                onRemoveItem={handleRemoveFromBoard}
                                                onRemoveLane={() => confirmRemoveLane(column.id)}
                                                selectedIds={selectedIds}
                                                onSuggest={handleSuggest}
                                                onToggleSelection={toggleSelection}
                                                onHeaderClick={(vacantPos) => setSelectedVacantDetail(vacantPos)}
                                                onUpdateItem={handleUpdatePersonnel}
                                                onCardClick={handleCardClick}
                                                onToggleComplete={handleToggleComplete}
                                                onAddPlaceholder={handleAddPlaceholder}
                                                isReadOnly={showCompletedLanes}
                                                allLanes={columns}
                                                onMoveItem={handleMovePersonToLane}
                                                onViewSummary={setSelectedLaneSummary}
                                            />
                                        ))}

                                    {/* Add Lane Button - Only show in "In Progress" view */}
                                    {/* Removed Add Lane Card from here */}
                                </>
                            )}
                    </Box>
                </Box >
            </Box >

            {/* New Lane Drawer */}
            < Drawer
                anchor="right"
                open={isNewLaneDrawerOpen}
                onClose={() => setIsNewLaneDrawerOpen(false)}
                PaperProps={{
                    sx: { width: { xs: '100%', sm: 500, md: 550 }, bgcolor: '#f8fafc' }
                }}
            >
                <Box sx={{ px: 2, pt: 1.5, pb: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>➕ เพิ่มเลนใหม่</Typography>
                        <IconButton size="small" onClick={() => setIsNewLaneDrawerOpen(false)} sx={{ bgcolor: alpha('#ef4444', 0.05), color: 'error.main', '&:hover': { bgcolor: alpha('#ef4444', 0.1) } }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Tabs
                        value={addLaneTab}
                        onChange={(e, v) => setAddLaneTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            mb: 2,
                            px: 0.5,
                            minHeight: 40,
                            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                            '& .MuiTab-root': { minHeight: 40, py: 1, fontSize: '0.9rem', fontWeight: 700, textTransform: 'none', color: 'text.secondary' }
                        }}
                    >
                        <Tab label="ตำแหน่งว่าง" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', minWidth: 'auto', px: 1.5 }} />
                        <Tab label="🔄 สลับตำแหน่ง" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', minWidth: 'auto', px: 1.5, color: '#f59e0b' }} />
                        <Tab label="🔄 สามเส้า" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', minWidth: 'auto', px: 1.5, color: '#f43f5e' }} />
                        <Tab label="📦 ย้ายหน่วย" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', minWidth: 'auto', px: 1.5, color: '#3b82f6' }} />
                        <Tab label="สร้างเอง" sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.8rem', minWidth: 'auto', px: 1.5 }} />
                    </Tabs>

                    {addLaneTab === 0 ? (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {/* Filter Toggle */}
                            <Box
                                onClick={() => setIsVacantFilterCollapsed(!isVacantFilterCollapsed)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                    py: 1,
                                    cursor: 'pointer',
                                    bgcolor: '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0',
                                    '&:hover': { bgcolor: 'grey.100' }
                                }}
                            >
                                <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                    ค้นหา / ตัวกรอง
                                </Typography>
                                {isVacantFilterCollapsed ?
                                    <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> :
                                    <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                }
                                {/* Show active filter count */}
                                {(vacantSearch || vacantFilterUnit !== 'all' || vacantFilterStatus !== 'all' || vacantFilterPosCode !== 'all') && (
                                    <Chip
                                        label={[
                                            vacantSearch ? 1 : 0,
                                            vacantFilterUnit !== 'all' ? 1 : 0,
                                            vacantFilterStatus !== 'all' ? 1 : 0,
                                            vacantFilterPosCode !== 'all' ? 1 : 0
                                        ].reduce((a, b) => a + b, 0)}
                                        size="small"
                                        color="primary"
                                        sx={{ height: 18, fontSize: '0.7rem', ml: 0.5, '& .MuiChip-label': { px: 0.75 } }}
                                    />
                                )}
                            </Box>

                            {/* Collapsible Filters */}
                            <Collapse in={!isVacantFilterCollapsed}>
                                <Box sx={{ px: 2, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    {/* Search Box */}
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="ค้นหาวงจร, หน่วยงาน, เลขตำแหน่ง..."
                                        value={vacantSearch}
                                        onChange={(e) => setVacantSearch(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon sx={{ fontSize: 20 }} color="action" />
                                                </InputAdornment>
                                            ),
                                            sx: { bgcolor: 'white' }
                                        }}
                                        sx={{ mb: 2 }}
                                    />

                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
                                        <FormControl fullWidth size="small">
                                            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>หน่วยงาน</Typography>
                                            <Select
                                                value={vacantFilterUnit}
                                                onChange={(e) => setVacantFilterUnit(e.target.value)}
                                                sx={{ bgcolor: 'white' }}
                                            >
                                                <MenuItem value="all">ทั้งหมด</MenuItem>
                                                {allUnits.map(unit => (
                                                    <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth size="small">
                                            <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>สถานะ</Typography>
                                            <Select
                                                value={vacantFilterStatus}
                                                onChange={(e) => setVacantFilterStatus(e.target.value)}
                                                sx={{ bgcolor: 'white' }}
                                            >
                                                <MenuItem value="all">ทั้งหมด</MenuItem>
                                                <MenuItem value="vacant">ว่างปกติ</MenuItem>
                                                <MenuItem value="reserved">กันตำแหน่ง</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>

                                    <FormControl fullWidth size="small">
                                        <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>รหัส - ตำแหน่ง</Typography>
                                        <Select
                                            value={vacantFilterPosCode}
                                            onChange={(e) => setVacantFilterPosCode(e.target.value)}
                                            sx={{ bgcolor: 'white' }}
                                        >
                                            <MenuItem value="all">ทุกรหัส</MenuItem>
                                            {posCodeOptions.map(pc => (
                                                <MenuItem key={pc.id} value={String(pc.id)}>{pc.id} - {pc.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Collapse>

                            <Typography variant="caption" sx={{ px: 2, py: 1, my: 1, mx: 2, bgcolor: alpha('#3b82f6', 0.05), color: 'primary.dark', fontWeight: 700, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                🔍 พบ {Math.max(0, vacantTotal - assignedVacantIds.length)} ตำแหน่งว่าง {assignedVacantIds.length > 0 && `(บนบอร์ดแล้ว ${assignedVacantIds.length})`}
                            </Typography>

                            {/* Vacant List */}
                            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                                {loadingVacantPositions ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
                                ) : vacantPositions.filter(pos => !assignedVacantIds.includes(String(pos.id))).length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
                                        <Typography variant="body2">ไม่พบตำแหน่งที่ตรงตามเงื่อนไข (หรือถูกจัดลงบอร์ดแล้ว)</Typography>
                                    </Box>
                                ) : (
                                    vacantPositions
                                        .filter(pos => !assignedVacantIds.includes(String(pos.id)))
                                        .map((pos) => (
                                            <Paper
                                                key={pos.id}
                                                elevation={0}
                                                sx={{
                                                    p: 1,
                                                    mb: 1,
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: 1.5,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    overflow: 'hidden',
                                                    '&:hover': {
                                                        borderColor: 'primary.main',
                                                        bgcolor: alpha('#3b82f6', 0.02),
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                                    }
                                                }}
                                            >
                                                {/* Content - Click to open detail */}
                                                <Box
                                                    sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                                                    onClick={() => setSelectedVacantDetail(pos)}
                                                >
                                                    {/* Row 1: Position Name + Position Number */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', flex: 1 }}>
                                                            {pos.position || pos.posCodeMaster?.name || 'ตำแหน่งว่าง'}
                                                        </Typography>
                                                        <Chip
                                                            label={`#${pos.positionNumber}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, '& .MuiChip-label': { px: 0.5 } }}
                                                        />
                                                    </Box>

                                                    {/* Row 2: Acting As (ทำหน้าที่) - if available */}
                                                    {pos.actingAs && (
                                                        <Typography variant="caption" noWrap sx={{ display: 'block', fontSize: '0.7rem', color: '#059669', fontWeight: 600, mb: 0.25 }}>
                                                            📋 {pos.actingAs}
                                                        </Typography>
                                                    )}

                                                    {/* Row 3: Compact chips row - PosCode + Unit + Status */}
                                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <Chip
                                                            label={pos.posCodeId ? `${pos.posCodeId} - ${pos.posCodeMaster?.name}` : '-'}
                                                            size="small"
                                                            sx={{ height: 16, fontSize: '0.7rem', fontWeight: 700, bgcolor: alpha('#3b82f6', 0.1), color: 'primary.main', '& .MuiChip-label': { px: 0.5 } }}
                                                        />
                                                        <Typography variant="caption" noWrap sx={{ fontSize: '0.75rem', color: '#64748b', maxWidth: 120 }}>
                                                            หน่วย: {pos.unit || 'ไม่ระบุหน่วย'}
                                                        </Typography>
                                                        {(pos.fullName || '').includes('กันตำแหน่ง') && (
                                                            <Chip label="กัน" size="small" color="warning" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, '& .MuiChip-label': { px: 0.5 } }} />
                                                        )}
                                                    </Box>
                                                </Box>

                                                {/* Add Button - Smaller */}
                                                <IconButton
                                                    color="primary"
                                                    size="small"
                                                    onClick={(e) => { e.stopPropagation(); handleAddLane(pos); }}
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        bgcolor: alpha('#3b82f6', 0.08),
                                                        '&:hover': { bgcolor: alpha('#3b82f6', 0.15) }
                                                    }}
                                                >
                                                    <AddIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Paper>
                                        ))
                                )}
                            </Box>

                            {/* Pagination */}
                            {vacantTotal > vacantRowsPerPage && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2, borderTop: '1px solid #e2e8f0' }}>
                                    <Pagination
                                        count={Math.ceil(vacantTotal / vacantRowsPerPage)}
                                        page={vacantPage + 1}
                                        onChange={(e, newPage) => setVacantPage(newPage - 1)}
                                        size="small"
                                        color="primary"
                                    />
                                </Box>
                            )}
                        </Box>
                    ) : addLaneTab === 1 ? (
                        /* Create Swap Lane (Index 1) */
                        <CreateSwapLaneTab
                            selectedYear={selectedYear}
                            allUnits={allUnits}
                            posCodeOptions={posCodeOptions}
                            onCreate={handleCreateSwapLane}
                        />
                    ) : addLaneTab === 2 ? (
                        /* Create Three-way Lane (Index 2) */
                        <CreateThreeWayLaneTab
                            selectedYear={selectedYear}
                            allUnits={allUnits}
                            posCodeOptions={posCodeOptions}
                            onCreate={handleCreateThreeWayLane}
                        />
                    ) : addLaneTab === 3 ? (
                        /* Create Transfer Lane (Index 3) */
                        <CreateTransferLaneTab
                            selectedYear={selectedYear}
                            allUnits={allUnits}
                            posCodeOptions={posCodeOptions}
                            onCreate={handleCreateTransferLane}
                        />
                    ) : addLaneTab === 4 ? (
                        /* Manual mode (Index 4) */
                        <Box sx={{ p: 3 }}>
                            <Paper elevation={0} sx={{ p: 3, border: '2px dashed #e2e8f0', borderRadius: 3, textAlign: 'center', bgcolor: alpha('#f8fafc', 0.5) }}>
                                <Typography variant="h6" sx={{ mb: 1, fontWeight: 800, color: '#0f172a' }}>🛠️ สร้างเลนกำหนดเอง</Typography>
                                <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>ระบุชื่อเลนที่คุณต้องการเพื่อจัดการตำแหน่งด้วยตนเอง</Typography>

                                <TextField
                                    autoFocus
                                    fullWidth
                                    variant="outlined"
                                    label="ชื่อเลน"
                                    placeholder="เช่น ฝ่ายบริหาร, ฝ่ายสอบสวน, วงจรพิเศษ..."
                                    value={newLaneTitle}
                                    onChange={(e) => setNewLaneTitle(e.target.value)}
                                    InputProps={{
                                        sx: { borderRadius: 2, bgcolor: 'white' }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newLaneTitle.trim()) {
                                            e.preventDefault();
                                            handleAddLane();
                                        }
                                    }}
                                />
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={() => handleAddLane()}
                                    disabled={!newLaneTitle.trim()}
                                    sx={{
                                        mt: 3,
                                        py: 1.5,
                                        fontWeight: 800,
                                        borderRadius: 2.5,
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                        textTransform: 'none',
                                        fontSize: '1rem'
                                    }}
                                >
                                    ยืนยันสร้างเลน
                                </Button>
                            </Paper>
                        </Box>
                    ) : null
                    }
                </Box >
            </Drawer >

            {/* Delete Lane Confirm Dialog (Premium Style) */}
            <Dialog
                open={deleteLaneConfirm.open}
                onClose={() => !isDeletingLane && setDeleteLaneConfirm({ ...deleteLaneConfirm, open: false })}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        padding: 1,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
                    <Box sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        bgcolor: isDeletingLane ? alpha('#3b82f6', 0.1) : alpha('#ef4444', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        color: isDeletingLane ? 'primary.main' : 'error.main',
                        position: 'relative'
                    }}>
                        {isDeletingLane ? (
                            <CircularProgress size={32} color="inherit" />
                        ) : (
                            <DeleteIcon sx={{ fontSize: 32 }} />
                        )}
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
                        {isDeletingLane ? 'กำลังลบข้อมูล...' : 'ยืนยันการลบเลน?'}
                    </Typography>

                    <Typography variant="body1" sx={{ color: '#475569', mb: 1 }}>
                        คุณต้องการลบเลน <strong>"{deleteLaneConfirm.laneTitle}"</strong> ใช่หรือไม่?
                    </Typography>

                    <Box sx={{
                        bgcolor: '#fff1f2',
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid #fecaca',
                        mb: 2
                    }}>
                        <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <StarIcon sx={{ fontSize: 14 }} /> ข้อมูลบุคลากรในการ์ดจะถูกนำออกจากบอร์ดนี้เท่านั้น
                        </Typography>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 4, justifyContent: 'center', gap: 1 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => setDeleteLaneConfirm({ ...deleteLaneConfirm, open: false })}
                        disabled={isDeletingLane}
                        sx={{
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 3,
                            borderColor: '#e2e8f0',
                            color: '#64748b',
                            py: 1.2
                        }}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        color="error"
                        onClick={() => deleteLaneConfirm.laneId && handleRemoveLane(deleteLaneConfirm.laneId)}
                        disabled={isDeletingLane}
                        startIcon={isDeletingLane ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 3,
                            py: 1.2,
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                        }}
                    >
                        {isDeletingLane ? 'กำลังลบ...' : 'ลบเลนทันที'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Clear Board Confirm Dialog (Premium Style) */}
            <Dialog
                open={clearBoardConfirm}
                onClose={() => setClearBoardConfirm(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        padding: 1,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
                    <Box sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        bgcolor: alpha('#ef4444', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        color: 'error.main'
                    }}>
                        <DeleteIcon sx={{ fontSize: 32 }} />
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
                        ยืนยันการล้างกระดานทั้งหมด?
                    </Typography>

                    <Typography variant="body1" sx={{ color: '#475569', mb: 1 }}>
                        คุณต้องการลบ Lane ทั้งหมด <strong>{columns.length} Lane</strong> ใช่หรือไม่?
                    </Typography>

                    <Box sx={{
                        bgcolor: '#fff1f2',
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid #fecaca',
                        mb: 2
                    }}>
                        <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <StarIcon sx={{ fontSize: 14 }} /> การเปลี่ยนแปลงจะถูกบันทึกอัตโนมัติ
                        </Typography>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 4, justifyContent: 'center', gap: 1 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => setClearBoardConfirm(false)}
                        sx={{
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 3,
                            borderColor: '#e2e8f0',
                            color: '#64748b',
                            py: 1.2
                        }}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        color="error"
                        onClick={() => {
                            setColumns([]);
                            setPersonnelMap({});
                            setClearBoardConfirm(false);
                            setHasUnsavedChanges(true);
                            setSnackbar({ open: true, message: 'ล้างกระดานเรียบร้อยแล้ว', severity: 'success' });
                        }}
                        sx={{
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 3,
                            py: 1.2,
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                        }}
                    >
                        ล้างทั้งหมดทันที
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Drag Preview Indicator */}
            {
                draggedItem && (
                    <Box
                        sx={{
                            position: 'fixed',
                            bottom: 20,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 9999,
                            bgcolor: 'primary.main',
                            color: 'white',
                            px: 3,
                            py: 1.5,
                            borderRadius: 3,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            animation: 'slideUp 0.2s ease',
                            '@keyframes slideUp': {
                                from: { opacity: 0, transform: 'translateX(-50%) translateY(20px)' },
                                to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
                            }
                        }}
                    >
                        <DragIndicatorIcon />
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {draggedItem.rank} {draggedItem.fullName}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', opacity: 0.9 }}>
                                วางบน Lane หรือ Card เพื่อย้ายตำแหน่ง
                            </Typography>
                        </Box>
                    </Box>
                )
            }

            {/* Vacant Position Detail Modal */}
            <PersonnelDetailModal
                open={!!selectedVacantDetail}
                onClose={() => setSelectedVacantDetail(null)}
                personnel={selectedVacantDetail || null}
                onSuggest={(data) => {
                    handleSuggest({ vacantPosition: data } as any);
                    setSelectedVacantDetail(null);
                }}
            />

            {/* Personnel Detail Modal (Centralized) */}
            <PersonnelDetailModal
                open={!!selectedPersonnelDetail}
                onClose={() => setSelectedPersonnelDetail(null)}
                personnel={selectedPersonnelDetail?.personnel || null}
                targetInfo={selectedPersonnelDetail?.targetInfo || null}
                onAvatarUpdate={(url) => {
                    if (selectedPersonnelDetail) {
                        handleUpdatePersonnel(selectedPersonnelDetail.personnel.id, { avatarUrl: url });
                    }
                }}
                onSupporterUpdate={(reqPos, name, reason) => {
                    if (selectedPersonnelDetail) {
                        handleUpdatePersonnel(selectedPersonnelDetail.personnel.id, { requestedPosition: reqPos, supporterName: name, supportReason: reason });
                    }
                }}

                onNotesUpdate={(notes) => {
                    if (selectedPersonnelDetail) {
                        handleUpdatePersonnel(selectedPersonnelDetail.personnel.id, { notes });
                    }
                }}
            />

            {/* Undo/Redo Controls */}
            <UndoRedoControls
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
            />

            {/* Lane Summary Modal */}
            <LaneSummaryModal
                open={!!selectedLaneSummary}
                onClose={() => setSelectedLaneSummary(null)}
                column={selectedLaneSummary}
                personnelMap={personnelMap}
            />
            {/* In-Out Table Full Screen Dialog */}
            <Dialog
                fullScreen
                open={isInOutTableOpen}
                onClose={() => setIsInOutTableOpen(false)}
                TransitionComponent={Transition}
            >
                <AppBar sx={{ position: 'relative', bgcolor: 'white', color: 'text.primary', boxShadow: 1, borderBottom: '1px solid #e0e0e0' }}>
                    <Toolbar>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={() => setIsInOutTableOpen(false)}
                            aria-label="close"
                        >
                            <CloseIcon />
                        </IconButton>
                        <Typography sx={{ ml: 2, flex: 1, fontWeight: 700 }} variant="h6" component="div">
                            ตารางเปรียบเทียบข้อมูล (In-Out Table)
                        </Typography>
                        <Button autoFocus color="primary" variant="contained" onClick={() => setIsInOutTableOpen(false)} sx={{ borderRadius: 2 }}>
                            ปิดหน้าต่าง
                        </Button>
                    </Toolbar>
                </AppBar>
                <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: '#f8f9fa' }}>
                    <InOutView initialYear={selectedYear} />
                </Box>
            </Dialog>

            {/* Transfer Summary Report Dialog */}
            <Dialog
                fullScreen
                open={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                TransitionComponent={Transition}
            >
                <AppBar sx={{ position: 'relative', bgcolor: 'white', color: 'text.primary', boxShadow: 1, borderBottom: '1px solid #e0e0e0' }}>
                    <Toolbar>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={() => setIsReportOpen(false)}
                            aria-label="close"
                        >
                            <CloseIcon />
                        </IconButton>
                        <Typography sx={{ ml: 2, flex: 1, fontWeight: 700 }} variant="h6" component="div">
                            รายงานสรุปการย้ายตำแหน่ง
                        </Typography>
                        <Button autoFocus color="primary" variant="contained" onClick={() => setIsReportOpen(false)} sx={{ borderRadius: 2 }}>
                            ปิดหน้าต่าง
                        </Button>
                    </Toolbar>
                </AppBar>
                <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: '#f8fafc' }}>
                    <TransferSummaryReport
                        columns={columns}
                        personnelMap={personnelMap}
                        selectedYear={selectedYear}
                    />
                </Box>
            </Dialog>
        </Box>
    );
}
