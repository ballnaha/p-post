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
    Button,
    Stack
} from '@mui/material';
import { Print as PrintIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { Column, Personnel } from '../types';

interface TransferSummaryReportProps {
    columns: Column[];
    personnelMap: Record<string, Personnel>;
    selectedYear: number;
}

export default function TransferSummaryReport({ columns, personnelMap, selectedYear }: TransferSummaryReportProps) {

    const handlePrint = () => {
        window.print();
    };

    const printTime = new Date().toLocaleString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <Box sx={{ p: { xs: 1, md: 3 }, bgcolor: '#f1f5f9', minHeight: '100vh' }}>
            {/* ===== PRINT STYLES ===== */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');

                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }

                    * { box-sizing: border-box !important; }

                    body {
                        margin: 1.2cm 1cm !important;
                        padding: 0 !important;
                        background: white !important;
                        font-family: "TH Sarabun New", "Sarabun", sans-serif !important;
                        font-size: 11pt !important;
                        color: #000 !important;
                        line-height: 1.3 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    /* Force white background */
                    * {
                        background-color: white !important;
                        background: white !important;
                    }

                    /* Hide web UI */
                    .no-print,
                    .MuiButton-root,
                    .MuiSvgIcon-root {
                        display: none !important;
                    }

                    .print-container {
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        min-height: unset !important;
                    }

                    /* Document header */
                    .doc-header {
                        text-align: center !important;
                        margin-bottom: 10pt !important;
                        padding-bottom: 6pt !important;
                        border-bottom: 1pt solid #000 !important;
                    }

                    .doc-title {
                        font-size: 14pt !important;
                        font-weight: 700 !important;
                        line-height: 1.3 !important;
                        margin: 0 !important;
                        color: #000 !important;
                    }

                    .doc-subtitle {
                        font-size: 11pt !important;
                        font-weight: 400 !important;
                        margin-top: 2pt !important;
                        color: #000 !important;
                    }

                    /* Section header */
                    .section-header {
                        border: 0.5pt solid #000 !important;
                        border-bottom: none !important;
                        padding: 3pt 6pt !important;
                        margin-top: 8pt !important;
                        page-break-after: avoid !important;
                    }

                    .section-num {
                        font-size: 10pt !important;
                        font-weight: 700 !important;
                        color: #000 !important;
                    }

                    .section-type {
                        font-size: 9pt !important;
                        color: #333 !important;
                    }

                    /* Table */
                    .report-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        border: 0.5pt solid #000 !important;
                        table-layout: fixed !important;
                        page-break-inside: avoid !important;
                    }

                    .report-table th {
                        font-size: 9pt !important;
                        font-weight: 700 !important;
                        padding: 3pt 5pt !important;
                        border: 0.5pt solid #000 !important;
                        text-align: left !important;
                    }

                    .report-table td {
                        font-size: 10pt !important;
                        padding: 3pt 5pt !important;
                        border: 0.5pt solid #000 !important;
                        vertical-align: top !important;
                    }

                    .cell-name {
                        font-size: 10pt !important;
                        font-weight: 700 !important;
                        line-height: 1.2 !important;
                    }

                    .cell-detail {
                        font-size: 9pt !important;
                        color: #222 !important;
                    }

                    .cell-unit {
                        font-size: 8.5pt !important;
                        color: #444 !important;
                    }

                    .arrow-col {
                        width: 24pt !important;
                        text-align: center !important;
                        vertical-align: middle !important;
                        padding: 0 !important;
                        border: 0.5pt solid #000 !important;
                    }

                    .arrow-col::after {
                        content: '→';
                        font-size: 14pt !important;
                        color: #333 !important;
                    }

                    /* Footer */
                    .print-footer {
                        display: block !important;
                        margin-top: 10pt !important;
                        padding-top: 4pt !important;
                        border-top: 0.5pt solid #000 !important;
                        font-size: 8pt !important;
                        color: #555 !important;
                        text-align: right !important;
                    }
                }
            `}</style>

            {/* ===== WEB UI HEADER ===== */}
            <Box className="no-print" sx={{
                mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                maxWidth: 900, mx: 'auto'
            }}>
                <Box>
                    <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.15rem' }}>
                        ตัวอย่างรายงาน PDF
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                        รูปแบบเอกสารราชการ — ขนาด A4
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{
                        borderRadius: '10px', px: 3.5, py: 1.1,
                        fontWeight: 700, bgcolor: '#0f172a', textTransform: 'none',
                        '&:hover': { bgcolor: '#1e293b' }
                    }}
                >
                    พิมพ์ / บันทึก PDF
                </Button>
            </Box>

            {/* ===== REPORT PAPER ===== */}
            <Paper className="print-container" elevation={0} sx={{
                p: { xs: 3, md: 6 },
                bgcolor: '#fff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                maxWidth: 900,
                mx: 'auto',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                minHeight: '29.7cm'
            }}>

                {/* Document Header */}
                <Box className="doc-header" sx={{ textAlign: 'center', mb: 3, pb: 1.5, borderBottom: '2px solid #000' }}>
                    <Typography className="doc-title" sx={{ fontWeight: 800, fontSize: '1.3rem', color: '#000' }}>
                        รายงานสรุปผลการพิจารณาหมุนเวียนและแต่งตั้งบุคลากร
                    </Typography>
                    <Typography className="doc-subtitle" sx={{ fontSize: '1rem', color: '#333', mt: 0.5 }}>
                        ประจำปีงบประมาณ พ.ศ. {selectedYear}
                    </Typography>
                </Box>

                {/* Transfer Sections */}
                <Stack spacing={1.5}>
                    {columns.map((column, colIdx) => {
                        const items = column.itemIds.map(id => personnelMap[id]).filter(Boolean);
                        if (items.length === 0) return null;

                        const typeLabel =
                            column.chainType === 'swap' ? 'การสับเปลี่ยน' :
                                column.chainType === 'three-way' ? 'การหมุนเวียนสามเส้า' :
                                    column.chainType === 'promotion' ? 'การเลื่อนตำแหน่ง' : 'การโอนย้าย';

                        return (
                            <Box key={column.id} sx={{ pageBreakInside: 'avoid' }}>
                                {/* Section Header */}
                                <Box className="section-header" sx={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                    border: '1px solid #999', borderBottom: 'none', px: 1, py: 0.5
                                }}>
                                    <Typography className="section-num" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                        {colIdx + 1}. {column.title}
                                    </Typography>
                                    <Typography className="section-type" sx={{ fontSize: '0.75rem', color: '#555' }}>
                                        {typeLabel}
                                    </Typography>
                                </Box>

                                {/* Table */}
                                <TableContainer component={Box} sx={{ border: 'none' }}>
                                    <Table size="small" className="report-table" sx={{
                                        border: '1px solid #999',
                                        borderCollapse: 'collapse',
                                        tableLayout: 'fixed',
                                        width: '100%'
                                    }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{
                                                    width: '46%', fontWeight: 700, fontSize: '0.78rem',
                                                    border: '1px solid #999', py: 0.4, px: 0.8
                                                }}>
                                                    บุคลากร / ตำแหน่งเดิม
                                                </TableCell>
                                                <TableCell className="arrow-col" sx={{
                                                    width: 30, border: '1px solid #999', p: 0, textAlign: 'center'
                                                }} />
                                                <TableCell sx={{
                                                    fontWeight: 700, fontSize: '0.78rem',
                                                    border: '1px solid #999', py: 0.4, px: 0.8
                                                }}>
                                                    ตำแหน่งใหม่ / สังกัด
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {items.map((person, idx) => {
                                                let targetPos = person.toPosition || '-';
                                                let targetUnit = person.toUnit || '-';

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
                                                    <TableRow key={`${person.id}-${idx}`}>
                                                        <TableCell sx={{ border: '1px solid #999', py: 0.6, px: 0.8, verticalAlign: 'top' }}>
                                                            <Typography className="cell-name" sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>
                                                                {person.rank ? `${person.rank} ` : ''}{person.fullName}
                                                            </Typography>
                                                            <Typography className="cell-detail" sx={{ fontSize: '0.78rem', color: '#222' }}>
                                                                {person.position || '-'}
                                                            </Typography>
                                                            <Typography className="cell-unit" sx={{ fontSize: '0.72rem', color: '#555' }}>
                                                                {person.unit || '-'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell className="arrow-col" sx={{
                                                            border: '1px solid #999', p: 0,
                                                            textAlign: 'center', verticalAlign: 'middle', width: 30
                                                        }}>
                                                            <ArrowForwardIcon className="no-print" sx={{ fontSize: 14, color: '#aaa' }} />
                                                        </TableCell>
                                                        <TableCell sx={{ border: '1px solid #999', py: 0.6, px: 0.8, verticalAlign: 'top' }}>
                                                            <Typography className="cell-name" sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>
                                                                {targetPos}
                                                            </Typography>
                                                            <Typography className="cell-unit" sx={{ fontSize: '0.72rem', color: '#555' }}>
                                                                {targetUnit}
                                                            </Typography>
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
                </Stack>

                {/* Print footer */}
                <Box className="print-footer" sx={{ display: 'none' }}>
                    พิมพ์เมื่อ: {printTime}
                </Box>
            </Paper>
        </Box>
    );
}
