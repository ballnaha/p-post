import { Box, Card, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  bgGradient: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  bgGradient,
}: StatsCardProps) {
  return (
    <Card
      sx={{
        background: bgGradient,
        borderRadius: 3,
        p: 3,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 140,
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            opacity: 0.9,
            fontWeight: 500,
            fontSize: '0.875rem',
            mb: 1,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            fontSize: '2rem',
            mb: 0.5,
          }}
        >
          {value}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              opacity: 0.85,
              fontSize: '0.813rem',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          opacity: 0.3,
          fontSize: '3rem',
        }}
      >
        {icon}
      </Box>
    </Card>
  );
}
