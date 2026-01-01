import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Chip,
    Button,
    TextField,
    CircularProgress,
    InputAdornment,
    Collapse,
    Pagination,
    Divider,
    alpha,
    MenuItem
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterListIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    Star as StarIcon
} from '@mui/icons-material';
import { Personnel } from '../types';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

interface CreateSwapLaneTabProps {
    selectedYear: number;
    allUnits: string[];
    posCodeOptions: Array<{ id: number; name: string }>;
    onCreate: (person1: Personnel, person2: Personnel, title: string) => void;
}

export default function CreateSwapLaneTab({
    selectedYear,
    allUnits,
    posCodeOptions,
    onCreate
}: CreateSwapLaneTabProps) {
    // State
    const [swapCreateMode, setSwapCreateMode] = useState<'select1' | 'select2' | 'confirm'>('select1');
    const [swapPerson1, setSwapPerson1] = useState<Personnel | null>(null);
    const [swapPerson2, setSwapPerson2] = useState<Personnel | null>(null);
    const [swapLaneTitle, setSwapLaneTitle] = useState('');

    // List & Filters
    const [swapPersonnelList, setSwapPersonnelList] = useState<Personnel[]>([]);
    const [loadingSwapPersonnel, setLoadingSwapPersonnel] = useState(false);
    const [swapSearchTerm, setSwapSearchTerm] = useState('');
    const [debouncedSwapSearchTerm, setDebouncedSwapSearchTerm] = useState('');
    const [swapFilterUnit, setSwapFilterUnit] = useState('all');
    const [swapFilterPosCode, setSwapFilterPosCode] = useState('all');
    const [isSwapFilterCollapsed, setIsSwapFilterCollapsed] = useState(true);
    const [swapPage, setSwapPage] = useState(0);
    const [swapTotal, setSwapTotal] = useState(0);

    // Modal
    const [viewSwapPerson, setViewSwapPerson] = useState<Personnel | null>(null);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSwapSearchTerm(swapSearchTerm), 300);
        return () => clearTimeout(timer);
    }, [swapSearchTerm]);

    // Fetch Personnel List
    const fetchSwapPersonnelList = useCallback(async () => {
        setLoadingSwapPersonnel(true);
        try {
            const params = new URLSearchParams();
            params.set('year', selectedYear.toString());
            if (debouncedSwapSearchTerm) params.set('search', debouncedSwapSearchTerm);
            if (swapFilterUnit && swapFilterUnit !== 'all') params.set('unit', swapFilterUnit);
            if (swapFilterPosCode && swapFilterPosCode !== 'all') params.set('posCodeId', swapFilterPosCode);

            params.set('page', swapPage.toString());
            params.set('limit', '20');

            const res = await fetch(`/api/police-personnel/candidates?${params.toString()}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            setSwapPersonnelList(Array.isArray(data?.data) ? data.data : []);
            setSwapTotal(data?.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSwapPersonnel(false);
        }
    }, [debouncedSwapSearchTerm, swapFilterUnit, swapFilterPosCode, swapPage, selectedYear]);

    // Fetch on changes
    useEffect(() => {
        fetchSwapPersonnelList();
    }, [fetchSwapPersonnelList]);

    // Reset page when filter changes
    useEffect(() => {
        setSwapPage(0);
    }, [debouncedSwapSearchTerm, swapFilterUnit, swapFilterPosCode]);

    // Handle Create
    const handleCreate = () => {
        if (swapPerson1 && swapPerson2) {
            const defaultTitle = `สลับ: ${swapPerson1.fullName} ↔ ${swapPerson2.fullName}`;
            onCreate(swapPerson1, swapPerson2, swapLaneTitle || defaultTitle);
        }
    };

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 1 }}>
            {/* Selected Personnel Preview */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                {/* Person 1 */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        p: 1,
                        border: '2px solid',
                        borderColor: swapPerson1 ? '#22c55e' : '#e2e8f0',
                        borderRadius: 2,
                        bgcolor: swapPerson1 ? alpha('#22c55e', 0.05) : 'white',
                        transition: 'all 0.2s',
                        minWidth: 0
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                        👤 คนที่ 1
                    </Typography>
                    {swapPerson1 ? (
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }} noWrap>
                                {swapPerson1.rank} {swapPerson1.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem', mb: 0.5 }}>
                                {swapPerson1.position}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                <Chip
                                    label={swapPerson1.posCodeId ? `${swapPerson1.posCodeId} - ${swapPerson1.posCodeMaster?.name || ''}` : (swapPerson1.posCodeMaster?.name || '-')}
                                    size="small"
                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, bgcolor: alpha('#3b82f6', 0.1), color: 'primary.main', maxWidth: '100%' }}
                                />
                                <Chip
                                    label={swapPerson1.unit || '-'}
                                    size="small"
                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569' }}
                                />
                            </Box>

                            {/* Requested Position */}
                            {(swapPerson1.requestedPosition || swapPerson1.supporterName || swapPerson1.supportReason) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: 'primary.main' }}>
                                        📍 ร้องขอ: {swapPerson1.requestedPosition || swapPerson1.supporterName || 'มีการร้องขอตำแหน่ง'}
                                    </Typography>
                                </Box>
                            )}

                            <Box sx={{ mt: 0.5 }}>
                                <Button
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => {
                                        setSwapPerson1(null);
                                        setSwapFilterUnit('all');
                                        setSwapFilterPosCode('all');
                                        if (!swapPerson2) setSwapCreateMode('select1');
                                        else setSwapCreateMode('confirm');
                                    }}
                                    sx={{ minWidth: 0, py: 0.25, px: 1, fontSize: '0.65rem', height: 22 }}
                                >
                                    ลบ
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                            รอเลือก...
                        </Typography>
                    )}
                </Paper>

                {/* Swap Arrow */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0 }}>
                    <Typography sx={{ fontSize: '1.2rem' }}>↔️</Typography>
                </Box>

                {/* Person 2 */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1,
                        p: 1,
                        border: '2px solid',
                        borderColor: swapPerson2 ? '#22c55e' : '#e2e8f0',
                        borderRadius: 2,
                        bgcolor: swapPerson2 ? alpha('#22c55e', 0.05) : 'white',
                        transition: 'all 0.2s',
                        minWidth: 0
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                        👤 คนที่ 2
                    </Typography>
                    {swapPerson2 ? (
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }} noWrap>
                                {swapPerson2.rank} {swapPerson2.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem', mb: 0.5 }}>
                                {swapPerson2.position}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                <Chip
                                    label={swapPerson2.posCodeId ? `${swapPerson2.posCodeId} - ${swapPerson2.posCodeMaster?.name || ''}` : (swapPerson2.posCodeMaster?.name || '-')}
                                    size="small"
                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, bgcolor: alpha('#3b82f6', 0.1), color: 'primary.main', maxWidth: '100%' }}
                                />
                                <Chip
                                    label={swapPerson2.unit || '-'}
                                    size="small"
                                    sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569' }}
                                />
                            </Box>

                            {/* Requested Position */}
                            {(swapPerson2.requestedPosition || swapPerson2.supporterName || swapPerson2.supportReason) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: 'primary.main' }}>
                                        📍 ร้องขอ: {swapPerson2.requestedPosition || swapPerson2.supporterName || 'มีการร้องขอตำแหน่ง'}
                                    </Typography>
                                </Box>
                            )}

                            <Box sx={{ mt: 0.5 }}>
                                <Button
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => {
                                        setSwapPerson2(null);
                                        if (!swapPerson1) setSwapCreateMode('select1');
                                        else setSwapCreateMode('select2');
                                    }}
                                    sx={{ minWidth: 0, py: 0.25, px: 1, fontSize: '0.65rem', height: 22 }}
                                >
                                    ลบ
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                            รอเลือก...
                        </Typography>
                    )}
                </Paper>
            </Box>

            {/* Optional Lane Title */}
            {swapPerson1 && swapPerson2 && (
                <Box sx={{ mb: 1.5 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="ชื่อเลน (ไม่บังคับ)"
                        placeholder={`สลับ: ${swapPerson1.fullName} ↔ ${swapPerson2.fullName}`}
                        value={swapLaneTitle}
                        onChange={(e) => setSwapLaneTitle(e.target.value)}
                        InputProps={{
                            sx: { bgcolor: 'white', fontSize: '0.85rem' }
                        }}
                        InputLabelProps={{ sx: { fontSize: '0.85rem' } }}
                    />
                </Box>
            )}

            {/* Create Button */}
            {swapPerson1 && swapPerson2 && (
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleCreate}
                    sx={{
                        mb: 1.5,
                        py: 1,
                        fontWeight: 800,
                        borderRadius: 2.5,
                        bgcolor: '#f59e0b',
                        '&:hover': { bgcolor: '#d97706' },
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                        textTransform: 'none',
                        fontSize: '0.9rem'
                    }}
                >
                    ✅ สร้างเลนสลับตำแหน่ง
                </Button>
            )}

            <Divider sx={{ my: 0 }} />

            {/* Filter Toggle */}
            <Box
                onClick={() => setIsSwapFilterCollapsed(!isSwapFilterCollapsed)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    py: 1,
                    cursor: 'pointer',
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    '&:hover': { bgcolor: 'grey.100' }
                }}
            >
                <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    ค้นหา / ตัวกรอง
                </Typography>
                {isSwapFilterCollapsed ?
                    <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> :
                    <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                }
                {/* Show active filter count */}
                {(swapSearchTerm || swapFilterUnit !== 'all' || swapFilterPosCode !== 'all') && (
                    <Chip
                        label={[
                            swapSearchTerm ? 1 : 0,
                            swapFilterUnit !== 'all' ? 1 : 0,
                            swapFilterPosCode !== 'all' ? 1 : 0
                        ].reduce((a, b) => a + b, 0)}
                        size="small"
                        color="primary"
                        sx={{ height: 18, fontSize: '0.7rem', ml: 0.5, '& .MuiChip-label': { px: 0.75 } }}
                    />
                )}
            </Box>

            {/* Collapsible Filters */}
            <Collapse in={!isSwapFilterCollapsed}>
                <Box sx={{ px: 2, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {/* Search Box */}
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="ค้นหาบุคลากร..."
                        value={swapSearchTerm}
                        onChange={(e) => setSwapSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20 }} color="action" />
                                </InputAdornment>
                            ),
                            sx: { bgcolor: 'white' }
                        }}
                        sx={{ mb: 1.5 }}
                    />

                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="หน่วยงาน"
                            value={swapFilterUnit}
                            onChange={(e) => setSwapFilterUnit(e.target.value)}
                            sx={{ bgcolor: 'white' }}
                        >
                            <MenuItem value="all">ทั้งหมด</MenuItem>
                            {allUnits.map(unit => (
                                <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="ระดับ"
                            value={swapFilterPosCode}
                            onChange={(e) => setSwapFilterPosCode(e.target.value)}
                            sx={{ bgcolor: 'white' }}
                        >
                            <MenuItem value="all">ทั้งหมด</MenuItem>
                            {posCodeOptions.map(pc => (
                                <MenuItem key={pc.id} value={String(pc.id)}>{pc.id} - {pc.name}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    <Button
                        size="small"
                        color="inherit"
                        onClick={() => {
                            setSwapSearchTerm('');
                            setSwapFilterUnit('all');
                            setSwapFilterPosCode('all');
                        }}
                        sx={{ mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}
                    >
                        ล้างตัวกรอง
                    </Button>
                </Box>
            </Collapse>


            <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600, px: 2, pt: 1 }}>
                {swapPerson1 && swapPerson2
                    ? '✅ เลือกครบแล้ว กดสร้างเลนได้เลย'
                    : swapPerson1
                        ? '👆 เลือกคนที่ 2 เพื่อสลับตำแหน่ง'
                        : '👆 เลือกคนที่ 1 ก่อน'}
            </Typography>

            {/* Personnel List */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
                {loadingSwapPersonnel ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
                ) : swapPersonnelList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
                        <Typography variant="body2">ไม่พบบุคลากร</Typography>
                    </Box>
                ) : (
                    swapPersonnelList
                        .filter(p => {
                            // Exclude already selected personnel
                            const pid = String(p.id);
                            if (swapPerson1 && String(swapPerson1.id) === pid) return false;
                            if (swapPerson2 && String(swapPerson2.id) === pid) return false;
                            return true;
                        })
                        .map((person) => (
                            <Paper
                                key={person.id}
                                elevation={0}
                                sx={{
                                    mb: 1,
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 1.5,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        borderColor: '#f59e0b',
                                        bgcolor: alpha('#f59e0b', 0.05),
                                    },
                                    display: 'flex',
                                    alignItems: 'stretch',
                                    overflow: 'hidden'
                                }}
                                onClick={() => setViewSwapPerson(person)}
                            >
                                {/* Content */}
                                <Box sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
                                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                                        {person.rank} {person.fullName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                        {person.position}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                        <Chip
                                            label={person.posCodeId ? `${person.posCodeId} - ${person.posCodeMaster?.name || '-'}` : (person.posCodeMaster?.name || '-')}
                                            size="small"
                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha('#3b82f6', 0.1), color: 'primary.main' }}
                                        />
                                        <Chip
                                            label={person.unit || 'ไม่ระบุหน่วย'}
                                            size="small"
                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569' }}
                                        />
                                    </Box>
                                    {(person.requestedPosition || person.supporterName || person.supportReason) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                                                📍 ร้องขอ: {person.requestedPosition || person.supporterName || 'มีการร้องขอตำแหน่ง'}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* Action Button */}
                                <Box sx={{ display: 'flex', alignItems: 'center', px: 1, borderLeft: '1px solid #f1f5f9', bgcolor: '#f8fafc' }}>
                                    <Chip
                                        label={!swapPerson1 ? 'เลือก #1' : 'เลือก #2'}
                                        size="small"
                                        color={!swapPerson1 ? 'primary' : 'secondary'}
                                        variant="outlined"
                                        sx={{ height: 24, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!swapPerson1) {
                                                setSwapPerson1(person);
                                                setSwapCreateMode('select2');
                                                // Suggest filters: Same Unit & PosCode
                                                if (person.unit) setSwapFilterUnit(person.unit);
                                                if (person.posCodeId) setSwapFilterPosCode(String(person.posCodeId));
                                                setIsSwapFilterCollapsed(false);
                                            } else if (!swapPerson2) {
                                                setSwapPerson2(person);
                                                setSwapCreateMode('confirm');
                                            }
                                        }}
                                    />
                                </Box>
                            </Paper>
                        ))
                )}
            </Box>

            {/* Pagination */}
            {swapTotal > 20 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2, borderTop: '1px solid #e2e8f0' }}>
                    <Pagination
                        count={Math.ceil(swapTotal / 20)}
                        page={swapPage + 1}
                        onChange={(e, newPage) => setSwapPage(newPage - 1)}
                        size="small"
                        color="primary"
                    />
                </Box>
            )}

            {/* Personnel Detail Modal for Swap Drawer */}
            {viewSwapPerson && (
                <PersonnelDetailModal
                    open={Boolean(viewSwapPerson)}
                    onClose={() => setViewSwapPerson(null)}
                    personnel={viewSwapPerson}
                />
            )}
        </Box>
    );
}
