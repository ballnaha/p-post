"use client";

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    MouseSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    rectIntersection,
    useDroppable,
    useDraggable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    alpha,
    Avatar,
    TextField,
    InputAdornment,
    FormControl,
    Select,
    MenuItem,
    CircularProgress,
    Pagination,
    Chip,
    Tooltip,
    Menu,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    Collapse,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Add as AddIcon,
    LibraryAdd as LibraryAddIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    DragIndicator as DragIndicatorIcon,
    ChevronRight as ChevronRightIcon,
    Star as StarIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon2,
    ViewColumn as ViewColumnIcon,
    Save as SaveIcon,
    CalendarMonth as CalendarMonthIcon,
    KeyboardArrowUp as ArrowUpIcon,
    KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

// --- Interfaces ---

interface Personnel {
    id: string;
    noId?: number | string | null;
    fullName: string | null;
    rank: string | null;
    position: string | null;
    unit: string | null;
    positionNumber: string | null;
    avatarUrl: string | null;
    nationality?: string;
    nationalId?: string;
    age?: string;
    seniority?: string;
    birthDate?: string | null;
    education?: string | null;
    yearsOfService?: string;
    lastAppointment?: string | null;
    retirementDate?: string | null;
    actingAs?: string;
    notes?: string | null;
    supporterName?: string | null;
    supportReason?: string | null;
    posCodeId?: number;
    posCodeMaster?: { id: number; name: string } | null;
    enrollmentDate?: string | null;
    currentRankSince?: string | null;
    trainingCourse?: string;
    trainingLocation?: string | null;
    [key: string]: any;
}

interface Column {
    id: string;
    title: string;
    itemIds: string[];
    // ข้อมูลตำแหน่งว่าง
    vacantPosition?: {
        id: number;
        position: string | null;
        unit: string | null;
        positionNumber: string | null;
        posCodeMaster?: { id: number; name: string } | null;
    };
}

// --- Components ---

const PersonnelCardInner = memo(({
    personnel,
    onAvatarUpdate,
    onSupporterUpdate,
    onUpdate
}: {
    personnel: Personnel;
    onAvatarUpdate?: (newAvatarUrl: string | null) => void;
    onSupporterUpdate?: (name: string | null, reason: string | null) => void;
    onUpdate?: (updated: Personnel) => void;
}) => {
    const [localPersonnel, setLocalPersonnel] = useState(personnel);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        setLocalPersonnel(personnel);
    }, [personnel]);

    const handleAvatarUpdate = (newAvatarUrl: string | null) => {
        const updated = { ...localPersonnel, avatarUrl: newAvatarUrl };
        setLocalPersonnel(updated);
        onAvatarUpdate?.(newAvatarUrl);
        onUpdate?.(updated);
    };

    const handleSupporterUpdate = (name: string | null, reason: string | null) => {
        const updated = { ...localPersonnel, supporterName: name, supportReason: reason };
        setLocalPersonnel(updated);
        onSupporterUpdate?.(name, reason);
        onUpdate?.(updated);
    };

    return (
        <>
            <Box sx={{ p: 1.5, position: 'relative', cursor: 'pointer' }} onClick={() => setIsDetailOpen(true)}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    {/* ชื่อ-ยศ */}
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {localPersonnel.rank} {localPersonnel.fullName}
                    </Typography>

                    {/* ตำแหน่ง */}
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                        {localPersonnel.position || '-'}
                    </Typography>

                    {/* Chips: posCode และ unit */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                        <Chip
                            label={localPersonnel.posCodeId ? `${localPersonnel.posCodeId} - ${localPersonnel.posCodeMaster?.name || '-'}` : (localPersonnel.posCodeMaster?.name || '-')}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'primary.50', color: 'primary.main' }}
                        />
                        <Chip
                            label={localPersonnel.unit || 'ไม่ระบุหน่วย'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'grey.100' }}
                        />
                    </Box>

                    {/* อายุ และ อายุงาน */}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                        อายุ: {localPersonnel.age || '-'} | อาวุโส: {localPersonnel.seniority || '-'}
                    </Typography>

                    {/* ผู้สนับสนุน */}
                    {localPersonnel.supporterName && (
                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                            <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600, fontSize: '0.65rem' }}>
                                {localPersonnel.supporterName}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            <PersonnelDetailModal
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                personnel={localPersonnel}
                onAvatarUpdate={handleAvatarUpdate}
                onSupporterUpdate={handleSupporterUpdate}
            />
        </>
    );
});

PersonnelCardInner.displayName = 'PersonnelCardInner';

// Draggable Item for Personnel List (left panel)
const DraggablePersonnelItem = ({ person, columns, onAddToLane }: {
    person: Personnel;
    columns: Column[];
    onAddToLane: (person: Personnel, laneId: string) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: person.id,
        data: {
            type: 'Personnel',
            personnel: { ...person, id: person.id }
        },
    });

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none' as const,
    };

    const handleMenuClick = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setAnchorEl(e.currentTarget);
    };

    const handleLaneSelect = (laneId: string) => {
        onAddToLane(person, laneId);
        setAnchorEl(null);
    };

    const handleOpenDetail = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDetailOpen(true);
    };

    return (
        <>
            <Paper
                ref={setNodeRef}
                style={style}
                elevation={0}
                sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'stretch',
                    '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    },
                    overflow: 'hidden'
                }}
            >
                {/* Drag Handle - same position as lanes */}
                <Box
                    {...listeners}
                    {...attributes}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 0.75,
                        bgcolor: '#f8fafc',
                        borderRight: '1px solid #e2e8f0',
                        color: 'text.disabled',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' }
                    }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
                    <Box
                        sx={{ cursor: 'pointer' }}
                        onClick={handleOpenDetail}
                    >
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {person.rank} {person.fullName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                            {person.position}
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                            <Chip
                                label={person.posCodeId ? `${person.posCodeId} - ${person.posCodeMaster?.name || '-'}` : (person.posCodeMaster?.name || '-')}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'primary.50', color: 'primary.main' }}
                            />
                            <Chip
                                label={person.unit || 'ไม่ระบุหน่วย'}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'grey.100' }}
                            />
                        </Box>

                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                            อายุ: {person.age || '-'} | อายุงาน: {person.seniority || '-'}
                        </Typography>

                        {person.supporterName && (
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <StarIcon sx={{ fontSize: 12, color: 'warning.main' }} />
                                <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600, fontSize: '0.65rem' }}>
                                    {person.supporterName}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 0.5,
                    px: 0.75,
                    borderLeft: '1px solid #e2e8f0',
                    bgcolor: '#f8fafc'
                }}>
                    <Tooltip title="เพิ่มลงในเลน">
                        <IconButton
                            size="small"
                            sx={{ p: 0.5, color: 'primary.main', '&:hover': { bgcolor: 'primary.50' } }}
                            onClick={handleMenuClick}
                        >
                            <AddIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="ดูรายละเอียด">
                        <IconButton
                            size="small"
                            onClick={handleOpenDetail}
                            sx={{ p: 0.5, '&:hover': { bgcolor: 'grey.100' } }}
                        >
                            <ExpandMoreIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Lane Selection Menu */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    PaperProps={{ sx: { borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', mt: 1, minWidth: 200 } }}
                >
                    <Typography sx={{ px: 2, py: 1, fontWeight: 900, fontSize: '0.75rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                        เลือกเลนที่จะเพิ่มเข้า
                    </Typography>
                    {columns.map((lane) => (
                        <MenuItem
                            key={lane.id}
                            onClick={() => handleLaneSelect(lane.id)}
                            sx={{ px: 2, py: 1.5 }}
                        >
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mr: 2 }} />
                            <Typography sx={{ fontWeight: 700 }}>{lane.title}</Typography>
                            <ChevronRightIcon sx={{ ml: 'auto', fontSize: 18, color: 'text.disabled' }} />
                        </MenuItem>
                    ))}
                </Menu>
            </Paper>

            {/* Personnel Detail Modal */}
            <PersonnelDetailModal
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                personnel={person}
            />
        </>
    );
};

const SortableItem = ({ id, personnel, onRemove, onMoveUp, onMoveDown, isFirst, isLast, onUpdatePersonnel }: {
    id: string;
    personnel: Personnel;
    onRemove: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isFirst?: boolean;
    isLast?: boolean;
    onUpdatePersonnel?: (updated: Personnel) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        transition: {
            duration: 150,
            easing: 'ease',
        }
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 150ms ease',
        opacity: isDragging ? 0.4 : 1,
        visibility: isDragging ? 'hidden' as const : 'visible' as const,
    };

    if (!personnel) return null;

    return (
        <Box ref={setNodeRef} style={style} sx={{ mb: 1.5, position: 'relative' }}>
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 1,
                    border: '1px solid #e2e8f0',
                    bgcolor: 'white',
                    display: 'flex',
                    alignItems: 'stretch',
                }}
            >
                {/* Drag Handle */}
                <Box
                    {...attributes}
                    {...listeners}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 0.75,
                        bgcolor: '#f8fafc',
                        borderRight: '1px solid #e2e8f0',
                        borderTopLeftRadius: 4,
                        borderBottomLeftRadius: 4,
                        color: 'text.disabled',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' }
                    }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <PersonnelCardInner
                        personnel={personnel}
                        onUpdate={onUpdatePersonnel}
                    />
                </Box>

                {/* Move Up/Down Buttons */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    px: 0.5,
                    bgcolor: '#f8fafc',
                    borderLeft: '1px solid #e2e8f0',
                }}>
                    <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
                        disabled={isFirst}
                        sx={{
                            p: 0.25,
                            color: isFirst ? 'text.disabled' : 'text.secondary',
                            '&:hover': { bgcolor: 'primary.50', color: 'primary.main' }
                        }}
                    >
                        <ArrowUpIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
                        disabled={isLast}
                        sx={{
                            p: 0.25,
                            color: isLast ? 'text.disabled' : 'text.secondary',
                            '&:hover': { bgcolor: 'primary.50', color: 'primary.main' }
                        }}
                    >
                        <ArrowDownIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
            </Paper>

            {/* Delete Button */}
            <IconButton
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: '#fff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    zIndex: 2,
                    '&:hover': { bgcolor: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }
                }}
            >
                <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
        </Box>
    );
};

const SortableColumn = memo(({ column, itemIds, personnelMap, onRemove, onRemoveItem, onMoveItem, onUpdatePersonnel, dragOverItemId }: {
    column: Column;
    itemIds: string[];
    personnelMap: Record<string, Personnel>;
    onRemove: () => void;
    onRemoveItem: (id: string) => void;
    onMoveItem?: (id: string, direction: 'up' | 'down') => void;
    onUpdatePersonnel?: (id: string, updated: Personnel) => void;
    dragOverItemId?: string | null;
}) => {
    const { setNodeRef, isOver } = useDroppable({ id: column.id });

    // Drop indicator component
    const DropIndicator = () => (
        <Box sx={{
            height: 4,
            bgcolor: 'primary.main',
            borderRadius: 2,
            my: 1,
            mx: 0.5,
            boxShadow: '0 0 8px rgba(25, 118, 210, 0.5)',
            animation: 'pulse 1s ease-in-out infinite',
            '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
            }
        }} />
    );

    return (
        <Paper
            ref={setNodeRef}
            elevation={0}
            sx={{
                bgcolor: '#f8fafc',
                borderRadius: 1,
                display: 'flex',
                flexDirection: 'column',
                p: 2,
                border: '1px solid #e2e8f0',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                minHeight: 400,
                ...(isOver && {
                    borderColor: 'primary.main',
                    bgcolor: alpha('#1976d2', 0.05),
                })
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, px: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.3 }} noWrap>
                        {column.title}
                    </Typography>
                    {column.vacantPosition && (
                        <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                                {column.vacantPosition.position || 'ตำแหน่ง'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                {column.vacantPosition.positionNumber || '-'}
                            </Typography>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Box sx={{
                            bgcolor: alpha('#64748b', 0.1),
                            color: '#64748b',
                            px: 0.75,
                            py: 0.15,
                            borderRadius: 1,
                            fontSize: '0.65rem',
                            fontWeight: 700
                        }}>
                            {itemIds.length} คน
                        </Box>
                    </Box>
                </Box>
                <IconButton size="small" onClick={onRemove} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1, minHeight: 100 }}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {itemIds.map((id, index) => (
                        <React.Fragment key={id}>
                            {/* Show drop indicator before this item */}
                            {dragOverItemId === id && <DropIndicator />}
                            <SortableItem
                                id={id}
                                personnel={personnelMap[id]}
                                onRemove={() => onRemoveItem(id)}
                                onMoveUp={() => onMoveItem?.(id, 'up')}
                                onMoveDown={() => onMoveItem?.(id, 'down')}
                                isFirst={index === 0}
                                isLast={index === itemIds.length - 1}
                                onUpdatePersonnel={(updated) => onUpdatePersonnel?.(id, updated)}
                            />
                        </React.Fragment>
                    ))}
                </SortableContext>

                {itemIds.length === 0 && (
                    <Box sx={{
                        height: 150,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #e2e8f0',
                        borderRadius: 3,
                        color: 'text.disabled'
                    }}>
                        <LibraryAddIcon sx={{ mb: 1, opacity: 0.5 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>ลากพนักงานมาวางที่นี่</Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
});

SortableColumn.displayName = 'SortableColumn';

// --- Main Page Component ---

export default function PersonnelBoardPage() {
    // Current year in Buddhist Era
    const currentYear = new Date().getFullYear() + 543;

    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [columns, setColumns] = useState<Column[]>([]);
    const [personnelMap, setPersonnelMap] = useState<Record<string, Personnel>>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeItem, setActiveItem] = useState<Personnel | null>(null);

    // Left Panel Collapse State
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

    // Filter Collapse State
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

    // New Lane Dialog State
    const [isNewLaneDialogOpen, setIsNewLaneDialogOpen] = useState(false);
    const [newLaneTitle, setNewLaneTitle] = useState('');

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>(
        { open: false, message: '', severity: 'success' }
    );

    // Loading/Saving State
    const [loadingBoard, setLoadingBoard] = useState(false);
    const [savingBoard, setSavingBoard] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Vacant Positions State
    const [vacantPositions, setVacantPositions] = useState<any[]>([]);
    const [loadingVacantPositions, setLoadingVacantPositions] = useState(false);

    // Personnel List State (moved from drawer)
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [totalPersonnel, setTotalPersonnel] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(20);
    const [filterUnit, setFilterUnit] = useState<string>('all');
    const [filterPosCode, setFilterPosCode] = useState<string>('all');
    const [filterSupporter, setFilterSupporter] = useState<string>('all');
    const [allUnits, setAllUnits] = useState<string[]>([]);
    const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);

    // Track latest state for handlers
    const columnsRef = React.useRef(columns);
    const personnelMapRef = React.useRef(personnelMap);

    useEffect(() => { columnsRef.current = columns; }, [columns]);
    useEffect(() => { personnelMapRef.current = personnelMap; }, [personnelMap]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Filter IDs already on board (include id, noId, and originalId)
    const assignedIds = useMemo(() => {
        const ids: string[] = [];
        Object.values(personnelMap).forEach(p => {
            if (p.noId) ids.push(String(p.noId));
            if (p.id) ids.push(String(p.id));
            if ((p as any).originalId) ids.push(String((p as any).originalId));
        });
        return ids.filter(Boolean);
    }, [personnelMap]);

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

    // Fetch personnel list
    const fetchPersonnelList = useCallback(async () => {
        setListLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
            if (filterUnit && filterUnit !== 'all') params.set('unit', filterUnit);
            if (filterPosCode && filterPosCode !== 'all') params.set('posCodeId', filterPosCode);
            if (filterSupporter && filterSupporter !== 'all') params.set('supporter', filterSupporter);
            params.set('page', page.toString());
            params.set('limit', rowsPerPage.toString());
            // Don't send year to API - use client-side filtering instead via assignedIds
            // This allows personnel to be visible immediately when removed from board

            const res = await fetch(`/api/police-personnel/candidates?${params.toString()}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            const list = Array.isArray(data?.data) ? data.data : [];
            // Note: filtering is now done client-side via useMemo (filteredPersonnelList)
            setPersonnelList(list);
            setTotalPersonnel(data?.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setListLoading(false);
        }
    }, [debouncedSearchTerm, filterUnit, filterPosCode, filterSupporter, page, rowsPerPage]);

    // Fetch vacant positions
    const fetchVacantPositions = useCallback(async () => {
        setLoadingVacantPositions(true);
        try {
            const res = await fetch(`/api/vacant-position/available?year=${selectedYear}&unassignedOnly=true`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            // Flatten all positions from groups
            const allPositions: any[] = [];
            if (data.groups) {
                data.groups.forEach((group: any) => {
                    group.positions.forEach((pos: any) => {
                        allPositions.push({
                            ...pos,
                            posCodeMaster: { id: group.posCodeId, name: group.posCodeName }
                        });
                    });
                });
            }
            setVacantPositions(allPositions);

            // Create columns from vacant positions if current columns is empty
            if (columns.length === 0) {
                const newColumns: Column[] = allPositions.map((pos, index) => ({
                    id: `vacant-${pos.id}`,
                    title: `${pos.posCodeMaster?.name || 'ตำแหน่ง'} - ${pos.unit || ''}`,
                    itemIds: [],
                    vacantPosition: {
                        id: pos.id,
                        position: pos.position,
                        unit: pos.unit,
                        positionNumber: pos.positionNumber,
                        posCodeMaster: pos.posCodeMaster
                    }
                }));
                if (newColumns.length > 0) {
                    setColumns(newColumns);
                }
            }
        } catch (err) {
            console.error('Error fetching vacant positions:', err);
        } finally {
            setLoadingVacantPositions(false);
        }
    }, [selectedYear]);

    // Filter personnel list client-side to exclude those already on board
    const filteredPersonnelList = useMemo(() => {
        return personnelList.filter((p: any) => {
            const pNoId = String(p.noId || '');
            const pId = String(p.id || '');
            return !assignedIds.includes(pId) && !assignedIds.includes(pNoId);
        });
    }, [personnelList, assignedIds]);

    // Load board data from API
    const loadBoardData = useCallback(async (year: number) => {
        setLoadingBoard(true);
        try {
            const res = await fetch(`/api/personnel-board?year=${year}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            if (data.columns && data.columns.length > 0) {
                setColumns(data.columns);
                setPersonnelMap(data.personnelMap || {});
            } else {
                // ไม่มีข้อมูลใน DB - โหลดตำแหน่งว่าง
                setColumns([]);
                setPersonnelMap({});
                fetchVacantPositions();
            }
        } catch (err) {
            console.error('Error loading board data:', err);
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', severity: 'error' });
        } finally {
            setLoadingBoard(false);
        }
    }, []);

    // Save board data to API
    const saveBoardData = useCallback(async (year: number, cols: Column[], persMap: Record<string, Personnel>) => {
        // Allow saving empty columns to sync deleted lanes to DB

        setSavingBoard(true);
        try {
            const res = await fetch('/api/personnel-board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, columns: cols, personnelMap: persMap }),
            });
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            console.log('Board saved:', data.message);
            setLastSavedAt(new Date());
            setHasUnsavedChanges(false);
        } catch (err) {
            console.error('Error saving board data:', err);
        } finally {
            setSavingBoard(false);
        }
    }, []);

    useEffect(() => {
        loadFilters();
    }, []);

    // Load data when year changes
    useEffect(() => {
        loadBoardData(selectedYear);
    }, [selectedYear, loadBoardData]);

    // Save data for current year (Manual)
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
            console.error('Error saving board data:', err);
            setSnackbar({ open: true, message: 'เกิดข้อผิดพลาดในการบันทึก', severity: 'error' });
        } finally {
            setSavingBoard(false);
        }
    };

    // Auto-save when personnelMap or columns change (debounced - 5 seconds)
    const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const isFirstRender = React.useRef(true);
    useEffect(() => {
        // Skip first render to avoid saving empty data
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // Mark as having unsaved changes
        setHasUnsavedChanges(true);

        // Debounce auto-save (wait 2 seconds after last change)
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
            // Save even when empty (to sync deleted lanes/items to DB)
            saveBoardData(selectedYear, columns, personnelMap);
        }, 2000); // 2 seconds debounce

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [personnelMap, columns, selectedYear, saveBoardData]);

    // Handle year change
    const handleYearChange = (newYear: number) => {
        // Save current year data before switching
        if (columns.some(c => c.itemIds.length > 0)) {
            saveBoardData(selectedYear, columns, personnelMap);
        }
        setSelectedYear(newYear);
    };

    useEffect(() => {
        fetchPersonnelList();
    }, [fetchPersonnelList, selectedYear]);

    const [dragOverLaneId, setDragOverLaneId] = useState<string | null>(null);
    const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveItem(active.data.current?.personnel || personnelMap[active.id as string] || null);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) {
            setDragOverLaneId(null);
            setDragOverItemId(null);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;
        const overCol = columnsRef.current.find(c => c.id === overId || c.itemIds.includes(overId));
        const activeCol = columnsRef.current.find(c => c.itemIds.includes(activeId));
        const isFromList = active.data.current?.type === 'Personnel';

        if (overCol) {
            setDragOverLaneId(overCol.id);
            // Show drop indicator when dragging from list or from different lane
            if (isFromList || (activeCol && activeCol.id !== overCol.id)) {
                // Check if overId is an item (not the lane itself)
                if (overCol.itemIds.includes(overId)) {
                    setDragOverItemId(overId);
                } else {
                    setDragOverItemId(null);
                }
            } else {
                setDragOverItemId(null);
            }
        } else {
            setDragOverLaneId(null);
            setDragOverItemId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const id = active.id as string;
        const isFromList = active.data.current?.type === 'Personnel';

        setDragOverLaneId(null);
        setDragOverItemId(null);

        if (!over) {
            setActiveId(null);
            setActiveItem(null);
            return;
        }

        const overId = over.id as string;
        const targetLane = columnsRef.current.find(c => c.id === overId || c.itemIds.includes(overId));

        if (isFromList) {
            // Coming from personnel list - add to target lane at specific position
            if (targetLane && active.data.current) {
                const item = active.data.current.personnel;
                const boardId = `${item.id}-board-${Date.now()}`;
                const newPerson = { ...item, id: boardId, originalId: item.id, noId: item.noId || item.id };

                // Calculate insert position based on drop target
                const overIdx = targetLane.itemIds.indexOf(overId);
                const insertIdx = overIdx >= 0 ? overIdx : targetLane.itemIds.length;

                setPersonnelMap(prev => ({ ...prev, [boardId]: newPerson }));
                setColumns(prev => prev.map(c => {
                    if (c.id === targetLane.id) {
                        const newItemIds = [...c.itemIds];
                        newItemIds.splice(insertIdx, 0, boardId);
                        return { ...c, itemIds: newItemIds };
                    }
                    return c;
                }));
            }
        } else {
            // Moving within or between lanes
            const sourceCol = columnsRef.current.find(c => c.itemIds.includes(id));

            if (sourceCol && targetLane) {
                if (sourceCol.id === targetLane.id) {
                    // Same lane - reorder
                    if (id !== overId) {
                        const oldIdx = sourceCol.itemIds.indexOf(id);
                        const newIdx = sourceCol.itemIds.indexOf(overId);
                        if (newIdx >= 0) {
                            setColumns(prev => prev.map(c =>
                                c.id === sourceCol.id
                                    ? { ...c, itemIds: arrayMove(c.itemIds, oldIdx, newIdx) }
                                    : c
                            ));
                        }
                    }
                } else {
                    // Different lane - move to target
                    const overIdx = targetLane.itemIds.indexOf(overId);
                    const insertIdx = overIdx >= 0 ? overIdx : targetLane.itemIds.length;

                    setColumns(prev => prev.map(c => {
                        if (c.id === sourceCol.id) {
                            return { ...c, itemIds: c.itemIds.filter(itemId => itemId !== id) };
                        }
                        if (c.id === targetLane.id) {
                            const newItemIds = [...c.itemIds];
                            newItemIds.splice(insertIdx, 0, id);
                            return { ...c, itemIds: newItemIds };
                        }
                        return c;
                    }));
                }
            }
        }

        setActiveId(null);
        setActiveItem(null);
    };

    const handleAddToLane = useCallback((person: Personnel, laneId: string) => {
        const boardId = `${person.id}-board-${Date.now()}`;
        const p = { ...person, id: boardId, originalId: person.id, noId: person.noId || person.id };
        setPersonnelMap(prev => ({ ...prev, [boardId]: p }));
        setColumns(prev => prev.map(c => c.id === laneId ? { ...c, itemIds: [...c.itemIds, boardId] } : c));
    }, []);

    const handleRemoveFromBoard = useCallback((id: string) => {
        setPersonnelMap(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setColumns(prev => prev.map(c => ({ ...c, itemIds: c.itemIds.filter(itemId => itemId !== id) })));
        // No need to refetch - client-side filtering (assignedIds) will handle it automatically
    }, []);

    // Update personnel in map (for avatar/supporter updates)
    const handleUpdatePersonnel = useCallback((id: string, updated: Personnel) => {
        setPersonnelMap(prev => ({ ...prev, [id]: updated }));
    }, []);

    // Add New Lane
    const handleAddLane = () => {
        if (!newLaneTitle.trim()) return;
        const newId = `lane-${Date.now()}`;
        setColumns(prev => [...prev, { id: newId, title: newLaneTitle.trim(), itemIds: [] }]);
        setNewLaneTitle('');
        setIsNewLaneDialogOpen(false);
    };

    // Move Item Up/Down
    const handleMoveItem = useCallback((itemId: string, direction: 'up' | 'down') => {
        setColumns(prev => prev.map(col => {
            const idx = col.itemIds.indexOf(itemId);
            if (idx === -1) return col;

            const newIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (newIdx < 0 || newIdx >= col.itemIds.length) return col;

            const newItemIds = [...col.itemIds];
            [newItemIds[idx], newItemIds[newIdx]] = [newItemIds[newIdx], newItemIds[idx]];
            return { ...col, itemIds: newItemIds };
        }));
    }, []);

    // Remove Lane
    const handleRemoveLane = useCallback((laneId: string) => {
        // Return items back to pool (remove from personnelMap)
        const lane = columns.find(c => c.id === laneId);
        if (lane) {
            lane.itemIds.forEach(id => {
                setPersonnelMap(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            });
        }
        setColumns(prev => prev.filter(c => c.id !== laneId));
        // No need to refetch - client-side filtering (assignedIds) will handle it automatically
    }, [columns]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9' }}>
            {/* Header */}
            <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid #e2e8f0', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', mb: 0.5 }}>
                            Personnel Board
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            ลากวางกำลังพลเพื่อจัดหน่วยงาน (Drag & Drop)
                        </Typography>
                    </Box>

                    {/* Year Selector and Save Button */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarMonthIcon color="primary" />
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                    value={selectedYear}
                                    onChange={(e) => handleYearChange(e.target.value as number)}
                                    sx={{ fontWeight: 700, bgcolor: 'white' }}
                                >
                                    {/* Show current year and past 5 years */}
                                    {Array.from({ length: 6 }, (_, i) => currentYear - i).map(year => (
                                        <MenuItem key={year} value={year}>
                                            <Typography sx={{ fontWeight: 700 }}>ปี {year}</Typography>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Button
                            variant="contained"
                            startIcon={savingBoard ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                            onClick={handleSaveData}
                            disabled={savingBoard || loadingBoard}
                            sx={{
                                borderRadius: 2.5,
                                px: 3,
                                py: 1,
                                fontWeight: 700,
                                textTransform: 'none',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            {savingBoard ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </Button>

                        {/* Save Status Indicator */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {savingBoard ? (
                                <Typography variant="caption" sx={{ color: 'info.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CircularProgress size={12} color="inherit" />
                                    กำลังบันทึกอัตโนมัติ...
                                </Typography>
                            ) : hasUnsavedChanges ? (
                                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                                    ● มีการเปลี่ยนแปลง (จะบันทึกใน 2 วินาที)
                                </Typography>
                            ) : lastSavedAt ? (
                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                                    ✓ บันทึกแล้วเมื่อ {lastSavedAt.toLocaleTimeString('th-TH')}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>
                </Box>
            </Box>

            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
                    {/* Left Panel - Personnel List (Collapsible) */}
                    <Box sx={{
                        width: isLeftPanelCollapsed ? 56 : { xs: '100%', md: 450 },
                        minWidth: isLeftPanelCollapsed ? 56 : { xs: '100%', md: 450 },
                        flexShrink: 0,
                        borderRight: '1px solid #e2e8f0',
                        bgcolor: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'width 0.25s ease-in-out, min-width 0.25s ease-in-out',
                    }}>
                        {/* Header with Toggle Button */}
                        <Box sx={{
                            p: isLeftPanelCollapsed ? 1 : 2,
                            borderBottom: '1px solid #e2e8f0',
                            bgcolor: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isLeftPanelCollapsed ? 'center' : 'space-between',
                            minHeight: 56
                        }}>
                            {!isLeftPanelCollapsed && (
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>เลือกบุคลากร</Typography>
                            )}
                            <Tooltip title={isLeftPanelCollapsed ? 'แสดงรายชื่อ' : 'ซ่อนรายชื่อ'} placement="right">
                                <IconButton
                                    onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                                    size="small"
                                    sx={{
                                        bgcolor: isLeftPanelCollapsed ? 'primary.main' : 'grey.100',
                                        color: isLeftPanelCollapsed ? 'white' : 'text.secondary',
                                        borderRadius: 2,
                                        '&:hover': {
                                            bgcolor: isLeftPanelCollapsed ? 'primary.dark' : 'grey.200',
                                        }
                                    }}
                                >
                                    {isLeftPanelCollapsed ? <ChevronRightIcon2 /> : <ChevronLeftIcon />}
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {/* Collapsed State View */}
                        {isLeftPanelCollapsed ? (
                            <Box
                                onClick={() => setIsLeftPanelCollapsed(false)}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexGrow: 1,
                                    py: 2,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'grey.50' }
                                }}
                            >
                                <Box sx={{
                                    writingMode: 'vertical-rl',
                                    textOrientation: 'mixed',
                                    transform: 'rotate(180deg)',
                                    fontWeight: 700,
                                    color: 'primary.main',
                                    fontSize: '0.85rem',
                                    userSelect: 'none'
                                }}>
                                    เลือกบุคลากร
                                </Box>
                            </Box>
                        ) : (
                            <>
                                {/* Search & Filters (Collapsible) */}
                                <Box sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    {/* Search always visible */}
                                    <Box sx={{ p: 2, pb: isFilterCollapsed ? 2 : 1 }}>
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
                                        />
                                    </Box>

                                    {/* Filter Toggle Button */}
                                    <Box
                                        onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 0.5,
                                            py: 0.75,
                                            cursor: 'pointer',
                                            borderTop: '1px solid #e2e8f0',
                                            '&:hover': { bgcolor: 'grey.100' }
                                        }}
                                    >
                                        <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                            ตัวกรอง
                                        </Typography>
                                        {isFilterCollapsed ?
                                            <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> :
                                            <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        }
                                    </Box>

                                    {/* Collapsible Filters */}
                                    <Collapse in={!isFilterCollapsed}>
                                        <Box sx={{ px: 2, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                                                <Select
                                                    value={filterUnit}
                                                    onChange={(e) => setFilterUnit(e.target.value)}
                                                    displayEmpty
                                                    startAdornment={<FilterListIcon color="action" sx={{ mr: 1, fontSize: 20 }} />}
                                                >
                                                    <MenuItem value="all"><Typography variant="body2" color="text.secondary">ทุกหน่วย</Typography></MenuItem>
                                                    {allUnits.map(u => <MenuItem key={u} value={u}><Typography variant="body2">{u}</Typography></MenuItem>)}
                                                </Select>
                                            </FormControl>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                                                    <Select
                                                        value={filterPosCode}
                                                        onChange={(e) => setFilterPosCode(e.target.value)}
                                                        displayEmpty
                                                    >
                                                        <MenuItem value="all"><Typography variant="body2" color="text.secondary">ทุกระดับ</Typography></MenuItem>
                                                        {posCodeOptions.map((pc) => (
                                                            <MenuItem key={pc.id} value={pc.id.toString()}>
                                                                <Typography variant="body2">{pc.id} - {pc.name}</Typography>
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <FormControl size="small" fullWidth sx={{ bgcolor: 'white' }}>
                                                    <Select
                                                        value={filterSupporter}
                                                        onChange={(e) => setFilterSupporter(e.target.value)}
                                                        displayEmpty
                                                    >
                                                        <MenuItem value="all"><Typography variant="body2" color="text.secondary">ทุกคน</Typography></MenuItem>
                                                        <MenuItem value="with-supporter"><Typography variant="body2">มีผู้สนับสนุน</Typography></MenuItem>
                                                        <MenuItem value="without-supporter"><Typography variant="body2">ไม่มีผู้สนับสนุน</Typography></MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Box>
                                        </Box>
                                    </Collapse>
                                </Box>

                                {/* Personnel List */}
                                <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: 2, bgcolor: '#f1f5f9' }}>
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
                            </>
                        )}
                    </Box>

                    {/* Right Panel - Board with Lanes */}
                    <Box sx={{ flex: 1, p: 3, overflowY: 'auto', overflowX: 'auto' }}>
                        {/* Add Lane Button Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setIsNewLaneDialogOpen(true)}
                                sx={{
                                    borderRadius: 2.5,
                                    px: 3,
                                    py: 1,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}
                            >
                                เพิ่ม Lane ใหม่
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={fetchVacantPositions}
                                disabled={loadingVacantPositions}
                                sx={{
                                    borderRadius: 2.5,
                                    px: 3,
                                    py: 1,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                }}
                            >
                                {loadingVacantPositions ? 'กำลังโหลด...' : 'โหลดตำแหน่งว่าง'}
                            </Button>
                        </Box>

                        {/* Lanes Grid */}
                        {loadingVacantPositions ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                                <CircularProgress />
                            </Box>
                        ) : columns.length === 0 ? (
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minHeight: 400,
                                bgcolor: alpha('#1976d2', 0.02),
                                borderRadius: 4,
                                border: '2px dashed #e2e8f0',
                                p: 4
                            }}>
                                <ViewColumnIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1 }}>
                                    ยังไม่มีตำแหน่งว่าง
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.disabled', mb: 2, textAlign: 'center' }}>
                                    กดปุ่ม "โหลดตำแหน่งว่าง" เพื่อดึงข้อมูลตำแหน่งว่างจากระบบ<br />
                                    หรือกดปุ่ม "เพิ่ม Lane ใหม่" เพื่อสร้างเลนด้วยตนเอง
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={fetchVacantPositions}
                                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                                >
                                    โหลดตำแหน่งว่าง
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{
                                display: 'flex',
                                gap: 3,
                                flexWrap: 'nowrap',
                                minWidth: 'max-content',
                                pb: 2
                            }}>
                                {columns.map(col => (
                                    <Box key={col.id} sx={{ width: 320, flexShrink: 0 }}>
                                        <SortableColumn
                                            column={col}
                                            itemIds={col.itemIds}
                                            personnelMap={personnelMap}
                                            onRemove={() => handleRemoveLane(col.id)}
                                            onRemoveItem={handleRemoveFromBoard}
                                            onMoveItem={handleMoveItem}
                                            onUpdatePersonnel={handleUpdatePersonnel}
                                            dragOverItemId={dragOverLaneId === col.id ? dragOverItemId : null}
                                        />
                                    </Box>
                                ))}

                                {/* Add Lane Placeholder Card */}
                                <Paper
                                    elevation={0}
                                    onClick={() => setIsNewLaneDialogOpen(true)}
                                    sx={{
                                        width: 350,
                                        flexShrink: 0,
                                        minHeight: 400,
                                        bgcolor: alpha('#1976d2', 0.02),
                                        borderRadius: 4,
                                        border: '2px dashed #e2e8f0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: alpha('#1976d2', 0.05)
                                        }
                                    }}
                                >
                                    <ViewColumnIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.5, mb: 1 }} />
                                    <Typography sx={{ fontWeight: 700, color: 'primary.main', opacity: 0.7 }}>
                                        เพิ่ม Lane ใหม่
                                    </Typography>
                                </Paper>
                            </Box>
                        )}
                    </Box>
                </Box>

                <DragOverlay
                    dropAnimation={{
                        duration: 200,
                        easing: 'ease',
                    }}
                >
                    {activeId && activeItem ? (
                        <Box sx={{
                            width: 320,
                            bgcolor: 'white',
                            borderRadius: 1,
                            boxShadow: '0 16px 32px -4px rgba(0,0,0,0.15)',
                            border: '2px solid',
                            borderColor: 'primary.main',
                            overflow: 'hidden'
                        }}>
                            <PersonnelCardInner personnel={activeItem} />
                        </Box>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* New Lane Dialog */}
            <Dialog
                open={isNewLaneDialogOpen}
                onClose={() => setIsNewLaneDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
                    เพิ่ม Lane ใหม่
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="ชื่อ Lane"
                        placeholder="เช่น ฝ่ายบริหาร, ฝ่ายสอบสวน..."
                        value={newLaneTitle}
                        onChange={(e) => setNewLaneTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newLaneTitle.trim()) {
                                e.preventDefault();
                                handleAddLane();
                            }
                        }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setIsNewLaneDialogOpen(false)}
                        sx={{ fontWeight: 600, textTransform: 'none' }}
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAddLane}
                        disabled={!newLaneTitle.trim()}
                        sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                    >
                        เพิ่ม Lane
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%', fontWeight: 600 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
