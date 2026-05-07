import React, { useMemo, useState } from 'react';
import {
    Box,
    Paper,
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
import { Virtuoso } from 'react-virtuoso';
import { Personnel, Column } from '../types';
import { matchesAnyWildcardSearch } from '@/lib/wildcardSearch';

interface BoardListViewProps {
    columns: Column[];
    personnelMap: Record<string, Personnel>;
    onCardClick?: (personnel: Personnel, targetInfo?: any) => void;
}

type ListRow =
    | { type: 'lane'; lane: Column; count: number }
    | { type: 'person'; lane: Column; person: Personnel; level: number; stripe: boolean };

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
            const laneMatches = matchesAnyWildcardSearch([col.title, col.groupNumber], searchTerm);

            const filteredItems = items.filter(item => {
                if (!searchTerm) return true;
                return (
                    laneMatches ||
                    matchesAnyWildcardSearch([item.person.fullName, item.person.position], searchTerm)
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
    const virtualRows = useMemo<ListRow[]>(() => {
        return groupedData.flatMap(group => [
            { type: 'lane' as const, lane: group.lane, count: group.items.length },
            ...group.items.map((item, idx) => ({
                type: 'person' as const,
                lane: group.lane,
                person: item.person,
                level: item.level,
                stripe: idx % 2 === 1,
            }))
        ]);
    }, [groupedData]);

    const gridColumns = '64px minmax(260px, 1.15fr) minmax(320px, 1fr) 56px';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
            {/* Toolbar ใน Component */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
                    รายการข้อมูลแยกตามกลุ่ม ({totalRows})
                </Typography>
                <TextField
                    size="small"
                    placeholder="ค้นหาชื่อ, ตำแหน่ง หรือเลขกลุ่ม เช่น ชื่อ*นามสกุล"
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

            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: gridColumns,
                        alignItems: 'center',
                        minWidth: 900,
                        bgcolor: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                    }}
                >
                    <Box sx={{ px: 2, py: 1, fontWeight: 800, color: '#64748b', fontSize: '0.875rem' }}>#</Box>
                    <Box sx={{ px: 2, py: 1, fontWeight: 800, color: '#64748b', fontSize: '0.875rem' }}>บุคลากร / ตำแหน่งปัจจุบัน</Box>
                    <Box sx={{ px: 2, py: 1, fontWeight: 800, color: '#64748b', fontSize: '0.875rem' }}>การปรับย้าย (เดิม → ใหม่)</Box>
                    <Box sx={{ px: 2, py: 1 }} />
                </Box>

                {virtualRows.length === 0 ? (
                    <Box sx={{ py: 10, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            ไม่พบข้อมูลที่ต้องการ
                        </Typography>
                    </Box>
                ) : (
                    <Virtuoso
                        data={virtualRows}
                        style={{ height: 'calc(100% - 41px)' }}
                        increaseViewportBy={500}
                        itemContent={(index, row) => {
                            if (row.type === 'lane') {
                                return (
                                    <Box sx={{ minWidth: 900, bgcolor: alpha('#f1f5f9', 0.9), borderBottom: '1px solid #e2e8f0', px: 2, py: 0.75 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', bgcolor: 'white', px: 1, py: 0.2, borderRadius: 1, border: '1px solid', borderColor: alpha('#3b82f6', 0.2) }}>
                                                {row.lane.groupNumber}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {row.lane.title}
                                            </Typography>
                                            {getLaneTypeChip(row.lane.chainType)}
                                            <Box sx={{ flex: 1 }} />
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, flexShrink: 0 }}>
                                                {row.count} รายการ
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            }

                            return (
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: gridColumns,
                                        alignItems: 'center',
                                        minWidth: 900,
                                        cursor: 'pointer',
                                        bgcolor: row.stripe ? alpha('#f8fafc', 0.5) : 'white',
                                        borderBottom: '1px solid #eef2f7',
                                        '&:hover': { bgcolor: alpha('#3b82f6', 0.04) },
                                    }}
                                    onClick={() => onCardClick?.(row.person)}
                                >
                                    <Box sx={{ px: 2, py: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', display: 'block', textAlign: 'center' }}>
                                            {row.level}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ px: 2, py: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2, minWidth: 0 }}>
                                                {row.lane.chainType === 'promotion' && (
                                                    <Chip label={`Lv ${row.level}`} size="small" color="error" sx={{ height: 14, fontSize: '0.55rem', fontWeight: 900, px: 0, flexShrink: 0 }} />
                                                )}
                                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {row.person.rank}{row.person.fullName}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {row.person.position || '-'} <BusinessIcon sx={{ fontSize: 10, ml: 0.5, flexShrink: 0 }} /> {row.person.unit || '-'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ px: 2, py: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="caption" noWrap sx={{ color: '#94a3b8', display: 'block', fontSize: '0.8rem' }}>
                                                    {row.person.unit || '-'}
                                                </Typography>
                                                <Typography variant="caption" noWrap sx={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.8rem' }}>
                                                    {row.person.position || '-'}
                                                </Typography>
                                            </Box>
                                            <ArrowForwardIcon sx={{ color: 'divider', fontSize: 14, flexShrink: 0 }} />
                                            <Box sx={{ flex: 1, minWidth: 0, bgcolor: alpha('#10b981', 0.05), px: 1, py: 0.5, borderRadius: 1 }}>
                                                <Typography variant="caption" noWrap sx={{ color: '#059669', fontWeight: 800, display: 'block', fontSize: '0.85rem' }}>
                                                    {row.person.toUnit || '-'}
                                                </Typography>
                                                <Typography variant="caption" noWrap sx={{ color: '#059669', fontWeight: 700, fontSize: '0.8rem' }}>
                                                    {row.person.toPosition || row.person.toPosCodeMaster?.name || 'ตำแหน่งว่าง'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box sx={{ px: 1, py: 1, textAlign: 'right' }}>
                                        <Tooltip title="ดูรายละเอียด">
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCardClick?.(row.person); }}>
                                                <InfoIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.6, fontSize: 18 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            );
                        }}
                    />
                )}
            </Paper>
        </Box>
    );
}
