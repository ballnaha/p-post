'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, CircularProgress, Typography, Button, Alert } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean; // เพิ่ม prop สำหรับบังคับ admin
}

export default function AuthGuard({ children, requireAdmin = true }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // ยังกำลังโหลด

    if (!session) {
      // ไม่มี session ให้ redirect ไป login
      router.push('/login');
      return;
    }

    // ตรวจสอบ role ถ้าต้องการ admin
    if (requireAdmin && session.user?.role !== 'admin') {
      // ไม่ใช่ admin ให้ redirect ไป unauthorized page หรือ login
      router.push('/login?error=unauthorized');
      return;
    }
  }, [session, status, router, requireAdmin]);

  // แสดง loading ขณะกำลังตรวจสอบ session
  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
        </Typography>
      </Box>
    );
  }

  // ไม่มี session
  if (!session) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
          กำลังเปลี่ยนเส้นทางไปหน้าเข้าสู่ระบบ...
        </Typography>
        <CircularProgress size={30} />
      </Box>
    );
  }

  // ตรวจสอบ role ถ้าไม่ใช่ admin
  if (requireAdmin && session.user?.role !== 'admin') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          p: 3,
        }}
      >
        <LockIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" color="error" sx={{ mb: 2, fontWeight: 600 }}>
          ไม่มีสิทธิ์เข้าถึง
        </Typography>
        <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
          <Typography variant="body1">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้ ต้องเป็น <strong>Admin</strong> เท่านั้น
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Role ปัจจุบันของคุณ: <strong>{session.user?.role || 'ไม่ระบุ'}</strong>
          </Typography>
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => router.push('/login')}
          sx={{ minWidth: 150 }}
        >
          กลับไปหน้าเข้าสู่ระบบ
        </Button>
      </Box>
    );
  }

  // มี session และเป็น admin แล้ว แสดง children
  return <>{children}</>;
}
