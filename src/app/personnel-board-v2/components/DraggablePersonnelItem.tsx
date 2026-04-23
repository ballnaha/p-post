import React, { useState, useEffect, useRef, memo } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Chip,
    alpha,
    MenuItem,
} from '@mui/material';
import {
    Add as AddIcon,
    DragIndicator as DragIndicatorIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import { Personnel, Column } from '../types';
import MoveToLaneButton from './MoveToLaneButton';

interface DraggablePersonnelItemProps {
    person: Personnel;
    columns: Column[];
    personnelMap: Record<string, Personnel>;
    onAddToLane: (person: Personnel, laneId: string) => void;
}

const DraggablePersonnelItem = memo(({
    person,
    columns,
    personnelMap,
    onAddToLane
}: DraggablePersonnelItemProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        return draggable({
            element: el,
            getInitialData: () => ({
                type: 'personnel',
                person: { ...person, id: person.id }
            }),
            onDragStart: () => setIsDragging(true),
            onDrop: () => setIsDragging(false),
        });
    }, [person]);

    return (
        <>
            <Paper
                ref={ref}
                elevation={0}
                sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor: isDragging ? 'primary.main' : 'grey.200',
                    bgcolor: isDragging ? alpha('#3b82f6', 0.05) : 'background.paper',
                    borderRadius: 1,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'stretch',
                    opacity: isDragging ? 0.5 : 1,
                    cursor: 'grab',
                    '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    },
                    overflow: 'hidden'
                }}
            >
                {/* Drag Handle */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 0.75,
                    bgcolor: '#f8fafc',
                    borderRight: '1px solid #e2e8f0',
                    color: 'text.disabled',
                }}>
                    <DragIndicatorIcon fontSize="small" />
                </Box>

                {/* Content */}
                <Box
                    sx={{ flex: 1, p: 1.5, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => setIsDetailOpen(true)}
                >
                    <Typography 
                        variant="subtitle2" 
                        sx={{ 
                            fontWeight: 700, 
                            fontSize: '0.95rem', 
                            lineHeight: 1.3,
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                        }}
                    >
                        {person.rank} {person.fullName}
                    </Typography>
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
                        {person.position}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                        <Chip
                            label={person.posCodeId ? `${person.posCodeId} - ${person.posCodeMaster?.name || '-'}` : (person.posCodeMaster?.name || '-')}
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
                            label={person.unit || 'ไม่ระบุหน่วย'}
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
                        อายุ: {person.age || '-'} | อาวุโส: {person.seniority || '-'}
                    </Typography>
                    {(person.requestedPosition || person.supporterName || person.supportReason) && (
                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                                📍 ร้องขอ: {person.requestedPosition || person.supporterName || 'มีการร้องขอตำแหน่ง'}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Quick Add Button - Only show if there are active (non-completed) lanes */}
                {columns.filter(col => !col.isCompleted).length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5 }}>
                        <MoveToLaneButton
                            availableLanes={columns
                                .filter(col => !col.isCompleted)
                                .map(col => ({
                                    id: col.id,
                                    title: col.title,
                                    groupNumber: col.groupNumber,
                                    occupants: col.itemIds
                                        .map(id => personnelMap[id])
                                        .filter((p): p is Personnel => !!p)
                                        .map(p => ({
                                            name: `${p.rank || ''}${p.fullName || ''}`,
                                            currentPosition: p.position || '-',
                                            currentUnit: p.unit || '-',
                                            targetPosition: p.toPosition || p.toPosCodeMaster?.name || 'ตำแหน่งว่าง',
                                            targetUnit: p.toUnit || '-',
                                            age: p.age,
                                            seniority: p.seniority,
                                            requestedPosition: p.requestedPosition
                                        }))
                                }))
                            }
                            personName={`${person.rank || ''} ${person.fullName || ''}`}
                            personPosition={person.position || ''}
                            personPosCode={person.posCodeId?.toString()}
                            personPosName={person.posCodeMaster?.name || ''}
                            personUnit={person.unit || ''}
                            onMove={(laneId) => onAddToLane(person, laneId)}
                        />
                    </Box>
                )}
            </Paper>

            <PersonnelDetailModal
                open={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                personnel={person}
            />
        </>
    );
});

DraggablePersonnelItem.displayName = 'DraggablePersonnelItem';

export default DraggablePersonnelItem;
