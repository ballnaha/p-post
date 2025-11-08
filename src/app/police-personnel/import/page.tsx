'use client';
import { useState, useRef } from 'react';
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
  IconButton,
  Collapse,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Update as UpdateIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';

type ImportMode = 'full' | 'supporter';

export default function ImportPolicePersonnelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [importMode, setImportMode] = useState<ImportMode>('full');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async () => {
    if (!file) {
      setError('กรุณาเลือกไฟล์');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setProgress({ current: 0, total: 0, percentage: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);

      // เลือก API endpoint ตาม import mode
      const apiEndpoint = importMode === 'supporter' 
        ? '/api/police-personnel/import-supporter'
        : '/api/police-personnel/import';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

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
                  setResult(data.results);
                  setFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                } else if (data.type === 'error') {
                  setError(data.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
                }
              } catch (e) {
                console.error('Error parsing progress data:', e);
              }
            }
          }
        }
      } else {
        // Fallback to regular JSON response
        const data = await response.json();
        if (data.success) {
          setResult(data.results);
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          setError(data.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
        }
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
    } finally {
      setLoading(false);
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
            <ToggleButtonGroup
              value={importMode}
              exclusive
              onChange={(e, newMode) => {
                if (newMode !== null) {
                  setImportMode(newMode);
                  setFile(null);
                  setResult(null);
                  setError('');
                }
              }}
              aria-label="import mode"
              color="primary"
            >
              <ToggleButton value="full" aria-label="full import">
                <RefreshIcon sx={{ mr: 1 }} />
                Import แบบเต็ม (ลบข้อมูลเดิมทั้งหมด)
              </ToggleButton>
              <ToggleButton value="supporter" aria-label="supporter update">
                <UpdateIcon sx={{ mr: 1 }} />
                อัปเดตผู้สนับสนุนเท่านั้น (ไม่ลบข้อมูลเดิม)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Mode Description */}
          <Alert severity={importMode === 'full' ? 'warning' : 'info'} sx={{ mb: 0 }}>
            {importMode === 'full' ? (
              <Typography variant="body2">
                <strong>⚠️ Import แบบเต็ม:</strong> ระบบจะลบข้อมูลบุคลากรทั้งหมดในระบบ แล้วนำเข้าข้อมูลใหม่จากไฟล์ Excel
              </Typography>
            ) : (
              <Typography variant="body2">
                <strong>✨ อัปเดตผู้สนับสนุน:</strong> ระบบจะอัปเดตเฉพาะฟิลด์ "ชื่อผู้สนับสนุน" และ "เหตุผล" โดยไม่กระทบข้อมูลอื่น
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
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>📌 วัตถุประสงค์:</strong> ระบบ Import ใช้สำหรับนำเข้าข้อมูลบุคลากรตำรวจจากไฟล์ Excel เข้าสู่ระบบฐานข้อมูล
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
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

            <Typography variant="body2" color="text.secondary" paragraph fontWeight={600}>
              📊 รูปแบบคอลัมน์ใน Excel:
            </Typography>

            {/* Full Import Columns */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ mb: 1 }}>
                Import แบบเต็ม (21 คอลัมน์):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {[
                  'อาวุโส', 'ยศ', 'ชื่อ สกุล','ID', 'POSCODE', 'ตำแหน่ง', 
                  'เลขตำแหน่ง', 'ทำหน้าที่', 'แต่งตั้งครั้งสุดท้าย', 'ระดับนี้เมื่อ', 'บรรจุ', 
                  'วันเกิด', 'คุณวุฒิ', 'เลขประจำตัวประชาชน', 'หน่วย', 'เกษียณ', 
                  'จำนวนปี', 'อายุ', 'ตท.', 'นรต.', 'หมายเหตุ/เงื่อนไข', 'ชื่อผู้สนับสนุน', 'เหตุผล'
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
                อัปเดตผู้สนับสนุน (4 คอลัมน์):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  'ชื่อ สกุล', 'เลขประจำตัวประชาชน', 'ชื่อผู้สนับสนุน', 'เหตุผล'
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
                <li><strong>Import แบบเต็ม:</strong> จะลบข้อมูลเดิมทั้งหมดในระบบ (23 คอลัมน์)</li>
                <li><strong>อัปเดตผู้สนับสนุน:</strong> จะอัปเดตเฉพาะฟิลด์ผู้สนับสนุนและเหตุผล โดยอ้างอิงจากชื่อ-นามสกุลและเลขบัตรประชาชน (4 คอลัมน์)</li>
                <li>ห้ามลบหรือเปลี่ยนชื่อหัวคอลัมน์ เพราะจะทำให้การ import ผิดพลาด</li>
                <li>ตรวจสอบรูปแบบข้อมูลให้ถูกต้องก่อนอัปโหลด</li>
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
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadTemplate}
            >
              ดาวน์โหลด Template
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
                        <TableCell>เลขบัตรประชาชน</TableCell>
                        <TableCell>ผู้สนับสนุน</TableCell>
                        <TableCell>เหตุผล</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.updated.map((person: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{person.fullName}</TableCell>
                          <TableCell>{person.nationalId}</TableCell>
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
    </Layout>
  );
}
