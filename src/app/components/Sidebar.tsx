'use client';
import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Add,
  Home as HomeIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigation } from './NavigationContext';
import { usePathname, useRouter } from 'next/navigation';
const drawerWidth = 250;

const Sidebar: React.FC = () => {
  const { isMobile, isSidebarOpen, isSidebarCollapsed, closeAllMenus } = useNavigation();
  const router = useRouter();
  const pathname = usePathname();

  type MenuItem = {
    label: string;
    href?: string;
    icon?: React.ReactNode;
    children?: MenuItem[];
    key: string; // unique key for expand management
  };

  type MenuGroup = {
    title: string;
    items: MenuItem[];
    key: string;
  };

  const menuGroups: MenuGroup[] = useMemo(() => ([
    {
      title: 'Main', key: 'group-main',
      items: [
        { label: 'Dashboard', href: '/', icon: <HomeIcon sx={{ fontSize: 20 }} />, key: 'dashboard' },
      ]
    },
    {
      title: 'Access', key: 'group-access',
      items: [
        { label: 'Users', href: '/users', icon: <PersonAddIcon sx={{ fontSize: 20 }} />, key: 'users' },
        {
          label: 'Auth', icon: <LoginIcon sx={{ fontSize: 20 }} />, key: 'auth',
          children: [
            { label: 'Login', href: '/login', icon: <LoginIcon sx={{ fontSize: 18 }} />, key: 'auth-login' },
            { label: 'Register', href: '/register', icon: <PersonAddIcon sx={{ fontSize: 18 }} />, key: 'auth-register' },
          ]
        },
      ]
    },
    {
      title: 'Settings', key: 'group-settings',
      items: [
        {
          label: 'Settings (demo)', href: '/settings', icon: <SettingsIcon sx={{ fontSize: 20 }} />, key: 'settings',
          children: [
            { label: 'Profile', href: '/settings/profile', key: 'settings-profile' },
            { label: 'Preferences', href: '/settings/preferences', key: 'settings-preferences' },
            { label: 'Security', href: '/settings/security', key: 'settings-security' },
          ]
        },
      ]
    },
  ]), []);

  // Flatten for collapsed (icon-only) view
  const collapsedItems: MenuItem[] = useMemo(() => {
    return menuGroups.flatMap((g) => g.items);
  }, [menuGroups]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const isActive = (href?: string) => !!href && pathname === href;
  const isParentActive = (item: MenuItem) => item.children?.some(c => pathname === c.href) || (item.href ? pathname.startsWith(item.href) : false);

  // สร้าง content สำหรับ sidebar
  const sidebarContent = (
    <>

      {/* Menu List + Submenus */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, pb: 2 , pt: 2}}>
        {menuGroups.map((group, gi) => (
          <Box key={group.key} sx={{ mb: 1.5 }}>
            <Typography variant="overline" sx={{ color: '#9CA3AF', px: 1, letterSpacing: 0.8 }}>
              {group.title}
            </Typography>
            <List sx={{ mt: 0.5 }}>
              {group.items.map((item) => {
            const active = isActive(item.href) || isParentActive(item);
            const hasChildren = !!item.children?.length;
            const open = expanded[item.key] || false;

            return (
              <Box key={item.key}>
                <ListItemButton
                  selected={!!item.href && isActive(item.href)}
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpand(item.key);
                    } else if (item.href) {
                      router.push(item.href);
                      if (isMobile) closeAllMenus();
                    }
                  }}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    mb: hasChildren ? 0 : 0.5,
                    '&:hover': { backgroundColor: '#F9FAFB' },
                    '&.Mui-selected': { backgroundColor: '#EEF2FF', border: '1px solid #E0E7FF' },
                    '&.Mui-selected:hover': { backgroundColor: '#E5E7FF' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: active ? '#4F46E5' : '#9CA3AF' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: 14, color: active ? '#111827' : '#374151' }}>
                        {item.label}
                      </Typography>
                    }
                  />
          {hasChildren ? (open ? <ExpandLess sx={{ color: '#9CA3AF' }} /> : <ExpandMore sx={{ color: '#9CA3AF' }} />) : null}
                </ListItemButton>

                {hasChildren && (
                  <Collapse in={open} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ mb: 0.5, borderLeft: '1px dashed #E5E7EB', ml: 2 }}>
                      {item.children!.map((child) => {
                        const childActive = isActive(child.href);
                        return (
                          <ListItemButton
                            key={child.key}
                            selected={childActive}
                            onClick={() => {
                              if (child.href) {
                                router.push(child.href);
                                if (isMobile) closeAllMenus();
                              }
                            }}
                            sx={{
                              borderRadius: 2,
                              mx: 2,
                              mb: 0.5,
                              '&:hover': { backgroundColor: '#F9FAFB' },
                              '&.Mui-selected': { backgroundColor: '#EEF2FF', border: '1px solid #E0E7FF' },
                              '&.Mui-selected:hover': { backgroundColor: '#E5E7FF' },
                            }}
                          >
                            {child.icon && (
                              <ListItemIcon sx={{ minWidth: 32, color: childActive ? '#4F46E5' : '#9CA3AF' }}>
                                {child.icon}
                              </ListItemIcon>
                            )}
                            <ListItemText
                              primary={
                                <Typography sx={{ fontSize: 13, color: childActive ? '#111827' : '#4B5563' }}>
                                  {child.label}
                                </Typography>
                              }
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
              })}
            </List>
            {gi < menuGroups.length - 1 && <Divider sx={{ my: 1.25 }} />}
          </Box>
        ))}
      </Box>
      
    </>
  );

  // Mobile: ใช้ Drawer (เปิดจากซ้าย)
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        anchor="left"
        open={isSidebarOpen}
        onClose={closeAllMenus}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: '#ffffff',
            color: '#111827',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            pt: { xs: '56px', sm: '64px' },
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Desktop: ใช้ Fixed position
  return (
    <Box
      sx={{
        width: isSidebarCollapsed ? 72 : drawerWidth,
        height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
  backgroundColor: '#ffffff',
  color: '#111827',
  borderRight: '1px solid #e5e7eb',
        position: 'fixed',
        left: 0, // ติดซ้ายสุดเพราะไม่มี vertical nav แล้ว
        top: { xs: 56, sm: 64 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Collapsed header spacer removed per request (hide hamburger in sidebar when collapsed) */}

      {/* Search and content hidden when collapsed */}
      <Box sx={{ display: isSidebarCollapsed ? 'none' : 'block', height: '100%', overflow: 'hidden' }}>
        {sidebarContent}
      </Box>

      {/* Mini icon-only menu when collapsed */}
      {isSidebarCollapsed && (
        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          <List disablePadding>
            {collapsedItems.map((item: MenuItem) => {
              const activeCollapsed = (item.href && pathname === item.href) ||
                (item.children?.some((c: MenuItem) => c.href && pathname === c.href));
              return (
                <Tooltip key={`mini-${item.key}`} title={item.label} placement="right">
                  <ListItemButton
                    selected={activeCollapsed}
                    onClick={() => {
                      if (item.href) {
                        router.push(item.href);
                      } else if (item.children && item.children[0]?.href) {
                        router.push(item.children[0].href);
                      }
                    }}
                    sx={{
                      position: 'relative',
                      my: 0.5,
                      mx: 0.75,
                      borderRadius: 2,
                      
                      minHeight: 48,
                      justifyContent: 'center',
                      '&:hover': { backgroundColor: '#F9FAFB' },
                      '&.Mui-selected': { backgroundColor: 'transparent' },                     
                      '&.Mui-selected:hover': { backgroundColor: '#F9FAFB' },
                      '&::before': activeCollapsed ? {
                        content: '""',
                        position: 'absolute',
                        left: 4,
                        top: 6,
                        bottom: 6,
                        width: 3,
                        borderRadius: 2,
                        backgroundColor: '#4F46E5',
                      } : {},
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, color: activeCollapsed ? '#4F46E5' : '#9CA3AF', '& svg': { fontSize: 22 } }}>
                      {item.icon}
                    </ListItemIcon>
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default Sidebar;