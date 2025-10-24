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
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Track previous isMobile value
  const prevIsMobileRef = useRef(isMobile);
  const isTransitioningToMobile = !prevIsMobileRef.current && isMobile;

  // ปรับ default state ตาม screen size
  useEffect(() => {
    const prevIsMobile = prevIsMobileRef.current;
    if (isMobile) {
      // On mobile, always close sidebar when switching to mobile view
      setIsSidebarOpen(false);
      setIsSidebarCollapsed(false);
    } else {
      // On desktop, opened by default (mini/collapsed)
      setIsSidebarOpen(true);
      setIsSidebarCollapsed(true); // Default เป็น mini sidebar
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
      setIsSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
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
