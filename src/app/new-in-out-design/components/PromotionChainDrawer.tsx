"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Divider,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
} from '@mui/material';
import { 
  Close as CloseIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  ArrowBack as ArrowBackIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import PromotionChainTable from '@/app/police-personnel/promotion-chain/create/components/PromotionChainTable';

// Types matching promotion-chain/create
interface ChainNode {
  id: string;
  nodeOrder: number;
  isPlaceholder?: boolean;
  personnelId?: string;
  noId?: number;
  
  nationalId?: string;
  fullName: string;
  rank?: string;
  seniority?: string;
  
  birthDate?: string;
  age?: string;
  education?: string;
  
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  
  trainingLocation?: string;
  trainingCourse?: string;
  
  supporterName?: string;
  supportReason?: string;
  
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

interface VacantPosition {
  posCodeId: number;
  posCodeName?: string;
  position: string;
  unit: string;
  requestedPositionId?: number;
  requestedPosition?: string;
  positionNumber?: string;
  actingAs?: string;
}

interface PromotionChainDrawerProps {
  open: boolean;
  onClose: () => void;
  vacantPosition: VacantPosition | null;
  year: number;
  chainId?: string | null; // เพิ่ม: สำหรับโหลดข้อมูล chain ที่มีอยู่แล้ว (edit mode)
  onSaveSuccess?: () => void;
}

export default function PromotionChainDrawer({ 
  open, 
  onClose, 
  vacantPosition, 
  year,
  chainId,
  onSaveSuccess 
}: PromotionChainDrawerProps) {
  const [nodes, setNodes] = useState<ChainNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [groupNumber, setGroupNumber] = useState<string>('');
  const [groupNotes, setGroupNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadedVacantPosition, setLoadedVacantPosition] = useState<VacantPosition | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showUncompleteDialog, setShowUncompleteDialog] = useState(false);

  const isChainValid = useMemo(() => {
    if (nodes.length === 0) return false;
    const validNodes = nodes.filter(n => !n.isPlaceholder);
    if (validNodes.length === 0) return false;
    return validNodes.every(n => n.isPromotionValid);
  }, [nodes]);
  
  const hasPlaceholder = useMemo(() => nodes.some(n => n.isPlaceholder), [nodes]);

  // Load existing chain data when chainId is provided (edit mode)
  useEffect(() => {
    if (!open || !chainId) return;
    
    const loadChainData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/swap-transactions/${chainId}`);
        if (!response.ok) throw new Error('Failed to load chain data');
        
        const result = await response.json();
        const transaction = result.data;
        
        if (!transaction) throw new Error('Transaction not found');
        
        // Set group info
        setGroupNumber(transaction.groupNumber || '');
        setGroupNotes(transaction.notes || '');
        setIsCompleted(transaction.isCompleted || false);
        
        // Extract vacant position from groupName or first node's toPosition
        let extractedVacantPos: VacantPosition | null = null;
        
        if (transaction.groupName) {
          // Parse groupName format: "ตำแหน่งว่าง พ.ต.ท. • ผบ.ร้อย (123)"
          const match = transaction.groupName.match(/ตำแหน่งว่าง\s+(.+?)\s+•\s+(.+?)\s*(?:\((\d+)\))?$/);
          if (match) {
            const [, posCodeName, positionInfo, positionNumber] = match;
            // Try to get unit from first detail's toUnit
            const firstDetail = transaction.swapDetails?.[0];
            extractedVacantPos = {
              posCodeId: firstDetail?.toPosCodeId || 0,
              posCodeName: posCodeName?.trim(),
              position: positionInfo?.trim() || '',
              unit: firstDetail?.toUnit || '',
              positionNumber: positionNumber || undefined,
              actingAs: firstDetail?.toActingAs || undefined,
            };
          }
        }
        
        // Fallback: use first node's toPosition if groupName parsing failed
        if (!extractedVacantPos && transaction.swapDetails?.[0]) {
          const firstDetail = transaction.swapDetails[0];
          extractedVacantPos = {
            posCodeId: firstDetail.toPosCodeId || 0,
            posCodeName: firstDetail.toPosCodeMaster?.name,
            position: firstDetail.toPosition || '',
            unit: firstDetail.toUnit || '',
            positionNumber: firstDetail.toPositionNumber || undefined,
            actingAs: firstDetail.toActingAs || undefined,
          };
        }
        
        setLoadedVacantPosition(extractedVacantPos);
        
        // Map swap details to nodes
        const sorted = [...(transaction.swapDetails || [])].sort((a: any, b: any) => {
          const sa = a.sequence ?? 9999;
          const sb = b.sequence ?? 9999;
          if (sa !== sb) return sa - sb;
          return (a.fullName || "").localeCompare(b.fullName || "");
        });
        
        const mappedNodes: ChainNode[] = sorted.map((d: any, index: number, arr: any[]) => {
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
            noId: d.noId ? Number(d.noId) : undefined,
            nationalId: d.nationalId ?? undefined,
            fullName: isPlaceholder ? '[รอการเลือกบุคลากร]' : (d.fullName || 'ไม่ระบุ'),
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
            fromPosition: d.fromPosition || '',
            fromPositionNumber: d.fromPositionNumber ?? undefined,
            fromUnit: d.fromUnit || '',
            fromActingAs: d.fromActingAs ?? undefined,
            toPosCodeId: d.toPosCodeId ?? 0,
            toPosCodeName: d.toPosCodeMaster?.name ?? undefined,
            toPosition: d.toPosition || '',
            toPositionNumber: d.toPositionNumber ?? undefined,
            toUnit: d.toUnit || '',
            toActingAs: d.toActingAs ?? undefined,
            fromRankLevel: fromRank,
            toRankLevel: d.toPosCodeId ?? 0,
            isPromotionValid: true, // ข้อมูลที่โหลดมาจาก DB ถือว่าถูกต้องแล้ว
          };
        });
        
        setNodes(mappedNodes);
        
        console.log('Loaded chain data:');
        console.log('- mappedNodes:', mappedNodes);
        console.log('- vacantPosition prop:', vacantPosition);
      } catch (error) {
        console.error('Error loading chain data:', error);
        alert('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setLoading(false);
      }
    };
    
    loadChainData();
  }, [open, chainId]);

  // Generate group number (only when creating new chain)
  useEffect(() => {
    if (!open || chainId) return; // Skip if editing existing chain
    const fetchNextGroupNumber = async () => {
      try {
        const currentYear = new Date().getFullYear() + 543;
        const response = await fetch(`/api/swap-transactions?year=${currentYear}&swapType=promotion-chain`);
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        const transactions: any[] = Array.isArray(result?.data) ? result.data : [];
        let maxNumber = 0;
        for (const t of transactions) {
          if (t.groupNumber) {
            const match = String(t.groupNumber).match(/\/PC-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          }
        }
        const next = String(maxNumber + 1).padStart(3, '0');
        setGroupNumber(`${currentYear}/PC-${next}`);
      } catch (e) {
        const currentYear = new Date().getFullYear() + 543;
        setGroupNumber(`${currentYear}/PC-001`);
      }
    };
    fetchNextGroupNumber();
  }, [open, chainId]);

  // Reset when drawer opens (only for new chain creation)
  useEffect(() => {
    if (open && !chainId) {
      setNodes([]);
      setGroupNotes('');
      setLoadedVacantPosition(null);
      setIsCompleted(false);
    }
  }, [open, chainId]);
  
  // Use loaded vacant position if in edit mode, otherwise use prop
  const activeVacantPosition = chainId ? loadedVacantPosition : vacantPosition;

  const handleAddVacantBefore = (nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const targetNode = nodes[nodeIndex];
    const newVacant: ChainNode = {
      id: `vacant-${Date.now()}`,
      nodeOrder: nodeIndex + 1,
      isPlaceholder: true,
      fullName: 'ตำแหน่งว่าง',
      fromPosCodeId: 0,
      fromPosCodeName: undefined,
      fromPosition: '',
      fromPositionNumber: undefined,
      fromUnit: '',
      fromActingAs: undefined,
      fromRankLevel: 0,
      toPosCodeId: targetNode.toPosCodeId,
      toPosCodeName: targetNode.toPosCodeName,
      toPosition: targetNode.toPosition,
      toPositionNumber: targetNode.toPositionNumber,
      toUnit: targetNode.toUnit,
      toActingAs: targetNode.toActingAs,
      toRankLevel: targetNode.toRankLevel,
      isPromotionValid: false,
    };

    const newNodes = [...nodes];
    newNodes.splice(nodeIndex, 0, newVacant);

    const reorderedNodes = newNodes.map((node, index) => {
      if (index === 0) {
        return {
          ...node,
          nodeOrder: 1,
          toPosCodeId: activeVacantPosition?.posCodeId || node.toPosCodeId,
          toPosCodeName: activeVacantPosition?.posCodeName || node.toPosCodeName,
          toPosition: activeVacantPosition?.position || node.toPosition,
          toPositionNumber: activeVacantPosition?.positionNumber || node.toPositionNumber,
          toUnit: activeVacantPosition?.unit || node.toUnit,
          toActingAs: activeVacantPosition?.actingAs || node.toActingAs,
        };
      } else {
        const prevNode = newNodes[index - 1];
        if (prevNode.isPlaceholder) {
          return {
            ...node,
            nodeOrder: index + 1,
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
  };

  const handleRemoveNode = (nodeId: string) => {
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;

    const removedNode = nodes[nodeIndex];
    const newNodes = nodes.filter(n => n.id !== nodeId);

    if (newNodes.length === 0) {
      setNodes([]);
      return;
    }

    const reorderedNodes = newNodes.map((node, index) => {
      if (index < nodeIndex) {
        return { ...node, nodeOrder: index + 1 };
      }
      
      if (index === 0) {
        if (nodeIndex === 0 && activeVacantPosition) {
          return {
            ...node,
            nodeOrder: 1,
            toPosCodeId: activeVacantPosition.posCodeId || removedNode.toPosCodeId,
            toPosCodeName: activeVacantPosition.posCodeName || removedNode.toPosCodeName,
            toPosition: activeVacantPosition.position || removedNode.toPosition,
            toPositionNumber: activeVacantPosition.positionNumber || removedNode.toPositionNumber,
            toUnit: activeVacantPosition.unit || removedNode.toUnit,
            toActingAs: activeVacantPosition.actingAs || removedNode.toActingAs,
            toRankLevel: removedNode.toRankLevel,
          };
        }
        return { ...node, nodeOrder: 1 };
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
  };

  const handleReorder = (reorderedNodes: ChainNode[]) => {
    const updatedNodes = reorderedNodes.map((node, index) => {
      if (index === 0) {
        return {
          ...node,
          nodeOrder: 1,
          toPosCodeId: activeVacantPosition?.posCodeId || node.toPosCodeId,
          toPosCodeName: activeVacantPosition?.posCodeName || node.toPosCodeName,
          toPosition: activeVacantPosition?.position || node.toPosition,
          toPositionNumber: activeVacantPosition?.positionNumber || node.toPositionNumber,
          toUnit: activeVacantPosition?.unit || node.toUnit,
          toActingAs: activeVacantPosition?.actingAs || node.toActingAs,
        };
      } else {
        const prevNode = reorderedNodes[index - 1];
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

    setNodes(updatedNodes);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (nodes.length === 0) {
        alert('ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 1 ขั้นตอน');
        return;
      }

      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        alert('ต้องมีบุคลากรที่ไม่ใช่ตำแหน่งว่างอย่างน้อย 1 คน');
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
        posCodeName: node.fromPosCodeName,
        toPosCodeId: node.toPosCodeId || null,
        toPosCodeName: node.toPosCodeName,
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
        notes: node.notes,
      }));

      // Generate swapDate (ISO format for API)
      const now = new Date();
      const swapDate = now.toISOString();

      const payload = {
        year: year,
        swapDate: swapDate,
        swapType: 'promotion-chain',
        groupName: activeVacantPosition ? `ตำแหน่งว่าง ${activeVacantPosition.posCodeName || ''} • ${activeVacantPosition.position || ''}${activeVacantPosition.positionNumber ? ` (${activeVacantPosition.positionNumber})` : ''}` : null,
        groupNumber: groupNumber || null,
        status: 'completed',
        isCompleted: false,
        notes: groupNotes.trim() || null,
        swapDetails: swapDetails,
      };

      // Debug: Log payload
      console.log('=== DEBUG SAVE ===');
      console.log('nodes.length:', nodes.length);
      console.log('swapDetails.length:', swapDetails.length);
      console.log('payload:', JSON.stringify(payload, null, 2));

      // Use PUT if editing existing chain, POST for new chain
      const url = chainId ? `/api/swap-transactions/${chainId}` : '/api/swap-transactions';
      const method = chainId ? 'PUT' : 'POST';
      
      console.log(`Sending ${method} request to ${url}`);
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || 'Failed to save');
      }
      
      const result = await response.json();
      console.log('Save success:', result);
      
      // Reload ข้อมูลถ้าเป็น edit mode
      if (chainId) {
        const reloadResponse = await fetch(`/api/swap-transactions/${chainId}`);
        if (reloadResponse.ok) {
          const reloadResult = await reloadResponse.json();
          const transaction = reloadResult.data;
          if (transaction) {
            // Reload group info
            setGroupNumber(transaction.groupNumber || '');
            setGroupNotes(transaction.notes || '');
            setIsCompleted(transaction.isCompleted || false);
            
            // Reload nodes
            const sorted = [...(transaction.swapDetails || [])].sort((a: any, b: any) => {
              const sa = a.sequence ?? 9999;
              const sb = b.sequence ?? 9999;
              if (sa !== sb) return sa - sb;
              return (a.fullName || "").localeCompare(b.fullName || "");
            });
            
            const mappedNodes: ChainNode[] = sorted.map((d: any, index: number, arr: any[]) => {
              const fromRank = d.posCodeId ?? 0;
              const isPlaceholder = d.isPlaceholder === true || 
                (!d.personnelId || !d.nationalId || 
                 (typeof d.personnelId === 'string' && d.personnelId.trim() === '') || 
                 (typeof d.nationalId === 'string' && d.nationalId.trim() === ''));
              
              return {
                id: `node-${d.id}`,
                nodeOrder: d.sequence ?? index + 1,
                isPlaceholder,
                personnelId: d.personnelId ?? undefined,
                noId: d.noId ? Number(d.noId) : undefined,
                nationalId: d.nationalId ?? undefined,
                fullName: isPlaceholder ? '[รอการเลือกบุคลากร]' : (d.fullName || 'ไม่ระบุ'),
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
                fromPosition: d.fromPosition || '',
                fromPositionNumber: d.fromPositionNumber ?? undefined,
                fromUnit: d.fromUnit || '',
                fromActingAs: d.fromActingAs ?? undefined,
                toPosCodeId: d.toPosCodeId ?? 0,
                toPosCodeName: d.toPosCodeMaster?.name ?? undefined,
                toPosition: d.toPosition || '',
                toPositionNumber: d.toPositionNumber ?? undefined,
                toUnit: d.toUnit || '',
                toActingAs: d.toActingAs ?? undefined,
                fromRankLevel: fromRank,
                toRankLevel: d.toPosCodeId ?? 0,
                isPromotionValid: true,
              };
            });
            
            setNodes(mappedNodes);
          }
        }
      }
      
      alert('บันทึกสำเร็จ');
      
      // Trigger external reload without closing
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleUncomplete = async () => {
    setShowUncompleteDialog(false);
    setSaving(true);
    try {
      if (!chainId) return;
      
      const response = await fetch(`/api/swap-transactions/${chainId}/complete`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to uncomplete');
      }
      
      const result = await response.json();
      console.log('Uncomplete success:', result);
      
      // อัพเดตสถานะเป็นยังไม่เสร็จสิ้น
      setIsCompleted(false);
      
      // Reload chain data
      const reloadResponse = await fetch(`/api/swap-transactions/${chainId}`);
      if (reloadResponse.ok) {
        const reloadResult = await reloadResponse.json();
        const transaction = reloadResult.data;
        if (transaction) {
          setIsCompleted(transaction.isCompleted || false);
        }
      }
      
      alert('ยกเลิกการเสร็จสิ้นแล้ว');
      
    } catch (error: any) {
      console.error('Error uncompleting:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการยกเลิก');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setShowCompleteDialog(false);
    setSaving(true);
    try {
      if (nodes.length === 0) {
        alert('ข้อมูลไม่ครบถ้วน ต้องมีอย่างน้อย 1 ขั้นตอน');
        return;
      }

      const validNodes = nodes.filter(n => !n.isPlaceholder);
      if (validNodes.length === 0) {
        alert('ต้องมีบุคลากรที่ไม่ใช่ตำแหน่งว่างอย่างน้อย 1 คน');
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
        posCodeName: node.fromPosCodeName,
        toPosCodeId: node.toPosCodeId || null,
        toPosCodeName: node.toPosCodeName,
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
        notes: node.notes,
      }));

      // Generate swapDate (ISO format for API)
      const now = new Date();
      const swapDate = now.toISOString();

      const payload = {
        year: year,
        swapDate: swapDate,
        swapType: 'promotion-chain',
        groupName: activeVacantPosition ? `ตำแหน่งว่าง ${activeVacantPosition.posCodeName || ''} • ${activeVacantPosition.position || ''}${activeVacantPosition.positionNumber ? ` (${activeVacantPosition.positionNumber})` : ''}` : null,
        groupNumber: groupNumber || null,
        status: 'completed',
        isCompleted: true,
        notes: groupNotes.trim() || null,
        swapDetails: swapDetails,
      };

      // Use PUT if editing existing chain, POST for new chain
      const url = chainId ? `/api/swap-transactions/${chainId}` : '/api/swap-transactions';
      const method = chainId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to complete');
      }

      const result = await response.json();
      console.log('Complete success:', result);
      
      // อัพเดตสถานะเป็นเสร็จสิ้น
      setIsCompleted(true);
      
      // Reload ข้อมูลถ้าเป็น edit mode
      if (chainId) {
        const reloadResponse = await fetch(`/api/swap-transactions/${chainId}`);
        if (reloadResponse.ok) {
          const reloadResult = await reloadResponse.json();
          const transaction = reloadResult.data;
          if (transaction) {
            // Reload group info
            setGroupNumber(transaction.groupNumber || '');
            setGroupNotes(transaction.notes || '');
            setIsCompleted(transaction.isCompleted || false);
            
            // Reload nodes
            const sorted = [...(transaction.swapDetails || [])].sort((a: any, b: any) => {
              const sa = a.sequence ?? 9999;
              const sb = b.sequence ?? 9999;
              if (sa !== sb) return sa - sb;
              return (a.fullName || "").localeCompare(b.fullName || "");
            });
            
            const mappedNodes: ChainNode[] = sorted.map((d: any, index: number, arr: any[]) => {
              const fromRank = d.posCodeId ?? 0;
              const isPlaceholder = d.isPlaceholder === true || 
                (!d.personnelId || !d.nationalId || 
                 (typeof d.personnelId === 'string' && d.personnelId.trim() === '') || 
                 (typeof d.nationalId === 'string' && d.nationalId.trim() === ''));
              
              return {
                id: `node-${d.id}`,
                nodeOrder: d.sequence ?? index + 1,
                isPlaceholder,
                personnelId: d.personnelId ?? undefined,
                noId: d.noId ? Number(d.noId) : undefined,
                nationalId: d.nationalId ?? undefined,
                fullName: isPlaceholder ? '[รอการเลือกบุคลากร]' : (d.fullName || 'ไม่ระบุ'),
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
                fromPosition: d.fromPosition || '',
                fromPositionNumber: d.fromPositionNumber ?? undefined,
                fromUnit: d.fromUnit || '',
                fromActingAs: d.fromActingAs ?? undefined,
                toPosCodeId: d.toPosCodeId ?? 0,
                toPosCodeName: d.toPosCodeMaster?.name ?? undefined,
                toPosition: d.toPosition || '',
                toPositionNumber: d.toPositionNumber ?? undefined,
                toUnit: d.toUnit || '',
                toActingAs: d.toActingAs ?? undefined,
                fromRankLevel: fromRank,
                toRankLevel: d.toPosCodeId ?? 0,
                isPromotionValid: true,
              };
            });
            
            setNodes(mappedNodes);
          }
        }
      }
      
      alert('บันทึกและทำเครื่องหมายเสร็จสิ้นแล้ว');
      
      // Trigger external reload without closing
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error: any) {
      console.error('Error completing:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          zIndex: 1300,
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: '90%', md: '85%', lg: '80%' },
            maxWidth: 1400,
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                {chainId ? 'แก้ไขสายโปรโมชั่น' : 'จัดการตำแหน่งว่าง'}
              </Typography>
              {chainId && (
                <Chip label="โหลดข้อมูลที่มีอยู่" size="small" color="info" />
              )}
              {isCompleted && (
                <Chip 
                  label="เสร็จสิ้น" 
                  size="small" 
                  color="success" 
                  icon={<CheckIcon />}
                />
              )}
            </Stack>
            <IconButton onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Vacant Position Info */}
          {activeVacantPosition && (
            <Paper sx={{ m: 2, p: 2, bgcolor: alpha('#1976d2', 0.08) }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  ตำแหน่งว่างเป้าหมาย
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  {activeVacantPosition.posCodeName && (
                    <Chip
                      label={activeVacantPosition.posCodeName}
                      size="small"
                      color="primary"
                    />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {activeVacantPosition.position}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({activeVacantPosition.unit})
                  </Typography>
                  {activeVacantPosition.positionNumber && (
                    <Chip label={`เลขที่ ${activeVacantPosition.positionNumber}`} size="small" />
                  )}
                </Stack>
                <Stack direction="row" spacing={1}>
                  {loading ? (
                    <Skeleton variant="rectangular" width={150} height={24} sx={{ borderRadius: 1 }} />
                  ) : (
                    <Chip label={`เลขที่กลุ่ม: ${groupNumber}`} size="small" variant="outlined" />
                  )}
                  <Chip
                    label={`${nodes.length} คน`}
                    size="small"
                    color={nodes.length > 0 ? 'success' : 'default'}
                  />
                </Stack>
              </Stack>
            </Paper>
          )}

          {/* Main Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <PromotionChainTable
              nodes={nodes}
              vacantPosition={activeVacantPosition ? {
                id: `vacant-${activeVacantPosition.posCodeId}-${Date.now()}`,
                posCodeId: activeVacantPosition.posCodeId,
                posCodeName: activeVacantPosition.posCodeName,
                position: activeVacantPosition.position,
                unit: activeVacantPosition.unit,
                positionNumber: activeVacantPosition.positionNumber,
                actingAs: activeVacantPosition.actingAs,
              } : null}
              isCompleted={isCompleted}
              onAddNode={(node) => {
                setNodes([...nodes, node]);
              }}
              onRemoveNode={handleRemoveNode}
              onInsertNode={(node, beforeId) => {
                const insertIndex = nodes.findIndex(n => n.id === beforeId);
                if (insertIndex === -1) return;
                const newNodes = [...nodes];
                newNodes.splice(insertIndex, 0, node);
                const reorderedNodes = newNodes.map((n, index) => {
                  if (index === 0) {
                    return {
                      ...n,
                      nodeOrder: 1,
                      toPosCodeId: activeVacantPosition?.posCodeId || n.toPosCodeId,
                      toPosCodeName: activeVacantPosition?.posCodeName || n.toPosCodeName,
                      toPosition: activeVacantPosition?.position || n.toPosition,
                      toPositionNumber: activeVacantPosition?.positionNumber || n.toPositionNumber,
                      toUnit: activeVacantPosition?.unit || n.toUnit,
                      toActingAs: activeVacantPosition?.actingAs || n.toActingAs,
                      toRankLevel: activeVacantPosition?.posCodeId || n.toRankLevel,
                    };
                  } else {
                    const prevNode = newNodes[index - 1];
                    return {
                      ...n,
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
              }}
              onReorder={handleReorder}
              onInsertPlaceholder={handleAddVacantBefore}
              />
            )}

            {!loading && (
              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="หมายเหตุ (ถ้ามี)"
                  multiline
                  rows={3}
                  value={groupNotes}
                  onChange={(e) => setGroupNotes(e.target.value)}
                  variant="outlined"
                />
              </Box>
            )}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {nodes.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {isChainValid ? (hasPlaceholder ? '✓ พร้อมบันทึก (มีตำแหน่งว่าง)' : '✓ พร้อมบันทึก') : '⚠ ยังไม่สมบูรณ์'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {nodes.filter(n => !n.isPlaceholder).length} บุคลากร
                  {hasPlaceholder && ` • ${nodes.filter(n => n.isPlaceholder).length} ตำแหน่งว่าง`}
                </Typography>
              </Box>
            )}
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={!isChainValid || saving || nodes.length === 0}
                startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                fullWidth
                sx={{ fontWeight: 600 }}
              >
                {saving ? 'กำลังบันทึก...' : hasPlaceholder ? 'บันทึก' : 'บันทึกการแก้ไข'}
              </Button>
              {!hasPlaceholder && !isCompleted && (
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => setShowCompleteDialog(true)}
                  disabled={!isChainValid || saving || nodes.length === 0}
                  startIcon={<CheckIcon />}
                  fullWidth
                  sx={{ fontWeight: 600 }}
                >
                  บันทึกและเสร็จสิ้น
                </Button>
              )}
              {isCompleted && chainId && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => setShowUncompleteDialog(true)}
                  disabled={saving}
                  startIcon={<CancelIcon />}
                  fullWidth
                  sx={{ fontWeight: 600 }}
                >
                  ยกเลิกการเสร็จสิ้น
                </Button>
              )}
            </Stack>
          </Box>
        </Box>
      </Drawer>

      {/* Complete Confirmation Dialog */}
      <Dialog open={showCompleteDialog} onClose={() => !saving && setShowCompleteDialog(false)}>
        <DialogTitle>ยืนยันการบันทึกและเสร็จสิ้น</DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการบันทึกและทำเครื่องหมายสายโปรโมชั่นนี้ว่าเสร็จสิ้นใช่หรือไม่? 
            หลังจากยืนยันแล้วจะไม่สามารถเพิ่มตำแหน่งว่างได้ จนกว่าจะยกเลิกการเสร็จสิ้น
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompleteDialog(false)} disabled={saving}>ยกเลิก</Button>
          <Button 
            onClick={handleComplete} 
            variant="contained" 
            color="success"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CheckIcon />}
            autoFocus
          >
            {saving ? 'กำลังบันทึก...' : 'ยืนยัน'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Uncomplete Confirmation Dialog */}
      <Dialog open={showUncompleteDialog} onClose={() => !saving && setShowUncompleteDialog(false)}>
        <DialogTitle>ยืนยันการยกเลิกการเสร็จสิ้น</DialogTitle>
        <DialogContent>
          <Typography>
            คุณต้องการยกเลิกการทำเครื่องหมายเสร็จสิ้นใช่หรือไม่? 
            หลังจากยกเลิกแล้วจะสามารถเพิ่มตำแหน่งว่างและแก้ไขข้อมูลได้อีกครั้ง
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUncompleteDialog(false)} disabled={saving}>ยกเลิก</Button>
          <Button 
            onClick={handleUncomplete} 
            variant="contained" 
            color="warning"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <CancelIcon />}
            autoFocus
          >
            {saving ? 'กำลังยกเลิก...' : 'ยืนยัน'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
