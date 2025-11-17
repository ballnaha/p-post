'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), {
    noSsr: true, // ป้องกัน SSR mismatch
  });
  
  console.log('NavigationProvider render - isMobile:', isMobile, 'window.innerWidth:', typeof window !== 'undefined' ? window.innerWidth : 'N/A');
  
  // State สำหรับ sidebar
  // Desktop: isSidebarOpen ควรเป็น true เสมอ, ใช้ isSidebarCollapsed ควบคุมแทน
  // Mobile: isSidebarOpen ควบคุมการเปิด/ปิด drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // เริ่มต้นด้วย false ถ้าเป็น mobile, true ถ้าเป็น desktop
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 900; // 900px = md breakpoint
    }
    return true; // SSR default to desktop
  });
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem('sidebar-collapsed');
      return savedCollapsed ? JSON.parse(savedCollapsed) : true;
    }
    return true; // Default: collapsed (mini icon)
  });
  
  // Track previous isMobile value
  const prevIsMobileRef = useRef(isMobile);
  const isTransitioningToMobile = !prevIsMobileRef.current && isMobile;

  // บันทึกสถานะ collapsed ลง localStorage (เฉพาะ Desktop)
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, isMobile]);

  // ปรับ default state ตาม screen size
  useEffect(() => {
    const prevIsMobile = prevIsMobileRef.current;
    if (isMobile) {
      // On mobile, always close sidebar when switching to mobile view
      setIsSidebarOpen(false);
      setIsSidebarCollapsed(false);
      
      // Force reset body styles when switching to mobile
      if (!prevIsMobile) {
        // Switching from desktop to mobile
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        
        // Force layout recalculation
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    } else {
      // On desktop, sidebar แสดงเสมอ (isSidebarOpen = true) แต่ควบคุมการแสดงผลด้วย isSidebarCollapsed
      setIsSidebarOpen(true); // Desktop: sidebar แสดงเสมอ
      
      // โหลดสถานะ collapsed จาก localStorage
      const savedCollapsed = localStorage.getItem('sidebar-collapsed');
      if (savedCollapsed !== null) {
        setIsSidebarCollapsed(JSON.parse(savedCollapsed));
      } else {
        setIsSidebarCollapsed(true); // Default: collapsed (mini icon)
      }
      
      // Force reset body styles when switching to desktop
      if (prevIsMobile) {
        // Switching from mobile to desktop
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
      }
    }
    // Update ref
    prevIsMobileRef.current = isMobile;
  }, [isMobile]);

  // ไม่ต้องจัดการ body scroll lock เอง เพราะ MUI Drawer จะจัดการให้เมื่อ disableScrollLock={false}
  // แต่ต้องทำความสะอาด style ที่อาจค้างจากการ resize
  useLayoutEffect(() => {
    if (!isMobile || !isSidebarOpen) {
      // รีเซ็ต body styles เมื่อไม่ได้อยู่ในสถานะที่ต้อง lock
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }
  }, [isMobile, isSidebarOpen]);

  const toggleNavigation = useCallback(() => {
    console.log('toggleNavigation called, isMobile:', isMobile);
    if (isMobile) {
      setIsSidebarOpen((prev: boolean) => {
        console.log('Setting isSidebarOpen from', prev, 'to', !prev);
        return !prev;
      });
    } else {
      setIsSidebarCollapsed((prev: boolean) => !prev);
      setIsSidebarOpen(true);
    }
  }, [isMobile]);

  const toggleSidebar = useCallback(() => {
    toggleNavigation();
  }, [toggleNavigation]);

  const closeAllMenus = useCallback(() => {
    // ปิด sidebar เฉพาะบน mobile เท่านั้น (Desktop ไม่ต้องปิด)
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

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
