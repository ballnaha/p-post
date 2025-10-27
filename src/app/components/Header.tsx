'use client';
import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert,
  Logout,
  Person,
  Menu as MenuIcon,
  
} from '@mui/icons-material';
import { useNavigation } from './NavigationContext';

const Header: React.FC = () => {
  const { data: session } = useSession();
  const { isMobile, toggleNavigation, toggleSidebar } = useNavigation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    
    try {
      // 1. Call server-side logout API to clear session cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // 2. Clear all localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
      
      // 3. Clear all sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
      
      // 4. Clear all cookies from client-side
      if (typeof window !== 'undefined') {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
      
      // 5. SignOut from NextAuth (clear NextAuth session)
      const isProduction = process.env.NODE_ENV === 'production';
      const envBase = isProduction
        ? process.env.NEXT_PUBLIC_BASE_URL
        : process.env.NEXTAUTH_URL;
      const baseUrl = (envBase || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
      
      await signOut({
        callbackUrl: `${baseUrl}/login`,
        redirect: false // Don't auto-redirect, we'll do it manually
      });
      
      // 6. Hard reload to ensure complete cache clear
      if (typeof window !== 'undefined') {
        window.location.href = `${baseUrl}/login`;
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout API fails
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  // สร้าง initials จาก username หรือใช้ default
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const userInitials = session?.user?.username 
    ? getInitials(session.user.username) 
    : 'U';

  return (
    <AppBar
      position="fixed"
      sx={{ 
        backgroundColor: (theme) => theme.palette.background.paper,
        color: (theme) => theme.palette.text.primary,
        boxShadow: '0 2px 6px rgba(17,24,39,0.04)',
        borderBottom: '1px solid #e5e7eb',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backdropFilter: 'blur(6px)'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Left: Menu button + App title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={toggleNavigation} size="large" aria-label="Toggle menu" color="inherit">
              <MenuIcon />
            </IconButton>
          </Box>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              display: { xs: 'none', sm: 'block' },
              fontWeight: 600,
              letterSpacing: 0.2,
              userSelect: 'none'
            }}
          >
            <img src="/images/logo_2.png" alt="P POST Logo" style={{ height: 40, verticalAlign: 'middle' }} />
          </Typography>
        </Box>
        
        {/* Right side - User info & Action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          {/* User Avatar & Info */}
          <Avatar sx={{ width: 40, height: 40, bgcolor: '#EEF2FF', color: '#4F46E5', border: '1px solid #E5E7EB' }}>
            {userInitials}
          </Avatar>
          <Box sx={{ 
            display: { xs: 'none', sm: 'block' }, 
            textAlign: 'right',
            minWidth: 0 // ป้องกันการล้น
          }}>
            <Typography 
              variant="subtitle2" 
              component="div" 
              sx={{ 
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 150
              }}
            >
              {session?.user?.username || 'ผู้ใช้งาน'}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ color: '#6B7280', lineHeight: 1 }}
            >
              {session?.user?.role || 'user'}
            </Typography>
          </Box>
          
          {/* More menu */}
          <IconButton onClick={handleMenuClick} size="medium" color="inherit">
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>ออกจากระบบ</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
