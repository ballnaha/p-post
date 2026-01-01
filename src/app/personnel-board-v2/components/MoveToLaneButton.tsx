import React, { useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import { DriveFileMove as DriveFileMoveIcon } from '@mui/icons-material';

interface MoveToLaneButtonProps {
    availableLanes: { id: string; title: string; groupNumber?: string }[];
    onMove: (laneId: string) => void;
}

export default function MoveToLaneButton({ availableLanes, onMove }: MoveToLaneButtonProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    if (availableLanes.length === 0) return null;

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMove = (laneId: string) => {
        onMove(laneId);
        handleClose();
    };

    return (
        <>
            <IconButton
                size="small"
                onClick={handleClick}
                sx={{
                    color: 'text.secondary',
                    opacity: 0.6,
                    '&:hover': {
                        opacity: 1,
                        color: 'primary.main',
                        bgcolor: 'rgba(59, 130, 246, 0.08)'
                    }
                }}
            >
                <DriveFileMoveIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleClose();
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                    sx: {
                        maxHeight: 300,
                        width: 320,
                        mt: 1,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        borderRadius: 2,
                    }
                }}
            >
                {availableLanes.map((lane) => (
                    <MenuItem
                        key={lane.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleMove(lane.id);
                        }}
                        sx={{
                            fontSize: '0.875rem',
                            py: 1,
                            px: 2,
                            borderBottom: '1px solid #f1f5f9',
                            '&:last-child': {
                                borderBottom: 'none'
                            }
                        }}
                    >
                        <ListItemText
                            primary={
                                <>
                                    {lane.groupNumber && (
                                        <span style={{ fontWeight: 700, color: '#3b82f6', marginRight: 8 }}>
                                            {lane.groupNumber}
                                        </span>
                                    )}
                                    {lane.title}
                                </>
                            }
                            primaryTypographyProps={{
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                style: { whiteSpace: 'normal', wordBreak: 'break-word' }
                            }}
                        />
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
