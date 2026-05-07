import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
    IconButton,
    Drawer,
    Box,
    Typography,
    TextField,
    InputAdornment,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    alpha,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Avatar,
    Paper
} from '@mui/material';
import {
    DriveFileMove as DriveFileMoveIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Close as CloseIcon,
    ChevronRight as ChevronRightIcon,
    Groups as GroupsIcon,
    ArrowForward as ArrowForwardIcon,
    History as HistoryIcon,
    Star as StarIcon
} from '@mui/icons-material';
import { matchesAnyWildcardSearch } from '@/lib/wildcardSearch';
import { Virtuoso } from 'react-virtuoso';

const RECENT_LANES_KEY = 'personnel_board_recent_lanes';

interface Lane {
    id: string;
    title: string;
    groupNumber?: string;
    occupantCount?: number;
    occupants?: any[];
    getOccupants?: () => any[];
}

interface MoveToLaneButtonProps {
    availableLanes: Lane[];
    onMove: (laneId: string) => void;
    personName?: string;
    personPosition?: string;
    personPosCode?: string;
    personPosName?: string;
    personUnit?: string;
    moveCount?: number;
    selectedPeople?: { name: string; position?: string; unit?: string }[];
}

// Sub-component for individual lane item to optimize rendering
const LaneItem = memo(({
    lane,
    onMove,
    onDetails,
    highlightText,
    searchTerm
}: {
    lane: Lane;
    onMove: (id: string) => void;
    onDetails: (lane: Lane) => void;
    highlightText: (text: string, highlight: string) => React.ReactNode;
    searchTerm: string;
}) => {
    return (
        <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
                onClick={() => onMove(lane.id)}
                sx={{
                    borderRadius: 2,
                    bgcolor: 'white',
                    border: '1px solid #e2e8f0',
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        bgcolor: 'white',
                        borderColor: 'primary.main',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
                        '& .move-icon': {
                            opacity: 1,
                            color: 'primary.main',
                            transform: 'translateX(0)'
                        }
                    }
                }}
            >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        {lane.groupNumber ? (
                            <Chip
                                label={highlightText(`กลุ่ม ${lane.groupNumber}`, searchTerm)}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                    bgcolor: alpha('#3b82f6', 0.08),
                                    color: 'primary.main',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: alpha('#3b82f6', 0.2)
                                }}
                            />
                        ) : <Box />}

                        {lane.occupantCount !== undefined && lane.occupantCount > 0 && (
                            <Tooltip title="คลิกเพื่อดูรายชื่อ">
                                <Chip
                                    icon={<GroupsIcon sx={{ fontSize: '14px !important' }} />}
                                    label={`${lane.occupantCount} คน`}
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDetails(lane);
                                    }}
                                    sx={{
                                        height: 22,
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        bgcolor: alpha('#3b82f6', 0.1),
                                        color: 'primary.main',
                                        '& .MuiChip-icon': { color: 'primary.main' },
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            '& .MuiChip-icon': { color: 'white' }
                                        }
                                    }}
                                />
                            </Tooltip>
                        )}
                    </Box>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 700,
                            color: '#334155',
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {highlightText(lane.title, searchTerm)}
                    </Typography>
                </Box>
                <ChevronRightIcon
                    className="move-icon"
                    sx={{
                        fontSize: 20,
                        opacity: 0.15,
                        color: 'text.disabled',
                        transition: 'all 0.3s',
                        transform: 'translateX(-4px)'
                    }}
                />
            </ListItemButton>
        </ListItem>
    );
});

LaneItem.displayName = 'LaneItem';

export default function MoveToLaneButton({
    availableLanes,
    onMove,
    personName,
    personPosition,
    personPosCode,
    personPosName,
    personUnit,
    moveCount = 1,
    selectedPeople = []
}: MoveToLaneButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [detailsLane, setDetailsLane] = useState<Lane | null>(null);
    const [recentLaneIds, setRecentLaneIds] = useState<string[]>([]);
    // Snapshot props at open time so parent selection changes don't affect drawer display
    const [snapshotPeople, setSnapshotPeople] = useState<{ name: string; position?: string; unit?: string }[]>([]);
    const [snapshotCount, setSnapshotCount] = useState(1);
    const [snapshotPersonName, setSnapshotPersonName] = useState<string | undefined>(undefined);
    const [snapshotPersonPosition, setSnapshotPersonPosition] = useState<string | undefined>(undefined);
    const [snapshotPersonUnit, setSnapshotPersonUnit] = useState<string | undefined>(undefined);

    // When drawer opens: load recent lanes AND snapshot current selection
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem(RECENT_LANES_KEY);
            if (saved) {
                try {
                    setRecentLaneIds(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse recent lanes', e);
                }
            }
            // Lock current selection state into snapshots
            setSnapshotPeople(selectedPeople);
            setSnapshotCount(moveCount);
            setSnapshotPersonName(personName);
            setSnapshotPersonPosition(personPosition);
            setSnapshotPersonUnit(personUnit);
        } else {
            setSearchTerm('');
        }
    }, [isOpen]); // intentionally only depends on isOpen — snapshot on open, not on every prop change

    const handleMove = useCallback((laneId: string) => {
        // Update recent lanes
        const updatedRecent = [laneId, ...recentLaneIds.filter(id => id !== laneId)].slice(0, 5);
        setRecentLaneIds(updatedRecent);
        localStorage.setItem(RECENT_LANES_KEY, JSON.stringify(updatedRecent));

        onMove(laneId);
        setIsOpen(false);
    }, [onMove, recentLaneIds]);

    const handleShowDetails = useCallback((lane: Lane) => {
        setDetailsLane({
            ...lane,
            occupants: lane.getOccupants?.() || []
        });
    }, []);

    const filteredLanes = useMemo(() => {
        if (!searchTerm.trim()) return availableLanes;
        return availableLanes.filter(lane =>
            matchesAnyWildcardSearch([lane.title, lane.groupNumber], searchTerm)
        );
    }, [availableLanes, searchTerm]);

    // Grouping Logic
    const groupedLanes = useMemo(() => {
        const groups: Record<string, Lane[]> = {};
        const recent: Lane[] = [];

        // Identify recent lanes if not searching
        if (!searchTerm) {
            const recentSet = new Set(recentLaneIds);
            recentLaneIds.forEach(id => {
                const lane = availableLanes.find(l => l.id === id);
                if (lane) recent.push(lane);
            });
        }

        filteredLanes.forEach(lane => {
            let groupKey = 'กลุ่มทั่วไป';
            if (lane.groupNumber) {
                // Smart Prefix Extraction: 
                // e.g., "2569/WF-001" -> "2569/WF"
                // e.g., "Batch-123" -> "Batch"
                const parts = lane.groupNumber.split(/[-/]/);
                if (parts.length > 1) {
                    // Reconstruct prefix up to the last separator
                    // For "2569/WF-001", we might want "2569/WF"
                    const lastIndex = lane.groupNumber.lastIndexOf('-');
                    if (lastIndex !== -1) {
                        groupKey = `กลุ่ม ${lane.groupNumber.substring(0, lastIndex)}`;
                    } else {
                        const slashIndex = lane.groupNumber.lastIndexOf('/');
                        if (slashIndex !== -1) {
                            groupKey = `กลุ่ม ${lane.groupNumber.substring(0, slashIndex)}`;
                        } else {
                            groupKey = `กลุ่ม ${lane.groupNumber}`;
                        }
                    }
                } else {
                    groupKey = `กลุ่ม ${lane.groupNumber}`;
                }
            }
            
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(lane);
        });

        // Sort groups: numbers first, then general
        const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
            if (a === 'กลุ่มทั่วไป') return 1;
            if (b === 'กลุ่มทั่วไป') return -1;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Sort lanes within each group
        sortedGroupKeys.forEach(key => {
            groups[key].sort((a, b) => {
                const numA = a.groupNumber || '';
                const numB = b.groupNumber || '';
                return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
            });
        });

        return { recent, groups, sortedGroupKeys };
    }, [filteredLanes, availableLanes, recentLaneIds, searchTerm]);

    const highlightText = useCallback((text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <Box component="span" key={i} sx={{ bgcolor: alpha('#f59e0b', 0.25), color: '#b45309', fontWeight: 900, px: 0.2, borderRadius: 0.5 }}>
                            {part}
                        </Box>
                    ) : (
                        part
                    )
                )}
            </>
        );
    }, []);

    if (availableLanes.length === 0) return null;

    return (
        <>
            <Tooltip title={moveCount > 1 ? `ย้าย ${moveCount} คนที่เลือกเข้าเลน` : 'ย้ายเข้าเลน'}>
                <IconButton
                    size="small"
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsOpen(true);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    sx={{
                        color: 'text.secondary',
                        opacity: 0.6,
                        '&:hover': {
                            opacity: 1,
                            color: 'primary.main',
                            bgcolor: alpha('#3b82f6', 0.08)
                        }
                    }}
                >
                    <DriveFileMoveIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Drawer
                anchor="right"
                open={isOpen}
                onClose={() => setIsOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 860 },
                        bgcolor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)'
                    }
                }}
            >
                {/* Header */}
                <Box sx={{
                    p: 2.5,
                    bgcolor: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 1.5,
                            bgcolor: alpha('#3b82f6', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'primary.main',
                            boxShadow: `inset 0 0 0 1px ${alpha('#3b82f6', 0.1)}`
                        }}>
                            <DriveFileMoveIcon />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                {snapshotCount > 1 ? `ย้าย ${snapshotCount} คนเข้าเลน` : 'ย้ายเข้าเลน'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                ทั้งหมด <Box component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>{availableLanes.length}</Box> เลนที่รองรับ
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        size="small"
                        onClick={() => setIsOpen(false)}
                        sx={{
                            bgcolor: '#f1f5f9',
                            '&:hover': { bgcolor: '#e2e8f0' }
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Person / Batch Info Section */}
                {(snapshotPersonName || snapshotPeople.length > 0) && (
                    <Box sx={{
                        px: 2.5,
                        py: 2,
                        bgcolor: alpha(snapshotPeople.length > 1 ? '#7c3aed' : '#3b82f6', 0.03),
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5
                    }}>
                        {/* Header row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {snapshotPeople.length > 1 ? `ย้ายพร้อมกัน ${snapshotPeople.length} คน` : 'บุคคลที่จะย้าย'}
                            </Typography>
                            {snapshotPeople.length > 1 && (
                                <Chip
                                    label="Bulk Move"
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900, bgcolor: alpha('#7c3aed', 0.1), color: '#7c3aed', border: '1px solid', borderColor: alpha('#7c3aed', 0.2) }}
                                />
                            )}
                        </Box>

                        {/* Multi-person list */}
                        {snapshotPeople.length > 1 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                {snapshotPeople.map((p, i) => (
                                    <Box key={i} sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        bgcolor: 'white',
                                        px: 1.5,
                                        py: 1,
                                        borderRadius: 2,
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <Avatar sx={{
                                            width: 28, height: 28,
                                            bgcolor: alpha('#7c3aed', 0.1),
                                            color: '#7c3aed',
                                            fontSize: '0.7rem',
                                            fontWeight: 900,
                                            flexShrink: 0
                                        }}>
                                            {i + 1}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }} noWrap>
                                                {p.name}
                                            </Typography>
                                            {p.position && (
                                                <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1 }} noWrap>
                                                    {p.position}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            /* Single person */
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.7rem' }}>P</Avatar>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b' }}>
                                        {snapshotPersonName}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {snapshotPersonPosition && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'white', px: 1, py: 0.3, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>ตำแหน่ง:</Typography>
                                            <Typography variant="caption" sx={{ color: '#334155', fontWeight: 800 }}>{snapshotPersonPosition}</Typography>
                                        </Box>
                                    )}
                                    {snapshotPersonUnit && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'white', px: 1, py: 0.3, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>หน่วย:</Typography>
                                            <Typography variant="caption" sx={{ color: '#334155', fontWeight: 800 }}>{snapshotPersonUnit}</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Search Bar Section */}
                <Box sx={{ p: 2.5, bgcolor: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 94, zIndex: 9 }}>
                    <TextField
                        fullWidth
                        size="small"
                        autoFocus
                        placeholder="ค้นหาชื่อเลน หรือเลขกลุ่ม..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchTerm && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: 3,
                                bgcolor: '#f1f5f9',
                                '& fieldset': { borderColor: 'transparent' },
                                '&:hover fieldset': { borderColor: alpha('#3b82f6', 0.2) },
                                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
                                transition: 'all 0.2s'
                            }
                        }}
                    />
                    {searchTerm && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', fontWeight: 700 }}>
                            พบ {filteredLanes.length} รายการที่ตรงกัน
                        </Typography>
                    )}
                </Box>

                {/* Virtualized List Container */}
                <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {filteredLanes.length === 0 ? (
                        <Box sx={{ py: 12, textAlign: 'center', px: 4 }}>
                            <Box sx={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                bgcolor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2,
                                color: '#94a3b8'
                            }}>
                                <SearchIcon sx={{ fontSize: 32 }} />
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#475569', mb: 1 }}>
                                ไม่พบผลลัพธ์
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                ลองเปลี่ยนคำค้นหา หรือตรวจสอบการสะกดอีกครั้ง
                            </Typography>
                        </Box>
                    ) : (
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={groupedLanes.sortedGroupKeys}
                            components={{
                                Header: () => (
                                    <>
                                        {groupedLanes.recent.length > 0 && !searchTerm && (
                                            <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <HistoryIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.62rem' }}>
                                                        ล่าสุด
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                                    {groupedLanes.recent.map(lane => (
                                                        <Chip
                                                            key={`recent-${lane.id}`}
                                                            label={lane.groupNumber ? `กลุ่ม ${lane.groupNumber}` : lane.title}
                                                            size="small"
                                                            icon={<HistoryIcon sx={{ fontSize: '13px !important' }} />}
                                                            onClick={() => handleMove(lane.id)}
                                                            sx={{
                                                                height: 26,
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                bgcolor: 'white',
                                                                border: '1px solid #e2e8f0',
                                                                color: '#475569',
                                                                cursor: 'pointer',
                                                                maxWidth: 180,
                                                                transition: 'all 0.15s',
                                                                '& .MuiChip-icon': { color: '#94a3b8' },
                                                                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                                                                '&:hover': {
                                                                    bgcolor: alpha('#3b82f6', 0.06),
                                                                    borderColor: 'primary.main',
                                                                    color: 'primary.main',
                                                                    '& .MuiChip-icon': { color: 'primary.main' }
                                                                }
                                                            }}
                                                        />
                                                    ))}
                                                </Box>
                                                <Divider sx={{ mt: 1.5, borderStyle: 'dashed', borderColor: '#e2e8f0' }} />
                                            </Box>
                                        )}
                                    </>
                                )
                            }}
                            itemContent={(index, groupKey) => {
                                const lanesInGroup = groupedLanes.groups[groupKey];
                                return (
                                    <Box key={groupKey} sx={{ px: 2, py: 1 }}>
                                        <Box sx={{
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 2,
                                            bgcolor: alpha('#f8fafc', 0.95),
                                            backdropFilter: 'blur(8px)',
                                            py: 1,
                                            px: 1.5,
                                            mb: 1.5,
                                            borderRadius: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            border: '1px solid',
                                            borderColor: alpha('#e2e8f0', 0.6),
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}>
                                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {groupKey}
                                            </Typography>
                                            <Chip
                                                label={`${lanesInGroup.length} รายการ`}
                                                size="small"
                                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'white', border: '1px solid #e2e8f0', color: '#94a3b8' }}
                                            />
                                        </Box>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                            {lanesInGroup.map(lane => (
                                                <LaneItem
                                                    key={lane.id}
                                                    lane={lane}
                                                    onMove={handleMove}
                                                    onDetails={handleShowDetails}
                                                    highlightText={highlightText}
                                                    searchTerm={searchTerm}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                );
                            }}
                        />
                    )}
                </Box>
            </Drawer>

            {/* Occupants Details Dialog */}
            <Dialog
                open={Boolean(detailsLane)}
                onClose={() => setDetailsLane(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 4, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }
                }}
            >
                <DialogTitle sx={{
                    bgcolor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e2e8f0',
                    py: 2.5
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, boxShadow: `0 4px 12px ${alpha('#3b82f6', 0.3)}` }}>
                            <GroupsIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                                {detailsLane?.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                รายชื่อบุคคลในเลน ({detailsLane?.occupants?.length || 0} คน)
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setDetailsLane(null)} sx={{ bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0, bgcolor: '#f8fafc' }}>
                    <List disablePadding>
                        {detailsLane?.occupants?.map((occ, i) => (
                            <ListItem
                                key={i}
                                divider={i !== detailsLane.occupants!.length - 1}
                                sx={{
                                    py: 2,
                                    px: 2.5,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    gap: 1.5,
                                    transition: 'background-color 0.2s',
                                    '&:hover': { bgcolor: alpha('#3b82f6', 0.03) }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', flex: 1 }}>
                                        {i + 1}. {occ.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Chip label={`อายุ: ${occ.age || '-'}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, color: '#64748b', borderColor: '#e2e8f0', bgcolor: 'white' }} />
                                        <Chip label={`อาวุโส: ${occ.seniority || '-'}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, color: '#64748b', borderColor: '#e2e8f0', bgcolor: 'white' }} />
                                    </Box>
                                </Box>

                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    bgcolor: 'white',
                                    p: 1.5,
                                    borderRadius: 2,
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" noWrap sx={{ fontWeight: 700, color: '#64748b', display: 'block' }}>จากเดิม</Typography>
                                        <Typography variant="caption" noWrap sx={{ fontWeight: 800, color: '#334155', fontSize: '0.75rem', display: 'block' }}>{occ.currentPosition}</Typography>
                                        <Typography variant="caption" noWrap sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>{occ.currentUnit}</Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}>
                                        <ArrowForwardIcon sx={{ color: 'primary.main', fontSize: 18, opacity: 0.5 }} />
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" noWrap sx={{ fontWeight: 700, color: '#059669', display: 'block' }}>เป้าหมาย</Typography>
                                        <Typography variant="caption" noWrap sx={{ fontWeight: 900, color: '#059669', fontSize: '0.75rem', display: 'block' }}>{occ.targetPosition}</Typography>
                                        <Typography variant="caption" noWrap sx={{ color: '#10b981', fontSize: '0.65rem' }}>{occ.targetUnit}</Typography>
                                    </Box>
                                </Box>

                                {occ.requestedPosition && (
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        bgcolor: alpha('#f59e0b', 0.08),
                                        px: 1.5,
                                        py: 0.8,
                                        borderRadius: 1.5,
                                        border: '1px solid',
                                        borderColor: alpha('#f59e0b', 0.2)
                                    }}>
                                        <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 800, fontSize: '0.7rem' }}>
                                            📍 ร้องขอ: {occ.requestedPosition}
                                        </Typography>
                                    </Box>
                                )}
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}>
                    <Button
                        onClick={() => setDetailsLane(null)}
                        variant="contained"
                        color="inherit"
                        sx={{
                            borderRadius: 2,
                            fontWeight: 800,
                            px: 3,
                            bgcolor: '#f1f5f9',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#e2e8f0', boxShadow: 'none' }
                        }}
                    >
                        ปิดหน้าต่างนี้
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
