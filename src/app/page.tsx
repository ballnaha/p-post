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
  Stack,
  Skeleton
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

// Enhanced skeleton animations
const SKELETON_STYLES = {
  shimmerKeyframes: {
    '@keyframes shimmer': {
      '0%': {
        backgroundPosition: '-200px 0'
      },
      '100%': {
        backgroundPosition: 'calc(200px + 100%) 0'
      }
    },
    '@keyframes pulseGlow': {
      '0%, 100%': {
        opacity: 1,
        boxShadow: '0 0 0 rgba(29, 233, 182, 0)'
      },
      '50%': {
        opacity: 0.8,
        boxShadow: '0 0 20px rgba(29, 233, 182, 0.1)'
      }
    },
    '@keyframes breathe': {
      '0%, 100%': {
        transform: 'scale(1)'
      },
      '50%': {
        transform: 'scale(1.02)'
      }
    }
  },
  enhanced: {
    background: 'linear-gradient(90deg, #f0f0f0 0px, rgba(255,255,255,0.8) 40px, #f0f0f0 80px)',
    backgroundSize: '400px',
    animation: 'shimmer 2s infinite linear, pulseGlow 3s infinite ease-in-out',
    borderRadius: '8px'
  }
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
  matchedVacantPositions?: number; // จำนวนตำแหน่งว่างที่จับคู่ไปแล้ว
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
  const [initialLoading, setInitialLoading] = useState(true); // เฉพาะครั้งแรกที่โหลดหน้า
  const [filterLoading, setFilterLoading] = useState(false); // เมื่อ filter เปลี่ยน
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [selectedUnit, setSelectedUnit] = useState<string>('all'); // filter ทั้งหน้า dashboard
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Prevent scroll when loading on mobile (เฉพาะครั้งแรก)
  useEffect(() => {
    if (initialLoading) {
      // เช็คว่าเป็น mobile หรือไม่
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        // เก็บ scroll position ปัจจุบัน
        const scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${scrollY}px`;
        
        return () => {
          // คืนค่า scroll position เมื่อเสร็จ loading
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.top = '';
          window.scrollTo(0, scrollY);
        };
      }
    }
  }, [initialLoading]);

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
        // ใช้ filter loading เมื่อไม่ใช่ครั้งแรก
        if (stats !== null) {
          setFilterLoading(true);
        } else {
          setInitialLoading(true);
        }
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
        setInitialLoading(false);
        setFilterLoading(false);
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
          label: 'จับคู่ตำแหน่งว่างแล้ว',
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
          label: 'ตำแหน่งว่าง (รอจับคู่)',
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
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        padding: 18,
        cornerRadius: 10,
        titleFont: {
          family: "'Noto Sans Thai', sans-serif",
          size: 15,
          weight: 'bold',
        },
        bodyFont: {
          family: "'Noto Sans Thai', sans-serif",
          size: 13,
          weight: '500',
        },
        bodySpacing: 8,
        displayColors: true,
        boxWidth: 12,
        boxHeight: 12,
        boxPadding: 6,
        callbacks: {
          title: function(tooltipItems: any) {
            return 'ตำแหน่ง: ' + tooltipItems[0].label;
          },
          label: function(context: any) {
            let label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label) {
              label += ': ';
            }
            label += value.toLocaleString() + ' คน';
            return label;
          },
          afterBody: function(tooltipItems: any) {
            if (!chartDataRaw) return [];
            const dataIndex = tooltipItems[0].dataIndex;
            const assigned = chartDataRaw[dataIndex]?.totalApplicants || 0;
            const vacant = chartDataRaw[dataIndex]?.vacantSlots || 0;
            const total = assigned + vacant;
            const percentage = total > 0 ? ((assigned / total) * 100).toFixed(1) : '0.0';
            return [
              '',
              `รวมทั้งหมด: ${total.toLocaleString()} ตำแหน่ง`,
              `อัตราจับคู่: ${percentage}%`
            ];
          }
        }
      },
      datalabels: {
        display: function(context: any) {
          return context.dataset.data[context.dataIndex] > 0;
        },
        color: function(context: any) {
          // ถ้าเป็น dataset ตำแหน่งว่าง ใช้สีเข้ม
          if (context.dataset.label === 'ตำแหน่งว่าง (รอจับคู่)') {
            return '#424242';
          }
          return '#ffffff';
        },
        font: {
          family: "'Noto Sans Thai', sans-serif",
          size: 12,
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
        textStrokeColor: function(context: any) {
          if (context.dataset.label === 'ตำแหน่งว่าง (รอจับคู่)') {
            return 'rgba(255, 255, 255, 0.3)';
          }
          return 'rgba(0, 0, 0, 0.3)';
        },
        textStrokeWidth: 2,
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

  if (initialLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        bgcolor: '#f5f7fa',
        zIndex: 9999,
        overflow: 'hidden',
      }}>
          <Stack 
            direction="column"
            alignItems="center"
            spacing={2.5}
            sx={{
              animation: 'fadeIn 0.5s ease-in-out',
              '@keyframes fadeIn': {
                '0%': { opacity: 0, transform: 'translateY(-10px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' }
              }
            }}
          >
            <Box sx={{ position: 'relative' }}>
              
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: 'rgba(29, 233, 182, 0.1)',
                  }}
                />
              </Box>
            </Box>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                fontWeight: 600,
                letterSpacing: 0.5,
                fontSize: '1rem'
              }}
            >
              กำลังโหลดข้อมูล...
            </Typography>
          </Stack>
        </Box>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 'calc(100vh - 120px)',
          p: 3,
          overflow: 'hidden',
        }}>
          <Alert 
            severity="error"
            sx={{ 
              maxWidth: 600,
              width: '100%',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)',
              '& .MuiAlert-icon': {
                fontSize: 28
              }
            }}
          >
            <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
              เกิดข้อผิดพลาด
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </Box>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 'calc(100vh - 120px)',
          p: 3,
          overflow: 'hidden',
        }}>
          <Alert 
            severity="info"
            sx={{ 
              maxWidth: 600,
              width: '100%',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)',
              '& .MuiAlert-icon': {
                fontSize: 28
              }
            }}
          >
            <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
              ไม่พบข้อมูล
            </Typography>
            <Typography variant="body2">
              กรุณาตรวจสอบการตั้งค่าหรือลองใหม่อีกครั้ง
            </Typography>
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header with Year Filter */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4, 
          flexWrap: 'wrap', 
          gap: 3,
          animation: 'slideDown 0.6s ease-out',
          '@keyframes slideDown': {
            '0%': { opacity: 0, transform: 'translateY(-20px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
          <Box>
            <Typography 
              variant="h4" 
              fontWeight={800} 
              mb={0.5}
              sx={{
                background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Dashboard
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap'
              }}
            >
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BarChartIcon sx={{ fontSize: 16 }} />
                ระบบจัดการตำแหน่งตำรวจ
              </Box>
              <Box component="span" sx={{ color: '#1DE9B6', fontWeight: 700 }}>
                • ปี {selectedYear}
              </Box>
              {selectedUnit !== 'all' && (
                <Box component="span" sx={{ color: '#42a5f5', fontWeight: 600 }}>
                  • {selectedUnit}
                </Box>
              )}
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexWrap: 'wrap',
            animation: 'slideLeft 0.6s ease-out 0.2s backwards',
            '@keyframes slideLeft': {
              '0%': { opacity: 0, transform: 'translateX(20px)' },
              '100%': { opacity: 1, transform: 'translateX(0)' }
            }
          }}>
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'white',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(29, 233, 182, 0.15)',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 16px rgba(29, 233, 182, 0.25)',
                  }
                }
              }}
            >
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
            
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 200,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'white',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(66, 165, 245, 0.15)',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 16px rgba(66, 165, 245, 0.25)',
                  }
                }
              }}
            >
              <InputLabel id="unit-filter-label">หน่วย</InputLabel>
              <Select
                labelId="unit-filter-label"
                id="unit-filter"
                value={selectedUnit}
                label="หน่วย"
                onChange={handleUnitChange}
                disabled={filterLoading}
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
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, 
          gap: 3, 
          mb: 4,
          position: 'relative',
          animation: 'fadeInUp 0.8s ease-out 0.3s backwards',
          '@keyframes fadeInUp': {
            '0%': { opacity: 0, transform: 'translateY(30px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
          {/* Filter Loading Overlay for Stats Cards */}
          {filterLoading && (
            <Box sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(248, 249, 250, 0.98)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              gap: 3,
              zIndex: 2,
              borderRadius: 2,
              animation: 'fadeInScale 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              '@keyframes fadeInScale': {
                '0%': { opacity: 0, transform: 'scale(0.98)' },
                '100%': { opacity: 1, transform: 'scale(1)' }
              }
            }}>
              {/* Enhanced Skeleton Cards */}
              {[1, 2, 3].map((index) => (
                <Card key={index} sx={{
                  flex: 1,
                  borderRadius: 3,
                  overflow: 'hidden',
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  transform: `translateY(${index * 2}px)`,
                  animation: `shimmerSlide 1.8s ease-in-out infinite ${index * 0.2}s`,
                  '@keyframes shimmerSlide': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(2px)' }
                  },
                  '& .MuiSkeleton-root': {
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    '&::after': {
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
                      animationDuration: '2s',
                      animationDelay: `${index * 0.3}s`,
                    }
                  }
                }}>
                  <CardContent sx={{ p: 3.5 }}>
                    {/* Enhanced Header skeleton */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <Skeleton 
                        variant="rectangular" 
                        width={48} 
                        height={48} 
                        sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.1), rgba(0, 191, 165, 0.15))'
                        }}
                        animation="wave"
                      />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton 
                          variant="text" 
                          width="65%" 
                          height={14} 
                          sx={{ mb: 0.8, borderRadius: 2 }}
                          animation="wave"
                        />
                        <Skeleton 
                          variant="text" 
                          width="85%" 
                          height={22}
                          sx={{ mb: 0.5, borderRadius: 2 }}
                          animation="wave"
                        />
                        <Skeleton 
                          variant="text" 
                          width="45%" 
                          height={12}
                          sx={{ borderRadius: 2 }}
                          animation="wave"
                        />
                      </Box>
                    </Box>
                    
                    {/* Enhanced Main number skeleton */}
                    <Box sx={{ mb: 3 }}>
                      <Skeleton 
                        variant="text" 
                        width="75%" 
                        height={48} 
                        sx={{ 
                          mb: 1, 
                          borderRadius: 3,
                          background: 'linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03), rgba(0,0,0,0.06))'
                        }}
                        animation="wave"
                      />
                      <Skeleton 
                        variant="text" 
                        width="95%" 
                        height={16}
                        sx={{ borderRadius: 2 }}
                        animation="wave"
                      />
                    </Box>
                    
                    {/* Enhanced Divider skeleton */}
                    <Skeleton 
                      variant="rectangular" 
                      width="100%" 
                      height={2} 
                      sx={{ 
                        mb: 3, 
                        borderRadius: 1,
                        background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)'
                      }}
                      animation="wave"
                    />
                    
                    {/* Enhanced Bottom content skeleton */}
                    <Box sx={{ 
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(248, 249, 250, 0.5)'
                    }}>
                      <Skeleton 
                        variant="text" 
                        width="65%" 
                        height={28} 
                        sx={{ mb: 0.5, mx: 'auto', borderRadius: 2 }}
                        animation="wave"
                      />
                      <Skeleton 
                        variant="text" 
                        width="85%" 
                        height={14} 
                        sx={{ mx: 'auto', borderRadius: 2 }}
                        animation="wave"
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
          
          {/* Vacant Position Summary Card */}
          <Card
            sx={{
              position: 'relative',
              borderRadius: 2,
              p: 0,
              background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
              color: 'common.white',
              boxShadow: '0 18px 35px rgba(29, 233, 182, 0.32)',
              overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 24px 48px rgba(29, 233, 182, 0.4)',
              }
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
                <Typography variant="caption" sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                  อัตราการจับคู่ตำแหน่งว่างสำเร็จ
                </Typography>
              </Box>

              <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Sub Stats Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.2 }}>
                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.05rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.assignedPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    มีคนดำรง
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.05rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.totalApplicants.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    ตำแหน่งว่าง
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.05rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {(stats.matchedVacantPositions || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    จับคู่แล้ว
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.05rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.pendingPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    รอจับคู่
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Swap Position Card */}
          <Card
            sx={{
              position: 'relative',
              borderRadius: 2,
              p: 0,
              background: 'linear-gradient(135deg, #42a5f5 0%, #64b5f6 100%)',
              color: 'common.white',
              boxShadow: '0 18px 36px rgba(66, 165, 245, 0.32)',
              overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'fadeInUp 0.8s ease-out 0.4s backwards',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 24px 48px rgba(66, 165, 245, 0.4)',
              }
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
                <Typography variant="caption" sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                  จำนวนคนที่สลับตำแหน่งทั้งหมด (Two-way)
                </Typography>
              </Box>

              <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
                <Box sx={{ textAlign: 'center', p: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.05rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.completedSwapCount.toLocaleString()} คน
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    สลับสำเร็จแล้ว
                  </Typography>
                </Box>
                
              </Box>
            </CardContent>
          </Card>

          {/* Three-Way Swap Card */}
          <Card
            sx={{
              position: 'relative',
              borderRadius: 2,
              p: 0,
              background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
              color: 'common.white',
              boxShadow: '0 18px 36px rgba(255, 152, 0, 0.32)',
              overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'fadeInUp 0.8s ease-out 0.5s backwards',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 24px 48px rgba(255, 152, 0, 0.4)',
              }
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
                <Typography variant="caption" sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                  จำนวนคนที่สลับตำแหน่งทั้งหมด (Three-way)
                </Typography>
              </Box>

              <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5 }}>
                <Box sx={{ textAlign: 'center', p: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="1.05rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.completedThreeWaySwapCount.toLocaleString()} คน
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    สลับสำเร็จแล้ว
                  </Typography>
                </Box>
                
              </Box>
            </CardContent>
          </Card>

        </Box>

        {/* Bar Chart: Vacant Positions vs Applicants */}
        <Paper sx={{ 
          borderRadius: 2, 
          mb: 4, 
          overflow: 'hidden', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.3s ease',
          animation: 'fadeInUp 0.8s ease-out 0.6s backwards',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}>
          <Box sx={{ 
            p: 3.5, 
            pb: 3,
            bgcolor: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
            borderBottom: '2px solid',
            borderColor: 'divider',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #1DE9B6 0%, #42a5f5 100%)',
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(29, 233, 182, 0.3)',
                    }}
                  >
                    <BarChartIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    เปรียบเทียบตำแหน่งว่างกับจับคู่สำเร็จ
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" fontSize="0.875rem" sx={{ ml: 5.5 }}>
                  แยกตามรหัสตำแหน่ง (POS Code) • ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                </Typography>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 3,
                bgcolor: 'white',
                px: 2.5,
                py: 1.5,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: 1,
                    background: 'linear-gradient(135deg, #1DE9B6, #00BFA5)',
                    boxShadow: '0 2px 6px rgba(29, 233, 182, 0.35)',
                  }} />
                  <Box>
                    <Typography variant="body2" fontSize="0.85rem" fontWeight={700} color="text.primary">
                      จับคู่ตำแหน่งว่างแล้ว
                    </Typography>
                   
                  </Box>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: 1,
                    background: 'linear-gradient(135deg, rgba(158, 158, 158, 0.9), rgba(189, 189, 189, 0.7))',
                    boxShadow: '0 2px 6px rgba(158, 158, 158, 0.25)',
                  }} />
                  <Box>
                    <Typography variant="body2" fontSize="0.85rem" fontWeight={700} color="text.primary">
                      ตำแหน่งว่าง
                    </Typography>
                    
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
          <Box sx={{ 
            p: 4, 
            bgcolor: 'white', 
            height: { xs: 380, sm: 420, md: 480 }, 
            position: 'relative' 
          }}>
            {/* Enhanced Filter Loading Overlay */}
            {filterLoading && (
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(145deg, rgba(248, 249, 250, 0.98), rgba(255, 255, 255, 0.95))',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                p: 4,
                zIndex: 1,
                borderRadius: '0 0 16px 16px',
                animation: 'slideInChart 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                '@keyframes slideInChart': {
                  '0%': { opacity: 0, transform: 'translateY(-10px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}>
                {/* Enhanced Chart title skeleton */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Skeleton 
                      variant="rectangular" 
                      width={40} 
                      height={40} 
                      sx={{ 
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.15), rgba(66, 165, 245, 0.15))'
                      }}
                      animation="wave"
                    />
                    <Skeleton 
                      variant="text" 
                      width="45%" 
                      height={28} 
                      sx={{ borderRadius: 3 }}
                      animation="wave"
                    />
                  </Box>
                  <Skeleton 
                    variant="text" 
                    width="65%" 
                    height={18}
                    sx={{ borderRadius: 2, ml: 7 }}
                    animation="wave"
                  />
                </Box>
                
                {/* Enhanced Chart bars skeleton with glassmorphism */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'end', 
                  gap: 3, 
                  height: '100%', 
                  pt: 3,
                  pb: 5,
                  px: 2,
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(8px)',
                }}>
                  {[85, 50, 95, 35, 70, 90].map((height, index) => (
                    <Box key={index} sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      height: '100%',
                      animation: `barFloat 2s ease-in-out infinite ${index * 0.2}s`,
                      '@keyframes barFloat': {
                        '0%, 100%': { transform: 'translateY(0)' },
                        '50%': { transform: 'translateY(-2px)' }
                      }
                    }}>
                      <Skeleton 
                        variant="rectangular" 
                        width="100%" 
                        height={`${height}%`}
                        sx={{ 
                          borderRadius: '24px 24px 8px 8px',
                          mb: 2,
                          background: index % 2 === 0 
                            ? 'linear-gradient(180deg, rgba(29, 233, 182, 0.2), rgba(29, 233, 182, 0.05))'
                            : 'linear-gradient(180deg, rgba(158, 158, 158, 0.15), rgba(189, 189, 189, 0.05))',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          backdropFilter: 'blur(4px)',
                          position: 'relative',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                            animation: `slideShimmer 2s infinite ${index * 0.3}s`,
                          },
                          '@keyframes slideShimmer': {
                            '0%': { left: '-100%' },
                            '100%': { left: '100%' }
                          }
                        }}
                        animation="wave"
                      />
                      <Skeleton 
                        variant="text" 
                        width="85%" 
                        height={16}
                        sx={{ borderRadius: 2 }}
                        animation="wave"
                      />
                    </Box>
                  ))}
                </Box>
                
                {/* Chart legend skeleton */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  gap: 4,
                  mt: 3,
                  p: 2,
                  borderRadius: 2,
                  background: 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  {[1, 2].map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Skeleton 
                        variant="rectangular" 
                        width={20} 
                        height={20} 
                        sx={{ borderRadius: 1 }}
                        animation="wave"
                      />
                      <Skeleton 
                        variant="text" 
                        width={120} 
                        height={16}
                        sx={{ borderRadius: 2 }}
                        animation="wave"
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            
            {/* Chart Content */}
            {chartData ? (
              <Bar data={chartData} options={chartOptions} />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                  }}
                >
                  <BarChartIcon sx={{ fontSize: 32, color: 'grey.400' }} />
                </Box>
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  ไม่พบข้อมูล
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ไม่มีข้อมูลสำหรับช่วงเวลาที่เลือก
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Details by Position Table */}
        {stats.positionDetails && stats.positionDetails.length > 0 && (
          <Paper sx={{ 
            borderRadius: 2, 
            mb: 4, 
            overflow: 'hidden', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.3s ease',
            animation: 'fadeInUp 0.8s ease-out 0.7s backwards',
            position: 'relative',
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            }
          }}>
            {/* Enhanced Filter Loading Overlay for Table */}
            {filterLoading && (
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(145deg, rgba(248, 249, 250, 0.98), rgba(255, 255, 255, 0.95))',
                backdropFilter: 'blur(12px)',
                zIndex: 2,
                borderRadius: 3,
                animation: 'slideInTable 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                '@keyframes slideInTable': {
                  '0%': { opacity: 0, transform: 'scale(0.98)' },
                  '100%': { opacity: 1, transform: 'scale(1)' }
                }
              }}>
                {/* Enhanced Table header skeleton */}
                <Box sx={{ 
                  p: 4, 
                  pb: 3,
                  borderBottom: '2px solid rgba(240, 242, 247, 0.8)',
                  background: 'linear-gradient(135deg, rgba(248, 249, 250, 0.9), rgba(255, 255, 255, 0.9))'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Skeleton 
                      variant="rectangular" 
                      width={40} 
                      height={40} 
                      sx={{ 
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, rgba(124, 93, 250, 0.15), rgba(157, 127, 250, 0.15))'
                      }}
                      animation="wave"
                    />
                    <Skeleton 
                      variant="text" 
                      width="45%" 
                      height={28}
                      sx={{ borderRadius: 3 }}
                      animation="wave"
                    />
                  </Box>
                  <Skeleton 
                    variant="text" 
                    width="65%" 
                    height={18} 
                    sx={{ ml: 6.5, borderRadius: 2 }}
                    animation="wave"
                  />
                </Box>
                
                {/* Enhanced Table content skeleton */}
                <Box sx={{ p: 4 }}>
                  <TableContainer sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ 
                          bgcolor: 'rgba(250, 250, 250, 0.8)',
                          '& .MuiTableCell-root': { border: 'none' }
                        }}>
                          {['PosCode', 'ชื่อตำแหน่ง', 'ตำแหน่งว่าง', 'ผู้สมัคร', 'จับคู่แล้ว', 'รอจับคู่', 'อัตราความสำเร็จ'].map((header, index) => (
                            <TableCell key={index}>
                              <Skeleton 
                                variant="text" 
                                width={index === 1 ? "95%" : "75%"} 
                                height={18}
                                sx={{ 
                                  borderRadius: 2,
                                  '&::after': {
                                    animationDelay: `${index * 0.1}s`,
                                  }
                                }}
                                animation="wave"
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[1, 2, 3, 4, 5].map((row) => (
                          <TableRow 
                            key={row} 
                            sx={{ 
                              '& .MuiTableCell-root': { 
                                border: 'none',
                                borderBottom: '1px solid rgba(224, 224, 224, 0.3)'
                              },
                              '&:hover': {
                                bgcolor: 'rgba(248, 249, 250, 0.5)'
                              },
                              animation: `fadeInRow 0.5s ease-out ${row * 0.1}s backwards`,
                              '@keyframes fadeInRow': {
                                '0%': { opacity: 0, transform: 'translateX(-10px)' },
                                '100%': { opacity: 1, transform: 'translateX(0)' }
                              }
                            }}
                          >
                            {[1, 2, 3, 4, 5, 6, 7].map((cell) => (
                              <TableCell key={cell}>
                                <Skeleton 
                                  variant={cell === 2 ? "text" : cell === 7 ? "rectangular" : "text"}
                                  width={cell === 2 ? "85%" : cell === 7 ? "80%" : "65%"} 
                                  height={cell === 7 ? 24 : 16}
                                  sx={{ 
                                    borderRadius: cell === 7 ? 3 : 2,
                                    background: cell === 7 
                                      ? 'linear-gradient(90deg, rgba(76, 175, 80, 0.1), rgba(129, 199, 132, 0.1))'
                                      : undefined,
                                    '&::after': {
                                      animationDelay: `${(row - 1) * 0.15 + cell * 0.05}s`,
                                    }
                                  }}
                                  animation="wave"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Enhanced pagination skeleton */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mt: 3,
                    p: 2,
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <Skeleton variant="text" width={150} height={20} sx={{ borderRadius: 2 }} animation="wave" />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {[1, 2, 3, 4].map((btn) => (
                        <Skeleton 
                          key={btn} 
                          variant="rectangular" 
                          width={32} 
                          height={32} 
                          sx={{ borderRadius: 2 }}
                          animation="wave"
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
            
            <Box sx={{ 
              p: 3.5, 
              pb: 3,
              bgcolor: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              borderBottom: '2px solid',
              borderColor: 'divider',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #7C5DFA 0%, #FF9A44 100%)',
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #7C5DFA 0%, #9D7FFA 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(124, 93, 250, 0.3)',
                  }}
                >
                  <PeopleAlt sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  สถิติตำแหน่งว่างแยกตามประเภท
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" fontSize="0.875rem" sx={{ ml: 5.5 }}>
                ปี {selectedYear} 
                {selectedUnit !== 'all' && ` • หน่วย: ${selectedUnit}`}
              </Typography>
            </Box>
            <TableContainer sx={{ bgcolor: 'white', maxHeight: 600 }}>
              <Table sx={{ '& .MuiTableCell-root': { px: 5 } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      py: 1, 
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
                      py: 1, 
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
                      py: 1, 
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
                      py: 1, 
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
                      py: 1, 
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
                      py: 1, 
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
                      py: 1, 
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
                      <TableCell sx={{ py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: DASHBOARD_COLORS.primarySoft,
                          color: DASHBOARD_COLORS.primary,
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1.5,
                          minWidth: 45
                        }}>
                          {position.posCodeId}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Typography variant="body2" fontWeight={500} color="#424242" fontSize="0.875rem">
                          {position.posCodeName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        {hasSlotData ? (
                          <Box sx={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: DASHBOARD_COLORS.primarySoft,
                            color: DASHBOARD_COLORS.primary,
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            px: 1.25,
                            py: 0.4,
                            borderRadius: 1.5,
                            minWidth: 50
                          }}>
                            {position.availableSlots}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Typography variant="body2" fontWeight={600} color="#424242" fontSize="0.875rem">
                          {position.totalApplicants}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: DASHBOARD_COLORS.accentSoft,
                          color: DASHBOARD_COLORS.accent,
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          px: 1.25,
                          py: 0.4,
                          borderRadius: 1.5,
                          minWidth: 50
                        }}>
                          {position.assignedCount}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: DASHBOARD_COLORS.pinkSoft,
                          color: DASHBOARD_COLORS.pink,
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          px: 1.25,
                          py: 0.4,
                          borderRadius: 1.5,
                          minWidth: 50
                        }}>
                          {position.pendingCount}
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.5, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <Box sx={{ flex: 1, bgcolor: 'rgba(29, 233, 182, 0.12)', borderRadius: 2, height: 5, overflow: 'hidden' }}>
                            <Box sx={{ 
                              height: '100%', 
                              width: `${position.assignmentRate}%`,
                              background: 'linear-gradient(90deg, #1DE9B6 0%, #00BFA5 100%)',
                              borderRadius: 2,
                              transition: 'width 0.3s ease'
                            }} />
                          </Box>
                          <Typography variant="body2" fontWeight={700} fontSize="0.875rem" sx={{ minWidth: 42, color: '#00BFA5' }}>
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
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
          gap: 3, 
          mb: 4,
          position: 'relative',
          animation: 'fadeInUp 0.8s ease-out 0.8s backwards',
        }}>
          {/* Enhanced Filter Loading Overlay for Summary Cards */}
          {filterLoading && (
            <Box sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(145deg, rgba(248, 249, 250, 0.98), rgba(255, 255, 255, 0.95))',
              backdropFilter: 'blur(12px)',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 3,
              zIndex: 2,
              borderRadius: 3,
              animation: 'slideInSummary 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              '@keyframes slideInSummary': {
                '0%': { opacity: 0, transform: 'translateY(20px) scale(0.95)' },
                '100%': { opacity: 1, transform: 'translateY(0) scale(1)' }
              }
            }}>
              {/* Enhanced Summary Card Skeleton 1 */}
              <Card sx={{ 
                borderRadius: 3, 
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                animation: 'cardFloat 3s ease-in-out infinite',
                '@keyframes cardFloat': {
                  '0%, 100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(-3px)' }
                },
                '& .MuiSkeleton-root': {
                  '&::after': {
                    background: 'linear-gradient(90deg, transparent, rgba(29, 233, 182, 0.3), transparent)',
                  }
                }
              }}>
                {/* Enhanced Header skeleton */}
                <Box sx={{ 
                  p: 2.5, 
                  pb: 2,
                  borderBottom: '2px solid rgba(240, 242, 247, 0.6)',
                  background: 'linear-gradient(135deg, rgba(248, 249, 250, 0.9), rgba(255, 255, 255, 0.9))',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #1DE9B6 0%, #00BFA5 100%)',
                    borderRadius: '0 0 2px 2px'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton 
                      variant="rectangular" 
                      width={32} 
                      height={32} 
                      sx={{ 
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.2), rgba(0, 191, 165, 0.15))'
                      }}
                      animation="wave"
                    />
                    <Box>
                      <Skeleton 
                        variant="text" 
                        width={200} 
                        height={22} 
                        sx={{ mb: 0.5, borderRadius: 3 }}
                        animation="wave"
                      />
                      <Skeleton 
                        variant="text" 
                        width={140} 
                        height={16}
                        sx={{ borderRadius: 2 }}
                        animation="wave"
                      />
                    </Box>
                  </Box>
                </Box>
                {/* Enhanced Content skeleton */}
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((item) => (
                      <Box 
                        key={item} 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          p: 1.5,
                          borderRadius: 2,
                          background: 'rgba(248, 249, 250, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.6)',
                          animation: `itemSlide 0.5s ease-out ${item * 0.1}s backwards`,
                          '@keyframes itemSlide': {
                            '0%': { opacity: 0, transform: 'translateX(-15px)' },
                            '100%': { opacity: 1, transform: 'translateX(0)' }
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Skeleton 
                            variant="rectangular" 
                            width={36} 
                            height={36} 
                            sx={{ 
                              borderRadius: 2,
                              background: item === 1 
                                ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 165, 0, 0.2))'
                                : item === 2 
                                  ? 'linear-gradient(135deg, rgba(192, 192, 192, 0.3), rgba(169, 169, 169, 0.2))'
                                  : 'linear-gradient(135deg, rgba(224, 224, 224, 0.3), rgba(189, 189, 189, 0.2))'
                            }}
                            animation="wave"
                          />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton 
                              variant="text" 
                              width="85%" 
                              height={18} 
                              sx={{ mb: 0.5, borderRadius: 2 }}
                              animation="wave"
                            />
                            <Skeleton 
                              variant="text" 
                              width="65%" 
                              height={14}
                              sx={{ borderRadius: 2 }}
                              animation="wave"
                            />
                          </Box>
                        </Box>
                        <Skeleton 
                          variant="rectangular" 
                          width={70} 
                          height={30} 
                          sx={{ 
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, rgba(227, 242, 253, 0.8), rgba(187, 222, 251, 0.6))'
                          }}
                          animation="wave"
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              {/* Enhanced Summary Card Skeleton 2 */}
              <Card sx={{ 
                borderRadius: 3, 
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                animation: 'cardFloat 3s ease-in-out infinite 0.5s',
                '& .MuiSkeleton-root': {
                  '&::after': {
                    background: 'linear-gradient(90deg, transparent, rgba(255, 154, 68, 0.3), transparent)',
                  }
                }
              }}>
                {/* Enhanced Header skeleton */}
                <Box sx={{ 
                  p: 2.5, 
                  pb: 2,
                  borderBottom: '2px solid rgba(240, 242, 247, 0.6)',
                  background: 'linear-gradient(135deg, rgba(248, 249, 250, 0.9), rgba(255, 255, 255, 0.9))',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #FF9A44 0%, #ff9800 100%)',
                    borderRadius: '0 0 2px 2px'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Skeleton 
                      variant="rectangular" 
                      width={32} 
                      height={32} 
                      sx={{ 
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(255, 154, 68, 0.2), rgba(255, 152, 0, 0.15))'
                      }}
                      animation="wave"
                    />
                    <Box>
                      <Skeleton 
                        variant="text" 
                        width={200} 
                        height={22} 
                        sx={{ mb: 0.5, borderRadius: 3 }}
                        animation="wave"
                      />
                      <Skeleton 
                        variant="text" 
                        width={140} 
                        height={16}
                        sx={{ borderRadius: 2 }}
                        animation="wave"
                      />
                    </Box>
                  </Box>
                </Box>
                {/* Enhanced Content skeleton */}
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[1, 2, 3, 4].map((item) => (
                      <Box 
                        key={item} 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          p: 1.5,
                          borderRadius: 2,
                          background: 'rgba(248, 249, 250, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.6)',
                          animation: `itemSlide 0.5s ease-out ${item * 0.15}s backwards`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Skeleton 
                            variant="rectangular" 
                            width={36} 
                            height={36} 
                            sx={{ 
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.15))'
                            }}
                            animation="wave"
                          />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton 
                              variant="text" 
                              width="85%" 
                              height={18} 
                              sx={{ mb: 0.5, borderRadius: 2 }}
                              animation="wave"
                            />
                            <Skeleton 
                              variant="text" 
                              width="65%" 
                              height={14}
                              sx={{ borderRadius: 2 }}
                              animation="wave"
                            />
                          </Box>
                        </Box>
                        <Skeleton 
                          variant="rectangular" 
                          width={70} 
                          height={30} 
                          sx={{ 
                            borderRadius: 3,
                            background: 'linear-gradient(135deg, rgba(255, 235, 238, 0.8), rgba(255, 205, 210, 0.6))'
                          }}
                          animation="wave"
                        />
                      </Box>
                    ))}
                  </Box>
                  
                  {/* Empty state skeleton for no pending positions */}
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 3,
                    mt: 2,
                    borderRadius: 2,
                    background: 'rgba(29, 233, 182, 0.05)',
                    border: '1px dashed rgba(29, 233, 182, 0.2)'
                  }}>
                    <Skeleton 
                      variant="circular" 
                      width={56} 
                      height={56} 
                      sx={{ 
                        mx: 'auto', 
                        mb: 2,
                        background: 'linear-gradient(135deg, rgba(29, 233, 182, 0.2), rgba(0, 191, 165, 0.15))'
                      }}
                      animation="wave"
                    />
                    <Skeleton 
                      variant="text" 
                      width="70%" 
                      height={20} 
                      sx={{ mb: 1, mx: 'auto', borderRadius: 2 }}
                      animation="wave"
                    />
                    <Skeleton 
                      variant="text" 
                      width="85%" 
                      height={16} 
                      sx={{ mx: 'auto', borderRadius: 2 }}
                      animation="wave"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
          
          {/* Top Positions with Most Applicants */}
          {stats.topRequestedPositions && stats.topRequestedPositions.length > 0 && (
            <Card sx={{ 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              }
            }}>
              <Box sx={{ 
                p: 2, 
                pb: 1.5,
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                borderBottom: '2px solid',
                borderColor: 'divider',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #1DE9B6 0%, #00BFA5 100%)',
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(29, 233, 182, 0.25)',
                    }}
                  >
                    <TrendingUp sx={{ fontSize: 16 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary" lineHeight={1.2}>
                      ตำแหน่งที่มีผู้สมัครมากที่สุด
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                      ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <CardContent sx={{ p: 2, bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {stats.topRequestedPositions.slice(0, 5).map((position, index) => (
                    <Box 
                      key={`${position.posCodeName}-${index}`}
                      sx={{
                        animation: `slideInLeft 0.5s ease-out ${index * 0.1}s backwards`,
                        '@keyframes slideInLeft': {
                          '0%': { opacity: 0, transform: 'translateX(-20px)' },
                          '100%': { opacity: 1, transform: 'translateX(0)' }
                        }
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1,
                        borderRadius: 1.5,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(29, 233, 182, 0.05)',
                          transform: 'translateX(4px)',
                        }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1 }}>
                          <Chip 
                            label={`#${index + 1}`} 
                            size="small"
                            sx={{ 
                              fontWeight: 700,
                              minWidth: 32,
                              height: 32,
                              fontSize: '0.9rem',
                              background: index === 0 
                                ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                                : index === 1 
                                  ? 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)'
                                  : index === 2
                                    ? 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)'
                                    : 'linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)',
                              color: 'white',
                              boxShadow: index < 3 ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mb: 0.3, fontSize: '0.95rem' }}>
                              {position.posCodeName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                              รหัส: {position.posCodeId}
                              {position.availableSlots !== undefined && (
                                <Box component="span" sx={{ color: '#1DE9B6', fontWeight: 600, ml: 1 }}>
                                  • ว่าง {position.availableSlots} ตำแหน่ง
                                </Box>
                              )}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip 
                          label={`${position.count} คน`}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
                            color: '#1565C0',
                            border: '1px solid #90CAF9',
                            fontSize: '0.8rem',
                            height: 26,
                            boxShadow: '0 2px 6px rgba(21, 101, 192, 0.15)'
                          }}
                        />
                      </Box>
                      {index < 4 && <Divider sx={{ mt: 1.5 }} />}
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
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              }
            }}>
              <Box sx={{ 
                p: 2, 
                pb: 1.5,
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                borderBottom: '2px solid',
                borderColor: 'divider',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #FF9A44 0%, #ff9800 100%)',
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      background: 'linear-gradient(135deg, #FF9A44 0%, #ff9800 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(255, 154, 68, 0.25)',
                    }}
                  >
                    <LocationOn sx={{ fontSize: 16 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary" lineHeight={1.2}>
                      ตำแหน่งที่รอจับคู่มากที่สุด
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
                      ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <CardContent sx={{ p: 2, bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {pendingPositionsSorted.map((position, index) => (
                    <Box 
                      key={position.posCodeId}
                      sx={{
                        animation: `slideInRight 0.5s ease-out ${index * 0.1}s backwards`,
                        '@keyframes slideInRight': {
                          '0%': { opacity: 0, transform: 'translateX(20px)' },
                          '100%': { opacity: 1, transform: 'translateX(0)' }
                        }
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1,
                        borderRadius: 1.5,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255, 154, 68, 0.05)',
                          transform: 'translateX(-4px)',
                        }
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1 }}>
                          <Chip 
                            label={`#${index + 1}`} 
                            size="small"
                            sx={{ 
                              fontWeight: 700,
                              minWidth: 32,
                              height: 32,
                              fontSize: '0.9rem',
                              background: index === 0 
                                ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
                                : index === 1 
                                  ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
                                  : 'linear-gradient(135deg, #ffb74d 0%, #ffa726 100%)',
                              color: 'white',
                              boxShadow: index < 2 ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mb: 0.3, fontSize: '0.95rem' }}>
                              {position.posCodeName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                              รหัส: {position.posCodeId}
                              <Box component="span" sx={{ color: '#42a5f5', fontWeight: 600, ml: 1 }}>
                                • ผู้สมัคร {position.totalApplicants} คน
                              </Box>
                            </Typography>
                          </Box>
                        </Box>
                        <Chip 
                          label={`${position.pendingCount} คน`}
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
                            color: '#E65100',
                            border: '1px solid #FFB74D',
                            fontSize: '0.8rem',
                            height: 26,
                            boxShadow: '0 2px 6px rgba(230, 81, 0, 0.15)'
                          }}
                        />
                      </Box>
                      {index < 4 && <Divider sx={{ mt: 1.5 }} />}
                    </Box>
                  ))}
                  {!hasPendingPositions && (
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 4,
                      animation: 'scaleIn 0.5s ease-out',
                      '@keyframes scaleIn': {
                        '0%': { opacity: 0, transform: 'scale(0.8)' },
                        '100%': { opacity: 1, transform: 'scale(1)' }
                      }
                    }}>
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          mb: 2,
                          boxShadow: '0 4px 20px rgba(29, 233, 182, 0.3)',
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 36, color: 'white' }} />
                      </Box>
                      <Typography variant="body2" color="text.primary" fontWeight={700} mb={0.5}>
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

        <Box sx={{ 
          mt: 6, 
          mb: 2,
          textAlign: 'center',
          animation: 'fadeIn 1s ease-out 1s backwards',
          '@keyframes fadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 }
          }
        }}>
          <Divider sx={{ mb: 3, maxWidth: 600, mx: 'auto' }} />
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 1,
              fontWeight: 500
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                bgcolor: '#1DE9B6',
                display: 'inline-block'
              }} 
            />
            {new Date().getFullYear() + 543} ระบบจัดการตำแหน่งตำรวจ
            <Box 
              component="span" 
              sx={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                bgcolor: '#1DE9B6',
                display: 'inline-block'
              }} 
            />
          </Typography>
        </Box>
      </Box>
    </Layout>
  );
}