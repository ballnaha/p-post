'use client';

import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  CloudUpload as UploadIcon,
  DeleteForever as DeleteForeverIcon,
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useSnackbar } from '@/contexts/SnackbarContext';

type FileKey = 'personFile' | 'positionFile' | 'requestFile' | 'fullFile';

const fileConfigs: Array<{
  key: FileKey;
  title: string;
  description: string;
  requiredColumns: string[];
  templateName: string;
  sampleRow: Record<string, string>;
}> = [
  {
    key: 'fullFile',
    title: 'นำเข้าข้อมูลแบบสมบูรณ์',
    description: 'ไฟล์เดียวครบทั้งข้อมูลบุคคล ตำแหน่ง และคำร้อง เหมาะสำหรับนำเข้าข้อมูลทั้งหมดในครั้งเดียว',
    requiredColumns: [
      'อาวุโส',
      'ยศ',
      'ชื่อ สกุล',
      'เลขประจำตัวประชาชน',
      'แต่งตั้งครั้งสุดท้าย',
      'ระดับนี้เมื่อ',
      'บรรจุ',
      'วันเกิด',
      'คุณวุฒิ',
      'เกษียณ',
      'จำนวนปี',
      'อายุ',
      'ตท.',
      'นรต.',
      'หมายเหตุตัวคน',
      'POSCODE',
      'ตำแหน่ง',
      'เลขตำแหน่ง',
      'ทำหน้าที่',
      'หน่วย',
      'หมายเหตุตำแหน่ง',
      'ตำแหน่งที่ร้องขอ',
      'ชื่อผู้สนับสนุน',
      'เหตุผลที่สนันสุนน',
    ],
    templateName: 'police_personnel_full_template.xlsx',
    sampleRow: {
      อาวุโส: '1',
      ยศ: 'พ.ต.ท.',
      'ชื่อ สกุล': 'สมชาย ใจดี',
      เลขประจำตัวประชาชน: '1234567890123',
      แต่งตั้งครั้งสุดท้าย: '01/01/2568',
      ระดับนี้เมื่อ: '01/06/2567',
      บรรจุ: '01/10/2543',
      วันเกิด: '15/01/2523',
      คุณวุฒิ: 'ศศ.บ., สว.98',
      เกษียณ: '30/09/2583',
      จำนวนปี: '24ป.7ด.',
      อายุ: '45ป.',
      'ตท.': '',
      'นรต.': '65',
      หมายเหตุตัวคน: 'ข้อมูลตัวอย่าง',
      POSCODE: '11',
      ตำแหน่ง: 'สว.ฝอ.3 บก.อก.ภ.9',
      เลขตำแหน่ง: '1901 10318 0195',
      ทำหน้าที่: 'อำนวยการ',
      หน่วย: '9',
      หมายเหตุตำแหน่ง: 'หมายเหตุตำแหน่งตัวอย่าง',
      ตำแหน่งที่ร้องขอ: 'ร้องขอตำแหน่งใน จ.ราชบุรี',
      ชื่อผู้สนับสนุน: 'พ.ต.อ.สมศักดิ์ รักดี',
      เหตุผลที่สนันสุนน: 'มีความรู้ความสามารถและประสบการณ์ในการปฏิบัติงาน',
    },
  },
  {
    key: 'personFile',
    title: '1. ไฟล์ข้อมูลบุคคล',
    description: 'ใช้เลขตำแหน่งเพื่อเชื่อมกับไฟล์ตำแหน่ง และใช้เลขบัตรประชาชนเป็นตัวตนของคน',
    requiredColumns: [
      'อาวุโส',
      'ยศ',
      'ชื่อ สกุล',
      'เลขประจำตัวประชาชน',
      'เลขตำแหน่ง',
      'แต่งตั้งครั้งสุดท้าย',
      'ระดับนี้เมื่อ',
      'บรรจุ',
      'วันเกิด',
      'คุณวุฒิ',
      'เกษียณ',
      'จำนวนปี',
      'อายุ',
      'ตท.',
      'นรต.',
      'หมายเหตุตัวคน',
    ],
    templateName: 'police_personnel_people_template.xlsx',
    sampleRow: {
      อาวุโส: '1',
      ยศ: 'พ.ต.ท.',
      'ชื่อ สกุล': 'สมชาย ใจดี',
      เลขประจำตัวประชาชน: '1234567890123',
      เลขตำแหน่ง: '1901 10318 0195',
      แต่งตั้งครั้งสุดท้าย: '01/01/2568',
      ระดับนี้เมื่อ: '01/06/2567',
      บรรจุ: '01/10/2543',
      วันเกิด: '15/01/2523',
      คุณวุฒิ: 'ศศ.บ., สว.98',
      เกษียณ: '30/09/2583',
      จำนวนปี: '24ป.7ด.',
      อายุ: '45ป.',
      'ตท.': '',
      'นรต.': '65',
      หมายเหตุตัวคน: 'ข้อมูลตัวอย่าง',
    },
  },
  {
    key: 'positionFile',
    title: '2. ไฟล์ข้อมูลตำแหน่ง',
    description: 'ระบบจะนำข้อมูลตำแหน่งมาเติมให้คน โดยจับคู่จากเลขตำแหน่ง',
    requiredColumns: ['POSCODE', 'ตำแหน่ง', 'เลขตำแหน่ง', 'ทำหน้าที่', 'หน่วย', 'หมายเหตุตำแหน่ง'],
    templateName: 'police_personnel_positions_template.xlsx',
    sampleRow: {
      POSCODE: '11',
      ตำแหน่ง: 'สว.ฝอ.3 บก.อก.ภ.9',
      เลขตำแหน่ง: '1901 10318 0195',
      ทำหน้าที่: 'อำนวยการ',
      หน่วย: '9',
      หมายเหตุตำแหน่ง: 'หมายเหตุตำแหน่งตัวอย่าง',
    },
  },
  {
    key: 'requestFile',
    title: '3. ไฟล์คำร้องและผู้สนับสนุน',
    description: 'ระบบจะผูกคำร้องกับคนด้วยเลขประจำตัวประชาชน',
    requiredColumns: ['เลขประจำตัวประชาชน', 'ตำแหน่งที่ร้องขอ', 'ชื่อผู้สนับสนุน', 'เหตุผลที่สนับสนุน'],
    templateName: 'police_personnel_requests_template.xlsx',
    sampleRow: {
      เลขประจำตัวประชาชน: '1234567890123',
      ตำแหน่งที่ร้องขอ: 'ร้องขอตำแหน่งใน จ.ราชบุรี',
      ชื่อผู้สนับสนุน: 'พ.ต.อ.สมศักดิ์ รักดี',
      เหตุผลที่สนับสนุน: 'มีความรู้ความสามารถและประสบการณ์ในการปฏิบัติงาน',
    },
  },
];

export default function ImportPolicePersonnelPage() {
  const [files, setFiles] = useState<Record<FileKey, File | null>>({
    fullFile: null,
    personFile: null,
    positionFile: null,
    requestFile: null,
  });
  const [loadingKey, setLoadingKey] = useState<FileKey | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() + 543);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingUploadKeys, setPendingUploadKeys] = useState<FileKey[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [existingRecordCount, setExistingRecordCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const { showSnackbar } = useSnackbar();

  const personInputRef = useRef<HTMLInputElement>(null);
  const positionInputRef = useRef<HTMLInputElement>(null);
  const requestInputRef = useRef<HTMLInputElement>(null);
  const fullInputRef = useRef<HTMLInputElement>(null);

  const inputRefs: Record<FileKey, RefObject<HTMLInputElement | null>> = {
    fullFile: fullInputRef,
    personFile: personInputRef,
    positionFile: positionInputRef,
    requestFile: requestInputRef,
  };

  const availableYears = useMemo(() => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const years: number[] = [];

    for (let year = currentBuddhistYear; year >= 2568; year--) {
      years.push(year);
    }

    return years;
  }, []);

  const handleFileChange = (key: FileKey) => (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const isExcel = /\.(xlsx|xls)$/i.test(selectedFile.name);
    if (!isExcel) {
      setError('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)');
      return;
    }

    setFiles((prev) => ({ ...prev, [key]: selectedFile }));
    setError('');
    setResult(null);
  };

  const resetFileInputs = (keys: FileKey[]) => {
    keys.forEach((key) => {
      const ref = inputRefs[key];
      if (ref.current) ref.current.value = '';
    });
  };

  const performUpload = async (uploadKeys: FileKey[]) => {
    setLoadingKey(uploadKeys[0]);
    setError('');
    setResult(null);
    setProgress({ current: 0, total: 0, percentage: 0 });

    try {
      const formData = new FormData();
      uploadKeys.forEach((key) => {
        formData.append(key, files[key]!);
      });
      if (uploadKeys.length === 1) {
        formData.append('uploadType', uploadKeys[0]);
      }
      formData.append('year', selectedYear.toString());

      const response = await fetch('/api/police-personnel/import-bundle', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success && data.jobId) {
        pollJobStatus(data.jobId, uploadKeys);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
        setLoadingKey(null);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
      setLoadingKey(null);
    }
  };

  const handleUpload = async (uploadKeys: FileKey[]) => {
    const missingFile = uploadKeys.find((key) => !files[key]);
    if (missingFile) {
      setError('กรุณาเลือกไฟล์ก่อนนำเข้า');
      return;
    }

    if (!uploadKeys.includes('personFile')) {
      performUpload(uploadKeys);
      return;
    }

    try {
      const checkRes = await fetch(`/api/police-personnel?year=${selectedYear}&limit=1`);
      const checkData = await checkRes.json();
      const existing = checkData.pagination?.total ?? 0;

      if (existing > 0) {
        setExistingRecordCount(existing);
        setPendingUploadKeys(uploadKeys);
        setImportConfirmOpen(true);
        return;
      }
    } catch {
      // ถ้าตรวจสอบไม่ได้ ให้ดำเนินการต่อ
    }

    performUpload(uploadKeys);
  };

  const pollJobStatus = async (jobId: string, uploadKeys: FileKey[]) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/import-job/${jobId}`);
        const data = await response.json();

        if (data.success && data.job) {
          const job = data.job;

          setProgress({
            current: job.processedRows,
            total: job.totalRows,
            percentage: job.percentage,
          });

          if (job.status === 'completed') {
            clearInterval(intervalId);
            setResult({
              success: job.successRows,
              failed: job.failedRows,
              updated: job.updatedRows,
              errors: job.errors || [],
              totalProcessed: job.processedRows,
              message: job.errorMessage,
            });
            setFiles((prev) => ({
              ...prev,
              ...Object.fromEntries(uploadKeys.map((key) => [key, null])),
            }));
            resetFileInputs(uploadKeys);
            setLoadingKey(null);
          } else if (job.status === 'failed') {
            clearInterval(intervalId);
            setError(job.errorMessage || 'เกิดข้อผิดพลาด');
            setLoadingKey(null);
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    }, 2000);
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

  const downloadTemplate = async (config: (typeof fileConfigs)[number]) => {
    try {
      const XLSX = await import('@e965/xlsx');
      const worksheet = XLSX.utils.json_to_sheet([config.sampleRow]);
      worksheet['!cols'] = config.requiredColumns.map((column) => ({
        wch: Math.max(16, column.length + 8),
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, config.title.replace(/^\d+\.\s*/, '').slice(0, 31));
      config.requiredColumns.forEach((column, index) => {
        if (column === 'เลขประจำตัวประชาชน') {
          const columnLetter = XLSX.utils.encode_col(index);
          const headerCell = worksheet[`${columnLetter}1`];
          const sampleCell = worksheet[`${columnLetter}2`];

          if (headerCell) headerCell.z = '@';
          if (sampleCell) {
            sampleCell.t = 's';
            sampleCell.v = String(sampleCell.v);
            sampleCell.z = '@';
          }
        }
      });
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = config.templateName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading template:', err);
      setError('ไม่สามารถดาวน์โหลดไฟล์ Template ได้');
    }
  };

  return (
    <Layout>
      <Box sx={{ mx: 'auto' }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                นำเข้าข้อมูล Police Personnel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                รองรับไฟล์สมบูรณ์ไฟล์เดียว หรือแยกนำเข้าเป็นข้อมูลบุคคล ข้อมูลตำแหน่ง และข้อมูลคำร้อง
              </Typography>
            </Box>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="year-select-label">ปี พ.ศ.</InputLabel>
              <Select
                labelId="year-select-label"
                value={selectedYear}
                label="ปี พ.ศ."
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Alert severity="info" sx={{ mt: 3 }}>
            แบบแยกไฟล์: ระบบจะผูกไฟล์คำร้องกับคนด้วยเลขประจำตัวประชาชน และผูกข้อมูลคนกับตำแหน่งด้วยเลขตำแหน่ง
          </Alert>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              เลือกไฟล์นำเข้า
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={deleting ? <CircularProgress size={16} color="error" /> : <DeleteForeverIcon />}
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting || Boolean(loadingKey)}
            >
              ลบข้อมูลทั้งหมดปี {selectedYear}
            </Button>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
            {fileConfigs.map((config) => {
              const selectedFile = files[config.key];

              return (
                <Card key={config.key} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {config.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {config.description}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {config.requiredColumns.map((column) => (
                          <Chip key={column} label={column} size="small" variant="outlined" />
                        ))}
                      </Box>

                      <Divider />

                      <input
                        ref={inputRefs[config.key]}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange(config.key)}
                        style={{ display: 'none' }}
                        id={`${config.key}-input`}
                      />

                      <Button variant="text" startIcon={<DownloadIcon />} onClick={() => downloadTemplate(config)}>
                        ดาวน์โหลด Template
                      </Button>

                      <Button component="label" htmlFor={`${config.key}-input`} variant="outlined" startIcon={<UploadIcon />}>
                        เลือกไฟล์
                      </Button>

                      <Button
                        variant="contained"
                        startIcon={loadingKey === config.key ? <CircularProgress size={18} color="inherit" /> : <UploadIcon />}
                        onClick={() => handleUpload([config.key])}
                        disabled={!selectedFile || Boolean(loadingKey)}
                      >
                        {loadingKey === config.key ? 'กำลังนำเข้า...' : 'นำเข้าไฟล์นี้'}
                      </Button>

                      <Box
                        sx={{
                          minHeight: 52,
                          border: '1px dashed',
                          borderColor: selectedFile ? 'success.main' : 'divider',
                          borderRadius: 1,
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <FileIcon color={selectedFile ? 'success' : 'disabled'} />
                        <Typography variant="body2" color={selectedFile ? 'text.primary' : 'text.secondary'} noWrap>
                          {selectedFile ? selectedFile.name : 'ยังไม่ได้เลือกไฟล์'}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {loadingKey && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress
                variant={progress.total > 0 ? 'determinate' : 'indeterminate'}
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

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {result && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <SuccessIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">นำเข้าข้อมูลเสร็จสิ้น</Typography>
                <Typography variant="body2" color="text.secondary">
                  {result.message || `สำเร็จ: ${result.success} แถว | ล้มเหลว: ${result.failed} แถว`}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Card sx={{ flex: 1, minWidth: 150, bgcolor: 'success.50' }}>
                <CardContent>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                    {result.success}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    นำเข้าสำเร็จ
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, minWidth: 150, bgcolor: 'info.50' }}>
                <CardContent>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                    {result.updated}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    อัปเดตข้อมูลเดิม
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
            </Box>

            {result.errors && result.errors.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'error.main' }}>
                  รายการที่ต้องตรวจสอบ
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ลำดับ</TableCell>
                        <TableCell>รายละเอียด</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.errors.map((item: string, index: number) => (
                        <TableRow key={`${item}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="error">
                              {item}
                            </Typography>
                          </TableCell>
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

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ color: 'error.main' }}>ยืนยันการลบข้อมูล</DialogTitle>
        <DialogContent>
          <DialogContentText>
            คุณต้องการลบข้อมูลบุคลากรทั้งหมดในปี <strong>{selectedYear}</strong> ออกจากระบบหรือไม่?
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>ยกเลิก</Button>
          <Button onClick={handleDeleteYear} color="error" variant="contained">
            ยืนยัน ลบทั้งหมด
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importConfirmOpen} onClose={() => setImportConfirmOpen(false)}>
        <DialogTitle>พบข้อมูลในระบบแล้ว</DialogTitle>
        <DialogContent>
          <DialogContentText>
            พบข้อมูลบุคลากรในปี <strong>{selectedYear}</strong> จำนวน{' '}
            <strong>{existingRecordCount.toLocaleString()}</strong> รายการอยู่ในระบบแล้ว
          </DialogContentText>
          <Alert severity="info" sx={{ mt: 2 }}>
            ระบบจะอัปเดตข้อมูลที่มีเลขประจำตัวประชาชนซ้ำในปีเดียวกัน และเพิ่มข้อมูลใหม่ที่ยังไม่มี โดยจะไม่ลบข้อมูลเดิม
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportConfirmOpen(false)}>ยกเลิก</Button>
            <Button
              onClick={() => {
                setImportConfirmOpen(false);
                performUpload(pendingUploadKeys);
              }}
            variant="contained"
          >
            ยืนยัน นำเข้าข้อมูล
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
