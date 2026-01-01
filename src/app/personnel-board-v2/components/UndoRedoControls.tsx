import React from 'react';
import { Box, IconButton, Tooltip, Paper, Fade, Typography } from '@mui/material';
import { Undo as UndoIcon, Redo as RedoIcon, History as HistoryIcon } from '@mui/icons-material';

interface UndoRedoControlsProps {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}) => {
    return (
        <Fade in={true}>
            <Paper
                elevation={3}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    left: 24, // Bottom Left
                    zIndex: 1300, // Higher than drawers (1200)
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', px: 1, opacity: 0.5 }}>
                    <HistoryIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </Box>

                <Tooltip title="ย้อนกลับ (Undo)">
                    <span>
                        <IconButton
                            size="small"
                            onClick={onUndo}
                            disabled={!canUndo}
                            sx={{
                                color: canUndo ? 'primary.main' : 'text.disabled',
                                '&:hover': { bgcolor: 'primary.50' }
                            }}
                        >
                            <UndoIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>

                <Tooltip title="ทำซ้ำ (Redo)">
                    <span>
                        <IconButton
                            size="small"
                            onClick={onRedo}
                            disabled={!canRedo}
                            sx={{
                                color: canRedo ? 'primary.main' : 'text.disabled',
                                '&:hover': { bgcolor: 'primary.50' }
                            }}
                        >
                            <RedoIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Paper>
        </Fade>
    );
};

export default UndoRedoControls;
