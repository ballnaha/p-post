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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from "@mui/icons-material";
import Layout from "@/app/components/Layout";
import PromotionChainBuilder from "@/app/police-personnel/promotion-chain/create/components/PromotionChainBuilder";
import { useToast } from "@/hooks/useToast";

// Minimal types aligned with builder
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
  actingAs?: string;
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

interface VacantPosition {
  id: string;
  posCodeId: number;
  posCodeName?: string;
  position: string;
  unit: string;
  positionNumber?: string;
  actingAs?: string;
}

interface SwapDetailApi {
  id: string;
  sequence?: number | null;
  personnelId?: string | null;
  noId?: string | null;
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

export default function EditPromotionChainPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<TransactionApi | null>(null);
  const [vacantPosition, setVacantPosition] = useState<VacantPosition | null>(null);
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

        const mappedNodes: ChainNode[] = sorted.map((d, index, arr) => {
          const fromRank = d.posCodeId ?? 0;
          const prevFromRank = index > 0 ? (arr[index - 1].posCodeId ?? fromRank) : fromRank;
          return {
            id: `node-${d.id}`,
            nodeOrder: d.sequence ?? index + 1,
            personnelId: d.personnelId ?? undefined,
            noId: d.noId ? parseInt(d.noId) : undefined,
            nationalId: d.nationalId ?? "",
            fullName: d.fullName,
            rank: d.rank ?? "",
            seniority: d.seniority ?? undefined,
            // Personal information
            birthDate: d.birthDate ?? undefined,
            age: d.age ?? undefined,
            education: d.education ?? undefined,
            // Appointment information
            lastAppointment: d.lastAppointment ?? undefined,
            currentRankSince: d.currentRankSince ?? undefined,
            enrollmentDate: d.enrollmentDate ?? undefined,
            retirementDate: d.retirementDate ?? undefined,
            yearsOfService: d.yearsOfService ?? undefined,
            // Training information
            trainingLocation: d.trainingLocation ?? undefined,
            trainingCourse: d.trainingCourse ?? undefined,
            // Support information
            supporterName: d.supportName ?? undefined,
            supportReason: d.supportReason ?? undefined,
            // Notes
            notes: d.notes ?? undefined,
            fromPosCodeId: d.posCodeId ?? 0,
            fromPosCodeName: d.posCodeMaster?.name ?? undefined,
            fromPosition: d.fromPosition ?? "",
            fromPositionNumber: d.fromPositionNumber ?? undefined,
            fromUnit: d.fromUnit ?? "",
            actingAs: d.fromActingAs ?? undefined,
            toPosCodeId: d.toPosCodeId ?? 0,
            toPosCodeName: d.toPosCodeMaster?.name ?? undefined,
            toPosition: d.toPosition ?? "",
            toPositionNumber: d.toPositionNumber ?? undefined,
            toUnit: d.toUnit ?? "",
            toActingAs: d.toActingAs ?? undefined,
            fromRankLevel: fromRank,
            toRankLevel: prevFromRank,
            isPromotionValid: true,
          };
        });

        setNodes(mappedNodes);

        // Synthesize a vacant position from the first detail's target
        const first = mappedNodes[0];
        setVacantPosition(first ? {
          id: "from-transaction",
          posCodeId: 0,
          posCodeName: undefined,
          position: first.toPosition || "-",
          unit: first.toUnit || "-",
          positionNumber: first.toPositionNumber,
          actingAs: first.toActingAs,
        } : null);

        setTransaction(t);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        router.push("/police-personnel/promotion-chain");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const isChainValid = useMemo(() => nodes.length > 0 && nodes.every(n => n.isPromotionValid), [nodes]);

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
        // Personal information
        birthDate: node.birthDate,
        age: node.age,
        education: node.education,
        // Appointment information
        lastAppointment: node.lastAppointment,
        currentRankSince: node.currentRankSince,
        enrollmentDate: node.enrollmentDate,
        retirementDate: node.retirementDate,
        yearsOfService: node.yearsOfService,
        // Training information
        trainingLocation: node.trainingLocation,
        trainingCourse: node.trainingCourse,
        // Support information
        supportName: node.supporterName,
        supportReason: node.supportReason,
        // Position information
        fromPosition: node.fromPosition,
        fromPositionNumber: node.fromPositionNumber,
        fromUnit: node.fromUnit,
        fromActingAs: node.actingAs,
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
        notes: transaction.notes,
        swapDetails,
      };

      const res = await fetch(`/api/swap-transactions/${transaction.id}` , {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.error || "บันทึกไม่สำเร็จ");
      toast.success("บันทึกการแก้ไขสำเร็จ");
      router.push("/police-personnel/promotion-chain");
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
                แก้ไขการจัดคนเข้าตำแหน่งว่าง
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ใช้รูปแบบเดียวกับหน้าเพิ่มรายการ ปรับขั้นตอนและบันทึกอีกครั้ง
              </Typography>

              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">กำลังโหลด...</Typography>
                </Box>
              ) : vacantPosition && (
                <Box sx={{ p: 1.5, bgcolor: "primary.50", borderRadius: 1, borderLeft: "3px solid", borderColor: "primary.main" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                      🎯 ตำแหน่งว่างต้นทาง (แก้ไข)
                    </Typography>
                    {transaction?.groupNumber && (
                      <Chip label={transaction.groupNumber} size="small" color="primary" sx={{ height: 28 }} />
                    )}
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {vacantPosition.posCodeName ? `${vacantPosition.posCodeName} • ` : ""}{vacantPosition.position}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.85rem" }}>
                    • {vacantPosition.unit} • เลขตำแหน่ง {vacantPosition.positionNumber || "-"} • ทำหน้าที่: {vacantPosition.actingAs || "-"}
                  </Typography>
                </Box>
              )}
            </Box>

            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push("/police-personnel/promotion-chain")}
              sx={{ flexShrink: 0 }}
            >
              ย้อนกลับ
            </Button>
          </Box>
        </Paper>

        {!loading && (
          <>
            <Box sx={{ pb: 12 }}>
              <PromotionChainBuilder
                vacantPosition={vacantPosition}
                nodes={nodes}
                onAddNode={(n) => setNodes([...nodes, n])}
                onRemoveNode={(id) => setNodes(nodes.filter((x) => x.id !== id))}
                excludeTransactionId={id}
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
                  onClick={() => router.push("/police-personnel/promotion-chain")} 
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
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    fontWeight: 600
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
