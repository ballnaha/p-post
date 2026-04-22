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
    const [justDropped, setJustDropped] = useState(false);

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
                onDrop: () => {
                    setIsDragging(false);
                    setJustDropped(true);
                    setTimeout(() => setJustDropped(false), 600);
                },
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
                onDrop: () => {
                    setClosestEdge(null);
                    setJustDropped(true);
                    setTimeout(() => setJustDropped(false), 600);
                },
            })
        );
    }, [personnel.id, index, personnel, isReadOnly]);

    return (
        <Box sx={{ position: 'relative' }}>
            <Paper
                ref={ref}
                elevation={0}
                sx={{
                    mb: 1,
                    border: (personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) ? '2px dashed' : '2px solid',
                    borderColor: justDropped ? '#22c55e'
                        : isSelected ? 'primary.main'
                            : closestEdge ? 'primary.main'
                                : isDragging ? 'primary.main'
                                    : (personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) ? '#f59e0b'
                                        : 'grey.200',
                    bgcolor: justDropped ? alpha('#22c55e', 0.1)
                        : isSelected ? alpha('#3b82f6', 0.12)
                            : closestEdge ? alpha('#3b82f6', 0.08)
                                : isDragging ? alpha('#3b82f6', 0.05)
                                    : (personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) ? alpha('#f59e0b', 0.05)
                                        : 'background.paper',
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'stretch',
                    opacity: isDragging ? 0.5 : 1,
                    cursor: 'default',
                    position: 'relative',
                    borderWidth: isSelected ? '3px' : '2px',
                    margin: isSelected ? '-1px 0 7px 0' : '0 0 8px 0',
                    '&:hover': {
                        borderColor: (personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) ? '#d97706' : 'primary.main',
                        bgcolor: (personnel.isPlaceholder || personnel.id.startsWith('placeholder-')) ? alpha('#f59e0b', 0.1) : undefined,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    },
                    overflow: 'visible',
                    backgroundClip: 'padding-box',
                }}
            >
                {/* Top Drop Indicator (Absolute) */}
                {closestEdge === 'top' && (
                    <Box sx={{
                        position: 'absolute',
                        top: -18,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        zIndex: 10,
                        pointerEvents: 'none',
                    }}>
                        <Box sx={{
                            height: 4,
                            flex: 1,
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                        }} />
                        <Typography variant="caption" sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                        }}>
                            วางที่นี่ ↑
                        </Typography>
                        <Box sx={{
                            height: 4,
                            flex: 1,
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                        }} />
                    </Box>
                )}

                {/* Bottom Drop Indicator (Absolute) */}
                {closestEdge === 'bottom' && (
                    <Box sx={{
                        position: 'absolute',
                        bottom: -18,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        zIndex: 10,
                        pointerEvents: 'none',
                    }}>
                        <Box sx={{
                            height: 4,
                            flex: 1,
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                        }} />
                        <Typography variant="caption" sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                        }}>
                            วางที่นี่ ↓
                        </Typography>
                        <Box sx={{
                            height: 4,
                            flex: 1,
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                        }} />
                    </Box>
                )}

                {/* Drag Handle - Click to toggle selection */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 0.75,
                        bgcolor: isSelected ? alpha('#3b82f6', 0.15) : '#f8fafc',
                        borderRight: '1px solid #e2e8f0',
                        color: isSelected ? 'primary.main' : 'text.disabled',
                        borderRadius: '10px 0 0 10px',
                        cursor: isReadOnly ? 'default' : 'grab',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                            bgcolor: alpha('#3b82f6', 0.1),
                            color: 'primary.main',
                        }
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isReadOnly) {
                            onToggle(personnel.id);
                        }
                    }}
                >
                    <DragIndicatorIcon fontSize="small" />
                </Box>

                {/* Content - Click to open modal */}
                <Box
                    sx={{ flex: 1, p: 1.5, minWidth: 0, cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onCardClick?.(personnel, targetInfo);
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.25, minWidth: 0 }}>
                        {isChain && (
                            <Chip
                                label={`Lv ${index + 1}`}
                                size="small"
                                color="error"
                                sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900, px: 0, flexShrink: 0 }}
                            />
                        )}
                        <Typography 
                            variant="subtitle2" 
                            sx={{ 
                                fontWeight: 700, 
                                fontSize: '0.95rem', 
                                lineHeight: 1.3,
                                flex: 1,
                                minWidth: 0,
                                whiteSpace: 'normal',
                                overflowWrap: 'anywhere',
                                wordBreak: 'break-word',
                            }}
                        >
                            {personnel.rank} {personnel.fullName}
                        </Typography>
                    </Box>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            fontSize: '0.8rem',
                            lineHeight: 1.3,
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {personnel.position || '-'} {personnel.actingAs && `(${personnel.actingAs})`}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                        <Chip
                            label={personnel.posCodeId ? `${personnel.posCodeId} - ${personnel.posCodeMaster?.name || '-'}` : (personnel.posCodeMaster?.name || '-')}
                            size="small"
                            sx={{
                                height: 'auto',
                                minHeight: 22,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: 'primary.50',
                                color: 'primary.main',
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
                        <Chip
                            label={personnel.unit || 'ไม่ระบุหน่วย'}
                            size="small"
                            sx={{
                                height: 'auto',
                                minHeight: 22,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: 'grey.100',
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
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                        อายุ: {personnel.age || '-'} | อาวุโส: {personnel.seniority || '-'}
                    </Typography>
                    {(personnel.requestedPosition || personnel.supporterName || personnel.supportReason) && (
                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                                📍 ร้องขอ: {personnel.requestedPosition || personnel.supporterName || 'มีการร้องขอตำแหน่ง'}
                            </Typography>
                        </Box>
                    )}

                    {/* Target Info (For chains) - More Professional Integration */}
                    {targetInfo && (
                        <Box sx={{
                            mt: 1.5,
                            pt: 1.5,
                            borderTop: '1px solid',
                            borderColor: alpha('#e2e8f0', 0.6),
                            position: 'relative'
                        }}>
                            <Box sx={{
                                position: 'absolute',
                                top: -8,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                bgcolor: 'white',
                                px: 1,
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <ArrowDownwardIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            </Box>

                            <Box sx={{
                                bgcolor: alpha('#f0fdf4', 0.5),
                                p: 1,
                                borderRadius: 1.5,
                                border: '1px solid',
                                borderColor: alpha('#bbf7d0', 0.5)
                            }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.dark', fontSize: '0.65rem', display: 'block', mb: 0.5, opacity: 0.8 }}>
                                    ตำแหน่งเป้าหมาย
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ fontWeight: 700, fontSize: '0.75rem', lineHeight: 1.2, color: '#166534' }}>
                                    {targetInfo.position || targetInfo.posCodeMaster?.name || 'ตำแหน่งว่าง'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
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
                                personName={`${personnel.rank || ''} ${personnel.fullName || ''}`}
                                personPosition={personnel.position || ''}
                                personPosCode={personnel.posCodeId?.toString()}
                                personPosName={personnel.posCodeMaster?.name || ''}
                                personUnit={personnel.unit || ''}
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
