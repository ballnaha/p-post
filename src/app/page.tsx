'use client';

import { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Tooltip,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { 
  AssignmentTurnedIn,
  SwapHoriz,
  Person,
  LocationOn,
  TrendingUp,
  CheckCircle,
  HelpOutline,
  PeopleAlt,
} from '@mui/icons-material';
import Layout from './components/Layout';
import StatsCard from '@/components/dashboard/StatsCard';

interface PositionDetail {
  posCodeId: number;
  posCodeName: string;
  totalApplicants: number;
  assignedCount: number;
  pendingCount: number;
  assignmentRate: number;
  availableSlots?: number; // เพิ่มจำนวนตำแหน่งว่างที่มี
}

interface DashboardStats {
  totalVacantPositions: number;
  assignedPositions: number;
  pendingPositions: number;
  totalApplicants: number;
  totalSwapTransactions: number;
  totalPositionTypes: number;
  assignmentRate: number;
  positionDetails: PositionDetail[];
  topRequestedPositions: Array<{
    posCodeId: number;
    posCodeName: string;
    count: number;
    availableSlots?: number; // เพิ่มจำนวนตำแหน่งว่าง
  }>;
  // เพิ่มข้อมูลตำแหน่งว่าง
  vacantSlotsSummary?: {
    totalVacantSlots: number; // จำนวนตำแหน่งว่างทั้งหมด
    filledSlots: number; // จำนวนที่ถูกจับคู่แล้ว
    remainingSlots: number; // จำนวนที่เหลือ
  };
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Generate available years
  useEffect(() => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];
    
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    
    setAvailableYears(years);
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/dashboard?year=${selectedYear}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setStats(result.data);
        } else {
          throw new Error(result.error || 'Failed to load data');
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    }

    if (selectedYear) {
      fetchDashboardData();
    }
  }, [selectedYear]);

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <Box>
          <Alert severity="info">ไม่พบข้อมูล</Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header with Year Filter */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} mb={0.5}>
              Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ระบบจัดการตำแหน่งตำรวจ • ปี {selectedYear}
            </Typography>
          </Box>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="year-filter-label">ปี</InputLabel>
            <Select
              labelId="year-filter-label"
              id="year-filter"
              value={selectedYear}
              label="ปี"
              onChange={handleYearChange}
            >
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Stats Cards Row 1 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2.5, mb: 4 }}>
          <Card sx={{ 
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: 'none',
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              transform: 'translateY(-4px)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                    รายการทั้งหมด
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ mb: 0.5, fontSize: '2.25rem', lineHeight: 1 }}>
                    {stats.totalVacantPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingUp sx={{ fontSize: 16 }} />
                    {stats.assignmentRate.toFixed(0)}% จับคู่แล้ว
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'primary.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AssignmentTurnedIn sx={{ fontSize: 28, color: 'primary.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: 'none',
            borderLeft: '4px solid',
            borderColor: 'success.main',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              transform: 'translateY(-4px)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                    จับคู่สำเร็จ
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ mb: 0.5, fontSize: '2.25rem', lineHeight: 1 }}>
                    {stats.assignedPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    จาก {stats.totalVacantPositions.toLocaleString()} รายการ
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'success.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CheckCircle sx={{ fontSize: 28, color: 'success.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: 'none',
            borderLeft: '4px solid',
            borderColor: 'warning.main',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              transform: 'translateY(-4px)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                    รอดำเนินการ
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ mb: 0.5, fontSize: '2.25rem', lineHeight: 1 }}>
                    {stats.pendingPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="warning.main" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    รอการจับคู่
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'warning.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <HelpOutline sx={{ fontSize: 28, color: 'warning.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: 'none',
            borderLeft: '4px solid',
            borderColor: 'info.main',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              transform: 'translateY(-4px)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                    ผู้สมัคร
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ mb: 0.5, fontSize: '2.25rem', lineHeight: 1 }}>
                    {stats.totalApplicants.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    จำนวนบุคลากร
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'info.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <PeopleAlt sx={{ fontSize: 28, color: 'info.main' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: 'none',
            borderLeft: '4px solid',
            borderColor: '#9c27b0',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              transform: 'translateY(-4px)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                    อัตราสำเร็จ
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ mb: 0.5, fontSize: '2.25rem', lineHeight: 1 }}>
                    {stats.assignmentRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    การจับคู่ตำแหน่ง
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'rgba(156, 39, 176, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <SwapHoriz sx={{ fontSize: 28, color: '#9c27b0' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Details by Position Table */}
        {stats.positionDetails && stats.positionDetails.length > 0 && (
          <Paper sx={{ 
            borderRadius: 2, 
            mb: 3, 
            overflow: 'hidden', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <Box sx={{ 
              p: 3, 
              pb: 2.5,
              bgcolor: 'grey.50',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="h6" fontWeight={700} mb={0.5} color="text.primary">
                สถิติตำแหน่งว่างแยกตามประเภท
              </Typography>
              <Typography variant="body2" color="text.secondary">
                รายละเอียดจำนวนตำแหน่งว่าง ผู้สมัคร และสถานะการจับคู่แต่ละตำแหน่ง
              </Typography>
            </Box>
            <TableContainer sx={{ bgcolor: 'white' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 700, py: 2.5, fontSize: '0.8rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>รหัส</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 2.5, fontSize: '0.8rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>ชื่อตำแหน่ง</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, py: 2.5, fontSize: '0.8rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Tooltip title="จำนวนผู้สมัครที่รอจับคู่ (ตำแหน่งว่างที่เหลือ)">
                          <Typography variant="caption" fontWeight={700}>ตำแหน่งว่าง</Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, py: 2.5, fontSize: '0.8rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <PeopleAlt sx={{ fontSize: 16, color: 'info.main' }} />
                        <Tooltip title="จำนวนผู้ยื่นขอตำแหน่งนี้">
                          <Typography variant="caption" fontWeight={700}>ผู้สมัคร</Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, py: 2.5, fontSize: '0.8rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                        <Tooltip title="จำนวนที่จับคู่สำเร็จแล้ว">
                          <Typography variant="caption" fontWeight={700}>จับคู่แล้ว</Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, py: 2.5, fontSize: '0.8rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <HelpOutline sx={{ fontSize: 16, color: 'grey.500' }} />
                        <Tooltip title="จำนวนผู้สมัครที่รอจับคู่">
                          <Typography variant="caption" fontWeight={700}>รอจับคู่</Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 2.5, minWidth: 200, fontSize: '0.8rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Tooltip title="เปอร์เซ็นต์การจับคู่ที่สำเร็จ">
                        <Typography variant="caption" fontWeight={700}>อัตราความสำเร็จ</Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.positionDetails
                    .sort((a, b) => {
                      // เรียงตามตำแหน่งว่างที่มีมากที่สุดก่อน ถ้ามีข้อมูล
                      if (a.availableSlots && b.availableSlots) {
                        return b.availableSlots - a.availableSlots;
                      }
                      // ถ้าไม่มีข้อมูลตำแหน่งว่าง ให้เรียงตามจำนวนผู้สมัคร
                      return b.totalApplicants - a.totalApplicants;
                    })
                    .map((position, index) => {
                      const hasSlotData = position.availableSlots !== undefined;
                      const slotStatus = hasSlotData 
                        ? position.availableSlots! > position.assignedCount 
                          ? 'available' 
                          : position.availableSlots! === position.assignedCount 
                            ? 'full' 
                            : 'over'
                        : 'unknown';
                      
                      return (
                    <TableRow 
                      key={position.posCodeId}
                      hover
                      sx={{ 
                        '&:hover': { bgcolor: '#f5f7ff' },
                        transition: 'background-color 0.2s',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Chip 
                          label={position.posCodeId} 
                          size="small" 
                          sx={{ 
                            fontWeight: 700,
                            bgcolor: 'primary.50',
                            color: 'primary.main',
                            minWidth: 50,
                            fontSize: '0.75rem'
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {position.posCodeName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        {hasSlotData ? (
                          <Tooltip title={`มีตำแหน่งว่าง ${position.availableSlots} ตำแหน่ง`}>
                            <Chip 
                              label={position.availableSlots} 
                              size="small"
                              sx={{ 
                                fontWeight: 700,
                                minWidth: 50,
                                fontSize: '0.75rem',
                                bgcolor: slotStatus === 'available' ? '#FFF3E0' : slotStatus === 'full' ? '#F5F5F5' : '#FFEBEE',
                                color: slotStatus === 'available' ? '#E65100' : slotStatus === 'full' ? '#757575' : '#C62828',
                                border: '1px solid',
                                borderColor: slotStatus === 'available' ? '#FFB74D' : slotStatus === 'full' ? '#E0E0E0' : '#EF5350',
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <Chip 
                          label={position.totalApplicants} 
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            minWidth: 50,
                            fontSize: '0.75rem',
                            bgcolor: '#E3F2FD',
                            color: '#1565C0',
                            border: '1px solid #90CAF9'
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <Chip 
                          label={position.assignedCount} 
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            minWidth: 50,
                            fontSize: '0.75rem',
                            bgcolor: '#E8F5E9',
                            color: '#2E7D32',
                            border: '1px solid #81C784'
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2 }}>
                        <Chip 
                          label={position.pendingCount} 
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            minWidth: 50,
                            fontSize: '0.75rem',
                            bgcolor: '#FFF3E0',
                            color: '#E65100',
                            border: '1px solid #FFB74D'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={position.assignmentRate} 
                            sx={{ 
                              flex: 1, 
                              height: 8, 
                              borderRadius: 4,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: position.assignmentRate >= 75 
                                  ? 'success.main'
                                  : position.assignmentRate >= 50 
                                    ? 'warning.main'
                                    : 'error.main'
                              }
                            }} 
                          />
                          <Typography variant="body2" fontWeight={700} sx={{ minWidth: 50, color: 'text.primary' }}>
                            {position.assignmentRate.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Summary footer */}
            {stats.vacantSlotsSummary && (
              <>
                <Box sx={{ 
                  p: 3, 
                  bgcolor: 'grey.50',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex', 
                  justifyContent: 'space-around', 
                  flexWrap: 'wrap', 
                  gap: 3 
                }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" fontWeight={600} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      ผู้สมัครทั้งหมด
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {stats.vacantSlotsSummary.totalVacantSlots}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" fontWeight={600} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      จับคู่แล้ว
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {stats.vacantSlotsSummary.filledSlots}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block" fontWeight={600} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      รอจับคู่
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="warning.main">
                      {stats.vacantSlotsSummary.remainingSlots}
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        )}

        {/* Summary Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2.5, mb: 3 }}>
          {/* Top Positions with Most Applicants */}
          {stats.topRequestedPositions && stats.topRequestedPositions.length > 0 && (
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                p: 2.5, 
                pb: 2,
                bgcolor: 'grey.50',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp sx={{ fontSize: 20, color: 'primary.main' }} />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    ตำแหน่งที่มีผู้สมัครมากที่สุด
                  </Typography>
                </Box>
              </Box>
              <CardContent sx={{ p: 2.5, bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {stats.topRequestedPositions.slice(0, 5).map((position, index) => (
                    <Box key={position.posCodeId}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Chip 
                            label={`#${index + 1}`} 
                            size="small"
                            sx={{ 
                              fontWeight: 700,
                              minWidth: 35,
                              height: 35,
                              fontSize: '0.85rem',
                              bgcolor: index === 0 
                                ? 'warning.main'
                                : index === 1 
                                  ? 'grey.400'
                                  : 'grey.300',
                              color: index < 2 ? 'white' : 'text.primary'
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mb: 0.3 }}>
                              {position.posCodeName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              รหัส: {position.posCodeId}
                              {position.availableSlots !== undefined && ` • ว่าง ${position.availableSlots} ตำแหน่ง`}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip 
                          label={`${position.count} คน`}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            bgcolor: '#E3F2FD',
                            color: '#1565C0',
                            border: '1px solid #90CAF9',
                            fontSize: '0.75rem'
                          }}
                        />
                      </Box>
                      {index < 4 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Positions with Most Vacancies */}
          {stats.positionDetails && stats.positionDetails.length > 0 && (
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                p: 2.5, 
                pb: 2,
                bgcolor: 'grey.50',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn sx={{ fontSize: 20, color: 'warning.main' }} />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    ตำแหน่งที่รอจับคู่มากที่สุด
                  </Typography>
                </Box>
              </Box>
              <CardContent sx={{ p: 2.5, bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {stats.positionDetails
                    .filter(p => p.pendingCount > 0)
                    .sort((a, b) => b.pendingCount - a.pendingCount)
                    .slice(0, 5)
                    .map((position, index) => (
                    <Box key={position.posCodeId}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Chip 
                            label={`#${index + 1}`} 
                            size="small"
                            sx={{ 
                              fontWeight: 700,
                              minWidth: 35,
                              height: 35,
                              fontSize: '0.85rem',
                              bgcolor: index === 0 
                                ? 'error.main'
                                : index === 1 
                                  ? 'warning.main'
                                  : 'warning.light',
                              color: 'white'
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mb: 0.3 }}>
                              {position.posCodeName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              รหัส: {position.posCodeId} • ผู้สมัคร {position.totalApplicants} คน
                            </Typography>
                          </Box>
                        </Box>
                        <Chip 
                          label={`${position.pendingCount} คน`}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            bgcolor: '#FFF3E0',
                            color: '#E65100',
                            border: '1px solid #FFB74D',
                            fontSize: '0.75rem'
                          }}
                        />
                      </Box>
                      {index < 4 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                  {stats.positionDetails.filter(p => p.pendingCount > 0).length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <CheckCircle sx={{ fontSize: 48, color: 'success.light', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        ไม่มีตำแหน่งที่รอจับคู่
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        จับคู่ครบทุกตำแหน่งแล้ว
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {new Date().getFullYear() + 543} ระบบจัดการตำแหน่งตำรวจ
          </Typography>
        </Box>
      </Box>
    </Layout>
  );
}