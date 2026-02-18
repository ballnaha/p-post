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
    onAddToLane: (person: Personnel, laneId: string) => void;
}

const DraggablePersonnelItem = memo(({
    person,
    columns,
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
                    mb: 1.5,
                    border: '1px solid',
                    borderColor: isDragging ? '#3b82f6' : '#e2e8f0',
                    bgcolor: isDragging ? alpha('#3b82f6', 0.05) : 'white',
                    borderRadius: 3,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'stretch',
                    opacity: isDragging ? 0.6 : 1,
                    cursor: 'grab',
                    '&:hover': {
                        borderColor: '#3b82f6',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 20px -10px rgba(0,0,0,0.08)',
                        '& .drag-handle': {
                            bgcolor: alpha('#3b82f6', 0.1),
                            color: '#3b82f6'
                        }
                    },
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Status Indicator Strip */}
                <Box sx={{
                    width: 4,
                    bgcolor: person.requestedPosition ? '#6366f1' : '#cbd5e1',
                    borderRadius: '4px 0 0 4px'
                }} />

                {/* Drag Handle */}
                <Box
                    className="drag-handle"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 1,
                        bgcolor: '#f8fafc',
                        color: '#94a3b8',
                        transition: 'all 0.2s',
                        borderRight: '1px solid #f1f5f9'
                    }}
                >
                    <DragIndicatorIcon sx={{ fontSize: 18 }} />
                </Box>

                {/* Content */}
                <Box
                    sx={{ flex: 1, p: 2, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => setIsDetailOpen(true)}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                            {person.rank} {person.fullName}
                        </Typography>
                        {person.requestedPosition && (
                            <Box sx={{ display: 'flex', p: 0.3, bgcolor: alpha('#6366f1', 0.1), borderRadius: 1, color: '#6366f1' }}>
                                <StarIcon sx={{ fontSize: 14 }} />
                            </Box>
                        )}
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500, mb: 1.5, lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                        {person.position}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                        <Chip
                            label={person.posCodeId || '-'}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                bgcolor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0'
                            }}
                        />
                        <Chip
                            label={person.unit || 'ไม่ระบุหน่วย'}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                bgcolor: alpha('#10b981', 0.05),
                                color: '#059669',
                                border: '1px solid',
                                borderColor: alpha('#10b981', 0.2)
                            }}
                        />
                    </Box>

                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 2 }}>
                        <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>อายุ</Typography>
                            <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.75rem', fontWeight: 700 }}>{person.age || '-'}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>อาวุโส</Typography>
                            <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.75rem', fontWeight: 700 }}>{person.seniority || '-'}</Typography>
                        </Box>
                    </Box>

                    {person.requestedPosition && (
                        <Box sx={{ mt: 1.5, p: 1, bgcolor: alpha('#6366f1', 0.03), borderRadius: 2, border: '1px dashed', borderColor: alpha('#6366f1', 0.2) }}>
                            <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 800, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <span style={{ fontSize: '0.8rem' }}>📍</span> ร้องขอ: {person.requestedPosition}
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
                                    groupNumber: col.groupNumber
                                }))
                            }
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
