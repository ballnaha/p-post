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
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {person.rank} {person.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                        {person.position}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                        <Chip
                            label={person.posCodeId ? `${person.posCodeId} - ${person.posCodeMaster?.name || '-'}` : (person.posCodeMaster?.name || '-')}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'primary.50', color: 'primary.main' }}
                        />
                        <Chip
                            label={person.unit || 'ไม่ระบุหน่วย'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'grey.100' }}
                        />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                        อายุ: {person.age || '-'} | อาวุโส: {person.seniority || '-'}
                    </Typography>
                    {(person.requestedPosition || person.supporterName || person.supportReason) && (
                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
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
