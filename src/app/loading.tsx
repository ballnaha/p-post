'use client';
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Global Loading Page - Minimal & Professional Design
 * 
 * Displays while the application or pages are loading.
 */
export default function Loading() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        gap: 2,
      }}
    >
      <CircularProgress 
        size={48} 
        thickness={4}
        sx={{ 
          color: 'primary.main',
        }} 
      />
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
    </Box>
  );
}
