'use client';
import { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Collapse,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapHoriz as SwapHorizIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

interface SwapDetail {
  id: string;
  fullName: string;
  rank?: string;
  nationalId?: string;
  fromPosition?: string;
  fromPositionNumber?: string;
  fromUnit?: string;
  toPosition?: string;
  toPositionNumber?: string;
  toUnit?: string;
  notes?: string;
}

interface SwapTransaction {
  id: string;
  year: number;
  swapDate: string;
  swapType: string;
  status: string;
  notes?: string;
  approvedBy?: string;
  documentNumber?: string;
  swapDetails: SwapDetail[];
  createdAt: string;
}

export default function SwapListPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SwapTransaction[]>([]);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear() + 543);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SwapTransaction | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<SwapTransaction | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [currentYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/swap-transactions?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: SwapTransaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleEdit = () => {
    if (selectedItem) {
      router.push(`/police-personnel/swap-list/${selectedItem.id}`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedItem) {
      setItemToDelete(selectedItem);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/swap-transactions/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('ลบข้อมูลสำเร็จ');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleYearChange = (delta: number) => {
    setCurrentYear(prev => prev + delta);
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getSwapTypeLabel = (type: string) => {
    switch (type) {
      case 'two-way': return 'สลับ 2 คน';
      case 'three-way': return 'สามเส้า (3 คน)';
      case 'multi-way': return 'หลายคน';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'เสร็จสมบูรณ์';
      case 'pending': return 'รอดำเนินการ';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SwapHorizIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              บันทึกผลการสลับตำแหน่ง
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => router.push('/police-personnel/swap-list/add')}
          >
            เพิ่มรายการ
          </Button>
        </Box>

        {/* Year Selector */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              ปีงบประมาณ พ.ศ.:
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleYearChange(-1)}
            >
              ←
            </Button>
            <Typography variant="h6" sx={{ minWidth: 80, textAlign: 'center' }}>
              {currentYear}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleYearChange(1)}
            >
              →
            </Button>
            <IconButton
              onClick={fetchData}
              color="primary"
              title="รีเฟรชข้อมูล"
            >
              <RefreshIcon />
            </IconButton>
            <Box sx={{ ml: 'auto' }}>
              <Chip
                label={`จำนวนทั้งหมด: ${data.length} รายการ`}
                color="primary"
                variant="outlined"
              />
            </Box>
          </Box>
        </Paper>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : data.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            ไม่พบข้อมูลการสลับตำแหน่งในปี {currentYear}
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', width: 50 }} />
                  <TableCell sx={{ color: 'white' }}>วันที่สลับ</TableCell>
                  <TableCell sx={{ color: 'white' }}>ประเภท</TableCell>
                  <TableCell sx={{ color: 'white' }}>จำนวนคน</TableCell>
                  <TableCell sx={{ color: 'white' }}>เลขที่เอกสาร</TableCell>
                  <TableCell sx={{ color: 'white' }}>ผู้อนุมัติ</TableCell>
                  <TableCell sx={{ color: 'white' }}>สถานะ</TableCell>
                  <TableCell sx={{ color: 'white', width: 80 }} align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <>
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRow(row.id)}
                        >
                          {expandedRows.has(row.id) ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        {new Date(row.swapDate).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>{getSwapTypeLabel(row.swapType)}</TableCell>
                      <TableCell>
                        <Chip label={`${row.swapDetails.length} คน`} size="small" color="info" />
                      </TableCell>
                      <TableCell>{row.documentNumber || '-'}</TableCell>
                      <TableCell>{row.approvedBy || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(row.status)}
                          color={getStatusColor(row.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, row)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Detail Row */}
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0 }}>
                        <Collapse in={expandedRows.has(row.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CheckIcon color="success" />
                              รายละเอียดการสลับตำแหน่ง
                            </Typography>
                            
                            {row.notes && (
                              <Alert severity="info" sx={{ mb: 2 }}>
                                <strong>หมายเหตุ:</strong> {row.notes}
                              </Alert>
                            )}
                            
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: 'white' }}>
                                    <TableCell>ชื่อ-สกุล</TableCell>
                                    <TableCell>ยศ</TableCell>
                                    <TableCell>จากตำแหน่ง</TableCell>
                                    <TableCell>จากหน่วย</TableCell>
                                    <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>→ ไปตำแหน่ง</TableCell>
                                    <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>→ ไปหน่วย</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {row.swapDetails.map((detail) => (
                                    <TableRow key={detail.id} sx={{ bgcolor: 'white' }}>
                                      <TableCell><strong>{detail.fullName}</strong></TableCell>
                                      <TableCell>{detail.rank || '-'}</TableCell>
                                      <TableCell>
                                        {detail.fromPosition || '-'}
                                        {detail.fromPositionNumber && ` (${detail.fromPositionNumber})`}
                                      </TableCell>
                                      <TableCell>{detail.fromUnit || '-'}</TableCell>
                                      <TableCell sx={{ bgcolor: 'success.50' }}>
                                        <strong>{detail.toPosition || '-'}</strong>
                                        {detail.toPositionNumber && ` (${detail.toPositionNumber})`}
                                      </TableCell>
                                      <TableCell sx={{ bgcolor: 'success.50' }}>
                                        <strong>{detail.toUnit || '-'}</strong>
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
                  </>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" color="primary" />
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
          <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
          <DialogContent>
            <Typography>
              คุณต้องการลบรายการสลับตำแหน่งวันที่{' '}
              <strong>
                {itemToDelete && new Date(itemToDelete.swapDate).toLocaleDateString('th-TH')}
              </strong>{' '}
              ใช่หรือไม่?
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
      </Box>
    </Layout>
  );
}
