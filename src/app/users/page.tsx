"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Search, Refresh, Person, Email, CalendarToday, Security, PersonAdd as PersonAddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import DataTablePagination from '@/components/DataTablePagination';
import { useToast } from '@/hooks/useToast';

type User = {
  id: number;
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
};

function formatDate(d?: string | null) {
  if (!d) return '-';
  const date = new Date(d);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export default function UsersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  const [rows, setRows] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // zero-based for MUI
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | 'admin' | 'user'>('all');
  const [isActive, setIsActive] = useState<'all' | 'true' | 'false'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'username' | 'lastLogin' | 'role'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  // Dialog form state
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formRole, setFormRole] = useState<'user' | 'admin'>('user');
  const [formIsActive, setFormIsActive] = useState(true);
  const [usernameError, setUsernameError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(pageSize),
        search,
        role,
        isActive,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      
      if (res.ok) {
        setRows(json.data || []);
        setTotal(json.total || 0);
      } else {
        toast.error(json.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, role, isActive, sortBy, sortOrder]);

  const handleRequestSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const checkUsernameAvailable = async (username: string) => {
    if (!username || (editingUser && username === editingUser.username)) {
      setUsernameError('');
      return true;
    }

    try {
      const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
      const json = await res.json();
      
      if (json.available) {
        setUsernameError('');
        return true;
      } else {
        setUsernameError('Username นี้ถูกใช้งานแล้ว');
        return false;
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการตรวจสอบ Username');
      return false;
    }
  };

  const handleOpenDialog = (user?: User) => {
    setEditingUser(user || null);
    setUsernameError('');
    if (user) {
      setFormUsername(user.username);
      setFormEmail(user.email || '');
      setFormFirstName(user.firstName || '');
      setFormLastName(user.lastName || '');
      setFormRole(user.role as 'user' | 'admin');
      setFormIsActive(user.isActive);
    } else {
      setFormUsername('');
      setFormEmail('');
      setFormFirstName('');
      setFormLastName('');
      setFormPassword('');
      setFormConfirmPassword('');
      setFormRole('user');
      setFormIsActive(true);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setUsernameError('');
    setFormUsername('');
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormRole('user');
    setFormIsActive(true);
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // ตรวจสอบรหัสผ่านและการยืนยัน
    if (formPassword && formPassword !== formConfirmPassword) {
      toast.error('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบใหม่');
      return;
    }
    
    // ตรวจสอบความยาวรหัสผ่าน
    if (formPassword && formPassword.length < 6) {
      toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    // ตรวจสอบ username ซ้ำก่อนบันทึก
    const isUsernameAvailable = await checkUsernameAvailable(formUsername);
    if (!isUsernameAvailable) {
      toast.error('Username นี้ถูกใช้งานแล้ว กรุณาเลือก Username อื่น');
      return;
    }
    
    const userData: any = {
      username: formUsername,
      email: formEmail,
      firstName: formFirstName,
      lastName: formLastName,
      role: formRole,
      isActive: formIsActive,
    };

    // Include password only if it's provided
    if (formPassword) {
      userData.password = formPassword;
    }

    setSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast.success(editingUser ? 'แก้ไขผู้ใช้งานเรียบร้อยแล้ว' : 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว');
        handleCloseDialog();
        fetchUsers();
      } else {
        // จัดการข้อผิดพลาดเฉพาะ
        if (result.error?.includes('username') || result.error?.includes('Username')) {
          toast.error('Username นี้ถูกใช้งานแล้ว กรุณาเลือก Username อื่น');
          setUsernameError('Username นี้ถูกใช้งานแล้ว');
        } else {
          toast.error(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
      }
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast.success(`ลบผู้ใช้งาน "${deletingUser.username}" เรียบร้อยแล้ว`);
        handleCloseDeleteDialog();
        fetchUsers();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ mx: 'auto' }}>
        {/* Header Card */}
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 },
            mb: 2,
          }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                จัดการผู้ใช้งาน
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เพิ่ม แก้ไข และจัดการข้อมูลผู้ใช้งานระบบ
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              alignItems: 'center',
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-end', sm: 'flex-end' },
            }}>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{
                  width: { xs: '100%', sm: 'auto' }
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>เพิ่มผู้ใช้งาน</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>เพิ่ม</Box>
              </Button>
            </Box>
          </Box>
        </Paper>

        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog} 
          maxWidth="md" 
          fullWidth 
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: isMobile ? 0 : 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              minHeight: isMobile ? '100vh' : 'auto',
            }
          }}
        >
          <form onSubmit={handleSaveUser}>
            <DialogTitle sx={{ 
              py: 1.5, 
              px: 2.5,
              borderBottom: '1px solid #e5e7eb',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              {editingUser ? (
                <>
                  <EditIcon fontSize="small" />
                  แก้ไขผู้ใช้งาน
                </>
              ) : (
                <>
                  <PersonAddIcon fontSize="small" />
                  เพิ่มผู้ใช้งาน
                </>
              )}
            </DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 1, px: 2.5 }}>
              <Stack spacing={2}>
                {/* Compact Form Layout - Account & Personal Info */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    name="username"
                    label="Username *"
                    value={formUsername}
                    onChange={(e) => {
                      setFormUsername(e.target.value);
                      // ตรวจสอบ username แบบ debounce
                      if (!editingUser && e.target.value) {
                        setTimeout(() => {
                          if (e.target.value === formUsername) {
                            checkUsernameAvailable(e.target.value);
                          }
                        }, 500);
                      }
                    }}
                    required
                    fullWidth
                    size="small"
                    disabled={!!editingUser}
                    placeholder="กรอก username"
                    error={!!usernameError}
                    sx={{ 
                      mt:3,
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: '8px',
                        backgroundColor: editingUser ? '#f9fafb' : 'transparent',
                      }
                    }}
                    helperText={
                      usernameError || 
                      (editingUser ? "ไม่สามารถแก้ไข username ได้" : "ใช้สำหรับเข้าสู่ระบบ")
                    }
                  />
                  <TextField
                    name="email"
                    label="อีเมล"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="example@email.com"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } , mt:3}}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    name="firstName"
                    label="ชื่อ"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="กรอกชื่อ"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                  <TextField
                    name="lastName"
                    label="นามสกุล"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="กรอกนามสกุล"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  />
                </Box>

                {/* Password Section */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <TextField
                    name="password"
                    label={editingUser ? "รหัสผ่านใหม่" : "รหัสผ่าน *"}
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required={!editingUser}
                    fullWidth
                    size="small"
                    placeholder={editingUser ? "เว้นว่างถ้าไม่เปลี่ยน" : "อย่างน้อย 6 ตัวอักษร"}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    helperText={editingUser ? "หากไม่ต้องการเปลี่ยนรหัสผ่าน ให้เว้นว่างไว้" : "ควรมีความยาวอย่างน้อย 6 ตัวอักษร"}
                  />
                  <TextField
                    name="confirmPassword"
                    label={editingUser ? "ยืนยันรหัสผ่าน" : "ยืนยันรหัสผ่าน *"}
                    type="password"
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    required={!!formPassword && !editingUser}
                    fullWidth
                    size="small"
                    placeholder={editingUser ? "เว้นว่างถ้าไม่เปลี่ยน" : "กรอกรหัสผ่านอีกครั้ง"}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    error={!!(formPassword && formConfirmPassword && formPassword !== formConfirmPassword)}
                    helperText={
                      formPassword && formConfirmPassword && formPassword !== formConfirmPassword 
                        ? "รหัสผ่านไม่ตรงกัน" 
                        : editingUser && !formPassword
                          ? "หากไม่ต้องการเปลี่ยนรหัสผ่าน ให้เว้นว่างไว้"
                          : undefined
                    }
                  />
                </Box>

                {/* Settings Section - Compact */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 1.5, alignItems: 'start' }}>
                  <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}>
                    <InputLabel>สิทธิ์การใช้งาน</InputLabel>
                    <Select 
                      name="role" 
                      label="สิทธิ์การใช้งาน" 
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as 'user' | 'admin')}
                    >
                      <MenuItem value="user">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" />
                          User - ผู้ใช้งานทั่วไป
                        </Box>
                      </MenuItem>
                      <MenuItem value="admin">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Security fontSize="small" />
                          Admin - ผู้ดูแลระบบ
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: formIsActive ? '#dcfce7' : '#fee2e2',
                    border: 1,
                    borderColor: formIsActive ? '#86efac' : '#fca5a5',
                  }}>
                    <FormControlLabel
                      control={
                        <Switch 
                          name="isActive" 
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          color={formIsActive ? 'success' : 'default'}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" fontWeight={500} fontSize="0.875rem">
                          {formIsActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  </Box>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.5, mt:3, borderTop: '1px solid #e0e0e0', gap: 1, backgroundColor: '#fafafa' }}>
              <Button 
                onClick={handleCloseDialog} 
                disabled={saving}
                variant="outlined"
                sx={{ 
                  minWidth: 80,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                ยกเลิก
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={saving}
                
                sx={{ 
                  minWidth: 90,
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  boxShadow: 1
                }}
              >
                {saving ? '⏳ บันทึก...' : 'บันทึก'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={deleting ? undefined : handleCloseDeleteDialog} maxWidth="xs" fullWidth>
          <DialogTitle>ยืนยันการลบ</DialogTitle>
          <DialogContent>
            <Typography>
              คุณต้องการลบผู้ใช้งาน <strong>{deletingUser?.username}</strong> ใช่หรือไม่?
            </Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} disabled={deleting}>ยกเลิก</Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={deleting}>
              {deleting ? 'กำลังลบ...' : 'ลบ'}
            </Button>
          </DialogActions>
        </Dialog>

        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)'
              },
              gap: 2,
              alignItems: 'center'
            }}
          >
            <TextField
              fullWidth
              value={search}
              onChange={(e) => { setPage(0); setSearch(e.target.value); }}
              placeholder="ค้นหา: username, email, ชื่อ, นามสกุล"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: '4px' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}>
              <InputLabel>สิทธิ์</InputLabel>
              <Select label="สิทธิ์" value={role} onChange={(e) => { setPage(0); setRole(e.target.value as any); }}>
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="admin">admin</MenuItem>
                <MenuItem value="user">user</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}>
              <InputLabel>สถานะ</InputLabel>
              <Select label="สถานะ" value={isActive} onChange={(e) => { setPage(0); setIsActive(e.target.value as any); }}>
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}>
                <InputLabel>เรียงโดย</InputLabel>
                <Select label="เรียงโดย" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                  <MenuItem value="createdAt">วันที่สร้าง</MenuItem>
                  <MenuItem value="username">Username</MenuItem>
                  <MenuItem value="lastLogin">เข้าสู่ระบบล่าสุด</MenuItem>
                  <MenuItem value="role">สิทธิ์</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '4px' } }}>
                <InputLabel>ลำดับ</InputLabel>
                <Select label="ลำดับ" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)}>
                  <MenuItem value="asc">น้อย→มาก</MenuItem>
                  <MenuItem value="desc">มาก→น้อย</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Tooltip title="รีเฟรช">
                  <span>
                    <IconButton onClick={() => fetchUsers()} disabled={loading}>
                      <Refresh />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Paper>

        {isMobile ? (
          <Box>
            {rows.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                {loading ? 'กำลังโหลด...' : 'ไม่พบข้อมูล'}
              </Paper>
            ) : (
              <Stack spacing={2}>
                {rows.map((u) => (
                  <Card key={u.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Person fontSize="small" color="action" />
                            {u.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {u.firstName || '-'} {u.lastName || '-'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip label={u.role} size="small" color={u.role === 'admin' ? 'primary' : 'default'} variant="outlined" />
                            <Chip label={u.isActive ? 'Active' : 'Inactive'} size="small" color={u.isActive ? 'success' : 'default'} />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(u)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(u)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {u.email || 'ไม่มีอีเมล'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            เข้าสู่ระบบล่าสุด: {formatDate(u.lastLogin)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Security fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            สร้างเมื่อ: {formatDate(u.createdAt)}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
            <Paper variant="outlined" sx={{ mt: 2 }}>
              <DataTablePagination
                count={total}
                page={page}
                rowsPerPage={pageSize}
                onPageChange={(p) => setPage(p)}
                onRowsPerPageChange={(n) => { setPage(0); setPageSize(n); }}
                variant='minimal'
              />
            </Paper>
          </Box>
        ) : (
          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell onClick={() => handleRequestSort('username')} sx={{ cursor: 'pointer' }}>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>ชื่อ</TableCell>
                    <TableCell>นามสกุล</TableCell>
                    <TableCell onClick={() => handleRequestSort('role')} sx={{ cursor: 'pointer' }}>สิทธิ์</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell onClick={() => handleRequestSort('lastLogin')} sx={{ cursor: 'pointer' }}>เข้าสู่ระบบล่าสุด</TableCell>
                    <TableCell onClick={() => handleRequestSort('createdAt')} sx={{ cursor: 'pointer' }}>สร้างเมื่อ</TableCell>
                    <TableCell>จัดการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.email || '-'}</TableCell>
                      <TableCell>{u.firstName || '-'}</TableCell>
                      <TableCell>{u.lastName || '-'}</TableCell>
                      <TableCell>
                        <Chip label={u.role} size="small" color={u.role === 'admin' ? 'primary' : 'default'} variant="outlined" />
                      </TableCell>
                    <TableCell>
                      <Chip label={u.isActive ? 'Active' : 'Inactive'} size="small" color={u.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{formatDate(u.lastLogin)}</TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(u)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(u)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        {loading ? 'กำลังโหลด...' : 'ไม่พบข้อมูล'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <DataTablePagination
              count={total}
              page={page}
              rowsPerPage={pageSize}
              onPageChange={(p) => setPage(p)}
              onRowsPerPageChange={(n) => { setPage(0); setPageSize(n); }}
              variant='minimal'
            />
          </Paper>
        )}
      </Box>
    </Layout>
  );
}
