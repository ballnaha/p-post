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
    Pagination,
    Skeleton,
    useMediaQuery,
    useTheme,
    Badge,
    Menu,
    Tooltip,
    Avatar
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    FilterList as FilterListIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Person as PersonIcon,
    Add as AddIcon,
    DragIndicator as DragIndicatorIcon,
    ChevronRight as ChevronRightIcon,
    Star as StarIcon,
    School as EducationIcon,
    CalendarToday as CalendarIcon,
    Badge as BadgeIcon
} from '@mui/icons-material';
import { Stack } from '@mui/material'; // Added Stack
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface PolicePersonnel {
    id: string;
    rank?: string;
    fullName?: string;
    position?: string;
    positionNumber?: string;
    unit?: string;
    avatarUrl?: string | null;
    nationality?: string;
    nationalId?: string; // Added from PersonnelDrawer
    age?: string;
    seniority?: string;
    birthDate?: string | null;
    education?: string | null;
    yearsOfService?: string;
    lastAppointment?: string | null; // Added
    currentRankSince?: string | null;
    enrollmentDate?: string | null;
    retirementDate?: string | null; // Added
    trainingCourse?: string;
    trainingLocation?: string | null;
    actingAs?: string; // Added
    notes?: string | null; // Added
    rankLevel?: number; // Added
    supporterName?: string;
    supportReason?: string;
    posCodeId?: number; // Added
    posCodeMaster?: { id: number; name: string } | null; // Added
    [key: string]: any;
}

interface DraggablePersonnelDrawerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (personnel: PolicePersonnel) => void;
    title?: string;
    excludePersonnelId?: string | string[];
    initialFilterUnit?: string;
    initialFilterPosCode?: number;
    columns?: { id: string; title: string }[]; // New prop for lane selection
    onAddToLane?: (person: PolicePersonnel, laneId: string) => void; // New prop for direct add
    onRemove?: (person: PolicePersonnel) => void; // New prop for removing from board
    isDragging?: boolean; // Prevent updates during drag
}

const DraggableItem = ({ person, onAddToLaneClicked }: { person: PolicePersonnel; onAddToLaneClicked: (event: React.MouseEvent<HTMLElement>, person: PolicePersonnel) => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: person.id,
        data: {
            type: 'Personnel',
            personnel: { ...person, id: person.id }
        },
    });

    const [expanded, setExpanded] = useState(false);

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
    };

    const formatDate = (dateString?: string | null): string => {
        if (!dateString || dateString === '-') return '-';
        if (typeof dateString === 'string' && dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const year = parseInt(parts[2]);
                if (year > 2500) return dateString;
                return `${parts[0]}/${parts[1]}/${year + 543}`;
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

    return (
        <Paper
            ref={setNodeRef}
            style={style}
            elevation={0}
            sx={{
                mb: 1,
                border: '1px solid',
                borderColor: 'grey.200',
                bgcolor: 'background.paper',
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                },
                overflow: 'hidden'
            }}
        >
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                {/* Drag Handle */}
                <Box
                    {...listeners}
                    {...attributes}
                    sx={{
                        color: 'text.disabled',
                        cursor: 'grab',
                        mt: 0.5,
                        '&:active': { cursor: 'grabbing' }
                    }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </Box>

                <Avatar
                    src={person.avatarUrl || undefined}
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1.5,
                        bgcolor: alpha('#1976d2', 0.1),
                        color: 'primary.main',
                        fontSize: '1rem',
                        fontWeight: 800,
                        mt: 0.5
                    }}
                >
                    {person.rank ? person.rank[0] : (person.fullName ? person.fullName[0] : '?')}
                </Avatar>

                <Box sx={{ flexGrow: 1, minWidth: 0, cursor: 'default' }}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '1rem' }}>
                        {person.rank} {person.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.875rem' }}>
                        {person.position}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                        <Chip
                            label={person.posCodeId ? `${person.posCodeId} - ${person.posCodeMaster?.name || '-'}` : (person.posCodeMaster?.name || '-')}
                            size="small"
                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'primary.50', color: 'primary.main' }}
                        />
                        <Chip
                            label={person.unit || 'ไม่ระบุหน่วย'}
                            size="small"
                            sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'grey.100' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {person.positionNumber}
                        </Typography>
                    </Box>


                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                        อายุ: {person.age || '-'} | อายุงาน: {person.seniority || '-'}
                    </Typography>

                    {person.supporterName && (
                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                            <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                                {person.supporterName}
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Tooltip title="เพิ่มลงในเลน">
                        <IconButton
                            size="small"
                            sx={{ bgcolor: 'primary.50', color: 'primary.main', '&:hover': { bgcolor: 'primary.100' } }}
                            onClick={(e) => onAddToLaneClicked(e, person)}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <IconButton
                        size="small"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                </Box>
            </Box>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={1.5} sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    {/* ข้อมูลส่วนตัว */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                            <PersonIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.85rem' }}>
                                ข้อมูลส่วนตัว
                            </Typography>
                        </Box>
                        <Box sx={{ pl: 3.5 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">เลขบัตรประชาชน</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.nationalId || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">วันเกิด</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{formatDate(person.birthDate)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">อายุ</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                        {person.age && person.age !== '-' ? `${person.age}` : '-'}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">อาวุโส</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.seniority || '-'}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    {/* ข้อมูลตำแหน่ง */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                            <BadgeIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.85rem' }}>
                                ข้อมูลตำแหน่ง
                            </Typography>
                        </Box>
                        <Box sx={{ pl: 3.5 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ยศ</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.rank || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.position || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">เลขตำแหน่ง</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.positionNumber || '-'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">หน่วย</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.unit || '-'}</Typography>
                                </Box>
                                {person.actingAs && person.actingAs !== '-' && (
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Typography variant="caption" color="text.secondary">ทำหน้าที่</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.actingAs}</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    {/* ข้อมูลการแต่งตั้ง */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                            <CalendarIcon fontSize="small" color="primary" />
                            <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.85rem' }}>
                                ข้อมูลการแต่งตั้ง
                            </Typography>
                        </Box>
                        <Box sx={{ pl: 3.5 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">อายุราชการ</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                        {person.yearsOfService && person.yearsOfService !== '-' ? `${person.yearsOfService}` : '-'}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">วันบรรจุ</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{formatDate(person.enrollmentDate)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ระดับนี้เมื่อ</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{formatDate(person.currentRankSince)}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">วันเกษียณ</Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{formatDate(person.retirementDate)}</Typography>
                                </Box>
                                {person.lastAppointment && (
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Typography variant="caption" color="text.secondary">แต่งตั้งครั้งสุดท้าย</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.lastAppointment}</Typography>
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
                                <Typography variant="subtitle2" fontWeight={600} color="primary.main" sx={{ fontSize: '0.85rem' }}>
                                    การศึกษาและฝึกอบรม
                                </Typography>
                            </Box>
                            <Box sx={{ pl: 3.5 }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                    {person.education && (
                                        <Box sx={{ gridColumn: '1 / -1' }}>
                                            <Typography variant="caption" color="text.secondary">คุณวุฒิ</Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.education}</Typography>
                                        </Box>
                                    )}
                                    {person.trainingCourse && person.trainingCourse !== '-' && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">นรต</Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.trainingCourse}</Typography>
                                        </Box>
                                    )}
                                    {person.trainingLocation && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">สถานที่ฝึก</Typography>
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.trainingLocation}</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* ข้อมูลการเสนอชื่อ/ผู้สนับสนุน */}
                    {(person.supporterName || person.supportReason) && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                <PersonIcon fontSize="small" color="success" />
                                <Typography variant="subtitle2" fontWeight={600} color="success.main" sx={{ fontSize: '0.85rem' }}>
                                    ข้อมูลการเสนอชื่อ
                                </Typography>
                            </Box>
                            <Box sx={{ pl: 3.5 }}>
                                {person.supporterName && (
                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="caption" color="text.secondary">ผู้สนับสนุน</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                            {person.supporterName}
                                        </Typography>
                                    </Box>
                                )}
                                {person.supportReason && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">เหตุผลในการสนับสนุน</Typography>
                                        <Paper sx={{ p: 1, mt: 0.5, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                                            <Typography variant="body2" sx={{ lineHeight: 1.6, fontSize: '0.8rem' }}>
                                                {person.supportReason}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}

                    {/* หมายเหตุ */}
                    {person.notes && (
                        <Box>
                            <Typography variant="caption" color="text.secondary">หมายเหตุ</Typography>
                            <Paper sx={{ p: 0.75, mt: 0.5, bgcolor: 'grey.50' }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{person.notes}</Typography>
                            </Paper>
                        </Box>
                    )}
                </Stack>
            </Collapse>
        </Paper>
    );
};

export default function DraggablePersonnelDrawer({
    open,
    onClose,
    title = 'เลือกบุคลากร',
    excludePersonnelId,
    initialFilterUnit,
    initialFilterPosCode,
    columns = [],
    onAddToLane,
    onRemove,
    isDragging = false
}: DraggablePersonnelDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [personnel, setPersonnel] = useState<PolicePersonnel[]>([]);
    const [totalPersonnel, setTotalPersonnel] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(20);

    // Filter States
    const [filterUnit, setFilterUnit] = useState<string>('all');
    const [filterPosCode, setFilterPosCode] = useState<string>('all');
    const [filterSupporter, setFilterSupporter] = useState<string>('all');
    const [allUnits, setAllUnits] = useState<string[]>([]);
    const [posCodeOptions, setPosCodeOptions] = useState<Array<{ id: number; name: string }>>([]);

    // Menu State
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedPersonForMenu, setSelectedPersonForMenu] = useState<PolicePersonnel | null>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Load Data
    const fetchPersonnel = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
            if (filterUnit && filterUnit !== 'all') params.set('unit', filterUnit);
            if (filterPosCode && filterPosCode !== 'all') params.set('posCodeId', filterPosCode);
            if (filterSupporter && filterSupporter !== 'all') params.set('supporter', filterSupporter);
            params.set('page', page.toString());
            params.set('limit', rowsPerPage.toString());
            params.set('year', (new Date().getFullYear() + 543).toString());

            const res = await fetch(`/api/police-personnel/candidates?${params.toString()}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            let list = Array.isArray(data?.data) ? data.data : [];

            // Filter out excluded IDs (compare against both id and noId)
            if (excludePersonnelId) {
                const excludeIds = Array.isArray(excludePersonnelId) ? excludePersonnelId : [excludePersonnelId];
                list = list.filter((p: any) => {
                    // Check if either p.id or p.noId matches any excluded ID
                    const pNoId = String(p.noId || '');
                    const pId = String(p.id || '');
                    return !excludeIds.includes(pId) && !excludeIds.includes(pNoId);
                });
            }

            setPersonnel(list);
            setTotalPersonnel(data?.total || 0);

            // Load filters if check needed (omitted for brevity, assume loaded or loaded once)
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
        if (open) {
            loadFilters();
        }
    }, [open]);

    useEffect(() => {
        // Don't fetch during drag to prevent list from changing mid-drag
        if (open && !isDragging) {
            fetchPersonnel();
        }
    }, [open, page, rowsPerPage, debouncedSearchTerm, filterUnit, filterPosCode, filterSupporter, isDragging]);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, person: PolicePersonnel) => {
        setAnchorEl(event.currentTarget);
        setSelectedPersonForMenu(person);
    };

    const handleLaneSelect = (laneId: string) => {
        if (selectedPersonForMenu && onAddToLane) {
            onAddToLane(selectedPersonForMenu, laneId);
        }
        setAnchorEl(null);
        setSelectedPersonForMenu(null);
    };

    return (
        <Drawer
            variant="persistent" // Allows interaction with board while open
            anchor="right"
            open={open}
            sx={{
                width: open ? { xs: '100%', sm: 500 } : 0,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: { xs: '100%', sm: 500 },
                    boxSizing: 'border-box',
                    borderLeft: '1px solid #e2e8f0',
                    boxShadow: '-4px 0 20px rgba(0,0,0,0.05)'
                },
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                <Box>
                    <Typography variant="h6" fontWeight={800}>{title}</Typography>
                    <Typography variant="caption" color="text.secondary">ลากพนักงานไปวางในเลน หรือกดปุ่มเพิ่ม</Typography>
                </Box>
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </Box>

            {/* Search & Filters */}
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#f8fafc' }}>
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
                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
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
            </Box>

            {/* List */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f1f5f9' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : personnel.length === 0 ? (
                    <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
                        <Typography>ไม่พบข้อมูล</Typography>
                    </Box>
                ) : (
                    <>
                        {personnel
                            .filter(p => !excludePersonnelId?.includes(p.id))
                            .map(person => (
                                <DraggableItem
                                    key={person.id}
                                    person={person}
                                    onAddToLaneClicked={handleMenuClick}
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

            {/* Lane Selection Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                PaperProps={{ sx: { borderRadius: 1, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', mt: 1, minWidth: 200 } }}
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
                {onRemove && (
                    <Box>
                        <Divider sx={{ my: 1 }} />
                        <MenuItem
                            onClick={() => {
                                if (selectedPersonForMenu) onRemove(selectedPersonForMenu);
                                setAnchorEl(null);
                                setSelectedPersonForMenu(null);
                            }}
                            sx={{ px: 2, py: 1.5, color: 'error.main' }}
                        >
                            <CloseIcon sx={{ mr: 2, fontSize: 20 }} />
                            <Typography sx={{ fontWeight: 700 }}>ลบออกจากกระดาน</Typography>
                        </MenuItem>
                    </Box>
                )}
            </Menu>

        </Drawer>
    );
}
