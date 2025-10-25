'use client';
import React from 'react';
import { Box, Typography, Button, SvgIconProps } from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

interface EmptyStateProps {
  icon?: SvgIconComponent;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact';
}

/**
 * EmptyState Component - Minimal professional empty state design
 * 
 * A reusable component for displaying empty states with consistent, minimal design.
 * Perfect for "no data found" scenarios across the application.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <EmptyState
 *   icon={PersonIcon}
 *   title="ไม่พบข้อมูลบุคลากร"
 * />
 * 
 * // With description and action
 * <EmptyState
 *   icon={SwapHorizIcon}
 *   title="ไม่พบข้อมูลการสลับตำแหน่ง"
 *   description="ยังไม่มีรายการสลับตำแหน่งในปีนี้"
 *   actionLabel="เพิ่มรายการใหม่"
 *   onAction={() => router.push('/add')}
 * />
 * 
 * // Compact variant (smaller padding, for table cells)
 * <EmptyState
 *   icon={PersonIcon}
 *   title="ไม่พบข้อมูล"
 *   variant="compact"
 * />
 * ```
 * 
 * @param icon - Optional Material-UI icon component (e.g., PersonIcon, SwapHorizIcon)
 * @param title - Main message to display
 * @param description - Optional secondary message for additional context
 * @param actionLabel - Optional button text (button appears only if both label and onAction provided)
 * @param onAction - Optional button click handler
 * @param variant - Layout variant: 'default' (py: 10) or 'compact' (py: 6)
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}) => {
  const isCompact = variant === 'compact';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: isCompact ? 6 : 10,
        px: 3,
        textAlign: 'center',
      }}
    >
      {Icon && (
        <Icon
          sx={{
            fontSize: isCompact ? 48 : 64,
            color: 'action.disabled',
            mb: isCompact ? 2 : 3,
            opacity: 0.4,
          }}
        />
      )}
      
      <Typography
        variant={isCompact ? 'body1' : 'h6'}
        color="text.secondary"
        fontWeight={500}
        gutterBottom
        sx={{ maxWidth: 400 }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: actionLabel ? 3 : 0,
            opacity: 0.7,
            maxWidth: 500,
          }}
        >
          {description}
        </Typography>
      )}

      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          size={isCompact ? 'small' : 'medium'}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            px: 3,
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};
