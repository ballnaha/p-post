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
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import Layout from '@/app/components/Layout';

export default function ImportPolicePersonnelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
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

      const response = await fetch('/api/police-personnel/import', {
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
    try {
      const response = await fetch('/api/police-personnel/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'police_personnel_template.xlsx';
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
          <Typography variant="body2" color="text.secondary">
            นำเข้าข้อมูลบุคลากรตำรวจจากไฟล์ Excel
          </Typography>
        </Paper>

        {/* Instructions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="info" />
                <Typography variant="h6">คำแนะนำการใช้งาน</Typography>
              </Box>
              <IconButton onClick={() => setShowInstructions(!showInstructions)}>
                {showInstructions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={showInstructions}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. ดาวน์โหลดไฟล์ Template Excel"
                    secondary="คลิกปุ่ม 'ดาวน์โหลด Template' เพื่อดาวน์โหลดไฟล์ตัวอย่าง"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="2. กรอกข้อมูลตามรูปแบบ"
                    secondary="กรอกข้อมูลในไฟล์ Excel ตามคอลัมน์ที่กำหนด อย่าลบหรือเปลี่ยนชื่อหัวคอลัมน์"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="3. อัปโหลดไฟล์"
                    secondary="เลือกไฟล์และคลิก 'นำเข้าข้อมูล' เพื่ออัปโหลด"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                รูปแบบคอลัมน์ใน Excel (เรียงตามลำดับที่กำหนด):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  'อาวุโส', 'ยศ', 'ชื่อ สกุล','ID', 'POSCODE', 'ตำแหน่ง', 
                  'เลขตำแหน่ง', 'ทำหน้าที่', 'แต่งตั้งครั้งสุดท้าย', 'ระดับนี้เมื่อ', 'บรรจุ', 
                  'วันเกิด', 'คุณวุฒิ', 'เลขประจำตัวประชาชน', 'หน่วย', 'เกษียณ', 
                  'จำนวนปี', 'อายุ', 'ตท.', 'นรต.', 'หมายเหตุ/เงื่อนไข'
                ].map((column, index) => (
                  <Chip 
                    key={column} 
                    label={`${index + 1}. ${column}`} 
                    size="small" 
                    variant="outlined" 
                  />
                ))}
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>หมายเหตุ:</strong> กรุณาเรียงคอลัมน์ในไฟล์ Excel ตามลำดับที่แสดงข้างต้น 
                  (1-20) เพื่อให้การนำเข้าข้อมูลเป็นไปอย่างถูกต้อง
                </Typography>
              </Alert>
            </Collapse>
          </CardContent>
        </Card>

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
                <Typography variant="h6">นำเข้าข้อมูลเสร็จสิ้น</Typography>
                <Typography variant="body2" color="text.secondary">
                  สำเร็จ: {result.success} แถว | ล้มเหลว: {result.failed} แถว
                </Typography>
              </Box>
            </Box>

            {/* Summary */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Card sx={{ flex: 1, bgcolor: 'success.50' }}>
                <CardContent>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                    {result.success}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    นำเข้าสำเร็จ
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, bgcolor: 'error.50' }}>
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

            {/* Success List Preview */}
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
