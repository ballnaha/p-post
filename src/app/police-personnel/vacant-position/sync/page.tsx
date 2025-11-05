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
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
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
  forceResync?: boolean;
  errors?: string[];
}

export default function SyncVacantPositionsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [forceResync, setForceResync] = useState<boolean>(false);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  // Fetch available units
  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoadingUnits(true);
      const response = await fetch('/api/police-personnel/units');
      const result = await response.json();

      if (result.success) {
        setAvailableUnits(result.data);
      } else {
        console.error('Failed to fetch units:', result.error);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoadingUnits(false);
    }
  };

  // Fetch sync status
  useEffect(() => {
    if (selectedYear) {
      fetchSyncStatus();
    }
  }, [selectedYear, selectedUnit]);

  const fetchSyncStatus = async () => {
    try {
      setLoading(true);
      const unitParam = selectedUnit !== 'all' ? `&unit=${encodeURIComponent(selectedUnit)}` : '';
      const response = await fetch(`/api/vacant-position/sync?year=${selectedYear}${unitParam}`);
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

  const handleUnitChange = (event: SelectChangeEvent<string>) => {
    setSelectedUnit(event.target.value);
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
        body: JSON.stringify({ 
          year: selectedYear,
          unit: selectedUnit !== 'all' ? selectedUnit : undefined,
          forceResync: forceResync
        }),
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

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteDialogOpen(false);
    
    try {
      setDeleting(true);
      const unitParam = selectedUnit !== 'all' ? `&unit=${encodeURIComponent(selectedUnit)}` : '';
      const response = await fetch(`/api/vacant-position/sync?year=${selectedYear}${unitParam}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`ลบข้อมูล ${result.data.deletedCount} รายการเรียบร้อย`);
        setSyncResult(null);
        // Refresh status
        await fetchSyncStatus();
      } else {
        toast.error(result.error || 'ไม่สามารถลบข้อมูลได้');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setDeleting(false);
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

        {/* Information Note - Accordion */}
        <Accordion sx={{ mb: 3, bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="sync-guide-content"
            id="sync-guide-header"
            sx={{
              '&:hover': { bgcolor: 'info.100' },
              transition: 'background-color 0.2s'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ color: 'info.main', mr: 1.5 }} />
              <Typography variant="h6" fontWeight={600} color="info.main">
                📚 คู่มือการใช้งาน Sync ตำแหน่งว่าง
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>📌 วัตถุประสงค์:</strong> ระบบ Sync ใช้สำหรับคัดลอกตำแหน่งว่างจาก <code>police_personnel</code> มาเก็บเป็น snapshot ใน <code>vacant_position</code> เพื่อใช้ในการจับคู่และจัดสรรตำแหน่ง
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>🔄 โหมดการ Sync:</strong>
            </Typography>
            
            <Box sx={{ pl: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" component="div">
                <strong>1. โหมดปกติ (Normal Sync):</strong>
                <ul style={{ marginTop: 4, marginBottom: 8 }}>
                  <li>เพิ่มเฉพาะตำแหน่งว่างที่<strong>ยังไม่มี</strong>ใน vacant_position</li>
                  <li>ข้ามตำแหน่งที่มีอยู่แล้ว (ไม่อัปเดตข้อมูลเดิม)</li>
                  <li>เหมาะสำหรับการเพิ่มตำแหน่งใหม่</li>
                  <li>ถ้ามีการเพิ่มปีใหม่เข้าไปในระบบ(2569) ข้อมูลปีเก่า(2568) ยังคงอยู่ และปีใหม่จะถูกเพิ่มเข้าไป</li>
                </ul>

                <strong>2. โหมด Force Re-sync ⚠️:</strong>
                <ul style={{ marginTop: 4, marginBottom: 8 }}>
                  <li><strong style={{ color: '#d32f2f' }}>ลบข้อมูล vacant_position ทั้งหมด</strong> (หรือเฉพาะหน่วยที่เลือก)</li>
                  <li>สร้างข้อมูลใหม่ทั้งหมดจาก police_personnel</li>
                  <li>ใช้เมื่อต้องการอัปเดตข้อมูลให้เป็นปัจจุบัน</li>
                  <li><strong style={{ color: '#d32f2f' }}>⚠️ ข้อมูลเดิมจะถูกลบถาวร ไม่สามารถกู้คืนได้!</strong></li>
                  <li>ลบทั้งหมดของปีนั้น แล้ว sync เข้ามาใหม่</li>
                </ul>
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>📋 เงื่อนไขตำแหน่งว่าง:</strong> ระบบจะ sync เฉพาะตำแหน่งที่มีสถานะว่าง (fullName เป็น null, "", "ว่าง", "ว่าง (กันตำแหน่ง)", "ว่าง(กันตำแหน่ง)")
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>🎯 การกรองข้อมูล:</strong>
            </Typography>
            
            <Box sx={{ pl: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" component="div">
                • <strong>เลือกปี:</strong> sync เฉพาะตำแหน่งว่างสำหรับปีที่เลือก
                <br />
                • <strong>เลือกหน่วย:</strong> sync เฉพาะหน่วยที่เลือก หรือเลือก "ทุกหน่วย" เพื่อ sync ทั้งหมด
              </Typography>
            </Box>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>⏰ เวลาที่เหมาะสมในการ Sync:</strong>
              <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                <li>เริ่มต้นปีงบประมาณใหม่</li>
                <li>หลังจาก Import ข้อมูล police_personnel ใหม่</li>
                <li>เมื่อต้องการอัปเดตข้อมูลตำแหน่งว่างให้เป็นปัจจุบัน (ใช้ Force Re-sync)</li>
              </ul>
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Year and Unit Selector */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
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

            <FormControl fullWidth>
              <InputLabel>เลือกหน่วย</InputLabel>
              <Select
                value={selectedUnit}
                label="เลือกหน่วย"
                onChange={handleUnitChange}
                disabled={loadingUnits}
              >
                <MenuItem value="all">
                  <em>ทุกหน่วย</em>
                </MenuItem>
                {availableUnits.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Force Re-sync Option */}
          <FormControlLabel
            control={
              <Checkbox
                checked={forceResync}
                onChange={(e) => setForceResync(e.target.checked)}
                color="warning"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Force Re-sync (ลบข้อมูลเดิมและ sync ใหม่ทั้งหมด)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ⚠️ จะลบข้อมูล vacant_position ที่ sync ไว้แล้วและสร้างใหม่ทั้งหมด
                </Typography>
              </Box>
            }
          />
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
                  {syncResult.forceResync ? 'Force Re-sync สำเร็จ!' : 'Sync สำเร็จ!'}
                </Typography>

                {syncResult.forceResync && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    ลบข้อมูลเดิมและสร้างใหม่ทั้งหมดเรียบร้อย
                  </Alert>
                )}
                
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {syncResult.forceResync ? 'สร้างใหม่' : 'Sync ใหม่'}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>{syncResult.synced}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {syncResult.forceResync ? 'ข้าม (ไม่ควรมี)' : 'ข้ามไป (มีอยู่แล้ว)'}
                    </Typography>
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
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
                onClick={handleSyncClick}
                disabled={syncing || deleting}
                sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
              >
                {syncing ? 'กำลัง Sync...' : 'Sync ตำแหน่งว่าง'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                color="error"
                startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                onClick={handleDeleteClick}
                disabled={syncing || deleting || !syncStatus || syncStatus.syncedCount === 0}
                sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
              >
                {deleting ? 'กำลังลบ...' : 'ลบข้อมูล'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={fetchSyncStatus}
                disabled={loading || syncing || deleting}
                sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
              >
                รีเฟรช
              </Button>
            </Box>
          </>
        ) : null}

        {/* Confirm Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {forceResync ? '⚠️ ยืนยันการ Force Re-sync' : 'ยืนยันการ Sync ตำแหน่งว่าง'}
          </DialogTitle>
          <DialogContent>
            <Alert severity={forceResync ? 'error' : 'warning'} sx={{ mb: 2 }}>
              คุณกำลังจะ {forceResync ? 'Force Re-sync' : 'sync'} ตำแหน่งว่างสำหรับปี <strong>{selectedYear}</strong>
              {selectedUnit !== 'all' && (
                <>
                  {' '}หน่วย <strong>{selectedUnit}</strong>
                </>
              )}
            </Alert>

            {forceResync && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>คำเตือน: Force Re-sync</strong>
                <br />
                การกระทำนี้จะ<strong>ลบข้อมูล vacant_position ที่ sync ไว้แล้วทั้งหมด</strong>และสร้างใหม่
                {selectedUnit !== 'all' ? ` สำหรับหน่วย ${selectedUnit}` : ''}
                <br />
                <strong>⚠️ ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้!</strong>
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              การ sync จะคัดลอกตำแหน่งว่างจาก police_personnel ลงใน vacant_position
              <br /><br />
              {forceResync ? (
                <>
                  <strong>โหมด Force Re-sync:</strong>
                  <br />
                  • ลบข้อมูล vacant_position ที่มีอยู่แล้วทั้งหมด
                  {selectedUnit !== 'all' && ` (เฉพาะหน่วย ${selectedUnit})`}
                  <br />
                  • สร้างข้อมูลใหม่ทั้งหมดจาก police_personnel
                  <br />
                  • ใช้เมื่อต้องการอัปเดตข้อมูลทั้งหมด
                </>
              ) : (
                <>
                  • ถ้ามีข้อมูลอยู่แล้ว จะข้ามไป (ไม่ซ้ำ)
                  <br />
                  • ข้อมูลที่ sync แล้วจะเป็น snapshot ถาวร
                  <br />
                  • ใช้สำหรับการจับคู่ตำแหน่งในหน้า assignment
                  {selectedUnit !== 'all' && (
                    <>
                      <br />
                      • จะ sync เฉพาะหน่วย {selectedUnit} เท่านั้น
                    </>
                  )}
                </>
              )}
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ color: 'error.main' }}>
            🗑️ ยืนยันการลบข้อมูล
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>คำเตือน: การลบข้อมูลไม่สามารถกู้คืนได้!</strong>
            </Alert>

            <Typography variant="body1" gutterBottom fontWeight={600}>
              คุณกำลังจะลบข้อมูล vacant_position ที่ sync แล้ว:
            </Typography>

            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, my: 2 }}>
              <Typography variant="body2">
                <strong>ปี:</strong> {selectedYear}
              </Typography>
              <Typography variant="body2">
                <strong>หน่วย:</strong> {selectedUnit === 'all' ? 'ทุกหน่วย' : selectedUnit}
              </Typography>
              <Typography variant="body2" color="error.main" mt={1}>
                <strong>จำนวนที่จะถูกลบ:</strong> {syncStatus?.syncedCount || 0} รายการ
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              ข้อมูลที่ถูกลบจะหายไปถาวร คุณสามารถ sync ใหม่ได้ภายหลังหากต้องการ
            </Typography>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>💡 หมายเหตุ:</strong> ข้อมูลที่ถูกลบจะเป็นเฉพาะตำแหน่งที่ sync มาจาก police_personnel เท่านั้น 
              (ไม่รวมตำแหน่งที่ผู้ใช้ nominate หรือ request)
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
              startIcon={<DeleteIcon />}
            >
              ยืนยันลบข้อมูล
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
