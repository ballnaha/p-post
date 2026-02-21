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
        const originalTitle = document.title;
        document.title = `รายงานสรุปผลการพิจารณาหมุนเวียนและแต่งตั้งบุคลากร ประจำปี พ.ศ. ${selectedYear}`;
        window.print();
        document.title = originalTitle;
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

                /* ===== Shared Web & Print Rules ===== */
                .print-container {
                    font-family: "TH Sarabun New", "Sarabun", sans-serif !important;
                    font-size: 10pt !important;
                    color: #000 !important;
                    line-height: 1.2 !important;
                    background-color: white !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                .print-container * {
                    box-sizing: border-box !important;
                    font-family: "TH Sarabun New", "Sarabun", sans-serif !important;
                }

                /* Document header */
                .print-container .doc-header {
                    text-align: center !important;
                    margin-bottom: 12px !important;
                    padding-bottom: 6px !important;
                    border-bottom: 1.5px solid #000 !important;
                }

                .print-container .doc-title {
                    font-size: 1rem !important;
                    font-weight: 800 !important;
                    line-height: 1.5 !important;
                    margin: 0 !important;
                    padding-top: 4px !important;
                    color: #000 !important;
                }

                .print-container .doc-subtitle {
                    font-size: 0.85rem !important;
                    font-weight: 400 !important;
                    line-height: 1.5 !important;
                    margin-top: 2px !important;
                    color: #333 !important;
                }

                /* Section header */
                .print-container .section-header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: baseline !important;
                    border: 0.5pt solid #000 !important;
                    border-bottom: none !important;
                    padding: 2pt 4pt !important;
                    margin-top: 6pt !important;
                    page-break-after: avoid !important;
                    background-color: white !important;
                }

                .print-container .section-num {
                    font-size: 9.5pt !important;
                    font-weight: 700 !important;
                    color: #000 !important;
                }

                .print-container .section-type {
                    font-size: 8.5pt !important;
                    color: #333 !important;
                }

                /* Table */
                .print-container .report-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    border: 0.5pt solid #000 !important;
                    table-layout: fixed !important;
                    page-break-inside: avoid !important;
                    background-color: white !important;
                }

                .print-container .report-table th {
                    font-size: 8.5pt !important;
                    font-weight: 700 !important;
                    padding: 2pt 4pt !important;
                    border: 0.5pt solid #000 !important;
                    text-align: left !important;
                    background-color: white !important;
                    color: #000 !important;
                }

                .print-container .report-table td {
                    font-size: 9.5pt !important;
                    padding: 2pt 4pt !important;
                    border: 0.5pt solid #000 !important;
                    vertical-align: top !important;
                    background-color: white !important;
                }

                .print-container .cell-name {
                    font-size: 9.5pt !important;
                    font-weight: 700 !important;
                    line-height: 1.1 !important;
                    color: #000 !important;
                }

                .print-container .cell-detail {
                    font-size: 8.5pt !important;
                    color: #222 !important;
                }

                .print-container .cell-unit {
                    font-size: 8pt !important;
                    color: #444 !important;
                }

                .print-container .arrow-col {
                    width: 20pt !important;
                    text-align: center !important;
                    vertical-align: middle !important;
                    padding: 0 !important;
                    border: 0.5pt solid #000 !important;
                }

                .print-container .arrow-col::after {
                    content: '→';
                    font-size: 12pt !important;
                    color: #333 !important;
                }

                /* Footer */
                .print-container .print-footer {
                    margin-top: 6pt !important;
                    padding-top: 2pt !important;
                    border-top: 0.5pt solid #000 !important;
                    font-size: 7.5pt !important;
                    color: #555 !important;
                    text-align: right !important;
                }

                /* ===== Print-only rules ===== */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }

                    body {
                        margin: 0.8cm 0.8cm !important;
                        padding: 0 !important;
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
                    
                    .print-container .print-footer {
                        display: block !important;
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
                <Box className="doc-header">
                    <Typography className="doc-title">
                        รายงานสรุปผลการพิจารณาหมุนเวียนและแต่งตั้งบุคลากร
                    </Typography>
                    <Typography className="doc-subtitle">
                        ประจำปี พ.ศ. {selectedYear}
                    </Typography>
                </Box>

                {/* Transfer Sections */}
                <Stack spacing={0.5}>
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
                                <Box className="section-header">
                                    <Typography className="section-num">
                                        {colIdx + 1}. {column.title}
                                    </Typography>
                                    <Typography className="section-type">
                                        {typeLabel}
                                    </Typography>
                                </Box>

                                {/* Table */}
                                <TableContainer component={Box} sx={{ border: 'none' }}>
                                    <Table size="small" className="report-table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: '46%' }}>
                                                    บุคลากร / ตำแหน่งเดิม
                                                </TableCell>
                                                <TableCell className="arrow-col" />
                                                <TableCell>
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
                                                        <TableCell>
                                                            <Typography className="cell-name">
                                                                {person.rank ? `${person.rank} ` : ''}{person.fullName}
                                                            </Typography>
                                                            <Typography className="cell-detail">
                                                                {person.position || '-'}
                                                            </Typography>
                                                            <Typography className="cell-unit">
                                                                หน่วย: {person.unit || '-'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell className="arrow-col" />
                                                        <TableCell>
                                                            <Typography className="cell-name">
                                                                {targetPos}
                                                            </Typography>
                                                            <Typography className="cell-unit">
                                                                หน่วย: {targetUnit}
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
                <Box className="print-footer">
                    พิมพ์เมื่อ: {printTime}
                </Box>
            </Paper>
        </Box>
    );
}
