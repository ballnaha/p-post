'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Divider,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  CloudUpload as ImportIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useTheme, useMediaQuery } from '@mui/material';
import DataTablePagination from '@/components/DataTablePagination';
import { useRouter } from 'next/navigation';

interface PolicePersonnel {
  id: string;
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
  age?: number;
  createdAt: string;
}

export default function PolicePersonnelPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [data, setData] = useState<PolicePersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/police-personnel?page=${page + 1}&limit=${rowsPerPage}&search=${search}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setTotal(result.pagination.total);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage]);

  const handleSearch = () => {
    setPage(0);
    fetchData();
  };

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'table' | 'card' | null,
  ) => {
    if (newMode !== null && !isMobile) {
      setViewMode(newMode);
    }
  };

  // Force card view on mobile
  useEffect(() => {
    if (isMobile && viewMode !== 'card') {
      setViewMode('card');
    }
  }, [isMobile]);

  // Render Card View
  const renderCardView = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              กำลังโหลดข้อมูล...
            </Typography>
          </Box>
        </Box>
      );
    }

    if (data.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            ไม่พบข้อมูล
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => router.push('/police-personnel/import')}
          >
            นำเข้าข้อมูล
          </Button>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 3,
        }}
      >
        {data.map((person, index) => (
          <Card
            key={person.id}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                
                boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
              },
            }}
          >
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Header with Avatar and Status */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: person.fullName ? 'primary.main' : 'grey.400',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                    }}
                  >
                    {person.fullName
                      ? person.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                      : '?'}
                  </Avatar>
                  <Box sx={{ ml: 'auto' }}>
                    {person.fullName ? (
                      <Chip
                        label="มีผู้ดำรง"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    ) : (
                      <Chip
                        label="ตำแหน่งว่าง"
                        color="default"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Name and Rank */}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 0.5,
                    fontSize: '1.1rem',
                    lineHeight: 1.3,
                    minHeight: 44,
                  }}
                >
                  {person.rank && `${person.rank} `}
                  {person.fullName || 'ตำแหน่งว่าง'}
                </Typography>

                {/* Position */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BadgeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {person.position || '-'}
                  </Typography>
                </Box>

                {/* Position Number */}
                {person.positionNumber && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    เลขตำแหน่ง: {person.positionNumber}
                  </Typography>
                )}

                <Divider sx={{ my: 1.5 }} />

                {/* Unit */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {person.unit || '-'}
                  </Typography>
                </Box>

                {/* Age */}
                {person.age && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      อายุ {person.age} ปี
                    </Typography>
                  </Box>
                )}

                {/* National ID */}
                {person.nationalId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {person.nationalId}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  fullWidth
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  ดูรายละเอียด
                </Button>
              </CardActions>
            </Card>
        ))}
      </Box>
    );
  };

  return (
    <Layout>
      <Box sx={{ 
        maxWidth: 1400, 
        mx: 'auto',
        width: '100%',
        // ป้องกันปัญหา overflow ใน mobile
        overflow: 'visible',
      }}>
        {/* Header */}
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
                Police Personnel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                จัดการข้อมูลบุคลากรตำรวจ
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              alignItems: 'center',
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
            }}>
              {/* View Mode Toggle - hidden on mobile */}
              {!isMobile && (
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
              )}

              <Button
                variant="contained"
                startIcon={<ImportIcon />}
                onClick={() => router.push('/police-personnel/import')}
                sx={{ 
                  minWidth: { xs: 'auto', sm: 140 },
                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                  px: { xs: 2, sm: 3 },
                  py: { xs: 1, sm: 1.5 },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>นำเข้าข้อมูล</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>นำเข้า</Box>
              </Button>
            </Box>
          </Box>

          {/* Search */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <TextField
              fullWidth
              placeholder="ค้นหาด้วย ชื่อ, ตำแหน่ง, หน่วย, ยศ, เลขบัตร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" onClick={handleSearch} sx={{ minWidth: 100 }}>
              ค้นหา
            </Button>
            <Tooltip title="รีเฟรช">
              <IconButton onClick={fetchData} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Data Display - Table or Card View */}
        <Paper sx={{ p: (isMobile || viewMode === 'card') ? 3 : 0 }}>
          {(isMobile ? 'card' : viewMode) === 'table' ? (
            <>
              <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ลำดับ</TableCell>
                  <TableCell>เลขตำแหน่ง</TableCell>
                  <TableCell>ตำแหน่ง</TableCell>
                  <TableCell>ยศ</TableCell>
                  <TableCell>ชื่อ-สกุล</TableCell>
                  <TableCell>หน่วย</TableCell>
                  <TableCell>อายุ</TableCell>
                  <TableCell>สถานะ</TableCell>
                  <TableCell align="center">จัดการ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        กำลังโหลดข้อมูล...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                      <Typography variant="body1" color="text.secondary">
                        ไม่พบข้อมูล
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<ImportIcon />}
                        onClick={() => router.push('/police-personnel/import')}
                        sx={{ mt: 2 }}
                      >
                        นำเข้าข้อมูล
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, index) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                      <TableCell>{row.positionNumber || '-'}</TableCell>
                      <TableCell>{row.position || '-'}</TableCell>
                      <TableCell>{row.rank || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {row.fullName || '-'}
                        </Typography>
                        {row.nationalId && (
                          <Typography variant="caption" color="text.secondary">
                            {row.nationalId}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{row.unit || '-'}</TableCell>
                      <TableCell>{row.age || '-'}</TableCell>
                      <TableCell>
                        {row.fullName ? (
                          <Chip label="มีผู้ดำรง" color="success" size="small" />
                        ) : (
                          <Chip label="ตำแหน่งว่าง" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="ดูรายละเอียด">
                          <IconButton size="small" color="primary">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <DataTablePagination
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(newPage) => setPage(newPage)}
            onRowsPerPageChange={(newRowsPerPage) => {
              setRowsPerPage(newRowsPerPage);
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            variant="minimal"
            disabled={loading}
          />
            </>
          ) : (
            <>
              {renderCardView()}
              <DataTablePagination
                count={total}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(newPage) => setPage(newPage)}
                onRowsPerPageChange={(newRowsPerPage) => {
                  setRowsPerPage(newRowsPerPage);
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                variant="minimal"
                disabled={loading}
              />
            </>
          )}
        </Paper>
      </Box>
    </Layout>
  );
}
