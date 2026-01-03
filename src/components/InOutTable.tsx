'use client';

import { useMemo, useState, memo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    Tooltip,
    Skeleton,
    alpha,
    useTheme,
} from '@mui/material';
import {
    ArrowForward as ArrowForwardIcon,
    SwapHoriz as SwapHorizIcon,
    TrendingUp as TrendingUpIcon,
    PersonOff as PersonOffIcon,
    CheckCircle as CheckCircleIcon,
    AccessTime as AccessTimeIcon,
    Login as LoginIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';

// Interface สำหรับข้อมูลการ In-Out
export interface InOutRecord {
    id: string;
    incomingPerson: {
        personnelId: string;
        name: string;
        rank: string | null;
        fromPosition: string | null;
        fromUnit: string | null;
        posCode: string | null;
        posCodeId: number | null;
    } | null;
    currentHolder: {
        personnelId: string;
        name: string;
        rank: string | null;
        position: string | null;
        unit: string | null;
        posCode: string | null;
        posCodeId: number | null;
        age: string | null;
    } | null;
    // Position info for vacant/reserved positions
    vacantPosition?: {
        position: string | null;
        posCode: string | null;
        posCodeId: number | null;
        unit: string | null;
    } | null;
    positionNumber: string | null;
    division: string | null;
    group: string | null;
    outgoingPerson: {
        toPosition: string | null;
        toPositionNumber: string | null;
        toUnit: string | null;
        toPosCode: string | null;
        toPosCodeId: number | null;
        requestedPosition: string | null;
        supporter: string | null;
    } | null;
    status: 'filled' | 'vacant' | 'reserved' | 'swap' | 'three-way' | 'promotion' | 'pending';
    remark: string | null;
    swapType: string | null;
}

interface InOutTableProps {
    data: InOutRecord[];
    loading?: boolean;
    onRowClick?: (record: InOutRecord) => void;
    totalCount?: number;
    page?: number;
    rowsPerPage?: number;
    onPageChange?: (page: number) => void;
    onRowsPerPageChange?: (rowsPerPage: number) => void;
    showPagination?: boolean;
    serverSidePagination?: boolean;
}

// Memoized Row Component
const InOutRow = memo(({
    record,
    index,
    theme,
    onRowClick
}: {
    record: InOutRecord;
    index: number;
    theme: any;
    onRowClick?: (record: InOutRecord) => void;
}) => {
    const isVacantOrReserved = record.status === 'vacant' || record.status === 'reserved';
    const rowBg = index % 2 === 0 ? '#fff' : alpha(theme.palette.grey[50], 0.8);

    // Get status config (pre-calculate or use memoized version)
    const statusConfig = useMemo(() => {
        const configs: Record<string, any> = {
            vacant: {
                bg: alpha(theme.palette.error.main, 0.12),
                color: theme.palette.error.main,
                label: 'ว่าง',
                icon: <PersonOffIcon sx={{ fontSize: 14 }} />,
            },
            reserved: {
                bg: alpha(theme.palette.warning.main, 0.12),
                color: theme.palette.warning.dark,
                label: 'ว่าง (กันตำแหน่ง)',
                icon: <AccessTimeIcon sx={{ fontSize: 14 }} />,
            },
            swap: {
                bg: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                label: 'สับเปลี่ยน',
                icon: <SwapHorizIcon sx={{ fontSize: 14 }} />,
            },
            'three-way': {
                bg: alpha(theme.palette.secondary.main, 0.12),
                color: theme.palette.secondary.dark,
                label: 'สามเส้า',
                icon: <SwapHorizIcon sx={{ fontSize: 14 }} />,
            },
            promotion: {
                bg: alpha(theme.palette.warning.main, 0.12),
                color: theme.palette.warning.dark,
                label: 'เลื่อน',
                icon: <TrendingUpIcon sx={{ fontSize: 14 }} />,
            },
            pending: {
                bg: alpha(theme.palette.grey[500], 0.12),
                color: theme.palette.grey[700],
                label: 'รอดำเนินการ',
                icon: <AccessTimeIcon sx={{ fontSize: 14 }} />,
            }
        };
        return configs[record.status] || configs.pending;
    }, [record.status, theme]);

    return (
        <TableRow
            onClick={() => onRowClick?.(record)}
            sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                bgcolor: rowBg,
                transition: 'background-color 0.1s ease',
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
            }}
        >
            {/* คนเข้า - ชื่อ */}
            <TableCell sx={{ py: 1.25, px: 1.5, borderRight: `1px solid ${theme.palette.divider}` }}>
                {record.incomingPerson ? (
                    <Box>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: theme.palette.success.dark, lineHeight: 1.2 }}>
                            {record.incomingPerson.rank} {record.incomingPerson.name}
                        </Typography>
                    </Box>
                ) : (
                    <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>
                )}
            </TableCell>

            {/* คนเข้า - ตำแหน่งเดิม */}
            <TableCell sx={{ py: 1.25, px: 1.5, borderRight: `2px solid ${theme.palette.success.main}` }}>
                {record.incomingPerson?.fromPosition ? (
                    <Box>
                        <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, lineHeight: 1.2 }}>
                            {record.incomingPerson.fromPosition}
                        </Typography>
                        {record.incomingPerson.posCode && (
                            <Chip
                                label={record.incomingPerson.posCodeId ? `${record.incomingPerson.posCodeId} - ${record.incomingPerson.posCode}` : record.incomingPerson.posCode}
                                size="small"
                                sx={{
                                    mt: 0.3,
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                    color: theme.palette.success.dark,
                                }}
                            />
                        )}
                    </Box>
                ) : (
                    <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>
                )}
            </TableCell>

            {/* คนครอง - ชื่อ */}
            <TableCell
                sx={{
                    py: 1.25,
                    px: 1.5,
                    borderRight: `1px solid ${theme.palette.divider}`,
                    bgcolor: isVacantOrReserved ? alpha(statusConfig.color, 0.04) : 'inherit',
                }}
            >
                {isVacantOrReserved ? (
                    <Chip
                        icon={statusConfig.icon}
                        label={statusConfig.label}
                        size="small"
                        sx={{
                            bgcolor: statusConfig.bg,
                            color: statusConfig.color,
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            height: 24,
                            '& .MuiChip-icon': { color: statusConfig.color },
                        }}
                    />
                ) : (
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.2 }}>
                        {record.currentHolder?.rank} {record.currentHolder?.name}
                    </Typography>
                )}
            </TableCell>

            {/* คนครอง - ตำแหน่ง + เลขตำแหน่ง */}
            <TableCell sx={{ py: 1.25, px: 1.5, borderRight: `1px solid ${theme.palette.divider}` }}>
                {(() => {
                    const position = record.currentHolder?.position || record.vacantPosition?.position;
                    const posCode = record.currentHolder?.posCode || record.vacantPosition?.posCode;
                    const posCodeId = record.currentHolder?.posCodeId || record.vacantPosition?.posCodeId;
                    const positionNumber = record.positionNumber;

                    if (position || positionNumber) {
                        return (
                            <Box>
                                {position && (
                                    <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, lineHeight: 1.2 }}>
                                        {position}
                                    </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: position ? 0.3 : 0 }}>
                                    {positionNumber && (
                                        <Chip
                                            label={`เลข: ${positionNumber}`}
                                            size="small"
                                            sx={{
                                                height: 18,
                                                fontSize: '0.65rem',
                                                fontWeight: 500,
                                                bgcolor: alpha(theme.palette.grey[500], 0.1),
                                                color: theme.palette.text.secondary,
                                            }}
                                        />
                                    )}
                                    {posCode && (
                                        <Chip
                                            label={posCodeId ? `${posCodeId} - ${posCode}` : posCode}
                                            size="small"
                                            sx={{
                                                height: 18,
                                                fontSize: '0.65rem',
                                                fontWeight: 500,
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                color: theme.palette.primary.main,
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        );
                    }
                    return <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>;
                })()}
            </TableCell>

            {/* อายุ */}
            <TableCell sx={{ py: 1.25, px: 1, textAlign: 'center', borderRight: `1px solid ${theme.palette.divider}` }}>
                {record.currentHolder?.age ? (
                    <Chip
                        label={record.currentHolder.age}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            bgcolor: parseInt(record.currentHolder.age) >= 55
                                ? alpha(theme.palette.error.main, 0.1)
                                : parseInt(record.currentHolder.age) >= 50
                                    ? alpha(theme.palette.warning.main, 0.1)
                                    : alpha(theme.palette.grey[500], 0.08),
                            color: parseInt(record.currentHolder.age) >= 55
                                ? theme.palette.error.main
                                : parseInt(record.currentHolder.age) >= 50
                                    ? theme.palette.warning.dark
                                    : theme.palette.text.secondary,
                        }}
                    />
                ) : (
                    <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>
                )}
            </TableCell>

            {/* กลุ่ม */}
            <TableCell sx={{ py: 1.25, px: 1, textAlign: 'center', borderRight: `2px solid ${theme.palette.warning.main}` }}>
                {record.group ? (
                    <Chip
                        label={record.group}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                        }}
                    />
                ) : (
                    <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>
                )}
            </TableCell>

            {/* ตำแหน่งใหม่ (ออก) */}
            <TableCell sx={{ py: 1.25, px: 1.5, borderRight: `1px solid ${theme.palette.divider}` }}>
                {record.outgoingPerson?.toPosition ? (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                            <ArrowForwardIcon sx={{ fontSize: 13, color: theme.palette.error.main, mt: 0.3 }} />
                            <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, lineHeight: 1.2 }}>
                                {record.outgoingPerson.toPosition}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.3, ml: 2 }}>
                            {record.outgoingPerson.toPositionNumber && (
                                <Chip
                                    label={`เลข: ${record.outgoingPerson.toPositionNumber}`}
                                    size="small"
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 500,
                                        bgcolor: alpha(theme.palette.grey[500], 0.1),
                                        color: theme.palette.text.secondary,
                                    }}
                                />
                            )}
                            {record.outgoingPerson.toPosCode && (
                                <Chip
                                    label={record.outgoingPerson.toPosCodeId ? `${record.outgoingPerson.toPosCodeId} - ${record.outgoingPerson.toPosCode}` : record.outgoingPerson.toPosCode}
                                    size="small"
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 500,
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        color: theme.palette.primary.main,
                                    }}
                                />
                            )}
                        </Box>
                        {record.outgoingPerson.toUnit && record.outgoingPerson.toUnit !== record.currentHolder?.unit && (
                            <Chip
                                label={`หน่วย: ${record.outgoingPerson.toUnit}`}
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{
                                    mt: 0.3,
                                    ml: 2,
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    borderColor: alpha(theme.palette.error.main, 0.4),
                                }}
                            />
                        )}
                    </Box>
                ) : (
                    <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>
                )}
            </TableCell>

            {/* ตำแหน่งที่ร้องขอ */}
            <TableCell sx={{ py: 1.25, px: 1.5, borderRight: `1px solid ${theme.palette.divider}` }}>
                {record.outgoingPerson?.requestedPosition ? (
                    <Typography sx={{ fontSize: '0.75rem', color: theme.palette.text.secondary, lineHeight: 1.2 }}>
                        {record.outgoingPerson.requestedPosition}
                    </Typography>
                ) : (
                    <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>
                )}
            </TableCell>

            {/* ผู้สนับสนุน */}
            <TableCell sx={{ py: 1.25, px: 1.5, borderRight: `2px solid ${theme.palette.error.main}` }}>
                {record.outgoingPerson?.supporter ? (
                    <Typography sx={{ fontSize: '0.78rem', color: theme.palette.text.secondary, lineHeight: 1.2 }}>
                        {record.outgoingPerson.supporter}
                    </Typography>
                ) : (
                    <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>
                )}
            </TableCell>

            {/* หมายเหตุ */}
            <TableCell sx={{ py: 1.25, px: 1.5 }}>
                {record.remark ? (
                    <Tooltip title={record.remark} arrow>
                        <Typography
                            sx={{
                                fontSize: '0.75rem',
                                color: theme.palette.primary.main,
                                fontWeight: 500,
                                maxWidth: 140,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'help',
                            }}
                        >
                            {record.remark}
                        </Typography>
                    </Tooltip>
                ) : (
                    <Typography sx={{ fontSize: '0.8rem', color: theme.palette.grey[400] }}>—</Typography>
                )}
            </TableCell>
        </TableRow>
    );
});

InOutRow.displayName = 'InOutRow';

export default function InOutTable({
    data,
    loading = false,
    onRowClick,
    totalCount,
    page: controlledPage,
    rowsPerPage: controlledRowsPerPage,
    onPageChange,
    onRowsPerPageChange,
    showPagination = true,
    serverSidePagination = false,
}: InOutTableProps) {
    const theme = useTheme();

    // Internal pagination state
    const [internalPage, setInternalPage] = useState(0);
    const [internalRowsPerPage, setInternalRowsPerPage] = useState(25);

    const page = controlledPage !== undefined ? controlledPage : internalPage;
    const rowsPerPage = controlledRowsPerPage !== undefined ? controlledRowsPerPage : internalRowsPerPage;

    // Calculate displayed data
    const displayedData = useMemo(() => {
        if (serverSidePagination) return data;
        const start = page * rowsPerPage;
        return data.slice(start, start + rowsPerPage);
    }, [data, page, rowsPerPage, serverSidePagination]);

    const total = totalCount !== undefined ? totalCount : data.length;

    const handlePageChange = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        onPageChange ? onPageChange(newPage) : setInternalPage(newPage);
    };

    const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value, 10);
        if (onRowsPerPageChange) {
            onRowsPerPageChange(value);
        } else {
            setInternalRowsPerPage(value);
            setInternalPage(0);
        }
    };

    // Column definitions - memoized
    const columns = useMemo(() => [
        {
            id: 'inName',
            label: 'คนเข้า',
            minWidth: 160,
            headerBg: theme.palette.success.main,
            icon: <LoginIcon sx={{ fontSize: 14, mr: 0.5 }} />,
        },
        {
            id: 'inFrom',
            label: 'ตำแหน่งเดิม (เข้า)',
            minWidth: 150,
            headerBg: theme.palette.success.main,
        },
        {
            id: 'currentName',
            label: 'คนครอง',
            minWidth: 160,
            headerBg: theme.palette.warning.main,
        },
        {
            id: 'currentPos',
            label: 'ตำแหน่งปัจจุบัน',
            minWidth: 180,
            headerBg: theme.palette.warning.main,
        },
        {
            id: 'age',
            label: 'อายุ',
            minWidth: 60,
            align: 'center' as const,
            headerBg: theme.palette.warning.main,
        },
        {
            id: 'group',
            label: 'กลุ่ม',
            minWidth: 60,
            align: 'center' as const,
            headerBg: theme.palette.warning.main,
        },
        {
            id: 'outTo',
            label: 'ตำแหน่งใหม่ (ออก)',
            minWidth: 180,
            headerBg: theme.palette.error.main,
            icon: <LogoutIcon sx={{ fontSize: 14, mr: 0.5 }} />,
        },
        {
            id: 'requestedPosition',
            label: 'ตำแหน่งที่ร้องขอ',
            minWidth: 120,
            headerBg: theme.palette.error.main,
        },
        {
            id: 'supporter',
            label: 'ผู้สนับสนุน',
            minWidth: 120,
            headerBg: theme.palette.error.main,
        },
        {
            id: 'remark',
            label: 'หมายเหตุ',
            minWidth: 120,
            headerBg: theme.palette.grey[600],
        },
    ], [theme]);

    if (loading) {
        return (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}>
                    <Skeleton variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} variant="rectangular" height={52} sx={{ mb: 0.5, borderRadius: 1 }} />
                    ))}
                </Box>
            </Paper>
        );
    }

    return (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 1400 }}>
                    <TableHead>
                        <TableRow>
                            {columns.map((col, idx) => (
                                <TableCell
                                    key={col.id}
                                    align={col.align}
                                    sx={{
                                        minWidth: col.minWidth,
                                        bgcolor: col.headerBg,
                                        color: '#fff',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        py: 1.5,
                                        px: 1.5,
                                        borderRight: idx < columns.length - 1 ? `1px solid ${alpha('#fff', 0.2)}` : 'none',
                                        whiteSpace: 'nowrap',
                                        '& .MuiSvgIcon-root': {
                                            verticalAlign: 'middle',
                                        },
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: col.align === 'center' ? 'center' : 'flex-start' }}>
                                        {col.icon}
                                        {col.label}
                                    </Box>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {displayedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} sx={{ textAlign: 'center', py: 6 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                        <PersonOffIcon sx={{ fontSize: 48, color: theme.palette.grey[300] }} />
                                        <Typography color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                                            ไม่พบข้อมูล
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayedData.map((record, index) => (
                                <InOutRow
                                    key={record.id}
                                    record={record}
                                    index={index}
                                    theme={theme}
                                    onRowClick={onRowClick}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            {showPagination && (
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="แสดง:"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} จาก ${count !== -1 ? count.toLocaleString() : `>${to}`} รายการ`}
                    sx={{
                        borderTop: `1px solid ${theme.palette.divider}`,
                        bgcolor: alpha(theme.palette.grey[50], 0.5),
                        '& .MuiTablePagination-toolbar': {
                            minHeight: 52,
                        },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                            fontSize: '0.85rem',
                            color: theme.palette.text.secondary,
                        },
                        '& .MuiTablePagination-select': {
                            fontSize: '0.85rem',
                        },
                    }}
                />
            )}
        </Paper>
    );
}
