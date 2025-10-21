'use client';
import React from 'react';
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
  
  // คำนวณ margin สำหรับ desktop (รวม custom sidebar)
  const getMarginLeft = () => {
    if (isMobile) return 0; // Mobile ไม่มี margin
  const defaultSidebarWidth = showSidebar && isSidebarOpen ? (isSidebarCollapsed ? 72 : 250) : 0;
    const customSidebarWidth = customSidebar ? 280 : 0; // custom sidebar ก็กว้าง 280px
    return `${defaultSidebarWidth + customSidebarWidth}px`;
  };
  
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <Backdrop
          open={true}
          onClick={closeAllMenus}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer - 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Left Vertical Navigation */}
      
  {/* Sidebar */}
  {showSidebar && (isMobile || (!isMobile && isSidebarOpen)) && <Sidebar />}
      {customSidebar}
      
      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        ml: getMarginLeft(),
        transition: 'margin-left 0.3s ease',
        minWidth: 0, // ป้องกัน overflow ใน mobile
      }}>
        <Header />
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: '#f8f9fa',
            overflow: 'auto',
            minHeight: 0, // ป้องกัน layout ยืด
            pt: { xs: '56px', sm: '64px' },
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
