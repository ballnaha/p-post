'use client';
import React from 'react';
import Layout from './components/Layout';
import {
  Box,
  Paper,
  Typography,
  Container,
} from '@mui/material';

export default function HomePage() {
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom color="primary">
            ยนดตอนรบ
          </Typography>
          <Typography variant="h5" gutterBottom color="text.secondary">
            ระบบจดการพนฐาน
          </Typography>
          <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary' }}>
            นคอหนาหลกของระบบ คณสามารถเรมพฒนาระบบใหมไดจากทน
          </Typography>
          <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              โครงสรางระบบ
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ระบบนม Header, Sidebar, Breadcrumb และหนา Login พรอมใชงาน
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}