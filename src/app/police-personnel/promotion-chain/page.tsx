'use client';
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  alpha,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as ArrowDownIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

// Types
interface ChainNode {
  id: string;
  nodeOrder: number;
  personnelId?: string;
  nationalId: string;
  fullName: string;
  rank: string;
  seniority?: string;
  fromPosCodeId: number;
  fromPosition: string;
  fromPositionNumber?: string;
  fromUnit: string;
  toPosCodeId: number;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  fromRankLevel: number;
  toRankLevel: number;
  isPromotionValid: boolean;
}

interface PromotionChain {
  id: string;
  year: number;
  chainNumber: string;
  status: 'draft' | 'approved' | 'completed' | 'cancelled';
  originVacantPositionId: string;
  originPosCodeId: number;
  originPosition: string;
  originUnit: string;
  totalNodes: number;
  nodes: ChainNode[];
  createdAt: string;
  createdBy?: string;
}

interface VacantPosition {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  requestedPositionId?: number;
  requestedPosition?: string;
}

interface SwapListPerson {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  fullName: string;
  rank: string;
  nationalId: string;
  seniority?: string;
}

const RANK_HIERARCHY = [
  { rankName: 'รอง ผบ.ตร.', rankLevel: 1 },
  { rankName: 'ผู้ช่วย', rankLevel: 2 },
  { rankName: 'ผบช.', rankLevel: 3 },
  { rankName: 'รอง ผบช.', rankLevel: 4 },
  { rankName: 'ผบก.', rankLevel: 6 },
  { rankName: 'รอง ผบก.', rankLevel: 7 },
  { rankName: 'ผกก.', rankLevel: 8 },
  { rankName: 'รอง ผกก.', rankLevel: 9 },
  { rankName: 'สว.', rankLevel: 11 },
  { rankName: 'รอง สว.', rankLevel: 12 },
];

export default function PromotionChainPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [chains, setChains] = useState<PromotionChain[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [vacantPositions, setVacantPositions] = useState<VacantPosition[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 543);

  // Load chains
  useEffect(() => {
    loadChains();
    loadVacantPositions();
  }, [selectedYear]);

  const loadChains = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call
      // const response = await fetch(`/api/promotion-chain?year=${selectedYear}`);
      // const data = await response.json();
      // setChains(data);
      
      // Mock data for demonstration
      setChains([]);
    } catch (error) {
      console.error('Error loading chains:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVacantPositions = async () => {
    try {
      // TODO: Implement API call
      // const response = await fetch(`/api/vacant-position?year=${selectedYear}`);
      // const data = await response.json();
      // setVacantPositions(data);
      
      // Mock data for demonstration
      setVacantPositions([
        {
          id: 'vp-1',
          posCodeId: 8,
          position: 'ผกก-นครปฐม',
          unit: 'สถ.นครปฐม',
        },
        {
          id: 'vp-2',
          posCodeId: 6,
          position: 'ผบก.-สมุทรสาคร',
          unit: 'สถ.สมุทรสาคร',
        },
        {
          id: 'vp-3',
          posCodeId: 11,
          position: 'สว.-กาญจนบุรี',
          unit: 'สถ.กาญจนบุรี',
        },
      ]);
    } catch (error) {
      console.error('Error loading vacant positions:', error);
    }
  };

  const handleCreateChain = () => {
    setShowCreateDialog(false);
    router.push('/police-personnel/promotion-chain/create');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'approved': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'ร่าง';
      case 'approved': return 'อนุมัติแล้ว';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ fontSize: 40 }} />
            จัดการลูกโซ่การเลื่อนตำแหน่ง (Promotion Chain)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            จัดการการเลื่อนตำแหน่งแบบลูกโซ่ เมื่อมีตำแหน่งว่างและต้องการเลื่อนคนขึ้นมาแทนตามลำดับชั้น
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateDialog(true)}
          size="large"
        >
          สร้าง Chain ใหม่
        </Button>
      </Box>

      {/* Year Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          select
          label="ปีงบประมาณ"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          size="small"
          sx={{ minWidth: 150 }}
        >
          {[2568, 2567, 2566].map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Promotion Chain คืออะไร?</strong>
        </Typography>
        <Typography variant="body2">
          เมื่อมีตำแหน่งว่าง (เช่น ผกก-นครปฐม) และเลือกคนมาแทน (เช่น รอง ผบก.-ราชบุรี)
          ตำแหน่งเดิมของเขา (ผบก.-ราชบุรี) จะว่างลง ต้องหาคนมาแทนต่อ (เช่น ผกก.-สมุทรสาคร)
          และทำต่อเนื่องจนถึงระดับล่างสุดที่กำหนด
        </Typography>
      </Alert>

      {/* Chains List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : chains.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <TrendingUpIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            ยังไม่มี Promotion Chain
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            เริ่มต้นสร้าง Promotion Chain แรกของคุณ
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            สร้าง Chain ใหม่
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {chains.map((chain) => (
            <Card key={chain.id} sx={{ '&:hover': { boxShadow: 4 } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {chain.chainNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ตำแหน่งต้นทาง: <strong>{chain.originPosition}</strong> ({chain.originUnit})
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Chip
                      label={getStatusLabel(chain.status)}
                      color={getStatusColor(chain.status) as any}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      จำนวน: {chain.totalNodes} ขั้น
                    </Typography>
                  </Box>
                </Box>

                {/* Chain Preview */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  flexWrap: 'wrap',
                  p: 2,
                  bgcolor: alpha('#000', 0.02),
                  borderRadius: 1,
                }}>
                  {chain.nodes.map((node, index) => (
                    <React.Fragment key={node.id}>
                      <Chip
                        label={`${node.rank} ${node.fullName}`}
                        size="small"
                        variant="outlined"
                      />
                      {index < chain.nodes.length - 1 && (
                        <ArrowDownIcon fontSize="small" color="action" />
                      )}
                    </React.Fragment>
                  ))}
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => router.push(`/police-personnel/promotion-chain/${chain.id}`)}
                  >
                    ดูรายละเอียด
                  </Button>
                  {chain.status === 'draft' && (
                    <>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => router.push(`/police-personnel/promotion-chain/${chain.id}/edit`)}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                      >
                        ลบ
                      </Button>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>สร้าง Promotion Chain ใหม่</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            เลือกตำแหน่งว่างที่ต้องการเริ่มต้นสร้าง Promotion Chain
          </Typography>
          
          {vacantPositions.length === 0 ? (
            <Alert severity="warning">
              ไม่มีตำแหน่งว่างในระบบ กรุณาเพิ่มตำแหน่งว่างก่อน
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ตำแหน่ง</TableCell>
                    <TableCell>หน่วย</TableCell>
                    <TableCell align="center">เลือก</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vacantPositions.map((vp) => (
                    <TableRow key={vp.id} hover>
                      <TableCell>{vp.position}</TableCell>
                      <TableCell>{vp.unit}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            router.push(`/police-personnel/promotion-chain/create?vacantId=${vp.id}`);
                            setShowCreateDialog(false);
                          }}
                        >
                          เลือก
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>ยกเลิก</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
