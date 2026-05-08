'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
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
  Skeleton,
  Drawer,
  IconButton,
  TablePagination,
  LinearProgress
} from '@mui/material';
import {
  AssignmentTurnedIn,
  SwapHoriz,
  Person,
  TrendingUp,
  CheckCircle,
  HelpOutline,
  PeopleAlt,
  BarChart as BarChartIcon,
  ChangeHistory,
  TrendingFlat as TrendingFlatIcon,
  Close as CloseIcon,
  Badge as BadgeIcon,
  CalendarToday,
  School
} from '@mui/icons-material';
import Layout from './components/Layout';
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
import { formatBuddhistDate } from '@/utils/dateFormat';

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
  teal: '#1DE9B6',
};

const DEFAULT_DASHBOARD_UNIT = 'น';

function resolveDashboardUnit(availableUnits: string[] = [], currentUnit: string) {
  if (currentUnit === 'all') {
    return 'all';
  }

  if (availableUnits.includes(currentUnit)) {
    return currentUnit;
  }

  if (availableUnits.includes(DEFAULT_DASHBOARD_UNIT)) {
    return DEFAULT_DASHBOARD_UNIT;
  }

  return 'all';
}

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

interface SupportedPersonnel {
  id: string;
  rank: string | null;
  fullName: string | null;
  age: string | null;
  position: string | null;
  posCode: string | null; // pos_code from police_personnel
  posCodeName: string | null; // pos_code_name from pos_code_master via join
  unit: string | null;
  supporterName: string | null;
  supportReason: string | null;
  isMatched: boolean; // ถูกจับคู่ตำแหน่งใหม่แล้ว
  newPosition?: string | null; // ตำแหน่งใหม่
  newPositionNumber?: string | null; // เลขตำแหน่งใหม่
  newPosCode?: string | null; // รหัสตำแหน่งใหม่
  newPosCodeName?: string | null; // ชื่อรหัสตำแหน่งใหม่
  newUnit?: string | null; // หน่วยใหม่
  transactionId?: string | null; // ID ของธุรกรรม
  // เพิ่มข้อมูลเพิ่มเติม
  noId?: number | string | null;
  positionNumber?: string | null;
  nationalId?: string | null;
  seniority?: string | null;
  education?: string | null;
  birthDate?: string | null;
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  yearsOfService?: string | null;
  actingAs?: string | null;
  trainingLocation?: string | null;
  trainingCourse?: string | null;
  notes?: string | null;
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
  totalTransfer: number; // จำนวนย้ายหน่วยทั้งหมด
  transferCrossUnit: number; // ย้ายข้ามหน่วย
  transferSameUnit: number; // ย้ายภายในหน่วย (คนมาแทน)
  completedSwapCount: number; // จำนวนคนที่สลับสำเร็จแล้วทั้งหมด
  completedThreeWaySwapCount: number; // จำนวนคนที่สลับสำเร็จแล้วแบบสามเส้า
  completedTransferCount: number; // จำนวนคนที่ย้ายหน่วยสำเร็จแล้ว
  totalPositionTypes: number;
  assignmentRate: number;
  positionDetails: PositionDetail[];
  transactionStatusSummary: Array<{
    label: string;
    count: number;
    type: string;
    transactions?: Array<{
      id: string;
      groupName: string | null;
      groupNumber: string | null;
      swapType: string;
      updatedAt: string;
    }>;
  }>;
  // เพิ่มข้อมูลตำแหน่งว่าง
  vacantSlotsSummary?: {
    totalVacantSlots: number; // จำนวนตำแหน่งว่างทั้งหมด
    filledSlots: number; // จำนวนที่ถูกจับคู่แล้ว
    remainingSlots: number; // จำนวนที่เหลือ
  };
  chartData?: ChartDataItem[]; // ข้อมูลกราฟใหม่
  availableUnits?: string[]; // รายการหน่วยทั้งหมด
  supportedPersonnel?: SupportedPersonnel[]; // ข้อมูลผู้ได้รับการสนับสนุน
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true); // เฉพาะครั้งแรกที่โหลดหน้า
  const [filterLoading, setFilterLoading] = useState(false); // เมื่อ filter เปลี่ยน
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [selectedUnit, setSelectedUnit] = useState<string>('all'); // filter ทั้งหน้า dashboard
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true); // ตรวจสอบว่าเป็นการโหลดครั้งแรกหรือไม่
  const [defaultUnitSet, setDefaultUnitSet] = useState(false); // ตรวจสอบว่าตั้งค่า default unit แล้วหรือยัง
  const latestRequestId = useRef(0);

  // Drilldown state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownData, setDrilldownData] = useState<any[]>([]);
  const [drilldownFilterType, setDrilldownFilterType] = useState<string>('all');

  // Supported Personnel Drawer state
  const [supportDrawerOpen, setSupportDrawerOpen] = useState(false);
  const [selectedSupportPerson, setSelectedSupportPerson] = useState<SupportedPersonnel | null>(null);

  const formatDate = formatBuddhistDate;

  // Pagination state for Supported Personnel
  const [supportPage, setSupportPage] = useState(0);
  const [supportRowsPerPage, setSupportRowsPerPage] = useState(10);

  const handleStatusClick = (status: any) => {
    if (status.transactions && status.transactions.length > 0) {
      // Show all transaction types
      setDrilldownTitle(status.label);
      setDrilldownData(status.transactions);
      setDrilldownFilterType('all');
      setDrilldownOpen(true);
    }
  };

  // Filter drilldown data based on selected type
  const filteredDrilldownData = useMemo(() => {
    // First filter: only show entries with non-empty group_name
    const dataWithGroupName = drilldownData.filter((tx) => tx.groupName && tx.groupName.trim() !== '');
    
    if (drilldownFilterType === 'all') {
      return dataWithGroupName;
    }
    return dataWithGroupName.filter((tx) => tx.swapType === drilldownFilterType);
  }, [drilldownData, drilldownFilterType]);

  // Pagination handlers for Supported Personnel
  const handleSupportChangePage = (_event: unknown, newPage: number) => {
    setSupportPage(newPage);
  };

  const handleSupportChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSupportRowsPerPage(parseInt(event.target.value, 10));
    setSupportPage(0);
  };

  // Handler for opening supported personnel drawer
  const handleSupportPersonClick = (person: SupportedPersonnel) => {
    setSelectedSupportPerson(person);
    setSupportDrawerOpen(true);
  };

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

  useEffect(() => {
    setSupportPage(0);
    setSelectedSupportPerson(null);
    setSupportDrawerOpen(false);
    setDrilldownOpen(false);
    setDrilldownData([]);
    setDrilldownFilterType('all');
  }, [selectedYear, selectedUnit]);

  useEffect(() => {
    const totalSupported = stats?.supportedPersonnel?.length ?? 0;
    const maxPage = totalSupported > 0 ? Math.max(0, Math.ceil(totalSupported / supportRowsPerPage) - 1) : 0;

    if (supportPage > maxPage) {
      setSupportPage(maxPage);
    }
  }, [stats?.supportedPersonnel?.length, supportPage, supportRowsPerPage]);

  // Fetch dashboard data (ขึ้นกับทั้ง year และ unit filter)
  useEffect(() => {
    const abortController = new AbortController();
    const requestId = ++latestRequestId.current;

    async function fetchDashboardData() {
      try {
        // กรณีโหลดครั้งแรก: โหลดเพื่อเอา availableUnits ก่อน
        if (isFirstLoad && !defaultUnitSet) {
          setInitialLoading(true); // เริ่มโหลด - จะไม่ปิดจนกว่าจะโหลดข้อมูลจริงเสร็จ
          setError(null);
          const url = `/api/dashboard?year=${selectedYear}&unit=all`;
          const response = await fetch(url, { signal: abortController.signal });

          if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
          }

          const result = await response.json();

          if (abortController.signal.aborted || requestId !== latestRequestId.current) {
            return;
          }

          if (result.success) {
            const resultAvailableUnits = result.data.availableUnits || [];
            setAvailableUnits(resultAvailableUnits);
            const defaultUnit = resolveDashboardUnit(resultAvailableUnits, DEFAULT_DASHBOARD_UNIT);
            setSelectedUnit(defaultUnit);
            setDefaultUnitSet(true);

            // ถ้า default unit คือ 'all' ให้ใช้ข้อมูลที่โหลดมาเลย
            if (defaultUnit === 'all') {
              setStats(result.data);
              setIsFirstLoad(false);
              setInitialLoading(false);
            }
            // ถ้าไม่ใช่ 'all' ไม่ต้องปิด initialLoading เพราะจะไปโหลดต่อ
          }
          return;
        }

        // กรณีปกติ: โหลดข้อมูลตาม filter ที่เลือก
        if (defaultUnitSet) {
          // ใช้ filter loading เมื่อไม่ใช่ครั้งแรก
          if (!isFirstLoad) {
            setFilterLoading(true);
          }
          // ถ้ายังเป็น firstLoad ไม่ต้อง set loading อีกเพราะ initialLoading ยังเป็น true อยู่แล้ว

          setError(null);
          const url = `/api/dashboard?year=${selectedYear}&unit=${selectedUnit}`;
          const response = await fetch(url, { signal: abortController.signal });

          if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
          }

          const result = await response.json();

          if (abortController.signal.aborted || requestId !== latestRequestId.current) {
            return;
          }

          if (result.success) {
            const resultAvailableUnits = result.data.availableUnits || [];
            setAvailableUnits(resultAvailableUnits);
            const resolvedUnit = resolveDashboardUnit(resultAvailableUnits, selectedUnit);

            if (resolvedUnit !== selectedUnit) {
              setSelectedUnit(resolvedUnit);
              return;
            }

            setStats(result.data);

            // ปิด loading หลังจากโหลดข้อมูลจริงเสร็จแล้ว
            if (isFirstLoad) {
              setIsFirstLoad(false);
              setInitialLoading(false);
            }
          } else {
            throw new Error(result.error || 'Failed to load data');
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        if (requestId !== latestRequestId.current) {
          return;
        }

        console.error('Failed to fetch dashboard data:', error);
        setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setIsFirstLoad(false);
        setInitialLoading(false);
      } finally {
        if (abortController.signal.aborted || requestId !== latestRequestId.current) {
          return;
        }

        // ปิด filterLoading เสมอ แต่ initialLoading จะปิดเฉพาะเมื่อโหลดเสร็จจริง
        setFilterLoading(false);
      }
    }

    if (selectedYear) {
      fetchDashboardData();
    }

    return () => {
      abortController.abort();
    };
  }, [selectedYear, selectedUnit, isFirstLoad, defaultUnitSet]); // ขึ้นกับทั้ง year, unit และ state flags

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setAvailableUnits([]);
    setSelectedYear(Number(event.target.value));
  };

  // Derived progress for matching status card (completed vs total)
  const matchingStatusTotals = useMemo(() => {
    if (!stats || !stats.transactionStatusSummary) {
      return { total: 0, completed: 0, percent: 0 };
    }
    const total = stats.transactionStatusSummary.reduce((sum, s) => sum + s.count, 0);
    const completed = stats.transactionStatusSummary
      .filter(s => s.type === 'completed')
      .reduce((sum, s) => sum + s.count, 0);
    const percent = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, percent };
  }, [stats]);

  const handleUnitChange = (event: SelectChangeEvent<string>) => {
    setSelectedUnit(event.target.value);
  };

  // Memoize sorted position details
  const sortedPositionDetails = useMemo(() => {
    if (!stats?.positionDetails) return [];
    // เรียงตาม posCodeId (ascending) เพื่อให้แสดงตามรหัสตำแหน่ง
    return [...stats.positionDetails].sort((a, b) => (a.posCodeId || 0) - (b.posCodeId || 0));
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
          title: function (tooltipItems: any) {
            return 'ตำแหน่ง: ' + tooltipItems[0].label;
          },
          label: function (context: any) {
            let label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label) {
              label += ': ';
            }
            label += value.toLocaleString() + ' คน';
            return label;
          },
          afterBody: function (tooltipItems: any) {
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
        display: function (context: any) {
          return context.dataset.data[context.dataIndex] > 0;
        },
        color: function (context: any) {
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
        formatter: function (value: number) {
          if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k';
          }
          return value.toLocaleString();
        },
        anchor: 'center' as const,
        align: 'center' as const,
        textStrokeColor: function (context: any) {
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
          callback: function (value: any) {
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

  const renderDashboardSkeleton = () => (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={50} sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    </Layout>
  );

  if (initialLoading) {
    return renderDashboardSkeleton();
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

  // ถ้ากำลังโหลดและยังไม่มีข้อมูล ให้รอจนกว่าจะโหลดเสร็จ
  if (!stats) {
    // ถ้าไม่ได้กำลังโหลด แสดง empty state
    if (!initialLoading && !filterLoading) {
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
    // ถ้ากำลังโหลด ให้แสดง loading skeleton
    return renderDashboardSkeleton();
  }

  // ถ้ากำลังโหลด (ไม่ว่าจะ initial หรือ filter) ให้แสดง skeleton
  if (initialLoading || filterLoading) {
    return renderDashboardSkeleton();
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
                {availableUnits.map((unit) => (
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
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4,
          position: 'relative',
          animation: 'fadeInUp 0.8s ease-out 0.3s backwards',
          '@keyframes fadeInUp': {
            '0%': { opacity: 0, transform: 'translateY(30px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
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
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, position: 'relative', zIndex: 1 }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(22, 63, 161, 0.25)',
                    color: 'common.white',
                  }}
                >
                  <AssignmentTurnedIn sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    fontSize="0.65rem"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.78)' }}
                  >
                    Position Assignment Rate
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    fontSize="0.9rem"
                    sx={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    จับคู่ตำแหน่งว่างกับบุคลากร
                  </Typography>
                  <Typography variant="caption" fontSize="0.65rem" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ fontSize: '1.8rem', lineHeight: 1, mb: 0.5, color: 'common.white' }}
                >
                  {stats.assignmentRate.toFixed(1)}%
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                  อัตราการจับคู่ตำแหน่งว่างสำเร็จ
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Sub Stats Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="0.9rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.totalApplicants.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    ตำแหน่งว่าง
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="0.9rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {(stats.matchedVacantPositions || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    จับคู่แล้ว
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="0.9rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.pendingPositions.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
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
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, position: 'relative', zIndex: 1 }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(137, 42, 24, 0.25)',
                    color: 'common.white',
                  }}
                >
                  <SwapHoriz sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    fontSize="0.65rem"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.78)' }}
                  >
                    Swap Positions
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    fontSize="0.9rem"
                    sx={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    สลับตำแหน่งทั้งหมด
                  </Typography>
                  <Typography variant="caption" fontSize="0.65rem" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ fontSize: '1.8rem', lineHeight: 1, mb: 0.5, color: 'common.white' }}
                >
                  {stats.totalSwapList.toLocaleString()} คน
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                  จำนวนคนที่สลับตำแหน่งทั้งหมด (Two-way)
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
                <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="0.9rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.completedSwapCount.toLocaleString()} คน
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
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
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, position: 'relative', zIndex: 1 }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(140, 33, 74, 0.25)',
                    color: 'common.white',
                  }}
                >
                  <ChangeHistory sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    fontSize="0.65rem"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.78)' }}
                  >
                    Three-Way Swap
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    fontSize="0.9rem"
                    sx={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    สามเส้าทั้งหมด
                  </Typography>
                  <Typography variant="caption" fontSize="0.65rem" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ fontSize: '1.8rem', lineHeight: 1, mb: 0.5, color: 'common.white' }}
                >
                  {stats.totalThreeWaySwap.toLocaleString()} คน
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                  จำนวนคนที่สลับตำแหน่งทั้งหมด (Three-way)
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>
                <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="0.9rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.completedThreeWaySwapCount.toLocaleString()} คน
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    สลับสำเร็จแล้ว
                  </Typography>
                </Box>

              </Box>
            </CardContent>
          </Card>

          {/* Transfer Card */}
          <Card
            sx={{
              position: 'relative',
              borderRadius: 2,
              p: 0,
              background: 'linear-gradient(135deg, #7C5DFA 0%, #B388FF 100%)',
              color: 'common.white',
              boxShadow: '0 18px 36px rgba(124, 93, 250, 0.32)',
              overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'fadeInUp 0.8s ease-out 0.6s backwards',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 24px 48px rgba(124, 93, 250, 0.4)',
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
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, position: 'relative', zIndex: 1 }}>
              {/* Header with Icon and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(83, 63, 161, 0.25)',
                    color: 'common.white',
                  }}
                >
                  <TrendingUp sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    fontSize="0.65rem"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(255,255,255,0.78)' }}
                  >
                    Transfer
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    fontSize="0.9rem"
                    sx={{ color: 'rgba(255,255,255,0.95)' }}
                  >
                    ย้ายหน่วย
                  </Typography>
                  <Typography variant="caption" fontSize="0.65rem" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                  </Typography>
                </Box>
              </Box>

              {/* Main Number */}
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  sx={{ fontSize: '1.8rem', lineHeight: 1, mb: 0.5, color: 'common.white' }}
                >
                  {stats.totalTransfer.toLocaleString()} คน
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                  จำนวนคนที่ย้ายหน่วยทั้งหมด
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.22)' }} />

              {/* Additional Info */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="0.9rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.transferCrossUnit.toLocaleString()} คน
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    ย้ายข้ามหน่วย
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 0.75, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.16)' }}>
                  <Typography variant="h6" fontWeight={700} fontSize="0.9rem" sx={{ mb: 0.25, color: 'common.white' }}>
                    {stats.transferSameUnit.toLocaleString()} คน
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>
                    คนมาแทน
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
            p: 2,
            pb: 1.5,
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
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(29, 233, 182, 0.3)',
                    }}
                  >
                    <BarChartIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="text.primary" fontSize="1rem">
                    เปรียบเทียบตำแหน่งว่างกับจับคู่สำเร็จ
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" fontSize="0.8rem" sx={{ ml: 5.5 }}>
                  แยกตามรหัสตำแหน่ง (POS Code) • ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                </Typography>
              </Box>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                bgcolor: 'white',
                px: 2,
                py: 1,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid',
                borderColor: 'divider',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 14,
                    height: 14,
                    borderRadius: 1,
                    background: 'linear-gradient(135deg, #1DE9B6, #00BFA5)',
                    boxShadow: '0 2px 6px rgba(29, 233, 182, 0.35)',
                  }} />
                  <Box>
                    <Typography variant="body2" fontSize="0.8rem" fontWeight={700} color="text.primary">
                      จับคู่ตำแหน่งว่างแล้ว
                    </Typography>

                  </Box>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 14,
                    height: 14,
                    borderRadius: 1,
                    background: 'linear-gradient(135deg, rgba(158, 158, 158, 0.9), rgba(189, 189, 189, 0.7))',
                    boxShadow: '0 2px 6px rgba(158, 158, 158, 0.25)',
                  }} />
                  <Box>
                    <Typography variant="body2" fontSize="0.8rem" fontWeight={700} color="text.primary">
                      ตำแหน่งว่าง
                    </Typography>

                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
          <Box sx={{
            p: 2,
            bgcolor: 'white',
            height: { xs: 300, sm: 340, md: 380 },
            position: 'relative'
          }}>
            {/* Chart Content */}
            {chartData ? (
              <Bar data={chartData} options={chartOptions} />
            ) : !initialLoading && !filterLoading && (
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
            <Box sx={{
              p: 2,
              pb: 1.5,
              bgcolor: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff  100%)',
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
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #7C5DFA 0%, #9D7FFA 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(124, 93, 250, 0.3)',
                  }}
                >
                  <PeopleAlt sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} color="text.primary" fontSize="1rem">
                  สถิติตำแหน่งว่างแยกตามประเภท
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" fontSize="0.8rem" sx={{ ml: 5.5 }}>
                ปี {selectedYear}
                {selectedUnit !== 'all' && ` • หน่วย: ${selectedUnit}`}
              </Typography>
            </Box>
            <TableContainer sx={{ bgcolor: 'white', maxHeight: 600 }}>
              <Table sx={{ '& .MuiTableCell-root': { px: 3 } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAFA' }}>
                    <TableCell sx={{
                      fontWeight: 600,
                      py: 1,
                      fontSize: '0.75rem',
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                    }}>
                      POSCODE
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      py: 1,
                      fontSize: '0.75rem',
                      color: '#424242',
                      borderBottom: '1px solid #E0E0E0',
                    }}>
                      ชื่อตำแหน่ง
                    </TableCell>
                    <TableCell align="center" sx={{
                      fontWeight: 600,
                      py: 1,
                      fontSize: '0.75rem',
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
                      fontSize: '0.75rem',
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
                      fontSize: '0.75rem',
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
                      fontSize: '0.75rem',
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
                        <TableCell sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                          <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: DASHBOARD_COLORS.primarySoft,
                            color: DASHBOARD_COLORS.primary,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1.5,
                            minWidth: 45
                          }}>
                            {position.posCodeId}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                          <Typography variant="body2" fontWeight={500} color="#424242" fontSize="0.8rem">
                            {position.posCodeName}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                          {hasSlotData ? (
                            <Box sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: DASHBOARD_COLORS.primarySoft,
                              color: DASHBOARD_COLORS.primary,
                              fontWeight: 700,
                              fontSize: '0.8rem',
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
                        <TableCell align="center" sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                          <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: DASHBOARD_COLORS.accentSoft,
                            color: DASHBOARD_COLORS.accent,
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            px: 1.25,
                            py: 0.4,
                            borderRadius: 1.5,
                            minWidth: 50
                          }}>
                            {position.assignedCount}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                          <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: DASHBOARD_COLORS.pinkSoft,
                            color: DASHBOARD_COLORS.pink,
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            px: 1.25,
                            py: 0.4,
                            borderRadius: 1.5,
                            minWidth: 50
                          }}>
                            {position.pendingCount}
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
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
                            <Typography variant="body2" fontWeight={700} fontSize="0.8rem" sx={{ minWidth: 42, color: '#00BFA5' }}>
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
          gridTemplateColumns: { xs: '1fr', md: '3fr 7fr' },
          gap: 3,
          mb: 4,
          position: 'relative',
          animation: 'fadeInUp 0.8s ease-out 0.8s backwards',
        }}>
          {/* Matching Progress Status */}
          {stats.transactionStatusSummary && stats.transactionStatusSummary.length > 0 && (
            <Card sx={{
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              }
            }}>
              <Box sx={{
                p: 1.25,
                pb: 0.75,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1.5,
                      background: 'linear-gradient(135deg, #1DE9B6 0%, #00BFA5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(29, 233, 182, 0.25)',
                    }}
                  >
                    <TrendingUp sx={{ fontSize: 14 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary" lineHeight={1.2} fontSize="0.9rem">
                      สถานะความคืบหน้าการจับคู่
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.2, fontSize: '0.7rem' }}>
                      ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                    </Typography>
                    
                    <Typography variant="caption" color="primary.main" display="block" sx={{ mt: 0.15, fontSize: '0.65rem', fontWeight: 600 }}>
                      คลิกสถานะแต่ละแถวเพื่อดูรายละเอียด
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <CardContent sx={{ p: 1.25, bgcolor: 'white', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                  {stats.transactionStatusSummary.map((status, index) => (
                    <Box
                      key={`${status.label}-${index}`}
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
                        p: 0.5,
                        borderRadius: 1.5,
                        transition: 'all 0.3s ease',
                        cursor: status.transactions && status.transactions.length > 0 ? 'pointer' : 'default',
                        '&:hover': {
                          bgcolor: 'rgba(29, 233, 182, 0.05)',
                          transform: 'translateX(4px)',
                        }
                      }}
                        onClick={() => handleStatusClick(status)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Box sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: status.type === 'completed'
                              ? 'linear-gradient(135deg, #00C853 0%, #69F0AE 100%)'
                              : 'linear-gradient(135deg, #FFD600 0%, #FFFF8D 100%)',
                            color: status.type === 'completed' ? 'white' : 'rgba(0,0,0,0.7)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                          }}>
                            {status.type === 'completed' ? <CheckCircle sx={{ fontSize: 16 }} /> : <TrendingFlatIcon sx={{ fontSize: 16 }} />}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ mb: 0.2, fontSize: '0.85rem' }}>
                              {status.label}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`${status.count} รายการ`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            background: status.type === 'completed'
                              ? 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)'
                              : 'linear-gradient(135deg, #FFFDE7 0%, #FFF9C4 100%)',
                            color: status.type === 'completed' ? '#2E7D32' : '#F57F17',
                            border: '1px solid',
                            borderColor: status.type === 'completed' ? '#A5D6A7' : '#FFF59D',
                            fontSize: '0.75rem',
                            height: 24,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                          }}
                        />
                      </Box>
                      {index < stats.transactionStatusSummary.length - 1 && <Divider sx={{ mt: 1 }} />}
                    </Box>
                  ))}
                </Box>
                {/* Summary & Progress */}
                <Divider sx={{ my: 1 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    รวม {matchingStatusTotals.total} รายการ • สำเร็จ {matchingStatusTotals.completed} ({matchingStatusTotals.percent.toFixed(1)}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={matchingStatusTotals.percent}
                    sx={{
                      mt: 0.75,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#e0f2f1',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #1DE9B6 0%, #00BFA5 100%)'
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Supported Personnel Card */}
          {stats.supportedPersonnel && (
            <Card sx={{
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              }
            }}>
              <Box sx={{
                p: 1.25,
                pb: 0.75,
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
                  background: 'linear-gradient(90deg, #7C5DFA 0%, #5B43C4 100%)',
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1.5,
                      background: 'linear-gradient(135deg, #7C5DFA 0%, #5B43C4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(124, 93, 250, 0.25)',
                    }}
                  >
                    <PeopleAlt sx={{ fontSize: 14 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary" lineHeight={1.2} fontSize="0.9rem">
                      ผู้ได้รับการสนับสนุน
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.2, fontSize: '0.7rem' }}>
                      ปี {selectedYear}{selectedUnit !== 'all' && ` • ${selectedUnit}`}
                    </Typography>
                    <Typography variant="caption" color="primary.main" display="block" sx={{ mt: 0.15, fontSize: '0.65rem', fontWeight: 600 }}>
                      คลิกชื่อบุคลากรเพื่อดูรายละเอียด
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <CardContent sx={{ p: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TableContainer sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                  <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, py: 1, bgcolor: '#f8f9fa', width: '25%' }}>ชื่อ-สกุล</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, py: 1, bgcolor: '#f8f9fa', width: '25%' }}>ตำแหน่ง</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, py: 1, bgcolor: '#f8f9fa', width: '20%' }}>ผู้สนับสนุน</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, py: 1, bgcolor: '#f8f9fa', width: '30%' }}>เหตุผล</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.supportedPersonnel.length > 0 ? (
                        stats.supportedPersonnel
                          .slice(supportPage * supportRowsPerPage, supportPage * supportRowsPerPage + supportRowsPerPage)
                          .map((person) => (
                            <TableRow key={person.id} hover>
                              <TableCell
                                sx={{
                                  fontSize: '0.85rem',
                                  py: 0.75,
                                  whiteSpace: 'normal',
                                  overflow: 'visible',
                                  textOverflow: 'unset',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    bgcolor: 'action.hover'
                                  }
                                }}
                                onClick={() => handleSupportPersonClick(person)}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexWrap: 'nowrap', minWidth: 0 }}>
                                  {person.isMatched ? (
                                    <Tooltip title="จับคู่ตำแหน่งใหม่แล้ว - คลิกเพื่อดูรายละเอียด" arrow>
                                      <CheckCircle sx={{ fontSize: 16, color: 'success.main', flexShrink: 0, mt: '2px' }} />
                                    </Tooltip>
                                  ) : (
                                    <Tooltip title="คลิกเพื่อดูรายละเอียด" arrow>
                                      <Person sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0, mt: '2px' }} />
                                    </Tooltip>
                                  )}
                                  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <Box component="span" sx={{ display: 'inline-block', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                      {person.rank ? `${person.rank} ` : ''}{person.fullName || '-'}
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
                                      ({person.age || '-'})
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.85rem', py: 0.75, wordWrap: 'break-word' }}>
                                <Box>
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    {person.position || '-'}
                                  </Typography>
                                  {(person.posCode || person.posCodeName || person.unit) && (
                                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'block', mt: 0.5 }}>
                                      {[person.posCode, person.posCodeName, person.unit].filter(Boolean).join(' • ')}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.85rem', py: 0.75, wordWrap: 'break-word' }}>{person.supporterName || '-'}</TableCell>
                              <TableCell sx={{ fontSize: '0.85rem', py: 0.75, wordWrap: 'break-word' }}>
                                <Typography variant="caption" sx={{
                                  fontSize: '0.8rem',
                                  whiteSpace: 'normal'
                                }}>
                                  {person.supportReason || '-'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : !initialLoading && !filterLoading && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary', fontStyle: 'italic' }}>
                            ไม่มีข้อมูล
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={stats.supportedPersonnel.length}
                  page={supportPage}
                  onPageChange={handleSupportChangePage}
                  rowsPerPage={supportRowsPerPage}
                  onRowsPerPageChange={handleSupportChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  labelRowsPerPage="แถวต่อหน้า:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} จาก ${count}`}
                  sx={{ borderTop: 1, borderColor: 'divider' }}
                />
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Drilldown Drawer */}
        <Drawer
          anchor="right"
          open={drilldownOpen}
          onClose={() => setDrilldownOpen(false)}
          sx={{ zIndex: 1300 }}
          PaperProps={{
            sx: { width: { xs: '100%', sm: 600, md: 800 } }
          }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  {drilldownTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  สถานะความคืบหน้าการจับคู่
                </Typography>
              </Box>
              <IconButton onClick={() => setDrilldownOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Filter Type */}
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel id="drilldown-filter-type-label">กรองตามประเภท</InputLabel>
              <Select
                labelId="drilldown-filter-type-label"
                value={drilldownFilterType}
                label="กรองตามประเภท"
                onChange={(e) => setDrilldownFilterType(e.target.value)}
              >
                <MenuItem value="all">ทั้งหมด</MenuItem>
                <MenuItem value="two-way">สลับตำแหน่ง</MenuItem>
                <MenuItem value="three-way">สามเส้า</MenuItem>
                <MenuItem value="transfer">ย้ายหน่วย</MenuItem>
                <MenuItem value="promotion-chain">เลื่อนตำแหน่ง</MenuItem>
                
              </Select>
            </FormControl>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 200px)', border: 'none' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: 'grey.50', fontWeight: 700 }}>Group No.</TableCell>
                    <TableCell sx={{ bgcolor: 'grey.50', fontWeight: 700 }}>Group Name</TableCell>
                    <TableCell sx={{ bgcolor: 'grey.50', fontWeight: 700 }}>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDrilldownData.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell sx={{ fontWeight: 600, color: 'primary.main', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                        {tx.groupNumber || `#${tx.id.substring(0, 6)}...`}
                      </TableCell>
                      <TableCell>{tx.groupName || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={tx.swapType === 'promotion-chain' ? 'จัดคนเข้าตำแหน่งว่าง' : tx.swapType === 'transfer' ? 'ย้ายหน่วย' : tx.swapType === 'three-way' ? 'สามเส้า' : 'สลับตำแหน่ง'}
                          size="small"
                          color={tx.swapType === 'transfer' ? 'warning' : 'secondary'}
                          variant="outlined"
                          sx={{ borderRadius: 1, fontSize: '0.75rem', height: 24 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDrilldownData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Drawer>

        {/* Supported Personnel Detail Drawer */}
        <Drawer
          anchor="right"
          open={supportDrawerOpen}
          onClose={() => setSupportDrawerOpen(false)}
          sx={{ zIndex: 1300 }}
          PaperProps={{
            sx: { width: { xs: '100%', sm: 600, md: 800 } }
          }}
        >
          <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  รายละเอียดบุคลากร
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ข้อมูลการจับคู่ตำแหน่ง
                </Typography>
              </Box>
              <IconButton onClick={() => setSupportDrawerOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {selectedSupportPerson && (
                <Box>
                  {/* Header Section - ชื่อและตำแหน่งเดิม */}
                  <Box sx={{ p: 2, mb: 2, bgcolor: 'success.main', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {selectedSupportPerson.rank || ''} {selectedSupportPerson.fullName || '-'}
                    </Typography>

                  </Box>

                  {/* New Position Section - แสดงก่อน */}
                  {selectedSupportPerson.isMatched ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        mb: 3,
                        bgcolor: 'success.50',
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: 'success.main'
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle fontSize="small" />
                        ข้อมูลตำแหน่งใหม่
                      </Typography>
                      <Stack spacing={1.5} divider={<Divider />}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                            {selectedSupportPerson.newPosition || '-'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เลขตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                            {selectedSupportPerson.newPositionNumber || '-'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>รหัสตำแหน่ง</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                            {selectedSupportPerson.newPosCode || '-'}
                          </Typography>
                        </Box>
                        {selectedSupportPerson.newPosCodeName && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ชื่อรหัสตำแหน่ง</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                              {selectedSupportPerson.newPosCodeName}
                            </Typography>
                          </Box>
                        )}
                        {selectedSupportPerson.newUnit && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>หน่วย</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                              {selectedSupportPerson.newUnit}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  ) : (
                    <Box sx={{
                      mb: 3,
                      p: 3,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                      textAlign: 'center',
                      border: '1px dashed',
                      borderColor: 'grey.400'
                    }}>
                      <HelpOutline sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        ยังไม่ได้จับคู่ตำแหน่งใหม่
                      </Typography>
                    </Box>
                  )}

                  {/* Divider */}
                  <Divider sx={{ my: 3 }}>
                    <Chip label="ข้อมูลเดิม" size="small" />
                  </Divider>

                  {/* Content Grid */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>

                    {/* Left Column */}
                    <Box>
                      {/* ข้อมูลตำแหน่งเดิม */}
                      <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <BadgeIcon fontSize="small" />
                          ข้อมูลตำแหน่งเดิม
                        </Typography>
                        <Divider sx={{ mb: 1.5 }} />
                        <Stack spacing={1} divider={<Divider />}>
                          {selectedSupportPerson.noId && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ID</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.noId}</Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>POSCODE</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                              {selectedSupportPerson.posCode && selectedSupportPerson.posCodeName
                                ? `${selectedSupportPerson.posCode} - ${selectedSupportPerson.posCodeName}`
                                : selectedSupportPerson.posCode || '-'}
                            </Typography>
                          </Box>
                          {selectedSupportPerson.positionNumber && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เลขตำแหน่ง</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.positionNumber}</Typography>
                            </Box>
                          )}
                          {selectedSupportPerson.actingAs && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ทำหน้าที่</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.actingAs}</Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>หน่วย</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.unit || '-'}</Typography>
                          </Box>
                        </Stack>
                      </Paper>

                      {/* ข้อมูลบุคคล */}
                      <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Person fontSize="small" />
                          ข้อมูลบุคคล
                        </Typography>
                        <Divider sx={{ mb: 1.5 }} />
                        <Stack spacing={1} divider={<Divider />}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ยศ</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.rank || '-'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ชื่อ-สกุล</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.fullName || '-'}</Typography>
                          </Box>

                          {selectedSupportPerson.seniority && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>อาวุโส</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.seniority}</Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>อายุ</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.age || '-'}</Typography>
                          </Box>
                          {selectedSupportPerson.birthDate && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>วันเกิด</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(selectedSupportPerson.birthDate)}</Typography>
                            </Box>
                          )}
                          {selectedSupportPerson.nationalId && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เลขบัตรประชาชน</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{selectedSupportPerson.nationalId}</Typography>
                            </Box>
                          )}
                          {selectedSupportPerson.education && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>คุณวุฒิ</Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.education}</Typography>
                            </Box>
                          )}
                        </Stack>
                      </Paper>
                    </Box>

                    {/* Right Column */}
                    <Box>
                      {/* ข้อมูลการแต่งตั้ง */}
                      {(selectedSupportPerson.lastAppointment || selectedSupportPerson.currentRankSince || selectedSupportPerson.enrollmentDate || selectedSupportPerson.retirementDate || selectedSupportPerson.yearsOfService) && (
                        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'info.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarToday fontSize="small" />
                            ข้อมูลการแต่งตั้ง
                          </Typography>
                          <Divider sx={{ mb: 1.5 }} />
                          <Stack spacing={1} divider={<Divider />}>
                            {selectedSupportPerson.lastAppointment && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>แต่งตั้งครั้งสุดท้าย</Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(selectedSupportPerson.lastAppointment)}</Typography>
                              </Box>
                            )}
                            {selectedSupportPerson.currentRankSince && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>ระดับนี้เมื่อ</Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(selectedSupportPerson.currentRankSince)}</Typography>
                              </Box>
                            )}
                            {selectedSupportPerson.enrollmentDate && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>บรรจุ</Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(selectedSupportPerson.enrollmentDate)}</Typography>
                              </Box>
                            )}
                            {selectedSupportPerson.retirementDate && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>เกษียณ</Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{formatDate(selectedSupportPerson.retirementDate)}</Typography>
                              </Box>
                            )}
                            {selectedSupportPerson.yearsOfService && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>จำนวนปี</Typography>
                                <Typography variant="body2" fontWeight={600} color="info.main" sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.yearsOfService} ปี</Typography>
                              </Box>
                            )}
                          </Stack>
                        </Paper>
                      )}

                      {/* ข้อมูลการฝึกอบรม */}
                      {(selectedSupportPerson.trainingLocation || selectedSupportPerson.trainingCourse) && (
                        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.main', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <School fontSize="small" />
                            ข้อมูลการฝึกอบรม
                          </Typography>
                          <Divider sx={{ mb: 1.5 }} />
                          <Stack spacing={1} divider={<Divider />}>
                            {selectedSupportPerson.trainingLocation && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>สถานที่ฝึกอบรม</Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.trainingLocation}</Typography>
                              </Box>
                            )}
                            {selectedSupportPerson.trainingCourse && (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>นรต.</Typography>
                                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>{selectedSupportPerson.trainingCourse}</Typography>
                              </Box>
                            )}
                          </Stack>
                        </Paper>
                      )}
                    </Box>
                  </Box>

                  {/* ข้อมูลการเสนอชื่อ - Full Width */}
                  {(selectedSupportPerson.supporterName || selectedSupportPerson.supportReason) && (
                    <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Person sx={{ fontSize: 16 }} />
                        ข้อมูลการเสนอชื่อ
                      </Typography>

                      {selectedSupportPerson.supporterName && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', mb: 0.5 }}>
                            ผู้สนับสนุน/ผู้เสนอชื่อ:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            {selectedSupportPerson.supporterName}
                          </Typography>
                        </Box>
                      )}

                      {selectedSupportPerson.supportReason && (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem', mb: 0.5 }}>
                            เหตุผลในการสนับสนุน:
                          </Typography>
                          <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.secondary', fontSize: '0.875rem' }}>
                            {selectedSupportPerson.supportReason}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  )}

                  {/* หมายเหตุ */}
                  {selectedSupportPerson.notes && (
                    <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: 'grey.100', borderRadius: 1, border: 1, borderColor: 'grey.300' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                        หมายเหตุ
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {selectedSupportPerson.notes}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Drawer>
      </Box>
    </Layout>
  );
}
