'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Box, Paper, Typography, Button, Chip, CircularProgress, alpha } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon, Check as CheckIcon, Warning as WarningIcon } from '@mui/icons-material';
import Layout from '@/app/components/Layout';
import { useToast } from '@/hooks/useToast';
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
  positionNumber?: string;
}

function CreatePromotionChainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vacantId = searchParams.get('vacantId');
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vacantPosition, setVacantPosition] = useState<VacantPosition | null>(null);
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (vacantId) {
      loadVacantPosition(vacantId);
    } else {
      // ถ้าไม่มี vacantId ให้ redirect กลับไปหน้าหลัก
      toast.error('กรุณาเลือกตำแหน่งว่างก่อนสร้างรายการ');
      router.push('/police-personnel/promotion-chain');
    }
  }, [vacantId]);

  const loadVacantPosition = async (id: string) => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear() + 543;
      const response = await fetch(`/api/vacant-position/actual?year=${currentYear}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vacant positions');
      }

      const result = await response.json();
      const allPositions = result.data || [];
      
      console.log('Looking for vacant position:', { id, totalPositions: allPositions.length });
      
      // Find the specific vacant position by ID
      const data = allPositions.find((pos: any) => pos.id === id);
      
      if (!data) {
        console.error('Vacant position not found. Available IDs:', allPositions.map((p: any) => p.id).slice(0, 5));
        toast.error('ไม่พบข้อมูลตำแหน่งว่างที่เลือก กรุณาเลือกใหม่');
        // Redirect back to main page
        setTimeout(() => {
          router.push('/police-personnel/promotion-chain');
        }, 2000);
        return;
      }
      
      // Map API response to VacantPosition format
      const vacantPos: VacantPosition = {
        id: data.id,
        posCodeId: data.posCodeId,
        position: data.posCodeMaster?.name || data.position || '-',
        unit: data.unit || '-',
        requestedPositionId: data.requestedPositionId,
        requestedPosition: data.requestedPosition,
        positionNumber: data.positionNumber,
      };
      
      console.log('Loaded vacant position:', vacantPos);
      setVacantPosition(vacantPos);
    } catch (error) {
      console.error('Error loading vacant position:', error);
      toast.error('ไม่สามารถโหลดข้อมูลตำแหน่งว่างได้');
      // Redirect back to main page on error
      setTimeout(() => {
        router.push('/police-personnel/promotion-chain');
      }, 2000);
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

      toast.success('บันทึกรายการสำเร็จ');
      router.push('/police-personnel/promotion-chain');
    } catch (error) {
      console.error('Error saving chain:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
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
    <Layout>
      <Box>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            gap: 2,
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                จัดคนเข้าตำแหน่งว่าง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                เลือกบุคลากรทีละขั้นเพื่อจัดเข้าตำแหน่งว่างแบบทอดต่อ
              </Typography>

              {/* Vacant Position Info - Inline */}
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">กำลังโหลด...</Typography>
                </Box>
              ) : vacantPosition && (
                <Box sx={{ 
                  p: 2,
                  bgcolor: 'primary.50',
                  borderRadius: 1,
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}>
                  <Box>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      🎯 ตำแหน่งว่างต้นทาง
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, lineHeight: 1.2 }}>
                      {vacantPosition.position}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      หน่วย: {vacantPosition.unit} | เลขตำแหน่ง: {vacantPosition.positionNumber || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">ขั้นในโซ่</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: nodes.length > 0 ? 'primary.main' : 'text.secondary' }}>
                      {nodes.length}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/police-personnel/promotion-chain')}
              sx={{ flexShrink: 0 }}
            >
              ย้อนกลับ
            </Button>
          </Box>
        </Paper>

        {!loading && (
          <>

            {/* Chain Builder */}
            <Box sx={{ pb: 12 }}> {/* Add bottom padding to prevent sticky footer overlap */}
              <PromotionChainBuilder
                vacantPosition={vacantPosition}
                nodes={nodes}
                onAddNode={handleAddNode}
                onRemoveNode={handleRemoveNode}
              />
            </Box>

            {/* Actions - Sticky Footer */}
            <Paper 
              sx={{ 
                p: 2.5, 
                position: 'sticky', 
                bottom: 0, 
                zIndex: 10,
                display: 'flex', 
                gap: 2, 
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.08)',
                bgcolor: 'background.paper',
              }}
            >
              <Box>
                {nodes.length > 0 ? (
                  <>
                    <Typography variant="body2" fontWeight={600}>
                      {isChainValid ? '✓ พร้อมบันทึก' : '⚠ ยังไม่สมบูรณ์'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {nodes.length} ขั้นในโซ่
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    เริ่มสร้างโซ่ด้วยการเลือกผู้สมัคร
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/police-personnel/promotion-chain')}
                  disabled={saving}
                >
                  ยกเลิก
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={!isChainValid || saving || nodes.length === 0}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                </Button>
              </Box>
            </Paper>
          </>
        )}
      </Box>
    </Layout>
  );
}

export default function CreatePromotionChainPage() {
  return (
    <Suspense fallback={
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      </Layout>
    }>
      <CreatePromotionChainContent />
    </Suspense>
  );
}
