import React, { useState } from 'react';
import {
    IconButton,
    Drawer,
    Box,
    Typography,
    TextField,
    InputAdornment,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    alpha,
    Tooltip
} from '@mui/material';
import {
    DriveFileMove as DriveFileMoveIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Close as CloseIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

interface MoveToLaneButtonProps {
    availableLanes: { id: string; title: string; groupNumber?: string }[];
    onMove: (laneId: string) => void;
    personName?: string;
    personPosition?: string;
    personPosCode?: string;
    personPosName?: string;
    personUnit?: string;
}

export default function MoveToLaneButton({
    availableLanes,
    onMove,
    personName,
    personPosition,
    personPosCode,
    personPosName,
    personUnit
}: MoveToLaneButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    if (availableLanes.length === 0) return null;

    const filteredLanes = availableLanes.filter(lane =>
        lane.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lane.groupNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMove = (laneId: string) => {
        onMove(laneId);
        setIsOpen(false);
    };

    return (
        <>
            <Tooltip title="ย้ายเข้าเลน">
                <IconButton
                    size="small"
                    onClick={() => setIsOpen(true)}
                    sx={{
                        color: 'text.secondary',
                        opacity: 0.6,
                        '&:hover': {
                            opacity: 1,
                            color: 'primary.main',
                            bgcolor: alpha('#3b82f6', 0.08)
                        }
                    }}
                >
                    <DriveFileMoveIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Drawer
                anchor="right"
                open={isOpen}
                onClose={() => setIsOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 420 },
                        bgcolor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column'
                    }
                }}
            >
                {/* Drawer Header */}
                <Box sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: alpha('#3b82f6', 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'primary.main'
                        }}>
                            <DriveFileMoveIcon />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                ย้ายเข้าเลน
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                ทั้งหมด {availableLanes.length} เลน
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ bgcolor: alpha('#64748b', 0.05) }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Person Info Section */}
                {personName && (
                    <Box sx={{ px: 2, py: 2, bgcolor: alpha('#3b82f6', 0.03), borderBottom: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                            บุคคลที่จะย้าย:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, fontSize: '1rem' }}>
                            👤 {personName}
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {personPosition && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, minWidth: 60 }}>ตำแหน่ง:</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#334155' }}>{personPosition}</Typography>
                                </Box>
                            )}
                            {(personPosCode || personPosName) && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, minWidth: 60 }}>Pos:</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {personPosCode && (
                                            <Chip
                                                label={personPosCode}
                                                size="small"
                                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: 'white', border: '1px solid #e2e8f0' }}
                                            />
                                        )}
                                        {personPosName && (
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>{personPosName}</Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}
                            {personUnit && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, minWidth: 60 }}>หน่วย:</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569' }}>{personUnit}</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}

                {/* Search Box */}
                <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e2e8f0' }}>
                    <TextField
                        fullWidth
                        size="small"
                        autoFocus
                        placeholder="พิมพ์ค้นหาชื่อเลน หรือเลขกลุ่ม..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                                </InputAdornment>
                            ),
                            sx: {
                                borderRadius: 2,
                                bgcolor: '#f1f5f9',
                                '& fieldset': { borderColor: 'transparent' },
                                '&:hover fieldset': { borderColor: alpha('#3b82f6', 0.3) },
                                '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }
                        }}
                    />
                    {searchTerm && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', fontWeight: 800 }}>
                            พบ {filteredLanes.length} รายการ
                        </Typography>
                    )}
                </Box>

                {/* List Container */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
                    {filteredLanes.length === 0 ? (
                        <Box sx={{ py: 10, textAlign: 'center', px: 2 }}>
                            <Box sx={{ opacity: 0.2, mb: 2 }}>
                                <SearchIcon sx={{ fontSize: 48 }} />
                            </Box>
                            <Typography variant="body2" color="text.disabled" sx={{ fontWeight: 600 }}>
                                ไม่พบเลนที่คุณค้นหาในรายการนี้
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {filteredLanes.map((lane) => (
                                <ListItem key={lane.id} disablePadding>
                                    <ListItemButton
                                        onClick={() => handleMove(lane.id)}
                                        sx={{
                                            borderRadius: 2,
                                            bgcolor: 'white',
                                            border: '1px solid #e2e8f0',
                                            p: 1.5,
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                bgcolor: 'white',
                                                borderColor: 'primary.main',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.12)',
                                                '& .move-icon': {
                                                    opacity: 1,
                                                    color: 'primary.main',
                                                    transform: 'translateX(0)'
                                                },
                                                '& .lane-title': {
                                                    color: 'primary.main'
                                                }
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {lane.groupNumber && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip
                                                                label={lane.groupNumber}
                                                                size="small"
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 900,
                                                                    bgcolor: alpha('#3b82f6', 0.08),
                                                                    color: 'primary.main',
                                                                    borderRadius: 1,
                                                                    border: '1px solid',
                                                                    borderColor: alpha('#3b82f6', 0.2)
                                                                }}
                                                            />
                                                            <Box sx={{ flex: 1, height: '1px', bgcolor: '#f1f5f9' }} />
                                                        </Box>
                                                    )}
                                                    <Typography className="lane-title" variant="body2" sx={{ fontWeight: 800, color: '#334155', lineHeight: 1.4, transition: 'color 0.2s' }}>
                                                        {lane.title}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        <ChevronRightIcon
                                            className="move-icon"
                                            sx={{
                                                fontSize: 20,
                                                opacity: 0.15,
                                                color: 'text.disabled',
                                                transition: 'all 0.3s',
                                                transform: 'translateX(-8px)'
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            </Drawer>
        </>
    );
}
