'use client';

import React, { useEffect } from 'react';
import { Box, IconButton, Snackbar, Typography, Slide, alpha } from '@mui/material';
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
    color: '#065f46',
    backgroundColor: 'rgba(240, 253, 250, 0.96)',
    borderColor: '#a7f3d0',
    iconBackgroundColor: '#ccfbf1',
  },
  info: {
    icon: <InfoIcon fontSize="small" />,
    color: '#1e40af',
    backgroundColor: 'rgba(239, 246, 255, 0.96)',
    borderColor: '#bfdbfe',
    iconBackgroundColor: '#dbeafe',
  },
  warning: {
    icon: <WarningIcon fontSize="small" />,
    color: '#854d0e',
    backgroundColor: 'rgba(255, 251, 235, 0.96)',
    borderColor: '#fde68a',
    iconBackgroundColor: '#fef3c7',
  },
  error: {
    icon: <ErrorIcon fontSize="small" />,
    color: '#991b1b',
    backgroundColor: 'rgba(254, 242, 242, 0.96)',
    borderColor: '#fecaca',
    iconBackgroundColor: '#fee2e2',
  },
};

export const GlobalSnackbar: React.FC = () => {
  const { snackbarState, hideSnackbar } = useSnackbar();
  const { open, key, message, type, duration } = snackbarState;
  const config = snackbarConfig[type];

  useEffect(() => {
    if (!open || !duration) return;

    const timer = window.setTimeout(hideSnackbar, duration);
    return () => window.clearTimeout(timer);
  }, [open, duration, hideSnackbar]);

  return (
    <Snackbar
      key={key}
      open={open}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      TransitionComponent={(props) => <Slide {...props} direction="down" />}
      sx={{
        mt: { xs: 1.5, sm: 3 },
        px: { xs: 2, sm: 0 },
        zIndex: 20100,
        pointerEvents: 'none',
      }}
    >
      <Box
        role="status"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: { xs: '100%', sm: 'auto' },
          minWidth: { xs: '100%', sm: 320 },
          maxWidth: { xs: '100%', sm: 500 },
          px: 2,
          py: 1.5,
          borderRadius: 3,
          border: '1.5px solid',
          borderColor: config.borderColor,
          bgcolor: config.backgroundColor,
          color: config.color,
          boxShadow: `0 20px 25px -5px ${alpha(config.color, 0.12)}, 0 8px 10px -6px ${alpha(config.color, 0.06)}`,
          backdropFilter: 'blur(16px)',
          position: 'relative',
          overflow: 'hidden',
          pointerEvents: 'none',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: config.color,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
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
            color: '#1e293b',
            fontSize: '0.9rem',
            fontWeight: 700,
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
            pointerEvents: 'auto',
            width: 26,
            height: 26,
            flexShrink: 0,
            color: '#64748b',
            '&:hover': {
              bgcolor: alpha(config.color, 0.08),
              color: config.color,
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Snackbar>
  );
};
