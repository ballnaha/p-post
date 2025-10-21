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
} from '@mui/material';
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
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / rowsPerPage));
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;

  if (variant === 'minimal') {
    const startItem = count === 0 ? 0 : page * rowsPerPage + 1;
    const endItem = Math.min((page + 1) * rowsPerPage, count);

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          {label ?? `แสดง ${startItem}-${endItem} จาก ${count} รายการ`}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" variant="standard" sx={{ minWidth: 50 }} disabled={disabled}>
            <Select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(parseInt(String(e.target.value), 10))}
              sx={{ fontSize: '0.875rem' }}
            >
              {rowsPerPageOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, p) => onPageChange(p - 1)}
            color="primary"
            size="small"
            shape="rounded"
            showFirstButton
            showLastButton
            disabled={disabled}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label ?? `รวม ${count} รายการ`}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="หน้าแรก">
          <span>
            <IconButton size="small" onClick={() => onPageChange(0)} disabled={disabled || isFirst}>
              <FirstPageIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="ก่อนหน้า">
          <span>
            <IconButton size="small" onClick={() => onPageChange(page - 1)} disabled={disabled || isFirst}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <TablePagination
          component="div"
          count={count}
          page={page}
          onPageChange={(_, p) => onPageChange(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={rowsPerPageOptions}
        />
        <Tooltip title="ถัดไป">
          <span>
            <IconButton size="small" onClick={() => onPageChange(page + 1)} disabled={disabled || isLast}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="หน้าสุดท้าย">
          <span>
            <IconButton size="small" onClick={() => onPageChange(totalPages - 1)} disabled={disabled || isLast}>
              <LastPageIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
