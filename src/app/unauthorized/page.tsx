'use client';
import React from 'react';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import { 
  Home as HomeIcon, 
  ArrowBack as ArrowBackIcon,
  Lock as LockIcon 
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

/**
 * Unauthorized Access Page (403) - Minimal & Professional Design
 * 
 * Displays when user tries to access a page without proper permissions.
 */
export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
          }}
        >
          {/* Icon */}
          <LockIcon
            sx={{
              fontSize: 100,
              color: 'warning.main',
              opacity: 0.5,
              mb: 3,
            }}
          />

          {/* 403 Text */}
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: '3rem', sm: '4rem' },
              fontWeight: 700,
              color: 'text.secondary',
              mb: 2,
              opacity: 0.8,
            }}
          >
            403
          </Typography>

          {/* Title */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 2,
            }}
          >
            ไม่มีสิทธิ์เข้าถึง
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 4,
              maxWidth: 400,
              mx: 'auto',
            }}
          >
            คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบหากคุณคิดว่านี่เป็นข้อผิดพลาด
          </Typography>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
              sx={{
                textTransform: 'none',
                px: 3,
                py: 1,
                borderRadius: 2,
              }}
            >
              ย้อนกลับ
            </Button>
            
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={() => router.push('/')}
              sx={{
                textTransform: 'none',
                px: 3,
                py: 1,
                borderRadius: 2,
              }}
            >
              กลับหน้าแรก
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
