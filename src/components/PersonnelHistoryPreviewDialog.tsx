'use client';

import { useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { formatBuddhistDate } from '@/utils/dateFormat';
import { formatPositionNumber } from '@/utils/positionNumber';
import { getResolvedPersonNote, getResolvedPositionNote } from '@/utils/personnelNotes';

export interface PersonnelHistoryPreviewData {
  id: string;
  avatarUrl?: string;
  address?: string;
  noId?: string;
  phoneNumber?: string;
  posCodeId?: number;
  posCodeMaster?: {
    id: number;
    name: string;
  };
  position?: string;
  positionNumber?: string;
  unit?: string;
  rank?: string;
  fullName?: string;
  nationalId?: string;
  age?: string;
  seniority?: string;
  education?: string;
  birthDate?: string;
  lastAppointment?: string;
  currentRankSince?: string;
  enrollmentDate?: string;
  retirementDate?: string;
  yearsOfService?: string;
  actingAs?: string;
  trainingLocation?: string;
  trainingCourse?: string;
  notes?: string;
  positionNotes?: string;
  supporterName?: string;
  supportReason?: string;
  requestedPosition?: string;
}

interface PersonnelHistoryPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  personnel: PersonnelHistoryPreviewData | null;
}

const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const printStyles = `
  @font-face {
    font-family: 'Sarabun';
    src: url('/fonts/Sarabun-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Sarabun';
    src: url('/fonts/Sarabun-SemiBold.ttf') format('truetype');
    font-weight: 600;
    font-style: normal;
  }
  @font-face {
    font-family: 'Sarabun';
    src: url('/fonts/Sarabun-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  @page {
    size: A4;
    margin: 0;
  }
  body {
    margin: 0;
    font-family: "Sarabun", Tahoma, sans-serif;
    color: #111827;
    background: #f3f4f6;
  }
  .print-shell {
    padding: 24px;
    display: flex;
    justify-content: center;
  }
  .document-stack {
    width: 210mm;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .document-page {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    background: #ffffff;
    box-sizing: border-box;
    padding: 10mm 11mm 10mm;
    overflow: hidden;
  }
  .document-watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    opacity: 0.08;
  }
  .document-watermark img {
    width: 82%;
    max-width: 580px;
  }
  .document-page + .document-page {
    page-break-before: always;
    break-before: page;
  }
  .document-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-size: 10px;
    line-height: 1.3;
    margin-bottom: 4px;
  }
  .document-title {
    text-align: center;
    font-weight: 700;
    font-size: 20px;
    line-height: 1.2;
    letter-spacing: 0.1px;
    margin: 0 0 10px;
  }
  .document-subtitle {
    text-align: center;
    font-size: 10px;
    line-height: 1.35;
    margin-bottom: 8px;
  }
  .document-top-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 96px;
    gap: 12px;
    margin-bottom: 12px;
    padding-top: 8px;
  }
  .document-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 18px;
    font-size: 10px;
  }
  .document-summary-row {
    display: contents;
  }
  .document-field {
    display: flex;
    gap: 4px;
    line-height: 1.45;
    min-width: 0;
    align-items: baseline;
  }
  .document-label {
    white-space: nowrap;
    font-weight: 600;
    color: #111827;
  }
  .document-value {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    color: #1f2937;
  }
  .document-detail-stack {
    margin-top: 8px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 18px;
    font-size: 10px;
    padding-top: 6px;
    border-top: 1px solid rgba(107, 114, 128, 0.28);
  }
  .document-avatar {
    border: 1px solid #94a3b8;
    width: 90px;
    height: 112px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #f8fafc;
    margin-left: auto;
    padding: 3px;
    box-sizing: border-box;
  }
  .document-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .section-grid {
    display: grid;
    grid-template-columns: 56.5% 43.5%;
    gap: 10px;
    align-items: start;
  }
  .lower-grid {
    display: grid;
    grid-template-columns: 56.5% 43.5%;
    gap: 10px;
    align-items: start;
    margin-top: 10px;
  }
  .section-title {
    border: 1px solid #374151;
    border-bottom: none;
    text-align: center;
    font-weight: 700;
    padding: 4px 6px;
    font-size: 10.5px;
    line-height: 1.25;
    background: #f8fafc;
  }
  table.summary-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 9.35px;
    margin-bottom: 0;
  }
  table.summary-table th,
  table.summary-table td {
    border: 1px solid #4b5563;
    padding: 4px 5px 5px;
    vertical-align: top;
    word-break: break-word;
    line-height: 1.4;
  }
  table.summary-table th {
    background: #f8fafc;
    font-weight: 700;
    text-align: center;
  }
  .notes-box {
    border: 1px solid #4b5563;
    padding: 8px 9px;
    font-size: 9.7px;
    line-height: 1.5;
    min-height: 164px;
    background: rgba(255,255,255,0.82);
  }
  .notes-box p {
    margin: 0 0 4px;
  }
  .notes-box strong {
    font-size: 10.2px;
  }
  .muted {
    color: #4b5563;
  }
  .document-page-second {
    display: flex;
    flex-direction: column;
  }
  .document-page-second .document-title {
    font-size: 17px;
    margin-bottom: 4px;
  }
  .page-two-header {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: start;
    margin-bottom: 8px;
  }
  .page-two-title-wrap {
    text-align: center;
    padding-left: 62px;
  }
  .page-two-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    font-size: 10px;
    line-height: 1.2;
    min-width: 86px;
  }
  .page-two-name-row {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-size: 10px;
    line-height: 1.4;
    margin-bottom: 8px;
  }
  .page-divider {
    width: 100%;
    border-bottom: 1px solid #111827;
    margin: 0 0 12px;
  }
  .document-person-line {
    display: flex;
    justify-content: flex-start;
    gap: 10px;
    font-size: 10px;
    line-height: 1.45;
    margin-bottom: 10px;
  }
  .discipline-table-wrap {
    width: 57%;
    min-width: 320px;
    margin-bottom: 20px;
  }
  .discipline-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 9.4px;
  }
  .discipline-table th,
  .discipline-table td {
    border: 1px solid #6b7280;
    padding: 3px 4px;
    text-align: center;
    line-height: 1.35;
  }
  .discipline-table th {
    background: #ffffff;
    font-weight: 600;
  }
  .second-page-contact {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 36px;
    font-size: 10px;
    line-height: 1.45;
    margin-top: 18px;
    max-width: 68%;
  }
  .second-page-spacer {
    flex: 1;
    min-height: 0;
  }
  .second-page-footer {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    margin-top: auto;
    padding-top: 16px;
  }
  .fake-qr {
    width: 56px;
    height: 56px;
    border: 1px solid #111827;
    background:
      linear-gradient(90deg, #111 10%, transparent 10%) 0 0 / 8px 8px,
      linear-gradient(#111 10%, transparent 10%) 0 0 / 8px 8px,
      linear-gradient(90deg, transparent 50%, #111 50%) 0 0 / 12px 12px,
      linear-gradient(transparent 50%, #111 50%) 0 0 / 12px 12px,
      #fff;
    flex-shrink: 0;
  }
  .second-page-footer-text {
    font-size: 8.8px;
    line-height: 1.45;
    color: #374151;
  }
  @media print {
    body {
      background: #ffffff;
    }
    .print-shell {
      padding: 0;
    }
    .document-stack {
      gap: 0;
    }
    .document-page {
      box-shadow: none;
    }
  }
`;

function formatThaiFullDate(date = new Date()) {
  const day = date.getDate();
  const month = thaiMonthsShort[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

function safeText(value?: string | number | null) {
  if (value === null || value === undefined) return '-';
  const normalized = String(value).trim();
  return normalized || '-';
}

function buildServiceDurationText(yearsOfService?: string | null, age?: string | null) {
  if (yearsOfService && yearsOfService !== '-') return `${yearsOfService} ปี`;
  return age && age !== '-' ? `${age} ปี` : '-';
}

export default function PersonnelHistoryPreviewDialog({
  open,
  onClose,
  personnel,
}: PersonnelHistoryPreviewDialogProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);

  const personNote = useMemo(() => getResolvedPersonNote(personnel?.notes) || '-', [personnel?.notes]);
  const positionNote = useMemo(
    () => getResolvedPositionNote(personnel?.notes, personnel?.positionNotes) || '-',
    [personnel?.notes, personnel?.positionNotes]
  );

  const currentDateLabel = useMemo(() => formatThaiFullDate(new Date()), []);
  const currentThaiYear = useMemo(() => new Date().getFullYear() + 543, []);

  const summaryRows = useMemo(() => {
    if (!personnel) return [];

    return [
      [
        { label: 'ยศ ชื่อ สกุล', value: `${safeText(personnel.rank)} ${safeText(personnel.fullName)}`.trim() },
        { label: 'เลขบัตรประชาชน', value: safeText(personnel.nationalId) },
        { label: 'วันที่', value: currentDateLabel },
      ],
      [
        { label: 'เลขตำแหน่ง', value: safeText(formatPositionNumber(personnel.positionNumber)) },
        { label: 'ตำแหน่ง', value: safeText(personnel.position || personnel.posCodeMaster?.name) },
        { label: 'หน่วย', value: safeText(personnel.unit) },
      ],
      [
        { label: 'วันเดือนปีเกิด (ต.3)', value: safeText(formatBuddhistDate(personnel.birthDate)) },
        { label: 'วันเดือนปีเกิด (ต.2)', value: safeText(formatBuddhistDate(personnel.birthDate)) },
        { label: 'วันเดือนปีเกิด (ต.1)', value: safeText(formatBuddhistDate(personnel.birthDate)) },
      ],
      [
        { label: 'อายุ', value: personnel.age ? `${personnel.age} ปี` : '-' },
        { label: 'วันบรรจุเข้ารับราชการ', value: safeText(formatBuddhistDate(personnel.enrollmentDate)) },
        { label: 'อายุราชการรวม', value: buildServiceDurationText(personnel.yearsOfService, personnel.age) },
      ],
      [
        { label: 'วันบรรจุพนักงาน', value: '-' },
        { label: 'วันบรรจุเป็นประทวน', value: '-' },
        { label: 'วันบรรจุเป็นสัญญาบัตร', value: safeText(formatBuddhistDate(personnel.currentRankSince)) },
      ],
      [
        { label: 'อายุราชการชั้นพลฯ', value: '- ปี - เดือน' },
        { label: 'อายุราชการชั้นประทวน', value: '- ปี - เดือน' },
        { label: 'อายุราชการชั้นสัญญาบัตร', value: buildServiceDurationText(personnel.yearsOfService, personnel.age) },
      ],
      [
        { label: 'เป็นระดับ', value: safeText(personnel.posCodeMaster?.name) },
        { label: 'เมื่อ', value: safeText(formatBuddhistDate(personnel.currentRankSince)) },
        { label: 'แต่งตั้งครั้งสุดท้าย', value: safeText(formatBuddhistDate(personnel.lastAppointment)) },
      ],
      [
        { label: 'ปีเกษียณ พ.ศ.', value: safeText(formatBuddhistDate(personnel.retirementDate)) },
        { label: 'POSCODE', value: personnel.posCodeId ? `${personnel.posCodeId}` : '-' },
        { label: 'เลขอ้างอิง', value: safeText(personnel.id) },
      ],
    ];
  }, [personnel, currentDateLabel]);

  const detailRows = useMemo(() => {
    if (!personnel) return [];
    return [
      [
        { label: 'สถานภาพ', value: 'ประจำการ' },
      ],
      [
        { label: 'เงินเดือน', value: '-' },
        { label: 'ชั้น', value: safeText(personnel.posCodeMaster?.name) },
        { label: 'บัญชี', value: 'ปกติ' },
      ],
      [
        { label: 'เครื่องราชฯ ชั้นสูงสุด', value: '-' },
        { label: 'วันที่ผล', value: safeText(formatBuddhistDate(personnel.lastAppointment)) },
      ],
      [
        { label: 'คุณวุฒิรวม', value: safeText(personnel.education) },
      ],
      [
        { label: 'คุณวุฒิเพิ่ม', value: safeText(personnel.trainingLocation) },
      ],
      [
        { label: 'อบรมหลักสูตร', value: safeText(personnel.trainingCourse) },
      ],
    ];
  }, [personnel]);

  const positionHistoryRows = useMemo(() => {
    if (!personnel) return [];

    return [
      {
        date: safeText(formatBuddhistDate(personnel.lastAppointment)),
        position: safeText(personnel.position || personnel.posCodeMaster?.name),
        positionNumber: safeText(formatPositionNumber(personnel.positionNumber)),
        note: safeText(personnel.posCodeId ? `${personnel.posCodeId}` : '-'),
      },
      {
        date: safeText(formatBuddhistDate(personnel.currentRankSince)),
        position: safeText(personnel.actingAs || personnel.unit),
        positionNumber: safeText(formatPositionNumber(personnel.positionNumber)),
        note: '-',
      },
      {
        date: safeText(formatBuddhistDate(personnel.enrollmentDate)),
        position: safeText(personnel.requestedPosition || personnel.unit),
        positionNumber: '-',
        note: '-',
      },
    ].filter((row) => row.date !== '-' || row.position !== '-' || row.note !== '-');
  }, [personnel]);

  const salaryHistoryRows = useMemo(() => {
    if (!personnel) return [];
    return [
      {
        date: safeText(formatBuddhistDate(personnel.lastAppointment)),
        rank: safeText(personnel.rank),
        level: safeText(personnel.posCodeMaster?.name),
        salary: '-',
        bonus: '-',
        monthSalary: '-',
        status: 'ปกติ',
      },
      {
        date: safeText(formatBuddhistDate(personnel.currentRankSince)),
        rank: safeText(personnel.rank),
        level: safeText(personnel.actingAs),
        salary: '-',
        bonus: '-',
        monthSalary: '-',
        status: 'ปกติ',
      },
      {
        date: safeText(formatBuddhistDate(personnel.enrollmentDate)),
        rank: safeText(personnel.rank),
        level: '-',
        salary: '-',
        bonus: '-',
        monthSalary: '-',
        status: 'ปกติ',
      },
    ].filter((row) => row.date !== '-');
  }, [personnel]);

  const rankHistoryRows = useMemo(() => {
    if (!personnel) return [];

    return [
      { date: safeText(formatBuddhistDate(personnel.currentRankSince)), value: safeText(personnel.rank) },
      { date: safeText(formatBuddhistDate(personnel.lastAppointment)), value: 'แต่งตั้งครั้งสุดท้าย' },
      { date: safeText(formatBuddhistDate(personnel.enrollmentDate)), value: 'เริ่มรับราชการ' },
    ].filter((row) => row.date !== '-');
  }, [personnel]);

  const disciplineYears = useMemo(
    () => [currentThaiYear - 3, currentThaiYear - 2, currentThaiYear - 1, currentThaiYear],
    [currentThaiYear]
  );

  const disciplineRows = useMemo(
    () => [
      disciplineYears.map(() => ({ april: '0', october: '0' })),
      disciplineYears.map((year, index) => ({
        april: index === 0 && personnel?.seniority ? '1' : '0',
        october: year === currentThaiYear ? '-' : '0',
      })),
    ],
    [disciplineYears, personnel?.seniority, currentThaiYear]
  );

  const handleExportPdf = () => {
    if (!previewRef.current || !personnel) return;

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;

    const pageHtml = previewRef.current.outerHTML;

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>ประวัติราชการตำรวจ - ${safeText(personnel.fullName)}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="print-shell">
            ${pageHtml}
          </div>
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <VisibilityIcon fontSize="small" />
        <Box component="span" sx={{ fontWeight: 700 }}>
          Preview สรุปประวัติเจ้าหน้าที่
        </Box>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: '#f3f4f6', p: { xs: 1.5, md: 2.5 } }}>
        <style>{printStyles}</style>
        {personnel ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Paper
              elevation={3}
              sx={{
                width: '210mm',
                p: 0,
                position: 'relative',
                overflow: 'hidden',
                transformOrigin: 'top center',
                maxWidth: '100%',
              }}
            >
              <Box ref={previewRef} className="document-stack">
                <Box className="document-page">
                  <Box className="document-watermark">
                    <img src="/images/police_waterproof.png" alt="watermark" />
                  </Box>

                <Box className="document-header-top">
                  <Typography component="div" sx={{ fontSize: 'inherit', lineHeight: 'inherit' }}>หน้า 1</Typography>
                  <Typography component="div" sx={{ fontSize: 'inherit', lineHeight: 'inherit' }}>วันที่ {currentDateLabel}</Typography>
                </Box>

                <Typography className="document-title">ประวัติข้าราชการตำรวจ</Typography>

                <Box className="document-top-grid">
                  <Box>
                    <Box className="document-summary">
                      {summaryRows.map((row, rowIndex) => (
                        <Box key={`row-${rowIndex}`} className="document-summary-row">
                          {row.map((field, fieldIndex) => (
                            <Box key={`${field.label}-${fieldIndex}-${rowIndex}`} className="document-field">
                              {field.label ? <Box className="document-label">{field.label}</Box> : <Box className="document-label">&nbsp;</Box>}
                              <Box className="document-value">{field.value || '-'}</Box>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Box>

                    <Box className="document-detail-stack">
                      {detailRows.map((row, index) => (
                        <Box key={`detail-row-${index}`} className="document-summary-row">
                          {row.map((field, fieldIndex) => (
                            <Box key={`${field.label}-${fieldIndex}-${index}`} className="document-field">
                              <Box className="document-label">{field.label}</Box>
                              <Box className="document-value">{field.value}</Box>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box className="document-avatar">
                    {personnel.avatarUrl ? (
                      <img src={personnel.avatarUrl} alt={personnel.fullName || 'avatar'} />
                    ) : (
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
                        ไม่มีรูปภาพ
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box className="section-grid">
                  <Box>
                    <Box className="section-title">ประวัติการดำรงตำแหน่ง</Box>
                    <table className="summary-table">
                      <thead>
                        <tr>
                          <th style={{ width: '18%' }}>วันเดือนปี</th>
                          <th>ตำแหน่ง</th>
                          <th style={{ width: '22%' }}>เลขตำแหน่ง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positionHistoryRows.map((row, index) => (
                          <tr key={`${row.date}-${index}`}>
                            <td>{row.date}</td>
                            <td>{row.position}</td>
                            <td>{row.positionNumber !== '-' ? `${row.positionNumber}${row.note !== '-' ? ` / ${row.note}` : ''}` : row.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>

                  <Box>
                    <Box className="section-title">ประวัติการเลื่อนเงินเดือน</Box>
                    <table className="summary-table">
                      <thead>
                        <tr>
                          <th style={{ width: '16%' }}>พ.ศ.</th>
                          <th style={{ width: '16%' }}>รายชื่อ</th>
                          <th style={{ width: '10%' }}>ชั้น</th>
                          <th style={{ width: '18%' }}>เงินเดือน</th>
                          <th style={{ width: '12%' }}>ขั้นที่เลื่อน</th>
                          <th style={{ width: '12%' }}>เงินใช้เดือน</th>
                          <th style={{ width: '16%' }}>บัญชี</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryHistoryRows.map((row, index) => (
                          <tr key={`${row.date}-${index}`}>
                            <td>{row.date}</td>
                            <td>{row.rank}</td>
                            <td>{row.level}</td>
                            <td>{row.salary}</td>
                            <td>{row.bonus}</td>
                            <td>{row.monthSalary}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Box>

                <Box className="lower-grid">
                  <Box>
                    <Box className="section-title">ประวัติยศ</Box>
                    <table className="summary-table" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '18%' }}>วันเดือนปี</th>
                          <th>ได้รับยศ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankHistoryRows.map((row, index) => (
                          <tr key={`${row.date}-${index}`}>
                            <td>{row.date}</td>
                            <td>{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>

                  <Box>
                    <Box className="notes-box">
                      <p><strong>* คำร้อง/หมายเหตุ</strong></p>
                      <p>ตำแหน่งที่ร้องขอ: {safeText(personnel.requestedPosition)}</p>
                      <p>ผู้สนับสนุน: {safeText(personnel.supporterName)}</p>
                      <p>เหตุผลสนับสนุน: {safeText(personnel.supportReason)}</p>
                      <p>หมายเหตุตัวคน: {personNote}</p>
                      <p>หมายเหตุตำแหน่ง: {positionNote}</p>
                      <p className="muted">
                        เอกสารนี้เป็น preview สำหรับตรวจสอบรูปแบบก่อน export เป็น PDF
                        โดยใช้ข้อมูล snapshot จากระบบปัจจุบัน
                      </p>
                    </Box>
                  </Box>
                </Box>
                </Box>

                <Box className="document-page document-page-second">
                  <Box className="document-watermark">
                    <img src="/images/police_waterproof.png" alt="watermark" />
                  </Box>

                  <Box className="page-two-header">
                    <Box className="page-two-title-wrap">
                      <Typography className="document-title">ประวัติข้าราชการตำรวจ</Typography>
                    </Box>
                    <Box className="page-two-meta">
                      <Typography component="div" sx={{ fontSize: 'inherit', lineHeight: 'inherit' }}>หน้า 2</Typography>
                      <Typography component="div" sx={{ fontSize: 'inherit', lineHeight: 'inherit' }}>วันที่ {currentDateLabel}</Typography>
                    </Box>
                  </Box>

                  <Box className="page-two-name-row">
                    <Box className="document-label">ยศ ชื่อ สกุล</Box>
                    <Box className="document-value">{`${safeText(personnel.rank)} ${safeText(personnel.fullName)}`.trim()}</Box>
                  </Box>

                  <Box className="page-divider" />

                  <Box className="discipline-table-wrap">
                    <table className="discipline-table">
                      <thead>
                        <tr>
                          <th colSpan={8}>ชั้นย้อนหลัง 3 ปี</th>
                        </tr>
                        <tr>
                          {disciplineYears.map((year) => (
                            <th key={`year-${year}`} colSpan={2}>{year}</th>
                          ))}
                        </tr>
                        <tr>
                          {disciplineYears.flatMap((year) => ([
                            <th key={`${year}-apr`}>เม.ย.</th>,
                            <th key={`${year}-oct`}>ต.ค.</th>,
                          ]))}
                        </tr>
                      </thead>
                      <tbody>
                        {disciplineRows.map((row, rowIndex) => (
                          <tr key={`discipline-row-${rowIndex}`}>
                            {row.flatMap((cell, cellIndex) => ([
                              <td key={`discipline-${rowIndex}-${cellIndex}-apr`}>{cell.april}</td>,
                              <td key={`discipline-${rowIndex}-${cellIndex}-oct`}>{cell.october}</td>,
                            ]))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>

                  <Box className="second-page-contact">
                    <Box className="document-field">
                      <Box className="document-label">ที่อยู่</Box>
                      <Box className="document-value">{safeText(personnel.address)}</Box>
                    </Box>
                    <Box className="document-field">
                      <Box className="document-label">โทรศัพท์</Box>
                      <Box className="document-value">{safeText(personnel.phoneNumber)}</Box>
                    </Box>
                  </Box>

                  <Box className="second-page-spacer" />

                  <Box className="second-page-footer">
                    <Box className="fake-qr" />
                    <Box className="second-page-footer-text">
                      <div>police ID: {safeText(personnel.id)}</div>
                      <div>IP : xxx.xx.x.201</div>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
        ) : (
          <Typography color="text.secondary">ไม่พบข้อมูลเจ้าหน้าที่</Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          ปิด
        </Button>
        <Button onClick={handleExportPdf} variant="contained" startIcon={<PdfIcon />} disabled={!personnel}>
          Export PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
