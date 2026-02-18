import React, { useState, useEffect, useRef, memo } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Chip,
    alpha,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
    Star as StarIcon,
    ArrowDownward as ArrowDownwardIcon,
    ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/types';
import { Personnel } from '../types';
import MoveToLaneButton from './MoveToLaneButton';

interface DraggableCardProps {
    personnel: Personnel;
    onRemove: () => void;
    index: number;
    isSelected: boolean;
    onToggle: (id: string) => void;
    targetInfo?: any;
    isChain?: boolean;
    onSuggest?: (data: any) => void;
    onUpdate?: (id: string, updates: Partial<Personnel>) => void;
    onCardClick?: (personnel: Personnel, targetInfo?: any) => void;
    isReadOnly?: boolean;
    availableLanes?: { id: string; title: string; groupNumber?: string }[];
    onMoveToLane?: (laneId: string) => void;
}

const DraggableCard = memo(({
    personnel,
    onRemove,
    index,
    isSelected,
    onToggle,
    targetInfo,
    isChain,
    onSuggest,
    onUpdate,
    onCardClick,
    isReadOnly = false,
    availableLanes = [],
    onMoveToLane
}: DraggableCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || isReadOnly) return; // Skip drag-drop setup in read-only mode

        return combine(
            draggable({
                element: el,
                getInitialData: () => ({
                    type: 'card',
                    personnelId: personnel.id,
                    index,
                    personnel
                }),
                onDragStart: () => setIsDragging(true),
                onDrop: () => setIsDragging(false),
            }),
            dropTargetForElements({
                element: el,
                getData: ({ input, element }) => {
                    return attachClosestEdge({ personnelId: personnel.id, index, type: 'card' }, {
                        element,
                        input,
                        allowedEdges: ['top', 'bottom'],
                    });
                },
                canDrop: ({ source }) =>
                    (source.data.type === 'card' || source.data.type === 'personnel') &&
                    source.data.personnelId !== personnel.id,
                onDragEnter: ({ self }) => {
                    const edge = extractClosestEdge(self.data);
                    setClosestEdge(edge);
                },
                onDrag: ({ self }) => {
                    const edge = extractClosestEdge(self.data);
                    setClosestEdge(edge);
                },
                onDragLeave: () => setClosestEdge(null),
                onDrop: () => setClosestEdge(null),
            })
        );
    }, [personnel.id, index, personnel, isReadOnly]);

    return (
        <Box sx={{ position: 'relative' }}>
            <Paper
                ref={ref}
                elevation={0}
                sx={{
                    mb: 1.5,
                    border: '1px solid',
                    borderColor: isSelected ? '#3b82f6'
                        : closestEdge ? '#3b82f6'
                            : isDragging ? '#3b82f6'
                                : (personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) ? '#f59e0b'
                                    : '#e2e8f0',
                    bgcolor: isSelected ? alpha('#3b82f6', 0.08)
                        : closestEdge ? alpha('#3b82f6', 0.05)
                            : isDragging ? alpha('#3b82f6', 0.05)
                                : (personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) ? alpha('#f59e0b', 0.03)
                                    : 'white',
                    borderRadius: 3,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'stretch',
                    opacity: isDragging ? 0.6 : 1,
                    cursor: 'default',
                    position: 'relative',
                    boxShadow: isSelected ? '0 10px 15px -3px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                    '&:hover': {
                        borderColor: '#3b82f6',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 20px -10px rgba(0,0,0,0.1)',
                        '& .drag-handle-card': {
                            bgcolor: alpha('#3b82f6', 0.1),
                            color: '#3b82f6'
                        }
                    },
                    overflow: 'hidden'
                }}
            >
                {/* Status Indicator Strip */}
                <Box sx={{
                    width: 5,
                    bgcolor: (personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) ? '#f59e0b'
                        : personnel.requestedPosition ? '#6366f1'
                            : '#94a3b8',
                    borderRadius: '4px 0 0 4px'
                }} />

                {/* Top Drop Indicator (Absolute) */}
                {closestEdge === 'top' && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        bgcolor: '#3b82f6',
                        zIndex: 10,
                        pointerEvents: 'none',
                    }} />
                )}

                {/* Bottom Drop Indicator (Absolute) */}
                {closestEdge === 'bottom' && (
                    <Box sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        bgcolor: '#3b82f6',
                        zIndex: 10,
                        pointerEvents: 'none',
                    }} />
                )}

                {/* Drag Handle */}
                <Box
                    className="drag-handle-card"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 1,
                        bgcolor: isSelected ? alpha('#3b82f6', 0.1) : '#f8fafc',
                        borderRight: '1px solid #f1f5f9',
                        color: isSelected ? '#3b82f6' : '#94a3b8',
                        cursor: isReadOnly ? 'default' : 'grab',
                        transition: '0.2s'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isReadOnly) {
                            onToggle(personnel.id);
                        }
                    }}
                >
                    <DragIndicatorIcon sx={{ fontSize: 18 }} />
                </Box>

                {/* Content */}
                <Box
                    sx={{ flex: 1, p: 2, minWidth: 0, cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCardClick?.(personnel, targetInfo);
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {isChain && (
                            <Chip
                                label={index + 1}
                                size="small"
                                sx={{
                                    height: 18,
                                    width: 18,
                                    minWidth: 18,
                                    fontSize: '0.6rem',
                                    fontWeight: 900,
                                    p: 0,
                                    bgcolor: '#1e293b',
                                    color: '#fff',
                                    '& .MuiChip-label': { px: 0 }
                                }}
                            />
                        )}
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                            {personnel.rank} {personnel.fullName}
                        </Typography>
                        {(personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) && (
                            <Chip label="ตัวอย่าง" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 900, bgcolor: '#fef3c7', color: '#b45309' }} />
                        )}
                    </Box>

                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500, mb: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {personnel.position || '-'} {personnel.actingAs && `(${personnel.actingAs})`}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                        <Chip
                            label={personnel.posCodeId || '-'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#f1f5f9', color: '#475569' }}
                        />
                        <Chip
                            label={personnel.unit || 'ไม่ระบุหน่วย'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha('#3b82f6', 0.05), color: '#3b82f6' }}
                        />
                    </Box>

                    {personnel.requestedPosition && (
                        <Box sx={{ mt: 1.5, p: 1, bgcolor: alpha('#6366f1', 0.03), borderRadius: 2, border: '1px solid', borderColor: alpha('#6366f1', 0.1) }}>
                            <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 800, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <StarIcon sx={{ fontSize: 12 }} /> ร้องขอ: {personnel.requestedPosition}
                            </Typography>
                        </Box>
                    )}

                    {/* Target Info Path - Professional Design */}
                    {targetInfo && (
                        <Box sx={{ mt: 2, pt: 1.5, borderTop: '2px dashed #f1f5f9' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ArrowForwardIcon sx={{ fontSize: 12, color: '#166534' }} />
                                </Box>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Target Destination
                                </Typography>
                            </Box>
                            <Box sx={{ p: 1, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#334155', lineHeight: 1.3 }}>
                                    {targetInfo.position || targetInfo.posCodeMaster?.name || 'ตำแหน่งว่าง'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.7rem' }}>
                                    {targetInfo.unit || 'ไม่ระบุหน่วย'}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Remove Button - Hide in read-only mode */}
                {!isReadOnly && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 0.5 }}>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            sx={{ color: 'error.main', opacity: 0.6, '&:hover': { opacity: 1 } }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                        {onMoveToLane && availableLanes.length > 0 && (
                            <MoveToLaneButton
                                availableLanes={availableLanes}
                                onMove={onMoveToLane}
                            />
                        )}
                    </Box>
                )}
            </Paper>
        </Box>
    );
});

DraggableCard.displayName = 'DraggableCard';

export default DraggableCard;
