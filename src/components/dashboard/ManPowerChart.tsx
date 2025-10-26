'use client';

import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface ManPowerChartProps {
  data: {
    divisions: string[];
    doctors: number[];
    patientsPerDoctor: number[];
  };
}

export default function ManPowerChart({ data }: ManPowerChartProps) {
  const chartData = {
    labels: data.divisions,
    datasets: [
      {
        label: '# no Doctors',
        data: data.doctors,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: '#36A2EB',
        borderWidth: 2,
        pointBackgroundColor: '#36A2EB',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#36A2EB',
      },
      {
        label: 'Patient Per Doctor',
        data: data.patientsPerDoctor,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: '#4BC0C0',
        borderWidth: 2,
        pointBackgroundColor: '#4BC0C0',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#4BC0C0',
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
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          display: false,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        pointLabels: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <Card sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Man Power Per Division
        </Typography>
        <Box sx={{ height: 280, position: 'relative' }}>
          <Radar data={chartData} options={options} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#36A2EB' }} />
            <Typography variant="caption" color="text.secondary">
              # no Doctors
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4BC0C0' }} />
            <Typography variant="caption" color="text.secondary">
              Patient Per Doctor
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
