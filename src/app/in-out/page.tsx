'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Tooltip,
  alpha,
  Stack,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  SwapHoriz as SwapHorizIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import DataTablePagination from '@/components/DataTablePagination';
import { EmptyState } from '@/app/components/EmptyState';

interface SwapDetail {
  id: string;
  personnelId: string;
  fullName: string;
  rank: string | null;
  nationalId: string | null;
  age: string | null;
  seniority: string | null;
  
  // ข้อมูลส่วนตัว
  birthDate: string | null;
  education: string | null;
  lastAppointment: string | null;
  currentRankSince: string | null;
  enrollmentDate: string | null;
  retirementDate: string | null;
  yearsOfService: string | null;
  trainingLocation: string | null;
  trainingCourse: string | null;
  
  // ตำแหน่งเดิม (From)
  posCodeId: number | null;
  posCodeMaster: {
    id: number;
    name: string;
  } | null;
  fromPosition: string | null;
  fromPositionNumber: string | null;
  fromUnit: string | null;
  fromActingAs: string | null;
  
  // ตำแหน่งใหม่ (To)
  toPosCodeId: number | null;
  toPosCodeMaster: {
    id: number;
    name: string;
  } | null;
  toPosition: string | null;
  toPositionNumber: string | null;
  toUnit: string | null;
  toActingAs: string | null;
  
  // Transaction info (optional - null ถ้ายังไม่ได้สลับ)
  transaction: {
    id: string;
    year: number;
    swapDate: string;
    swapType: string;
    groupNumber: string | null;
  } | null;
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
  filters: {
    units: string[];
    positionCodes: PositionCode[];
  };
}

export default function InOutPage() {
  const [data, setData] = useState<InOutData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedPosCode, setSelectedPosCode] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all, vacant, reserved, occupied
  const [searchText, setSearchText] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SwapDetail | null>(null);
  const [swapPartner, setSwapPartner] = useState<SwapDetail | null>(null);
  const [replacedPerson, setReplacedPerson] = useState<SwapDetail | null>(null);
  
  // Store replaced persons for table display
  const [replacedPersonsMap, setReplacedPersonsMap] = useState<Map<string, SwapDetail>>(new Map());

  const availableYears = useMemo(() => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];
    
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        unit: selectedUnit,
        posCodeId: selectedPosCode,
        status: selectedStatus,
        year: selectedYear.toString(),
        page: page.toString(),
        pageSize: rowsPerPage.toString(),
      });
      
      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }

      const response = await fetch(`/api/in-out?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        
        // Fetch replaced persons for all swap details
        if (result.data.swapDetails && result.data.swapDetails.length > 0) {
          fetchReplacedPersons(result.data.swapDetails);
        }
      }
    } catch (error) {
      console.error('Failed to fetch in-out data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedUnit, selectedPosCode, selectedStatus, selectedYear, page, rowsPerPage, searchText]);

  const fetchReplacedPersons = async (swapDetails: SwapDetail[]) => {
    const newMap = new Map<string, SwapDetail>();
    
    // Filter only those who have transaction (already swapped)
    const swappedDetails = swapDetails.filter(d => d.transaction);
    
    // Group by transaction ID to minimize API calls
    const transactionIds = [...new Set(swappedDetails.map(d => d.transaction!.id))];
    
    for (const transactionId of transactionIds) {
      try {
        const response = await fetch(`/api/swap-transactions/${transactionId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.swapDetails) {
            // For each detail in current page, find who they replaced
            swappedDetails
              .filter(d => d.transaction!.id === transactionId)
              .forEach(detail => {
                const replaced = result.data.swapDetails.find((d: SwapDetail) => 
                  d.id !== detail.id && d.posCodeId === detail.toPosCodeId
                );
                if (replaced) {
                  newMap.set(detail.id, replaced);
                }
              });
          }
        }
      } catch (error) {
        console.error('Error fetching transaction details:', error);
      }
    }
    
    setReplacedPersonsMap(newMap);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSwapDetails = useMemo(() => {
    if (!data?.swapDetails) return [];
    return data.swapDetails;
  }, [data?.swapDetails]);

  const handleUnitChange = (event: SelectChangeEvent<string>) => {
    setSelectedUnit(event.target.value);
    setPage(0);
  };

  const handlePosCodeChange = (event: SelectChangeEvent<string>) => {
    setSelectedPosCode(event.target.value);
    setPage(0);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
    setPage(0);
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };



  const handleResetFilters = () => {
    setSearchText('');
    setSelectedUnit('all');
    setSelectedPosCode('all');
    setSelectedStatus('all');
    setPage(0);
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setSelectedStatus(event.target.value);
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    setPage(0);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    
    if (typeof dateString === 'string' && dateString.includes('/')) {
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
      }
    } catch {
      return dateString;
    }
    
    return dateString;
  };

  const getSwapTypeLabel = (type: string) => {
    switch (type) {
      case 'two-way': return 'สลับ 2 คน';
      case 'three-way': return 'สามเส้า';
      case 'multi-way': return 'หลายคน';
      default: return type;
    }
  };

  const handleViewDetail = async (detail: SwapDetail) => {
    if (!detail.transaction) return; // ถ้ายังไม่ได้สลับก็ไม่ต้องแสดง modal
    
    setSelectedDetail(detail);
    setDetailModalOpen(true);
    
    // Fetch คนที่สลับด้วย (คนที่อยู่ในตำแหน่งเดิมของเรา)
    try {
      const response = await fetch(`/api/swap-transactions/${detail.transaction.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.swapDetails) {
          // หาคนที่ไปอยู่ตำแหน่งเดิมของเรา (fromPosition)
          const partner = result.data.swapDetails.find((d: SwapDetail) => 
            d.id !== detail.id && d.toPosCodeId === detail.posCodeId
          );
          setSwapPartner(partner || null);
          
          // หาคนที่เราไปแทน (คนที่อยู่ในตำแหน่งใหม่ของเรา)
          const replaced = result.data.swapDetails.find((d: SwapDetail) => 
            d.id !== detail.id && d.posCodeId === detail.toPosCodeId
          );
          setReplacedPerson(replaced || null);
        }
      }
    } catch (error) {
      console.error('Error fetching swap details:', error);
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDetail(null);
    setSwapPartner(null);
    setReplacedPerson(null);
  };

  if (loading && !data) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                  In and Out
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  ข้อมูลการสลับตำแหน่งเจ้าหน้าที่
                </Typography>
              </Box>
            </Box>
            <Chip 
              label={`ทั้งหมด ${data?.totalCount || 0} รายการ`}
              color="primary"
              sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1 }}
            />
          </Box>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, 
            gap: 2,
            mb: 2
          }}>
            <FormControl size="small">
              <InputLabel>หน่วยเดิม</InputLabel>
              <Select value={selectedUnit} label="หน่วยเดิม" onChange={handleUnitChange}>
                <MenuItem value="all">ทุกหน่วย</MenuItem>
                {data?.filters.units.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>ตำแหน่งเดิม (POS CODE)</InputLabel>
              <Select value={selectedPosCode} label="ตำแหน่งเดิม (POS CODE)" onChange={handlePosCodeChange}>
                <MenuItem value="all">ทุกตำแหน่ง</MenuItem>
                {data?.filters.positionCodes.map((pos) => (
                  <MenuItem key={pos.id} value={pos.id.toString()}>
                    {pos.id} - {pos.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>สถานะตำแหน่ง</InputLabel>
              <Select value={selectedStatus} label="สถานะตำแหน่ง" onChange={handleStatusChange}>
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="occupied">มีคนดำรงตำแหน่ง</MenuItem>
                <MenuItem value="vacant">ว่าง</MenuItem>
                <MenuItem value="reserved">ว่าง (กันตำแหน่ง)</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>ปี</InputLabel>
              <Select value={selectedYear} label="ปี" onChange={handleYearChange}>
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              label="ค้นหา"
              placeholder="ค้นหาชื่อ, นามสกุล, ยศ, เลขบัตร, หน่วย, ตำแหน่ง..."
              size="small"
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: searchText && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => handleSearchChange('')}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {(searchText || selectedUnit !== 'all' || selectedPosCode !== 'all' || selectedStatus !== 'all') && (
              <Button
                variant="outlined"
                size="medium"
                onClick={handleResetFilters}
                startIcon={<RefreshIcon />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                ล้างตัวกรอง
              </Button>
            )}
          </Box>
        </Paper>

        {/* Table */}
        <Paper sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50, py: 1 }}>#</TableCell>
                  <TableCell sx={{ width: 80, py: 1 }}>ยศ</TableCell>
                  <TableCell sx={{ minWidth: 150, py: 1 }}>ชื่อ-สกุล</TableCell>
                  <TableCell sx={{ minWidth: 180, py: 1 }}>ตำแหน่งเก่า</TableCell>
                  <TableCell sx={{ minWidth: 180, py: 1 }}>ตำแหน่งใหม่</TableCell>
                  <TableCell align="center" sx={{ width: 80, py: 1 }}>ดูข้อมูล</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                        กำลังโหลดข้อมูล...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredSwapDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0, border: 'none' }}>
                      <EmptyState
                        icon={PersonIcon}
                        title={searchText ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ไม่พบข้อมูล'}
                        description={searchText ? 'ลองปรับเปลี่ยนคำค้นหาหรือล้างตัวกรอง' : `ยังไม่มีข้อมูลการสลับตำแหน่งในปี ${selectedYear}`}
                        variant="compact"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSwapDetails.map((detail, index) => (
                    <TableRow key={detail.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {page * rowsPerPage + index + 1}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          {detail.rank || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          {detail.fullName || '-'}
                        </Typography>
                        {detail.nationalId && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {detail.nationalId}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box>
                          {detail.posCodeMaster && (
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main', fontSize: '0.8125rem', mb: 0.3 }}>
                              {detail.posCodeMaster.id} - {detail.posCodeMaster.name}
                            </Typography>
                          )}
                          {detail.fromPosition && (
                            <Typography variant="caption" sx={{ fontSize: '0.75rem', display: 'block', mb: 0.2 }}>
                              {detail.fromPosition}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            หน่วย: {detail.fromUnit || '-'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, bgcolor: detail.toPosCodeMaster ? alpha('#4caf50', 0.05) : 'transparent' }}>
                        {detail.toPosCodeMaster ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', fontSize: '0.8125rem', mb: 0.3 }}>
                              {detail.toPosCodeMaster.id} - {detail.toPosCodeMaster.name}
                            </Typography>
                            {detail.toPosition && (
                              <Typography variant="caption" sx={{ fontSize: '0.75rem', display: 'block', mb: 0.2, fontWeight: 500 }}>
                                {detail.toPosition}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', mb: 0.3 }}>
                              หน่วย: {detail.toUnit || '-'}
                            </Typography>
                            {replacedPersonsMap.get(detail.id) && (
                              <Box sx={{ mt: 0.5, p: 0.5, bgcolor: alpha('#ff9800', 0.1), borderRadius: 0.5, border: 1, borderColor: alpha('#ff9800', 0.3) }}>
                                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'warning.dark', fontWeight: 600 }}>
                                  แทน: {replacedPersonsMap.get(detail.id)?.rank} {replacedPersonsMap.get(detail.id)?.fullName}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                            ยังไม่ได้สลับตำแหน่ง
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        {detail.transaction ? (
                          <Tooltip title="ดูรายละเอียด">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetail(detail)}
                              sx={{
                                color: 'primary.main',
                                '&:hover': {
                                  bgcolor: 'primary.50',
                                }
                              }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <DataTablePagination
            count={data?.totalCount || 0}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            variant="minimal"
            disabled={loading}
          />
        </Paper>

        {/* Detail Modal */}
        <Dialog
          open={detailModalOpen}
          onClose={handleCloseDetailModal}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SwapHorizIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                รายละเอียดการสลับตำแหน่ง
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDetailModal} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            {selectedDetail && selectedDetail.transaction && (
              <Stack spacing={3}>
                {/* ข้อมูลทั่วไป */}
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ข้อมูลทั่วไป
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">วันที่สลับ</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" fontWeight={500}>
                          {formatDate(selectedDetail.transaction.swapDate)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">เลขกลุ่ม</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                        {selectedDetail.transaction.groupNumber || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ประเภท</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip 
                          label={getSwapTypeLabel(selectedDetail.transaction.swapType)}
                          size="small"
                          color={selectedDetail.transaction.swapType === 'three-way' ? 'warning' : 'primary'}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ปี</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                        {selectedDetail.transaction.year}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                {/* ข้อมูลบุคคล */}
                <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                  <Typography variant="subtitle2" color="primary.main" gutterBottom fontWeight={600}>
                    ข้อมูลบุคคล
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ยศ</Typography>
                      <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                        {selectedDetail.rank || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ชื่อ-สกุล</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                        {selectedDetail.fullName}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ตำแหน่งเดิม</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                        {selectedDetail.fromPosition}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">เลขบัตรประชาชน</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedDetail.nationalId || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">วันเกิด</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {formatDate(selectedDetail.birthDate) || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">อายุ</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedDetail.age ? `${selectedDetail.age} ปี` : '-'}
                      </Typography>
                    </Box>
                    {selectedDetail.seniority && (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="caption" color="text.secondary">อาวุโส</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {selectedDetail.seniority}
                        </Typography>
                      </Box>
                    )}
                    {selectedDetail.education && (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="caption" color="text.secondary">คุณวุฒิการศึกษา</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {selectedDetail.education}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>

                {/* ข้อมูลการดำรงตำแหน่ง */}
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                    ข้อมูลการดำรงตำแหน่ง
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">วันบรรจุ</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {formatDate(selectedDetail.enrollmentDate) || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">วันเกษียณ</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {formatDate(selectedDetail.retirementDate) || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">จำนวนปีราชการ</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedDetail.yearsOfService ? `${selectedDetail.yearsOfService} ปี` : '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">แต่งตั้งครั้งสุดท้าย</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {formatDate(selectedDetail.lastAppointment) || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">ระดับนี้เมื่อ</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {formatDate(selectedDetail.currentRankSince) || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">สถานที่ฝึกอบรม</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {selectedDetail.trainingLocation || '-'}
                      </Typography>
                    </Box>
                    {selectedDetail.trainingCourse && (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="caption" color="text.secondary">หลักสูตรฝึกอบรม</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {selectedDetail.trainingCourse}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>

                {/* สรุปการสลับตำแหน่ง */}
                <Paper sx={{ p: 3, bgcolor: alpha('#2196f3', 0.05), border: 2, borderColor: 'primary.main' }}>
                  <Typography variant="h6" fontWeight={600} color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SwapHorizIcon />
                    สรุปการสลับตำแหน่ง
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  
                  {/* คำอธิบาย */}
                  <Stack spacing={2.5}>
                    {/* ตำแหน่งเดิม */}
                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: 1, borderColor: 'grey.300' }}>
                      <Typography variant="subtitle2" fontWeight={600} color="text.primary" gutterBottom>
                        📍 ตำแหน่งเดิม (ที่เคยอยู่)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {selectedDetail.rank} {selectedDetail.fullName} เดิมอยู่ที่ตำแหน่งนี้
                      </Typography>
                      <Box sx={{ pl: 2, borderLeft: 3, borderColor: 'grey.400' }}>
                        {selectedDetail.posCodeMaster && (
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {selectedDetail.posCodeMaster.id} - {selectedDetail.posCodeMaster.name}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          {selectedDetail.fromPosition || '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          หน่วย: {selectedDetail.fromUnit || '-'}
                        </Typography>
                      </Box>
                      {swapPartner && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1 }}>
                          <Typography variant="caption" color="info.dark" fontWeight={600}>
                            💡 ตำแหน่งเดิมนี้ตอนนี้มี {swapPartner.rank} {swapPartner.fullName} มาอยู่แทน
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* ลูกศร */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Chip 
                        icon={<SwapHorizIcon />}
                        label="สลับตำแหน่ง"
                        color="primary"
                        sx={{ fontWeight: 600, px: 2 }}
                      />
                    </Box>

                    {/* ตำแหน่งใหม่ */}
                    <Box sx={{ p: 2, bgcolor: alpha('#4caf50', 0.1), borderRadius: 2, border: 2, borderColor: 'success.main' }}>
                      <Typography variant="subtitle2" fontWeight={600} color="success.dark" gutterBottom>
                        ✅ ตำแหน่งใหม่ (ที่ได้รับ)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {selectedDetail.rank} {selectedDetail.fullName} ได้รับตำแหน่งใหม่นี้
                      </Typography>
                      <Box sx={{ pl: 2, borderLeft: 3, borderColor: 'success.main' }}>
                        {selectedDetail.toPosCodeMaster && (
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {selectedDetail.toPosCodeMaster.id} - {selectedDetail.toPosCodeMaster.name}
                          </Typography>
                        )}
                        <Typography variant="body2" fontWeight={500}>
                          {selectedDetail.toPosition || '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          หน่วย: {selectedDetail.toUnit || '-'}
                        </Typography>
                      </Box>
                      {replacedPerson && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
                          <Typography variant="caption" color="warning.dark" fontWeight={600}>
                            💡 ตำแหน่งใหม่นี้เดิมมี {replacedPerson.rank} {replacedPerson.fullName} อยู่
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Stack>
                </Paper>

                {/* รายละเอียดตำแหน่ง */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                  {/* ตำแหน่งเดิม - รายละเอียด */}
                  <Paper sx={{ p: 2.5, border: 1, borderColor: 'grey.300' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
                      รายละเอียดตำแหน่งเดิม
                    </Typography>
                    <Stack spacing={1.5}>
                      {selectedDetail.posCodeMaster && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">POS CODE</Typography>
                          <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ mt: 0.5 }}>
                            {selectedDetail.posCodeMaster.id} - {selectedDetail.posCodeMaster.name}
                          </Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {selectedDetail.fromPosition || '-'}
                        </Typography>
                      </Box>
                      {selectedDetail.fromPositionNumber && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">เลขที่ตำแหน่ง</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {selectedDetail.fromPositionNumber}
                          </Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary">หน่วย</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {selectedDetail.fromUnit || '-'}
                        </Typography>
                      </Box>
                      {selectedDetail.fromActingAs && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">ทำหน้าที่</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {selectedDetail.fromActingAs}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>

                  {/* ตำแหน่งใหม่ - รายละเอียด */}
                  <Paper sx={{ p: 2.5, border: 1, borderColor: 'success.main', bgcolor: alpha('#4caf50', 0.03) }}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom fontWeight={600} sx={{ mb: 2 }}>
                      รายละเอียดตำแหน่งใหม่
                    </Typography>
                    <Stack spacing={1.5}>
                      {selectedDetail.toPosCodeMaster && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">POS CODE</Typography>
                          <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 0.5 }}>
                            {selectedDetail.toPosCodeMaster.id} - {selectedDetail.toPosCodeMaster.name}
                          </Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary">ตำแหน่ง</Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                          {selectedDetail.toPosition || '-'}
                        </Typography>
                      </Box>
                      {selectedDetail.toPositionNumber && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">เลขที่ตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                            {selectedDetail.toPositionNumber}
                          </Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary">หน่วย</Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                          {selectedDetail.toUnit || '-'}
                        </Typography>
                      </Box>
                      {selectedDetail.toActingAs && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">ทำหน้าที่</Typography>
                          <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                            {selectedDetail.toActingAs}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </Box>
              </Stack>
            )}
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDetailModal} variant="outlined">
              ปิด
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
