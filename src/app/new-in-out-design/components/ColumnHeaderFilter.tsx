'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Popover,
  Typography,
  TextField,
  InputAdornment,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  IconButton,
  Chip,
  Badge,
  Tooltip,
  alpha,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Check as CheckIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface ColumnHeaderFilterProps {
  columnKey: string;
  columnLabel: string;
  options: FilterOption[];
  selectedValues: Set<string>;
  onFilterChange: (columnKey: string, values: Set<string>) => void;
  onLoadOptions?: () => Promise<void>; // Callback to load options on demand
  isLoading?: boolean;
  sx?: object;
  disabled?: boolean;
}

export default function ColumnHeaderFilter({
  columnKey,
  columnLabel,
  options,
  selectedValues,
  onFilterChange,
  onLoadOptions,
  isLoading = false,
  sx = {},
  disabled = false,
}: ColumnHeaderFilterProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchText, setSearchText] = useState('');
  const buttonRef = useRef<HTMLDivElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = async (event: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    setAnchorEl(buttonRef.current);
    
    // Load options on demand if options are empty and not loading
    if (options.length === 0 && !isLoading && onLoadOptions) {
      onLoadOptions();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchText('');
  };

  // Filter options based on search text
  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    const search = searchText.toLowerCase().trim();
    return options.filter(opt => 
      opt.label.toLowerCase().includes(search) ||
      opt.value.toLowerCase().includes(search)
    );
  }, [options, searchText]);

  const handleToggleOption = (value: string) => {
    const newValues = new Set(selectedValues);
    if (newValues.has(value)) {
      newValues.delete(value);
    } else {
      newValues.add(value);
    }
    onFilterChange(columnKey, newValues);
  };

  const handleSelectAll = () => {
    // Select all filtered options
    const newValues = new Set(selectedValues);
    filteredOptions.forEach(opt => newValues.add(opt.value));
    onFilterChange(columnKey, newValues);
  };

  const handleClearAll = () => {
    // Clear all filtered options
    const newValues = new Set(selectedValues);
    filteredOptions.forEach(opt => newValues.delete(opt.value));
    onFilterChange(columnKey, newValues);
  };

  const handleClearFilter = () => {
    onFilterChange(columnKey, new Set());
    handleClose();
  };

  const isFiltered = selectedValues.size > 0;
  const allSelected = filteredOptions.length > 0 && 
    filteredOptions.every(opt => selectedValues.has(opt.value));
  const someSelected = filteredOptions.some(opt => selectedValues.has(opt.value));

  return (
    <>
      <Tooltip 
        title={isFiltered ? `กรอง ${selectedValues.size} รายการ - คลิกเพื่อแก้ไข` : 'คลิกเพื่อกรองข้อมูล'} 
        placement="top"
        arrow
      >
        <Box
          ref={buttonRef}
          onClick={handleClick}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: disabled ? 'default' : 'pointer',
            userSelect: 'none',
            py: 0.25,
            px: 0.5,
            mx: -0.5,
            borderRadius: 1,
            transition: 'background-color 0.2s',
            '&:hover': !disabled ? {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              '& .filter-icon': {
                opacity: 1,
              }
            } : {},
            ...sx,
          }}
        >
          <Typography 
            component="span" 
            sx={{ 
              fontWeight: 600, 
              color: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {columnLabel}
          </Typography>
          <Badge
            badgeContent={selectedValues.size}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                height: 16,
                minWidth: 16,
              }
            }}
          >
            <FilterListIcon 
              className="filter-icon"
              sx={{ 
                fontSize: 16, 
                opacity: isFiltered ? 1 : 0.5,
                color: isFiltered ? 'warning.light' : 'inherit',
                transition: 'opacity 0.2s, color 0.2s',
              }} 
            />
          </Badge>
          <ArrowDropDownIcon 
            sx={{ 
              fontSize: 18, 
              opacity: 0.7,
              ml: -0.5,
            }} 
          />
        </Box>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              maxHeight: 'calc(100vh - 100px)',
              mt: 0.5,
              boxShadow: 3,
            }
          }
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 1.5, 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              กรอง: {columnLabel}
            </Typography>
            {isFiltered && (
              <Chip
                label={`เลือก ${selectedValues.size} รายการ`}
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
          
          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="ค้นหา..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchText && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => setSearchText('')}
                      sx={{ p: 0.25 }}
                    >
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                bgcolor: 'white',
                fontSize: '0.875rem',
              } 
            }}
          />
        </Box>

        {/* Select All / Clear All */}
        <Box sx={{ 
          px: 1.5, 
          py: 1, 
          display: 'flex', 
          gap: 1, 
          borderBottom: 1, 
          borderColor: 'divider' 
        }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleSelectAll}
            disabled={allSelected}
            sx={{ 
              flex: 1, 
              fontSize: '0.75rem', 
              py: 0.25,
              textTransform: 'none',
            }}
          >
            เลือกทั้งหมด
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleClearAll}
            disabled={!someSelected}
            sx={{ 
              flex: 1, 
              fontSize: '0.75rem', 
              py: 0.25,
              textTransform: 'none',
            }}
          >
            ยกเลิกทั้งหมด
          </Button>
        </Box>

        {/* Options List */}
        <List 
          dense 
          sx={{ 
            maxHeight: 250, 
            overflow: 'auto',
            py: 0.5,
          }}
        >
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, index) => (
              <ListItem key={`skeleton-${index}`} sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Skeleton variant="rectangular" width={18} height={18} />
                </ListItemIcon>
                <ListItemText>
                  <Skeleton variant="text" width={`${60 + Math.random() * 30}%`} />
                </ListItemText>
              </ListItem>
            ))
          ) : filteredOptions.length === 0 ? (
            <ListItem>
              <ListItemText 
                primary="ไม่พบข้อมูล"
                sx={{ textAlign: 'center', color: 'text.secondary' }}
              />
            </ListItem>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedValues.has(option.value);
              return (
                <ListItemButton
                  key={option.value}
                  onClick={() => handleToggleOption(option.value)}
                  dense
                  sx={{
                    py: 0.25,
                    bgcolor: isSelected ? alpha('#1976d2', 0.08) : 'transparent',
                    '&:hover': {
                      bgcolor: isSelected ? alpha('#1976d2', 0.12) : 'action.hover',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                      sx={{ p: 0.25 }}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.8125rem',
                            fontWeight: isSelected ? 600 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                          }}
                          title={option.label}
                        >
                          {option.label || '(ว่าง)'}
                        </Typography>
                        {option.count !== undefined && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '0.7rem', ml: 1 }}
                          >
                            ({option.count})
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              );
            })
          )}
        </List>

        {/* Footer */}
        <Box sx={{ 
          p: 1.5, 
          borderTop: 1, 
          borderColor: 'divider',
          bgcolor: 'grey.50',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <Button
            size="small"
            color="error"
            onClick={handleClearFilter}
            disabled={!isFiltered}
            sx={{ fontSize: '0.75rem', textTransform: 'none' }}
          >
            ล้างตัวกรอง
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleClose}
            sx={{ fontSize: '0.75rem', textTransform: 'none' }}
          >
            ปิด
          </Button>
        </Box>
      </Popover>
    </>
  );
}

// Utility function to extract unique values from data
export function extractUniqueValues(
  data: any[], 
  extractor: (item: any) => string | null | undefined
): FilterOption[] {
  const valueMap = new Map<string, number>();
  
  data.forEach(item => {
    const value = extractor(item);
    const normalizedValue = value?.trim() || '';
    valueMap.set(normalizedValue, (valueMap.get(normalizedValue) || 0) + 1);
  });

  // Sort by count descending, then by label alphabetically
  return Array.from(valueMap.entries())
    .sort((a, b) => {
      // Empty values go to the end
      if (a[0] === '' && b[0] !== '') return 1;
      if (a[0] !== '' && b[0] === '') return -1;
      // Then sort by count descending
      if (b[1] !== a[1]) return b[1] - a[1];
      // Then sort alphabetically
      return a[0].localeCompare(b[0], 'th');
    })
    .map(([value, count]) => ({
      value,
      label: value || '(ว่าง)',
      count,
    }));
}
