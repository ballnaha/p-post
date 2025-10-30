'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';

interface SyncStatus {
  year: number;
  personnelVacantCount: number;
  syncedCount: number;
  assignedCount: number;
  availableCount: number;
  needsSync: boolean;
  syncPercentage: number;
}

interface SyncResult {
  year: number;
  synced: number;
  skipped: number;
  total: number;
  existingBefore: number;
  errors?: string[];
}

export default function SyncVacantPositionsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const toast = useToast();

  // Generate available years
  useEffect(() => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];
    
    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }
    
    setAvailableYears(years);
  }, []);

  // Fetch sync status
  useEffect(() => {
    if (selectedYear) {
      fetchSyncStatus();
    }
  }, [selectedYear]);

  const fetchSyncStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/vacant-position/sync?year=${selectedYear}`);
      const result = await response.json();

      if (result.success) {
        setSyncStatus(result.data);
      } else {
        toast.error(result.error || 'ไม่สามารถโหลดสถานะการ sync ได้');
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดสถานะ');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
    setSyncResult(null); // Clear previous result
  };

  const handleSyncClick = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmSync = async () => {
    setConfirmDialogOpen(false);
    
    try {
      setSyncing(true);
      setSyncResult(null);
      setProgress({ current: 0, total: 0, percentage: 0 });
      
      const response = await fetch('/api/vacant-position/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync');
      }

      // อ่าน response เป็น stream เพื่อรับ progress updates
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6); // Remove 'data: ' prefix
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'progress') {
                  setProgress({
                    current: data.current,
                    total: data.total,
                    percentage: Math.round((data.current / data.total) * 100)
                  });
                } else if (data.type === 'complete') {
                  setSyncResult(data.data);
                  toast.success('Sync สำเร็จ!');
                  // Refresh status
                  await fetchSyncStatus();
                } else if (data.type === 'error') {
                  toast.error(data.error || 'เกิดข้อผิดพลาดในการ sync');
                }
              } catch (e) {
                console.error('Error parsing progress data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('เกิดข้อผิดพลาดในการ sync');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={1}>
            Sync ตำแหน่งว่าง
          </Typography>
          <Typography variant="body2" color="text.secondary">
            คัดลอกตำแหน่งว่างจาก police_personnel → vacant_position สำหรับแต่ละปี
          </Typography>
        </Box>

        {/* Year Selector */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>เลือกปี (พ.ศ.)</InputLabel>
            <Select
              value={selectedYear}
              label="เลือกปี (พ.ศ.)"
              onChange={handleYearChange}
            >
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Sync Status */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : syncStatus ? (
          <>
            {/* Status Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    ตำแหน่งว่างใน police_personnel
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="primary.main">
                    {syncStatus.personnelVacantCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    ตำแหน่งที่ยังว่างอยู่ในระบบ
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Sync แล้วใน vacant_position
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="success.main">
                    {syncStatus.syncedCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    จับคู่แล้ว: {syncStatus.assignedCount} • เหลือ: {syncStatus.availableCount}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Sync Progress */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  สถานะการ Sync
                </Typography>
                <Chip
                  icon={syncStatus.needsSync ? <WarningIcon /> : <CheckIcon />}
                  label={syncStatus.needsSync ? 'ต้อง Sync' : 'Sync แล้ว'}
                  color={syncStatus.needsSync ? 'warning' : 'success'}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    ความคืบหน้า
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {syncStatus.syncPercentage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={syncStatus.syncPercentage}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      bgcolor: syncStatus.syncPercentage >= 100 ? 'success.main' : 'warning.main',
                    },
                  }}
                />
              </Box>

              <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 2 }}>
                <strong>หมายเหตุ:</strong> ควร sync ตำแหน่งว่างทุกครั้งที่:
                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                  <li>เริ่มต้นปีใหม่</li>
                  <li>Import ข้อมูล police_personnel ใหม่</li>
                  <li>มีการเปลี่ยนแปลงตำแหน่งว่างในระบบ</li>
                </ul>
              </Alert>
            </Paper>

            {/* Real-time Sync Progress */}
            {syncing && progress.total > 0 && (
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main' }}>
                <Typography variant="h6" fontWeight={700} color="info.main" mb={2}>
                  <CircularProgress size={20} sx={{ verticalAlign: 'middle', mr: 1 }} />
                  กำลัง Sync...
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      ความคืบหน้า: {progress.current} / {progress.total}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="info.main">
                      {progress.percentage}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress.percentage}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        bgcolor: 'info.main',
                      },
                    }}
                  />
                </Box>

                <Alert severity="info" icon={<InfoIcon />}>
                  กรุณารอสักครู่... ระบบกำลังประมวลผลข้อมูล
                </Alert>
              </Paper>
            )}

            {/* Sync Result */}
            {syncResult && (
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.50', borderLeft: 4, borderColor: 'success.main' }}>
                <Typography variant="h6" fontWeight={700} color="success.main" mb={2}>
                  <CheckIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Sync สำเร็จ!
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Sync ใหม่</Typography>
                    <Typography variant="h5" fontWeight={700}>{syncResult.synced}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">ข้ามไป (มีอยู่แล้ว)</Typography>
                    <Typography variant="h5" fontWeight={700}>{syncResult.skipped}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">รวมทั้งหมด</Typography>
                    <Typography variant="h5" fontWeight={700}>{syncResult.total}</Typography>
                  </Box>
                </Box>

                {syncResult.errors && syncResult.errors.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <strong>มีข้อผิดพลาดบางส่วน:</strong>
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      {syncResult.errors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </Paper>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
                onClick={handleSyncClick}
                disabled={syncing}
                sx={{ flex: 1 }}
              >
                {syncing ? 'กำลัง Sync...' : 'Sync ตำแหน่งว่าง'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={fetchSyncStatus}
                disabled={loading || syncing}
              >
                รีเฟรช
              </Button>
            </Box>
          </>
        ) : null}

        {/* Confirm Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>ยืนยันการ Sync ตำแหน่งว่าง</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              คุณกำลังจะ sync ตำแหน่งว่างสำหรับปี <strong>{selectedYear}</strong>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              การ sync จะคัดลอกตำแหน่งว่างจาก police_personnel ลงใน vacant_position
              <br /><br />
              • ถ้ามีข้อมูลอยู่แล้ว จะข้ามไป (ไม่ซ้ำ)
              <br />
              • ข้อมูลที่ sync แล้วจะเป็น snapshot ถาวร
              <br />
              • ใช้สำหรับการจับคู่ตำแหน่งในหน้า assignment
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmSync}
              autoFocus
            >
              ยืนยัน Sync
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
