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
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Avatar,
    Paper
} from '@mui/material';
import {
    DriveFileMove as DriveFileMoveIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Close as CloseIcon,
    ChevronRight as ChevronRightIcon,
    Groups as GroupsIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

interface MoveToLaneButtonProps {
    availableLanes: {
        id: string;
        title: string;
        groupNumber?: string;
        occupants?: {
            name: string;
            currentPosition: string;
            currentUnit: string;
            targetPosition: string;
            targetUnit: string;
            age?: string | number | null;
            seniority?: string | number | null;
            requestedPosition?: string | null;
        }[];
    }[];
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
    const [detailsLane, setDetailsLane] = useState<MoveToLaneButtonProps['availableLanes'][0] | null>(null);

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
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                        {lane.groupNumber ? (
                                                            <Chip
                                                                label={`กลุ่ม ${lane.groupNumber}`}
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
                                                        ) : <Box />}

                                                        {lane.occupants && lane.occupants.length > 0 && (
                                                            <Tooltip title="คลิกเพื่อดูรายชื่อ">
                                                                <Chip
                                                                    icon={<GroupsIcon sx={{ fontSize: '14px !important' }} />}
                                                                    label={`${lane.occupants.length} คน`}
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDetailsLane(lane);
                                                                    }}
                                                                    sx={{
                                                                        height: 22,
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 800,
                                                                        bgcolor: alpha('#3b82f6', 0.1),
                                                                        color: 'primary.main',
                                                                        '& .MuiChip-icon': { color: 'primary.main' },
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s',
                                                                        '&:hover': {
                                                                            bgcolor: 'primary.main',
                                                                            color: 'white',
                                                                            '& .MuiChip-icon': { color: 'white' }
                                                                        }
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                    <Typography
                                                        className="lane-title"
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 800,
                                                            color: '#334155',
                                                            lineHeight: 1.4,
                                                            transition: 'color 0.2s',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            whiteSpace: 'normal',
                                                            wordBreak: 'break-word',
                                                            overflowWrap: 'anywhere',
                                                        }}
                                                    >
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

            {/* Occupants Details Dialog */}
            <Dialog
                open={Boolean(detailsLane)}
                onClose={() => setDetailsLane(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, overflow: 'hidden' }
                }}
            >
                <DialogTitle sx={{
                    bgcolor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e2e8f0',
                    py: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                            <GroupsIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>
                                {detailsLane?.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                รายชื่อบุคคลในเลน ({detailsLane?.occupants?.length || 0} คน)
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={() => setDetailsLane(null)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0, bgcolor: '#f8fafc' }}>
                    <List disablePadding>
                        {detailsLane?.occupants?.map((occ, i) => (
                            <ListItem
                                key={i}
                                divider={i !== detailsLane.occupants!.length - 1}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    gap: 1,
                                    '&:hover': { bgcolor: alpha('#3b82f6', 0.02) }
                                }}
                            >
                                {/* Row 1: Name and Basic Info */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', flex: 1 }}>
                                        {i + 1}. {occ.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Chip label={`อายุ: ${occ.age || '-'}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', color: '#64748b', borderColor: '#e2e8f0' }} />
                                        <Chip label={`อาวุโส: ${occ.seniority || '-'}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', color: '#64748b', borderColor: '#e2e8f0' }} />
                                    </Box>
                                </Box>

                                {/* Row 2: From -> To (Compact Horizontal) */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    bgcolor: 'white',
                                    p: 1,
                                    borderRadius: 1.5,
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" noWrap sx={{ fontWeight: 700, color: '#475569', display: 'block', fontSize: '0.75rem' }}>
                                            {occ.currentPosition}
                                        </Typography>
                                        <Typography variant="caption" noWrap sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                                            {occ.currentUnit}
                                        </Typography>
                                    </Box>

                                    <ArrowForwardIcon sx={{ color: '#cbd5e1', fontSize: 14 }} />

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" noWrap sx={{ fontWeight: 800, color: '#059669', display: 'block', fontSize: '0.75rem' }}>
                                            {occ.targetPosition}
                                        </Typography>
                                        <Typography variant="caption" noWrap sx={{ color: '#10b981', fontSize: '0.65rem', opacity: 0.8 }}>
                                            {occ.targetUnit}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Row 3: Special Requests (If any) */}
                                {occ.requestedPosition && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.65rem', bgcolor: alpha('#f59e0b', 0.08), px: 0.8, py: 0.2, borderRadius: 1 }}>
                                            📍 ร้องขอ: {occ.requestedPosition}
                                        </Typography>
                                    </Box>
                                )}
                            </ListItem>
                        ))}
                        {(!detailsLane?.occupants || detailsLane.occupants.length === 0) && (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">ยังไม่มีรายชื่อในเลนนี้</Typography>
                            </Box>
                        )}
                    </List>
                </DialogContent>
                <DialogActions sx={{ p: 1.5, bgcolor: 'white', borderTop: '1px solid #e2e8f0' }}>
                    <Button onClick={() => setDetailsLane(null)} variant="text" color="inherit" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                        ปิด
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
