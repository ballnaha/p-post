'use client';

import { useEffect, useState, useMemo } from 'react';
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
  BarChart as BarChartIcon,
  ChangeHistory,
} from '@mui/icons-material';
import Layout from './components/Layout';
import StatsCard from '@/components/dashboard/StatsCard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

interface PositionDetail {
  posCodeId: number;
  posCodeName: string;
  totalApplicants: number;
  assignedCount: number;
  pendingCount: number;
  assignmentRate: number;
  availableSlots?: number; // เพิ่มจำนวนตำแหน่งว่างที่มี
}

interface ChartDataItem {
  posCodeId: number;
  posCodeName: string;
  vacantSlots: number; // ตำแหน่งว่างจาก police_personnel
  totalApplicants: number; // ผู้ยื่นขอตำแหน่ง
}

interface DashboardStats {
  totalVacantPositions: number;
  assignedPositions: number;
  pendingPositions: number;
  totalApplicants: number;
  totalSwapTransactions: number;
  totalSwapList: number; // จำนวนสลับตำแหน่งทั้งหมด
  totalThreeWaySwap: number; // จำนวนสามเส้าทั้งหมด
  completedSwapCount: number; // จำนวนคนที่สลับสำเร็จแล้วทั้งหมด
  completedThreeWaySwapCount: number; // จำนวนคนที่สลับสำเร็จแล้วแบบสามเส้า
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
  chartData?: ChartDataItem[]; // ข้อมูลกราฟใหม่
  availableUnits?: string[]; // รายการหน่วยทั้งหมด
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [selectedUnit, setSelectedUnit] = useState<string>('all'); // filter สำหรับกราฟเท่านั้น
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

  // Fetch dashboard data (ไม่ขึ้นกับ unit filter)
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/dashboard?year=${selectedYear}&unit=all`;
        console.log('Fetching dashboard data for year:', selectedYear, 'URL:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const result = await response.json();
        console.log('Dashboard data received:', result);
        
        if (result.success) {
          setStats(result.data);
          console.log('Stats updated:', result.data);
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
  }, [selectedYear]); // ลบ selectedUnit ออก

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
  };

  const handleUnitChange = (event: SelectChangeEvent<string>) => {
    setSelectedUnit(event.target.value);
  };

  // Memoize sorted position details
  const sortedPositionDetails = useMemo(() => {
    if (!stats?.positionDetails) return [];
    return [...stats.positionDetails].sort((a, b) => {
      // เรียงตามตำแหน่งว่างที่มีมากที่สุดก่อน ถ้ามีข้อมูล
      if (a.availableSlots && b.availableSlots) {
        return b.availableSlots - a.availableSlots;
      }
      // ถ้าไม่มีข้อมูลตำแหน่งว่าง ให้เรียงตามจำนวนผู้สมัคร
      return b.totalApplicants - a.totalApplicants;
    });
  }, [stats?.positionDetails]);

  // Memoize pending positions
  const pendingPositionsSorted = useMemo(() => {
    if (!stats?.positionDetails) return [];
    return stats.positionDetails
      .filter(p => p.pendingCount > 0)
      .sort((a, b) => b.pendingCount - a.pendingCount)
      .slice(0, 5);
  }, [stats?.positionDetails]);

  // Memoize has pending count
  const hasPendingPositions = useMemo(() => {
    return stats?.positionDetails?.some(p => p.pendingCount > 0) ?? false;
  }, [stats?.positionDetails]);

  // Fetch chart data แยกต่างหาก (ขึ้นกับ unit filter)
  const [chartDataRaw, setChartDataRaw] = useState<ChartDataItem[] | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    async function fetchChartData() {
      try {
        setChartLoading(true);
        const url = `/api/dashboard/chart?year=${selectedYear}&unit=${selectedUnit}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setChartDataRaw(result.data.chartData);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setChartLoading(false);
      }
    }

    if (selectedYear) {
      fetchChartData();
    }
  }, [selectedYear, selectedUnit]); // ขึ้นกับทั้ง year และ unit

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!chartDataRaw || chartDataRaw.length === 0) {
      return null;
    }

    return {
      labels: chartDataRaw.map(p => p.posCodeName),
      datasets: [
        {
          label: 'ตำแหน่งว่าง (จาก police_personnel)',
          data: chartDataRaw.map(p => p.vacantSlots),
          backgroundColor: 'rgba(255, 152, 0, 0.7)',
          borderColor: 'rgba(255, 152, 0, 1)',
          borderWidth: 1,
        },
        {
          label: 'ผู้ยื่นขอตำแหน่ง',
          data: chartDataRaw.map(p => p.totalApplicants),
          backgroundColor: 'rgba(33, 150, 243, 0.7)',
          borderColor: 'rgba(33, 150, 243, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [chartDataRaw]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: "'Noto Sans Thai', sans-serif",
            size: 12,
          },
          padding: 15,
          usePointStyle: true,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          family: "'Noto Sans Thai', sans-serif",
          size: 14,
        },
        bodyFont: {
          family: "'Noto Sans Thai', sans-serif",
          size: 13,
        },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += context.parsed.y + ' คน';
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Noto Sans Thai', sans-serif",
            size: 11,
          },
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            family: "'Noto Sans Thai', sans-serif",
            size: 11,
          },
          callback: function(value: any) {
            return value + ' คน';
          },
        },
      },
    },
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
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="year-filter-label">ปี</InputLabel>
              <Select
                labelId="year-filter-label"
                id="year-filter"
                value={selectedYear}
                label="ปี"
                onChange={handleYearChange}
              >
                {/* {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>

                ))} */}
                {[2568, 2569].map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>

                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Stats Cards Row 1 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
          {/* Vacant Position Summary Card */}
          <Card sx={{ 
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transform: 'translateY(-2px)',
            }
          }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ 
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                }}>
                  <AssignmentTurnedIn sx={{ fontSize: 20, color: 'white' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" fontSize="0.7rem" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Assigned Positions
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="text.primary" fontSize="0.95rem">
                    ตำแหน่งที่จับคู่แล้ว
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h3" fontWeight={800} color="primary.main" sx={{ fontSize: '2.25rem', lineHeight: 1, mb: 0.5 }}>
                  {stats.assignmentRate.toFixed(1)}% 
                </Typography>

              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Sub Stats Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1.5, bgcolor: 'success.50' }}>
                  <Typography variant="h6" fontWeight={700} color="success.dark" fontSize="1.1rem" sx={{ mb: 0.25 }}>
                    {stats.assignedPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="success.dark" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    จับคู่สำเร็จ
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1.5, bgcolor: 'warning.50' }}>
                  <Typography variant="h6" fontWeight={700} color="warning.dark" fontSize="1.1rem" sx={{ mb: 0.25 }}>
                    {stats.pendingPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="warning.dark" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    รอดำเนินการ
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1.5, bgcolor: 'info.50' }}>
                  <Typography variant="h6" fontWeight={700} color="info.dark" fontSize="1.1rem" sx={{ mb: 0.25 }}>
                    {stats.totalApplicants.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="info.dark" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    ผู้สมัคร
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Swap Position Card */}
          <Card sx={{ 
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transform: 'translateY(-2px)',
            }
          }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ 
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'secondary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(156, 39, 176, 0.3)',
                }}>
                  <SwapHoriz sx={{ fontSize: 20, color: 'white' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" fontSize="0.7rem" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Swap Positions
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="text.primary" fontSize="0.95rem">
                    สลับตำแหน่งทั้งหมด
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h3" fontWeight={800} color="secondary.main" sx={{ fontSize: '2.25rem', lineHeight: 1, mb: 0.5 }}>
                  {stats.totalSwapList.toLocaleString()}
                </Typography>
                
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1.5, bgcolor: 'secondary.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
                    
                    <Typography variant="caption" color="secondary.dark" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {((stats.completedSwapCount / stats.totalSwapList) * 100 || 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="secondary.dark" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    สลับสำเร็จ
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Three-Way Swap Card */}
          <Card sx={{ 
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transform: 'translateY(-2px)',
            }
          }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ 
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'error.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
                }}>
                  <ChangeHistory sx={{ fontSize: 20, color: 'white' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" fontSize="0.7rem" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Three-Way Swap
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="text.primary" fontSize="0.95rem">
                    สามเส้าทั้งหมด
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h3" fontWeight={800} color="error.main" sx={{ fontSize: '2.25rem', lineHeight: 1, mb: 0.5 }}>
                  {stats.totalThreeWaySwap.toLocaleString()}
                </Typography>
                
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 1.5, bgcolor: 'error.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
                    
                    <Typography variant="caption" color="error.dark" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {((stats.completedThreeWaySwapCount / stats.totalThreeWaySwap) * 100 || 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="error.dark" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    สลับสำเร็จ
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

        </Box>

        {/* Bar Chart: Vacant Positions vs Applicants */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  เปรียบเทียบตำแหน่งว่างกับผู้ยื่นขอตำแหน่ง
                </Typography>
              </Box>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="unit-filter-label">กรองตามหน่วย</InputLabel>
                <Select
                  labelId="unit-filter-label"
                  id="unit-filter"
                  value={selectedUnit}
                  label="กรองตามหน่วย"
                  onChange={handleUnitChange}
                  disabled={chartLoading}
                >
                  <MenuItem value="all">ทุกหน่วย</MenuItem>
                  {stats?.availableUnits?.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {unit}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Typography variant="body2" color="text.secondary">
              ตำแหน่งว่าง: จาก police_personnel (ตำแหน่งที่ไม่มีคนดำรง) • 
              ผู้ยื่นขอ: จาก vacant_position • แสดงทุก PosCode ที่มีข้อมูล
              {selectedUnit !== 'all' && ` • กรองตามหน่วย: ${selectedUnit}`}
            </Typography>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'white', height: { xs: 350, sm: 400, md: 450 }, position: 'relative' }}>
            {chartLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : chartData ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">ไม่พบข้อมูล</Typography>
              </Box>
            )}
          </Box>
        </Paper>

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
                ตำแหน่งว่าง: จาก police_personnel (fullName = null/''/ว่าง/ว่าง(กันตำแหน่ง)) • 
                ผู้ยื่นขอ: จาก vacant_position ปี {selectedYear}
                {selectedUnit !== 'all' && ` • กรองตามหน่วย: ${selectedUnit}`}
              </Typography>
            </Box>
            <TableContainer sx={{ bgcolor: 'white' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 700, py: 2.5, fontSize: '0.9rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>PosCode</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 2.5, fontSize: '0.9rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>ชื่อตำแหน่ง</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, py: 2.5, fontSize: '0.9rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Tooltip title="ตำแหน่งว่างจริงจาก police_personnel (ไม่มีคนดำรง)">
                          <Typography variant="caption" fontWeight={700} fontSize="0.9rem">ตำแหน่งว่าง</Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, py: 2.5, fontSize: '0.9rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <PeopleAlt sx={{ fontSize: 16, color: 'info.main' }} />
                        <Tooltip title="จำนวนผู้ยื่นขอตำแหน่งนี้">
                          <Typography variant="caption" fontWeight={700} fontSize="0.9rem">ผู้สมัคร</Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, py: 2.5, fontSize: '0.9rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                        <Tooltip title="จำนวนที่จับคู่สำเร็จแล้ว">
                          <Typography variant="caption" fontWeight={700} fontSize="0.9rem">จับคู่แล้ว</Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, py: 2.5, fontSize: '0.9rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <HelpOutline sx={{ fontSize: 16, color: 'grey.500' }} />
                        <Tooltip title="จำนวนผู้สมัครที่รอจับคู่">
                          <Typography variant="caption" fontWeight={700} fontSize="0.9rem">รอจับคู่</Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 2.5, minWidth: 200, fontSize: '0.9rem', color: 'text.secondary', borderBottom: '2px solid #e0e0e0' }}>
                      <Tooltip title="เปอร์เซ็นต์การจับคู่ที่สำเร็จ">
                        <Typography variant="caption" fontWeight={700} fontSize="0.9rem">อัตราความสำเร็จ</Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPositionDetails.map((position, index) => {
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
                  {pendingPositionsSorted.map((position, index) => (
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
                  {!hasPendingPositions && (
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