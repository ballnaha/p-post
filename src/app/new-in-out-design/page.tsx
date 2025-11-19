'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    CircularProgress,
    TextField,
    InputAdornment,
    IconButton,
    Button,
    Chip,
    Tooltip,
    alpha,
    useTheme,
    useMediaQuery,
    Card,
    CardContent,
    Skeleton,
    Avatar,
    Divider,
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Clear as ClearIcon,
    Refresh as RefreshIcon,
    Person as PersonIcon,
    InfoOutlined as InfoIcon,
    SwapHoriz as SwapHorizIcon,
    TrendingUp as TrendingUpIcon,
    ChangeHistory,
    LocationOn,
    ArrowForward as ArrowForwardIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    AccessTime as AccessTimeIcon,
    School as SchoolIcon,
    Work as WorkIcon,
    Place as PlaceIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { EmptyState } from '@/app/components/EmptyState';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import InOutDetailModal from '@/components/InOutDetailModal';
import DataTablePagination from '@/components/DataTablePagination';

// Interfaces reuse from original page
interface SwapDetail {
    id: string;
    personnelId: string;
    noId?: string;
    fullName: string;
    rank: string | null;
    nationalId: string | null;
    age: string | null;
    seniority: string | null;

    // Personal Info
    birthDate: string | null;
    education: string | null;
    lastAppointment: string | null;
    currentRankSince: string | null;
    enrollmentDate: string | null;
    retirementDate: string | null;
    yearsOfService: string | null;
    trainingLocation: string | null;
    trainingCourse: string | null;

    // From
    posCodeId: number | null;
    posCodeMaster: {
        id: number;
        name: string;
    } | null;
    fromPosition: string | null;
    fromPositionNumber: string | null;
    fromUnit: string | null;
    fromActingAs: string | null;

    // To
    toPosCodeId: number | null;
    toPosCodeMaster: {
        id: number;
        name: string;
    } | null;
    toPosition: string | null;
    toPositionNumber: string | null;
    toUnit: string | null;
    toActingAs: string | null;

    // Transaction
    transaction: {
        id: string;
        year: number;
        swapDate: string;
        swapType: string;
        groupNumber: string | null;
    } | null;

    sequence?: number | null;
    replacedPerson?: SwapDetail | null;
}

interface PositionCode {
    id: number;
    name: string;
}

interface InOutData {
    swapDetails: SwapDetail[];
    totalCount: number;
    page: number;
    pageSize: number;
    summary?: {
        totalPersonnel: number;
        promoted: number;
        twoWaySwap: number;
        threeWaySwap: number;
        transfer: number;
        totalVacant: number;
        vacantFilled: number;
        notAssigned: number;
    };
    filters: {
        units: string[];
        positionCodes: PositionCode[];
    };
}

export default function InOutDesignPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // States
    const [data, setData] = useState<InOutData | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [hasSearched, setHasSearched] = useState(false);

    // Filters
    const [selectedUnit, setSelectedUnit] = useState<string>('all');
    const [selectedPosCode, setSelectedPosCode] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedSwapType, setSelectedSwapType] = useState<string>('all');
    const [searchText, setSearchText] = useState<string>('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    // Modals
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<SwapDetail | null>(null);
    const [personnelDetailModalOpen, setPersonnelDetailModalOpen] = useState(false);
    const [selectedPersonnelForDetail, setSelectedPersonnelForDetail] = useState<SwapDetail | null>(null);

    // Filter Options
    const [filterOptions, setFilterOptions] = useState<{
        units: string[];
        positionCodes: { id: number; name: string }[];
    }>({
        units: [],
        positionCodes: []
    });

    // Cache
    const dataCacheRef = useRef<{
        data: InOutData | null;
        timestamp: number;
        filters: string;
    }>({
        data: null,
        timestamp: 0,
        filters: ''
    });

    // Highlight Logic
    const highlightText = (text: string | null | undefined, searchTerms: string[]) => {
        if (!text || searchTerms.length === 0) return text || '';

        let matchedTerm = '';
        let matchIndex = -1;

        for (const term of searchTerms) {
            if (!term.trim()) continue;
            const termLower = term.toLowerCase();
            const textLower = text.toLowerCase();
            const index = textLower.indexOf(termLower);

            if (index !== -1) {
                matchedTerm = term;
                matchIndex = index;
                break;
            }
        }

        if (matchIndex === -1) return text;

        const before = text.substring(0, matchIndex);
        const match = text.substring(matchIndex, matchIndex + matchedTerm.length);
        const after = text.substring(matchIndex + matchedTerm.length);

        return (
            <>
                {before}
                <Box
                    component="span"
                    sx={{
                        bgcolor: alpha(theme.palette.warning.light, 0.3),
                        color: theme.palette.warning.dark,
                        fontWeight: 700,
                        px: 0.5,
                        borderRadius: 0.5,
                    }}
                >
                    {match}
                </Box>
                {after}
            </>
        );
    };

    const highlightTerms = useMemo(() => {
        return searchText.trim() ? [searchText.trim()] : [];
    }, [searchText]);

    // Available Years
    const availableYears = useMemo(() => {
        const currentBuddhistYear = new Date().getFullYear() + 543;
        const startYear = 2568;
        const years: number[] = [];
        for (let year = currentBuddhistYear; year >= startYear; year--) {
            years.push(year);
        }
        return years;
    }, []);

    // Fetch Filters
    const fetchFilters = async () => {
        try {
            setLoadingFilters(true);
            const response = await fetch('/api/new-in-out?filtersOnly=true');
            if (!response.ok) return;

            const result = await response.json();
            if (result.success && result.data.filters) {
                const sortedUnits = [...(result.data.filters.units || [])].sort((a, b) => a.localeCompare(b, 'th'));
                const sortedPositionCodes = [...(result.data.filters.positionCodes || [])].sort((a, b) => a.id - b.id);

                setFilterOptions({
                    units: sortedUnits,
                    positionCodes: sortedPositionCodes
                });
            }
        } catch (error) {
            console.error('Failed to fetch filters:', error);
        } finally {
            setLoadingFilters(false);
        }
    };

    // Fetch Data
    const fetchData = async (abortSignal?: AbortSignal, forceReload: boolean = false) => {
        try {
            setLoading(true);

            const cacheKey = `${selectedUnit}-${selectedPosCode}-${selectedStatus}-${selectedSwapType}-${selectedYear}-${page}-${rowsPerPage}-${searchText}`;
            const now = Date.now();
            const cacheAge = now - dataCacheRef.current.timestamp;

            if (!forceReload && dataCacheRef.current.filters === cacheKey && cacheAge < 30000) {
                setData(dataCacheRef.current.data);
                setInitialLoad(false);
                setLoading(false);
                return;
            }

            setData(null);

            const params = new URLSearchParams({
                unit: selectedUnit,
                posCodeId: selectedPosCode,
                status: selectedStatus,
                swapType: selectedSwapType,
                year: selectedYear.toString(),
                page: page.toString(),
                pageSize: rowsPerPage.toString(),
            });

            if (searchText.trim()) {
                params.append('search', searchText.trim());
            }

            const response = await fetch(`/api/new-in-out?${params}`, abortSignal ? { signal: abortSignal } : {});

            if (abortSignal?.aborted) return;

            if (!response.ok) throw new Error('Failed to fetch');

            const result = await response.json();

            if (result.success) {
                setData(result.data);
                setInitialLoad(false);
                dataCacheRef.current = {
                    data: result.data,
                    timestamp: Date.now(),
                    filters: cacheKey
                };
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Failed to fetch data:', error);
                setData({ swapDetails: [], totalCount: 0, page: 0, pageSize: rowsPerPage, filters: { units: [], positionCodes: [] } });
            }
        } finally {
            if (!abortSignal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        if (initialLoad) return;
        const abortController = new AbortController();
        const timer = setTimeout(() => {
            setHasSearched(true);
            fetchData(abortController.signal);
        }, 300);

        return () => {
            clearTimeout(timer);
            abortController.abort();
        };
    }, [selectedUnit, selectedPosCode, selectedStatus, selectedSwapType, selectedYear, page, rowsPerPage, searchText]);

    // Handlers
    const handleLoadData = () => {
        setHasSearched(true);
        setInitialLoad(false);
        dataCacheRef.current = { data: null, timestamp: 0, filters: '' };
        fetchData(undefined, true);
    };

    const handleResetFilters = () => {
        setSearchText('');
        setSelectedUnit('all');
        setSelectedPosCode('all');
        setSelectedStatus('all');
        setSelectedSwapType('all');
        setPage(0);
        handleLoadData();
    };

    const handleViewPersonnelDetail = (personnel: SwapDetail) => {
        setSelectedPersonnelForDetail(personnel);
        setPersonnelDetailModalOpen(true);
    };

    // Render Helpers
    const getSwapTypeConfig = (type: string | undefined) => {
        switch (type) {
            case 'two-way': return { label: 'สลับตำแหน่ง', color: 'info', icon: <SwapHorizIcon /> };
            case 'three-way': return { label: 'สลับสามเส้า', color: 'secondary', icon: <ChangeHistory /> };
            case 'transfer': return { label: 'ย้ายหน่วย', color: 'warning', icon: <LocationOn /> };
            case 'promotion': return { label: 'เลื่อนตำแหน่ง', color: 'success', icon: <TrendingUpIcon /> };
            case 'promotion-chain': return { label: 'จัดคนเข้าตำแหน่ง', color: 'success', icon: <TrendingUpIcon /> };
            default: return { label: 'ทั่วไป', color: 'default', icon: <PersonIcon /> };
        }
    };

    return (
        <Layout>
            <Container maxWidth="xl" sx={{ pb: 8 }}>
                {/* Header */}
                <Box sx={{ mb: 4, mt: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                        การเคลื่อนไหวบุคลากร
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        ตรวจสอบข้อมูลการสลับตำแหน่ง โยกย้าย และเลื่อนตำแหน่งประจำปี {selectedYear}
                    </Typography>
                </Box>

                {/* Filters Area */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        mb: 4,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
                        <Box sx={{ flex: 1, width: '100%' }}>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                gap: 2
                            }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>หน่วยงาน</InputLabel>
                                    <Select value={selectedUnit} label="หน่วยงาน" onChange={(e) => setSelectedUnit(e.target.value)}>
                                        <MenuItem value="all">ทั้งหมด</MenuItem>
                                        {filterOptions.units.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small">
                                    <InputLabel>ตำแหน่ง</InputLabel>
                                    <Select value={selectedPosCode} label="ตำแหน่ง" onChange={(e) => setSelectedPosCode(e.target.value)}>
                                        <MenuItem value="all">ทั้งหมด</MenuItem>
                                        {filterOptions.positionCodes.map((p) => <MenuItem key={p.id} value={p.id.toString()}>{p.id} - {p.name}</MenuItem>)}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small">
                                    <InputLabel>ประเภท</InputLabel>
                                    <Select value={selectedSwapType} label="ประเภท" onChange={(e) => setSelectedSwapType(e.target.value)}>
                                        <MenuItem value="all">ทั้งหมด</MenuItem>
                                        <MenuItem value="two-way">สลับตำแหน่ง (2 คน)</MenuItem>
                                        <MenuItem value="three-way">สลับสามเส้า (3 คน)</MenuItem>
                                        <MenuItem value="transfer">ย้ายหน่วย</MenuItem>
                                        <MenuItem value="promotion-chain">จัดคนเข้าตำแหน่ง</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="ค้นหาชื่อ, ตำแหน่ง..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                                        endAdornment: searchText && (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setSearchText('')}><ClearIcon /></IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Box>
                        </Box>
                        <Box sx={{ width: { xs: '100%', md: 'auto' }, minWidth: { md: 150 } }}>
                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleLoadData}
                                startIcon={<RefreshIcon />}
                                sx={{ height: 40, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                ค้นหาข้อมูล
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {/* Summary Stats */}
                {hasSearched && data?.summary && (
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
                        gap: 2,
                        mb: 4
                    }}>
                        {[
                            { label: 'เลื่อนตำแหน่ง', value: data.summary.promoted, color: '#00BFA5', icon: <TrendingUpIcon /> },
                            { label: 'สลับตำแหน่ง', value: data.summary.twoWaySwap, color: '#0288D1', icon: <SwapHorizIcon /> },
                            { label: 'สามเส้า', value: data.summary.threeWaySwap, color: '#8E24AA', icon: <ChangeHistory /> },
                            { label: 'ย้ายหน่วย', value: data.summary.transfer, color: '#00ACC1', icon: <LocationOn /> },
                            { label: 'ตำแหน่งว่าง', value: `${data.summary.vacantFilled}/${data.summary.totalVacant}`, color: '#5B3FD6', icon: <PersonIcon /> },
                        ].map((stat, idx) => (
                            <Paper
                                key={idx}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${stat.color} 0%, ${alpha(stat.color, 0.8)} 100%)`,
                                    color: 'white',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    height: '100%',
                                    minHeight: 100
                                }}
                            >
                                <Box sx={{ position: 'absolute', right: -10, top: -10, opacity: 0.2 }}>
                                    {/* Icon background effect */}
                                    {React.cloneElement(stat.icon as React.ReactElement<any>, { sx: { fontSize: 80 } })}
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, opacity: 0.9 }}>{stat.label}</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>{stat.value}</Typography>
                            </Paper>
                        ))}
                    </Box>
                )}

                {/* Content Area */}
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                        ))}
                    </Box>
                ) : !data?.swapDetails.length && hasSearched ? (
                    <EmptyState
                        icon={PersonIcon}
                        title="ไม่พบข้อมูล"
                        description="ลองปรับตัวกรองหรือคำค้นหาใหม่"
                    />
                ) : (
                    <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <TableContainer>
                            <Table size="small" aria-label="personnel movement table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>ลำดับ</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>ยศ ชื่อ-สกุล</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>ตำแหน่งเดิม</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>ตำแหน่งใหม่</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>สถานะ/คนแทน</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }} align="center">ประเภท</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data?.swapDetails.map((item, index) => {
                                        const typeConfig = getSwapTypeConfig(item.transaction?.swapType);
                                        const isVacant = !item.fullName || ['ว่าง', 'ว่าง (กันตำแหน่ง)'].includes(item.fullName.trim());
                                        const replaced = item.replacedPerson;
                                        const isTwoWay = item.transaction?.swapType === 'two-way';
                                        const isThreeWay = item.transaction?.swapType === 'three-way';
                                        const isOldPositionFilled = isTwoWay || isThreeWay;

                                        return (
                                            <TableRow
                                                key={item.id}
                                                hover
                                                sx={{
                                                    '&:last-child td, &:last-child th': { border: 0 },
                                                    bgcolor: isVacant ? alpha(theme.palette.error.light, 0.05) : 'inherit'
                                                }}
                                            >
                                                <TableCell>{index + 1 + (page * rowsPerPage)}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar
                                                            sx={{
                                                                width: 32,
                                                                height: 32,
                                                                bgcolor: isVacant ? 'error.light' : 'primary.light',
                                                                color: isVacant ? 'white' : 'primary.main',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            {isVacant ? <InfoIcon fontSize="small" /> : item.rank?.charAt(0)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: isVacant ? 'error.main' : 'text.primary' }}>
                                                                {isVacant ? 'ตำแหน่งว่าง' : highlightText(`${item.rank} ${item.fullName}`, highlightTerms)}
                                                            </Typography>
                                                            {!isVacant && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {item.age ? `อายุ ${item.age}` : ''} {item.seniority ? `อาวุโส ${item.seniority}` : ''}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {highlightText(item.fromPosition, highlightTerms)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" display="block">
                                                            {highlightText(item.fromUnit, highlightTerms)} #{item.fromPositionNumber}
                                                        </Typography>
                                                        {!isVacant && item.transaction && !isOldPositionFilled && (
                                                            <Chip
                                                                label="จะว่างลง"
                                                                size="small"
                                                                color="warning"
                                                                variant="outlined"
                                                                sx={{ height: 20, fontSize: '0.7rem', mt: 0.5 }}
                                                            />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        {isVacant ? (
                                                            <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
                                                                ยังไม่มีผู้ดำรงตำแหน่ง
                                                            </Typography>
                                                        ) : item.transaction ? (
                                                            <>
                                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.dark' }}>
                                                                    {highlightText(item.toPosition || item.fromPosition, highlightTerms)}
                                                                </Typography>
                                                                <Typography variant="caption" color="success.main" display="block">
                                                                    {highlightText(item.toUnit || item.fromUnit, highlightTerms)} #{item.toPositionNumber || item.fromPositionNumber}
                                                                </Typography>
                                                            </>
                                                        ) : (
                                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                                -
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    {replaced ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box>
                                                                <Typography variant="caption" color="error.main" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <SwapHorizIcon fontSize="inherit" /> แทนที่
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                                                    {replaced.rank} {replaced.fullName}
                                                                </Typography>
                                                            </Box>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleViewPersonnelDetail(replaced)}
                                                                sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                                                            >
                                                                <InfoIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">-</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {item.transaction && (
                                                        <Tooltip title={typeConfig.label}>
                                                            <Chip
                                                                label={typeConfig.label}
                                                                size="small"
                                                                color={typeConfig.color as any}
                                                                variant="outlined"
                                                                sx={{ height: 24, fontSize: '0.75rem' }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Pagination */}
                        {data && (
                            <DataTablePagination
                                count={data.totalCount}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                onPageChange={setPage}
                                onRowsPerPageChange={setRowsPerPage}
                                rowsPerPageOptions={[10, 20, 50, 100]}
                            />
                        )}
                    </Paper>
                )}
            </Container>

            {/* Modals */}
            <PersonnelDetailModal
                open={personnelDetailModalOpen}
                onClose={() => setPersonnelDetailModalOpen(false)}
                personnel={selectedPersonnelForDetail}
            />
        </Layout>
    );
}
