'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  InputAdornment,
  Alert,
  Pagination,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';

interface PosCodeMaster {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function PosCodeMasterPage() {
  const [posCodeMasters, setPosCodeMasters] = useState<PosCodeMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<PosCodeMaster | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '' });
  const [formErrors, setFormErrors] = useState({ id: '', name: '' });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PosCodeMaster | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/pos-code-master?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data');

      const data = await res.json();
      setPosCodeMasters(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching pos code masters:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, page, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open create dialog
  const handleCreate = () => {
    setDialogMode('create');
    setEditingItem(null);
    setFormData({ id: '', name: '' });
    setFormErrors({ id: '', name: '' });
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (item: PosCodeMaster) => {
    setDialogMode('edit');
    setEditingItem(item);
    setFormData({ id: item.id.toString(), name: item.name });
    setFormErrors({ id: '', name: '' });
    setDialogOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = { id: '', name: '' };
    let isValid = true;

    if (dialogMode === 'create') {
      if (!formData.id.trim()) {
        errors.id = 'กรุณากรอกรหัสตำแหน่ง';
        isValid = false;
      } else if (isNaN(parseInt(formData.id))) {
        errors.id = 'รหัสตำแหน่งต้องเป็นตัวเลข';
        isValid = false;
      }
    }

    if (!formData.name.trim()) {
      errors.name = 'กรุณากรอกชื่อตำแหน่ง';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = '/api/pos-code-master';
      const method = dialogMode === 'create' ? 'POST' : 'PUT';
      const body = {
        id: dialogMode === 'create' ? parseInt(formData.id) : editingItem?.id,
        name: formData.name.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(
        dialogMode === 'create'
          ? 'เพิ่มรหัสตำแหน่งเรียบร้อย'
          : 'อัปเดตรหัสตำแหน่งเรียบร้อย'
      );
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving pos code master:', error);
      toast.error(error.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (item: PosCodeMaster) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/pos-code-master?id=${deletingItem.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      toast.success('ลบรหัสตำแหน่งเรียบร้อย');
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting pos code master:', error);
      toast.error(error.message || 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={700} mb={1}>
              จัดการรหัสตำแหน่ง (Position Code Master)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการข้อมูล Master รหัสตำแหน่งในระบบ
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            size="large"
          >
            เพิ่มรหัสตำแหน่ง
          </Button>
        </Box>

        {/* Search & Actions */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="ค้นหารหัสหรือชื่อตำแหน่ง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="รีเฟรช">
              <IconButton onClick={fetchData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Stats */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip label={`ทั้งหมด ${total} รายการ`} color="primary" />
        </Box>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700, width: 150 }}>รหัสตำแหน่ง</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ชื่อตำแหน่ง</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>วันที่สร้าง</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>อัปเดตล่าสุด</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120, textAlign: 'center' }}>
                  จัดการ
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : posCodeMasters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีข้อมูล'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                posCodeMasters.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Chip label={item.id} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{item.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(item.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(item.updatedAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="แก้ไข">
                        <IconButton size="small" onClick={() => handleEdit(item)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="ลบ">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(item)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {total > limit && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(total / limit)}
              page={page + 1}
              onChange={(e, p) => setPage(p - 1)}
              color="primary"
            />
          </Box>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {dialogMode === 'create' ? 'เพิ่มรหัสตำแหน่ง' : 'แก้ไขรหัสตำแหน่ง'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="รหัสตำแหน่ง"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                error={!!formErrors.id}
                helperText={formErrors.id}
                disabled={dialogMode === 'edit'}
                fullWidth
                placeholder="เช่น 1, 2, 3"
              />
              <TextField
                label="ชื่อตำแหน่ง"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!formErrors.name}
                helperText={formErrors.name}
                fullWidth
                placeholder="เช่น ผู้บัญชาการตำรวจแห่งชาติ"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: 'error.main' }}>ยืนยันการลบ</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>คำเตือน:</strong> การลบข้อมูลไม่สามารถกู้คืนได้!
            </Alert>
            {deletingItem && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  คุณต้องการลบรหัสตำแหน่งนี้หรือไม่?
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mt: 2 }}>
                  <Typography variant="body2">
                    <strong>รหัส:</strong> {deletingItem.id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ชื่อ:</strong> {deletingItem.name}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
