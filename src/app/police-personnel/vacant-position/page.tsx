'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Autocomplete,
  TextField,
} from '@mui/material';
import {
  EventAvailable as VacantIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';

interface VacantPositionData {
  id: string;
  year: number;
  notes?: string;
  originalPersonnelId?: string;
  noId?: number;
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  createdAt: string;
}

export default function VacantPositionPage() {
  const toast = useToast();
  const [data, setData] = useState<VacantPositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchData();
    }
  }, [selectedYear]);

  const fetchAvailableYears = async () => {
    try {
      const currentYear = new Date().getFullYear() + 543;
      const years = [currentYear, currentYear - 1];
      setAvailableYears(years);
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vacant-position?year=${selectedYear}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: VacantPositionData) => {
    if (!confirm(`ต้องการลบ ${item.position} ออกจากรายการตำแหน่งว่างหรือไม่?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/vacant-position?originalPersonnelId=${item.originalPersonnelId}&year=${item.year}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('ลบออกจากรายการตำแหน่งว่างแล้ว');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <VacantIcon sx={{ fontSize: 32, color: 'success.main' }} />
              <Typography variant="h5" fontWeight={600}>
                รายการตำแหน่งว่าง
              </Typography>
            </Box>

            <Autocomplete
              value={selectedYear}
              onChange={(_, newValue) => newValue && setSelectedYear(newValue)}
              options={availableYears}
              getOptionLabel={(option) => option.toString()}
              renderInput={(params) => <TextField {...params} label="เลือกปี (พ.ศ.)" />}
              sx={{ width: 200 }}
              disableClearable
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : data.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                ยังไม่มีรายการตำแหน่งว่างในปี {selectedYear}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                กดปุ่มตำแหน่งว่างในหน้าบุคลากรเพื่อเพิ่มรายการ
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
              {data.map((item) => (
                <Paper
                  key={item.id}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'success.main',
                    borderRadius: 2,
                    position: 'relative',
                  }}
                >
                  <Tooltip title="ลบ">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(item)}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    ลำดับที่ {item.noId || '-'}
                  </Typography>
                  
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {item.position || 'ไม่ระบุตำแหน่ง'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    เลขตำแหน่ง: {item.positionNumber || '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    หน่วย: {item.unit || '-'}
                  </Typography>
                  
                  {item.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      หมายเหตุ: {item.notes}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          )}

          {!loading && data.length > 0 && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                รวม {data.length} ตำแหน่ง
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Layout>
  );
}
