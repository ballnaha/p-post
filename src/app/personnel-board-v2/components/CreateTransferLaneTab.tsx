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
    MenuItem,
    Autocomplete
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterListIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    ArrowForward as ArrowForwardIcon,
    Business as BusinessIcon
} from '@mui/icons-material';
import { Personnel } from '../types';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';

interface CreateTransferLaneTabProps {
    selectedYear: number;
    allUnits: string[];
    posCodeOptions: Array<{ id: number; name: string }>;
    onCreate: (person: Personnel, toUnit: string, laneTitle: string) => void;
}

export default function CreateTransferLaneTab({
    selectedYear,
    allUnits,
    posCodeOptions,
    onCreate
}: CreateTransferLaneTabProps) {
    // State
    const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
    const [targetUnit, setTargetUnit] = useState<string>('');
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
        if (selectedPerson && targetUnit) {
            const defaultTitle = `ย้ายหน่วย: ${selectedPerson.fullName} → ${targetUnit}`;
            onCreate(selectedPerson, targetUnit, laneTitle || defaultTitle);
        }
    };

    const isComplete = selectedPerson && targetUnit;

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 1 }}>
            {/* Selection Steps */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1.5 }}>
                {/* Step 1: Selected Person */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 1.5,
                        border: '2px solid',
                        borderColor: selectedPerson ? 'primary.main' : '#e2e8f0',
                        borderRadius: 2,
                        bgcolor: selectedPerson ? alpha('#3b82f6', 0.05) : 'white',
                        transition: 'all 0.2s',
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontSize: '0.75rem' }}>
                        👤 1. เลือกบุคลากรที่จะย้าย
                    </Typography>
                    {selectedPerson ? (
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }} noWrap>
                                    {selectedPerson.rank} {selectedPerson.fullName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontWeight: 500 }}>
                                    {selectedPerson.position}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                    <Chip
                                        label={selectedPerson.unit}
                                        size="small"
                                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                    />
                                </Box>
                            </Box>
                            <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => setSelectedPerson(null)}
                                sx={{ minWidth: 0, px: 1, py: 0.5, fontWeight: 700, fontSize: '0.7rem' }}
                            >
                                เปลี่ยน
                            </Button>
                        </Box>
                    ) : (
                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', py: 0.5 }}>
                            กรุณาเลือกบุคลากรจากรายการด้านล่าง...
                        </Typography>
                    )}
                </Paper>

                {/* Step 2: Target Unit */}
                {selectedPerson && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            border: '2px solid',
                            borderColor: targetUnit ? '#10b981' : '#e2e8f0',
                            borderRadius: 2,
                            bgcolor: targetUnit ? alpha('#10b981', 0.05) : 'white',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, fontSize: '0.75rem' }}>
                            🏢 2. เลือกหน่วยงานปลายทาง
                        </Typography>

                        <Autocomplete
                            options={allUnits}
                            value={targetUnit}
                            onChange={(_, newValue) => setTargetUnit(newValue || '')}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="ค้นหาหรือเลือกหน่วยงาน..."
                                    size="small"
                                    fullWidth
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <BusinessIcon sx={{ color: 'action.active', fontSize: 18 }} />
                                            </InputAdornment>
                                        ),
                                        sx: { bgcolor: 'white', borderRadius: 1.5, fontSize: '0.85rem' }
                                    }}
                                />
                            )}
                            sx={{ mb: 1 }}
                        />

                        {targetUnit && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#059669', mt: 0.5 }}>
                                <ArrowForwardIcon sx={{ fontSize: 14 }} />
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    ย้ายไปที่: {targetUnit}
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                )}

                {/* Step 3: Lane Title & Create */}
                {isComplete && (
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="ชื่อรายการ (ไม่บังคับ)"
                            placeholder={`ย้ายหน่วย: ${selectedPerson?.fullName} → ${targetUnit}`}
                            value={laneTitle}
                            onChange={(e) => setLaneTitle(e.target.value)}
                            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 1.5 } }}
                            InputProps={{ sx: { fontSize: '0.85rem' } }}
                            InputLabelProps={{ sx: { fontSize: '0.85rem' } }}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleCreate}
                            sx={{
                                py: 1.25,
                                fontWeight: 800,
                                borderRadius: 2.5,
                                bgcolor: '#3b82f6',
                                '&:hover': { bgcolor: '#2563eb' },
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                                textTransform: 'none',
                            }}
                        >
                            ✅ สร้างรายการย้ายหน่วย
                        </Button>
                    </Box>
                )}
            </Box>

            <Divider sx={{ my: 1 }} />

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
                    borderTop: '1px solid #e2e8f0',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'grey.100' }
                }}
            >
                <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem' }}>
                    ค้นหาบุคลากร
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
                        placeholder="ค้นหา ชื่อ-นามสกุล..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20 }} color="action" />
                                </InputAdornment>
                            ),
                            sx: { bgcolor: 'white', borderRadius: 1.5 }
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
                            sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
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
                            sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                        >
                            <MenuItem value="all">ทั้งหมด</MenuItem>
                            {posCodeOptions.map(pc => (
                                <MenuItem key={pc.id} value={String(pc.id)}>{pc.id} - {pc.name}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>
            </Collapse>

            {/* Personnel List */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1.5 }}>
                {loadingPersonnel ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
                ) : personnelList.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
                        <Typography variant="body2">ไม่พบบุคลากร</Typography>
                    </Box>
                ) : (
                    personnelList
                        .filter(p => selectedPerson?.id !== p.id)
                        .map((person) => (
                            <Paper
                                key={person.id}
                                elevation={0}
                                sx={{
                                    mb: 1,
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 1.5,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: alpha('#3b82f6', 0.05),
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                    },
                                    display: 'flex',
                                    alignItems: 'center',
                                    overflow: 'hidden'
                                }}
                                onClick={() => setViewPerson(person)}
                            >
                                <Box sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
                                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                                        {person.rank} {person.fullName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 500, my: 0.25 }}>
                                        {person.position}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        <Chip
                                            label={person.unit || 'ไม่ระบุหน่วย'}
                                            size="small"
                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                        />
                                        {(person.requestedPosition || person.supporterName || person.supportReason) && (
                                            <Chip
                                                label="📍 มีการร้องขอ"
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                            />
                                        )}
                                    </Box>
                                </Box>

                                <Box sx={{ px: 1.5, borderLeft: '1px solid #f1f5f9', height: '100%', display: 'flex', alignItems: 'center', bgcolor: '#f8fafc' }}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="primary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPerson(person);
                                            // Optional: Suggest units based on requested position?
                                        }}
                                        sx={{ minWidth: 0, px: 2, height: 28, borderRadius: 1.5, fontWeight: 700, fontSize: '0.7rem' }}
                                    >
                                        เลือก
                                    </Button>
                                </Box>
                            </Paper>
                        ))
                )}
            </Box>

            {/* Pagination */}
            {total > 20 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 1, borderTop: '1px solid #e2e8f0' }}>
                    <Pagination
                        count={Math.ceil(total / 20)}
                        page={page + 1}
                        onChange={(_, newPage) => setPage(newPage - 1)}
                        size="small"
                        color="primary"
                    />
                </Box>
            )}

            {/* Detail Modal */}
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
