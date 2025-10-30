'use client';
import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, Box, Typography, Slide } from '@mui/material';
import { 
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSnackbar, SnackbarType } from '../contexts/SnackbarContext';

const getSnackbarConfig = (type: SnackbarType) => {
  const configs = {
    success: {
      icon: <CheckCircleIcon sx={{ fontSize: 'inherit' }} />,
      title: 'SUCCESS',
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.08)',
      iconColor: '#22c55e',
      titleColor: '#15803d',
      messageColor: '#166534'
    },
    info: {
      icon: <InfoIcon sx={{ fontSize: 'inherit' }} />,
      title: 'INFO',
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      iconColor: '#3b82f6',
      titleColor: '#1d4ed8',
      messageColor: '#1e40af'
    },
    warning: {
      icon: <WarningIcon sx={{ fontSize: 'inherit' }} />,
      title: 'WARNING',
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      iconColor: '#f59e0b',
      titleColor: '#d97706',
      messageColor: '#b45309'
    },
    error: {
      icon: <ErrorIcon sx={{ fontSize: 'inherit' }} />,
      title: 'ERROR',
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
      iconColor: '#ef4444',
      titleColor: '#dc2626',
      messageColor: '#b91c1c'
    }
  };
  return configs[type];
};

// Transition component for slide animation
function SlideTransition(props: any) {
  return <Slide {...props} direction="down" />;
}

export const GlobalSnackbar: React.FC = () => {
  const { snackbarState, hideSnackbar } = useSnackbar();
  const { open, message, type, duration } = snackbarState;
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const config = getSnackbarConfig(type);

  // Minimum swipe distance (in px) to trigger close
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    
    // Swipe up to dismiss on mobile
    if (isUpSwipe) {
      hideSnackbar();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    if (open && duration) {
      const timer = setTimeout(() => {
        hideSnackbar();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [open, duration, hideSnackbar]);

  return (
    <Snackbar
      open={open}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      TransitionComponent={SlideTransition}
      sx={{ 
        mt: { xs: 2, sm: 8 }, // Reduced margin on mobile
        mx: { xs: 2, sm: 0 }, // Add horizontal margin on mobile
        width: { xs: 'calc(100% - 32px)', sm: 'auto' }, // Full width minus margins on mobile
        '& .MuiSnackbar-root': {
          position: 'relative'
        }
      }}
    >
      <Box
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: { xs: '100%', sm: 380, md: 420 }, // Responsive widths
          maxWidth: { xs: '100%', sm: 500, md: 600 },
          backgroundColor: config.backgroundColor,
          borderRadius: { xs: 1.5, sm: 2 }, // Slightly smaller radius on mobile
          border: `1px solid ${config.borderColor}20`,
          borderLeftWidth: { xs: 3, sm: 4 }, // Thinner border on mobile
          borderLeftColor: config.borderColor,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
          padding: { xs: '12px 14px', sm: '16px 20px' }, // Less padding on mobile
          position: 'relative',
          backdropFilter: 'blur(8px)',
          cursor: { xs: 'grab', sm: 'default' }, // Indicate swipeable on mobile
          userSelect: 'none',
          WebkitTouchCallout: 'none', // Prevent callout on iOS
          WebkitUserSelect: 'none',
          '&:active': {
            cursor: { xs: 'grabbing', sm: 'default' }
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: { xs: 1.5, sm: 2 },
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            pointerEvents: 'none'
          },
          // Swipe indicator on mobile
          '&::after': {
            content: '""',
            display: { xs: 'block', sm: 'none' },
            position: 'absolute',
            top: 6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 32,
            height: 3,
            borderRadius: 2,
            backgroundColor: `${config.borderColor}40`,
            pointerEvents: 'none'
          }
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            color: config.iconColor,
            mr: { xs: 1.5, sm: 2 }, // Less margin on mobile
            mt: 0.25,
            flexShrink: 0
          }}
        >
          <Box sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {config.icon}
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: config.titleColor,
              fontWeight: 700,
              fontSize: { xs: '0.7rem', sm: '0.75rem' }, // Smaller on mobile
              letterSpacing: '0.5px',
              mb: 0.5,
              textTransform: 'uppercase',
              display: { xs: 'none', sm: 'block' } // Hide title on very small screens
            }}
          >
            {config.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: config.messageColor,
              fontSize: { xs: '0.8125rem', sm: '0.875rem' }, // Slightly smaller on mobile
              lineHeight: 1.4,
              fontWeight: 500,
              wordBreak: 'break-word', // Prevent text overflow on mobile
              overflowWrap: 'break-word'
            }}
          >
            {message}
          </Typography>
        </Box>

        {/* Close Button */}
        <Box
          onClick={hideSnackbar}
          sx={{
            color: config.iconColor,
            cursor: 'pointer',
            padding: { xs: '2px', sm: '4px' }, // Smaller touch target padding on mobile
            borderRadius: '50%',
            ml: { xs: 0.5, sm: 1 },
            mt: -0.5,
            minWidth: { xs: '32px', sm: 'auto' }, // Ensure minimum touch target size
            minHeight: { xs: '32px', sm: 'auto' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.08)'
            },
            '&:active': {
              backgroundColor: 'rgba(0,0,0,0.12)' // Better feedback on mobile
            },
            transition: 'background-color 0.2s ease'
          }}
        >
          <CloseIcon sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }} />
        </Box>
      </Box>
    </Snackbar>
  );
};
