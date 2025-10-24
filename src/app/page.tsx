'use client';
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import {
  Box,
  Paper,
  Typography,
  Container,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

interface DashboardStats {
  totalPersonnel: number;
  totalSwapTransactions: number;
  totalVacantPositions: number;
  totalThreeWaySwaps: number;
  personnelChange: number;
  swapChange: number;
  vacantChange: number;
  threeWayChange: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPersonnel: 0,
    totalSwapTransactions: 0,
    totalVacantPositions: 0,
    totalThreeWaySwaps: 0,
    personnelChange: 12.1,
    swapChange: 6.3,
    vacantChange: -2.4,
    threeWayChange: 12.1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch personnel count
      const personnelRes = await fetch('/api/police-personnel');
      const personnelData = await personnelRes.json();
      const totalPersonnel = personnelData.data?.length || 0;

      // Fetch swap transactions
      const currentYear = new Date().getFullYear() + 543;
      const swapRes = await fetch(`/api/swap-transactions?year=${currentYear}`);
      const swapData = await swapRes.json();
      const swapTransactions = swapData.data || [];
      
      // Fetch vacant positions
      const vacantRes = await fetch('/api/vacant-position');
      const vacantData = await vacantRes.json();
      const totalVacant = vacantData.data?.length || 0;

      // Calculate three-way swaps
      const threeWaySwaps = swapTransactions.filter((t: any) => t.swapType === 'three-way').length;

      setStats(prev => ({
        ...prev,
        totalPersonnel,
        totalSwapTransactions: swapTransactions.length,
        totalVacantPositions: totalVacant,
        totalThreeWaySwaps: threeWaySwaps,
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Dashboard
        </Typography>

        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2.5, mb: 4 }}>
          {/* Total Personnel */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            transition: 'all 0.3s',
            border: '1px solid',
            borderColor: 'grey.100',
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                  จำนวนบุคลากรทั้งหมด
                </Typography>
                <IconButton 
                  size="small" 
                  sx={{ 
                    mt: -0.5, 
                    mr: -0.5,
                    width: 24, 
                    height: 24,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, fontSize: '1.75rem' }}>
                {loading ? '...' : formatNumber(stats.totalPersonnel)}
                <Typography component="span" variant="body2" color="text.disabled" sx={{ ml: 0.5, fontSize: '0.875rem', fontWeight: 400 }}>
                  .00
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.3,
                  bgcolor: 'success.lighter',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                }}>
                  <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.75rem' }}>
                    {stats.personnelChange}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Total Swaps */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            transition: 'all 0.3s',
            border: '1px solid',
            borderColor: 'grey.100',
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                  การสลับตำแหน่ง
                </Typography>
                <IconButton 
                  size="small" 
                  sx={{ 
                    mt: -0.5, 
                    mr: -0.5,
                    width: 24, 
                    height: 24,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, fontSize: '1.75rem' }}>
                {loading ? '...' : formatNumber(stats.totalSwapTransactions)}
                <Typography component="span" variant="body2" color="text.disabled" sx={{ ml: 0.5, fontSize: '0.875rem', fontWeight: 400 }}>
                  .00
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.3,
                  bgcolor: 'success.lighter',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                }}>
                  <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.75rem' }}>
                    {stats.swapChange}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Vacant Positions */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            transition: 'all 0.3s',
            border: '1px solid',
            borderColor: 'grey.100',
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                  ตำแหน่งว่าง
                </Typography>
                <IconButton 
                  size="small" 
                  sx={{ 
                    mt: -0.5, 
                    mr: -0.5,
                    width: 24, 
                    height: 24,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, fontSize: '1.75rem' }}>
                {loading ? '...' : formatNumber(stats.totalVacantPositions)}
                <Typography component="span" variant="body2" color="text.disabled" sx={{ ml: 0.5, fontSize: '0.875rem', fontWeight: 400 }}>
                  .00
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.3,
                  bgcolor: 'error.lighter',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                }}>
                  <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                  <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, fontSize: '0.75rem' }}>
                    {Math.abs(stats.vacantChange)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Three-way Swaps */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
            transition: 'all 0.3s',
            border: '1px solid',
            borderColor: 'grey.100',
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                  การสลับสามเส้า
                </Typography>
                <IconButton 
                  size="small" 
                  sx={{ 
                    mt: -0.5, 
                    mr: -0.5,
                    width: 24, 
                    height: 24,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, fontSize: '1.75rem' }}>
                {loading ? '...' : formatNumber(stats.totalThreeWaySwaps)}
                <Typography component="span" variant="body2" color="text.disabled" sx={{ ml: 0.5, fontSize: '0.875rem', fontWeight: 400 }}>
                  .00
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.3,
                  bgcolor: 'success.lighter',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                }}>
                  <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.75rem' }}>
                    {stats.threeWayChange}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Placeholder for charts and tables */}
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            กราฟและตารางจะแสดงที่นี่ในขั้นตอนถัดไป
          </Typography>
        </Paper>
      </Container>
    </Layout>
  );
}