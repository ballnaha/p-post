'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

interface NavigationContextType {
  isMobile: boolean;
  isSidebarOpen: boolean; // mobile drawer open, desktop sidebar visibility
  isSidebarCollapsed: boolean; // desktop collapsed (icon-only)
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

  // ปรับ default state ตาม screen size
  useEffect(() => {
    if (isMobile) {
      // On mobile, start hidden
      setIsSidebarOpen(false);
      setIsSidebarCollapsed(false);
    } else {
      // On desktop, opened by default (expanded)
      setIsSidebarOpen(true);
      setIsSidebarCollapsed(false);
    }
  }, [isMobile]);

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
      toggleNavigation, 
      toggleSidebar, 
      closeAllMenus 
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
