'use client';

import { Card, CardContent, Typography, Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineController,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useState } from 'react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineController,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface OverviewChartProps {
  data: {
    months: string[];
    admittedPatients: number[];
    outPatients: number[];
    cost: number[];
  };
}

export default function OverviewChart({ data }: OverviewChartProps) {
  const [period, setPeriod] = useState('yearly');
  const [activeTooltip, setActiveTooltip] = useState<any>(null);

  const chartData = {
    labels: data.months,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Admitted Patients',
        data: data.admittedPatients,
        backgroundColor: '#36A2EB',
        borderRadius: 6,
        barThickness: 20,
      },
      {
        type: 'bar' as const,
        label: 'Out Patients',
        data: data.outPatients,
        backgroundColor: '#4BC0C0',
        borderRadius: 6,
        barThickness: 20,
      },
      {
        type: 'line' as const,
        label: 'Cost',
        data: data.cost,
        borderColor: '#FF9F40',
        backgroundColor: 'rgba(255, 159, 64, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: 'y1',
        pointRadius: 4,
        pointBackgroundColor: '#FF9F40',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function (value: any) {
            return value >= 1000 ? value / 1000 + 'k' : value;
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function (value: any) {
            return value + 'M';
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Overview
            </Typography>
            {activeTooltip && (
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  bgcolor: '#2B3A67',
                  color: 'white',
                  borderRadius: 2,
                  display: 'inline-block',
                }}
              >
                <Typography variant="caption" fontWeight={600}>
                  Jun 2019
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  <Typography variant="caption">● 5,025 Admitted Ptn</Typography>
                  <Typography variant="caption">● 4,600 Out Ptn</Typography>
                  <Typography variant="caption">● 2.2k Cost</Typography>
                </Box>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#36A2EB' }} />
                <Typography variant="caption" color="text.secondary">
                  Admitted
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4BC0C0' }} />
                <Typography variant="caption" color="text.secondary">
                  Out Patient
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF9F40' }} />
                <Typography variant="caption" color="text.secondary">
                  Cost
                </Typography>
              </Box>
            </Box>
          </Box>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(e, value) => value && setPeriod(value)}
            size="small"
          >
            <ToggleButton value="week">Last Week</ToggleButton>
            <ToggleButton value="month">Last Month</ToggleButton>
            <ToggleButton value="3months">3 Months</ToggleButton>
            <ToggleButton value="yearly">Yearly</ToggleButton>
            <ToggleButton value="lifetime">Life Time</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ height: 300 }}>
          <Chart type="bar" data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
}
