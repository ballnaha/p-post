'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    TextField,
    InputAdornment,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Chip,
    Alert,
    alpha,
    useTheme,
    Skeleton,
} from '@mui/material';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    SwapHoriz as SwapHorizIcon,
    Person as PersonIcon,
    TrendingUp as TrendingUpIcon,
    PersonOff as PersonOffIcon,
    AccessTime as AccessTimeIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import InOutTable, { InOutRecord } from '@/components/InOutTable';
import PersonnelDetailModal, { PersonnelData } from '@/components/PersonnelDetailModal';

interface ApiResponse {
    success: boolean;
    data?: {
        records: InOutRecord[];
        totalCount: number;
        page: number;
        pageSize: number;
        summary: {
            total: number;
            filled: number;
            vacant: number;
            reserved: number;
            swap: number;
            promotion: number;
            pending: number;
        };
        filters: {
            units: string[];
            positionCodes: { id: number; name: string }[];
        };
    };
    error?: string;
}

interface InOutViewProps {
    initialYear?: number;
}

export default function InOutView({ initialYear }: InOutViewProps = {}) {
    const theme = useTheme();

    // State
    const [data, setData] = useState<InOutRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterUnit, setFilterUnit] = useState<string>('all');
    const [filterPosCode, setFilterPosCode] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<number>(initialYear || 2568);

    // Sync selectedYear when initialYear prop changes
    useEffect(() => {
        if (initialYear) {
            setSelectedYear(initialYear);
        }
    }, [initialYear]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [summary, setSummary] = useState({
        total: 0,
        filled: 0,
        vacant: 0,
        reserved: 0,
        swap: 0,
        promotion: 0,
        pending: 0,
    });
    const [filterOptions, setFilterOptions] = useState<{
        units: string[];
        positionCodes: { id: number; name: string }[];
    }>({
        units: [],
        positionCodes: [],
    });

    // Personnel Detail Modal State
    const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelData | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailVariant, setDetailVariant] = useState<'default' | 'vacant'>('default');

    // Available years
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear() + 543;
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    // Debounced search text to prevent excessive API calls
    const [debouncedSearchText, setDebouncedSearchText] = useState('');
    const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Debounce search text
    useEffect(() => {
        if (searchDebounceTimer.current) {
            clearTimeout(searchDebounceTimer.current);
        }
        searchDebounceTimer.current = setTimeout(() => {
            setDebouncedSearchText(searchText);
        }, 300);

        return () => {
            if (searchDebounceTimer.current) {
                clearTimeout(searchDebounceTimer.current);
            }
        };
    }, [searchText]);

    // Track request ID to handle race conditions
    const requestIdRef = useRef(0);

    // Track previous filter values to detect filter changes
    const prevFiltersRef = useRef({
        selectedYear,
        filterUnit,
        filterPosCode,
        filterStatus,
        debouncedSearchText,
    });

    // Single useEffect to handle all data fetching
    useEffect(() => {
        const prevFilters = prevFiltersRef.current;
        const filtersChanged =
            prevFilters.selectedYear !== selectedYear ||
            prevFilters.filterUnit !== filterUnit ||
            prevFilters.filterPosCode !== filterPosCode ||
            prevFilters.filterStatus !== filterStatus ||
            prevFilters.debouncedSearchText !== debouncedSearchText;

        // Update ref with current values
        prevFiltersRef.current = {
            selectedYear,
            filterUnit,
            filterPosCode,
            filterStatus,
            debouncedSearchText,
        };

        // If filters changed, reset page and wait for next render
        if (filtersChanged && page !== 0) {
            setPage(0);
            return; // Don't fetch here - the page change will trigger another run
        }

        // Fetch data
        const doFetch = async () => {
            setLoading(true);
            setError(null);

            const thisRequestId = ++requestIdRef.current;

            try {
                const params = new URLSearchParams({
                    year: selectedYear.toString(),
                    unit: filterUnit,
                    posCodeId: filterPosCode,
                    status: filterStatus,
                    search: debouncedSearchText,
                    page: page.toString(),
                    pageSize: rowsPerPage.toString(),
                });

                const response = await fetch(`/api/in-out-v2?${params}`);
                const result: ApiResponse = await response.json();

                if (thisRequestId !== requestIdRef.current) {
                    return;
                }

                if (result.success && result.data) {
                    setData(result.data.records);
                    setTotalCount(result.data.totalCount);
                    setSummary(result.data.summary);
                    setFilterOptions(result.data.filters);
                } else {
                    setError(result.error || 'ไม่สามารถโหลดข้อมูลได้');
                    setData([]);
                }
            } catch (err) {
                if (thisRequestId !== requestIdRef.current) {
                    return;
                }
                console.error('Error fetching data:', err);
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                setData([]);
            } finally {
                if (thisRequestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        };

        doFetch();
    }, [selectedYear, filterUnit, filterPosCode, filterStatus, debouncedSearchText, page, rowsPerPage]);

    // Manual refresh function
    const handleRefresh = () => {
        requestIdRef.current++;
        const thisRequestId = requestIdRef.current;

        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
            year: selectedYear.toString(),
            unit: filterUnit,
            posCodeId: filterPosCode,
            status: filterStatus,
            search: debouncedSearchText,
            page: page.toString(),
            pageSize: rowsPerPage.toString(),
        });

        fetch(`/api/in-out-v2?${params}`)
            .then(response => response.json())
            .then((result: ApiResponse) => {
                if (thisRequestId !== requestIdRef.current) return;

                if (result.success && result.data) {
                    setData(result.data.records);
                    setTotalCount(result.data.totalCount);
                    setSummary(result.data.summary);
                    setFilterOptions(result.data.filters);
                } else {
                    setError(result.error || 'ไม่สามารถโหลดข้อมูลได้');
                    setData([]);
                }
            })
            .catch(err => {
                if (thisRequestId !== requestIdRef.current) return;
                console.error('Error fetching data:', err);
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                setData([]);
            })
            .finally(() => {
                if (thisRequestId === requestIdRef.current) {
                    setLoading(false);
                }
            });
    };

    // Handle page change
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    // Handle rows per page change
    const handleRowsPerPageChange = (newRowsPerPage: number) => {
        setRowsPerPage(newRowsPerPage);
        setPage(0);
    };

    // Handle row click
    const handleRowClick = async (record: InOutRecord) => {
        // If currentHolder exists, fetch and show details
        if (record.currentHolder && record.currentHolder.personnelId) {
            setDetailLoading(true);
            setDetailVariant('default');
            setDetailModalOpen(true);

            // Set initial data from record while loading full details
            // Include outgoingPerson data if available
            setSelectedPersonnel({
                id: record.currentHolder.personnelId,
                fullName: record.currentHolder.name,
                rank: record.currentHolder.rank,
                position: record.currentHolder.position,
                unit: record.currentHolder.unit,
                posCodeId: record.currentHolder.posCodeId,
                age: record.currentHolder.age,
                positionNumber: record.positionNumber,
                // New position data from outgoingPerson
                toPosition: record.outgoingPerson?.toPosition,
                toPositionNumber: record.outgoingPerson?.toPositionNumber,
                toUnit: record.outgoingPerson?.toUnit,
                toPosCode: record.outgoingPerson?.toPosCode,
                toPosCodeId: record.outgoingPerson?.toPosCodeId,
                // Swap partner info from incomingPerson
                swapPartnerName: record.incomingPerson?.name,
                swapPartnerRank: record.incomingPerson?.rank,
            });

            try {
                const response = await fetch(`/api/police-personnel/${record.currentHolder.personnelId}`);
                const result = await response.json();

                if (result.success && result.data) {
                    // Merge API data with outgoingPerson data
                    setSelectedPersonnel({
                        ...result.data,
                        toPosition: record.outgoingPerson?.toPosition,
                        toPositionNumber: record.outgoingPerson?.toPositionNumber,
                        toUnit: record.outgoingPerson?.toUnit,
                        toPosCode: record.outgoingPerson?.toPosCode,
                        toPosCodeId: record.outgoingPerson?.toPosCodeId,
                        // Swap partner info from incomingPerson
                        swapPartnerName: record.incomingPerson?.name,
                        swapPartnerRank: record.incomingPerson?.rank,
                    });
                }
            } catch (error) {
                console.error('Error fetching personnel details:', error);
            } finally {
                setDetailLoading(false);
            }
        } else if (record.vacantPosition) {
            // Handle vacant position click
            setDetailVariant('vacant');
            setDetailLoading(true);

            const vacantPerson: PersonnelData = {
                id: record.id,
                fullName: 'ตำแหน่งว่าง',
                rank: null,
                position: record.vacantPosition.position,
                unit: record.vacantPosition.unit,
                posCodeId: record.vacantPosition.posCodeId,
                posCodeMaster: {
                    id: record.vacantPosition.posCodeId || 0,
                    name: record.vacantPosition.posCode || ''
                },
                positionNumber: record.positionNumber,
                age: null,
            };
            setSelectedPersonnel(vacantPerson);
            setDetailModalOpen(true);

            try {
                const response = await fetch(`/api/police-personnel/${record.id}`);
                const result = await response.json();

                if (result.success && result.data) {
                    setSelectedPersonnel(result.data);
                }
            } catch (error) {
                console.error('Error fetching vacant details:', error);
            } finally {
                setDetailLoading(false);
            }
        }
    };

    const handleCloseDetailModal = () => {
        setDetailModalOpen(false);
        setTimeout(() => setSelectedPersonnel(null), 300);
    };

    return (
        <Box
            sx={{
                p: { xs: 2, md: 3 },
                maxWidth: '100%',
                overflow: 'auto',
                height: '100%',
                bgcolor: '#f8f9fa'
            }}
        >
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    borderRadius: 3,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                        }}
                    >
                        <SwapHorizIcon sx={{ color: '#fff', fontSize: 28 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 700,
                                color: theme.palette.text.primary,
                            }}
                        >
                            ตารางบุคลากร ประจำปี {selectedYear}
                        </Typography>

                    </Box>
                    <IconButton
                        onClick={handleRefresh}
                        disabled={loading}
                        sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                            },
                        }}
                    >
                        <RefreshIcon sx={{ color: theme.palette.primary.main }} />
                    </IconButton>
                </Box>

                {/* Summary chips */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {loading ? (
                        <>
                            <Skeleton variant="rounded" width={80} height={24} />
                            <Skeleton variant="rounded" width={100} height={24} />
                            <Skeleton variant="rounded" width={70} height={24} />
                            <Skeleton variant="rounded" width={90} height={24} />
                        </>
                    ) : (
                        <>
                            <Chip
                                label={`ทั้งหมด ${summary.total}`}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    fontWeight: 600,
                                }}
                            />
                            <Chip
                                icon={<PersonIcon sx={{ fontSize: 16 }} />}
                                label={`บรรจุแล้ว ${summary.filled}`}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                    color: theme.palette.success.dark,
                                    fontWeight: 500,
                                    '& .MuiChip-icon': { color: theme.palette.success.dark },
                                }}
                            />
                            <Chip
                                icon={<PersonOffIcon sx={{ fontSize: 16 }} />}
                                label={`ว่าง ${summary.vacant}`}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                    color: theme.palette.error.dark,
                                    fontWeight: 500,
                                    '& .MuiChip-icon': { color: theme.palette.error.dark },
                                }}
                            />
                            {summary.reserved > 0 && (
                                <Chip
                                    icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
                                    label={`กันตำแหน่ง ${summary.reserved}`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                                        color: theme.palette.warning.dark,
                                        fontWeight: 500,
                                        '& .MuiChip-icon': { color: theme.palette.warning.dark },
                                    }}
                                />
                            )}
                            <Chip
                                icon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
                                label={`สับเปลี่ยน ${summary.swap}`}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    fontWeight: 500,
                                    '& .MuiChip-icon': { color: theme.palette.primary.main },
                                }}
                            />
                            <Chip
                                icon={<TrendingUpIcon sx={{ fontSize: 16 }} />}
                                label={`เลื่อน ${summary.promotion}`}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                                    color: theme.palette.warning.dark,
                                    fontWeight: 500,
                                    '& .MuiChip-icon': { color: theme.palette.warning.dark },
                                }}
                            />
                            {summary.pending > 0 && (
                                <Chip
                                    icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
                                    label={`รอดำเนินการ ${summary.pending}`}
                                    size="small"
                                    sx={{
                                        bgcolor: alpha(theme.palette.grey[500], 0.1),
                                        color: theme.palette.grey[600],
                                        fontWeight: 500,
                                        '& .MuiChip-icon': { color: theme.palette.grey[600] },
                                    }}
                                />
                            )}
                        </>
                    )}
                </Box>
            </Paper>

            {/* Filters */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                    }}
                >
                    {/* Year Select */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>ปี พ.ศ.</InputLabel>
                        <Select
                            value={selectedYear}
                            label="ปี พ.ศ."
                            onChange={(e: SelectChangeEvent<number>) =>
                                setSelectedYear(e.target.value as number)
                            }
                        >
                            {availableYears.map((year) => (
                                <MenuItem key={year} value={year}>
                                    {year}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Unit Filter */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>หน่วย</InputLabel>
                        <Select
                            value={filterUnit}
                            label="หน่วย"
                            onChange={(e) => setFilterUnit(e.target.value)}
                        >
                            <MenuItem value="all">ทั้งหมด</MenuItem>
                            {filterOptions.units.map((unit) => (
                                <MenuItem key={unit} value={unit}>
                                    {unit}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Position Code Filter */}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>รหัสตำแหน่ง</InputLabel>
                        <Select
                            value={filterPosCode}
                            label="รหัสตำแหน่ง"
                            onChange={(e) => setFilterPosCode(e.target.value)}
                        >
                            <MenuItem value="all">ทั้งหมด</MenuItem>
                            {filterOptions.positionCodes.map((pos) => (
                                <MenuItem key={pos.id} value={pos.id.toString()}>
                                    {pos.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Status Filter */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>สถานะ</InputLabel>
                        <Select
                            value={filterStatus}
                            label="สถานะ"
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="all">ทั้งหมด</MenuItem>
                            <MenuItem value="filled">บรรจุแล้ว</MenuItem>
                            <MenuItem value="vacant">ว่าง</MenuItem>
                            <MenuItem value="reserved">ว่าง (กันตำแหน่ง)</MenuItem>
                            <MenuItem value="swap">สับเปลี่ยน</MenuItem>
                            <MenuItem value="promotion">เลื่อน</MenuItem>
                            <MenuItem value="pending">รอดำเนินการ</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Search */}
                    <TextField
                        size="small"
                        placeholder="ค้นหาชื่อ, ตำแหน่ง..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        sx={{ minWidth: 250, flexGrow: 1, maxWidth: 400 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                </InputAdornment>
                            ),
                            endAdornment: searchText && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchText('')}>
                                        <ClearIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
            </Paper>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Table with built-in pagination */}
            <InOutTable
                data={data}
                loading={loading}
                onRowClick={handleRowClick}
                // Pagination props
                totalCount={totalCount}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                showPagination={true}
                serverSidePagination={true}
            />

            {/* Personnel Detail Modal */}
            <PersonnelDetailModal
                open={detailModalOpen}
                onClose={handleCloseDetailModal}
                personnel={selectedPersonnel}
                loading={detailLoading}
                title={detailVariant === 'vacant' ? 'รายละเอียดตำแหน่งว่าง' : 'รายละเอียดบุคลากร'}
                variant={detailVariant}
                onSupporterUpdate={(requestedPosition, supporterName, supportReason) => {
                    // Refresh data after update if needed
                    // handleRefresh();
                }}
            />
        </Box>
    );
}
