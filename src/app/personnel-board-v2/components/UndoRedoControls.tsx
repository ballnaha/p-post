import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Undo as UndoIcon, Redo as RedoIcon } from '@mui/icons-material';

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="ย้อนกลับ (Undo) Ctrl+Z">
                <span>
                    <IconButton
                        size="small"
                        onClick={onUndo}
                        disabled={!canUndo}
                        sx={{
                            width: 32,
                            height: 32,
                            border: '1px solid',
                            borderColor: canUndo ? 'grey.300' : 'transparent',
                            borderRadius: 2,
                            color: canUndo ? 'text.secondary' : 'text.disabled',
                            '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main', color: 'primary.main' }
                        }}
                    >
                        <UndoIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </span>
            </Tooltip>

            <Tooltip title="ทำซ้ำ (Redo) Ctrl+Y">
                <span>
                    <IconButton
                        size="small"
                        onClick={onRedo}
                        disabled={!canRedo}
                        sx={{
                            width: 32,
                            height: 32,
                            border: '1px solid',
                            borderColor: canRedo ? 'grey.300' : 'transparent',
                            borderRadius: 2,
                            color: canRedo ? 'text.secondary' : 'text.disabled',
                            '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main', color: 'primary.main' }
                        }}
                    >
                        <RedoIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
};

export default UndoRedoControls;
