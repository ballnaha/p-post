'use client';

import React, { useEffect } from 'react';
import { Box, IconButton, Snackbar, Typography } from '@mui/material';
import {
  CheckCircleOutline as SuccessIcon,
  Close as CloseIcon,
  ErrorOutline as ErrorIcon,
  InfoOutlined as InfoIcon,
  ReportProblemOutlined as WarningIcon,
} from '@mui/icons-material';
import { SnackbarType, useSnackbar } from '../contexts/SnackbarContext';

const snackbarConfig: Record<SnackbarType, {
  icon: React.ReactNode;
  color: string;
  backgroundColor: string;
  borderColor: string;
  iconBackgroundColor: string;
}> = {
  success: {
    icon: <SuccessIcon fontSize="small" />,
    color: '#047857',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#d1fae5',
    iconBackgroundColor: '#ecfdf5',
  },
  info: {
    icon: <InfoIcon fontSize="small" />,
    color: '#2563eb',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#dbeafe',
    iconBackgroundColor: '#eff6ff',
  },
  warning: {
    icon: <WarningIcon fontSize="small" />,
    color: '#b45309',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#fef3c7',
    iconBackgroundColor: '#fffbeb',
  },
  error: {
    icon: <ErrorIcon fontSize="small" />,
    color: '#dc2626',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#fee2e2',
    iconBackgroundColor: '#fef2f2',
  },
};

export const GlobalSnackbar: React.FC = () => {
  const { snackbarState, hideSnackbar } = useSnackbar();
  const { open, message, type, duration } = snackbarState;
  const config = snackbarConfig[type];

  useEffect(() => {
    if (!open || !duration) return;

    const timer = window.setTimeout(hideSnackbar, duration);
    return () => window.clearTimeout(timer);
  }, [open, duration, hideSnackbar]);

  return (
    <Snackbar
      open={open}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        mt: { xs: 1.5, sm: 3 },
        px: { xs: 2, sm: 0 },
        zIndex: 20100,
      }}
    >
      <Box
        role="status"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: { xs: '100%', sm: 'auto' },
          minWidth: { xs: '100%', sm: 280 },
          maxWidth: { xs: '100%', sm: 460 },
          px: 1.25,
          py: 1,
          borderRadius: 2,
          border: '1px solid',
          borderColor: config.borderColor,
          bgcolor: config.backgroundColor,
          color: config.color,
          boxShadow: '0 14px 36px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.06)',
          backdropFilter: 'blur(12px)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: '0 999px 999px 0',
            bgcolor: config.color,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            flexShrink: 0,
            color: config.color,
            bgcolor: config.iconBackgroundColor,
          }}
        >
          {config.icon}
        </Box>

        <Typography
          variant="body2"
          sx={{
            flex: 1,
            minWidth: 0,
            color: '#1f2937',
            fontSize: '0.875rem',
            fontWeight: 500,
            lineHeight: 1.45,
            overflowWrap: 'anywhere',
          }}
        >
          {message}
        </Typography>

        <IconButton
          size="small"
          onClick={hideSnackbar}
          aria-label="ปิดข้อความแจ้งเตือน"
          sx={{
            width: 26,
            height: 26,
            flexShrink: 0,
            color: '#64748b',
            '&:hover': {
              bgcolor: 'rgba(15, 23, 42, 0.06)',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Snackbar>
  );
};
