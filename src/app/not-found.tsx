'use client';
import React from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { 
  Home as HomeIcon, 
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
      <Container maxWidth="md">
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Image */}
          <Box sx={{ position: 'relative', width: '100%', maxWidth: 500, height: 350, mb: 4 }}>
             <Image
               src="/images/404_bg.png"
               alt="404 Not Found"
               fill
               style={{ objectFit: 'contain' }}
               priority
             />
          </Box>

          {/* 404 Text */}
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '3rem', sm: '5rem' },
              fontWeight: 800,
              color: 'primary.main',
              mb: 1,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            404
          </Typography>

          {/* Title */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              mb: 2,
            }}
          >
            ไม่พบหน้าที่คุณต้องการ
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 5, maxWidth: 600, fontSize: '1.1rem' }}
          >
            ขออภัย หน้าที่คุณกำลังมองหาอาจถูกลบ เปลี่ยนชื่อ หรือไม่สามารถใช้งานได้ในขณะนี้ 
            กรุณาตรวจสอบ URL อีกครั้ง หรือกลับไปที่หน้าแรก
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
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                }
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
                px: 4,
                py: 1.5,
                borderRadius: 3,
                fontSize: '1rem',
                boxShadow: 4,
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
              mt: 8,
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
