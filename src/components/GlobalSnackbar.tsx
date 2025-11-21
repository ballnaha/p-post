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
      title: 'สำเร็จ!',
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      iconColor: '#ffffff',
      iconBgColor: '#059669',
      titleColor: '#ffffff',
      messageColor: '#f0fdf4',
      closeIconColor: '#ffffff',
      pattern1: '#059669',
      pattern2: '#047857'
    },
    info: {
      icon: <InfoIcon sx={{ fontSize: 'inherit' }} />,
      title: 'ข้อมูล!',
      borderColor: '#3b82f6',
      backgroundColor: '#3b82f6',
      iconColor: '#ffffff',
      iconBgColor: '#2563eb',
      titleColor: '#ffffff',
      messageColor: '#eff6ff',
      closeIconColor: '#ffffff',
      pattern1: '#2563eb',
      pattern2: '#1d4ed8'
    },
    warning: {
      icon: <WarningIcon sx={{ fontSize: 'inherit' }} />,
      title: 'คำเตือน!',
      borderColor: '#f97316',
      backgroundColor: '#f97316',
      iconColor: '#ffffff',
      iconBgColor: '#ea580c',
      titleColor: '#ffffff',
      messageColor: '#fff7ed',
      closeIconColor: '#ffffff',
      pattern1: '#ea580c',
      pattern2: '#c2410c'
    },
    error: {
      icon: <ErrorIcon sx={{ fontSize: 'inherit' }} />,
      title: 'ข้อผิดพลาด!',
      borderColor: '#ef4444',
      backgroundColor: '#ef4444',
      iconColor: '#ffffff',
      iconBgColor: '#dc2626',
      titleColor: '#ffffff',
      messageColor: '#fef2f2',
      closeIconColor: '#ffffff',
      pattern1: '#dc2626',
      pattern2: '#b91c1c'
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
        mt: { xs: 3, sm: 8 }, // More margin on mobile for floating icon
        mx: { xs: 2, sm: 0 }, // Add horizontal margin on mobile
        width: { xs: 'calc(100% - 32px)', sm: 'auto' }, // Full width minus margins on mobile
        zIndex: 20100, // Higher than PersonnelDetailModal (20002)
        '& .MuiSnackbar-root': {
          position: 'relative'
        }
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'inline-block',
          width: { xs: '100%', sm: 'auto' } // Full width on mobile
        }}
      >
        {/* Floating Chat Icon - Hidden on mobile */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' }, // Hide on mobile, show on desktop
            position: 'absolute',
            top: -20,
            left: 20,
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: config.iconBgColor,
            alignItems: 'center',
            justifyContent: 'center',
            color: config.iconColor,
            fontSize: '1.75rem',
            boxShadow: `0 8px 24px ${config.iconBgColor}60, 0 4px 12px rgba(0, 0, 0, 0.15)`,
            zIndex: 2,
            animation: 'float 3s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': {
                transform: 'translateY(0px)'
              },
              '50%': {
                transform: 'translateY(-8px)'
              }
            },
            // Decorative pattern inside icon
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 8,
              right: 8,
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              pointerEvents: 'none'
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 6,
              left: 6,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.1)',
              pointerEvents: 'none'
            }
          }}
        >
          {config.icon}
        </Box>

        <Box
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 2 },
            minWidth: { xs: '100%', sm: 320, md: 360 },
            maxWidth: { xs: '100%', sm: 420, md: 480 },
            backgroundColor: config.backgroundColor,
            borderRadius: { xs: 2, sm: 2 },
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: { xs: '14px 12px', sm: '14px 18px' },
            paddingTop: { xs: '14px', sm: '28px' }, // Normal padding on mobile, extra on desktop for floating icon
            position: 'relative',
            overflow: 'hidden',
            cursor: { xs: 'grab', sm: 'default' },
            userSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            transition: 'transform 0.2s ease',
            '&:active': {
              cursor: { xs: 'grabbing', sm: 'default' },
              transform: { xs: 'scale(0.98)', sm: 'none' }
            },
            // Decorative pattern circles
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: { xs: -20, sm: -25 },
              left: { xs: -20, sm: -25 },
              width: { xs: 70, sm: 90 },
              height: { xs: 70, sm: 90 },
              borderRadius: '50%',
              backgroundColor: config.pattern1,
              opacity: 0.15,
              pointerEvents: 'none'
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: { xs: -25, sm: -30 },
              right: { xs: -25, sm: -30 },
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
              borderRadius: '50%',
              backgroundColor: config.pattern2,
              opacity: 0.1,
              pointerEvents: 'none'
            }
          }}
        >
        {/* Icon with decorative background - Show on mobile, hidden on desktop (desktop uses floating icon) */}
        <Box
          sx={{
            display: { xs: 'flex', sm: 'none' }, // Show on mobile, hide on desktop
            position: 'relative',
            flexShrink: 0,
            zIndex: 1
          }}
        >
          <Box
            sx={{
              width: { xs: 48 },
              height: { xs: 48 },
              borderRadius: '50%',
              backgroundColor: config.iconBgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: config.iconColor,
              fontSize: { xs: '1.5rem' },
              boxShadow: `0 4px 16px ${config.iconBgColor}40`,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -8,
                right: -8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                pointerEvents: 'none'
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -6,
                left: -6,
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.08)',
                pointerEvents: 'none'
              }
            }}
          >
            {config.icon}
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0, zIndex: 1, pr: { xs: 0.5, sm: 0 } }}>
          <Typography
            variant="h6"
            sx={{
              color: config.titleColor,
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.125rem' },
              mb: { xs: 0.3, sm: 0.4 },
              px: { xs: 1, sm: 7 },
              letterSpacing: '0.3px',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              lineHeight: { xs: 1.3, sm: 1.35 }
            }}
          >
            {config.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: config.messageColor,
              fontSize: { xs: '0.8125rem', sm: '0.875rem' },
              lineHeight: { xs: 1.45, sm: 1.55 },
              fontWeight: 500,
              px: { xs: 1, sm: 7 },
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              opacity: 0.95
            }}
          >
            {message}
          </Typography>
        </Box>

        {/* Close Button */}
        <Box
          onClick={hideSnackbar}
          sx={{
            color: config.closeIconColor,
            cursor: 'pointer',
            padding: { xs: '3px', sm: '6px' },
            borderRadius: '50%',
            minWidth: { xs: '28px', sm: '36px' },
            minHeight: { xs: '28px', sm: '36px' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            zIndex: 1,
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.2)',
              transform: 'scale(1.05)'
            },
            '&:active': {
              backgroundColor: 'rgba(255,255,255,0.15)',
              transform: 'scale(0.95)'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: { xs: '0.9rem', sm: '1.125rem' } }} />
        </Box>
      </Box>
      </Box>
    </Snackbar>
  );
};
