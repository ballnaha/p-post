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
  Tooltip,
  Card,
  CardContent,
  Divider,
  Stack
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
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';
import { teal } from '@mui/material/colors';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ChartDataLabels
);

const DASHBOARD_COLORS = {
  primary: '#7C5DFA',
  primarySoft: 'rgba(124, 93, 250, 0.14)',
  accent: '#FF9A44',
  accentSoft: 'rgba(255, 154, 68, 0.16)',
  pink: '#FF7EB3',
  pinkSoft: 'rgba(255, 126, 179, 0.16)',
  neutralSoft: 'rgba(255, 255, 255, 0.18)',
  alternativeBlue: '#4FC3F7',
  alternativeBlueSoft: 'rgba(79, 195, 247, 0.14)',
  teal: '#1DE9B6',
  tealSoft: 'rgba(29, 233, 182, 0.14)',
};

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
  vacantSlots: number; // ตำแหน่งว่าง (รอจับคู่)
  totalApplicants: number; // จับคู่สำเร็จ
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
  const [selectedUnit, setSelectedUnit] = useState<string>('all'); // filter ทั้งหน้า dashboard
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

  // Fetch dashboard data (ขึ้นกับทั้ง year และ unit filter)
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/dashboard?year=${selectedYear}&unit=${selectedUnit}`;
        const response = await fetch(url);
        
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
  }, [selectedYear, selectedUnit]); // ขึ้นกับทั้ง year และ unit

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

  // ไม่ต้อง fetch chart data แยก เพราะมาพร้อมกับ dashboard data แล้ว
  const chartDataRaw = stats?.chartData || null;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!chartDataRaw || chartDataRaw.length === 0) {
      return null;
    }

    return {
      labels: chartDataRaw.map(p => p.posCodeName),
      datasets: [
        {
          label: 'จับคู่สำเร็จ',
          data: chartDataRaw.map(p => p.totalApplicants),
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, context.chart.height, 0, 0);
            gradient.addColorStop(0, 'rgba(29, 233, 182, 0.7)');
            gradient.addColorStop(1, '#00BFA5');
            return gradient;
          },
          borderColor: 'transparent',
          borderWidth: 0,
          barThickness: 40,
          stack: 'stack0',
          borderRadius: (context: any) => {
            const dataIndex = context.dataIndex;
            const vacantValue = chartDataRaw[dataIndex]?.vacantSlots || 0;
            // ถ้าไม่มีตำแหน่งว่าง (เต็มหมด) ให้ใส่ borderRadius ที่มุมบน
            if (vacantValue === 0) {
              return {
                topLeft: 20,
                topRight: 20,
                bottomLeft: 0,
                bottomRight: 0,
              };
            }
            // ถ้ามีตำแหน่งว่าง ไม่ต้องมี borderRadius
            return 0;
          },
        },
        {
          label: 'ตำแหน่งว่าง',
          data: chartDataRaw.map(p => p.vacantSlots || null), // แปลง 0 เป็น null เพื่อไม่แสดงแท่ง
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, context.chart.height, 0, 0);
            gradient.addColorStop(0, 'rgba(189, 189, 189, 0.25)');
            gradient.addColorStop(1, 'rgba(158, 158, 158, 0.6)');
            return gradient;
          },
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: {
            topLeft: 20,
            topRight: 20,
            bottomLeft: 0,
            bottomRight: 0,
          },
          borderSkipped: false,
          barThickness: 40,
          stack: 'stack0',
        },
      ],
    };
  }, [chartDataRaw]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        padding: 16,
        cornerRadius: 8,
        titleFont: {
          family: "'Noto Sans Thai', sans-serif",
          size: 14,
          weight: 'bold',
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
            label += context.parsed.y.toLocaleString() + ' คน';
            return label;
          }
        }
      },
      datalabels: {
        display: function(context: any) {
          return context.dataset.data[context.dataIndex] > 0;
        },
        color: '#ffffff',
        font: {
          family: "'Noto Sans Thai', sans-serif",
          size: 11,
          weight: 'bold' as const,
        },
        formatter: function(value: number) {
          if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k';
          }
          return value.toLocaleString();
        },
        anchor: 'center' as const,
        align: 'center' as const,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          font: {
            family: "'Noto Sans Thai', sans-serif",
            size: 12,
            weight: 600,
          },
          color: '#424242',
          maxRotation: 0,
          minRotation: 0,
          padding: 14,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          font: {
            family: "'Noto Sans Thai', sans-serif",
            size: 12,
            weight: 600,
          },
          color: '#424242',
          padding: 14,
          callback: function(value: any) {
            if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'k';
            }
            return value.toLocaleString();
          },
        },
        border: {
          display: false,
        },
      },
    },
    barPercentage: 0.6,
    categoryPercentage: 0.7,
  } as any;

  if (loading) {
    return (
      <Layout>
<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
  <Stack 
    direction="column" // ตั้งให้จัดเรียงในแนวตั้ง
    alignItems="center" // จัดให้อยู่ตรงกลางแนวนอน
    spacing={2} // ระยะห่างระหว่าง CircularProgress กับ Typography
  >
    <CircularProgress />
    <Typography 
      variant="body2" 
      color="text.secondary"
      sx={{ 
        fontWeight: 500,
        letterSpacing: 0.5,
      }}
    >
      กำลังโหลด...
    </Typography>
  </Stack>
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
              {selectedUnit !== 'all' && ` • ${selectedUnit}`}
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
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>

                ))}
                
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="unit-filter-label">หน่วย</InputLabel>
              <Select
                labelId="unit-filter-label"
                id="unit-filter"
                value={selectedUnit}
                label="หน่วย"
                onChange={handleUnitChange}
                disabled={loading}
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
        </Box>

        {/* Stats Cards Row 1 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
          {/* Vacant Position Summary Card */}
          <Card
            sx={{
              position: 'relative',
              borderRadius: 3,
              p: 0,
              background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
              color: 'common.white',
              boxShadow: '0 18px 35px rgba(29, 233, 182, 0.32)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 210,
                height: 210,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.12)',
                top: -90,
                right: -60,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 170,
                height: 170,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                bottom: -80,
                left: -60,
              }}
            />
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, position: 'relative', zIndex: 1 }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(22, 63, 161, 0.25)',
                    color: 'common.white',
                  }}
                >
                  <AssignmentTurnedIn sx={{ fontSize: 22 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    fontSize="0.7rem"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.78)' }}
                  >
                    Position Assignment Rate
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    fontSize="0.98rem"
                    sx={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    จับคู่ตำแหน่งกับบุคลากร
                  </Typography>
                  <Typography variant="caption" fontSize="0.72rem" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ fontSize: '2.35rem', lineHeight: 1, mb: 0.5, color: 'common.white' }}
                >
                  {stats.assignmentRate.toFixed(1)}%
                </Typography>
              </Box>

              <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Sub Stats Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                <Box sx={{ textAlign: 'center', p: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.12rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.assignedPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    จับคู่สำเร็จ
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', p: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.12rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.pendingPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    รอดำเนินการ
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', p: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.12rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.totalApplicants.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    ผู้สมัคร
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Swap Position Card */}
          <Card
            sx={{
              position: 'relative',
              borderRadius: 3,
              p: 0,
              background: 'linear-gradient(135deg, #42a5f5 0%, #64b5f6 100%)',
              color: 'common.white',
              boxShadow: '0 18px 36px rgba(66, 165, 245, 0.32)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.14)',
                top: -80,
                right: -70,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.09)',
                bottom: -70,
                left: -40,
              }}
            />
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, position: 'relative', zIndex: 1 }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(137, 42, 24, 0.25)',
                    color: 'common.white',
                  }}
                >
                  <SwapHoriz sx={{ fontSize: 22 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    fontSize="0.7rem"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.78)' }}
                  >
                    Swap Positions
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    fontSize="0.98rem"
                    sx={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    สลับตำแหน่งทั้งหมด
                  </Typography>
                  <Typography variant="caption" fontSize="0.72rem" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ fontSize: '2.35rem', lineHeight: 1, mb: 0.5, color: 'common.white' }}
                >
                  {stats.totalSwapList.toLocaleString()} คน
                </Typography>
              </Box>

              <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
                <Box sx={{ textAlign: 'center', p: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
                    <Typography variant="body1" sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'common.white' }}>
                      {((stats.completedSwapCount / stats.totalSwapList) * 100 || 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    สลับสำเร็จ
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Three-Way Swap Card */}
          <Card
            sx={{
              position: 'relative',
              borderRadius: 3,
              p: 0,
              background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
              color: 'common.white',
              boxShadow: '0 18px 36px rgba(255, 152, 0, 0.32)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 210,
                height: 210,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.14)',
                top: -80,
                right: -80,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.09)',
                bottom: -70,
                left: -50,
              }}
            />
            <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, position: 'relative', zIndex: 1 }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(140, 33, 74, 0.25)',
                    color: 'common.white',
                  }}
                >
                  <ChangeHistory sx={{ fontSize: 22 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    fontSize="0.7rem"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.78)' }}
                  >
                    Three-Way Swap
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    fontSize="0.98rem"
                    sx={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    สามเส้าทั้งหมด
                  </Typography>
                  <Typography variant="caption" fontSize="0.72rem" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ fontSize: '2.35rem', lineHeight: 1, mb: 0.5, color: 'common.white' }}
                >
                  {stats.totalThreeWaySwap.toLocaleString()} คน
                </Typography>
              </Box>

              <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
                <Box sx={{ textAlign: 'center', p: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
                    <Typography variant="body1" sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'common.white' }}>
                      {((stats.completedThreeWaySwapCount / stats.totalThreeWaySwap) * 100 || 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
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
            bgcolor: 'white',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} mb={0.5} color="text.primary">
                  เปรียบเทียบตำแหน่งว่างกับจับคู่สำเร็จ
                </Typography>
                <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                  ปี {selectedYear}{selectedUnit !== 'all' && ` • หน่วย: ${selectedUnit}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    bgcolor: 'rgba(158, 158, 158, 0.8)' 
                  }} />
                  <Typography variant="body2" fontSize="0.85rem" fontWeight={500}>
                    ตำแหน่งว่าง
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    bgcolor: '#1DE9B6' 
                  }} />
                  <Typography variant="body2" fontSize="0.85rem" fontWeight={500}>
                    จับคู่สำเร็จ
                  </Typography>
                </Box>
              </Box>
            </Box>
            
          </Box>
          <Box sx={{ p: 3, bgcolor: 'white', height: { xs: 350, sm: 400, md: 450 }, position: 'relative' }}>
            {loading ? (
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
              bgcolor: 'white',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="h6" fontWeight={700} mb={0.5} color="text.primary">
                สถิติตำแหน่งว่างแยกตามประเภท
              </Typography>
              <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                ปี {selectedYear} 
                {selectedUnit !== 'all' && ` • หน่วย: ${selectedUnit}`}
              </Typography>
            </Box>
            <TableContainer sx={{ bgcolor: 'white' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      py: 2, 
                      fontSize: '0.8rem', 
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      PosCode
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      py: 2, 
                      fontSize: '0.8rem', 
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      ชื่อตำแหน่ง
                    </TableCell>
                    <TableCell align="center" sx={{ 
                      fontWeight: 600, 
                      py: 2, 
                      fontSize: '0.8rem', 
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      ตำแหน่งว่าง
                    </TableCell>
                    <TableCell align="center" sx={{ 
                      fontWeight: 600, 
                      py: 2, 
                      fontSize: '0.8rem', 
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      ผู้สมัคร
                    </TableCell>
                    <TableCell align="center" sx={{ 
                      fontWeight: 600, 
                      py: 2, 
                      fontSize: '0.8rem', 
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      จับคู่แล้ว
                    </TableCell>
                    <TableCell align="center" sx={{ 
                      fontWeight: 600, 
                      py: 2, 
                      fontSize: '0.8rem', 
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      รอจับคู่
                    </TableCell>
                    <TableCell align="center" sx={{ 
                      fontWeight: 600, 
                      py: 2, 
                      fontSize: '0.8rem', 
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      อัตราความสำเร็จ
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
                        '&:hover': { bgcolor: 'rgba(124, 93, 250, 0.08)' },
                        transition: 'all 0.2s',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <TableCell sx={{ py: 2.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: DASHBOARD_COLORS.primarySoft,
                          color: DASHBOARD_COLORS.primary,
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          minWidth: 50
                        }}>
                          {position.posCodeId}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Typography variant="body2" fontWeight={500} color="#424242" fontSize="0.875rem">
                          {position.posCodeName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        {hasSlotData ? (
                          <Box sx={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: DASHBOARD_COLORS.primarySoft,
                            color: DASHBOARD_COLORS.primary,
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            px: 2,
                            py: 0.75,
                            borderRadius: 2,
                            minWidth: 60
                          }}>
                            {position.availableSlots}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Typography variant="body2" fontWeight={600} color="#424242" fontSize="0.875rem">
                          {position.totalApplicants}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: DASHBOARD_COLORS.accentSoft,
                          color: DASHBOARD_COLORS.accent,
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          px: 2,
                          py: 0.75,
                          borderRadius: 2,
                          minWidth: 60
                        }}>
                          {position.assignedCount}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: DASHBOARD_COLORS.pinkSoft,
                          color: DASHBOARD_COLORS.pink,
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          px: 2,
                          py: 0.75,
                          borderRadius: 2,
                          minWidth: 60
                        }}>
                          {position.pendingCount}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 2.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Box sx={{ flex: 1, bgcolor: 'rgba(29, 233, 182, 0.12)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
                            <Box sx={{ 
                              height: '100%', 
                              width: `${position.assignmentRate}%`,
                              background: 'linear-gradient(90deg, #1DE9B6 0%, #00BFA5 100%)',
                              borderRadius: 3,
                              transition: 'width 0.3s ease'
                            }} />
                          </Box>
                          <Typography variant="body2" fontWeight={700} fontSize="0.875rem" sx={{ minWidth: 45, color: '#00BFA5' }}>
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
                  <TrendingUp sx={{ fontSize: 20, color: DASHBOARD_COLORS.primary }} />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    ตำแหน่งที่มีผู้สมัครมากที่สุด
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                </Typography>
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
                  <LocationOn sx={{ fontSize: 20, color: DASHBOARD_COLORS.accent }} />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    ตำแหน่งที่รอจับคู่มากที่สุด
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                </Typography>
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
                      <CheckCircle sx={{ fontSize: 48, color: DASHBOARD_COLORS.primary, mb: 1 }} />
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