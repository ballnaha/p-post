'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/useToast';

interface PolicePersonnel {
  id: string;
  noId?: string;
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
}

interface SwapListItem {
  id: string;
  year: number;
  notes?: string;
  originalPersonnelId: string;
  noId?: string;
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
  age?: string;
  seniority?: string;
  education?: string;
}

export default function EditSwapListPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [swapItem, setSwapItem] = useState<SwapListItem | null>(null);
  const [personnelOptions, setPersonnelOptions] = useState<PolicePersonnel[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<PolicePersonnel | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear() + 543);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchSwapItem();
    }
  }, [params.id]);

  useEffect(() => {
    fetchPersonnelOptions('');
  }, []);

  const fetchSwapItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/swap-list/${params.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch swap item');
      }

      const data = await response.json();
      setSwapItem(data);
      setYear(data.year);
      setNotes(data.notes || '');

      // Set selected personnel from swap item data
      setSelectedPersonnel({
        id: data.originalPersonnelId,
        noId: data.noId,
        position: data.position,
        positionNumber: data.positionNumber,
        unit: data.unit,
        rank: data.rank,
        fullName: data.fullName,
        nationalId: data.nationalId,
      });
    } catch (error) {
      console.error('Error fetching swap item:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      router.push('/police-personnel/swap-list');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonnelOptions = async (searchTerm: string) => {
    try {
      setSearchLoading(true);
      const response = await fetch(
        `/api/police-personnel/search-names?query=${encodeURIComponent(searchTerm)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch personnel');
      }

      const data = await response.json();
      setPersonnelOptions(data);
    } catch (error) {
      console.error('Error fetching personnel:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePersonnelSearch = (event: React.SyntheticEvent, value: string) => {
    if (value.length >= 2) {
      fetchPersonnelOptions(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPersonnel) {
      toast.error('กรุณาเลือกบุคลากร');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/swap-list/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...selectedPersonnel,
          year,
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update swap list item');
      }

      toast.success('อัพเดทรายการสำเร็จ');
      router.push('/police-personnel/swap-list');
    } catch (error: any) {
      console.error('Error updating swap list:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัพเดทรายการ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.back()}
          >
            ย้อนกลับ
          </Button>
          <SwapHorizIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            แก้ไขรายการสลับตำแหน่ง
          </Typography>
        </Box>

        {/* Form */}
        <Paper sx={{ p: 3, maxWidth: 800 }}>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Personnel Search */}
              <Autocomplete
                options={personnelOptions}
                getOptionLabel={(option) =>
                  `${option.fullName || '-'} (${option.noId || '-'}) - ${option.position || '-'}`
                }
                value={selectedPersonnel}
                onChange={(event, newValue) => setSelectedPersonnel(newValue)}
                onInputChange={handlePersonnelSearch}
                loading={searchLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="ค้นหาบุคลากร *"
                    placeholder="พิมพ์ชื่อ-นามสกุล, เลขที่, หรือตำแหน่ง"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searchLoading ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box>
                      <Typography variant="body1">{option.fullName || '-'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        เลขที่: {option.noId || '-'} | ตำแหน่ง: {option.position || '-'} | หน่วย: {option.unit || '-'}
                      </Typography>
                    </Box>
                  </li>
                )}
                noOptionsText="ไม่พบข้อมูล"
              />

              {/* Display Selected Personnel Details */}
              {selectedPersonnel && (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>บุคลากรที่เลือก:</strong> {selectedPersonnel.fullName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>เลขที่:</strong> {selectedPersonnel.noId || '-'} | 
                    <strong> ตำแหน่ง:</strong> {selectedPersonnel.position || '-'} | 
                    <strong> ยศ:</strong> {selectedPersonnel.rank || '-'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>หน่วย:</strong> {selectedPersonnel.unit || '-'}
                  </Typography>
                </Alert>
              )}

              {/* Year */}
              <TextField
                label="ปีงบประมาณ พ.ศ. *"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                required
                inputProps={{ min: 2500, max: 2700 }}
              />

              {/* Notes */}
              <TextField
                label="หมายเหตุ"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
              />

              {/* Submit Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  disabled={saving || !selectedPersonnel}
                >
                  {saving ? <CircularProgress size={24} /> : 'บันทึก'}
                </Button>
              </Box>
            </Box>
          </form>
        </Paper>
      </Box>
    </Layout>
  );
}
