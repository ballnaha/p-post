'use client';

import React, { useState, memo, useMemo } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Chip,
    alpha,
    Drawer,
    Divider,
    Paper,
    Tooltip,
    Collapse,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Summarize as SummarizeIcon,
    Close as CloseIcon,
    SwapHoriz as SwapIcon,
    ChangeHistory as ThreeWayIcon,
    TrendingUp as PromotionIcon,
    Inventory as CustomIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    ArrowForward as ArrowForwardIcon,
    Search as SearchIcon,
    UnfoldMore as UnfoldMoreIcon,
    UnfoldLess as UnfoldLessIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { Column, Personnel } from '../types';

interface LaneSummaryButtonProps {
    columns: Column[];
    personnelMap: Record<string, Personnel>;
    onOpenDetail?: (person: Personnel, targetInfo?: any) => void;
}

interface LaneSummary {
    type: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    lanes: Column[];
    totalPersonnel: number;
    withPlaceholder: number;
    completed: number;
}

// Constants
const LANES_PER_PAGE = 10;

// Sub-component for lane detail view
const LaneDetailView = memo(({ lane, personnelMap, color, onOpenDetail }: { lane: Column; personnelMap: Record<string, Personnel>; color: string; onOpenDetail?: (person: Personnel, targetInfo?: any) => void }) => {
    const chainType = lane.chainType || 'custom';
    const isSwap = chainType === 'swap';
    const isThreeWay = chainType === 'three-way';
    const isPromotion = chainType === 'promotion';

    // Get all personnel in this lane
    const personnelList = lane.itemIds.map((id, index) => {
        const person = personnelMap[id];
        if (!person) return null;

        const isPlaceholder = person.isPlaceholder || id.startsWith('placeholder-');

        // Calculate target info based on lane type
        let targetInfo: any = null;
        let targetDescription = '';
        let targetPosCodeId: any = null;
        let targetPosCodeName: string = '';
        let targetUnit: string = '';

        if (isSwap && lane.itemIds.length === 2) {
            const otherIndex = index === 0 ? 1 : 0;
            const otherPerson = personnelMap[lane.itemIds[otherIndex]];
            targetInfo = otherPerson;
            if (otherPerson && !otherPerson.isPlaceholder) {
                targetDescription = `→ ${otherPerson.position || otherPerson.toPosition || 'ตำแหน่งของ ' + otherPerson.fullName}`;
                targetPosCodeId = otherPerson.posCodeId;
                targetPosCodeName = otherPerson.posCodeMaster?.name || '';
                targetUnit = otherPerson.unit || '';
            }
        } else if (isThreeWay && lane.itemIds.length === 3) {
            const targetIndex = (index + 1) % 3;
            const targetPerson = personnelMap[lane.itemIds[targetIndex]];
            targetInfo = targetPerson;
            if (targetPerson && !targetPerson.isPlaceholder) {
                targetDescription = `→ ${targetPerson.position || targetPerson.toPosition || 'ตำแหน่งของ ' + targetPerson.fullName}`;
                targetPosCodeId = targetPerson.posCodeId;
                targetPosCodeName = targetPerson.posCodeMaster?.name || '';
                targetUnit = targetPerson.unit || '';
            }
        } else if (isPromotion) {
            if (person.toPosition) {
                targetDescription = `→ ${person.toPosition}`;
                targetPosCodeId = person.toPosCodeId;
                targetPosCodeName = person.toPosCodeMaster?.name || '';
                targetUnit = person.toUnit || '';
            } else if (index === 0 && lane.vacantPosition) {
                targetInfo = lane.vacantPosition;
                targetDescription = `→ ${lane.vacantPosition.position || 'ตำแหน่งว่าง'}`;
                targetPosCodeId = lane.vacantPosition.posCodeId || lane.vacantPosition.posCodeMaster?.id;
                targetPosCodeName = lane.vacantPosition.posCodeMaster?.name || '';
                targetUnit = lane.vacantPosition.unit || '';
            } else if (index > 0) {
                const prevPerson = personnelMap[lane.itemIds[index - 1]];
                if (prevPerson) {
                    targetInfo = prevPerson;
                    targetDescription = `→ ${prevPerson.position || 'ตำแหน่งของ ' + prevPerson.fullName}`;
                    targetPosCodeId = prevPerson.posCodeId;
                    targetPosCodeName = prevPerson.posCodeMaster?.name || '';
                    targetUnit = prevPerson.unit || '';
                }
            }
        }

        if (person.toPosCodeId) {
            targetPosCodeId = person.toPosCodeId;
            targetPosCodeName = person.toPosCodeMaster?.name || targetPosCodeName;
        }
        if (person.toUnit) {
            targetUnit = person.toUnit;
        }

        return {
            id,
            person,
            index,
            isPlaceholder,
            targetDescription,
            fromPosition: person.position || '-',
            toPosition: person.toPosition || targetDescription.replace('→ ', '') || '-',
            targetPosCodeId,
            targetPosCodeName,
            targetUnit,
            targetInfo,
        };
    }).filter(Boolean);

    if (personnelList.length === 0) {
        return (
            <Box sx={{ p: 2, textAlign: 'center', opacity: 0.5 }}>
                <Typography variant="caption">ไม่มีบุคลากรในเลนนี้</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: alpha(color, 0.03), borderRadius: 1.5, border: '1px dashed', borderColor: alpha(color, 0.2) }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: color, display: 'block', mb: 1 }}>
                📋 รายละเอียดการเปลี่ยนแปลง
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {personnelList.map((item: any, idx) => (
                    <Box
                        key={item.id}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1,
                            bgcolor: 'white',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: item.isPlaceholder ? 'warning.light' : '#e2e8f0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                    >
                        <Box sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: item.isPlaceholder ? alpha('#f59e0b', 0.1) : alpha(color, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: item.isPlaceholder ? 'warning.main' : color, fontSize: '0.65rem' }}>
                                {idx + 1}
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                {item.isPlaceholder ? (
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                        ⏳ Placeholder (รอใส่ข้อมูล)
                                    </Typography>
                                ) : (
                                    <>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                                            {item.person.rank || ''} {item.person.fullName}
                                        </Typography>
                                        {item.person.unit && (
                                            <Chip
                                                label={item.person.unit}
                                                size="small"
                                                sx={{
                                                    height: 16,
                                                    fontSize: '0.55rem',
                                                    fontWeight: 600,
                                                    bgcolor: alpha('#6366f1', 0.1),
                                                    color: '#6366f1',
                                                    '& .MuiChip-label': { px: 0.5 }
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </Box>

                            {!item.isPlaceholder && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                    {item.person.posCodeId && (
                                        <Chip
                                            label={`${item.person.posCodeId}${item.person.posCodeMaster?.name ? ' - ' + item.person.posCodeMaster.name : ''}`}
                                            size="small"
                                            sx={{
                                                height: 16,
                                                fontSize: '0.55rem',
                                                fontWeight: 700,
                                                bgcolor: alpha('#3b82f6', 0.1),
                                                color: '#3b82f6',
                                                '& .MuiChip-label': { px: 0.5 }
                                            }}
                                        />
                                    )}
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                                        {item.fromPosition}
                                    </Typography>
                                </Box>
                            )}

                            {!item.isPlaceholder && item.targetDescription && (
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.75, p: 0.75, bgcolor: alpha(color, 0.05), borderRadius: 0.75 }}>
                                    <ArrowForwardIcon sx={{ fontSize: 14, color: color, mt: 0.25 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 700, color: color, mb: 0.25, display: 'block' }}>
                                            ย้ายไป:
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                            {item.targetPosCodeId && (
                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 800, color: color }}>
                                                    {item.targetPosCodeId}{item.targetPosCodeName ? ` - ${item.targetPosCodeName}` : ''}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>
                                                {item.toPosition}
                                            </Typography>
                                            {item.targetUnit && (
                                                <Chip
                                                    label={item.targetUnit}
                                                    size="small"
                                                    sx={{
                                                        height: 16,
                                                        fontSize: '0.55rem',
                                                        fontWeight: 600,
                                                        bgcolor: alpha('#10b981', 0.1),
                                                        color: '#10b981',
                                                        '& .MuiChip-label': { px: 0.5 }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </Box>

                        {item.isPlaceholder && (
                            <WarningIcon sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
                        )}

                        {!item.isPlaceholder && (
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenDetail?.(item.person, item.targetInfo);
                                }}
                                sx={{
                                    ml: 0.5,
                                    color: 'text.secondary',
                                    '&:hover': {
                                        color: 'primary.main',
                                        bgcolor: alpha(color, 0.1)
                                    }
                                }}
                            >
                                <VisibilityIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        )}
                    </Box>
                ))}
            </Box>
        </Box>
    );
});

LaneDetailView.displayName = 'LaneDetailView';

const LaneSummaryButton = memo(({ columns, personnelMap, onOpenDetail }: LaneSummaryButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedLanes, setExpandedLanes] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggleLaneExpand = (laneId: string) => {
        setExpandedLanes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(laneId)) {
                newSet.delete(laneId);
            } else {
                newSet.add(laneId);
            }
            return newSet;
        });
    };

    const toggleExpandAllInGroup = (groupType: string, lanes: Column[]) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupType)) {
                // Collapse all in group
                newSet.delete(groupType);
                setExpandedLanes(prevExpanded => {
                    const newExpanded = new Set(prevExpanded);
                    lanes.forEach(lane => newExpanded.delete(lane.id));
                    return newExpanded;
                });
            } else {
                // Expand all visible lanes in group
                newSet.add(groupType);
                setExpandedLanes(prevExpanded => {
                    const newExpanded = new Set(prevExpanded);
                    const visibleCount = visibleCounts[groupType] || LANES_PER_PAGE;
                    lanes.slice(0, visibleCount).forEach(lane => newExpanded.add(lane.id));
                    return newExpanded;
                });
            }
            return newSet;
        });
    };

    const showMoreLanes = (groupType: string) => {
        setVisibleCounts(prev => ({
            ...prev,
            [groupType]: (prev[groupType] || LANES_PER_PAGE) + LANES_PER_PAGE
        }));
    };

    // Calculate summary data
    const summaryData = useMemo(() => {
        const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
            'swap': { label: 'สลับตำแหน่ง', icon: <SwapIcon />, color: '#a855f7' },
            'three-way': { label: 'สามเส้า', icon: <ThreeWayIcon />, color: '#f43f5e' },
            'promotion': { label: 'เลื่อนตำแหน่ง', icon: <PromotionIcon />, color: '#10b981' },
            'custom': { label: 'อื่นๆ', icon: <CustomIcon />, color: '#64748b' },
        };

        const grouped: Record<string, LaneSummary> = {};

        columns.forEach(col => {
            const type = col.chainType || 'custom';
            if (!grouped[type]) {
                const config = typeConfig[type] || typeConfig['custom'];
                grouped[type] = {
                    type,
                    label: config.label,
                    icon: config.icon,
                    color: config.color,
                    lanes: [],
                    totalPersonnel: 0,
                    withPlaceholder: 0,
                    completed: 0,
                };
            }

            grouped[type].lanes.push(col);
            grouped[type].totalPersonnel += col.itemIds.length;

            if (col.isCompleted) {
                grouped[type].completed++;
            }

            const hasPlaceholder = col.itemIds.some(id => {
                const person = personnelMap[id];
                return person?.isPlaceholder || id.startsWith('placeholder-');
            });
            if (hasPlaceholder) {
                grouped[type].withPlaceholder++;
            }
        });

        return Object.values(grouped).sort((a, b) => {
            const order = ['swap', 'three-way', 'promotion', 'custom'];
            return order.indexOf(a.type) - order.indexOf(b.type);
        });
    }, [columns, personnelMap]);

    // Filter lanes by search term
    const filteredSummaryData = useMemo(() => {
        if (!searchTerm.trim()) return summaryData;

        const lowerSearch = searchTerm.toLowerCase();
        return summaryData.map(group => ({
            ...group,
            lanes: group.lanes.filter(lane =>
                lane.title.toLowerCase().includes(lowerSearch) ||
                lane.groupNumber?.toLowerCase().includes(lowerSearch) ||
                lane.itemIds.some(id => {
                    const person = personnelMap[id];
                    return person?.fullName?.toLowerCase().includes(lowerSearch) ||
                        person?.rank?.toLowerCase().includes(lowerSearch);
                })
            )
        })).filter(group => group.lanes.length > 0);
    }, [summaryData, searchTerm, personnelMap]);

    // Overall statistics
    const overallStats = useMemo(() => {
        const totalLanes = columns.length;
        const activeLanes = columns.filter(c => !c.isCompleted).length;
        const completedLanes = columns.filter(c => c.isCompleted).length;
        const totalPersonnel = Object.keys(personnelMap).length;

        const lanesWithPlaceholder = columns.filter(col => {
            return col.itemIds.some(id => {
                const person = personnelMap[id];
                return person?.isPlaceholder || id.startsWith('placeholder-');
            });
        }).length;

        const placeholderCount = Object.values(personnelMap).filter(p =>
            p.isPlaceholder || p.id?.startsWith('placeholder-')
        ).length;

        return {
            totalLanes,
            activeLanes,
            completedLanes,
            totalPersonnel,
            lanesWithPlaceholder,
            placeholderCount,
        };
    }, [columns, personnelMap]);

    // Reset state when drawer closes
    const handleClose = () => {
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <>
            <Tooltip title="สรุปข้อมูลเลน">
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SummarizeIcon fontSize="small" />}
                    onClick={() => setIsOpen(true)}
                    sx={{
                        borderRadius: 2,
                        px: 2,
                        height: 36,
                        fontWeight: 700,
                        textTransform: 'none',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&:hover': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            bgcolor: 'primary.50',
                        }
                    }}
                >
                    สรุป
                </Button>
            </Tooltip>

            <Drawer
                anchor="right"
                open={isOpen}
                onClose={handleClose}
                PaperProps={{
                    sx: { width: { xs: '100%', sm: 480, md: 540 }, bgcolor: '#f8fafc' }
                }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <Box sx={{
                        px: 2.5,
                        py: 2,
                        borderBottom: '1px solid #e2e8f0',
                        bgcolor: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                bgcolor: alpha('#3b82f6', 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <SummarizeIcon sx={{ color: 'primary.main' }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                    สรุปข้อมูลเลน
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    ทั้งหมด {overallStats.totalLanes} เลน
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={handleClose}
                            sx={{ bgcolor: alpha('#ef4444', 0.05), color: 'error.main', '&:hover': { bgcolor: alpha('#ef4444', 0.1) } }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Search Box */}
                    <Box sx={{ px: 2, py: 1.5, bgcolor: 'white', borderBottom: '1px solid #e2e8f0' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="ค้นหาเลน, เลขกลุ่ม, ชื่อบุคลากร..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                                sx: {
                                    borderRadius: 2,
                                    bgcolor: '#f8fafc',
                                    '& fieldset': { borderColor: '#e2e8f0' },
                                    '&:hover fieldset': { borderColor: 'primary.main' },
                                }
                            }}
                        />
                        {searchTerm && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                                พบ {filteredSummaryData.reduce((acc, g) => acc + g.lanes.length, 0)} เลน
                            </Typography>
                        )}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        {/* Overall Statistics - Compact Version */}
                        <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                {/* Stats Row */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                            {overallStats.totalLanes}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                            เลน
                                        </Typography>
                                    </Box>
                                    <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                                            {overallStats.completedLanes}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
                                            {overallStats.lanesWithPlaceholder}
                                        </Typography>
                                    </Box>
                                </Box>
                                {/* Personnel/Placeholder */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        👥 {overallStats.totalPersonnel - overallStats.placeholderCount} คน
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>
                                        ⏳ {overallStats.placeholderCount} placeholder
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>

                        {/* Breakdown by Type */}
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: '#0f172a', px: 0.5 }}>
                            📋 แยกตามประเภท
                        </Typography>

                        {filteredSummaryData.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>
                                <Typography variant="body2">
                                    {searchTerm ? 'ไม่พบเลนที่ตรงกับการค้นหา' : 'ไม่มีข้อมูลเลน'}
                                </Typography>
                            </Box>
                        ) : (
                            filteredSummaryData.map((group) => {
                                const visibleCount = visibleCounts[group.type] || LANES_PER_PAGE;
                                const visibleLanes = group.lanes.slice(0, visibleCount);
                                const hasMore = group.lanes.length > visibleCount;
                                const isGroupExpanded = expandedGroups.has(group.type);

                                return (
                                    <Paper
                                        key={group.type}
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            mb: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: alpha(group.color, 0.2),
                                            bgcolor: alpha(group.color, 0.02),
                                        }}
                                    >
                                        {/* Type Header */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                            <Box sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 1.5,
                                                bgcolor: alpha(group.color, 0.1),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: group.color,
                                            }}>
                                                {group.icon}
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: group.color }}>
                                                    {group.label}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {group.lanes.length} เลน • {group.totalPersonnel} คน
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                                {group.completed > 0 && (
                                                    <Chip
                                                        icon={<CheckCircleIcon sx={{ fontSize: 12 }} />}
                                                        label={group.completed}
                                                        size="small"
                                                        color="success"
                                                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                                    />
                                                )}
                                                {group.withPlaceholder > 0 && (
                                                    <Chip
                                                        icon={<WarningIcon sx={{ fontSize: 12 }} />}
                                                        label={group.withPlaceholder}
                                                        size="small"
                                                        color="warning"
                                                        sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                                                    />
                                                )}
                                                {/* Expand/Collapse All Button */}
                                                <Tooltip title={isGroupExpanded ? 'ย่อทั้งหมด' : 'ขยายทั้งหมด'}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => toggleExpandAllInGroup(group.type, visibleLanes)}
                                                        sx={{
                                                            bgcolor: alpha(group.color, 0.1),
                                                            color: group.color,
                                                            '&:hover': { bgcolor: alpha(group.color, 0.2) }
                                                        }}
                                                    >
                                                        {isGroupExpanded ? (
                                                            <UnfoldLessIcon sx={{ fontSize: 16 }} />
                                                        ) : (
                                                            <UnfoldMoreIcon sx={{ fontSize: 16 }} />
                                                        )}
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        {/* Lane List - With Show More */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {visibleLanes.map((lane, laneIndex) => {
                                                const hasPlaceholder = lane.itemIds.some(id => {
                                                    const person = personnelMap[id];
                                                    return person?.isPlaceholder || id.startsWith('placeholder-');
                                                });
                                                const isExpanded = expandedLanes.has(lane.id);

                                                // Get posCode info
                                                const vp = lane.vacantPosition;
                                                const firstPerson = lane.itemIds.length > 0 ? personnelMap[lane.itemIds[0]] : null;
                                                const posCodeId = vp?.posCodeId || vp?.posCodeMaster?.id || firstPerson?.posCodeId;
                                                const posCodeName = vp?.posCodeMaster?.name || firstPerson?.posCodeMaster?.name;
                                                const unit = vp?.unit || firstPerson?.unit;

                                                return (
                                                    <Box key={`${group.type}-${lane.id}-${laneIndex}`}>
                                                        <Box
                                                            onClick={() => toggleLaneExpand(lane.id)}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: 1,
                                                                px: 1.5,
                                                                py: 1,
                                                                bgcolor: isExpanded ? alpha(group.color, 0.05) : 'white',
                                                                borderRadius: 1,
                                                                border: '1px solid',
                                                                borderColor: isExpanded ? alpha(group.color, 0.3) : '#e2e8f0',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease',
                                                                '&:hover': {
                                                                    bgcolor: alpha(group.color, 0.05),
                                                                    borderColor: alpha(group.color, 0.3),
                                                                }
                                                            }}
                                                        >
                                                            {/* Lane Number & Status */}
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 30, mt: 0.25 }}>
                                                                <Typography variant="caption" sx={{
                                                                    fontWeight: 800,
                                                                    color: 'text.disabled',
                                                                    fontSize: '0.65rem',
                                                                }}>
                                                                    #{laneIndex + 1}
                                                                </Typography>
                                                                <Box sx={{
                                                                    width: 6,
                                                                    height: 6,
                                                                    borderRadius: '50%',
                                                                    bgcolor: lane.isCompleted ? 'success.main' : (hasPlaceholder ? 'warning.main' : 'grey.300'),
                                                                }} />
                                                            </Box>

                                                            {/* Main Content */}
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                {/* Row 1: Group Number + Title */}
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                                                    {lane.groupNumber && (
                                                                        <Chip
                                                                            label={lane.groupNumber}
                                                                            size="small"
                                                                            sx={{
                                                                                height: 16,
                                                                                fontSize: '0.55rem',
                                                                                fontWeight: 800,
                                                                                bgcolor: '#334155',
                                                                                color: 'white',
                                                                                '& .MuiChip-label': { px: 0.5 },
                                                                                flexShrink: 0,
                                                                            }}
                                                                        />
                                                                    )}
                                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.75rem' }}>
                                                                        {lane.title}
                                                                    </Typography>
                                                                </Box>

                                                                {/* Row 2: PosCode, PosName, Unit */}
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                                    {(posCodeId || posCodeName) && (
                                                                        <Chip
                                                                            label={posCodeId ? `${posCodeId}${posCodeName ? ' - ' + posCodeName : ''}` : posCodeName}
                                                                            size="small"
                                                                            sx={{
                                                                                height: 14,
                                                                                fontSize: '0.7rem',
                                                                                fontWeight: 700,
                                                                                bgcolor: alpha(group.color, 0.1),
                                                                                color: group.color,
                                                                                '& .MuiChip-label': { px: 0.4 }
                                                                            }}
                                                                        />
                                                                    )}
                                                                    {unit && (
                                                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                                                            {unit}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Box>

                                                            {/* Right Side: Count + Icons */}
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.25 }}>
                                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
                                                                    {lane.itemIds.length} คน
                                                                </Typography>
                                                                {lane.isCompleted && (
                                                                    <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                                                )}
                                                                {hasPlaceholder && !lane.isCompleted && (
                                                                    <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                                                )}
                                                                {isExpanded ? (
                                                                    <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                                ) : (
                                                                    <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                                )}
                                                            </Box>
                                                        </Box>

                                                        <Collapse in={isExpanded}>
                                                            <LaneDetailView
                                                                lane={lane}
                                                                personnelMap={personnelMap}
                                                                color={group.color}
                                                                onOpenDetail={onOpenDetail}
                                                            />
                                                        </Collapse>
                                                    </Box>
                                                );
                                            })}

                                            {/* Show More Button */}
                                            {hasMore && (
                                                <Button
                                                    variant="text"
                                                    size="small"
                                                    onClick={() => showMoreLanes(group.type)}
                                                    startIcon={<KeyboardArrowDownIcon />}
                                                    sx={{
                                                        mt: 1,
                                                        color: group.color,
                                                        fontWeight: 700,
                                                        fontSize: '0.75rem',
                                                        '&:hover': {
                                                            bgcolor: alpha(group.color, 0.1),
                                                        }
                                                    }}
                                                >
                                                    แสดงเพิ่ม ({group.lanes.length - visibleCount} เลน)
                                                </Button>
                                            )}
                                        </Box>
                                    </Paper>
                                );
                            })
                        )}
                    </Box>
                </Box>
            </Drawer >
        </>
    );
});

LaneSummaryButton.displayName = 'LaneSummaryButton';

export default LaneSummaryButton;
