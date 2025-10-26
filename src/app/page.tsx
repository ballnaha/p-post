'use client';

import { useEffect, useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { LocalHospital, AttachMoney, PersonOutline } from '@mui/icons-material';
import Layout from './components/Layout';
import StatsCard from '@/components/dashboard/StatsCard';
import OverviewChart from '@/components/dashboard/OverviewChart';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import TreatmentPlanChart from '@/components/dashboard/TreatmentPlanChart';
import ManPowerChart from '@/components/dashboard/ManPowerChart';

interface DashboardData {
  stats: {
    totalPatients: {
      count: number;
      admitted: number;
    };
    operationalCost: {
      total: number;
      avgPerOperation: number;
    };
    avgPatientPerDoctor: {
      average: number;
      available: number;
    };
  };
  overview: {
    months: string[];
    admittedPatients: number[];
    outPatients: number[];
    cost: number[];
  };
  hospitalPerformance: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  treatmentPlan: {
    stronglyAgree: number;
    agree: number;
    neutral: number;
    disagree: number;
    stronglyDisagree: number;
  };
  manPower: {
    divisions: string[];
    doctors: number[];
    patientsPerDoctor: number[];
  };
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/dashboard');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading || !data) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} mb={4}>
          Dashboard
        </Typography>

        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
          <StatsCard
            title="Total Patients"
            value={data.stats.totalPatients.count.toLocaleString()}
            subtitle={`Total patient admitted: ${data.stats.totalPatients.admitted.toLocaleString()}`}
            icon={<LocalHospital sx={{ fontSize: '3rem' }} />}
            bgGradient="linear-gradient(135deg, #4BC0C0 0%, #36A2EB 100%)"
          />
          <StatsCard
            title="Operational Cost"
            value={`$${data.stats.operationalCost.total.toLocaleString()}`}
            subtitle={`Avg cost per operation: $${data.stats.operationalCost.avgPerOperation}`}
            icon={<AttachMoney sx={{ fontSize: '3rem' }} />}
            bgGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
          <StatsCard
            title="Avg Patient Per Doctor"
            value={data.stats.avgPatientPerDoctor.average}
            subtitle={`Available: ${data.stats.avgPatientPerDoctor.available}`}
            icon={<PersonOutline sx={{ fontSize: '3rem' }} />}
            bgGradient="linear-gradient(135deg, #FFA726 0%, #FB8C00 100%)"
          />
        </Box>

        {/* Overview Chart */}
        <Box mb={4}>
          <OverviewChart data={data.overview} />
        </Box>

        {/* Bottom Charts */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          <PerformanceChart data={data.hospitalPerformance} />
          <TreatmentPlanChart data={data.treatmentPlan} />
          <ManPowerChart data={data.manPower} />
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            2025 Police Position Management System
          </Typography>
        </Box>
      </Container>
    </Layout>
  );
}