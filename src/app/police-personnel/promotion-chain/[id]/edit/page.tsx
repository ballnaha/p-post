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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { 
  ArrowBack as ArrowBackIcon, 
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import Layout from "@/app/components/Layout";
import PromotionChainTable from "@/app/police-personnel/promotion-chain/create/components/PromotionChainTable";
import { useToast } from "@/hooks/useToast";

// Minimal types aligned with builder
interface ChainNode {
  id: string;
  nodeOrder: number;
  isPlaceholder?: boolean; // true = ตำแหน่งว่าง
  personnelId?: string;
  noId?: number;
  nationalId?: string; // เปลี่ยนเป็น optional
  fullName: string;
  rank?: string; // เปลี่ยนเป็น optional
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
  isPlaceholder?: boolean | null;
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
  isCompleted?: boolean;
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
  const [completing, setCompleting] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showUncompleteDialog, setShowUncompleteDialog] = useState(false);
  const [transaction, setTransaction] = useState<TransactionApi | null>(null);
  const [groupNotes, setGroupNotes] = useState<string>(''); // หมายเหตุของกลุ่ม
  const [vacantPosition, setVacantPosition] = useState<VacantPosition | null>(null);
  const [nodes, setNodes] = useState<ChainNode[]>([]);

  const isChainValid = useMemo(() => {
    if (nodes.length === 0) return false;
    const validNodes = nodes.filter(n => !n.isPlaceholder);
    if (validNodes.length === 0) return false;
    return validNodes.every(n => n.isPromotionValid);
  }, [nodes]);
  
  const hasPlaceholder = useMemo(() => nodes.some(n => n.isPlaceholder), [nodes]);

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
          // ตรวจสอบว่าเป็น placeholder หรือไม่
          // 1. ถ้ามี field isPlaceholder ให้ใช้ค่านั้น
          // 2. ถ้าไม่มี ให้ตรวจสอบจาก personnelId และ nationalId
          const isPlaceholder = d.isPlaceholder === true || 
            (!d.personnelId || !d.nationalId || 
             (typeof d.personnelId === 'string' && d.personnelId.trim() === '') || 
             (typeof d.nationalId === 'string' && d.nationalId.trim() === ''));
          return {
            id: `node-${d.id}`,
            nodeOrder: d.sequence ?? index + 1,
            isPlaceholder,
            personnelId: d.personnelId ?? undefined,
            noId: d.noId ? parseInt(d.noId) : undefined,
            nationalId: d.nationalId ?? undefined,
            fullName: d.fullName,
            rank: d.rank ?? undefined,
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
            fromActingAs: d.fromActingAs ?? undefined,
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
        
        // ถ้าไม่มี toPosCodeName ให้ลองค้นหาจากชื่อตำแหน่ง
        let posCodeName = first?.toPosCodeName;
        let posCodeId = first?.toPosCodeId || 0;
        
        if (!posCodeName && first?.toPosition) {
          try {
            const findPosCodeRes = await fetch(
              `/api/pos-code/find-by-position?position=${encodeURIComponent(first.toPosition)}`
            );
            if (findPosCodeRes.ok) {
              const findPosCodeData = await findPosCodeRes.json();
              if (findPosCodeData?.success && findPosCodeData?.data) {
                posCodeName = findPosCodeData.data.name;
                posCodeId = findPosCodeData.data.id;
              }
            }
          } catch (e) {
            console.warn('Could not find pos code name from position:', e);
          }
        }
        
        setVacantPosition(first ? {
          id: "from-transaction",
          posCodeId: posCodeId,
          posCodeName: posCodeName || undefined,
          position: first.toPosition || "-",
          unit: first.toUnit || "-",
          positionNumber: first.toPositionNumber,
          actingAs: first.toActingAs,
        } : null);

        setTransaction(t);
        setGroupNotes(t.notes || ''); // ตั้งค่าหมายเหตุเริ่มต้น
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        router.push("/police-personnel/promotion-chain");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddPlaceholder = () => {
    const placeholderNode: ChainNode = {
      id: `placeholder-${Date.now()}`,
      nodeOrder: nodes.length + 1,
      isPlaceholder: true,
      fullName: '[รอการเลือกบุคลากร]',
      fromPosCodeId: 0,
      fromPosition: '',
      fromUnit: '',
      toPosCodeId: nodes.length === 0 ? vacantPosition?.posCodeId || 0 : nodes[nodes.length - 1].fromPosCodeId,
      toPosCodeName: nodes.length === 0 ? vacantPosition?.posCodeName : nodes[nodes.length - 1].fromPosCodeName,
      toPosition: nodes.length === 0 ? vacantPosition?.position || '' : nodes[nodes.length - 1].fromPosition,
      toPositionNumber: nodes.length === 0 ? vacantPosition?.positionNumber : nodes[nodes.length - 1].fromPositionNumber,
      toUnit: nodes.length === 0 ? vacantPosition?.unit || '' : nodes[nodes.length - 1].fromUnit,
      toActingAs: nodes.length === 0 ? vacantPosition?.actingAs : nodes[nodes.length - 1].fromActingAs,
      fromRankLevel: 0,
      toRankLevel: nodes.length === 0 ? (vacantPosition?.posCodeId || 0) : nodes[nodes.length - 1].fromRankLevel,
      isPromotionValid: false,
    };
    setNodes([...nodes, placeholderNode]);
    toast.info('เพิ่มตำแหน่งว่างแล้ว');
  };

  const handleInsertPlaceholder = (beforeNodeId: string) => {
    const insertIndex = nodes.findIndex(n => n.id === beforeNodeId);
    if (insertIndex === -1) return;

    const targetNode = nodes[insertIndex];
    const placeholderNode: ChainNode = {
      id: `placeholder-${Date.now()}`,
      nodeOrder: targetNode.nodeOrder,
      isPlaceholder: true,
      fullName: '[รอการเลือกบุคลากร]',
      fromPosCodeId: 0,
      fromPosition: '',
      fromUnit: '',
      toPosCodeId: targetNode.toPosCodeId,
      toPosCodeName: targetNode.toPosCodeName,
      toPosition: targetNode.toPosition,
      toPositionNumber: targetNode.toPositionNumber,
      toUnit: targetNode.toUnit,
      toActingAs: targetNode.toActingAs,
      fromRankLevel: 0,
      toRankLevel: targetNode.toRankLevel,
      isPromotionValid: false,
    };

    const newNodes = [...nodes];
    newNodes.splice(insertIndex, 0, placeholderNode);

    const reorderedNodes = newNodes.map((node, index) => {
      if (index === 0) {
        return {
          ...node,
          nodeOrder: 1,
          toPosCodeId: vacantPosition?.posCodeId || node.toPosCodeId,
          toPosCodeName: vacantPosition?.posCodeName || node.toPosCodeName,
          toPosition: vacantPosition?.position || node.toPosition,
          toPositionNumber: vacantPosition?.positionNumber || node.toPositionNumber,
          toUnit: vacantPosition?.unit || node.toUnit,
          toActingAs: vacantPosition?.actingAs || node.toActingAs,
        };
      } else {
        const prevNode = newNodes[index - 1];
        
        // ถ้า prevNode เป็น placeholder → node นี้ควรมีตำแหน่งว่าง เพราะ placeholder ยังไม่มีบุคคลมารับตำแหน่ง
        if (prevNode.isPlaceholder) {
          return {
            ...node,
            nodeOrder: index + 1,
            // ให้ตำแหน่งเป็นค่าว่าง
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPosition: '',
            toPositionNumber: undefined,
            toUnit: '',
            toActingAs: undefined,
            toRankLevel: 0,
          };
        }
        
        return {
          ...node,
          nodeOrder: index + 1,
          toPosCodeId: prevNode.fromPosCodeId,
          toPosCodeName: prevNode.fromPosCodeName,
          toPosition: prevNode.fromPosition,
          toPositionNumber: prevNode.fromPositionNumber,
          toUnit: prevNode.fromUnit,
          toActingAs: prevNode.fromActingAs,
          toRankLevel: prevNode.fromRankLevel,
        };
      }
    });

    setNodes(reorderedNodes);
    toast.info(`แทรกตำแหน่งว่างก่อน ${targetNode.fullName} สำเร็จ`);
  };

  const handleRemoveNode = (nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const removedNode = nodes[nodeIndex];

    // ลบโหนด
    const newNodes = nodes.filter(n => n.id !== nodeId);

    // ถ้าไม่มีโหนดเหลือ ให้ clear ทั้งหมด
    if (newNodes.length === 0) {
      setNodes([]);
      toast.success('ลบตำแหน่งสำเร็จ');
      return;
    }

    // ปรับ nodeOrder และตำแหน่งที่เกี่ยวข้อง
    const reorderedNodes = newNodes.map((node, index) => {
      // กรณีที่ 1: โหนดก่อนหน้าโหนดที่ถูกลบ - ไม่เปลี่ยนแปลง (เว้นแต่ nodeOrder)
      if (index < nodeIndex) {
        return {
          ...node,
          nodeOrder: index + 1,
        };
      }
      
      // กรณีที่ 2: โหนดหลังจากโหนดที่ถูกลบ - ต้องอัปเดตตำแหน่ง to
      if (index === 0) {
        // โหนดแรกใหม่ (หลังจากลบโหนดแรกเดิม) 
        // ต้องอัปเดต toPosition ให้เป็นตำแหน่งว่างต้นทาง (vacantPosition)
        if (nodeIndex === 0 && vacantPosition) {
          // ถ้าลบโหนดแรก node ที่ 2 จะกลายเป็น node แรก และได้รับตำแหน่งว่างต้นทาง
          return {
            ...node,
            nodeOrder: 1,
            toPosCodeId: vacantPosition.posCodeId || removedNode.toPosCodeId,
            toPosCodeName: vacantPosition.posCodeName || removedNode.toPosCodeName,
            toPosition: vacantPosition.position || removedNode.toPosition,
            toPositionNumber: vacantPosition.positionNumber || removedNode.toPositionNumber,
            toUnit: vacantPosition.unit || removedNode.toUnit,
            toActingAs: vacantPosition.actingAs || removedNode.toActingAs,
            toRankLevel: removedNode.toRankLevel,
          };
        }
        return {
          ...node,
          nodeOrder: 1,
        };
      } else {
        // โหนดที่เหลือ - อัปเดต toPosition ให้เชื่อมกับ fromPosition ของโหนดก่อนหน้า
        const prevNode = newNodes[index - 1];
        return {
          ...node,
          nodeOrder: index + 1,
          toPosCodeId: prevNode.fromPosCodeId,
          toPosCodeName: prevNode.fromPosCodeName,
          toPosition: prevNode.fromPosition,
          toPositionNumber: prevNode.fromPositionNumber,
          toUnit: prevNode.fromUnit,
          toActingAs: prevNode.fromActingAs,
          toRankLevel: prevNode.fromRankLevel,
        };
      }
    });

    setNodes(reorderedNodes);
    
    // แสดงข้อความที่มีรายละเอียดมากขึ้น
    if (nodeIndex < nodes.length - 1) {
      const nextNode = nodes[nodeIndex + 1];
      toast.success(
        `ลบตำแหน่งสำเร็จ - ${nextNode.fullName} จะได้รับตำแหน่งใหม่: ${removedNode.toPosition}`
      );
    } else {
      toast.success('ลบตำแหน่งสำเร็จ');
    }
  };

  // Handle insert node before a specific node
  const handleInsertNode = (newNode: ChainNode, beforeNodeId: string) => {
    const targetIndex = nodes.findIndex(n => n.id === beforeNodeId);
    if (targetIndex === -1) {
      toast.error('ไม่พบตำแหน่งที่ต้องการแทรก');
      return;
    }

    const targetNode = nodes[targetIndex];

    // ถ้า targetNode เป็น placeholder ให้แทนที่แทนการแทรก
    if (targetNode.isPlaceholder) {
      const newNodes = [...nodes];
      newNodes[targetIndex] = {
        ...newNode,
        nodeOrder: targetNode.nodeOrder,
        isPlaceholder: false,
        toPosCodeId: targetNode.toPosCodeId,
        toPosCodeName: targetNode.toPosCodeName,
        toPosition: targetNode.toPosition,
        toPositionNumber: targetNode.toPositionNumber,
        toUnit: targetNode.toUnit,
        toActingAs: targetNode.toActingAs,
        toRankLevel: targetNode.toRankLevel,
      };

      // อัปเดต toPosition ของโหนดถัดไป
      const reorderedNodes = newNodes.map((node, index) => {
        if (index === 0) {
          return {
            ...node,
            nodeOrder: 1,
            toPosCodeId: vacantPosition?.posCodeId || node.toPosCodeId,
            toPosCodeName: vacantPosition?.posCodeName || node.toPosCodeName,
            toPosition: vacantPosition?.position || node.toPosition,
            toPositionNumber: vacantPosition?.positionNumber || node.toPositionNumber,
            toUnit: vacantPosition?.unit || node.toUnit,
            toActingAs: vacantPosition?.actingAs || node.toActingAs,
          };
        } else {
          const prevNode = newNodes[index - 1];
          return {
            ...node,
            nodeOrder: index + 1,
            toPosCodeId: prevNode.fromPosCodeId,
            toPosCodeName: prevNode.fromPosCodeName,
            toPosition: prevNode.fromPosition,
            toPositionNumber: prevNode.fromPositionNumber,
            toUnit: prevNode.fromUnit,
            toActingAs: prevNode.fromActingAs,
            toRankLevel: prevNode.fromRankLevel,
          };
        }
      });

      setNodes(reorderedNodes);
      toast.success(`เลือก ${newNode.fullName} สำเร็จ`);
      return;
    }

    // แทรกโหนดใหม่ก่อนตำแหน่งที่เลือก (กรณีปกติ)
    const newNodes = [...nodes];
    newNodes.splice(targetIndex, 0, newNode);

    // ปรับ nodeOrder และตำแหน่งที่เกี่ยวข้อง
    const reorderedNodes = newNodes.map((node, index) => {
      if (index < targetIndex) {
        // โหนดก่อนหน้า - ไม่เปลี่ยนแปลง
        return node;
      } else if (index === targetIndex) {
        // โหนดใหม่ที่แทรก
        // ตำแหน่ง to ของโหนดใหม่จะเป็นตำแหน่ง to ของโหนดที่มันแทรกเข้าไป
        return {
          ...node,
          nodeOrder: index + 1,
        };
      } else {
        // โหนดถัดไป - ปรับ nodeOrder และปรับตำแหน่ง to ให้เชื่อมกับโหนดก่อนหน้า
        const prevNode = newNodes[index - 1];
        return {
          ...node,
          nodeOrder: index + 1,
          toPosCodeId: prevNode.fromPosCodeId,
          toPosCodeName: prevNode.fromPosCodeName,
          toPosition: prevNode.fromPosition,
          toPositionNumber: prevNode.fromPositionNumber,
          toUnit: prevNode.fromUnit,
          toActingAs: prevNode.fromActingAs,
          toRankLevel: prevNode.fromRankLevel,
        };
      }
    });

    setNodes(reorderedNodes);
    toast.success('แทรกตำแหน่งใหม่สำเร็จ');
  };

  const handleComplete = async () => {
    setShowCompleteDialog(false);
    setCompleting(true);
    try {
      if (!transaction) return;

      // ตรวจสอบว่าไม่มี placeholder
      const hasPlaceholder = nodes.some(n => n.isPlaceholder);
      if (hasPlaceholder) {
        toast.error('ไม่สามารถสิ้นสุดได้เนื่องจากมีตำแหน่งว่าง กรุณาเลือกบุคลากรให้ครบก่อน');
        return;
      }

      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        toast.error('ต้องมีบุคลากรอย่างน้อย 1 คน');
        return;
      }

      const swapDetails = nodes.map((node) => ({
        sequence: node.nodeOrder,
        isPlaceholder: node.isPlaceholder || false,
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
        fromActingAs: node.fromActingAs || node.actingAs,
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
        status: 'completed',
        isCompleted: true, // สิ้นสุดแล้ว
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

      toast.success("บันทึกและสิ้นสุดรายการสำเร็จ");
      
      // Reload ข้อมูลแทนการ redirect
      const reloadRes = await fetch(`/api/swap-transactions/${transaction.id}`);
      const reloadJson = await reloadRes.json();
      if (reloadRes.ok && reloadJson?.data) {
        const t: TransactionApi = reloadJson.data;
        setTransaction(t);
        
        // Map details → nodes อีกครั้ง
        const sorted = [...(t.swapDetails || [])].sort((a, b) => {
          const sa = a.sequence ?? 9999;
          const sb = b.sequence ?? 9999;
          if (sa !== sb) return sa - sb;
          return (a.fullName || "").localeCompare(b.fullName || "");
        });

        const mappedNodes: ChainNode[] = sorted.map((d, index, arr) => {
          const fromRank = d.posCodeId ?? 0;
          const prevFromRank = index > 0 ? (arr[index - 1].posCodeId ?? fromRank) : fromRank;
          const isPlaceholder = d.isPlaceholder === true || 
            (!d.personnelId || !d.nationalId || 
             (typeof d.personnelId === 'string' && d.personnelId.trim() === '') || 
             (typeof d.nationalId === 'string' && d.nationalId.trim() === ''));
          
          return {
            id: `node-${d.id}`,
            nodeOrder: d.sequence ?? index + 1,
            isPlaceholder,
            personnelId: d.personnelId ?? undefined,
            noId: d.noId ? parseInt(d.noId) : undefined,
            nationalId: d.nationalId ?? undefined,
            fullName: d.fullName,
            rank: d.rank ?? undefined,
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
            actingAs: d.fromActingAs ?? undefined,
            fromActingAs: d.fromActingAs ?? undefined,
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
        setGroupNotes(t.notes || '');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setCompleting(false);
    }
  };

  const handleUncomplete = async () => {
    if (!transaction) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/swap-transactions/${transaction.id}/complete`, {
        method: 'DELETE',
      });
      const json = await res.json();
      
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || 'ยกเลิกการทำเครื่องหมายไม่สำเร็จ');
      }

      toast.success('ยกเลิกการทำเครื่องหมายเสร็จสิ้นแล้ว');
      
      // Reload ข้อมูล
      const reloadRes = await fetch(`/api/swap-transactions/${transaction.id}`);
      const reloadJson = await reloadRes.json();
      if (reloadRes.ok && reloadJson?.data) {
        setTransaction(reloadJson.data);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setCompleting(false);
    }
  };

  const handleSave = async () => {
    if (!transaction) return;
    setSaving(true);
    try {
      // ตรวจสอบว่ามีโหนดที่ไม่ใช่ placeholder อย่างน้อย 1 โหนด
      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        toast.error('ต้องมีบุคลากรอย่างน้อย 1 คน');
        setSaving(false);
        return;
      }

      const placeholderCount = nodes.filter(n => n.isPlaceholder).length;
      if (placeholderCount > 0) {
        toast.info(`บันทึก ${validNodes.length} คน + ${placeholderCount} ตำแหน่งว่าง (รอจัดคน)`);
      }

      const swapDetails = nodes.map((node) => ({
        sequence: node.nodeOrder,
        isPlaceholder: node.isPlaceholder || false,
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
        fromActingAs: node.fromActingAs || node.actingAs,
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

      const res = await fetch(`/api/swap-transactions/${transaction.id}` , {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.error || "บันทึกไม่สำเร็จ");
      
      toast.success("บันทึกการแก้ไขสำเร็จ");
      
      // Reload ข้อมูลใหม่แทนการ redirect
      const reloadRes = await fetch(`/api/swap-transactions/${transaction.id}`);
      const reloadJson = await reloadRes.json();
      if (reloadRes.ok && reloadJson?.data) {
        const t: TransactionApi = reloadJson.data;
        setTransaction(t);
        
        // Map details → nodes อีกครั้ง
        const sorted = [...(t.swapDetails || [])].sort((a, b) => {
          const sa = a.sequence ?? 9999;
          const sb = b.sequence ?? 9999;
          if (sa !== sb) return sa - sb;
          return (a.fullName || "").localeCompare(b.fullName || "");
        });

        const mappedNodes: ChainNode[] = sorted.map((d, index, arr) => {
          const fromRank = d.posCodeId ?? 0;
          const prevFromRank = index > 0 ? (arr[index - 1].posCodeId ?? fromRank) : fromRank;
          // ตรวจสอบว่าเป็น placeholder หรือไม่
          const isPlaceholder = d.isPlaceholder === true || 
            (!d.personnelId || !d.nationalId || 
             (typeof d.personnelId === 'string' && d.personnelId.trim() === '') || 
             (typeof d.nationalId === 'string' && d.nationalId.trim() === ''));
          
          return {
            id: `node-${d.id}`,
            nodeOrder: d.sequence ?? index + 1,
            isPlaceholder,
            personnelId: d.personnelId ?? undefined,
            noId: d.noId ? parseInt(d.noId) : undefined,
            nationalId: d.nationalId ?? undefined,
            fullName: d.fullName,
            rank: d.rank ?? undefined,
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
            actingAs: d.fromActingAs ?? undefined,
            fromActingAs: d.fromActingAs ?? undefined,
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
        
        // อัปเดต vacantPosition จาก node แรกที่ reload มา
        const first = mappedNodes[0];
        
        // ถ้าไม่มี toPosCodeName ให้ลองค้นหาจากชื่อตำแหน่ง
        let posCodeName = first?.toPosCodeName;
        let posCodeId = first?.toPosCodeId || 0;
        
        if (!posCodeName && first?.toPosition) {
          try {
            const findPosCodeRes = await fetch(
              `/api/pos-code/find-by-position?position=${encodeURIComponent(first.toPosition)}`
            );
            if (findPosCodeRes.ok) {
              const findPosCodeData = await findPosCodeRes.json();
              if (findPosCodeData?.success && findPosCodeData?.data) {
                posCodeName = findPosCodeData.data.name;
                posCodeId = findPosCodeData.data.id;
              }
            }
          } catch (e) {
            console.warn('Could not find pos code name from position:', e);
          }
        }
        
        setVacantPosition(first ? {
          id: "from-transaction",
          posCodeId: posCodeId,
          posCodeName: posCodeName || undefined,
          position: first.toPosition || "-",
          unit: first.toUnit || "-",
          positionNumber: first.toPositionNumber,
          actingAs: first.toActingAs,
        } : null);
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
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                      🎯 ตำแหน่งว่างต้นทาง (แก้ไข)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {transaction?.isCompleted && (
                        <Chip 
                          label="✓ เสร็จสิ้น" 
                          size="small" 
                          color="success" 
                          sx={{ height: 28, fontWeight: 600 }} 
                        />
                      )}
                      {transaction?.groupNumber && (
                        <Chip label={transaction.groupNumber} size="small" color="primary" sx={{ height: 28 }} />
                      )}
                    </Box>
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

          {/* หมายเหตุกลุ่ม */}
          {!loading && vacantPosition && (
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
            <Box sx={{ pb: 12 }}>
              <PromotionChainTable
                vacantPosition={vacantPosition}
                nodes={nodes}
                onAddNode={(n: ChainNode) => setNodes([...nodes, n])}
                onRemoveNode={handleRemoveNode}
                onInsertNode={handleInsertNode}
                onAddPlaceholder={handleAddPlaceholder}
                onInsertPlaceholder={handleInsertPlaceholder}
                isCompleted={transaction?.isCompleted || false}
                onReorder={(reorderedNodes: ChainNode[]) => {
                  // อัปเดต nodeOrder และตำแหน่ง to ของแต่ละ node
                  // fromPosCodeId และ fromPosCodeName ไม่เปลี่ยนแปลง เพราะเป็นตำแหน่งปัจจุบันของบุคลากร
                  const updatedNodes = reorderedNodes.map((node, index) => {
                    if (index === 0) {
                      // โหนดแรก - ตำแหน่ง to ต้องเป็นตำแหน่งว่างต้นทาง (บังคับใช้ vacantPosition)
                      return {
                        ...node,
                        nodeOrder: index + 1,
                        toPosCodeId: vacantPosition?.posCodeId ?? 0,
                        toPosCodeName: vacantPosition?.posCodeName ?? undefined,
                        toPosition: vacantPosition?.position ?? "",
                        toPositionNumber: vacantPosition?.positionNumber ?? undefined,
                        toUnit: vacantPosition?.unit ?? "",
                        toActingAs: vacantPosition?.actingAs ?? undefined,
                      };
                    } else {
                      // โหนดถัดไป - ตำแหน่ง to ต้องเป็นตำแหน่ง from ของโหนดก่อนหน้า
                      const prevNode = reorderedNodes[index - 1];
                      return {
                        ...node,
                        nodeOrder: index + 1,
                        toPosCodeId: prevNode.fromPosCodeId,
                        toPosCodeName: prevNode.fromPosCodeName,
                        toPosition: prevNode.fromPosition,
                        toPositionNumber: prevNode.fromPositionNumber,
                        toUnit: prevNode.fromUnit,
                        toActingAs: prevNode.fromActingAs || prevNode.actingAs,
                        toRankLevel: prevNode.fromRankLevel,
                      };
                    }
                  });
                  setNodes(updatedNodes);
                }}
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
                      {isChainValid ? (hasPlaceholder ? '✓ พร้อมบันทึก (มีตำแหน่งว่าง)' : '✓ พร้อมบันทึก') : '⚠ ยังไม่สมบูรณ์'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                      {nodes.filter(n => !n.isPlaceholder).length} บุคลากร
                      {hasPlaceholder && ` • ${nodes.filter(n => n.isPlaceholder).length} ตำแหน่งว่าง (จะถูกข้าม)`}
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
                  disabled={saving || completing}
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
                  disabled={!isChainValid || saving || completing || nodes.length === 0}
                  fullWidth={isMobile}
                  sx={{ 
                    minHeight: { xs: '48px', sm: 'auto' },
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    fontWeight: 600
                  }}
                >
                  {saving ? "กำลังบันทึก..." : hasPlaceholder ? 'บันทึก' : "บันทึกการแก้ไข"}
                </Button>

                                {/* ปุ่มสิ้นสุด - แสดงเฉพาะเมื่อไม่มี placeholder */}
                {!hasPlaceholder && !transaction?.isCompleted && nodes.length > 0 && (
                  <Button 
                    variant="outlined" 
                    color="success"
                    size={isMobile ? 'medium' : 'large'}
                    startIcon={completing ? <CircularProgress size={20} /> : <CheckIcon />} 
                    onClick={() => setShowCompleteDialog(true)} 
                    disabled={!isChainValid || saving || completing || nodes.length === 0}
                    fullWidth={isMobile}
                    sx={{ 
                      minHeight: { xs: '48px', sm: 'auto' },
                      fontSize: { xs: '0.875rem', md: '1rem' },
                      fontWeight: 600
                    }}
                  >
                    {completing ? 'กำลังบันทึก...' : 'บันทึกและสิ้นสุด'}
                  </Button>
                )}

                {/* ปุ่มยกเลิกการเสร็จสิ้น - แสดงเฉพาะเมื่อทำเครื่องหมายเสร็จสิ้นแล้ว */}
                {transaction?.isCompleted && (
                  <Button 
                    variant="outlined" 
                    color="warning"
                    size={isMobile ? 'medium' : 'large'}
                    startIcon={<CancelIcon />} 
                    onClick={handleUncomplete} 
                    disabled={saving || completing}
                    fullWidth={isMobile}
                    sx={{ 
                      minHeight: { xs: '44px', sm: 'auto' },
                      fontSize: { xs: '0.875rem', md: '1rem' },
                    }}
                  >
                    {completing ? 'กำลังยกเลิก...' : 'ยกเลิกการเสร็จสิ้น'}
                  </Button>
                )}

              </Box>
            </Paper>

            {/* Complete Confirmation Dialog */}
            <Dialog
              open={showCompleteDialog}
              onClose={() => !completing && setShowCompleteDialog(false)}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }
              }}
            >
              <DialogTitle sx={{ 
                pb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: 'success.50',
                borderBottom: '2px solid',
                borderColor: 'success.main',
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  color: 'white',
                }}>
                  <CheckCircleIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.dark' }}>
                    ยืนยันการสิ้นสุดรายการ
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    กรุณาตรวจสอบข้อมูลก่อนดำเนินการ
                  </Typography>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ pt: 3, pb: 2 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 500, mt: 1 }}>
                    คุณต้องการสิ้นสุดรายการนี้ใช่หรือไม่?
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="ตำแหน่งว่าง" size="small" color="primary" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {vacantPosition?.posCodeName || ''} • {vacantPosition?.position || ''}
                          {vacantPosition?.positionNumber && ` (${vacantPosition.positionNumber})`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="จำนวนบุคลากร" size="small" color="success" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {nodes.filter(n => !n.isPlaceholder).length} คน
                        </Typography>
                      </Box>
                      {transaction?.groupNumber && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label="เลขกลุ่ม" size="small" color="default" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {transaction.groupNumber}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                </Box>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'info.50', 
                  borderRadius: 1,
                  borderLeft: '4px solid',
                  borderColor: 'info.main',
                }}>
                  <Typography variant="body2" sx={{ color: 'info.dark', fontWeight: 500 }}>
                    💡 เมื่อสิ้นสุดแล้ว รายการนี้จะถูกบันทึกและทำเครื่องหมายว่าเสร็จสมบูรณ์
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                <Button
                  onClick={() => setShowCompleteDialog(false)}
                  disabled={completing}
                  variant="outlined"
                  sx={{ minWidth: 100 }}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  variant="contained"
                  color="success"
                  startIcon={completing ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                  sx={{ minWidth: 120, fontWeight: 600 }}
                >
                  {completing ? 'กำลังบันทึก...' : 'ยืนยันสิ้นสุด'}
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    </Layout>
  );
}
