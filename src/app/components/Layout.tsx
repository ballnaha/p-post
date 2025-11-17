'use client';
import React, { useEffect } from 'react';
import { Box, Backdrop } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumbs from './Breadcrumbs';
import { NavigationProvider, useNavigation } from './NavigationContext';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  customSidebar?: React.ReactNode;
}

const LayoutContent: React.FC<LayoutProps> = ({ children, showSidebar = true, customSidebar }) => {
  const { isMobile, isSidebarOpen, isSidebarCollapsed, closeAllMenus } = useNavigation();
  
  // ไม่ต้องจัดการ body scroll ใน Layout เพราะ NavigationContext จัดการให้แล้ว
  
  // คำนวณ margin สำหรับ desktop (รวม custom sidebar)
  const getMarginLeft = () => {
    if (isMobile) return 0; // Mobile ไม่มี margin
  const defaultSidebarWidth = showSidebar && isSidebarOpen ? (isSidebarCollapsed ? 72 : 250) : 0;
    const customSidebarWidth = customSidebar ? 280 : 0; // custom sidebar ก็กว้าง 280px
    return `${defaultSidebarWidth + customSidebarWidth}px`;
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
    }}>
      {/* Backdrop: Removed to avoid duplicate overlays; Drawer provides its own backdrop on mobile. */}

      {/* Left Vertical Navigation */}
      
      {/* Sidebar - Mobile: Drawer ควบคุม open ด้วย isSidebarOpen, Desktop: แสดงถ้า isSidebarOpen = true */}
      {showSidebar && <Sidebar />}
      {customSidebar}
      
      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        ml: getMarginLeft(),
        minWidth: 0,
        overflow: 'hidden',
        height: '100vh',
        width: '100%',
      }}>
        <Header />
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: '#f8f9fa',
            overflow: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            pt: { xs: '56px', sm: '64px' },
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            width: '100%',
          }}
        >
          {/* Breadcrumbs */}
          <Box sx={{ px: { xs: 2, sm: 3 } }}>
            <Breadcrumbs />
          </Box>
          
          {/* Main Content */}
          <Box sx={{ p: { xs: 2, sm: 3 }, pt: 0 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true, customSidebar }) => {
  return (
    <NavigationProvider>
      <LayoutContent showSidebar={showSidebar} customSidebar={customSidebar}>
        {children}
      </LayoutContent>
    </NavigationProvider>
  );
};

export default Layout;
