'use client';
import React, { useMemo, useState, useEffect } from 'react';
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
  CloudUpload as ImportIcon,
  Badge as BadgeIcon,
  SwapHoriz as SwapIcon,
  ChangeHistory as ThreeWayIcon,
  EventAvailable as VacantIcon,
  AssignmentTurnedIn as AssignmentIcon,
  History as HistoryIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { useNavigation } from './NavigationContext';
import { usePathname, useRouter } from 'next/navigation';
const drawerWidth = 250;

const Sidebar: React.FC = () => {
  const { isMobile, isSidebarOpen, isSidebarCollapsed, closeAllMenus, isTransitioningToMobile } = useNavigation();
  const router = useRouter();
  const pathname = usePathname();

  // ปิด sidebar อัตโนมัติเมื่อเปลี่ยนหน้าใน mobile
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      closeAllMenus();
    }
  }, [pathname]); // เมื่อ pathname เปลี่ยน

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
      title: 'Swap Management', key: 'group-swap',
      items: [
      { 
          label: 'สลับตำแหน่ง', 
          href: '/police-personnel/swap-list', 
          icon: <SwapIcon sx={{ fontSize: 20 }} />, 
          key: 'swap-list' 
        },
        { 
          label: 'สามเส้า', 
          href: '/police-personnel/three-way-swap', 
          icon: <ThreeWayIcon sx={{ fontSize: 20 }} />, 
          key: 'three-way-swap' 
        },
      ]
    },
    {
      title: 'Vacant Position', key: 'group-vacant',
      items: [
        
        { 
          label: 'บุคลากรยื่นขอตำแหน่ง', 
          href: '/police-personnel/vacant-position', 
          icon: <VacantIcon sx={{ fontSize: 20 }} />, 
          key: 'vacant-position' 
        },
        { 
          label: 'จัดการจับคู่ตำแหน่ง', 
          href: '/police-personnel/vacant-position/assignment', 
          icon: <AssignmentIcon sx={{ fontSize: 20 }} />, 
          key: 'vacant-assignment' 
        },
        { 
          label: 'ประวัติการจับคู่', 
          href: '/police-personnel/vacant-position/assignment-history', 
          icon: <HistoryIcon sx={{ fontSize: 20 }} />, 
          key: 'assignment-history' 
        },
        
      ]
    },
    {
      title: 'Settings', key: 'group-settings',
      items: [
        { 
          label: 'Import Data', 
          href: '/police-personnel/import', 
          icon: <ImportIcon sx={{ fontSize: 20 }} />, 
          key: 'police-import' 
        },
        { 
          label: 'Personnel List', 
          href: '/police-personnel', 
          icon: <BadgeIcon sx={{ fontSize: 20 }} />, 
          key: 'police-list' 
        },
        
        { 
          label: 'Sync ตำแหน่งว่าง', 
          href: '/police-personnel/vacant-position/sync', 
          icon: <SyncIcon sx={{ fontSize: 20 }} />, 
          key: 'vacant-sync' 
        },
      ]
    },
    {
      title: 'Admin', key: 'group-admin',
      items: [
        { label: 'จัดการผู้ใช้งาน', href: '/users', icon: <PersonAddIcon sx={{ fontSize: 20 }} />, key: 'users' },
        
      ]
    },
    // {
    //   title: 'Settings', key: 'group-settings',
    //   items: [
    //     {
    //       label: 'Settings (demo)', href: '/settings', icon: <SettingsIcon sx={{ fontSize: 20 }} />, key: 'settings',
    //       children: [
    //         { label: 'Profile', href: '/settings/profile', key: 'settings-profile' },
    //         { label: 'Preferences', href: '/settings/preferences', key: 'settings-preferences' },
    //         { label: 'Security', href: '/settings/security', key: 'settings-security' },
    //       ]
    //     },
    //   ]
    // },
  ]), []);

  // Flatten for collapsed (icon-only) view
  const collapsedItems: MenuItem[] = useMemo(() => {
    return menuGroups.flatMap((g) => g.items);
  }, [menuGroups]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const isActive = (href?: string) => !!href && pathname === href;
  const isParentActive = (item: MenuItem) => {
    // ถ้ามี children ให้เช็คว่า child ตัวใดตัวหนึ่งตรงกับ pathname
    if (item.children?.some(c => pathname === c.href)) {
      return true;
    }
    // ถ้าไม่มี children และมี href ให้เช็คว่าตรงกัน exact
    return false;
  };

  // สร้าง content สำหรับ sidebar
  const sidebarContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden', // Parent ไม่ overflow
      }}
    >
      {/* Menu List + Submenus */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: 'auto', // เปิด scroll แนวตั้ง
          overflowX: 'hidden', // ปิด scroll แนวนอน
          px: 1, 
          pb: 2, 
          pt: 2,
          // Custom scrollbar
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(156, 163, 175, 0.3)',
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: 'rgba(156, 163, 175, 0.5)',
            },
          },
        }}
      >
        {menuGroups.map((group, gi) => (
          <Box key={group.key} sx={{ mb: 1.5 }}>
            <Typography variant="overline" sx={{ color: '#9CA3AF', px: 1, letterSpacing: 0.8, fontSize: '0.7rem' }}>
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
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                    '&.Mui-selected': { 
                      backgroundColor: 'rgba(99, 102, 241, 0.15)', 
                      borderLeft: '3px solid #6366F1',
                      paddingLeft: '13px',
                    },
                    '&.Mui-selected:hover': { backgroundColor: 'rgba(99, 102, 241, 0.25)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: active ? '#818CF8' : '#9CA3AF' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: 14, color: active ? '#E5E7EB' : '#D1D5DB', fontWeight: active ? 700 : 500 }}>
                        {item.label}
                      </Typography>
                    }
                  />
          {hasChildren ? (open ? <ExpandLess sx={{ color: '#9CA3AF' }} /> : <ExpandMore sx={{ color: '#9CA3AF' }} />) : null}
                </ListItemButton>

                {hasChildren && (
                  <Collapse in={open} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ mb: 0.5, borderLeft: '1px dashed #4B5563', ml: 2 }}>
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
                              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                              '&.Mui-selected': { 
                                backgroundColor: 'rgba(99, 102, 241, 0.15)', 
                                borderLeft: '3px solid #6366F1',
                                paddingLeft: '13px',
                              },
                              '&.Mui-selected:hover': { backgroundColor: 'rgba(99, 102, 241, 0.25)' },
                            }}
                          >
                            {child.icon && (
                              <ListItemIcon sx={{ minWidth: 32, color: childActive ? '#818CF8' : '#9CA3AF' }}>
                                {child.icon}
                              </ListItemIcon>
                            )}
                            <ListItemText
                              primary={
                                <Typography sx={{ fontSize: 13, color: childActive ? '#E5E7EB' : '#D1D5DB', fontWeight: childActive ? 700 : 500 }}>
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
            {gi < menuGroups.length - 1 && <Divider sx={{ my: 1.25, backgroundColor: '#374151' }} />}
          </Box>
        ))}
      </Box>
    </Box>
  );

  // Mobile: ใช้ Drawer (เปิดจากซ้าย)
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        anchor="left"
        open={isSidebarOpen && !isTransitioningToMobile}
        onClose={closeAllMenus}
        // Don't keep modal mounted and don't let Modal manage body scroll
        ModalProps={{ keepMounted: false, disableScrollLock: true }}
        hideBackdrop={false}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            backgroundColor: '#1F2937',
            color: '#F9FAFB',
            borderRight: '1px solid #374151',
            display: 'flex',
            flexDirection: 'column',
            pt: { xs: '56px', sm: '64px' },
            overflow: 'hidden', // ป้องกัน overflow ที่ paper
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Desktop: ใช้ Fixed position
  // ซ่อนถ้า sidebar ปิด (isSidebarOpen = false)
  if (!isSidebarOpen) {
    return null;
  }

  return (
    <Box
      sx={{
        width: isSidebarCollapsed ? 72 : drawerWidth,
        height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
        backgroundColor: '#1F2937',
        color: '#F9FAFB',
        borderRight: '1px solid #374151',
        position: 'fixed',
        left: 0,
        top: { xs: 56, sm: 64 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // ป้องกัน overflow ที่ parent
      }}
    >
      {/* Collapsed header spacer removed per request (hide hamburger in sidebar when collapsed) */}

      {/* Search and content hidden when collapsed */}
      <Box 
        sx={{ 
          display: isSidebarCollapsed ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%', 
          overflow: 'hidden', // ให้ Box นี้ไม่ overflow
        }}
      >
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
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                      '&.Mui-selected': { backgroundColor: 'transparent' },                     
                      '&.Mui-selected:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                      '&::before': activeCollapsed ? {
                        content: '""',
                        position: 'absolute',
                        left: 4,
                        top: 6,
                        bottom: 6,
                        width: 3,
                        borderRadius: 2,
                        backgroundColor: '#6366F1',
                      } : {},
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 0, color: activeCollapsed ? '#818CF8' : '#9CA3AF', '& svg': { fontSize: 22 } }}>
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