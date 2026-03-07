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

    // Helper function to get type label from chainType or linkedTransactionType
    const getTypeLabel = (column: Column): string => {
        // ใช้ linkedTransactionType (swapType จริงจาก DB) ถ้ามี
        const swapType = column.linkedTransactionType || column.chainType;

        switch (swapType) {
            case 'two-way':
            case 'swap':
                return 'สลับตำแหน่ง';
            case 'three-way':
                return 'สามเส้า';
            case 'promotion-chain':
            case 'promotion':
                return 'การเลื่อนตำแหน่ง';
            case 'transfer':
                return 'การโอนย้าย';
            case 'custom':
                return 'อื่นๆ';
            default:
                return '-';
        }
    };

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
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');

                /* ===== Minimal Professional Design ===== */
                .print-container {
                    font-family: "Sarabun", sans-serif !important;
                    font-size: 9pt !important;
                    color: #1a1a1a !important;
                    line-height: 1.4 !important;
                    background-color: white !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                .print-container * {
                    box-sizing: border-box !important;
                    font-family: "Sarabun", sans-serif !important;
                }

                /* Document header - Minimal & Clean */
                .print-container .doc-header {
                    text-align: left !important;
                    margin-bottom: 16pt !important;
                    padding-bottom: 8pt !important;
                    border-bottom: 1.5pt solid #1a1a1a !important;
                }

                .print-container .doc-title {
                    font-size: 13pt !important;
                    font-weight: 600 !important;
                    line-height: 1.2 !important;
                    margin: 2pt 0 3pt 0 !important;
                    color: #1a1a1a !important;
                    letter-spacing: -0.02em !important;
                }

                .print-container .doc-subtitle {
                    font-size: 9.5pt !important;
                    font-weight: 300 !important;
                    line-height: 1.3 !important;
                    margin: 0 !important;
                    color: #666 !important;
                }

                /* Section header - Minimal */
                .print-container .section-header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: baseline !important;
                    padding: 4pt 0 3pt 0 !important;
                    margin-top: 10pt !important;
                    margin-bottom: 4pt !important;
                    border-bottom: 0.75pt solid #e0e0e0 !important;
                    page-break-after: avoid !important;
                    page-break-inside: avoid !important;
                    background-color: transparent !important;
                }

                .print-container .section-num {
                    font-size: 10pt !important;
                    font-weight: 500 !important;
                    color: #1a1a1a !important;
                    letter-spacing: -0.01em !important;
                }

                .print-container .section-type {
                    font-size: 8pt !important;
                    font-weight: 400 !important;
                    color: #333 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                }

                .print-container .print-sections {
                    display: block !important;
                }

                .print-container .print-section {
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                }

                /* Table - Clean & Borderless */
                .print-container .report-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    table-layout: fixed !important;
                    background-color: white !important;
                    margin-bottom: 6pt !important;
                }

                .print-container .MuiTableContainer-root {
                    overflow: visible !important;
                }

                .print-container .report-table th {
                    font-size: 8pt !important;
                    font-weight: 500 !important;
                    padding: 4pt 8pt !important;
                    text-align: left !important;
                    background-color: #f8f8f8 !important;
                    color: #000 !important;
                    border: none !important;
                    border-bottom: 0.75pt solid #e0e0e0 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.03em !important;
                }

                .print-container .report-table td {
                    font-size: 9pt !important;
                    padding: 6pt 8pt !important;
                    border: none !important;
                    border-bottom: 0.5pt solid #f0f0f0 !important;
                    vertical-align: top !important;
                    background-color: white !important;
                }
                
                .print-container .report-table tr {
                    page-break-inside: avoid !important;
                }

                .print-container .report-table tbody tr:last-child td {
                    border-bottom: none !important;
                }

                .print-container .cell-name {
                    font-size: 9.5pt !important;
                    font-weight: 500 !important;
                    line-height: 1.3 !important;
                    color: #000 !important;
                    margin-bottom: 2pt !important;
                    display: block !important;
                }

                .print-container .cell-detail {
                    font-size: 8.5pt !important;
                    font-weight: 300 !important;
                    color: #000 !important;
                    line-height: 1.3 !important;
                    margin-bottom: 1pt !important;
                    display: block !important;
                }

                .print-container .cell-unit {
                    font-size: 8pt !important;
                    font-weight: 300 !important;
                    color: #000 !important;
                    display: block !important;
                }

                .print-container .arrow-col {
                    width: 24pt !important;
                    text-align: center !important;
                    vertical-align: middle !important;
                    padding: 0 !important;
                    border: none !important;
                    border-bottom: 0.5pt solid #f0f0f0 !important;
                }

                .print-container .arrow-col::after {
                    content: '→';
                    font-size: 12pt !important;
                    color: #000 !important;
                    font-weight: 300 !important;
                }

                /* Footer - Minimal */
                .print-container .print-footer {
                    margin-top: 16pt !important;
                    padding-top: 6pt !important;
                    border-top: 0.75pt solid #e0e0e0 !important;
                    font-size: 7pt !important;
                    font-weight: 300 !important;
                    color: #000 !important;
                    text-align: right !important;
                }

                /* ===== Print-only rules ===== */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 1.5cm 2cm;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    .print-container,
                    .print-container * {
                        visibility: visible !important;
                    }

                    html,
                    body,
                    #__next {
                        height: auto !important;
                        overflow: visible !important;
                    }

                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    .MuiDialog-root,
                    .MuiDialog-container,
                    .MuiDialog-paper,
                    .MuiDialog-paperFullScreen,
                    .MuiDialogContent-root {
                        position: static !important;
                        overflow: visible !important;
                        max-height: none !important;
                        height: auto !important;
                    }

                    /* Hide web UI */
                    .no-print,
                    .MuiButton-root,
                    .MuiSvgIcon-root {
                        display: none !important;
                    }

                    .print-container {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        min-height: unset !important;
                    }

                    .print-container .doc-header {
                        margin-top: 0 !important;
                    }
                    
                    .print-container .print-footer {
                        display: block !important;
                    }

                    /* Ensure clean page breaks */
                    .section-header {
                        page-break-after: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    .print-sections,
                    .print-section {
                        display: block !important;
                    }

                    .report-table tr {
                        page-break-inside: avoid !important;
                        page-break-after: auto !important;
                    }
                    
                    .report-table thead {
                        display: table-header-group !important;
                    }
                }
            `}</style>

            {/* ===== WEB UI HEADER ===== */}
            <Box className="no-print" sx={{
                mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                maxWidth: 900, mx: 'auto'
            }}>
                <Box>
                    <Typography sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '1.25rem', mb: 0.5 }}>
                        รายงานสรุปการหมุนเวียนบุคลากร
                    </Typography>

                </Box>
                <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{
                        borderRadius: '8px', px: 4, py: 1.2,
                        fontWeight: 500, bgcolor: '#1a1a1a', textTransform: 'none',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#333', boxShadow: 'none' }
                    }}
                >
                    Export PDF
                </Button>
            </Box>

            {/* ===== REPORT PAPER ===== */}
            <Paper className="print-container" elevation={0} sx={{
                p: { xs: 3, md: 5 },
                bgcolor: '#fff',
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                maxWidth: 900,
                mx: 'auto',
                boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
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
                <Stack spacing={0.5} className="print-sections">
                    {columns.map((column, colIdx) => {
                        const items = column.itemIds.map(id => personnelMap[id]).filter(Boolean);
                        if (items.length === 0) return null;

                        const typeLabel = getTypeLabel(column);

                        return (
                            <Box key={column.id} className="print-section">
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

                                                // Get posCode info
                                                const currentPosCode = person.posCodeMaster
                                                    ? `${person.posCodeMaster.id} - ${person.posCodeMaster.name}`
                                                    : (person.posCodeId ? `${person.posCodeId}` : '');

                                                const targetPosCode = (() => {
                                                    if (column.chainType === 'swap' && items.length === 2) {
                                                        const other = items[idx === 0 ? 1 : 0];
                                                        return person.toPosCodeMaster
                                                            ? `${person.toPosCodeMaster.id} - ${person.toPosCodeMaster.name}`
                                                            : (other.posCodeMaster
                                                                ? `${other.posCodeMaster.id} - ${other.posCodeMaster.name}`
                                                                : '');
                                                    } else if (column.chainType === 'three-way' && items.length === 3) {
                                                        const next = items[(idx + 1) % 3];
                                                        return person.toPosCodeMaster
                                                            ? `${person.toPosCodeMaster.id} - ${person.toPosCodeMaster.name}`
                                                            : (next.posCodeMaster
                                                                ? `${next.posCodeMaster.id} - ${next.posCodeMaster.name}`
                                                                : '');
                                                    } else if (column.chainType === 'promotion') {
                                                        if (idx === 0) {
                                                            return column.vacantPosition?.posCodeMaster
                                                                ? `${column.vacantPosition.posCodeMaster.id} - ${column.vacantPosition.posCodeMaster.name}`
                                                                : '';
                                                        } else {
                                                            const prev = items[idx - 1];
                                                            return prev.posCodeMaster
                                                                ? `${prev.posCodeMaster.id} - ${prev.posCodeMaster.name}`
                                                                : '';
                                                        }
                                                    }
                                                    return person.toPosCodeMaster
                                                        ? `${person.toPosCodeMaster.id} - ${person.toPosCodeMaster.name}`
                                                        : '';
                                                })();

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
                                                                {currentPosCode && ` | ${currentPosCode}`}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell className="arrow-col" />
                                                        <TableCell>
                                                            <Typography className="cell-name">
                                                                {targetPos}
                                                            </Typography>
                                                            <Typography className="cell-unit">
                                                                หน่วย: {targetUnit}
                                                                {targetPosCode && ` | ${targetPosCode}`}
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
