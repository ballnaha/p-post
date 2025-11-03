'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  alpha,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowDownward as ArrowDownIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import PromotionChainBuilder from './components/PromotionChainBuilder';

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

interface VacantPosition {
  id: string;
  posCodeId: number;
  position: string;
  unit: string;
  requestedPositionId?: number;
  requestedPosition?: string;
}

function CreatePromotionChainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vacantId = searchParams.get('vacantId');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vacantPosition, setVacantPosition] = useState<VacantPosition | null>(null);
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (vacantId) {
      loadVacantPosition(vacantId);
    }
  }, [vacantId]);

  const loadVacantPosition = async (id: string) => {
    setLoading(true);
    try {
      // TODO: Implement API call
      // const response = await fetch(`/api/vacant-position/${id}`);
      // const data = await response.json();
      // setVacantPosition(data);

      // Mock data - เลือกตามที่ส่งมา
      const mockPositions = [
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
      ];
      
      const foundPosition = mockPositions.find(p => p.id === id);
      setVacantPosition(foundPosition || mockPositions[0]);
    } catch (error) {
      console.error('Error loading vacant position:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNode = (node: ChainNode) => {
    setNodes([...nodes, node]);
    setActiveStep(nodes.length);
  };

  const handleRemoveNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call
      // const response = await fetch('/api/promotion-chain', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     originVacantPositionId: vacantId,
      //     nodes,
      //   }),
      // });

      alert('บันทึก Promotion Chain สำเร็จ!');
      router.push('/police-personnel/promotion-chain');
    } catch (error) {
      console.error('Error saving chain:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const validateChain = () => {
    if (nodes.length === 0) return false;
    return nodes.every((node) => node.isPromotionValid);
  };

  const isChainValid = validateChain();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/police-personnel/promotion-chain')}
          sx={{ mb: 2 }}
        >
          กลับ
        </Button>
        <Typography variant="h4" gutterBottom>
          สร้าง Promotion Chain
        </Typography>
        <Typography variant="body2" color="text.secondary">
          สร้างลูกโซ่การเลื่อนตำแหน่งจากตำแหน่งว่าง
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Origin Position */}
          {vacantPosition && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: alpha('#2196f3', 0.05) }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                ตำแหน่งว่างต้นทาง
              </Typography>
              <Typography variant="h6">
                {vacantPosition.position} ({vacantPosition.unit})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                ระบบจะหาคนเพื่อมาแทนตำแหน่งนี้ และสร้างลูกโซ่การเลื่อนตำแหน่งต่อไป
              </Typography>
            </Paper>
          )}

          {/* Status Summary */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  จำนวนขั้นในโซ่
                </Typography>
                <Typography variant="h5">{nodes.length} ขั้น</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  สถานะการตรวจสอบ
                </Typography>
                <Chip
                  icon={isChainValid ? <CheckIcon /> : <WarningIcon />}
                  label={isChainValid ? 'ผ่านการตรวจสอบ' : 'ยังไม่สมบูรณ์'}
                  color={isChainValid ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
            </Box>
          </Paper>

          {/* Chain Builder */}
          <PromotionChainBuilder
            vacantPosition={vacantPosition}
            nodes={nodes}
            onAddNode={handleAddNode}
            onRemoveNode={handleRemoveNode}
          />

          {/* Actions */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/police-personnel/promotion-chain')}
            >
              ยกเลิก
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!isChainValid || saving || nodes.length === 0}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก Chain'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}

export default function CreatePromotionChainPage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    }>
      <CreatePromotionChainContent />
    </Suspense>
  );
}
