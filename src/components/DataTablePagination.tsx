"use client";
import React from 'react';
import {
  Box,
  IconButton,
  TablePagination,
  Tooltip,
  Typography,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

export type DataTablePaginationProps = {
  count: number; // total rows in server
  page: number; // zero-based page index
  rowsPerPage: number;
  rowsPerPageOptions?: number[];
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  disabled?: boolean;
  label?: string;
  variant?: 'standard' | 'minimal';
  dense?: boolean; // ultra compact spacing
  showLabel?: boolean; // show left info label
  showRowsPerPage?: boolean; // show rows per page selector
  sx?: SxProps<Theme>; // allow custom spacing overrides
};

export default function DataTablePagination({
  count,
  page,
  rowsPerPage,
  rowsPerPageOptions = [5, 10, 25, 50],
  onPageChange,
  onRowsPerPageChange,
  disabled,
  label,
  variant = 'standard',
  dense = false,
  showLabel = true,
  showRowsPerPage = true,
  sx,
}: DataTablePaginationProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isSmallScreen = isMobile || isTablet;
  const totalPages = Math.max(1, Math.ceil(count / rowsPerPage));
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;

  if (variant === 'minimal') {
    const startItem = count === 0 ? 0 : page * rowsPerPage + 1;
    const endItem = Math.min((page + 1) * rowsPerPage, count);

    const baseMinimalSx = { 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center', 
        justifyContent: 'space-between', 
        px: dense ? { xs: 1, sm: 1.25 } : { xs: 1.5, sm: 2 }, 
        py: dense ? { xs: 0.5, sm: 0.75 } : { xs: 1, sm: 1.5 }, 
        gap: isMobile ? (dense ? 1 : 1.5) : 0,
        borderTop: '1px solid', 
        borderColor: 'divider' 
      } as const;
    return (
      <Box sx={(sx ? [baseMinimalSx, sx] : baseMinimalSx) as any}>
        {showLabel && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontSize: dense ? { xs: '0.7rem', sm: '0.75rem' } : { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
              textAlign: isMobile ? 'center' : 'left'
            }}
          >
            {label ?? `แสดง ${startItem}-${endItem} จาก ${count} รายการ`}
          </Typography>
        )}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isMobile ? 'space-between' : 'flex-end',
          gap: dense ? { xs: 0.75, sm: 1, md: 1.25 } : { xs: 1, sm: 1.5, md: 2 }
        }}>
          {showRowsPerPage && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: dense ? 0.25 : 0.5 }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: dense ? { xs: '0.68rem', sm: '0.7rem' } : { xs: '0.7rem', sm: '0.72rem', md: '0.75rem' } }}
              >
                แสดง
              </Typography>
              <FormControl size="small" variant="standard" sx={{ minWidth: dense ? 45 : 50 }} disabled={disabled}>
                <Select
                  value={rowsPerPage}
                  onChange={(e) => onRowsPerPageChange(parseInt(String(e.target.value), 10))}
                  sx={{ fontSize: dense ? { xs: '0.72rem', sm: '0.76rem' } : { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' } }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        zIndex: 1500, // สูงกว่า Drawer (1400)
                      }
                    }
                  }}
                >
                  {rowsPerPageOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, p) => onPageChange(p - 1)}
            color="primary"
            size={dense || isSmallScreen ? "small" : "medium"}
            shape="rounded"
            showFirstButton={!isSmallScreen}
            showLastButton={!isSmallScreen}
            siblingCount={isMobile ? 0 : isTablet ? 1 : 1}
            boundaryCount={1}
            disabled={disabled}
          />
        </Box>
      </Box>
    );
  }

  const baseStandardSx = { 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center', 
      justifyContent: 'space-between', 
      px: { xs: 1.5, sm: 2 }, 
      py: { xs: 1, sm: 1, md: 1 },
      gap: isMobile ? 1 : 0
    } as const;
  return (
    <Box sx={(sx ? [baseStandardSx, sx] : baseStandardSx) as any}>
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ 
          fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' },
          textAlign: isMobile ? 'center' : 'left'
        }}
      >
        {label ?? `รวม ${count} รายการ`}
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isSmallScreen ? 'center' : 'flex-end',
        gap: { xs: 0.5, sm: 0.75, md: 1 },
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        {!isSmallScreen && (
          <Tooltip title="หน้าแรก">
            <span>
              <IconButton size="small" onClick={() => onPageChange(0)} disabled={disabled || isFirst}>
                <FirstPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title="ก่อนหน้า">
          <span>
            <IconButton size="small" onClick={() => onPageChange(page - 1)} disabled={disabled || isFirst}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {isSmallScreen ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 1.5 },
            px: 1
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
              หน้า
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '0.9rem' } }}>
              {page + 1} / {totalPages}
            </Typography>
            <FormControl size="small" variant="standard" sx={{ minWidth: 45, ml: { xs: 1, sm: 1.5 } }} disabled={disabled}>
              <Select
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(parseInt(String(e.target.value), 10))}
                sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
              >
                {rowsPerPageOptions.map((opt) => (
                  <MenuItem key={opt} value={opt} sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : (
          <TablePagination
            component="div"
            count={count}
            page={page}
            onPageChange={(_, p) => onPageChange(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
            rowsPerPageOptions={rowsPerPageOptions}
          />
        )}
        <Tooltip title="ถัดไป">
          <span>
            <IconButton size="small" onClick={() => onPageChange(page + 1)} disabled={disabled || isLast}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        {!isSmallScreen && (
          <Tooltip title="หน้าสุดท้าย">
            <span>
              <IconButton size="small" onClick={() => onPageChange(totalPages - 1)} disabled={disabled || isLast}>
                <LastPageIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
