'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Autocomplete,
  TextField,
  Skeleton,
  Fade,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Stack,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChangeHistory as ThreeWayIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  CalendarToday as CalendarIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PersonnelDetailModal from '@/components/PersonnelDetailModal';
import DataTablePagination from '@/components/DataTablePagination';

interface ThreeWaySwapDetail {
  id: string;
  personnelId: string;
  fullName: string;
  rank?: string;
  nationalId?: string;
  posCodeId?: number;
  posCodeMaster?: {
    id: number;
    name: string;
  };
  fromPosition?: string;
  fromPositionNumber?: string;
  fromUnit?: string;
  toPosition?: string;
  toPositionNumber?: string;
  toUnit?: string;
  sequence: number;
}

interface ThreeWaySwapTransaction {
  id: string;
  groupNumber: string;
  groupName?: string;
  swapDate: string;
  status: string;
  notes?: string;
  year: number;
  createdAt: string;
  swapDetails: ThreeWaySwapDetail[];
}

interface PersonnelData {
  id: string;
  noId?: number;
  posCodeId?: number;
  posCodeMaster?: {
    id: number;
    name: string;
  };
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
  age?: string;
  yearsOfService?: string;
  seniority?: string;
  birthDate?: string;
  education?: string;
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  trainingLocation?: string;
  trainingCourse?: string;
  actingAs?: string;
  notes?: string;
}

export default function ThreeWaySwapPage() {
  const router = useRouter();
  const toast = useToast();

  // Data states
  const [data, setData] = useState<ThreeWaySwapTransaction[]>([]);
  const [filteredData, setFilteredData] = useState<ThreeWaySwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Year filter
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear() + 543);
  
  // View mode
  const [viewMode, setViewMode] = useState<'card'>('card');
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<ThreeWaySwapTransaction | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Personnel detail modal
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [personnelDetail, setPersonnelDetail] = useState<PersonnelData | null>(null);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  
  // Filter states
  const [groupNameFilter, setGroupNameFilter] = useState<string | null>(null);
  const [groupNameOptions, setGroupNameOptions] = useState<string[]>([]);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  // Generate available years
  const getAvailableYears = () => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];
    
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  };

  const availableYears = getAvailableYears();

  useEffect(() => {
    fetchData();
  }, [currentYear]);

  useEffect(() => {
    if (!loading) {
      applyFilters();
      updateFilterOptions();
    }
  }, [data, groupNameFilter, loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setData([]);
      setFilteredData([]);
      
      const response = await fetch(`/api/three-way-transactions?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data || []);
      setFilteredData(result.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...data];

    if (groupNameFilter) {
      filtered = filtered.filter(item => item.groupName === groupNameFilter);
    }

    setFilteredData(filtered);
    setPage(0);
  };

  const updateFilterOptions = () => {
    const groupNames = [...new Set(data.map(item => item.groupName).filter(Boolean))] as string[];
    setGroupNameOptions(groupNames);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    const newYear = event.target.value as number;
    setCurrentYear(newYear);
    setGroupNameFilter(null);
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: ThreeWaySwapTransaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handleEdit = () => {
    if (selectedTransaction) {
      router.push(`/police-personnel/three-way-swap/edit/${selectedTransaction.id}`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedTransaction) {
      setDeletingId(selectedTransaction.id);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch(`/api/three-way-transactions/${deletingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      toast.success('ลบข้อมูลสำเร็จ');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast.error(error.message || 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleViewPersonnelDetail = async (personnelId: string) => {
    setSelectedPersonnelId(personnelId);
    setPersonnelModalOpen(true);
    setLoadingPersonnel(true);

    try {
      const response = await fetch(`/api/police-personnel/${personnelId}`);
      if (!response.ok) throw new Error('Failed to fetch personnel');
      const result = await response.json();
      setPersonnelDetail(result.data);
    } catch (error) {
      console.error('Error fetching personnel:', error);
      toast.error('ไม่สามารถโหลดข้อมูลบุคลากรได้');
      setPersonnelDetail(null);
    } finally {
      setLoadingPersonnel(false);
    }
  };

  const handleClosePersonnelModal = () => {
    setPersonnelModalOpen(false);
    setSelectedPersonnelId(null);
    setPersonnelDetail(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'เสร็จสมบูรณ์';
      case 'pending': return 'รอดำเนินการ';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
              <ThreeWayIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  การสลับตำแหน่งสามเส้า
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  รายการสลับตำแหน่ง 3 คน (A→B→C→A)
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>ปีงบประมาณ</InputLabel>
                <Select
                  value={currentYear}
                  label="ปีงบประมาณ"
                  onChange={handleYearChange}
                >
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Tooltip title="รีเฟรช">
                <IconButton onClick={fetchData} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/police-personnel/three-way-swap/add')}
              >
                เพิ่มการสลับสามเส้า
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Filters */}
        {!loading && data.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
                ตัวกรอง:
              </Typography>
              
              <Autocomplete
                size="small"
                options={groupNameOptions}
                value={groupNameFilter}
                onChange={(_, newValue) => setGroupNameFilter(newValue)}
                renderInput={(params) => <TextField {...params} label="ชื่อกลุ่ม" />}
                sx={{ minWidth: 250 }}
              />

              {groupNameFilter && (
                <Button 
                  size="small" 
                  onClick={() => setGroupNameFilter(null)}
                >
                  ล้างตัวกรอง
                </Button>
              )}

              <Divider orientation="vertical" flexItem />
              
              <Typography variant="body2" color="text.secondary">
                ผลลัพธ์: {filteredData.length} รายการ
              </Typography>
            </Stack>
          </Paper>
        )}

        {/* Content */}
        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i}>
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                </Box>
              ))}
            </Box>
          </Paper>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <Paper sx={{ p: 8, textAlign: 'center' }}>
                <ThreeWayIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  ไม่พบข้อมูลการสลับตำแหน่งสามเส้า
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {groupNameFilter 
                    ? 'ลองปรับเปลี่ยนตัวกรองหรือเพิ่มข้อมูลใหม่'
                    : `ยังไม่มีข้อมูลการสลับตำแหน่งสามเส้าในปี ${currentYear}`
                  }
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/police-personnel/three-way-swap/add')}
                >
                  เพิ่มการสลับสามเส้า
                </Button>
              </Paper>
            ) : (
              <>
                {/* Card View */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
                  {paginatedData.map((row) => (
                    <Paper key={row.id} elevation={2} sx={{ 
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
                            icon={<ThreeWayIcon />}
                            label={row.groupNumber || '-'}
                            color="secondary"
                            size="medium"
                            sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}
                          />
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.15rem' }}>
                            {row.groupName || 'ไม่ระบุชื่อกลุ่ม'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem' }}>
                              <CalendarIcon sx={{ fontSize: 16 }} />
                              {formatDate(row.swapDate)}
                            </Typography>
                            <Chip
                              label={getStatusText(row.status)}
                              color={getStatusColor(row.status)}
                              size="small"
                              sx={{ height: 22 }}
                            />
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, row)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      {/* Notes */}
                      {row.notes && (
                        <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                            <strong>หมายเหตุ:</strong> {row.notes}
                          </Typography>
                        </Alert>
                      )}

                      {/* Three-way Swap Details */}
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.95rem' }}>
                          <ThreeWayIcon fontSize="small" color="secondary" />
                          รายการสลับสามเส้า ({row.swapDetails.length} คน)
                        </Typography>
                        
                        {/* Check if exactly 3 people */}
                        {row.swapDetails.length !== 3 && (
                          <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                            <Typography variant="caption">
                              ⚠️ รายการสามเส้าควรมี 3 คน (ปัจจุบันมี {row.swapDetails.length} คน)
                            </Typography>
                          </Alert>
                        )}
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {row.swapDetails
                            .sort((a, b) => a.sequence - b.sequence)
                            .map((detail, index) => (
                            <Box 
                              key={detail.id}
                              sx={{ 
                                p: 2, 
                                bgcolor: 'grey.50', 
                                borderRadius: 1,
                                borderLeft: '3px solid',
                                borderLeftColor: index === 0 ? 'success.main' : index === 1 ? 'info.main' : 'warning.main'
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <Chip 
                                      label={`คนที่ ${detail.sequence}`}
                                      size="small"
                                      color={index === 0 ? 'success' : index === 1 ? 'info' : 'warning'}
                                      sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
                                    />
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.95rem', mb: 0.5 }}>
                                    {detail.rank} {detail.fullName}
                                  </Typography>
                                  {detail.posCodeMaster && (
                                    <Chip 
                                      label={`${detail.posCodeMaster.id} - ${detail.posCodeMaster.name}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  )}
                                </Box>
                                <Tooltip title="ดูรายละเอียดบุคลากร">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleViewPersonnelDetail(detail.personnelId)}
                                    sx={{ ml: 1 }}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                  <strong>จาก:</strong> {detail.fromPosition || '-'}
                                  {detail.fromPositionNumber && ` (${detail.fromPositionNumber})`}
                                  {detail.fromUnit && ` • ${detail.fromUnit}`}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.875rem' }}>
                                  <strong>→ ไป:</strong> {detail.toPosition || '-'}
                                  {detail.toPositionNumber && ` (${detail.toPositionNumber})`}
                                  {detail.toUnit && ` • ${detail.toUnit}`}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>

                        {/* Show cycle indicator */}
                        {row.swapDetails.length === 3 && (
                          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'secondary.lighter', borderRadius: 1, textAlign: 'center' }}>
                            <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 600 }}>
                              🔄 วงจรสลับ: {row.swapDetails[0]?.fullName?.split(' ').pop()} → {row.swapDetails[1]?.fullName?.split(' ').pop()} → {row.swapDetails[2]?.fullName?.split(' ').pop()} → {row.swapDetails[0]?.fullName?.split(' ').pop()}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              
                {/* Pagination */}
                {filteredData.length > 0 && (
                  <Paper sx={{ mt: 3 }}>
                    <DataTablePagination
                      count={filteredData.length}
                      page={page}
                      rowsPerPage={rowsPerPage}
                      rowsPerPageOptions={[6, 12, 24]}
                      onPageChange={handlePageChange}
                      onRowsPerPageChange={handleRowsPerPageChange}
                      variant="minimal"
                    />
                  </Paper>
                )}
              </>
            )}
          </>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>แก้ไข</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDeleteClick}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>ลบ</ListItemText>
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>ยืนยันการลบ</DialogTitle>
          <DialogContent>
            <Typography>
              คุณแน่ใจหรือไม่ที่จะลบรายการสลับตำแหน่งสามเส้านี้?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              ลบ
            </Button>
          </DialogActions>
        </Dialog>

        {/* Personnel Detail Modal */}
        <PersonnelDetailModal
          open={personnelModalOpen}
          onClose={handleClosePersonnelModal}
          personnel={personnelDetail}
          loading={loadingPersonnel}
          title="รายละเอียดบุคลากร"
        />
      </Box>
    </Layout>
  );
}
