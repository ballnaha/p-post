"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from "@mui/icons-material";
import Layout from "@/app/components/Layout";
import PromotionTable from "@/app/police-personnel/promotion/create/components/PromotionTable";
import { useToast } from "@/hooks/useToast";

// Types aligned with promotion builder
interface ChainNode {
  id: string;
  nodeOrder: number;
  personnelId?: string;
  noId?: number;
  nationalId: string;
  fullName: string;
  rank: string;
  seniority?: string;
  // Personal information
  birthDate?: string;
  age?: string;
  education?: string;
  // Appointment information
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  // Training information
  trainingLocation?: string;
  trainingCourse?: string;
  // Support information
  supporterName?: string;
  supportReason?: string;
  // Notes
  notes?: string;
  fromPosCodeId: number;
  fromPosCodeName?: string;
  fromPosition: string;
  fromPositionNumber?: string;
  fromUnit: string;
  fromActingAs?: string;
  toPosCodeId: number;
  toPosCodeName?: string;
  toPosition: string;
  toPositionNumber?: string;
  toUnit: string;
  toActingAs?: string;
  fromRankLevel: number;
  toRankLevel: number;
  isPromotionValid: boolean;
}

interface StartingPersonnel {
  id: string;
  noId?: number;
  posCodeId: number;
  posCodeName?: string;
  position: string;
  unit: string;
  positionNumber?: string;
  actingAs?: string;
  fullName: string;
  rank: string;
  nationalId: string;
  seniority?: string;
}

interface SwapDetailApi {
  id: string;
  sequence?: number | null;
  personnelId?: string | null;
  noId?: number | null;
  nationalId?: string | null;
  fullName: string;
  rank?: string | null;
  seniority?: string | null;
  posCodeId?: number | null;
  posCodeMaster?: { id: number; name: string } | null;
  toPosCodeId?: number | null;
  toPosCodeMaster?: { id: number; name: string } | null;
  // Personal information
  birthDate?: string | null;
  age?: string | null;
  education?: string | null;
  // Appointment information
  lastAppointment?: string | null;
  currentRankSince?: string | null;
  enrollmentDate?: string | null;
  retirementDate?: string | null;
  yearsOfService?: string | null;
  // Training information
  trainingLocation?: string | null;
  trainingCourse?: string | null;
  // Position information
  fromPosition?: string | null;
  fromPositionNumber?: string | null;
  fromUnit?: string | null;
  fromActingAs?: string | null;
  toPosition?: string | null;
  toPositionNumber?: string | null;
  toUnit?: string | null;
  toActingAs?: string | null;
  notes?: string | null;
  // Support information
  supportName?: string | null;
  supportReason?: string | null;
}

interface TransactionApi {
  id: string;
  year: number;
  swapDate: string;
  swapType: string;
  groupName?: string | null;
  groupNumber?: string | null;
  status: string;
  notes?: string | null;
  swapDetails: SwapDetailApi[];
}

export default function EditPromotionPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<TransactionApi | null>(null);
  const [groupNotes, setGroupNotes] = useState<string>('');
  const [startingPersonnel, setStartingPersonnel] = useState<StartingPersonnel | null>(null);
  const [nodes, setNodes] = useState<ChainNode[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/swap-transactions/${id}`);
        const json = await res.json();
        if (!res.ok || !json?.data) throw new Error(json?.error || "ไม่พบข้อมูล");
        const t: TransactionApi = json.data;

        // Map details → nodes
        const sorted = [...(t.swapDetails || [])].sort((a, b) => {
          const sa = a.sequence ?? 9999;
          const sb = b.sequence ?? 9999;
          if (sa !== sb) return sa - sb;
          return (a.fullName || "").localeCompare(b.fullName || "");
        });

        const mappedNodes: ChainNode[] = sorted.map((d, index) => {
          const fromRank = d.posCodeId ?? 0;
          const toRank = d.toPosCodeId ?? 0;
          return {
            id: `node-${d.id}`,
            nodeOrder: d.sequence ?? index + 1,
            personnelId: d.personnelId ?? undefined,
            noId: d.noId ?? undefined,
            nationalId: d.nationalId ?? "",
            fullName: d.fullName,
            rank: d.rank ?? "",
            seniority: d.seniority ?? undefined,
            birthDate: d.birthDate ?? undefined,
            age: d.age ?? undefined,
            education: d.education ?? undefined,
            lastAppointment: d.lastAppointment ?? undefined,
            currentRankSince: d.currentRankSince ?? undefined,
            enrollmentDate: d.enrollmentDate ?? undefined,
            retirementDate: d.retirementDate ?? undefined,
            yearsOfService: d.yearsOfService ?? undefined,
            trainingLocation: d.trainingLocation ?? undefined,
            trainingCourse: d.trainingCourse ?? undefined,
            supporterName: d.supportName ?? undefined,
            supportReason: d.supportReason ?? undefined,
            notes: d.notes ?? undefined,
            fromPosCodeId: d.posCodeId ?? 0,
            fromPosCodeName: d.posCodeMaster?.name ?? undefined,
            fromPosition: d.fromPosition ?? "",
            fromPositionNumber: d.fromPositionNumber ?? undefined,
            fromUnit: d.fromUnit ?? "",
            fromActingAs: d.fromActingAs ?? undefined,
            toPosCodeId: d.toPosCodeId ?? 0,
            toPosCodeName: d.toPosCodeMaster?.name ?? undefined,
            toPosition: d.toPosition ?? "",
            toPositionNumber: d.toPositionNumber ?? undefined,
            toUnit: d.toUnit ?? "",
            toActingAs: d.toActingAs ?? undefined,
            fromRankLevel: fromRank,
            toRankLevel: toRank,
            isPromotionValid: true,
          };
        });

        setNodes(mappedNodes);

        // Get starting personnel from first node
        const first = mappedNodes[0];
        setStartingPersonnel(first ? {
          id: first.personnelId || "from-transaction",
          noId: first.noId,
          posCodeId: first.fromPosCodeId,
          posCodeName: first.fromPosCodeName,
          position: first.fromPosition,
          unit: first.fromUnit,
          positionNumber: first.fromPositionNumber,
          actingAs: first.fromActingAs,
          fullName: first.fullName,
          rank: first.rank,
          nationalId: first.nationalId,
          seniority: first.seniority,
        } : null);

        setTransaction(t);
        setGroupNotes(t.notes || '');
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        router.push("/police-personnel/promotion");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isChainValid = useMemo(() => nodes.length > 0 && nodes.every(n => n.isPromotionValid), [nodes]);

  const handleAddNode = (node: ChainNode) => {
    setNodes([...nodes, node]);
  };

  const handleRemoveNode = (nodeId: string) => {
    const newNodes = nodes.filter(n => n.id !== nodeId);
    setNodes(newNodes.map((node, index) => ({ ...node, nodeOrder: index + 1 })));
    toast.success('ลบตำแหน่งสำเร็จ');
  };

  const handleInsertNode = (newNode: ChainNode, beforeNodeId: string) => {
    const targetIndex = nodes.findIndex(n => n.id === beforeNodeId);
    if (targetIndex === -1) {
      toast.error('ไม่พบตำแหน่งที่ต้องการแทรก');
      return;
    }
    const newNodes = [...nodes];
    newNodes.splice(targetIndex, 0, newNode);
    setNodes(newNodes.map((node, index) => ({ ...node, nodeOrder: index + 1 })));
    toast.success('แทรกตำแหน่งใหม่สำเร็จ');
  };

  const handleReorder = (reorderedNodes: ChainNode[]) => {
    setNodes(reorderedNodes.map((node, index) => ({ ...node, nodeOrder: index + 1 })));
  };

  const handleSave = async () => {
    if (!transaction) return;
    setSaving(true);
    try {
      const swapDetails = nodes.map((node) => ({
        sequence: node.nodeOrder,
        personnelId: node.personnelId,
        noId: node.noId,
        nationalId: node.nationalId,
        fullName: node.fullName,
        rank: node.rank,
        seniority: node.seniority,
        posCodeId: node.fromPosCodeId,
        toPosCodeId: node.toPosCodeId || null,
        birthDate: node.birthDate,
        age: node.age,
        education: node.education,
        lastAppointment: node.lastAppointment,
        currentRankSince: node.currentRankSince,
        enrollmentDate: node.enrollmentDate,
        retirementDate: node.retirementDate,
        yearsOfService: node.yearsOfService,
        trainingLocation: node.trainingLocation,
        trainingCourse: node.trainingCourse,
        supportName: node.supporterName,
        supportReason: node.supportReason,
        fromPosition: node.fromPosition,
        fromPositionNumber: node.fromPositionNumber,
        fromUnit: node.fromUnit,
        fromActingAs: node.fromActingAs,
        toPosition: node.toPosition,
        toPositionNumber: node.toPositionNumber,
        toUnit: node.toUnit,
        toActingAs: node.toActingAs,
        notes: node.notes || null,
      }));

      const payload = {
        year: transaction.year,
        swapDate: transaction.swapDate,
        swapType: transaction.swapType,
        groupName: transaction.groupName,
        groupNumber: transaction.groupNumber,
        status: transaction.status,
        notes: groupNotes.trim() || null,
        swapDetails,
      };

      const res = await fetch(`/api/swap-transactions/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.error || "บันทึกไม่สำเร็จ");

      toast.success("บันทึกการแก้ไขสำเร็จ");

      // Reload data
      const reloadRes = await fetch(`/api/swap-transactions/${transaction.id}`);
      const reloadJson = await reloadRes.json();
      if (reloadRes.ok && reloadJson?.data) {
        const t: TransactionApi = reloadJson.data;
        setTransaction(t);
        setGroupNotes(t.notes || '');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                แก้ไขรายการเลื่อนตำแหน่ง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ใช้รูปแบบเดียวกับหน้าเพิ่มรายการ ปรับขั้นตอนและบันทึกอีกครั้ง
              </Typography>

              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">กำลังโหลด...</Typography>
                </Box>
              ) : startingPersonnel && (
                <Box sx={{ p: 1.5, bgcolor: "success.50", borderRadius: 1, borderLeft: "3px solid", borderColor: "success.main" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                      🎖️ บุคลากรที่จะเลื่อนตำแหน่ง (แก้ไข)
                    </Typography>
                    {transaction?.groupNumber && (
                      <Chip label={transaction.groupNumber} size="small" color="success" sx={{ height: 28 }} />
                    )}
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {startingPersonnel.rank} {startingPersonnel.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.85rem" }}>
                    {startingPersonnel.posCodeName} • {startingPersonnel.position} • {startingPersonnel.unit}
                  </Typography>
                </Box>
              )}
            </Box>

            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push("/police-personnel/promotion")}
              sx={{ flexShrink: 0 }}
            >
              ย้อนกลับ
            </Button>
          </Box>

          {/* หมายเหตุกลุ่ม */}
          {!loading && startingPersonnel && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="หมายเหตุ"
                placeholder="ระบุหมายเหตุเพิ่มเติมสำหรับกลุ่มนี้ (ถ้ามี)"
                multiline
                rows={2}
                value={groupNotes}
                onChange={(e) => setGroupNotes(e.target.value)}
                variant="outlined"
                size="small"
              />
            </Box>
          )}
        </Paper>

        {!loading && (
          <>
            {/* Table */}
            <Box sx={{ pb: 12 }}>
              <PromotionTable
                startingPersonnel={startingPersonnel}
                nodes={nodes}
                onAddNode={handleAddNode}
                onRemoveNode={handleRemoveNode}
                onInsertNode={handleInsertNode}
                onReorder={handleReorder}
              />
            </Box>

            {/* Sticky footer actions */}
            <Paper sx={{ 
              p: { xs: 1.5, sm: 2.5 }, 
              position: "sticky", 
              bottom: 0, 
              zIndex: 10, 
              display: "flex", 
              gap: { xs: 1, sm: 2 },
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: "space-between", 
              alignItems: { xs: 'stretch', sm: 'center' },
              boxShadow: "0 -4px 12px rgba(0,0,0,0.08)", 
              bgcolor: "background.paper" 
            }}>
              <Box sx={{ mb: { xs: 1, sm: 0 } }}>
                {nodes.length > 0 ? (
                  <>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                      {isChainValid ? "✓ พร้อมบันทึก" : "⚠ ยังไม่สมบูรณ์"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      {nodes.length} ขั้นในโซ่
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                    ยังไม่มีขั้นตอนในโซ่
                  </Typography>
                )}
              </Box>
              <Box sx={{ 
                display: "flex", 
                gap: { xs: 1, sm: 2 },
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                width: { xs: '100%', sm: 'auto' }
              }}>
                <Button 
                  variant="outlined" 
                  onClick={() => router.push("/police-personnel/promotion")} 
                  disabled={saving}
                  fullWidth={isMobile}
                  sx={{ 
                    minHeight: { xs: '44px', sm: 'auto' },
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }}
                >
                  ยกเลิก
                </Button>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size={isMobile ? 'medium' : 'large'}
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />} 
                  onClick={handleSave} 
                  disabled={!isChainValid || saving || nodes.length === 0}
                  fullWidth={isMobile}
                  sx={{ 
                    minHeight: { xs: '48px', sm: 'auto' },
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </Button>
              </Box>
            </Paper>
          </>
        )}
      </Box>
    </Layout>
  );
}
