'use client';

import { Card, CardContent, Typography, Box } from '@mui/material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PerformanceChartProps {
  data: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = {
    labels: ['Excellent', 'Good', 'Average', 'Poor'],
    datasets: [
      {
        data: [data.excellent, data.good, data.average, data.poor],
        backgroundColor: ['#36A2EB', '#A78BFA', '#4BC0C0', '#FF6384'],
        borderWidth: 0,
        cutout: '75%',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderRadius: 8,
      },
    },
  };

  const total = data.excellent + data.good + data.average + data.poor;
  const excellentPercentage = Math.round((data.excellent / total) * 100);

  return (
    <Card sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} mb={3}>
          Hospital Performance
        </Typography>
        <Box sx={{ position: 'relative', height: 200, mb: 3 }}>
          <Doughnut data={chartData} options={options} />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h3" fontWeight={700}>
              {excellentPercentage}.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Excellent
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#36A2EB' }} />
            <Typography variant="body2" color="text.secondary">
              Excellent {data.excellent}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#A78BFA' }} />
            <Typography variant="body2" color="text.secondary">
              Good {data.good}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4BC0C0' }} />
            <Typography variant="body2" color="text.secondary">
              Average {data.average}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#FF6384' }} />
            <Typography variant="body2" color="text.secondary">
              Poor {data.poor}%
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
