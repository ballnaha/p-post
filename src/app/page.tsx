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
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  OpenInNew as OpenInNewIcon,
  People as PeopleIcon,
  SwapHoriz as SwapIcon,
  WorkOff as VacantIcon,
  AccountBalance as BalanceIcon,
} from '@mui/icons-material';

interface DashboardStats {
  totalProfit: number;
  totalRevenue: number;
  totalVisitors: number;
  productsSold: number;
  profitChange: number;
  revenueChange: number;
  visitorsChange: number;
  productsChange: number;
}

interface RecentOrder {
  orderId: string;
  product: string;
  orderTime: string;
  status: 'Pending' | 'Dispatching' | 'Delivered';
  quantity: number;
  totalPrice: number;
  customer: string;
}

interface ActivityData {
  day: string;
  value: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProfit: 300150,
    totalRevenue: 531666,
    totalVisitors: 420320,
    productsSold: 150001,
    profitChange: 26.1,
    revenueChange: -10.3,
    visitorsChange: -5.5,
    productsChange: 36.3,
  });
  const [loading, setLoading] = useState(true);

  // Mock recent orders data
  const recentOrders: RecentOrder[] = [
    {
      orderId: '#9716',
      product: 'Apple MacBook Pro...',
      orderTime: '01/11/2023, 15:33',
      status: 'Pending',
      quantity: 1,
      totalPrice: 2692,
      customer: 'Luca Rossi'
    },
    {
      orderId: '#9715',
      product: 'Blue iPhone 14 Pro...',
      orderTime: '01/11/2023, 15:41',
      status: 'Dispatching',
      quantity: 1,
      totalPrice: 1332,
      customer: 'Luigi Park & Co'
    },
    {
      orderId: '#9714',
      product: 'Apple AirPods Pro...',
      orderTime: '01/11/2023, 15:51',
      status: 'Dispatching',
      quantity: 2,
      totalPrice: 532,
      customer: 'Cristiano Edgar'
    },
    {
      orderId: '#9713',
      product: 'Blue iPhone 14 Pro...',
      orderTime: '01/11/2023, 15:52',
      status: 'Delivered',
      quantity: 1,
      totalPrice: 1332,
      customer: 'Jhonatan Bruno'
    }
  ];

  // Mock activity data for chart
  const activityData: ActivityData[] = [
    { day: 'Mon', value: 65 },
    { day: 'Tue', value: 45 },
    { day: 'Wed', value: 85 },
    { day: 'Thu', value: 25 },
    { day: 'Fri', value: 95 },
    { day: 'Sat', value: 75 },
    { day: 'Sun', value: 55 }
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number): string => {
    return `$ ${new Intl.NumberFormat('en-US').format(num)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Dispatching':
        return 'info';
      case 'Delivered':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
          Dashboard
        </Typography>

        {/* Stats Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, 
          gap: 3, 
          mb: 4 
        }}>
          {/* Total Profit */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
            transition: 'all 0.3s',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', opacity: 0.8, mb: 1 }}>
                    Total Profit
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                    {loading ? '...' : formatCurrency(stats.totalProfit)}
                  </Typography>
                </Box>
                <BalanceIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}>
                  <TrendingUpIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    +{stats.profitChange}%
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                  this week
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
            transition: 'all 0.3s',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', mb: 1 }}>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                    {loading ? '...' : formatCurrency(stats.totalRevenue)}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  bgcolor: 'error.lighter',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}>
                  <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                  <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, fontSize: '0.75rem' }}>
                    {Math.abs(stats.revenueChange)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  this week
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Total Visitors */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
            transition: 'all 0.3s',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', mb: 1 }}>
                    Total Visitors
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                    {loading ? '...' : formatNumber(stats.totalVisitors)}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  bgcolor: 'error.lighter',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}>
                  <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                  <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, fontSize: '0.75rem' }}>
                    {Math.abs(stats.visitorsChange)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  this week
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Products Sold */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
            transition: 'all 0.3s',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', mb: 1 }}>
                    Product Sold
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '2rem' }}>
                    {loading ? '...' : formatNumber(stats.productsSold)}
                  </Typography>
                </Box>
                <SwapIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  bgcolor: 'success.lighter',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                }}>
                  <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.75rem' }}>
                    +{stats.productsChange}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  this week
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Main Content Grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, 
          gap: 3, 
          mb: 3 
        }}>
          {/* Customer Volume Chart */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            height: '400px'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Customer Volume
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  +15%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  vs last week
                </Typography>
              </Box>
              
              {/* Simple circular progress */}
              <Box sx={{ 
                position: 'relative', 
                display: 'inline-flex', 
                width: 200, 
                height: 200,
                mx: 'auto',
                mt: 4
              }}>
                <Box sx={{
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: `conic-gradient(#3f51b5 0deg ${85 * 3.6}deg, #e0e0e0 ${85 * 3.6}deg 360deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Box sx={{
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>85%</Typography>
                    <Typography variant="body2" color="text.secondary">Current</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Sales Volume Chart */}
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            height: '400px'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Sales Volume
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: '50%' }} />
                    <Typography variant="body2">Online</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'grey.300', borderRadius: '50%' }} />
                    <Typography variant="body2">Offline</Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* Simple bar chart simulation */}
              <Box sx={{ display: 'flex', alignItems: 'end', gap: 2, height: 250, mt: 4 }}>
                {activityData.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <Box sx={{ 
                      width: '100%', 
                      height: `${item.value * 2}px`, 
                      bgcolor: index === 4 ? 'primary.main' : 'grey.300',
                      borderRadius: '4px 4px 0 0',
                      mb: 1
                    }} />
                    <Typography variant="caption" color="text.secondary">
                      {item.day}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Recent Orders Table */}
        <Card sx={{ 
          borderRadius: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Recent Order
              </Typography>
              <Typography variant="caption" color="text.secondary">
                This Week
              </Typography>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Order Time</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Total Price</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((order, index) => (
                    <TableRow key={index} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {order.orderId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.200' }}>
                            📱
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {order.product}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {order.orderTime}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status}
                          color={getStatusColor(order.status) as any}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          x{order.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          ${order.totalPrice}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                            {order.customer.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {order.customer}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
}