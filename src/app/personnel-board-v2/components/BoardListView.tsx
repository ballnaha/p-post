import React, { useMemo, useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    alpha,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Search as SearchIcon,
    Info as InfoIcon,
    ArrowForward as ArrowForwardIcon,
    SwapHoriz as SwapIcon,
    TrendingUp as PromotionIcon,
    ThreeSixty as ThreeWayIcon,
    Business as BusinessIcon,
} from '@mui/icons-material';
import { Personnel, Column } from '../types';

interface BoardListViewProps {
    columns: Column[];
    personnelMap: Record<string, Personnel>;
    onCardClick?: (personnel: Personnel, targetInfo?: any) => void;
}

export default function BoardListView({ columns, personnelMap, onCardClick }: BoardListViewProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // Group data by Lane for better visualization
    const groupedData = useMemo(() => {
        const groups: Array<{
            lane: Column;
            items: Array<{ person: Personnel; level: number }>;
        }> = [];

        columns.forEach(col => {
            const items = col.itemIds
                .map((id, idx) => ({ person: personnelMap[id], level: idx + 1 }))
                .filter(item => item.person);

            // If there's a search term, filter items or the lane itself
            const term = searchTerm.toLowerCase();
            const laneMatches = col.title?.toLowerCase().includes(term) || col.groupNumber?.toLowerCase().includes(term);
            
            const filteredItems = items.filter(item => {
                if (!searchTerm) return true;
                return (
                    laneMatches ||
                    item.person.fullName?.toLowerCase().includes(term) ||
                    item.person.position?.toLowerCase().includes(term)
                );
            });

            if (filteredItems.length > 0) {
                groups.push({
                    lane: col,
                    items: filteredItems
                });
            }
        });

        return groups;
    }, [columns, personnelMap, searchTerm]);

    const getLaneTypeChip = (type?: string) => {
        switch (type) {
            case 'swap':
                return <Chip icon={<SwapIcon sx={{ fontSize: 14 }} />} label="สลับตำแหน่ง" size="small" sx={{ bgcolor: alpha('#a855f7', 0.1), color: '#a855f7', fontWeight: 700, height: 20, fontSize: '0.65rem' }} />;
            case 'three-way':
                return <Chip icon={<ThreeWayIcon sx={{ fontSize: 14 }} />} label="วงสลับ" size="small" sx={{ bgcolor: alpha('#f43f5e', 0.1), color: '#f43f5e', fontWeight: 700, height: 20, fontSize: '0.65rem' }} />;
            case 'promotion':
            case 'transfer':
                return <Chip icon={<PromotionIcon sx={{ fontSize: 14 }} />} label="เลื่อน/ย้าย" size="small" sx={{ bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6', fontWeight: 700, height: 20, fontSize: '0.65rem' }} />;
            default:
                return <Chip label="ทั่วไป" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />;
        }
    };

    const totalRows = useMemo(() => groupedData.reduce((acc, curr) => acc + curr.items.length, 0), [groupedData]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
            {/* Toolbar ใน Component */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                    รายการข้อมูลแยกตามกลุ่ม ({totalRows})
                </Typography>
                <TextField
                    size="small"
                    placeholder="ค้นหาชื่อ, ตำแหน่ง หรือเลขกลุ่ม..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </InputAdornment>
                        ),
                        sx: { borderRadius: 2, bgcolor: 'white', width: 300 }
                    }}
                />
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', flex: 1, overflow: 'auto' }}>
                <Table stickyHeader size="small" aria-label="personnel list table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', width: 50, py: 1 }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', py: 1 }}>บุคลากร / ตำแหน่งปัจจุบัน</TableCell>
                            <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', py: 1 }}>การปรับย้าย (เดิม → ใหม่)</TableCell>
                            <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', width: 40, py: 1 }}></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groupedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        ไม่พบข้อมูลที่ต้องการ
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            groupedData.map((group) => (
                                <React.Fragment key={group.lane.id}>
                                    {/* Lane Header Row - More Compact */}
                                    <TableRow sx={{ bgcolor: alpha('#f1f5f9', 0.9) }}>
                                        <TableCell colSpan={4} sx={{ py: 0.75, borderBottom: '1px solid #e2e8f0' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', bgcolor: 'white', px: 1, py: 0.2, borderRadius: 1, border: '1px solid', borderColor: alpha('#3b82f6', 0.2) }}>
                                                    {group.lane.groupNumber}
                                                </Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                                                    {group.lane.title}
                                                </Typography>
                                                {getLaneTypeChip(group.lane.chainType)}
                                                <Box sx={{ flex: 1 }} />
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                    {group.items.length} รายการ
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    
                                    {/* Personnel Rows - Very Compact */}
                                    {group.items.map((item, idx) => (
                                        <TableRow 
                                            key={`${group.lane.id}-${item.person.id}-${idx}`}
                                            hover
                                            sx={{ 
                                                '&:last-child td, &:last-child th': { border: 0 }, 
                                                cursor: 'pointer',
                                                bgcolor: idx % 2 === 0 ? 'transparent' : alpha('#f8fafc', 0.5)
                                            }}
                                            onClick={() => onCardClick?.(item.person)}
                                        >
                                            <TableCell>
                                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', display: 'block', textAlign: 'center' }}>
                                                    {item.level}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ py: 1 }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
                                                        {group.lane.chainType === 'promotion' && (
                                                            <Chip label={`Lv ${item.level}`} size="small" color="error" sx={{ height: 14, fontSize: '0.55rem', fontWeight: 900, px: 0 }} />
                                                        )}
                                                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                                                            {item.person.rank}{item.person.fullName}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        {item.person.position || '-'} <BusinessIcon sx={{ fontSize: 10, ml: 0.5 }} /> {item.person.unit || '-'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ py: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    {/* Condensed Move Display */}
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="caption" noWrap sx={{ color: '#94a3b8', display: 'block', fontSize: '0.8rem' }}>
                                                            {item.person.unit || '-'}
                                                        </Typography>
                                                        <Typography variant="caption" noWrap sx={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.8rem' }}>
                                                            {item.person.position || '-'}
                                                        </Typography>
                                                    </Box>
                                                    
                                                    <ArrowForwardIcon sx={{ color: 'divider', fontSize: 14 }} />
                                                    
                                                    <Box sx={{ flex: 1, minWidth: 0, bgcolor: alpha('#10b981', 0.05), px: 1, py: 0.5, borderRadius: 1 }}>
                                                        <Typography variant="caption" noWrap sx={{ color: '#059669', fontWeight: 800, display: 'block', fontSize: '0.85rem' }}>
                                                            {item.person.toUnit || '-'}
                                                        </Typography>
                                                        <Typography variant="caption" noWrap sx={{ color: '#059669', fontWeight: 700, fontSize: '0.8rem' }}>
                                                            {item.person.toPosition || item.person.toPosCodeMaster?.name || 'ตำแหน่งว่าง'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right" sx={{ py: 1 }}>
                                                <Tooltip title="ดูรายละเอียด">
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCardClick?.(item.person); }}>
                                                        <InfoIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.6, fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
