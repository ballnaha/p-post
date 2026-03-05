'use client';
import { useState, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Update as UpdateIcon,
  Refresh as RefreshIcon,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useSnackbar } from '@/contexts/SnackbarContext';

type ImportMode = 'full' | 'supporter';

export default function ImportPolicePersonnelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [importMode, setImportMode] = useState<ImportMode>('full');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [existingRecordCount, setExistingRecordCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Generate available years (from 2568 to current year) - same as swap-list
  const availableYears = useMemo(() => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const startYear = 2568;
    const years: number[] = [];

    for (let year = currentBuddhistYear; year >= startYear; year--) {
      years.push(year);
    }

    return years;
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // ตรวจสอบชนิดไฟล์
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(selectedFile.type)) {
        setError('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const performUpload = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setProgress({ current: 0, total: 0, percentage: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file!);
      formData.append('year', selectedYear.toString());

      const apiEndpoint = importMode === 'supporter'
        ? '/api/police-personnel/import-supporter'
        : '/api/police-personnel/import';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.jobId) {
        pollJobStatus(data.jobId);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
        setLoading(false);
      }

    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('กรุณาเลือกไฟล์');
      return;
    }

    try {
      const checkRes = await fetch(`/api/police-personnel?year=${selectedYear}&limit=1`);
      const checkData = await checkRes.json();
      const existing = checkData.pagination?.total ?? 0;

      if (existing > 0) {
        setExistingRecordCount(existing);
        setImportConfirmOpen(true);
        return;
      }
    } catch {
      // ถ้าตรวจสอบไม่ได้ ให้ดำเนินการต่อ
    }

    performUpload();
  };

  // Polling function
  const pollJobStatus = async (jobId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/import-job/${jobId}`);
        const data = await response.json();

        if (data.success && data.job) {
          const job = data.job;

          // Update progress
          setProgress({
            current: job.processedRows,
            total: job.totalRows,
            percentage: job.percentage
          });

          // Check if completed or failed
          if (job.status === 'completed') {
            clearInterval(intervalId);
            setResult({
              success: job.successRows,
              failed: job.failedRows,
              updated: job.updatedRows,
              errors: job.errors || [],
              totalProcessed: job.processedRows
            });
            setFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            setLoading(false);
          } else if (job.status === 'failed') {
            clearInterval(intervalId);
            setError(job.errorMessage || 'เกิดข้อผิดพลาด');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    }, 2000); // Poll ทุก 2 วินาที

    // Cleanup ถ้า component unmount
    return () => clearInterval(intervalId);
  };

  const handleDeleteYear = async () => {
    setDeleteConfirmOpen(false);
    setDeleting(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/police-personnel?year=${selectedYear}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        showSnackbar(data.message, 'success');
      } else {
        setError(data.error || 'ลบข้อมูลไม่สำเร็จ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setDeleting(false);
    }
  };

  const downloadTemplate = async () => {
    // เลือก template endpoint ตาม import mode
    const templateEndpoint = importMode === 'supporter'
      ? '/api/police-personnel/template-supporter'
      : '/api/police-personnel/template';

    const fileName = importMode === 'supporter'
      ? 'police_personnel_supporter_template.xlsx'
      : 'police_personnel_template.xlsx';

    try {
      const response = await fetch(templateEndpoint);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      setError('ไม่สามารถดาวน์โหลดไฟล์ Template ได้');
    }
  };

  return (
    <Layout>
      <Box sx={{ mx: 'auto' }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            นำเข้าข้อมูล Police Personnel
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            นำเข้าข้อมูลบุคลากรตำรวจจากไฟล์ Excel
          </Typography>

          {/* Import Mode Selection */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              เลือกประเภทการ Import:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <ToggleButtonGroup
                value={importMode}
                exclusive
                onChange={(_e, newMode) => {
                  if (newMode !== null) {
                    setImportMode(newMode);
                    setFile(null);
                    setResult(null);
                    setError('');
                    // Reset file input
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                }}
                aria-label="import mode"
                color="primary"
              >
                <ToggleButton value="full" aria-label="full import">
                  <RefreshIcon sx={{ mr: 1 }} />
                  Import แบบเต็ม (ไม่ลบข้อมูลเดิม)
                </ToggleButton>
                <ToggleButton value="supporter" aria-label="supporter update">
                  <UpdateIcon sx={{ mr: 1 }} />
                  อัปเดตผู้สนับสนุนเท่านั้น (ไม่ลบข้อมูลเดิม)
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Year Selection Dropdown */}
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="year-select-label">ปี พ.ศ.</InputLabel>
                <Select
                  labelId="year-select-label"
                  id="year-select"
                  value={selectedYear}
                  label="ปี พ.ศ."
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Mode Description */}
          <Alert severity={importMode === 'full' ? 'info' : 'info'} sx={{ mb: 0 }}>
            {importMode === 'full' ? (
              <Typography variant="body2">
                <strong>✨ Import แบบเต็ม:</strong> ระบบจะนำเข้าข้อมูลบุคลากรจากไฟล์ Excel โดยไม่ลบข้อมูลเดิม หากมีข้อมูลซ้ำ (เลขบัตรประชาชนเดียวกัน) จะอัปเดตข้อมูลเดิม
              </Typography>
            ) : (
              <Typography variant="body2">
                <strong>✨ อัปเดตผู้สนับสนุน:</strong> ระบบจะอัปเดตเฉพาะฟิลด์ "ตำแหน่งที่ร้องขอ", "ชื่อผู้สนับสนุน" และ "เหตุผล" โดยค้นหาจากเลขตำแหน่ง (รองรับทั้งตำแหน่งที่มีคนและตำแหน่งว่าง)
              </Typography>
            )}
          </Alert>
        </Paper>

        {/* Instructions - Accordion */}
        <Accordion sx={{ mb: 3, bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="import-guide-content"
            id="import-guide-header"
            sx={{
              '&:hover': { bgcolor: 'info.100' },
              transition: 'background-color 0.2s'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ color: 'info.main', mr: 1.5 }} />
              <Typography variant="h6" fontWeight={600} color="info.main">
                📚 คำแนะนำการใช้งาน Import ข้อมูล
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <strong>📌 วัตถุประสงค์:</strong> ระบบ Import ใช้สำหรับนำเข้าข้อมูลบุคลากรตำรวจจากไฟล์ Excel เข้าสู่ระบบฐานข้อมูล
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <strong>📋 ขั้นตอนการใช้งาน:</strong>
            </Typography>

            <List dense sx={{ pl: 2, mb: 2 }}>
              <ListItem>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>1. ดาวน์โหลดไฟล์ Template Excel</Typography>}
                  secondary={<Typography variant="body2" color="text.secondary">คลิกปุ่ม "ดาวน์โหลด Template" เพื่อดาวน์โหลดไฟล์ตัวอย่างที่มีรูปแบบถูกต้อง</Typography>}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>2. กรอกข้อมูลตามรูปแบบ</Typography>}
                  secondary={<Typography variant="body2" color="text.secondary">กรอกข้อมูลในไฟล์ Excel ตามคอลัมน์ที่กำหนด <strong>อย่าลบหรือเปลี่ยนชื่อหัวคอลัมน์</strong></Typography>}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={<Typography variant="body2" fontWeight={600}>3. อัปโหลดไฟล์</Typography>}
                  secondary={<Typography variant="body2" color="text.secondary">เลือกไฟล์และคลิก "นำเข้าข้อมูล" เพื่ออัปโหลดข้อมูลเข้าระบบ</Typography>}
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 2 }}>
              📊 รูปแบบคอลัมน์ใน Excel:
            </Typography>

            {/* Full Import Columns */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ mb: 1 }}>
                Import แบบเต็ม (21 คอลัมน์):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {[
                  'อาวุโส', 'ยศ', 'ชื่อ สกุล', 'ID', 'POSCODE', 'ตำแหน่ง',
                  'เลขตำแหน่ง', 'ทำหน้าที่', 'แต่งตั้งครั้งสุดท้าย', 'ระดับนี้เมื่อ', 'บรรจุ',
                  'วันเกิด', 'คุณวุฒิ', 'เลขประจำตัวประชาชน', 'หน่วย', 'เกษียณ',
                  'จำนวนปี', 'อายุ', 'ตท.', 'นรต.', 'หมายเหตุ/เงื่อนไข', 'ตำแหน่งที่ร้องขอ', 'ชื่อผู้สนับสนุน', 'เหตุผล'
                ].map((column, index) => (
                  <Chip
                    key={column}
                    label={`${index + 1}. ${column}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>

            {/* Supporter Update Columns */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} color="secondary.main" sx={{ mb: 1 }}>
                อัปเดตผู้สนับสนุน (5 คอลัมน์):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  'ชื่อ สกุล', 'เลขตำแหน่ง', 'เลขประจำตัวประชาชน', 'ตำแหน่งที่ร้องขอ', 'ชื่อผู้สนับสนุน', 'เหตุผล'
                ].map((column, index) => (
                  <Chip
                    key={column}
                    label={`${index + 1}. ${column}`}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>⚠️ ข้อควรระวัง:</strong>
              <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                <li><strong>Import แบบเต็ม:</strong> จะไม่ลบข้อมูลเดิม แต่จะเพิ่มข้อมูลใหม่เข้าไปในระบบ (24 คอลัมน์)</li>
                <li><strong>อัปเดตผู้สนับสนุน:</strong> จะอัปเดตเฉพาะฟิลด์ "ตำแหน่งที่ร้องขอ", "ผู้สนับสนุน" และ "เหตุผล" โดยอ้างอิงจากเลขตำแหน่ง (6 คอลัมน์)</li>
                <li><strong>สำหรับตำแหน่งที่มีคน:</strong> ใส่เลขบัตรประชาชน</li>
                <li><strong>สำหรับตำแหน่งว่าง:</strong> เว้นเลขบัตรประชาชนว่างไว้ ระบบจะใช้เลขตำแหน่งในการค้นหา</li>
                <li>ห้ามลบหรือเปลี่ยนชื่อหัวคอลัมน์ เพราะจะทำให้การ import ผิดพลาด</li>
                <li>ตรวจสอบรูปแบบข้อมูลให้ถูกต้องก่อนอัปโหลด</li>
                <li><strong>การจัดการข้อมูลซ้ำ:</strong> หากมีข้อมูลซ้ำ (เลขบัตรประชาชนเดียวกัน) ระบบจะอัปเดตข้อมูลเดิมแทนการสร้างใหม่</li>
              </ul>
            </Alert>

            <Alert severity="info">
              <strong>💡 เคล็ดลับ:</strong>
              <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                <li>ระบบจะแสดง progress bar ระหว่างการ import</li>
                <li>หากมีข้อผิดพลาด ระบบจะแสดงรายละเอียดแถวที่มีปัญหา</li>
                <li>สามารถ import ข้อมูลได้ทีละหลายๆ แถว</li>
              </ul>
            </Alert>
          </AccordionDetails>
        </Accordion>

        {/* Upload Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadTemplate}
            >
              ดาวน์โหลด Template
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={deleting ? <CircularProgress size={16} color="error" /> : <DeleteForeverIcon />}
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting || loading}
            >
              ลบข้อมูลทั้งหมดปี {selectedYear}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              border: '2px dashed',
              borderColor: file ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              backgroundColor: file ? 'primary.50' : 'grey.50',
              transition: 'all 0.3s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="file-input"
            />
            <label htmlFor="file-input">
              <Box sx={{ cursor: 'pointer' }}>
                <UploadIcon sx={{ fontSize: 48, color: file ? 'primary.main' : 'grey.400', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {file ? file.name : 'คลิกเพื่อเลือกไฟล์ Excel'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  รองรับไฟล์ .xlsx และ .xls เท่านั้น
                </Typography>
              </Box>
            </label>
          </Box>

          {file && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<UploadIcon />}
                onClick={handleUpload}
                disabled={loading}
              >
                {loading ? 'กำลังนำเข้าข้อมูล...' : 'นำเข้าข้อมูล'}
              </Button>
            </Box>
          )}

          {/* Progress Bar */}
          {loading && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  กำลังประมวลผล...
                </Typography>
              </Box>
              <LinearProgress
                variant={progress.total > 0 ? "determinate" : "indeterminate"}
                value={progress.percentage}
                sx={{ height: 8, borderRadius: 1 }}
              />
              {progress.total > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    ประมวลผลแล้ว: {progress.current.toLocaleString()} / {progress.total.toLocaleString()} รายการ
                  </Typography>
                  <Typography variant="body2" color="primary" fontWeight={600}>
                    {progress.percentage}%
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Success Result */}
        {result && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <SuccessIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">
                  {importMode === 'supporter' ? 'อัปเดตข้อมูลเสร็จสิ้น' : 'นำเข้าข้อมูลเสร็จสิ้น'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  สำเร็จ: {result.success} แถว | ล้มเหลว: {result.failed} แถว
                  {result.notFound !== undefined && ` | ไม่พบในระบบ: ${result.notFound} แถว`}
                  {result.deleted !== undefined && ` | ลบข้อมูลเก่า: ${result.deleted} แถว`}
                </Typography>
              </Box>
            </Box>

            {/* Summary */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Card sx={{ flex: 1, minWidth: 150, bgcolor: 'success.50' }}>
                <CardContent>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                    {result.success}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {importMode === 'supporter' ? 'อัปเดตสำเร็จ' : 'นำเข้าสำเร็จ'}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, minWidth: 150, bgcolor: 'error.50' }}>
                <CardContent>
                  <Typography variant="h4" color="error.main" sx={{ fontWeight: 700 }}>
                    {result.failed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ล้มเหลว
                  </Typography>
                </CardContent>
              </Card>
              {result.notFound !== undefined && result.notFound > 0 && (
                <Card sx={{ flex: 1, minWidth: 150, bgcolor: 'warning.50' }}>
                  <CardContent>
                    <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                      {result.notFound}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ไม่พบในระบบ
                    </Typography>
                  </CardContent>
                </Card>
              )}
              {result.deleted !== undefined && result.deleted > 0 && (
                <Card sx={{ flex: 1, minWidth: 150, bgcolor: 'info.50' }}>
                  <CardContent>
                    <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                      {result.deleted}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ลบข้อมูลเก่า
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>

            {/* Errors List */}
            {result.errors && result.errors.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
                  รายการที่ล้มเหลว:
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ลำดับ</TableCell>
                        <TableCell>ข้อผิดพลาด</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.errors.map((error: string, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="error">
                              {error}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Success List Preview - For Supporter Update */}
            {result.updated && result.updated.length > 0 && result.updated.length <= 20 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  ข้อมูลที่อัปเดตสำเร็จ (แสดง {result.updated.length} รายการ):
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ชื่อ-นามสกุล</TableCell>
                        <TableCell>เลขประจำตัวประชาชน</TableCell>
                        <TableCell>ตำแหน่งที่ร้องขอ</TableCell>
                        <TableCell>ผู้สนับสนุน</TableCell>
                        <TableCell>เหตุผล</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.updated.map((person: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{person.fullName}</TableCell>
                          <TableCell>{person.nationalId}</TableCell>
                          <TableCell>{person.requestedPosition || '-'}</TableCell>
                          <TableCell>{person.supporterName || '-'}</TableCell>
                          <TableCell>{person.supportReason || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Success List Preview - For Full Import */}
            {result.created && result.created.length > 0 && result.created.length <= 10 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  ข้อมูลที่นำเข้าสำเร็จ (แสดง {result.created.length} รายการ):
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ตำแหน่ง</TableCell>
                        <TableCell>ยศ</TableCell>
                        <TableCell>ชื่อ-สกุล</TableCell>
                        <TableCell>หน่วย</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.created.map((person: any) => (
                        <TableRow key={person.id}>
                          <TableCell>{person.position || '-'}</TableCell>
                          <TableCell>{person.rank || '-'}</TableCell>
                          <TableCell>{person.fullName || '-'}</TableCell>
                          <TableCell>{person.unit || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Paper>
        )}
      </Box>
        {/* Delete Year Confirm Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle sx={{ color: 'error.main' }}>⚠️ ยืนยันการลบข้อมูล</DialogTitle>
          <DialogContent>
            <DialogContentText>
              คุณต้องการลบข้อมูลบุคลากร<strong>ทั้งหมด</strong>ในปี <strong>{selectedYear}</strong> ออกจากระบบหรือไม่?
            </DialogContentText>
            <Alert severity="error" sx={{ mt: 2 }}>
              การดำเนินการนี้<strong>ไม่สามารถย้อนกลับได้</strong> ข้อมูลที่ถูกลบจะหายไปถาวร
              รวมถึงข้อมูลที่อาจเชื่อมโยงกับการแลกเปลี่ยนตำแหน่งต่างๆ
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleDeleteYear} color="error" variant="contained">
              ยืนยัน ลบทั้งหมด
            </Button>
          </DialogActions>
        </Dialog>

        {/* Import Over Existing Data Confirm Dialog */}
        <Dialog open={importConfirmOpen} onClose={() => setImportConfirmOpen(false)}>
          <DialogTitle>📋 พบข้อมูลในระบบแล้ว</DialogTitle>
          <DialogContent>
            <DialogContentText>
              พบข้อมูลบุคลากรในปี <strong>{selectedYear}</strong> จำนวน <strong>{existingRecordCount.toLocaleString()}</strong> รายการอยู่ในระบบแล้ว
            </DialogContentText>
            <Alert severity="info" sx={{ mt: 2 }}>
              ระบบจะ <strong>อัปเดต (UPSERT)</strong> ข้อมูลที่มีอยู่แล้ว และเพิ่มข้อมูลใหม่ที่ยังไม่มี
              โดยจะ<strong>ไม่ลบ</strong>ข้อมูลเดิม ต้องการดำเนินการต่อหรือไม่?
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportConfirmOpen(false)}>ยกเลิก</Button>
            <Button
              onClick={() => { setImportConfirmOpen(false); performUpload(); }}
              variant="contained"
            >
              ยืนยัน นำเข้าข้อมูล
            </Button>
          </DialogActions>
        </Dialog>

    </Layout>
  );
}
