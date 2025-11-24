"use client";
import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Divider,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  Badge,
  Pagination,
} from '@mui/material';
import { 
  Close as CloseIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  PersonOutline as PersonIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

interface SwapDetail {
  id: string;
  sequence?: number | null;
  personnelId?: string | null;
  fullName: string;
  rank?: string | null;
  fromPosition?: string | null;
  fromUnit?: string | null;
  toPosition?: string | null;
  toUnit?: string | null;
  isPlaceholder?: boolean;
  posCodeId?: number | null;
  posCodeMaster?: {
    id: number;
    name: string;
  } | null;
  toPosCodeId?: number | null;
  toPosCodeMaster?: {
    id: number;
    name: string;
  } | null;
}

interface TransactionChain {
  id: string;
  year: number;
  swapDate: string;
  swapType: string;
  groupNumber?: string | null;
  status: string;
  isCompleted?: boolean;
  notes?: string | null;
  createdAt?: string;
  swapDetails: SwapDetail[];
}

interface PromotionChainListDrawerProps {
  open: boolean;
  onClose: () => void;
  year: number;
  onEdit?: (chainId: string) => void;
  onDelete?: (chainId: string) => void;
  onRefresh?: () => void;
}

export default function PromotionChainListDrawer({ 
  open, 
  onClose, 
  year,
  onEdit,
  onDelete,
  onRefresh 
}: PromotionChainListDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [chains, setChains] = useState<TransactionChain[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chainToDelete, setChainToDelete] = useState<TransactionChain | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChain, setSelectedChain] = useState<TransactionChain | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  useEffect(() => {
    if (open) {
      loadChains();
    }
  }, [open, year]);

  const loadChains = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: year.toString(),
        swapType: 'promotion-chain',
      });

      const response = await fetch(`/api/swap-transactions?${params}`);
      if (!response.ok) throw new Error('Failed to load promotion chains');
      
      const result = await response.json();
      const data: TransactionChain[] = Array.isArray(result?.data) ? result.data : [];
      
      // Sort by createdAt descending (newest first)
      data.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      setChains(data);
    } catch (error) {
      console.error('Error loading chains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (chain: TransactionChain) => {
    setChainToDelete(chain);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!chainToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/swap-transactions/${chainToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData?.error || 'Failed to delete');
      }

      // Reload chains
      await loadChains();
      if (onRefresh) onRefresh();
      
      setDeleteDialogOpen(false);
      setChainToDelete(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeleting(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, chain: TransactionChain) => {
    setAnchorEl(event.currentTarget);
    setSelectedChain(chain);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedChain(null);
  };

  const handleEditClick = () => {
    if (selectedChain && onEdit) {
      onEdit(selectedChain.id);
    }
    handleMenuClose();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  const filteredChains = chains.filter(chain => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      chain.groupNumber?.toLowerCase().includes(search) ||
      chain.notes?.toLowerCase().includes(search) ||
      chain.swapDetails.some(d => d.fullName.toLowerCase().includes(search))
    );
  });

  const paginatedChains = filteredChains.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filteredChains.length / rowsPerPage);

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          zIndex: 1300,
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 700, md: 900 },
            maxWidth: '100%',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                ข้อมูลรายการ
              </Typography>
              <Chip label={`ปี ${year}`} size="small" color="primary" />
            </Stack>
            <IconButton onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Search */}
          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="ค้นหาเลขที่กลุ่ม, ชื่อบุคลากร, หมายเหตุ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : filteredChains.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Alert severity="info">
                  {searchTerm ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการสายโปรโมชั่น'}
                </Alert>
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                <Stack spacing={2}>
                  {paginatedChains.map((chain) => {
                    const isExpanded = expandedId === chain.id;
                    const validDetails = chain.swapDetails.filter(d => !d.isPlaceholder);
                    const placeholderCount = chain.swapDetails.filter(d => d.isPlaceholder).length;
                    
                    return (
                      <Paper
                        key={chain.id}
                        elevation={2}
                        sx={{
                          border: 1,
                          borderColor: chain.isCompleted ? 'success.light' : 'divider',
                          bgcolor: chain.isCompleted ? alpha('#4caf50', 0.05) : 'background.paper',
                        }}
                      >
                        <Box sx={{ p: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Box sx={{ flex: 1 }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  {chain.groupNumber || 'ไม่มีเลขที่'}
                                </Typography>
                                {chain.isCompleted ? (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="เสร็จสมบูรณ์"
                                    size="small"
                                    color="success"
                                  />
                                ) : (
                                  <Chip label="ฉบับร่าง" size="small" variant="outlined" />
                                )}
                                <Chip
                                  icon={<PersonIcon />}
                                  label={`${validDetails.length} คน`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                                {placeholderCount > 0 && (
                                  <Chip
                                    label={`ว่าง ${placeholderCount}`}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                              
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                วันที่สร้าง: {formatDate(chain.createdAt)}
                              </Typography>
                              
                              {chain.notes && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  {chain.notes}
                                </Typography>
                              )}
                            </Box>

                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title={isExpanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}>
                                <IconButton
                                  size="small"
                                  onClick={() => setExpandedId(isExpanded ? null : chain.id)}
                                >
                                  {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="ตัวเลือก">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleMenuOpen(e, chain)}
                                >
                                  <MoreVertIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                        </Box>

                        <Collapse in={isExpanded}>
                          <Divider />
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600, width: 60 }}>#</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>ชื่อ-สกุล</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>จาก</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>ไป</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {chain.swapDetails
                                  .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                                  .map((detail, idx) => (
                                    <TableRow
                                      key={detail.id}
                                      sx={{
                                        bgcolor: detail.isPlaceholder ? alpha('#ff9800', 0.05) : 'inherit',
                                      }}
                                    >
                                      <TableCell>{idx + 1}</TableCell>
                                      <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {detail.rank || ''} {detail.fullName}
                                          </Typography>
                                          {detail.isPlaceholder && (
                                            <Chip label="ว่าง" size="small" color="warning" />
                                          )}
                                        </Stack>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {detail.fromPosition || '-'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          {detail.fromUnit || '-'}
                                        </Typography>
                                        {detail.posCodeMaster && (
                                          <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                                            รหัส: {detail.posCodeMaster.id} - {detail.posCodeMaster.name}
                                          </Typography>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                          {detail.toPosition || '-'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          {detail.toUnit || '-'}
                                        </Typography>
                                        {detail.toPosCodeMaster && (
                                          <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                                            รหัส: {detail.toPosCodeMaster.id} - {detail.toPosCodeMaster.name}
                                          </Typography>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Collapse>
                      </Paper>
                    );
                  })}
                </Stack>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, newPage) => setPage(newPage)}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick} disabled={!onEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          แก้ไข
        </MenuItem>
        <MenuItem
          onClick={() => selectedChain && handleDeleteClick(selectedChain)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          ลบ
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>
          <DialogContentText>
            คุณต้องการลบสายโปรโมชั่น <strong>{chainToDelete?.groupNumber}</strong> ใช่หรือไม่?
            <br />
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            ลบ
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
