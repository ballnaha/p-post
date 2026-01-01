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

interface CreateThreeWayLaneTabProps {
    selectedYear: number;
    allUnits: string[];
    posCodeOptions: Array<{ id: number; name: string }>;
    onCreate: (person1: Personnel, person2: Personnel, person3: Personnel, title: string) => void;
}

export default function CreateThreeWayLaneTab({
    selectedYear,
    allUnits,
    posCodeOptions,
    onCreate
}: CreateThreeWayLaneTabProps) {
    // State
    const [person1, setPerson1] = useState<Personnel | null>(null);
    const [person2, setPerson2] = useState<Personnel | null>(null);
    const [person3, setPerson3] = useState<Personnel | null>(null);
    const [laneTitle, setLaneTitle] = useState('');

    // List & Filters
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
    const [loadingPersonnel, setLoadingPersonnel] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterUnit, setFilterUnit] = useState('all');
    const [filterPosCode, setFilterPosCode] = useState('all');
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);

    // Modal
    const [viewPerson, setViewPerson] = useState<Personnel | null>(null);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch Personnel List
    const fetchPersonnelList = useCallback(async () => {
        setLoadingPersonnel(true);
        try {
            const params = new URLSearchParams();
            params.set('year', selectedYear.toString());
            if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
            if (filterUnit && filterUnit !== 'all') params.set('unit', filterUnit);
            if (filterPosCode && filterPosCode !== 'all') params.set('posCodeId', filterPosCode);

            params.set('page', page.toString());
            params.set('limit', '20');

            const res = await fetch(`/api/police-personnel/candidates?${params.toString()}`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();

            setPersonnelList(Array.isArray(data?.data) ? data.data : []);
            setTotal(data?.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPersonnel(false);
        }
    }, [debouncedSearchTerm, filterUnit, filterPosCode, page, selectedYear]);

    // Fetch on changes
    useEffect(() => {
        fetchPersonnelList();
    }, [fetchPersonnelList]);

    // Reset page when filter changes
    useEffect(() => {
        setPage(0);
    }, [debouncedSearchTerm, filterUnit, filterPosCode]);

    // Handle Create
    const handleCreate = () => {
        if (person1 && person2 && person3) {
            const defaultTitle = `สามเส้า: ${person1.fullName} → ${person2.fullName} → ${person3.fullName} → ${person1.fullName}`;
            onCreate(person1, person2, person3, laneTitle || defaultTitle);
        }
    };

    const isComplete = person1 && person2 && person3;

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 1 }}>
            {/* Selected Personnel Preview */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch' }}>
                    {/* Person 1 */}
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            p: 1,
                            border: '2px solid',
                            borderColor: person1 ? '#f43f5e' : '#e2e8f0',
                            borderRadius: 2,
                            bgcolor: person1 ? alpha('#f43f5e', 0.05) : 'white',
                            transition: 'all 0.2s',
                            minWidth: 0
                        }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                            👤 คนที่ 1
                        </Typography>
                        {person1 ? (
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }} noWrap>
                                    {person1.fullName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.65rem', mb: 0.5 }}>
                                    {person1.position}
                                </Typography>
                                {(person1.requestedPosition || person1.supporterName || person1.supportReason) && (
                                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: 'primary.main', display: 'block', mb: 0.5 }}>
                                        📍 ร้องขอ: {person1.requestedPosition || person1.supporterName || 'มีการร้องขอตำแหน่ง'}
                                    </Typography>
                                )}
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={() => setPerson1(null)}
                                    sx={{ minWidth: 0, py: 0, px: 1, fontSize: '0.6rem', height: 20 }}
                                >
                                    ลบ
                                </Button>
                            </Box>
                        ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.7rem' }}>
                                รอเลือก...
                            </Typography>
                        )}
                    </Paper>

                    <Box sx={{ display: 'flex', alignItems: 'center', px: 0.2 }}>
                        <Typography variant="caption">➜</Typography>
                    </Box>

                    {/* Person 2 */}
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            p: 1,
                            border: '2px solid',
                            borderColor: person2 ? '#f43f5e' : '#e2e8f0',
                            borderRadius: 2,
                            bgcolor: person2 ? alpha('#f43f5e', 0.05) : 'white',
                            transition: 'all 0.2s',
                            minWidth: 0
                        }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                            👤 คนที่ 2
                        </Typography>
                        {person2 ? (
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }} noWrap>
                                    {person2.fullName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.65rem', mb: 0.5 }}>
                                    {person2.position}
                                </Typography>
                                {(person2.requestedPosition || person2.supporterName || person2.supportReason) && (
                                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: 'primary.main', display: 'block', mb: 0.5 }}>
                                        📍 ร้องขอ: {person2.requestedPosition || person2.supporterName || 'มีการร้องขอตำแหน่ง'}
                                    </Typography>
                                )}
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={() => setPerson2(null)}
                                    sx={{ minWidth: 0, py: 0, px: 1, fontSize: '0.6rem', height: 20 }}
                                >
                                    ลบ
                                </Button>
                            </Box>
                        ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.7rem' }}>
                                รอเลือก...
                            </Typography>
                        )}
                    </Paper>

                    <Box sx={{ display: 'flex', alignItems: 'center', px: 0.2 }}>
                        <Typography variant="caption">➜</Typography>
                    </Box>

                    {/* Person 3 */}
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            p: 1,
                            border: '2px solid',
                            borderColor: person3 ? '#f43f5e' : '#e2e8f0',
                            borderRadius: 2,
                            bgcolor: person3 ? alpha('#f43f5e', 0.05) : 'white',
                            transition: 'all 0.2s',
                            minWidth: 0
                        }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', fontSize: '0.65rem' }}>
                            👤 คนที่ 3
                        </Typography>
                        {person3 ? (
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }} noWrap>
                                    {person3.fullName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.65rem', mb: 0.5 }}>
                                    {person3.position}
                                </Typography>
                                {(person3.requestedPosition || person3.supporterName || person3.supportReason) && (
                                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem', color: 'primary.main', display: 'block', mb: 0.5 }}>
                                        📍 ร้องขอ: {person3.requestedPosition || person3.supporterName || 'มีการร้องขอตำแหน่ง'}
                                    </Typography>
                                )}
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={() => setPerson3(null)}
                                    sx={{ minWidth: 0, py: 0, px: 1, fontSize: '0.6rem', height: 20 }}
                                >
                                    ลบ
                                </Button>
                            </Box>
                        ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.7rem' }}>
                                รอเลือก...
                            </Typography>
                        )}
                    </Paper>
                </Box>

                {person3 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: -0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.8rem' }}>
                            ↺ กลับไปที่คนที่ 1
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Optional Lane Title */}
            {isComplete && (
                <Box sx={{ mb: 1.5 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="ชื่อเลน (ไม่บังคับ)"
                        value={laneTitle}
                        onChange={(e) => setLaneTitle(e.target.value)}
                        InputProps={{
                            sx: { bgcolor: 'white', fontSize: '0.85rem' }
                        }}
                        InputLabelProps={{ sx: { fontSize: '0.85rem' } }}
                    />
                </Box>
            )}

            {/* Create Button */}
            {isComplete && (
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleCreate}
                    sx={{
                        mb: 1.5,
                        py: 1.25,
                        fontWeight: 800,
                        borderRadius: 2.5,
                        bgcolor: '#f43f5e',
                        '&:hover': { bgcolor: '#e11d48' },
                        boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)',
                        textTransform: 'none',
                        fontSize: '0.9rem'
                    }}
                >
                    ✅ สร้างเลนสลับสามเส้า
                </Button>
            )}

            <Divider sx={{ my: 0 }} />

            {/* Filter Toggle */}
            <Box
                onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
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
                {isFilterCollapsed ?
                    <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> :
                    <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                }
            </Box>

            {/* Collapsible Filters */}
            <Collapse in={!isFilterCollapsed}>
                <Box sx={{ px: 2, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="ค้นหาบุคลากร..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="หน่วยงาน"
                            value={filterUnit}
                            onChange={(e) => setFilterUnit(e.target.value)}
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
                            value={filterPosCode}
                            onChange={(e) => setFilterPosCode(e.target.value)}
                            sx={{ bgcolor: 'white' }}
                        >
                            <MenuItem value="all">ทั้งหมด</MenuItem>
                            {posCodeOptions.map(pc => (
                                <MenuItem key={pc.id} value={String(pc.id)}>{pc.id} - {pc.name}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>
            </Collapse>

            <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600, px: 2, pt: 1 }}>
                {!person1 ? '👆 เลือกคนที่ 1' : !person2 ? '👆 เลือกคนที่ 2' : !person3 ? '👆 เลือกคนที่ 3' : '✅ เลือกครบแล้ว'}
            </Typography>

            {/* Personnel List */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
                {loadingPersonnel ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
                ) : personnelList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
                        <Typography variant="body2">ไม่พบบุคลากร</Typography>
                    </Box>
                ) : (
                    personnelList
                        .filter(p => {
                            const pid = String(p.id);
                            if (person1 && String(person1.id) === pid) return false;
                            if (person2 && String(person2.id) === pid) return false;
                            if (person3 && String(person3.id) === pid) return false;
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
                                        borderColor: '#f43f5e',
                                        bgcolor: alpha('#f43f5e', 0.05),
                                    },
                                    display: 'flex',
                                    alignItems: 'stretch',
                                    overflow: 'hidden'
                                }}
                                onClick={() => setViewPerson(person)}
                            >
                                <Box sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
                                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                                        {person.rank} {person.fullName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem' }}>
                                        {person.position}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                        <Chip
                                            label={person.unit || 'ไม่ระบุหน่วย'}
                                            size="small"
                                            sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600 }}
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

                                <Box sx={{ display: 'flex', alignItems: 'center', px: 1, borderLeft: '1px solid #f1f5f9', bgcolor: '#f8fafc' }}>
                                    <Chip
                                        label={!person1 ? 'เลือก #1' : !person2 ? 'เลือก #2' : 'เลือก #3'}
                                        size="small"
                                        color={!person1 ? 'primary' : !person2 ? 'secondary' : 'error'}
                                        variant="outlined"
                                        sx={{ height: 24, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!person1) {
                                                setPerson1(person);
                                                // Suggest same rank/posCode
                                                if (person.unit) setFilterUnit(person.unit);
                                                if (person.posCodeId) setFilterPosCode(String(person.posCodeId));
                                                setIsFilterCollapsed(false);
                                            } else if (!person2) {
                                                setPerson2(person);
                                            } else if (!person3) {
                                                setPerson3(person);
                                            }
                                        }}
                                    />
                                </Box>
                            </Paper>
                        ))
                )}
            </Box>

            {/* Pagination */}
            {total > 20 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2, borderTop: '1px solid #e2e8f0' }}>
                    <Pagination
                        count={Math.ceil(total / 20)}
                        page={page + 1}
                        onChange={(e, newPage) => setPage(newPage - 1)}
                        size="small"
                        color="primary"
                    />
                </Box>
            )}

            {viewPerson && (
                <PersonnelDetailModal
                    open={Boolean(viewPerson)}
                    onClose={() => setViewPerson(null)}
                    personnel={viewPerson}
                />
            )}
        </Box>
    );
}
