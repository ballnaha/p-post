'use client';

import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    alpha,
    useTheme,
    Avatar,
    Chip
} from '@mui/material';
import {
    SwapHoriz as SwapIcon,
    CompareArrows as ThreeWayIcon,
    TrendingUp as PromotionIcon,
    Work as WorkIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { Column, Personnel } from '../types';

interface ReportViewProps {
    columns: Column[];
    personnelMap: Record<string, Personnel>;
    selectedYear: number;
}

export default function ReportView({ columns, personnelMap, selectedYear }: ReportViewProps) {
    const theme = useTheme();

    const getGroupTypeInfo = (type: string | undefined) => {
        switch (type) {
            case 'swap':
                return { label: 'สับเปลี่ยน (2-Way)', color: '#9333ea', icon: <SwapIcon fontSize="small" /> };
            case 'three-way':
                return { label: 'สามเส้า (3-Way)', color: '#f43f5e', icon: <ThreeWayIcon fontSize="small" /> };
            case 'promotion':
                return { label: 'เลื่อนตำแหน่ง/ต่อเนื่อง', color: '#3b82f6', icon: <PromotionIcon fontSize="small" /> };
            case 'transfer':
                return { label: 'ย้ายหน่วย/บรรจุ', color: '#10b981', icon: <ArrowForwardIcon fontSize="small" /> };
            default:
                return { label: 'สร้างเอง/ทั่วไป', color: '#64748b', icon: <WorkIcon fontSize="small" /> };
        }
    };

    return (
        <Box sx={{ p: 4, bgcolor: '#fff', color: '#334155', minHeight: '100%' }}>
            {/* Report Header */}
            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
                    รายงานสรุปการจัดทำบัญชีแต่งตั้ง-สับเปลี่ยนบุคลากร
                </Typography>
                <Typography variant="subtitle1" sx={{ color: '#64748b', fontWeight: 600 }}>
                    ประจำปี พ.ศ. {selectedYear}
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 4 }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#3b82f6' }}>{columns.length}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8' }}>จำนวนรายการ/วงจร</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#10b981' }}>
                            {Object.values(personnelMap).filter(p => !p.isPlaceholder).length}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8' }}>จำนวนบุคคลที่มีการย้าย</Typography>
                    </Box>
                </Box>
            </Box>

            {/* Content Groups */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {columns.map((column, colIdx) => {
                    const typeInfo = getGroupTypeInfo(column.chainType);
                    const items = column.itemIds.map(id => personnelMap[id]).filter(Boolean);

                    if (items.length === 0) return null;

                    return (
                        <Box key={column.id} sx={{ pageBreakInside: 'avoid' }}>
                            {/* Group Label */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Box sx={{
                                    bgcolor: typeInfo.color,
                                    color: '#fff',
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    fontWeight: 800,
                                    fontSize: '0.85rem'
                                }}>
                                    {typeInfo.icon}
                                    {typeInfo.label}
                                </Box>
                                <Typography sx={{ fontWeight: 700, color: '#475569' }}>
                                    {column.groupNumber ? `เลขที่วงจร: ${column.groupNumber}` : column.title}
                                </Typography>
                                <Box sx={{ flex: 1, borderBottom: '2px dashed #e2e8f0', ml: 1 }} />
                            </Box>

                            {/* Group Table */}
                            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: alpha(typeInfo.color, 0.05) }}>
                                            <TableCell sx={{ fontWeight: 700, width: 60 }}>ลำดับ</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 220 }}>ชื่อ - สกุล / ข้อมูลบุคคล</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>ตำแหน่งปัจจุบัน (เดิม)</TableCell>
                                            <TableCell sx={{ fontWeight: 700, width: 40, textAlign: 'center' }}>→</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>ตำแหน่งใหม่ (ที่ไป)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {items.map((person, idx) => {
                                            // Find target based on lane logic
                                            let targetPos = person.toPosition || '-';
                                            let targetUnit = person.toUnit || '-';

                                            // If it's a closed loop swap/three-way, derive target from the next person
                                            if (column.chainType === 'swap' && items.length === 2) {
                                                const other = items[idx === 0 ? 1 : 0];
                                                targetPos = person.toPosition || other.position || '-';
                                                targetUnit = person.toUnit || other.unit || '-';
                                            } else if (column.chainType === 'three-way' && items.length === 3) {
                                                const next = items[(idx + 1) % 3];
                                                targetPos = person.toPosition || next.position || '-';
                                                targetUnit = person.toUnit || next.unit || '-';
                                            } else if (column.chainType === 'promotion') {
                                                if (idx === 0) {
                                                    targetPos = column.vacantPosition?.position || '-';
                                                    targetUnit = column.vacantPosition?.unit || '-';
                                                } else {
                                                    const prev = items[idx - 1];
                                                    targetPos = prev.position || '-';
                                                    targetUnit = prev.unit || '-';
                                                }
                                            }

                                            return (
                                                <TableRow key={`${person.id}-${idx}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                    <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</TableCell>
                                                    <TableCell>
                                                        {person.isPlaceholder ? (
                                                            <Typography sx={{ fontWeight: 700, color: 'warning.dark', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                                                (รอพิจารณาตัวบุคคล)
                                                            </Typography>
                                                        ) : (
                                                            <Box>
                                                                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                                                                    {person.rank} {person.fullName}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                                                    อายุ: {person.age || '-'} | วุฒิ: {person.education || '-'}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontSize: '0.85rem', color: '#475569' }}>{person.position || '-'}</Typography>
                                                        <Typography variant="caption" sx={{ color: '#64748b' }}>{person.unit || '-'}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        <ArrowForwardIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{targetPos}</Typography>
                                                        <Typography variant="caption" sx={{ color: '#64748b' }}>{targetUnit}</Typography>
                                                        {person.isPlaceholder && person.toPosition && (
                                                            <Chip label="ตำแหน่งระบุไว้แล้ว" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem', ml: 1 }} />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    );
                })}
            </Box>

            {/* Footer Signatures */}
            <Box sx={{ mt: 10, display: 'flex', justifyContent: 'space-around', pageBreakInside: 'avoid' }}>
                <Box sx={{ textAlign: 'center', width: 250 }}>
                    <Box sx={{ borderBottom: '1px solid #94a3b8', mt: 4, mb: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>ผู้จัดทำบอร์ด</Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>(. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .)</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', width: 250 }}>
                    <Box sx={{ borderBottom: '1px solid #94a3b8', mt: 4, mb: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>ผู้ตรวจสอบ / อนุมัติ</Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>(. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .)</Typography>
                </Box>
            </Box>

            <Typography variant="caption" sx={{ display: 'block', mt: 6, textAlign: 'right', color: '#94a3b8' }}>
                พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
            </Typography>
        </Box>
    );
}
