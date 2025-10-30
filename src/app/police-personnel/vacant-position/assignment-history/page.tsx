'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tabs,
  Tab,
  Button,
  Tooltip,
  Divider,
  Fade,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Collapse,
  Skeleton,
} from '@mui/material';
import {
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  CalendarToday as CalendarIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';
import DataTablePagination from '@/components/DataTablePagination';

interface AssignmentHistory {
  id: string;
  year: number;
  swapDate: string;
  groupName: string;
  status: string;
  notes: string;
  createdAt: string;
  swapDetails: {
    id: string;
    fullName: string;
    rank: string;
    fromPosition: string;
    fromUnit: string;
    toPosition: string;
    toUnit: string;
    notes: string;
    posCodeMaster: {
      id: number;
      name: string;
    } | null;
    requestedPosCode?: {
      id: number;
      name: string;
    } | null;
    requestedPositionId?: number | null;
  }[];
}

interface PosCode {
  value: string;
  label: string;
}

export default function AssignmentHistoryPage() {
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistory[]>([]);
  const [loading, setLoading] = useState(true); // เปลี่ยนเป็น true สำหรับ initial load
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear() + 543);
  const [selectedPosCode, setSelectedPosCode] = useState<string>('all');
  const [posCodes, setPosCodes] = useState<PosCode[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card'); // เพิ่ม view mode
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set()); // สำหรับ table view
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12); // Default for card view
  const toast = useToast();

  // Generate available years - Memoize เพื่อไม่ต้องคำนวณใหม่ทุกครั้ง
  const availableYears = useMemo(() => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years = [];
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  }, []);

  // ดึงรายการตำแหน่งสำหรับ filter (posCode ของตำแหน่งที่รับสมัคร) - ใช้ useCallback
  const fetchPosCodes = useCallback(async () => {
    try {
      const response = await fetch(`/api/vacant-position/requested-positions?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        setPosCodes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching pos codes:', error);
    }
  }, [currentYear]);

  // ดึงประวัติการจับคู่ตำแหน่ง - ใช้ useCallback (ไม่ใส่ toast ใน deps เพราะจะ loop)
  const fetchAssignmentHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/swap-transactions?swapType=vacant-assignment&year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        setAssignmentHistory(data.data || []);
        // ไม่ต้อง set filteredHistory ที่นี่ ให้ useEffect จัดการ
      } else {
        toast.error('ไม่สามารถโหลดประวัติการจับคู่ได้');
      }
    } catch (error) {
      console.error('Error fetching assignment history:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดประวัติ');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear]);

  // Memoize filtered history เพื่อลดการคำนวณซ้ำ
  const filteredHistory = useMemo(() => {
    // ถ้ายังโหลดอยู่ ให้ return empty array
    if (loading) return [];
    
    let filtered = assignmentHistory;

    // Filter เฉพาะ completed
    filtered = filtered.filter((history) => history.status === 'completed');

    // Filter by posCode (ใช้ requestedPositionId สำหรับ vacant-assignment)
    if (selectedPosCode !== 'all') {
      filtered = filtered.filter((history) =>
        history.swapDetails.some(
          (detail) => detail.requestedPositionId === parseInt(selectedPosCode)
        )
      );
    }

    return filtered;
  }, [selectedPosCode, assignmentHistory, loading]);

  // Reset page เมื่อ filter เปลี่ยน
  useEffect(() => {
    setPage(0);
  }, [selectedPosCode, assignmentHistory.length]);

  useEffect(() => {
    fetchPosCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear]); // รีเฟรช posCodes เมื่อเปลี่ยนปี

  useEffect(() => {
    fetchAssignmentHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear]);

  const handleYearChange = useCallback((event: SelectChangeEvent<number>) => {
    setCurrentYear(event.target.value as number);
  }, []);

  const handlePosCodeChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedPosCode(event.target.value);
  }, []);

  const handleViewModeChange = useCallback((event: React.MouseEvent<HTMLElement>, newViewMode: 'card' | 'table' | null) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      // Adjust rows per page based on view mode
      if (newViewMode === 'card') {
        setRowsPerPage(12);
      } else {
        setRowsPerPage(10);
      }
      setPage(0);
    }
  }, []);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleChangePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }, []);

  const getStatusColor = useCallback((status: string): 'success' | 'error' | 'default' => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  }, []);

  const getStatusLabel = useCallback((status: string): string => {
    switch (status) {
      case 'completed': return 'จับคู่สำเร็จ';
      case 'cancelled': return 'ยกเลิกจับคู่';
      default: return status;
    }
  }, []);

  // Memoize paginated data
  const paginatedData = useMemo(() => {
    return filteredHistory.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredHistory, page, rowsPerPage]);

  return (
    <Layout>
      <Box>
        {/* Header - เหมือน swap-list */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                  ประวัติการจับคู่ตำแหน่งว่าง
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ดูรายการผู้ที่ได้รับการจับคู่กับตำแหน่งว่าง
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* View Mode Toggle - เหมือน swap-list */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                aria-label="view mode"
              >
                <ToggleButton value="table" aria-label="table view">
                  <Tooltip title="มุมมองตาราง">
                    <ViewListIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="card" aria-label="card view">
                  <Tooltip title="มุมมองการ์ด">
                    <ViewModuleIcon />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
              
              <Tooltip title="รีเฟรชข้อมูล">
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchAssignmentHistory}
                  disabled={loading}
                  size="large"
                >
                  รีเฟรช
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, 
            gap: 2,
            alignItems: 'start'
          }}>
            <FormControl size="small">
              <InputLabel>ปี พ.ศ.</InputLabel>
              <Select
                value={currentYear}
                onChange={handleYearChange}
                label="ปี พ.ศ."
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl fullWidth size="small">
                <InputLabel>ตำแหน่ง</InputLabel>
                <Select
                  value={selectedPosCode}
                  onChange={handlePosCodeChange}
                  label="ตำแหน่ง"
                >
                  <MenuItem value="all">ทั้งหมด</MenuItem>
                  {posCodes.map((posCode) => (
                    <MenuItem key={posCode.value} value={posCode.value}>
                      {posCode.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Chip
                icon={<CheckCircleIcon />}
                label={`พบ: ${filteredHistory.length} รายการ`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, minWidth: 140 }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Content */}
        <Box>
          {loading ? (
            <Box>
              {viewMode === 'table' ? (
                <Paper elevation={2}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'primary.main' }}>
                          <TableCell sx={{ color: 'white', width: 50, fontWeight: 600 }} />
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>วันที่</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>ปี</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>กลุ่ม</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>สถานะ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Array.from({ length: rowsPerPage }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
                            <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                            <TableCell><Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 3 }} /></TableCell>
                            <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                            <TableCell><Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 3 }} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              ) : (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, 
                  gap: 2 
                }}>
                  {Array.from({ length: rowsPerPage }).map((_, index) => (
                    <Card key={index}>
                      <CardContent>
                        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
                        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 3, mb: 2 }} />
                        <Skeleton variant="text" width="90%" />
                        <Skeleton variant="text" width="80%" />
                        <Skeleton variant="text" width="70%" />
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          ) : filteredHistory.length === 0 ? (
            <Fade in={!loading} timeout={800}>
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  ไม่พบรายการจับคู่สำเร็จ
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPosCode !== 'all' && 'สำหรับตำแหน่งที่เลือก '}
                  ในปี {currentYear}
                </Typography>
              </Paper>
            </Fade>
          ) : (
            <>
              {/* Table View - เหมือน swap-list */}
              {viewMode === 'table' ? (
                <Paper elevation={2}>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'primary.main' }}>
                          <TableCell sx={{ color: 'white', width: 50, fontWeight: 600 }} />
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>วันที่</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>ปี</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>กลุ่ม</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>สถานะ</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedData.map((history) => (
                          <React.Fragment key={history.id}>
                            <TableRow 
                              hover 
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: 'action.hover',
                                  cursor: 'pointer'
                                }
                              }}
                            >
                              <TableCell>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleRow(history.id)}
                                  color="primary"
                                >
                                  {expandedRows.has(history.id) ? <ArrowUpIcon /> : <ArrowDownIcon />}
                                </IconButton>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  {new Date(history.swapDate).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`ปี ${history.year}`}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {history.groupName || '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={history.status === 'completed' ? <CheckCircleIcon /> : <CancelIcon />}
                                  label={getStatusLabel(history.status)}
                                  size="small"
                                  color={getStatusColor(history.status)}
                                />
                              </TableCell>
                            </TableRow>

                            {/* Expanded Detail Row */}
                            <TableRow>
                              <TableCell colSpan={5} sx={{ p: 0 }}>
                                <Collapse in={expandedRows.has(history.id)} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <CheckCircleIcon color="success" />
                                      รายละเอียดการจับคู่
                                    </Typography>
                                    
                                    {history.notes && (
                                      <Alert severity="info" sx={{ mb: 2 }}>
                                        <strong>หมายเหตุ:</strong> {history.notes}
                                      </Alert>
                                    )}
                                    
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow sx={{ bgcolor: 'white' }}>
                                            <TableCell>ชื่อ-สกุล</TableCell>
                                            <TableCell>ยศ</TableCell>
                                            <TableCell>ตำแหน่งที่รับสมัคร</TableCell>
                                            <TableCell>จากตำแหน่ง</TableCell>
                                            <TableCell>จากหน่วย</TableCell>
                                            <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>→ ไปตำแหน่ง</TableCell>
                                            <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>ไปหน่วย</TableCell>
                                            <TableCell>หมายเหตุ</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {history.swapDetails.map((detail) => (
                                            <TableRow key={detail.id} hover>
                                              <TableCell>{detail.fullName}</TableCell>
                                              <TableCell>{detail.rank}</TableCell>
                                              <TableCell>
                                                {detail.requestedPosCode ? (
                                                  <Chip 
                                                    label={`${detail.requestedPosCode.id} - ${detail.requestedPosCode.name}`}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                  />
                                                ) : '-'}
                                              </TableCell>
                                              <TableCell>{detail.fromPosition || '-'}</TableCell>
                                              <TableCell>{detail.fromUnit || '-'}</TableCell>
                                              <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>
                                                {detail.toPosition || '-'}
                                              </TableCell>
                                              <TableCell sx={{ color: 'success.main' }}>
                                                {detail.toUnit || '-'}
                                              </TableCell>
                                              <TableCell>
                                                <Typography variant="caption">
                                                  {detail.notes || '-'}
                                                </Typography>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Pagination for Table View */}
                  {filteredHistory.length > 0 && (
                    <DataTablePagination
                      count={filteredHistory.length}
                      page={page}
                      rowsPerPage={rowsPerPage}
                      rowsPerPageOptions={[5, 10, 25, 50, 100]}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      variant="minimal"
                    />
                  )}
                </Paper>
              ) : (
                /* Card View - เหมือน swap-list */
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
                    {paginatedData.map((history) => (
                      <Paper key={history.id} elevation={2} sx={{ 
                        p: 3, 
                        position: 'relative',
                        transition: 'all 0.2s',
                        '&:hover': { 
                          elevation: 4,
                          transform: 'translateY(-1px)',
                          boxShadow: 4
                        }
                      }}>
                        {/* Card Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Chip
                              icon={history.status === 'completed' ? <CheckCircleIcon /> : <CancelIcon />}
                              label={getStatusLabel(history.status)}
                              color={getStatusColor(history.status)}
                              size="small"
                              sx={{ fontWeight: 600, mb: 1, fontSize: '0.8rem' }}
                            />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.15rem' }}>
                              {history.groupName || 'ไม่ระบุชื่อกลุ่ม'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
                              <CalendarIcon sx={{ fontSize: 16 }} />
                              {new Date(history.swapDate).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Notes */}
                        {history.notes && (
                          <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                              <strong>หมายเหตุ:</strong> {history.notes}
                            </Typography>
                          </Alert>
                        )}

                        {/* Assignment Details */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.95rem' }}>
                            <CheckCircleIcon fontSize="small" color="primary" />
                            รายการจับคู่ ({history.swapDetails.length} คน)
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {history.swapDetails.map((detail) => (
                              <Box 
                                key={detail.id}
                                sx={{ 
                                  p: 2, 
                                  bgcolor: 'grey.50', 
                                  borderRadius: 1,
                                  borderLeft: '3px solid',
                                  borderLeftColor: 'primary.main'
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem', mb: 0.5 }}>
                                      {detail.rank} {detail.fullName}
                                    </Typography>
                                    {detail.requestedPosCode && (
                                      <Chip 
                                        label={`${detail.requestedPosCode.id} - ${detail.requestedPosCode.name}`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ fontWeight: 600 }}
                                      />
                                    )}
                                  </Box>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                    <strong>จาก:</strong> {detail.fromPosition || '-'}
                                    {detail.fromUnit && ` • ${detail.fromUnit}`}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.875rem' }}>
                                    <strong>→ ไป:</strong> {detail.toPosition || '-'}
                                    {detail.toUnit && ` • ${detail.toUnit}`}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>

                  {/* Pagination for Card View */}
                  {filteredHistory.length > 0 && (
                    <Paper sx={{ mt: 3 }}>
                      <DataTablePagination
                        count={filteredHistory.length}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[6, 12, 24, 48]}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        variant="minimal"
                      />
                    </Paper>
                  )}
                </>
              )}
            </>
          )}
        </Box>
      </Box>
    </Layout>
  );
}
