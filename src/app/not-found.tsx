'use client';
import React from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { 
  Home as HomeIcon, 
  ArrowBack as ArrowBackIcon,
  SearchOff as SearchOffIcon 
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

/**
 * 404 Not Found Page - Minimal & Professional Design
 * 
 * A clean and user-friendly error page that helps users navigate back
 * to the application when they encounter a page that doesn't exist.
 */
export default function NotFound() {
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
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
          }}
        >
          {/* Icon */}
          <SearchOffIcon
            sx={{
              fontSize: 120,
              color: 'action.disabled',
              opacity: 0.3,
              mb: 3,
            }}
          />

          {/* 404 Text */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '4rem', sm: '6rem' },
              fontWeight: 700,
              color: 'text.secondary',
              mb: 2,
              opacity: 0.8,
            }}
          >
            404
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
            ไม่พบหน้าที่คุณต้องการ
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

          {/* Footer hint */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mt: 6,
              opacity: 0.6,
            }}
          >
            หากปัญหานี้เกิดขึ้นซ้ำ กรุณาติดต่อผู้ดูแลระบบ
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
