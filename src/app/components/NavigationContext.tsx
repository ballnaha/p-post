'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

interface NavigationContextType {
  isMobile: boolean;
  isSidebarOpen: boolean; // mobile drawer open, desktop sidebar visibility
  isSidebarCollapsed: boolean; // desktop collapsed (icon-only)
  isTransitioningToMobile: boolean; // true during desktop->mobile resize tick
  toggleNavigation: () => void; // mobile: open/close, desktop: collapse/expand
  toggleSidebar: () => void; // same as toggleNavigation
  closeAllMenus: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // โหลดสถานะจาก localStorage
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedOpen = localStorage.getItem('sidebar-open');
      return savedOpen ? JSON.parse(savedOpen) : false;
    }
    return false;
  });
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem('sidebar-collapsed');
      return savedCollapsed ? JSON.parse(savedCollapsed) : true;
    }
    return true;
  });
  
  // Track previous isMobile value
  const prevIsMobileRef = useRef(isMobile);
  const isTransitioningToMobile = !prevIsMobileRef.current && isMobile;

  // บันทึกสถานะลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-open', JSON.stringify(isSidebarOpen));
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed]);

  // ปรับ default state ตาม screen size
  useEffect(() => {
    const prevIsMobile = prevIsMobileRef.current;
    if (isMobile) {
      // On mobile, always close sidebar when switching to mobile view
      setIsSidebarOpen(false);
      setIsSidebarCollapsed(false);
    } else {
      // On desktop, ใช้สถานะจาก localStorage หรือเปิดแบบ mini
      const savedOpen = localStorage.getItem('sidebar-open');
      const savedCollapsed = localStorage.getItem('sidebar-collapsed');
      
      if (savedOpen !== null) {
        setIsSidebarOpen(JSON.parse(savedOpen));
      } else {
        setIsSidebarOpen(true);
      }
      
      if (savedCollapsed !== null) {
        setIsSidebarCollapsed(JSON.parse(savedCollapsed));
      } else {
        setIsSidebarCollapsed(true);
      }
    }
    // Update ref
    prevIsMobileRef.current = isMobile;
  }, [isMobile]);

  // จัดการ body scroll lock - ปรับให้ไม่ lock ถ้ากำลัง transition เป็น mobile
  useLayoutEffect(() => {
    const prevIsMobile = prevIsMobileRef.current;
    const transitioningToMobile = !prevIsMobile && isMobile;
    // ไม่ lock ถ้ากำลัง transition เป็น mobile (ต้องรอให้ state update ก่อน)
    if (isMobile && isSidebarOpen && !transitioningToMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }

    // Cleanup
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isMobile, isSidebarOpen]);

  const toggleNavigation = () => {
    if (isMobile) {
      setIsSidebarOpen((prev: boolean) => !prev);
    } else {
      setIsSidebarCollapsed((prev: boolean) => !prev);
      setIsSidebarOpen(true);
    }
  };

  const toggleSidebar = () => {
    toggleNavigation();
  };

  const closeAllMenus = () => {
    setIsSidebarOpen(false);
  };

  return (
    <NavigationContext.Provider value={{ 
      isMobile, 
      isSidebarOpen,
      isSidebarCollapsed,
      isTransitioningToMobile,
      toggleNavigation, 
      toggleSidebar, 
      closeAllMenus 
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
