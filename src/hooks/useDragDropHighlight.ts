import { useState, useCallback } from 'react';

interface DraggedRow {
  transactionId: string;
  detailId: string;
  index: number;
}

interface DragOverIndex {
  transactionId: string;
  index: number;
}

export interface UseDragDropHighlightReturn {
  draggedRow: DraggedRow | null;
  dragOverIndex: DragOverIndex | null;
  droppedRows: Set<string>;
  handleDragStart: (e: React.DragEvent, transactionId: string, detailId: string, index: number) => void;
  handleDragOver: (e: React.DragEvent, transactionId: string, targetIndex: number) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragEnd: () => void;
  handleDrop: (
    e: React.DragEvent,
    transactionId: string,
    targetIndex: number,
    onReorder: (sourceIndex: number, targetIndex: number, detailId: string) => void
  ) => void;
  getDragDropStyles: (
    detailId: string,
    transactionId: string,
    index: number,
    theme: any
  ) => any;
}

/**
 * Custom hook for drag and drop functionality with highlight effects
 * @param highlightDuration - Duration in milliseconds to show the highlight effect (default: 2000ms)
 */
export function useDragDropHighlight(highlightDuration: number = 2000): UseDragDropHighlightReturn {
  const [draggedRow, setDraggedRow] = useState<DraggedRow | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<DragOverIndex | null>(null);
  const [droppedRows, setDroppedRows] = useState<Set<string>>(new Set());

  const handleDragStart = useCallback((
    e: React.DragEvent,
    transactionId: string,
    detailId: string,
    index: number
  ) => {
    setDraggedRow({ transactionId, detailId, index });
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((
    e: React.DragEvent,
    transactionId: string,
    targetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    // ป้องกันการ setState บ่อยเกินไป
    if (dragOverIndex?.transactionId !== transactionId || dragOverIndex?.index !== targetIndex) {
      setDragOverIndex({ transactionId, index: targetIndex });
    }
  }, [dragOverIndex]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedRow(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((
    e: React.DragEvent,
    transactionId: string,
    targetIndex: number,
    onReorder: (sourceIndex: number, targetIndex: number, detailId: string) => void
  ) => {
    e.preventDefault();

    if (!draggedRow || draggedRow.transactionId !== transactionId) return;

    const sourceIndex = draggedRow.index;
    const droppedDetailId = draggedRow.detailId;

    // รีเซ็ต drag state ก่อน
    setDraggedRow(null);
    setDragOverIndex(null);

    if (sourceIndex === targetIndex) {
      return;
    }

    // เพิ่ม highlight effect สำหรับ row ที่ถูก drop
    setDroppedRows((prev) => new Set(prev).add(droppedDetailId));

    // ลบ highlight หลังจากเวลาที่กำหนด
    setTimeout(() => {
      setDroppedRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(droppedDetailId);
        return newSet;
      });
    }, highlightDuration);

    // เรียก callback เพื่อจัดการการเรียงลำดับใหม่
    onReorder(sourceIndex, targetIndex, droppedDetailId);
  }, [draggedRow, highlightDuration]);

  const getDragDropStyles = useCallback((
    detailId: string,
    transactionId: string,
    index: number,
    theme: any
  ) => {
    const isDragging = draggedRow?.detailId === detailId;
    const isDropTarget = dragOverIndex?.transactionId === transactionId && dragOverIndex?.index === index && !isDragging;
    const isJustDropped = droppedRows.has(detailId);

    // ใช้ alpha function ถ้ามี theme object
    const alpha = theme?.palette?.augmentColor 
      ? (color: string, opacity: number) => {
          const hex = color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
      : (color: string, opacity: number) => `rgba(0, 0, 0, ${opacity})`;

    const successColor = theme?.palette?.success?.main || '#2e7d32';
    const primaryColor = theme?.palette?.primary?.main || '#1976d2';

    return {
      cursor: isDragging ? 'grabbing' : 'grab',
      opacity: isDragging ? 0.4 : 1,
      bgcolor: isJustDropped
        ? alpha(successColor, 0.15)
        : isDropTarget
        ? alpha(primaryColor, 0.1)
        : 'white',
      position: 'relative',
      userSelect: 'none',
      pointerEvents: 'auto',
      outline: isDropTarget ? '2px dashed #667eea' : isJustDropped ? '2px solid' : 'none',
      outlineColor: isJustDropped ? successColor : undefined,
      outlineOffset: '-2px',
      boxShadow: isJustDropped
        ? `0 0 20px ${alpha(successColor, 0.4)}, inset 0 0 10px ${alpha(successColor, 0.1)}`
        : 'none',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      animation: isJustDropped ? 'pulse 0.6s ease-in-out' : 'none',
      '@keyframes pulse': {
        '0%, 100%': {
          boxShadow: `0 0 20px ${alpha(successColor, 0.4)}, inset 0 0 10px ${alpha(successColor, 0.1)}`,
        },
        '50%': {
          boxShadow: `0 0 30px ${alpha(successColor, 0.6)}, inset 0 0 15px ${alpha(successColor, 0.2)}`,
        },
      },
      '&:hover': {
        bgcolor: isDragging
          ? 'transparent'
          : isJustDropped
          ? alpha(successColor, 0.25)
          : isDropTarget
          ? alpha(primaryColor, 0.2)
          : 'action.hover',
      },
    };
  }, [draggedRow, dragOverIndex, droppedRows]);

  return {
    draggedRow,
    dragOverIndex,
    droppedRows,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    getDragDropStyles,
  };
}
