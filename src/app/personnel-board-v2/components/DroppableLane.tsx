import React, { useState, useEffect, useRef, memo } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Chip,
    alpha,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Add as AddIcon,
    Info as InfoIcon,
    AutoFixHigh as AutoFixHighIcon,
    DragIndicator as DragIndicatorIcon,
    MoreVert as MoreVertIcon,
    CheckCircle as CheckCircleIcon,
    Undo as UndoIcon,
    Warning as WarningIcon,
    Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import DraggableCard from './DraggableCard';
import AddPlaceholderCardButton from './AddPlaceholderCardButton';
import { Personnel, Column } from '../types';
import { formatPositionNumber } from '@/utils/positionNumber';

const CIRCULAR_SWAP_MIN_PERSONNEL = 3;

const getCircularSwapLabel = (count: number) => {
    return 'วงสลับ';
};

interface DroppableLaneProps {
    column: Column;
    lanePersonnel: Personnel[]; // Optimized: Only people in this lane
    onRemoveItem: (itemId: string) => void;
    onRemoveLane: () => void;
    selectedIds: string[];
    onToggleSelection: (id: string) => void;
    onHeaderClick?: (vacantPosition: any) => void;
    onSuggest?: (column: Column) => void;
    onUpdateItem?: (id: string, updates: Partial<Personnel>) => void;
    onCardClick?: (personnel: Personnel, targetInfo?: any) => void;
    onToggleComplete?: (columnId: string) => void;
    onAddPlaceholder?: (columnId: string) => void;
    isReadOnly?: boolean;
    index: number;
    availableLanes?: { 
        id: string; 
        title: string; 
        groupNumber?: string; 
        occupantCount?: number;
        getOccupants?: () => {
            name: string;
            currentPosition: string;
            currentUnit: string;
            targetPosition: string;
            targetUnit: string;
            age?: string | number | null;
            seniority?: string | number | null;
            requestedPosition?: string | null;
        }[]; 
    }[]; // Optimized: Pre-calculated
    onMoveItem?: (itemId: string, targetLaneId: string, itemIds?: string[]) => void;
    onViewSummary?: (column: Column) => void;
}

const DroppableLane = memo(({
    column,
    lanePersonnel,
    onRemoveItem,
    onRemoveLane,
    selectedIds,
    onToggleSelection,
    onHeaderClick,
    onSuggest,
    onUpdateItem,
    onCardClick,
    onToggleComplete,
    onAddPlaceholder,
    isReadOnly = false,
    index,
    availableLanes = [],
    onMoveItem,
    onViewSummary
}: DroppableLaneProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isOver, setIsOver] = useState(false);
    const [isDraggingLane, setIsDraggingLane] = useState(false);
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [justDropped, setJustDropped] = useState(false);
    const open = Boolean(anchorEl);

    const handleClickMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    useEffect(() => {
        const el = ref.current;
        if (!el || isReadOnly) return; // Skip drag-drop setup in read-only mode

        return combine(
            draggable({
                element: el,
                getInitialData: () => ({ type: 'lane', laneId: column.id, index }), // Use passed index
                onDragStart: () => setIsDraggingLane(true),
                onDrop: () => {
                    setIsDraggingLane(false);
                    setJustDropped(true);
                    setTimeout(() => setJustDropped(false), 600);
                },
            }),
            dropTargetForElements({
                element: el,
                getData: ({ input, element }) => {
                    const data = { type: 'lane', laneId: column.id };
                    return attachClosestEdge(data, {
                        input,
                        element,
                        allowedEdges: ['left', 'right'],
                    });
                },
                canDrop: ({ source }) => source.data.type === 'card' || source.data.type === 'personnel' || source.data.type === 'lane',
                onDragEnter: () => setIsOver(true),
                onDrag: ({ source, location }) => {
                    if (source.data.type === 'lane') {
                        const edge = extractClosestEdge(location.current.dropTargets[0].data);
                        setClosestEdge(prev => prev !== edge ? edge : prev);
                    }
                },
                onDragLeave: () => {
                    setIsOver(false);
                    setClosestEdge(null);
                },
                onDrop: () => {
                    setIsOver(false);
                    setClosestEdge(null);
                    setJustDropped(true);
                    setTimeout(() => setJustDropped(false), 600);
                },
            })
        );
    }, [column.id, column.level, isReadOnly]);

    const hasVacantPosition = !!column.vacantPosition;
    const isTransaction = column.vacantPosition?.isTransaction;
    const isSwap = column.chainType === 'swap' || column.vacantPosition?.transactionType === 'two-way';
    const isThreeWay = column.chainType === 'three-way' || column.vacantPosition?.transactionType === 'three-way';
    const isPromotion = column.chainType === 'promotion' || column.vacantPosition?.transactionType === 'promotion-chain';
    const isTransfer = column.chainType === 'transfer' || column.vacantPosition?.transactionType === 'transfer';
    const isVacant = hasVacantPosition && !isTransaction;
    const canOpenVacantDetail = isVacant;
    const isCustom = !hasVacantPosition && column.chainType === 'custom';

    // Check if lane has placeholder
    const hasPlaceholder = lanePersonnel.some(person => {
        return person?.isPlaceholder || person?.id.startsWith('placeholder-');
    });

    // Professional type accents: neutral canvas + restrained color accents
    const getLaneStyles = () => {
        if (isSwap) return {
            bg: '#ffffff',
            accent: '#4f46e5',
            headerBg: 'linear-gradient(180deg, #f8faff 0%, #eef2ff 100%)',
            label: 'สลับตำแหน่ง'
        };
        if (isThreeWay) return {
            bg: '#ffffff',
            accent: '#0f766e',
            headerBg: 'linear-gradient(180deg, #f6fffd 0%, #ecfeff 100%)',
            label: getCircularSwapLabel(lanePersonnel.length)
        };
        if (isPromotion) return {
            bg: '#ffffff',
            accent: '#b45309',
            headerBg: 'linear-gradient(180deg, #fffdf7 0%, #fef3c7 100%)',
            label: 'เลื่อนตำแหน่ง'
        };
        if (isTransfer) return {
            bg: '#ffffff',
            accent: '#2563eb',
            headerBg: 'linear-gradient(180deg, #f8fbff 0%, #eaf2ff 100%)',
            label: 'ย้ายหน่วย'
        };
        if (isVacant) return {
            bg: '#ffffff',
            accent: '#64748b',
            headerBg: 'linear-gradient(180deg, #fbfdff 0%, #f1f5f9 100%)',
            label: 'ตำแหน่งว่าง'
        };
        if (isCustom) return {
            bg: '#ffffff',
            accent: '#7c3aed',
            headerBg: 'linear-gradient(180deg, #fcfbff 0%, #f5f3ff 100%)',
            label: 'เลนกำหนดเอง'
        };
        return {
            bg: '#ffffff',
            accent: '#64748b',
            headerBg: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            label: 'เลนทั่วไป'
        };
    };

    const styles = getLaneStyles();
    const showSuccessionHint = (
        column.chainType === 'promotion' ||
        column.chainType === 'transfer' ||
        isTransfer ||
        (column.chainType === 'custom' && column.itemIds.length >= 2)
    ) && !isReadOnly && !isOver;

    return (
        <Paper
            ref={ref}
            elevation={0}
            sx={{
                width: 320,
                minWidth: 320,
                flexShrink: 0,
                bgcolor: justDropped ? alpha('#22c55e', 0.06) : column.isCompleted ? alpha('#22c55e', 0.04) : isOver ? alpha(styles.accent, 0.035) : styles.bg,
                opacity: isDraggingLane ? 0.4 : 1,
                borderRadius: '0 0 12px 12px',
                border: column.isCompleted ? '2px solid' : '1px solid',
                borderColor: justDropped ? '#22c55e' : column.isCompleted ? alpha('#22c55e', 0.4) : isOver ? alpha(styles.accent, 0.45) : alpha(styles.accent, 0.16),
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease',
                transform: isOver ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isOver ? `0 14px 28px ${alpha(styles.accent, 0.1)}` : '0 6px 16px rgba(15,23,42,0.05)',
                backgroundClip: 'padding-box',
                position: 'relative',
                overflow: 'visible', // Changed to visible for edges
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 12,
                    right: 12,
                    height: 4,
                    bgcolor: justDropped ? '#22c55e' : styles.accent,
                    borderRadius: '999px',
                    opacity: 0.9,
                    transition: 'all 0.2s ease'
                }
            }}
        >
            {/* Edge Indicators for Lane Reordering */}
            {closestEdge === 'left' && (
                <Box sx={{ position: 'absolute', left: -8, top: 0, bottom: 0, width: 4, bgcolor: styles.accent, borderRadius: 2, zIndex: 10 }} />
            )}
            {closestEdge === 'right' && (
                <Box sx={{ position: 'absolute', right: -8, top: 0, bottom: 0, width: 4, bgcolor: styles.accent, borderRadius: 2, zIndex: 10 }} />
            )}
            {/* Lane Header */}
            <Box sx={{
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: alpha(styles.accent, 0.08),
                bgcolor: isOver ? alpha(styles.accent, 0.04) : styles.headerBg,
                borderRadius: 0,
                transition: 'all 0.15s ease',
                display: 'flex',
                gap: 1
            }}>
                <DragIndicatorIcon
                    sx={{
                        mt: 0.25,
                        fontSize: 20,
                        color: alpha(styles.accent, 0.32),
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' }
                    }}
                />
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                cursor: canOpenVacantDetail ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1
                            }}
                            onClick={() => {
                                if (canOpenVacantDetail && onHeaderClick) {
                                    onHeaderClick(column.vacantPosition);
                                }
                            }}
                        >
                            {column.level && column.level > 1 && (
                                <Chip
                                    label={`Lv ${column.level}`}
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, mt: 0.25, bgcolor: styles.accent, color: 'white' }}
                                />
                            )}
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                        fontWeight: 800, 
                                        color: '#0f172a', 
                                        lineHeight: 1.3, 
                                        mb: 0.5,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'anywhere',
                                        width: '100%',
                                    }}
                                >
                                    {column.title}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Chip
                                        label={styles.label}
                                        size="small"
                                        sx={{
                                            height: 18,
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            bgcolor: alpha(styles.accent, 0.08),
                                            color: styles.accent,
                                            border: `1px solid ${alpha(styles.accent, 0.16)}`
                                        }}
                                    />
                                    {column.isCompleted && (
                                        <Chip
                                            icon={<CheckCircleIcon sx={{ fontSize: 12 }} />}
                                            label="เสร็จแล้ว"
                                            size="small"
                                            color="success"
                                            sx={{
                                                height: 18,
                                                fontSize: '0.6rem',
                                                fontWeight: 800,
                                            }}
                                        />
                                    )}
                                    {hasPlaceholder && !column.isCompleted && (
                                        <Chip
                                            icon={<WarningIcon sx={{ fontSize: 12 }} />}
                                            label="มี Placeholder"
                                            size="small"
                                            color="warning"
                                            sx={{
                                                height: 18,
                                                fontSize: '0.6rem',
                                                fontWeight: 800,
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {/* Add Placeholder Card Button - Hide in read-only mode */}
                            {!isReadOnly && onAddPlaceholder && (
                                <AddPlaceholderCardButton
                                    onAdd={() => onAddPlaceholder(column.id)}
                                    disabled={false}
                                />
                            )}
                            <IconButton
                                size="small"
                                onClick={handleClickMenu}
                                sx={{ color: 'text.secondary', opacity: 0.7, '&:hover': { opacity: 1, bgcolor: alpha(styles.accent, 0.08) } }}
                            >
                                <MoreVertIcon fontSize="small" />
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl}
                                open={open}
                                onClose={handleCloseMenu}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                PaperProps={{
                                    elevation: 3,
                                    sx: {
                                        borderRadius: 2,
                                        minWidth: 160,
                                        mt: 0.5,
                                        '& .MuiMenuItem-root': {
                                            px: 1.5,
                                            py: 1,
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                        },
                                    }
                                }}
                            >
                                {/* Suggest - Hide in read-only mode */}
                                {!isReadOnly && (
                                    <MenuItem onClick={(e) => {
                                        handleCloseMenu();
                                        if (isSwap || isThreeWay) {
                                            onSuggest?.(column);
                                        } else {
                                            onSuggest?.({ ...column, id: '', itemIds: [] });
                                        }
                                    }}>
                                        <ListItemIcon sx={{ minWidth: '30px !important' }}>
                                            <AutoFixHighIcon sx={{ fontSize: 18, color: '#d97706' }} />
                                        </ListItemIcon>
                                        <ListItemText primary="แนะนำผู้ที่เหมาะสม" />
                                    </MenuItem>
                                )}
                                {/* Delete Lane - Hide in read-only mode */}
                                {!isReadOnly && (
                                    <MenuItem
                                        onClick={() => {
                                            handleCloseMenu();
                                            onRemoveLane();
                                        }}
                                        sx={{ color: 'error.main' }}
                                    >
                                        <ListItemIcon sx={{ minWidth: '30px !important' }}>
                                            <DeleteIcon sx={{ fontSize: 18, color: 'error.main' }} />
                                        </ListItemIcon>
                                        <ListItemText primary="ลบเลน" />
                                    </MenuItem>
                                )}
                                {/* View Summary - Always visible */}
                                <MenuItem
                                    onClick={() => {
                                        handleCloseMenu();
                                        onViewSummary?.(column);
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: '30px !important' }}>
                                        <AssessmentIcon sx={{ fontSize: 18, color: styles.accent }} />
                                    </ListItemIcon>
                                    <ListItemText primary="สรุปผล" />
                                </MenuItem>
                                {/* Toggle Complete - Always visible */}
                                <MenuItem
                                    onClick={() => {
                                        handleCloseMenu();
                                        onToggleComplete?.(column.id);
                                    }}
                                    sx={{ color: column.isCompleted ? 'warning.main' : 'success.main' }}
                                >
                                    <ListItemIcon sx={{ minWidth: '30px !important' }}>
                                        {column.isCompleted ? (
                                            <UndoIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                                        ) : (
                                            <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                                        )}
                                    </ListItemIcon>
                                    <ListItemText primary={column.isCompleted ? 'ยกเลิกเสร็จสิ้น' : 'เสร็จสิ้นและซ่อน'} />
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Box>

                    {/* Secondary Info (Position details, count, actingAs) */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1, minWidth: 0 }}>
                            {column.groupNumber && (
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#334155', bgcolor: '#e2e8f0', px: 0.5, borderRadius: 0.5, fontSize: '0.65rem', display: 'flex', alignItems: 'center' }}>
                                    กลุ่ม {column.groupNumber}
                                </Typography>
                            )}
                            {column.vacantPosition?.positionNumber && (
                                <Typography variant="caption" sx={{ fontWeight: 700, color: styles.accent, bgcolor: alpha(styles.accent, 0.08), px: 0.5, borderRadius: 0.5, fontSize: '0.65rem', display: 'flex', alignItems: 'center' }}>
                                    #{formatPositionNumber(column.vacantPosition.positionNumber)}
                                </Typography>
                            )}
                            {column.vacantPosition?.posCodeMaster && (
                                <Chip
                                    label={`${column.vacantPosition.posCodeMaster.id} - ${column.vacantPosition.posCodeMaster.name}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        height: 'auto',
                                        minHeight: 18,
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        color: 'text.secondary',
                                        borderColor: alpha(styles.accent, 0.12),
                                        bgcolor: alpha('#ffffff', 0.9),
                                        '& .MuiChip-label': {
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            whiteSpace: 'normal',
                                            lineHeight: 1.3,
                                            py: 0.25
                                        }
                                    }}
                                />
                            )}
                            {column.vacantPosition?.actingAs && (
                                <Chip
                                    label={`ทำหน้าที่: ${column.vacantPosition.actingAs}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        height: 'auto',
                                        minHeight: 18,
                                        fontSize: '0.62rem',
                                        fontWeight: 600,
                                        color: 'text.secondary',
                                        '& .MuiChip-label': {
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            whiteSpace: 'normal',
                                            lineHeight: 1.3,
                                            py: 0.25,
                                        }
                                    }}
                                />
                            )}
                            {hasVacantPosition && !isSwap && !isThreeWay && (
                                <Tooltip title="ดูรายละเอียดตำแหน่ง">
                                    <IconButton size="small" onClick={() => onHeaderClick?.(column.vacantPosition)} sx={{ p: 0 }}>
                                        <InfoIcon sx={{ fontSize: 14, color: styles.accent, opacity: 0.7 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>

                        <Box sx={{ display: 'center', alignItems: 'center', gap: 0.5 }}>
                            {(() => {
                                const realPersonnelCount = lanePersonnel.filter(person => {
                                    return person && !person.isPlaceholder && !person.id.startsWith('placeholder-');
                                }).length;
                                return (
                                    <>
                                        <Box sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            bgcolor: realPersonnelCount > 0 ? 'success.main' : 'grey.300',
                                        }} />
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>
                                            {realPersonnelCount} รายการ
                                        </Typography>
                                    </>
                                );
                            })()}
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Lane Content */}
            <Box sx={{ p: 1.5, minHeight: 100, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {column.itemIds.length === 0 ? (
                    <Box sx={{
                        height: '100%',
                        minHeight: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed',
                        borderColor: isOver ? 'primary.main' : '#e2e8f0',
                        borderRadius: 1.5,
                        bgcolor: isOver ? alpha('#3b82f6', 0.15) : 'transparent',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                    }}>
                        {isOver ? (
                            <>
                                <Box sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                }}>
                                    <AddIcon sx={{ fontSize: 24 }} />
                                    <Typography variant="body2" fontWeight={700}>
                                        วางบุคลากรที่นี่
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ mt: 1, opacity: 0.8 }}>
                                    ปล่อยเพื่อเพิ่มเข้าเลน
                                </Typography>
                            </>
                        ) : (
                            <Typography variant="caption" color="text.disabled">
                                ลากบุคลากรมาวางที่นี่
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <>
                        {lanePersonnel.map((personnel, idx) => {
                            if (!personnel) return null;
                            const itemId = personnel.id;
                            const moveItemIds = selectedIds.includes(itemId) ? selectedIds : [itemId];
                            const selectedPeopleData = moveItemIds.length > 1
                                ? moveItemIds.map(id => {
                                    const p = lanePersonnel.find(lp => lp.id === id);
                                    return p ? {
                                        name: `${p.rank || ''} ${p.fullName || ''}`.trim(),
                                        position: p.position || '',
                                        unit: p.unit || ''
                                    } : null;
                                }).filter(Boolean) as { name: string; position?: string; unit?: string }[]
                                : [];

                            // Logic for promotion chain target:
                            // Lv 1 (idx 0) fills the header's vacant position
                            // Lv 2 (idx 1) fills Lv 1's former position
                            let targetInfo = null;
                            if (column.chainType === 'promotion') {
                                if (idx === 0) {
                                    targetInfo = column.vacantPosition;
                                } else {
                                    const previousPerson = lanePersonnel[idx - 1];
                                    targetInfo = previousPerson;
                                }
                            } else if (column.chainType === 'custom') {
                                if (idx > 0) {
                                    const previousPerson = lanePersonnel[idx - 1];
                                    targetInfo = previousPerson;
                                }
                            } else if (column.vacantPosition?.isTransaction) {
                                const type = column.vacantPosition.transactionType;
                                if (type === 'two-way' && lanePersonnel.length === 2) {
                                    targetInfo = lanePersonnel[idx === 0 ? 1 : 0];
                                } else if (type === 'three-way' && lanePersonnel.length >= CIRCULAR_SWAP_MIN_PERSONNEL) {
                                    targetInfo = lanePersonnel[(idx + 1) % lanePersonnel.length];
                                } else if (type === 'transfer') {
                                    if (idx === 0) {
                                        targetInfo = column.vacantPosition;
                                    } else {
                                        targetInfo = lanePersonnel[idx - 1];
                                    }
                                }
                            }

                            return (
                                <DraggableCard
                                    key={itemId}
                                    personnel={personnel}
                                    index={idx}
                                    isSelected={selectedIds.includes(itemId)}
                                    onToggle={onToggleSelection}
                                    onRemove={() => onRemoveItem(itemId)}
                                    targetInfo={targetInfo}
                                    isChain={column.chainType === 'promotion' || column.chainType === 'custom'}
                                    onSuggest={onSuggest ? (data) => onSuggest({ ...column, vacantPosition: data }) : undefined}
                                    onUpdate={onUpdateItem}
                                    onCardClick={onCardClick}
                                    isReadOnly={isReadOnly}
                                    availableLanes={availableLanes.filter(l => l.id !== column.id)}
                                    onMoveToLane={(targetLaneId) => onMoveItem?.(itemId, targetLaneId, moveItemIds)}
                                    selectedMoveCount={moveItemIds.length}
                                />
                            );
                        })}

                        {/* Next Level Slot Placeholder - Professional "Ghost Slot" UI - Hide in read-only mode */}
                        {showSuccessionHint && (
                                <Box
                                    onClick={() => onSuggest?.(column)}
                                    sx={{
                                        py: 1,
                                        px: 1.25,
                                        border: '1px dashed',
                                        borderColor: alpha(styles.accent, 0.18),
                                        borderRadius: 2,
                                        bgcolor: alpha(styles.accent, 0.03),
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        gap: 1,
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        mt: 1,
                                        mb: 2,
                                        '&:hover': {
                                            borderColor: alpha(styles.accent, 0.34),
                                            bgcolor: alpha(styles.accent, 0.06),
                                            boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.03)'
                                        }
                                    }}
                                >
                                    <AutoFixHighIcon sx={{ fontSize: 15, color: styles.accent, opacity: 0.7 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: styles.accent, opacity: 0.85, fontSize: '0.69rem' }}>
                                        หาคนสืบต่อลำดับที่ {column.itemIds.length + 1}
                                    </Typography>
                                </Box>
                            )}

                        {/* Drop zone at bottom */}
                        {isOver && (
                            <Box sx={{
                                mt: 1,
                                mb: 1,
                                px: 1,
                                py: 0.75,
                                borderTop: '2px solid',
                                borderBottom: '2px solid',
                                borderColor: styles.accent,
                                bgcolor: alpha(styles.accent, 0.06),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.75,
                                borderRadius: 1,
                                animation: 'laneDropPulse 1s ease-in-out infinite',
                                '@keyframes laneDropPulse': {
                                    '0%, 100%': { opacity: 1 },
                                    '50%': { opacity: 0.72 },
                                }
                            }}>
                                <AddIcon sx={{ fontSize: 15, color: styles.accent }} />
                                <Typography variant="caption" sx={{ color: styles.accent, fontWeight: 700, letterSpacing: '0.01em' }}>
                                    ปล่อยเพื่อเพิ่มเข้าเลนนี้
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Paper >
    );
});

DroppableLane.displayName = 'DroppableLane';

export default DroppableLane;
