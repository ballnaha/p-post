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
            bg: '#faf5ff',
            accent: '#a855f7',
            headerBg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
            label: 'สลับตำแหน่ง'
        };
        if (isThreeWay) return {
            bg: '#fff1f2',
            accent: '#f43f5e',
            headerBg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
            label: 'สามเส้า'
        };
        if (isVacant) return {
            bg: '#eff6ff',
            accent: '#3b82f6',
            headerBg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            label: 'ตำแหน่งว่าง'
        };
        if (isTransfer) return {
            bg: '#f0fdf4',
            accent: '#10b981',
            headerBg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            label: 'ย้ายหน่วย'
        };
        return {
            bg: '#f8fafc',
            accent: '#64748b',
            headerBg: 'white',
            label: 'เลนทั่วไป'
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
                bgcolor: column.isCompleted ? alpha('#22c55e', 0.05) : isOver ? alpha(styles.accent, 0.08) : styles.bg,
                opacity: isDraggingLane ? 0.4 : 1,
                borderRadius: '0 0 12px 12px',
                border: column.isCompleted ? '3px solid' : '2px solid',
                borderColor: column.isCompleted ? '#22c55e' : isOver ? styles.accent : alpha(styles.accent, 0.2),
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isOver ? 'translateY(-6px)' : 'translateY(0)',
                boxShadow: isOver ? `0 12px 24px ${alpha(styles.accent, 0.15)}` : '0 2px 4px rgba(0,0,0,0.02)',
                backgroundClip: 'padding-box',
                position: 'relative',
                overflow: 'visible', // Changed to visible for edges
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    bgcolor: styles.accent,
                    opacity: 0.8
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
                borderColor: alpha(styles.accent, 0.1),
                bgcolor: isOver ? alpha(styles.accent, 0.05) : styles.headerBg,
                borderRadius: 0,
                transition: 'all 0.15s ease',
                display: 'flex',
                gap: 1
            }}>
                <DragIndicatorIcon
                    sx={{
                        mt: 0.25,
                        fontSize: 20,
                        color: alpha(styles.accent, 0.4),
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
                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, mt: 0.25, bgcolor: styles.accent, color: 'white' }}
                                />
                            )}
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, mb: 0.5 }}>
                                    {column.title}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Chip
                                        label={styles.label}
                                        size="small"
                                        sx={{
                                            height: 18,
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            bgcolor: alpha(styles.accent, 0.1),
                                            color: styles.accent,
                                            border: `1px solid ${alpha(styles.accent, 0.2)}`
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
                                sx={{ color: 'text.secondary', opacity: 0.7, '&:hover': { opacity: 1, bgcolor: alpha(styles.accent, 0.1) } }}
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
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'white', bgcolor: '#334155', px: 0.5, borderRadius: 0.5, fontSize: '0.65rem', display: 'flex', alignItems: 'center' }}>
                                    กลุ่ม {column.groupNumber}
                                </Typography>
                            )}
                            {column.vacantPosition?.positionNumber && (
                                <Typography variant="caption" sx={{ fontWeight: 700, color: styles.accent, bgcolor: alpha(styles.accent, 0.1), px: 0.5, borderRadius: 0.5, fontSize: '0.65rem', display: 'flex', alignItems: 'center' }}>
                                    #{column.vacantPosition.positionNumber}
                                </Typography>
                            )}
                            {column.vacantPosition?.posCodeMaster && (
                                <Chip
                                    label={`${column.vacantPosition.posCodeMaster.id} - ${column.vacantPosition.posCodeMaster.name}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, color: 'text.secondary', borderColor: alpha(styles.accent, 0.1), bgcolor: 'white', maxWidth: 180 }}
                                />
                            )}
                            {column.vacantPosition?.actingAs && (
                                <Chip
                                    label={`ทำหน้าที่: ${column.vacantPosition.actingAs}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600, color: 'text.secondary' }}
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

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: column.itemIds.length > 0 ? 'success.main' : 'grey.300',
                            }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}>
                                {column.itemIds.length} รายการ
                            </Typography>
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
                        bgcolor: isOver ? alpha('#3b82f6', 0.1) : 'transparent',
                        transition: 'all 0.15s ease',
                    }}>
                        {isOver ? (
                            <>
                                <AddIcon sx={{ fontSize: 28, color: 'primary.main', mb: 0.5 }} />
                                <Typography variant="caption" color="primary.main" fontWeight={600}>
                                    วางบุคลากรที่นี่
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
                        {column.itemIds.map((itemId, index) => {
                            const personnel = personnelMap[itemId];
                            if (!personnel) return null;

                            // Logic for promotion chain target:
                            // Lv 1 (index 0) fills the header's vacant position
                            // Lv 2 (index 1) fills Lv 1's former position (personnelMap[itemIds[0]])
                            // and so on...
                            let targetInfo = null;
                            if (column.chainType === 'promotion') {
                                if (index === 0) {
                                    targetInfo = column.vacantPosition;
                                } else {
                                    const previousPerson = personnelMap[column.itemIds[index - 1]];
                                    targetInfo = previousPerson;
                                }
                            } else if (column.chainType === 'custom') {
                                // Manual/Custom lane follows succession display from level 2 onward
                                if (index > 0) {
                                    const previousPerson = personnelMap[column.itemIds[index - 1]];
                                    targetInfo = previousPerson;
                                }
                            } else if (column.vacantPosition?.isTransaction) {
                                // Logic for Swap (2-way), Three-way, and Transfer
                                const type = column.vacantPosition.transactionType;
                                if (type === 'two-way' && column.itemIds.length === 2) {
                                    // A -> B, B -> A
                                    targetInfo = personnelMap[column.itemIds[index === 0 ? 1 : 0]];
                                } else if (type === 'three-way' && column.itemIds.length === 3) {
                                    // A -> B, B -> C, C -> A
                                    if (index === 0) targetInfo = personnelMap[column.itemIds[1]];
                                    else if (index === 1) targetInfo = personnelMap[column.itemIds[2]];
                                    else if (index === 2) targetInfo = personnelMap[column.itemIds[0]];
                                } else if (type === 'transfer') {
                                    // Transfer follows chain logic: 
                                    // Lv 1 -> Destination Unit
                                    // Lv 2+ -> Previous person
                                    if (index === 0) {
                                        targetInfo = column.vacantPosition;
                                    } else {
                                        targetInfo = personnelMap[column.itemIds[index - 1]];
                                    }
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
                                    isChain={column.chainType === 'promotion' || column.chainType === 'custom'}
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

                        {/* Next Level Slot Placeholder - Professional "Ghost Slot" UI - Hide in read-only mode */}
                        {(
                            column.chainType === 'promotion' ||
                            column.chainType === 'transfer' ||
                            isTransfer ||
                            (column.chainType === 'custom' && column.itemIds.length >= 2)
                        ) && !isReadOnly && (
                            <Box
                                onClick={() => onSuggest?.(column)}
                                sx={{
                                    py: 1.5,
                                    px: 1,
                                    border: '1.5px dashed',
                                    borderColor: alpha('#3b82f6', 0.15),
                                    borderRadius: 3,
                                    bgcolor: alpha('#f8fafc', 0.3),
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1,
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    mt: 1,
                                    mb: 2,
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: alpha('#3b82f6', 0.05),
                                        transform: 'scale(0.98)',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                    }
                                }}
                            >
                                <AutoFixHighIcon sx={{ fontSize: 16, color: 'primary.main', opacity: 0.5 }} />
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', opacity: 0.7, fontSize: '0.7rem' }}>
                                    หาคนสืบต่อลำดับที่ {column.itemIds.length + 1}
                                </Typography>
                            </Box>
                        )}

                        {/* Drop zone at bottom */}
                        {isOver && (
                            <Box sx={{
                                height: 40,
                                border: '2px dashed',
                                borderColor: 'primary.main',
                                borderRadius: 1.5,
                                bgcolor: alpha('#3b82f6', 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'pulse 1s infinite',
                                '@keyframes pulse': {
                                    '0%, 100%': { opacity: 1 },
                                    '50%': { opacity: 0.5 },
                                }
                            }}>
                                <Typography variant="caption" color="primary.main" fontWeight={600}>
                                    วางที่นี่
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
