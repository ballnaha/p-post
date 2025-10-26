'use client';

import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';

interface TreatmentPlanProps {
  data: {
    stronglyAgree: number;
    agree: number;
    neutral: number;
    disagree: number;
    stronglyDisagree: number;
  };
}

export default function TreatmentPlanChart({ data }: TreatmentPlanProps) {
  const items = [
    { label: 'Strongly Agree', value: data.stronglyAgree, color: '#36A2EB' },
    { label: 'Agree', value: data.agree, color: '#4BC0C0' },
    { label: 'Neutral', value: data.neutral, color: '#FFCE56' },
    { label: 'Disagree', value: data.disagree, color: '#FF9F40' },
    { label: 'Strongly Disagree', value: data.stronglyDisagree, color: '#FF6384' },
  ];

  return (
    <Card sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} mb={3}>
          Doctors Treatment Plan
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {items.map((item, index) => (
            <Box key={index}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {item.value}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.value}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: item.color,
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
