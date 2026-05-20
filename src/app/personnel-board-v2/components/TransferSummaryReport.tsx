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
import {
    Print as PrintIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { Column, Personnel } from '../types';

interface TransferSummaryReportProps {
    columns: Column[];
    personnelMap: Record<string, Personnel>;
    selectedYear: number;
}

interface ReportRow {
    id: string;
    order: number;
    typeLabel: string;
    group: string;
    currentName: string;
    currentNoId: string;
    currentPosition: string;
    currentPositionNumber: string;
    currentUnit: string;
    currentPosCode: string;
    targetPosition: string;
    targetPositionNumber: string;
    targetUnit: string;
    targetPosCode: string;
    supporter: string;
    note: string;
}

interface ReportSection {
    id: string;
    index: number;
    title: string;
    typeLabel: string;
    rows: ReportRow[];
}

const getTypeLabel = (column: Column): string => {
    const swapType = column.linkedTransactionType || column.chainType;

    switch (swapType) {
        case 'two-way':
        case 'swap':
            return 'สลับตำแหน่ง';
        case 'three-way':
            return 'วงสลับ';
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

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
};

const getPosCodeLabel = (master?: { id: number; name: string } | null, fallbackId?: number | null): string => {
    if (master) return `${master.id} - ${master.name}`;
    if (fallbackId) return `${fallbackId}`;
    return '-';
};

const getNoIdSortValue = (value: string): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const getSectionTypeOrder = (column: Column): number => {
    const swapType = column.linkedTransactionType || column.chainType;

    switch (swapType) {
        case 'promotion-chain':
        case 'promotion':
            return 1;
        case 'two-way':
        case 'swap':
            return 2;
        case 'three-way':
            return 3;
        case 'transfer':
            return 4;
        case 'custom':
            return 5;
        default:
            return 99;
    }
};

const getReportSections = (
    columns: Column[],
    personnelMap: Record<string, Personnel>,
): ReportSection[] => {
    const sections = columns.flatMap((column, colIdx) => {
        const items = column.itemIds.map((id) => personnelMap[id]).filter(Boolean);
        if (items.length === 0) {
            return [];
        }

        const sectionTypeLabel = getTypeLabel(column);
        const rows = items.map((person, idx) => {
            let targetPosition = person.toPosition || '-';
            let targetPositionNumber = person.toPositionNumber || '-';
            let targetUnit = person.toUnit || '-';
            let targetPosCodeMaster = person.toPosCodeMaster || null;
            let targetPosCodeId = person.toPosCodeId || null;

            if (column.chainType === 'swap' && items.length === 2) {
                const other = items[idx === 0 ? 1 : 0];
                targetPosition = person.toPosition || other.position || '-';
                targetPositionNumber = person.toPositionNumber || other.positionNumber || '-';
                targetUnit = person.toUnit || other.unit || '-';
                targetPosCodeMaster = person.toPosCodeMaster || other.posCodeMaster || null;
                targetPosCodeId = person.toPosCodeId || other.posCodeId || null;
            } else if (column.chainType === 'three-way' && items.length >= 3) {
                const next = items[(idx + 1) % items.length];
                targetPosition = person.toPosition || next.position || '-';
                targetPositionNumber = person.toPositionNumber || next.positionNumber || '-';
                targetUnit = person.toUnit || next.unit || '-';
                targetPosCodeMaster = person.toPosCodeMaster || next.posCodeMaster || null;
                targetPosCodeId = person.toPosCodeId || next.posCodeId || null;
            } else if (column.chainType === 'promotion') {
                if (idx === 0) {
                    targetPosition = column.vacantPosition?.position || '-';
                    targetPositionNumber = column.vacantPosition?.positionNumber || '-';
                    targetUnit = column.vacantPosition?.unit || '-';
                    targetPosCodeMaster = column.vacantPosition?.posCodeMaster || null;
                    targetPosCodeId = column.vacantPosition?.posCodeId || null;
                } else {
                    const prev = items[idx - 1];
                    targetPosition = prev.position || '-';
                    targetPositionNumber = prev.positionNumber || '-';
                    targetUnit = prev.unit || '-';
                    targetPosCodeMaster = prev.posCodeMaster || null;
                    targetPosCodeId = prev.posCodeId || null;
                }
            }

            const currentPosCode = getPosCodeLabel(person.posCodeMaster, person.posCodeId);
            const targetPosCode = getPosCodeLabel(targetPosCodeMaster, targetPosCodeId);
            const note = [
                person.requestedPosition ? `ร้องขอ: ${person.requestedPosition}` : '',
                person.supportReason ? `เหตุผล: ${person.supportReason}` : '',
                person.notes || '',
                person.positionNotes || '',
            ].filter(Boolean).join(' | ');

            return {
                id: `${person.id}-${idx}`,
                order: idx + 1,
                typeLabel: sectionTypeLabel,
                group: column.groupNumber || column.title || '-',
                currentName: `${person.rank ? `${person.rank} ` : ''}${person.fullName || '-'}`.trim(),
                currentNoId: formatValue(person.noId),
                currentPosition: formatValue(person.position),
                currentPositionNumber: formatValue(person.positionNumber),
                currentUnit: formatValue(person.unit),
                currentPosCode,
                targetPosition: formatValue(targetPosition),
                targetPositionNumber: formatValue(targetPositionNumber),
                targetUnit: formatValue(targetUnit),
                targetPosCode,
                supporter: formatValue(person.supporterName),
                note: note || '-',
            };
        });

        const sortedRows = rows
            .sort((a, b) => {
                const noIdDiff = getNoIdSortValue(a.currentNoId) - getNoIdSortValue(b.currentNoId);
                if (noIdDiff !== 0) return noIdDiff;
                return a.currentName.localeCompare(b.currentName, 'th');
            })
            .map((row, idx) => ({ ...row, order: idx + 1 }));

        return [{
            id: column.id,
            index: colIdx + 1,
            title: column.title,
            typeLabel: sectionTypeLabel,
            rows: sortedRows,
            typeOrder: getSectionTypeOrder(column),
            minNoId: sortedRows.length > 0 ? getNoIdSortValue(sortedRows[0].currentNoId) : Number.MAX_SAFE_INTEGER,
            originalIndex: colIdx,
        }];
    });

    return sections
        .sort((a, b) => {
            const typeDiff = (a as ReportSection & { typeOrder: number }).typeOrder - (b as ReportSection & { typeOrder: number }).typeOrder;
            if (typeDiff !== 0) return typeDiff;

            const noIdDiff = (a as ReportSection & { minNoId: number }).minNoId - (b as ReportSection & { minNoId: number }).minNoId;
            if (noIdDiff !== 0) return noIdDiff;

            return (a as ReportSection & { originalIndex: number }).originalIndex - (b as ReportSection & { originalIndex: number }).originalIndex;
        })
        .map((section, index) => ({
            id: section.id,
            index: index + 1,
            title: section.title,
            typeLabel: section.typeLabel,
            rows: section.rows,
        }));
};

export default function TransferSummaryReport({ columns, personnelMap, selectedYear }: TransferSummaryReportProps) {
    const [exportingExcel, setExportingExcel] = React.useState(false);
    const reportSections = getReportSections(columns, personnelMap);

    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = `รายงานสรุปผลการพิจารณาหมุนเวียนและแต่งตั้งบุคลากร ประจำปี พ.ศ. ${selectedYear}`;
        window.print();
        document.title = originalTitle;
    };

    const handleExportExcel = async () => {
        if (exportingExcel) return;

        setExportingExcel(true);

        try {
            const XLSX = await import('@e965/xlsx');
            const headers = [
                'ลำดับ',
                'ประเภท',
                'กลุ่ม/เลน',
                'ชื่อ-สกุล',
                'ตำแหน่งปัจจุบัน',
                'ลำดับตำแหน่ง',
                'เลขตำแหน่ง',
                'รหัสตำแหน่ง',
                'หน่วยเดิม',
                'ตำแหน่งใหม่',
                'เลขตำแหน่งใหม่',
                'รหัสตำแหน่งใหม่',
                'หน่วยใหม่',
                'ผู้สนับสนุน',
                'หมายเหตุ',
            ];
            const rows: Array<Array<string | number>> = [
                ['รายงานสรุปผลการพิจารณาหมุนเวียนและแต่งตั้งบุคลากร'],
                [`ประจำปี พ.ศ. ${selectedYear}`],
                [],
            ];
            const merges = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
            ];

            reportSections.forEach((section) => {
                const sectionRowIndex = rows.length;
                rows.push([`${section.index}. ${section.title} (${section.typeLabel})`]);
                merges.push({
                    s: { r: sectionRowIndex, c: 0 },
                    e: { r: sectionRowIndex, c: headers.length - 1 },
                });
                rows.push(headers);
                section.rows.forEach((row) => {
                    rows.push([
                        row.order,
                        row.typeLabel,
                        row.group,
                        row.currentName,
                        row.currentPosition,
                        row.currentNoId,
                        row.currentPositionNumber,
                        row.currentPosCode,
                        row.currentUnit,
                        row.targetPosition,
                        row.targetPositionNumber,
                        row.targetPosCode,
                        row.targetUnit,
                        row.supporter,
                        row.note,
                    ]);
                });
                rows.push([]);
            });

            const footerRowIndex = rows.length;
            rows.push([`พิมพ์เมื่อ: ${printTime}`]);
            merges.push({
                s: { r: footerRowIndex, c: 0 },
                e: { r: footerRowIndex, c: headers.length - 1 },
            });

            const worksheet = XLSX.utils.aoa_to_sheet(rows);
            worksheet['!merges'] = merges;
            worksheet['!cols'] = [
                { wch: 6 },
                { wch: 14 },
                { wch: 16 },
                { wch: 24 },
                { wch: 30 },
                { wch: 10 },
                { wch: 16 },
                { wch: 20 },
                { wch: 22 },
                { wch: 30 },
                { wch: 16 },
                { wch: 20 },
                { wch: 22 },
                { wch: 18 },
                { wch: 28 },
            ];
            worksheet['!pageSetup'] = {
                orientation: 'landscape',
                fitToWidth: 1,
                fitToHeight: 0,
            };

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานสรุป');
            const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
            const blob = new Blob(
                [buffer],
                { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            );
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `รายงานสรุปผลการพิจารณาหมุนเวียนและแต่งตั้งบุคลากร_${selectedYear}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting Excel report:', error);
            alert('เกิดข้อผิดพลาดในการ export Excel');
        } finally {
            setExportingExcel(false);
        }
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
                    font-size: 7pt !important;
                    color: #1a1a1a !important;
                    line-height: 1.3 !important;
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
                    margin-bottom: 12pt !important;
                    padding-bottom: 6pt !important;
                    border-bottom: 1.5pt solid #1a1a1a !important;
                }

                .print-container .doc-title {
                    font-size: 12pt !important;
                    font-weight: 600 !important;
                    line-height: 1.2 !important;
                    margin: 1pt 0 2pt 0 !important;
                    color: #1a1a1a !important;
                    letter-spacing: 0 !important;
                }

                .print-container .doc-subtitle {
                    font-size: 8.5pt !important;
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
                    padding: 3pt 0 2pt 0 !important;
                    margin-top: 8pt !important;
                    margin-bottom: 3pt !important;
                    border-bottom: 0.75pt solid #e0e0e0 !important;
                    page-break-after: avoid !important;
                    page-break-inside: avoid !important;
                    background-color: transparent !important;
                }

                .print-container .section-num {
                    font-size: 8.5pt !important;
                    font-weight: 500 !important;
                    color: #1a1a1a !important;
                    letter-spacing: 0 !important;
                }

                .print-container .section-type {
                    font-size: 7pt !important;
                    font-weight: 400 !important;
                    color: #333 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0 !important;
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
                    margin-bottom: 4pt !important;
                }

                .print-container .MuiTableContainer-root {
                    overflow: visible !important;
                }

                .print-container .report-table th {
                    font-size: 6.6pt !important;
                    font-weight: 500 !important;
                    padding: 3pt 3pt !important;
                    text-align: left !important;
                    background-color: #f8f8f8 !important;
                    color: #000 !important;
                    border: none !important;
                    border-bottom: 0.75pt solid #e0e0e0 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0 !important;
                }

                .print-container .report-table td {
                    font-size: 6.8pt !important;
                    padding: 3pt 3pt !important;
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
                    font-size: 7pt !important;
                    font-weight: 500 !important;
                    line-height: 1.2 !important;
                    color: #000 !important;
                    margin-bottom: 1pt !important;
                    display: block !important;
                }

                .print-container .cell-detail {
                    font-size: 6.8pt !important;
                    font-weight: 300 !important;
                    color: #000 !important;
                    line-height: 1.2 !important;
                    margin-bottom: 1pt !important;
                    display: block !important;
                }

                .print-container .cell-unit {
                    font-size: 6.6pt !important;
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
                    font-size: 9pt !important;
                    color: #000 !important;
                    font-weight: 300 !important;
                }

                /* Footer - Minimal */
                .print-container .print-footer {
                    margin-top: 12pt !important;
                    padding-top: 5pt !important;
                    border-top: 0.75pt solid #e0e0e0 !important;
                    font-size: 6.5pt !important;
                    font-weight: 300 !important;
                    color: #000 !important;
                    text-align: right !important;
                }

                /* ===== Print-only rules ===== */
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 1cm;
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
                maxWidth: 1320, mx: 'auto'
            }}>
                <Box>
                    <Typography sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '1.25rem', mb: 0.5 }}>
                        รายงานสรุปการหมุนเวียนบุคลากร
                    </Typography>

                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleExportExcel}
                        disabled={exportingExcel}
                        sx={{
                            borderRadius: '8px', px: 3, py: 1.2,
                            fontWeight: 500, color: '#1a1a1a', borderColor: '#d0d7de', textTransform: 'none',
                            '&:hover': { borderColor: '#9aa4af', bgcolor: '#f8fafc' }
                        }}
                    >
                        {exportingExcel ? 'กำลัง Export...' : 'Export Excel'}
                    </Button>
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
                </Stack>
            </Box>

            {/* ===== REPORT PAPER ===== */}
            <Paper className="print-container" elevation={0} sx={{
                p: { xs: 3, md: 5 },
                bgcolor: '#fff',
                borderRadius: '12px',
                border: '1px solid #e8e8e8',
                maxWidth: 1320,
                mx: 'auto',
                boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                minHeight: '21cm'
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
                    {reportSections.map((section) => {
                        return (
                            <Box key={section.id} className="print-section">
                                {/* Section Header */}
                                <Box className="section-header">
                                    <Typography className="section-num">
                                        {section.index}. {section.title}
                                    </Typography>
                                    <Typography className="section-type">
                                        {section.typeLabel}
                                    </Typography>
                                </Box>

                                {/* Table */}
                                <TableContainer component={Box} sx={{ border: 'none' }}>
                                    <Table size="small" className="report-table">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: '4%' }}>ลำดับ</TableCell>
                                                <TableCell sx={{ width: '8%' }}>ประเภท</TableCell>
                                                <TableCell sx={{ width: '8%' }}>กลุ่ม/เลน</TableCell>
                                                <TableCell sx={{ width: '13%' }}>ชื่อ-สกุล</TableCell>
                                                <TableCell sx={{ width: '13%' }}>ตำแหน่งปัจจุบัน</TableCell>
                                                <TableCell sx={{ width: '6%' }}>ลำดับตำแหน่ง</TableCell>
                                                <TableCell sx={{ width: '7%' }}>เลขตำแหน่ง</TableCell>
                                                <TableCell sx={{ width: '9%' }}>รหัสตำแหน่ง</TableCell>
                                                <TableCell sx={{ width: '10%' }}>หน่วยเดิม</TableCell>
                                                <TableCell sx={{ width: '13%' }}>ตำแหน่งใหม่</TableCell>
                                                <TableCell sx={{ width: '7%' }}>เลขตำแหน่งใหม่</TableCell>
                                                <TableCell sx={{ width: '9%' }}>รหัสตำแหน่งใหม่</TableCell>
                                                <TableCell sx={{ width: '10%' }}>หน่วยใหม่</TableCell>
                                                <TableCell sx={{ width: '8%' }}>ผู้สนับสนุน</TableCell>
                                                <TableCell sx={{ width: '12%' }}>หมายเหตุ</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {section.rows.map((row) => {
                                                return (
                                                    <TableRow key={row.id}>
                                                        <TableCell align="center">{row.order}</TableCell>
                                                        <TableCell>{row.typeLabel}</TableCell>
                                                        <TableCell>{row.group}</TableCell>
                                                        <TableCell>
                                                            <Typography className="cell-name">{row.currentName}</Typography>
                                                        </TableCell>
                                                        <TableCell>{row.currentPosition}</TableCell>
                                                        <TableCell align="center">{row.currentNoId}</TableCell>
                                                        <TableCell align="center">{row.currentPositionNumber}</TableCell>
                                                        <TableCell>{row.currentPosCode}</TableCell>
                                                        <TableCell>{row.currentUnit}</TableCell>
                                                        <TableCell>{row.targetPosition}</TableCell>
                                                        <TableCell align="center">{row.targetPositionNumber}</TableCell>
                                                        <TableCell>{row.targetPosCode}</TableCell>
                                                        <TableCell>{row.targetUnit}</TableCell>
                                                        <TableCell>{row.supporter}</TableCell>
                                                        <TableCell>{row.note}</TableCell>
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
