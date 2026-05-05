'use client';

import React, { memo } from 'react';
import { Button, Tooltip } from '@mui/material';
import { Sort as SortIcon } from '@mui/icons-material';
import { Column } from '../types';

interface SortLanesByTypeButtonProps {
    columns: Column[];
    onSort: (sortedColumns: Column[]) => void;
    disabled?: boolean;
}

// Define sorting order for lane types
const TYPE_ORDER: Record<string, number> = {
    'swap': 1,        // สลับตำแหน่ง (two-way)
    'three-way': 2,   // วงสลับ
    'promotion': 3,   // เลื่อนตำแหน่ง
    'custom': 4,      // ตำแหน่งว่าง/อื่นๆ
};

const TYPE_LABELS: Record<string, string> = {
    'swap': '🔄 สลับตำแหน่ง',
    'three-way': '🔺 วงสลับ',
    'promotion': '📈 เลื่อนตำแหน่ง',
    'custom': '📦 อื่นๆ',
};

const SortLanesByTypeButton = memo(({
    columns,
    onSort,
    disabled = false
}: SortLanesByTypeButtonProps) => {

    const handleSort = () => {
        // Create a copy and sort by type order
        const sortedColumns = [...columns].sort((a, b) => {
            // First, sort by isCompleted (completed lanes go to the end)
            if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
            }

            // Then sort by chain type
            const orderA = TYPE_ORDER[a.chainType || 'custom'] || 99;
            const orderB = TYPE_ORDER[b.chainType || 'custom'] || 99;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            // If same type, maintain relative order (stable sort)
            return 0;
        });

        onSort(sortedColumns);
    };

    // Generate tooltip showing current count by type
    const generateTooltip = () => {
        const counts: Record<string, number> = {};
        columns.forEach(col => {
            if (!col.isCompleted) {
                const type = col.chainType || 'custom';
                counts[type] = (counts[type] || 0) + 1;
            }
        });

        const parts = Object.entries(counts)
            .sort(([a], [b]) => (TYPE_ORDER[a] || 99) - (TYPE_ORDER[b] || 99))
            .map(([type, count]) => `${TYPE_LABELS[type] || type}: ${count}`);

        return parts.length > 0
            ? `จัดกลุ่มตามประเภท:\n${parts.join('\n')}`
            : 'ไม่มีเลนที่ต้องจัดกลุ่ม';
    };

    return (
        <Tooltip title={generateTooltip()} arrow>
            <span>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SortIcon fontSize="small" />}
                    onClick={handleSort}
                    disabled={disabled || columns.length < 2}
                    sx={{
                        borderRadius: 2,
                        px: 2,
                        height: 36,
                        fontWeight: 700,
                        textTransform: 'none',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&:hover': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            bgcolor: 'primary.50',
                        }
                    }}
                >
                    จัดกลุ่มตามประเภท
                </Button>
            </span>
        </Tooltip>
    );
});

SortLanesByTypeButton.displayName = 'SortLanesByTypeButton';

export default SortLanesByTypeButton;
