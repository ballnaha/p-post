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

interface DroppableLaneProps {
    column: Column;
    personnelMap: Record<string, Personnel>;
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
    isReadOnly?: boolean; // Disable drag-drop in completed view
    index: number;
    allLanes?: Column[];
    onMoveItem?: (itemId: string, targetLaneId: string) => void;
    onViewSummary?: (column: Column) => void;
}

const DroppableLane = memo(({
    column,
    personnelMap,
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
    allLanes = [],
    onMoveItem,
    onViewSummary
}: DroppableLaneProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isOver, setIsOver] = useState(false);
    const [isDraggingLane, setIsDraggingLane] = useState(false);
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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
                onDrop: () => setIsDraggingLane(false),
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
                        setClosestEdge(extractClosestEdge(location.current.dropTargets[0].data));
                    }
                },
                onDragLeave: () => {
                    setIsOver(false);
                    setClosestEdge(null);
                },
                onDrop: () => {
                    setIsOver(false);
                    setClosestEdge(null);
                },
            })
        );
    }, [column.id, column.level, isReadOnly]);

    const hasVacantPosition = !!column.vacantPosition;
    const isTransaction = column.vacantPosition?.isTransaction;
    const isSwap = column.chainType === 'swap' || column.vacantPosition?.transactionType === 'two-way';
    const isThreeWay = column.chainType === 'three-way' || column.vacantPosition?.transactionType === 'three-way';
    const isTransfer = column.vacantPosition?.transactionType === 'transfer';
    const isVacant = hasVacantPosition && !isTransaction;
    const isCustom = !hasVacantPosition && column.chainType === 'custom';

    // Check if lane has placeholder
    const hasPlaceholder = column.itemIds.some(id => {
        const person = personnelMap[id];
        return person?.isPlaceholder || id.startsWith('placeholder-');
    });

    // Premium Color Mapping
    const getLaneStyles = () => {
        if (isSwap) return {
            bg: '#fdfaff',
            accent: '#8b5cf6',
            headerBg: 'linear-gradient(to bottom, #f5f3ff, #fdfaff)',
            label: 'สลับตำแหน่ง',
            shadow: 'rgba(139, 92, 246, 0.1)'
        };
        if (isThreeWay) return {
            bg: '#fff7f7',
            accent: '#f43f5e',
            headerBg: 'linear-gradient(to bottom, #fff1f2, #fff7f7)',
            label: 'สามเส้า',
            shadow: 'rgba(244, 63, 94, 0.1)'
        };
        if (isVacant) return {
            bg: '#f8fbff',
            accent: '#3b82f6',
            headerBg: 'linear-gradient(to bottom, #eff6ff, #f8fbff)',
            label: 'ตำแหน่งว่าง',
            shadow: 'rgba(59, 130, 246, 0.1)'
        };
        if (isTransfer) return {
            bg: '#f7fee7',
            accent: '#84cc16',
            headerBg: 'linear-gradient(to bottom, #f0fdf4, #f7fee7)',
            label: 'ย้ายหน่วย',
            shadow: 'rgba(132, 204, 22, 0.1)'
        };
        return {
            bg: '#f8fafc',
            accent: '#475569',
            headerBg: 'white',
            label: 'ทั่วไป',
            shadow: 'rgba(71, 85, 105, 0.1)'
        };
    };

    const styles = getLaneStyles();

    return (
        <Paper
            ref={ref}
            elevation={0}
            sx={{
                width: 320,
                minWidth: 320,
                flexShrink: 0,
                bgcolor: column.isCompleted ? alpha('#10b981', 0.03) : styles.bg,
                opacity: isDraggingLane ? 0.4 : 1,
                borderRadius: 4,
                border: '1px solid',
                borderColor: column.isCompleted ? '#10b981' : isOver ? styles.accent : '#e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isOver ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isOver ? `0 20px 40px -12px ${styles.shadow}` : '0 1px 3px rgba(0,0,0,0.02)',
                backgroundClip: 'padding-box',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 5,
                    bgcolor: styles.accent,
                }
            }}
        >
            {/* Edge Indicators for Lane Reordering */}
            {closestEdge === 'left' && (
                <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: styles.accent, zIndex: 10 }} />
            )}
            {closestEdge === 'right' && (
                <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, bgcolor: styles.accent, zIndex: 10 }} />
            )}
            {/* Lane Header */}
            <Box sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: alpha(styles.accent, 0.08),
                bgcolor: isOver ? alpha(styles.accent, 0.03) : styles.headerBg,
                borderRadius: 0,
                transition: 'all 0.15s ease',
                display: 'flex',
                gap: 1.5
            }}>
                <DragIndicatorIcon
                    sx={{
                        mt: 0.5,
                        fontSize: 18,
                        color: alpha(styles.accent, 0.3),
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' }
                    }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                cursor: hasVacantPosition && (!isTransaction || column.vacantPosition?.transactionType === 'promotion-chain') ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1
                            }}
                            onClick={() => {
                                if (hasVacantPosition && onHeaderClick && !isSwap && !isThreeWay) {
                                    onHeaderClick(column.vacantPosition);
                                }
                            }}
                        >
                            {column.level && column.level > 1 && (
                                <Chip
                                    label={`Lv ${column.level}`}
                                    size="small"
                                    sx={{
                                        height: 18,
                                        px: 0.5,
                                        fontSize: '0.6rem',
                                        fontWeight: 900,
                                        mt: 0.25,
                                        bgcolor: '#1e293b',
                                        color: 'white',
                                        '& .MuiChip-label': { px: 0.5 }
                                    }}
                                />
                            )}
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.3, mb: 0.75, fontSize: '0.9rem' }}>
                                    {column.title}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Chip
                                        label={styles.label}
                                        size="small"
                                        sx={{
                                            height: 18,
                                            fontSize: '0.6rem',
                                            fontWeight: 800,
                                            bgcolor: alpha(styles.accent, 0.05),
                                            color: styles.accent,
                                            border: '1px solid',
                                            borderColor: alpha(styles.accent, 0.1),
                                            textTransform: 'uppercase'
                                        }}
                                    />
                                    {column.isCompleted && (
                                        <Chip
                                            icon={<CheckCircleIcon sx={{ fontSize: 12 }} />}
                                            label="เสร็จแล้ว"
                                            size="small"
                                            sx={{
                                                height: 18,
                                                fontSize: '0.6rem',
                                                fontWeight: 800,
                                                bgcolor: '#dcfce7',
                                                color: '#166534'
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            {!isReadOnly && onAddPlaceholder && (
                                <AddPlaceholderCardButton
                                    onAdd={() => onAddPlaceholder(column.id)}
                                    disabled={false}
                                />
                            )}
                            <IconButton
                                size="small"
                                onClick={handleClickMenu}
                                sx={{ color: '#94a3b8', '&:hover': { color: '#475569', bgcolor: '#f1f5f9' } }}
                            >
                                <MoreVertIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* Secondary Info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1, minWidth: 0 }}>
                            {column.groupNumber && (
                                <Box sx={{ px: 0.75, py: 0.25, bgcolor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', fontSize: '0.6rem' }}>
                                        G{column.groupNumber}
                                    </Typography>
                                </Box>
                            )}
                            {column.vacantPosition?.positionNumber && (
                                <Box sx={{ px: 0.75, py: 0.25, bgcolor: alpha(styles.accent, 0.05), border: '1px solid', borderColor: alpha(styles.accent, 0.1), borderRadius: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: styles.accent, fontSize: '0.62rem' }}>
                                        #{column.vacantPosition.positionNumber}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: column.itemIds.length > 0 ? '#10b981' : '#e2e8f0' }} />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', fontSize: '0.65rem' }}>
                                {column.itemIds.length}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Lane Content */}
            <Box sx={{ p: 1.5, minHeight: 120, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {column.itemIds.length === 0 ? (
                    <Box sx={{
                        height: 120,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #e2e8f0',
                        borderRadius: 3,
                        transition: 'all 0.2s ease',
                        bgcolor: isOver ? alpha(styles.accent, 0.03) : 'transparent',
                    }}>
                        <AddIcon sx={{ fontSize: 24, color: '#cbd5e1', mb: 1 }} />
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>ไม่มีรายการ</Typography>
                    </Box>
                ) : (
                    <>
                        {column.itemIds.map((itemId, index) => {
                            const personnel = personnelMap[itemId];
                            if (!personnel) return null;

                            let targetInfo = null;
                            if (column.chainType === 'promotion') {
                                if (index === 0) { targetInfo = column.vacantPosition; }
                                else { const previousPerson = personnelMap[column.itemIds[index - 1]]; targetInfo = previousPerson; }
                            } else if (column.vacantPosition?.isTransaction) {
                                const type = column.vacantPosition.transactionType;
                                if (type === 'two-way' && column.itemIds.length === 2) {
                                    targetInfo = personnelMap[column.itemIds[index === 0 ? 1 : 0]];
                                } else if (type === 'three-way' && column.itemIds.length === 3) {
                                    if (index === 0) targetInfo = personnelMap[column.itemIds[1]];
                                    else if (index === 1) targetInfo = personnelMap[column.itemIds[2]];
                                    else if (index === 2) targetInfo = personnelMap[column.itemIds[0]];
                                } else if (type === 'transfer') {
                                    if (index === 0) { targetInfo = column.vacantPosition; }
                                    else { targetInfo = personnelMap[column.itemIds[index - 1]]; }
                                }
                            }

                            return (
                                <DraggableCard
                                    key={itemId}
                                    personnel={personnel}
                                    index={index}
                                    isSelected={selectedIds.includes(itemId)}
                                    onToggle={onToggleSelection}
                                    onRemove={() => onRemoveItem(itemId)}
                                    targetInfo={targetInfo}
                                    isChain={column.chainType === 'promotion'}
                                    onSuggest={onSuggest ? (data) => onSuggest({ ...column, vacantPosition: data }) : undefined}
                                    onUpdate={onUpdateItem}
                                    onCardClick={onCardClick}
                                    isReadOnly={isReadOnly}
                                    availableLanes={allLanes
                                        .filter(l => l.id !== column.id && !l.isCompleted)
                                        .map(l => ({ id: l.id, title: l.title, groupNumber: l.groupNumber }))}
                                    onMoveToLane={(targetLaneId) => onMoveItem?.(itemId, targetLaneId)}
                                />
                            );
                        })}

                        {/* Next Level Slot Placeholder */}
                        {(column.chainType === 'promotion' || column.chainType === 'transfer' || isTransfer) && !isReadOnly && (
                            <Box
                                onClick={() => onSuggest?.(column)}
                                sx={{
                                    py: 2,
                                    px: 2,
                                    border: '1px dashed #cbd5e1',
                                    borderRadius: 3,
                                    bgcolor: alpha('#f8fafc', 0.5),
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1.5,
                                    transition: 'all 0.2s',
                                    mt: 1,
                                    '&:hover': {
                                        borderColor: '#3b82f6',
                                        bgcolor: alpha('#3b82f6', 0.02),
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                            >
                                <AutoFixHighIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.75rem' }}>
                                    หาคนสืบต่อลำดับที่ {column.itemIds.length + 1}
                                </Typography>
                            </Box>
                        )}

                        {/* Drop zone at bottom */}
                        {isOver && (
                            <Box sx={{
                                height: 60,
                                border: '2px dashed',
                                borderColor: styles.accent,
                                borderRadius: 3,
                                bgcolor: alpha(styles.accent, 0.05),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'pulse 1.5s infinite',
                            }}>
                                <Typography variant="caption" sx={{ color: styles.accent, fontWeight: 800 }}>Drop Here</Typography>
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
