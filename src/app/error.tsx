'use client';
import React, { useEffect } from 'react';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import { 
  Home as HomeIcon, 
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon 
} from '@mui/icons-material';

/**
 * Global Error Page - Minimal & Professional Design
 * 
 * Handles unexpected errors with a clean interface and recovery options.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console or error reporting service
    console.error('Application Error:', error);
  }, [error]);

  return (
    <html>
      <body>
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
              <ErrorIcon
                sx={{
                  fontSize: 100,
                  color: 'error.main',
                  opacity: 0.5,
                  mb: 3,
                }}
              />

              {/* Title */}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2,
                }}
              >
                เกิดข้อผิดพลาด
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
                มีบางอย่างผิดพลาด กรุณาลองใหม่อีกครั้งหรือกลับไปหน้าแรก
              </Typography>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && (
                <Paper
                  sx={{
                    p: 2,
                    mb: 4,
                    bgcolor: 'grey.50',
                    textAlign: 'left',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {error.message}
                  </Typography>
                </Paper>
              )}

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
                  startIcon={<RefreshIcon />}
                  onClick={reset}
                  sx={{
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  ลองใหม่อีกครั้ง
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={<HomeIcon />}
                  onClick={() => window.location.href = '/'}
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

              {/* Error digest (if available) */}
              {error.digest && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 4,
                    opacity: 0.6,
                  }}
                >
                  Error ID: {error.digest}
                </Typography>
              )}
            </Paper>
          </Container>
        </Box>
      </body>
    </html>
  );
}
