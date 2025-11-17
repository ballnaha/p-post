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
  Autocomplete,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from "@mui/icons-material";
import Layout from "@/app/components/Layout";
import PromotionTable from "@/app/police-personnel/promotion/create/components/PromotionTable";
import { useToast } from "@/hooks/useToast";

// Types aligned with promotion builder
interface ChainNode {
  id: string;
  nodeOrder: number;
  isPlaceholder?: boolean; // true = ตำแหน่งว่าง (ยังไม่ได้เลือกบุคลากร)
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
  const [unitName, setUnitName] = useState<string>('');
  const [unitDescription, setUnitDescription] = useState<string>('');
  const [unitOptions, setUnitOptions] = useState<string[]>([]);

  // Fetch unique units from police_personnel
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await fetch('/api/in-out?filtersOnly=true');
        if (!response.ok) throw new Error('Failed to fetch filters');
        const result = await response.json();
        
        if (result.success && result.data.filters) {
          const units = result.data.filters.units || [];
          setUnitOptions(units);
        } else {
          setUnitOptions([]);
        }
      } catch (e) {
        console.error('Failed to fetch units:', e);
        setUnitOptions([]);
      }
    };
    fetchUnits();
  }, []);

  // อัพเดท toUnit ของ node แรกเมื่อเปลี่ยนหน่วยปลายทาง
  useEffect(() => {
    if (nodes.length > 0 && unitName) {
      const updatedNodes = nodes.map((node, index) => {
        if (index === 0) {
          return {
            ...node,
            toUnit: unitName,
          };
        }
        return node;
      });
      setNodes(updatedNodes);
    }
  }, [unitName]);

  // อัพเดท groupName เมื่อเปลี่ยนหน่วยปลายทาง
  useEffect(() => {
    if (transaction && unitName && transaction.groupName !== `ย้ายหน่วยงาน → ${unitName}`) {
      setTransaction({
        ...transaction,
        groupName: `ย้ายหน่วยงาน → ${unitName}`,
      });
    }
  }, [unitName, transaction]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/swap-transactions/${id}`);
        const json = await res.json();
        if (!res.ok || !json?.data) throw new Error(json?.error || "ไม่พบข้อมูล");
        const t: TransactionApi = json.data;
        
        // Extract destination unit from first node's toUnit
        if (t.swapDetails && t.swapDetails.length > 0) {
          const firstDetail = t.swapDetails.find(d => d.sequence === 1);
          if (firstDetail?.toUnit) {
            setUnitName(firstDetail.toUnit);
          }
        }

        // Map details → nodes
        const sorted = [...(t.swapDetails || [])].sort((a, b) => {
          const sa = a.sequence ?? 9999;
          const sb = b.sequence ?? 9999;
          if (sa !== sb) return sa - sb;
          return (a.fullName || "").localeCompare(b.fullName || "");
        });

        // แยก startingPersonnel (sequence = 0) ออกจาก chain nodes (sequence >= 1)
        const startingDetail = sorted.find(d => d.sequence === 0);
        const chainDetails = sorted.filter(d => d.sequence !== 0);

        const mappedNodes: ChainNode[] = chainDetails.map((d, index) => {
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

        // Get starting personnel from detail with sequence = 0
        if (startingDetail) {
          setStartingPersonnel({
            id: startingDetail.personnelId || "from-transaction",
            noId: startingDetail.noId || undefined,
            posCodeId: startingDetail.posCodeId || 0,
            posCodeName: startingDetail.posCodeMaster?.name || undefined,
            position: startingDetail.fromPosition || "",
            unit: startingDetail.fromUnit || "",
            positionNumber: startingDetail.fromPositionNumber || undefined,
            actingAs: startingDetail.fromActingAs || undefined,
            fullName: startingDetail.fullName || "",
            rank: startingDetail.rank || "",
            nationalId: startingDetail.nationalId || "",
            seniority: startingDetail.seniority || undefined,
          });
        } else {
          // Fallback: ถ้าไม่มี detail sequence = 0 (ข้อมูลเก่า) ให้ดึงจาก node แรก
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
        }

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

  const isChainValid = useMemo(() => {
    if (nodes.length === 0) return false;
    
    // อนุญาตให้บันทึกได้แม้มี placeholder
    // แต่ต้องมีโหนดที่ valid อย่างน้อย 1 โหนด
    const validNodes = nodes.filter(n => !n.isPlaceholder);
    if (validNodes.length === 0) return false;
    
    // เช็คว่าโหนดที่ไม่ใช่ placeholder ทั้งหมด valid หรือไม่
    return validNodes.every((node) => node.isPromotionValid);
  }, [nodes]);

  const handleAddNode = (node: ChainNode) => {
    setNodes([...nodes, node]);
  };

  const handleRemoveNode = (nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const newNodes = nodes.filter(n => n.id !== nodeId);

    if (newNodes.length === 0) {
      setNodes([]);
      toast.success('ลบตำแหน่งสำเร็จ');
      return;
    }

    const reorderedNodes = newNodes.map((node, index) => {
      if (index < nodeIndex) {
        return {
          ...node,
          nodeOrder: index + 1,
        };
      }
      
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง (ไม่มีตำแหน่งเฉพาะ)
        return {
          ...node,
          nodeOrder: 1,
          toPosition: '',
          toUnit: unitName || node.toUnit,
          toPosCodeId: 0,
          toPosCodeName: undefined,
          toPositionNumber: undefined,
          toActingAs: undefined,
        };
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า
        const prevNode = newNodes[index - 1];
        if (prevNode.isPlaceholder) {
          // ถ้า node ก่อนหน้าเป็น placeholder ยังไม่รู้ว่าจะไปไหน
          return {
            ...node,
            nodeOrder: index + 1,
            toPosition: '',
            toUnit: '',
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPositionNumber: undefined,
            toActingAs: undefined,
          };
        } else {
          // Node ก่อนหน้าเป็น node ปกติ
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
      }
    });

    setNodes(reorderedNodes);
    toast.success('ลบตำแหน่งสำเร็จ');
  };

  const handleInsertNode = (newNode: ChainNode, beforeNodeId: string) => {
    const insertIndex = nodes.findIndex(n => n.id === beforeNodeId);
    if (insertIndex === -1) {
      toast.error('ไม่พบตำแหน่งที่ต้องการแทรก');
      return;
    }

    const newNodes = [...nodes];
    newNodes.splice(insertIndex, 0, newNode);

    const reorderedNodes = newNodes.map((node, index) => {
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง (ไม่มีตำแหน่งเฉพาะ)
        return {
          ...node,
          nodeOrder: 1,
          toPosition: '',
          toUnit: unitName || node.toUnit,
          toPosCodeId: 0,
          toPosCodeName: undefined,
          toPositionNumber: undefined,
          toActingAs: undefined,
        };
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า
        const prevNode = newNodes[index - 1];
        if (prevNode.isPlaceholder) {
          // ถ้า node ก่อนหน้าเป็น placeholder ยังไม่รู้ว่าจะไปไหน
          return {
            ...node,
            nodeOrder: index + 1,
            toPosition: '',
            toUnit: '',
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPositionNumber: undefined,
            toActingAs: undefined,
          };
        } else {
          // Node ก่อนหน้าเป็น node ปกติ
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
      }
    });

    setNodes(reorderedNodes);
    toast.success(`แทรก ${newNode.fullName} ก่อน ${nodes[insertIndex].fullName} สำเร็จ`);
  };

  const handleReorder = (reorderedNodes: ChainNode[]) => {
    const updatedNodes = reorderedNodes.map((node, index) => {
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง (ไม่มีตำแหน่งเฉพาะ)
        return {
          ...node,
          nodeOrder: 1,
          toPosition: '',
          toUnit: unitName || node.toUnit,
          toPosCodeId: 0,
          toPosCodeName: undefined,
          toPositionNumber: undefined,
          toActingAs: undefined,
        };
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า (chain)
        const prevNode = reorderedNodes[index - 1];
        if (prevNode.isPlaceholder) {
          // ถ้า node ก่อนหน้าเป็น placeholder ยังไม่รู้ว่าจะไปไหน
          return {
            ...node,
            nodeOrder: index + 1,
            toPosition: '',
            toUnit: '',
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPositionNumber: undefined,
            toActingAs: undefined,
          };
        } else {
          // Node ก่อนหน้าเป็น node ปกติ
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
      }
    });

    setNodes(updatedNodes);
    toast.success('จัดเรียงใหม่สำเร็จ');
  };

  const handleAddPlaceholder = () => {
    const lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
    const isLastNodePlaceholder = lastNode?.isPlaceholder === true;
    
    // สร้าง placeholder node
    const placeholderNode: ChainNode = {
      id: `placeholder-${Date.now()}`,
      nodeOrder: nodes.length + 1,
      isPlaceholder: true,
      fullName: '[รอการเลือกบุคลากร]',
      nationalId: '',
      rank: '',
      
      // ตำแหน่ง from ว่าง (เพราะยังไม่มีบุคคล)
      fromPosCodeId: 0,
      fromPosCodeName: undefined,
      fromPosition: '',
      fromPositionNumber: undefined,
      fromUnit: '',
      fromActingAs: undefined,
      
      // ตำแหน่ง to: ถ้า node ก่อนหน้าเป็น placeholder ให้เป็นค่าว่าง
      toPosCodeId: nodes.length === 0 
        ? 0 
        : isLastNodePlaceholder 
          ? 0 
          : (lastNode?.fromPosCodeId || 0),
      toPosCodeName: nodes.length === 0 
        ? undefined 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromPosCodeName,
      toPosition: nodes.length === 0 
        ? '' 
        : isLastNodePlaceholder 
          ? '' 
          : (lastNode?.fromPosition || ''),
      toPositionNumber: nodes.length === 0 
        ? undefined 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromPositionNumber,
      toUnit: nodes.length === 0 
        ? unitName 
        : isLastNodePlaceholder 
          ? '' 
          : (lastNode?.fromUnit || ''),
      toActingAs: nodes.length === 0 
        ? undefined 
        : isLastNodePlaceholder 
          ? undefined 
          : lastNode?.fromActingAs,
      
      // Rank levels
      fromRankLevel: 0,
      toRankLevel: nodes.length === 0 ? 0 : (lastNode?.fromRankLevel || 0),
      isPromotionValid: false, // placeholder ยังไม่ valid
    };

    setNodes([...nodes, placeholderNode]);
    toast.info('เพิ่มตำแหน่งว่างแล้ว กรุณาเลือกบุคลากรภายหลัง');
  };

  const handleInsertPlaceholder = (beforeNodeId: string) => {
    const insertIndex = nodes.findIndex(n => n.id === beforeNodeId);
    if (insertIndex === -1) {
      toast.error('ไม่พบตำแหน่งที่ต้องการแทรก');
      return;
    }

    const targetNode = nodes[insertIndex];

    // สร้าง placeholder node
    const placeholderNode: ChainNode = {
      id: `placeholder-${Date.now()}`,
      nodeOrder: targetNode.nodeOrder,
      isPlaceholder: true,
      fullName: '[รอการเลือกบุคลากร]',
      nationalId: '',
      rank: '',
      
      // ตำแหน่ง from ว่าง
      fromPosCodeId: 0,
      fromPosCodeName: undefined,
      fromPosition: '',
      fromPositionNumber: undefined,
      fromUnit: '',
      fromActingAs: undefined,
      
      // ตำแหน่ง to ตามโหนดที่จะแทรกก่อน
      toPosCodeId: targetNode.toPosCodeId,
      toPosCodeName: targetNode.toPosCodeName,
      toPosition: targetNode.toPosition,
      toPositionNumber: targetNode.toPositionNumber,
      toUnit: targetNode.toUnit,
      toActingAs: targetNode.toActingAs,
      
      // Rank levels
      fromRankLevel: 0,
      toRankLevel: targetNode.toRankLevel,
      isPromotionValid: false,
    };

    // แทรก placeholder ก่อนโหนดที่เลือก
    const newNodes = [...nodes];
    newNodes.splice(insertIndex, 0, placeholderNode);

    // อัพเดท nodeOrder และ toUnit ตาม chain logic
    const reorderedNodes = newNodes.map((node, index) => {
      if (index === 0) {
        // Node แรก: ไปหน่วยปลายทาง
        return {
          ...node,
          nodeOrder: 1,
          toPosition: '',
          toUnit: unitName || node.toUnit,
          toPosCodeId: 0,
          toPosCodeName: undefined,
          toPositionNumber: undefined,
          toActingAs: undefined,
        };
      } else {
        // Node อื่นๆ: ไปหน่วยของ node ก่อนหน้า
        const prevNode = newNodes[index - 1];
        if (prevNode.isPlaceholder) {
          // ถ้า node ก่อนหน้าเป็น placeholder ยังไม่รู้ว่าจะไปไหน
          return {
            ...node,
            nodeOrder: index + 1,
            toPosition: '',
            toUnit: '',
            toPosCodeId: 0,
            toPosCodeName: undefined,
            toPositionNumber: undefined,
            toActingAs: undefined,
          };
        } else {
          // Node ก่อนหน้าเป็น node ปกติ
          return {
            ...node,
            nodeOrder: index + 1,
            toPosCodeId: prevNode.fromPosCodeId,
            toPosCodeName: prevNode.fromPosCodeName,
            toPosition: prevNode.fromPosition,
            toPositionNumber: prevNode.fromPositionNumber,
            toUnit: prevNode.fromUnit,
            toActingAs: prevNode.fromActingAs,
          };
        }
      }
    });

    setNodes(reorderedNodes);
    toast.info('แทรกตำแหน่งว่างแล้ว กรุณาเลือกบุคลากรภายหลัง');
  };

  const handleSave = async () => {
    if (!transaction) return;
    setSaving(true);
    try {
      if (!unitName || unitName.trim() === '') {
        toast.error('กรุณาระบุหน่วยงานปลายทาง');
        setSaving(false);
        return;
      }

      // กรองเฉพาะ node ที่ไม่ใช่ placeholder
      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        toast.error('กรุณาเลือกบุคลากรอย่างน้อย 1 คน (ไม่นับตำแหน่งว่าง)');
        setSaving(false);
        return;
      }

      const swapDetails = validNodes.map((node) => ({
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
        // ข้อมูลบุคลากรที่จะเลื่อนตำแหน่ง
        startingPersonnel: startingPersonnel ? {
          id: startingPersonnel.id,
          noId: startingPersonnel.noId,
          fullName: startingPersonnel.fullName,
          rank: startingPersonnel.rank,
          nationalId: startingPersonnel.nationalId,
          seniority: startingPersonnel.seniority,
          posCodeId: startingPersonnel.posCodeId,
          posCodeName: startingPersonnel.posCodeName,
          position: startingPersonnel.position,
          positionNumber: startingPersonnel.positionNumber,
          unit: startingPersonnel.unit,
          actingAs: startingPersonnel.actingAs,
        } : null,
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
          {/* Title and Back Button */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2,
          }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                แก้ไขรายการย้ายบุคลากร
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ปรับแก้ไขข้อมูลการย้ายบุคลากรไปหน่วยงานปลายทาง
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/police-personnel/promotion')}
              sx={{ flexShrink: 0 }}
            >
              ย้อนกลับ
            </Button>
          </Box>

          {/* Destination Unit Info - Full Width */}
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">กำลังโหลดข้อมูล...</Typography>
            </Box>
          ) : (
            <Box sx={{ 
              p: 2,
              bgcolor: 'primary.50',
              borderRadius: 1,
              borderLeft: '3px solid',
              borderColor: 'primary.main',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  🏢 หน่วยงานปลายทาง
                </Typography>
                <Chip label={`${nodes.length} ขั้น`} size="small" color="primary" sx={{ height: 30, fontSize: '0.85rem' }} />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={unitOptions}
                  value={unitName}
                  onChange={(event, newValue) => {
                    setUnitName(newValue || '');
                  }}
                  onInputChange={(event, newInputValue) => {
                    setUnitName(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="ชื่อหน่วยงานปลายทาง"
                      placeholder="เลือกหรือพิมพ์ชื่อหน่วยงาน..."
                      variant="outlined"
                      size="small"
                      required
                    />
                  )}
                  sx={{ bgcolor: 'white', flex: 1 }}
                />
                
                <TextField
                  label="รายละเอียดเพิ่มเติม"
                  placeholder="ระบุรายละเอียดของหน่วยงาน (ถ้ามี)"
                  value={unitDescription}
                  onChange={(e) => setUnitDescription(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ bgcolor: 'white', flex: 1 }}
                />
              </Box>
              
              {/* Group Number Display */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip label="เลขกลุ่ม" size="small" color="primary" sx={{ height: 22 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{transaction?.groupNumber || '-'}</Typography>
              </Box>
            </Box>
          )}

          {/* หมายเหตุกลุ่ม */}
          {!loading && (
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
                onAddPlaceholder={handleAddPlaceholder}
                onInsertPlaceholder={handleInsertPlaceholder}
                destinationUnit={unitName}
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
