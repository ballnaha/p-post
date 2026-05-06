import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import * as XLSX from '@e965/xlsx';

type ExcelRow = Record<string, any>;
type UploadType = 'personFile' | 'positionFile' | 'requestFile' | 'fullFile';
type UploadFiles = Partial<Record<UploadType, File>>;

function text(value: any): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function nationalIdText(value: any): string | null {
  const normalized = text(value);
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) return normalized;

  const compact = normalized.replace(/,/g, '');
  if (/^\d+(\.\d+)?e\+\d+$/i.test(compact)) {
    const parsed = Number(compact);
    if (Number.isFinite(parsed)) {
      return parsed.toFixed(0);
    }
  }

  return normalized.replace(/\D/g, '') || normalized;
}

function intValue(value: any): number | null {
  const normalized = text(value);
  if (!normalized) return null;
  const parsed = parseInt(normalized.replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function firstText(row: ExcelRow, columns: string[]): string | null {
  for (const column of columns) {
    const value = text(row[column]);
    if (value) return value;
  }
  return null;
}

function combineNotes(personNote: string | null, positionNote: string | null): string | null {
  const notes = [
    personNote ? `หมายเหตุตัวคน: ${personNote}` : null,
    positionNote ? `หมายเหตุตำแหน่ง: ${positionNote}` : null,
  ].filter(Boolean);

  return notes.length > 0 ? notes.join('\n') : null;
}

function mergePositionNote(existingNote: string | null, positionNote: string | null): string | null {
  if (!positionNote) return existingNote;

  const preservedNotes = existingNote
    ? existingNote
      .split('\n')
      .filter((line) => !line.startsWith('หมายเหตุตำแหน่ง:'))
      .join('\n')
    : null;

  return [preservedNotes, `หมายเหตุตำแหน่ง: ${positionNote}`].filter(Boolean).join('\n');
}

function formatGregorianDate(day: number, month: number, year: number): string | null {
  if (!day || !month || !year) return null;

  const gregorianYear = year >= 2400 ? year - 543 : year;
  const normalizedDay = String(day).padStart(2, '0');
  const normalizedMonth = String(month).padStart(2, '0');

  return `${normalizedDay}/${normalizedMonth}/${gregorianYear}`;
}

function convertExcelDateToGregorian(value: any): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const normalized = value.trim();
    const dateParts = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

    if (dateParts) {
      return formatGregorianDate(
        parseInt(dateParts[1], 10),
        parseInt(dateParts[2], 10),
        parseInt(dateParts[3], 10)
      );
    }

    return normalized;
  }

  if (typeof value === 'number') {
    try {
      const excelDate = XLSX.SSF.parse_date_code(value);
      if (excelDate) {
        return formatGregorianDate(excelDate.d, excelDate.m, excelDate.y);
      }
    } catch (error) {
      console.error('Error converting Excel date:', error);
    }
  }

  return text(value);
}

function convertRetirementToGregorian(value: any): string | null {
  const normalized = text(value);
  if (!normalized) return null;

  const dateValue = convertExcelDateToGregorian(value);
  if (normalized.includes('/') || normalized.includes('-')) {
    return dateValue;
  }

  const digits = normalized.replace(/\D/g, '');
  if (!digits) return normalized;

  if (digits.length === 2) {
    const shortYear = parseInt(digits, 10);
    const buddhistYear = shortYear >= 50 ? 2500 + shortYear : 2600 + shortYear;
    return String(buddhistYear - 543);
  }

  if (digits.length === 4) {
    const year = parseInt(digits, 10);
    return String(year >= 2400 ? year - 543 : year);
  }

  return dateValue;
}

function parseGregorianDate(value?: string | null): Date | null {
  if (!value) return null;

  const parts = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!parts) return null;

  const day = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10);
  const year = parseInt(parts[3], 10);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateCompletedYears(startDateText?: string | null, asOf = new Date()): number | null {
  const startDate = parseGregorianDate(startDateText);
  if (!startDate || startDate > asOf) return null;

  let years = asOf.getFullYear() - startDate.getFullYear();
  const hasNotReachedAnniversary =
    asOf.getMonth() < startDate.getMonth() ||
    (asOf.getMonth() === startDate.getMonth() && asOf.getDate() < startDate.getDate());

  if (hasNotReachedAnniversary) years--;

  return Math.max(years, 0);
}

function calculateYearMonthDuration(startDateText?: string | null, asOf = new Date()): string | null {
  const startDate = parseGregorianDate(startDateText);
  if (!startDate || startDate > asOf) return null;

  let years = asOf.getFullYear() - startDate.getFullYear();
  let months = asOf.getMonth() - startDate.getMonth();

  if (asOf.getDate() < startDate.getDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  years = Math.max(years, 0);
  months = Math.max(months, 0);

  return months > 0 ? `${years}ป.${months}ด.` : `${years}ป.`;
}

async function readExcel(file: File): Promise<ExcelRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: false,
    raw: false,
  });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: null,
  }) as ExcelRow[];
}

function assertColumns(rows: ExcelRow[], requiredColumns: string[], fileLabel: string) {
  if (rows.length === 0) {
    throw new Error(`ไม่พบข้อมูลในไฟล์${fileLabel}`);
  }

  const firstRow = rows[0];
  const missingColumns = requiredColumns.filter((column) => !(column in firstRow));

  if (missingColumns.length > 0) {
    throw new Error(`ไฟล์${fileLabel}ไม่มีคอลัมน์ที่จำเป็น: ${missingColumns.join(', ')}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const username = (session?.user as { username?: string } | undefined)?.username || 'system';

    const formData = await request.formData();
    const uploadType = formData.get('uploadType') as UploadType | null;
    const files = {
      fullFile: formData.get('fullFile') as File | null,
      personFile: formData.get('personFile') as File | null,
      positionFile: formData.get('positionFile') as File | null,
      requestFile: formData.get('requestFile') as File | null,
    };
    const yearParam = formData.get('year') as string | null;
    const selectedFiles = Object.entries(files).filter((entry): entry is [UploadType, File] => {
      const [key, file] = entry;
      return Boolean(file && (!uploadType || key === uploadType));
    });

    if (selectedFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกไฟล์ Excel อย่างน้อย 1 ไฟล์' },
        { status: 400 }
      );
    }

    const currentBuddhistYear = new Date().getFullYear() + 543;
    const importYear = yearParam ? parseInt(yearParam, 10) : currentBuddhistYear;

    const importJob = await prisma.importJob.create({
      data: {
        year: importYear,
        importMode: uploadType || 'bundle',
        status: 'pending',
        fileName: selectedFiles.map(([, file]) => file.name).join(' | '),
        fileSize: selectedFiles.reduce((sum, [, file]) => sum + file.size, 0),
        createdBy: username,
      },
    });

    processImportBundleJob(importJob.id, Object.fromEntries(selectedFiles) as UploadFiles, importYear, username).catch((error) => {
      console.error(`[Import Bundle] Background job ${importJob.id} failed:`, error);
    });

    return NextResponse.json({
      success: true,
      jobId: importJob.id,
      message: selectedFiles.length === 1
        ? 'เริ่มการนำเข้าข้อมูลไฟล์นี้ในพื้นหลัง'
        : 'เริ่มการนำเข้าข้อมูลหลายไฟล์ในพื้นหลัง',
    });
  } catch (error: any) {
    console.error('Import Bundle API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาด',
      },
      { status: 500 }
    );
  }
}

async function processImportBundleJob(
  jobId: string,
  files: UploadFiles,
  importYear: number,
  username: string
) {
  const errors: string[] = [];
  let success = 0;
  let failed = 0;
  let updated = 0;
  let processed = 0;

  try {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    const fullRows = files.fullFile ? await readExcel(files.fullFile) : [];
    const personRows = files.personFile ? await readExcel(files.personFile) : fullRows;
    const positionRows = files.positionFile ? await readExcel(files.positionFile) : [];
    const requestRows = files.requestFile ? await readExcel(files.requestFile) : [];

    if (files.fullFile) {
      assertColumns(fullRows, [
        'อาวุโส',
        'ยศ',
        'ชื่อ สกุล',
        'เลขประจำตัวประชาชน',
        'แต่งตั้งครั้งสุดท้าย',
        'ระดับนี้เมื่อ',
        'บรรจุ',
        'วันเกิด',
        'คุณวุฒิ',
        'เกษียณ',
        'จำนวนปี',
        'อายุ',
        'ตท.',
        'นรต.',
        'หมายเหตุตัวคน',
        'POSCODE',
        'ตำแหน่ง',
        'เลขตำแหน่ง',
        'ทำหน้าที่',
        'หน่วย',
        'หมายเหตุตำแหน่ง',
        'ตำแหน่งที่ร้องขอ',
        'ชื่อผู้สนับสนุน',
        'เหตุผลที่สนันสุนน',
      ], 'ข้อมูลแบบสมบูรณ์');
    }
    if (files.personFile) assertColumns(personRows, ['เลขประจำตัวประชาชน', 'เลขตำแหน่ง'], 'ข้อมูลบุคคล');
    if (files.positionFile) assertColumns(positionRows, ['POSCODE', 'ตำแหน่ง', 'เลขตำแหน่ง'], 'ข้อมูลตำแหน่ง');
    if (files.requestFile) assertColumns(requestRows, ['เลขประจำตัวประชาชน', 'ตำแหน่งที่ร้องขอ'], 'ข้อมูลคำร้อง');

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        totalRows: personRows.length > 0
          ? personRows.length
          : positionRows.length + requestRows.length,
      },
    });

    const posCodeCount = await prisma.posCodeMaster.count();
    if (posCodeCount === 0) {
      throw new Error('กรุณาเพิ่มข้อมูล POS Code Master ในระบบก่อน');
    }

    const updateJobProgress = async () => {
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          processedRows: processed,
          successRows: success,
          failedRows: failed,
          updatedRows: updated,
          errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null,
        },
      });
    };

    const positionMap = new Map<string, ExcelRow>();
    if (personRows.length > 0) {
      positionRows.forEach((row, index) => {
        const positionNumber = text(row['เลขตำแหน่ง']);
        if (!positionNumber) {
          errors.push(`ไฟล์ตำแหน่ง แถวที่ ${index + 2}: ไม่พบเลขตำแหน่ง`);
          failed++;
          return;
        }
        positionMap.set(positionNumber, row);
      });
    }

    const requestMap = new Map<string, ExcelRow>();
    if (personRows.length > 0) {
      requestRows.forEach((row, index) => {
        const nationalId = nationalIdText(row['เลขประจำตัวประชาชน']);
        if (!nationalId) {
          errors.push(`ไฟล์คำร้อง แถวที่ ${index + 2}: ไม่พบเลขประจำตัวประชาชน`);
          failed++;
          return;
        }
        requestMap.set(nationalId, row);
      });
    }

    const batchSize = 300;

    if (personRows.length > 0) {
      const totalBatches = Math.ceil(personRows.length / batchSize);
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, personRows.length);
      const batchRows = personRows.slice(startIndex, endIndex);

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < batchRows.length; i++) {
          const row = batchRows[i];
          const rowNumber = startIndex + i + 2;

          try {
            const nationalId = nationalIdText(row['เลขประจำตัวประชาชน']);
            const positionNumber = text(row['เลขตำแหน่ง']);

            if (!nationalId) {
              failed++;
              errors.push(`ไฟล์ข้อมูลบุคคล แถวที่ ${rowNumber}: ไม่พบเลขประจำตัวประชาชน`);
              continue;
            }

            if (!positionNumber) {
              failed++;
              errors.push(`ไฟล์ข้อมูลบุคคล แถวที่ ${rowNumber}: ไม่พบเลขตำแหน่งสำหรับเชื่อมข้อมูลตำแหน่ง`);
              continue;
            }

            const positionRow = positionMap.get(positionNumber);
            const fullPositionRow = files.fullFile ? row : null;
            if (files.positionFile && !positionRow) {
              failed++;
              errors.push(`ไฟล์ข้อมูลบุคคล แถวที่ ${rowNumber}: ไม่พบเลขตำแหน่ง ${positionNumber} ในไฟล์ตำแหน่ง`);
              continue;
            }

            const requestRow = files.fullFile ? row : requestMap.get(nationalId);
            const personNote = text(row['หมายเหตุตัวคน']);
            const positionDataRow = positionRow || fullPositionRow;
            const positionNote = positionDataRow ? firstText(positionDataRow, ['หมายเหตุตำแหน่ง', 'หมายเหตุ']) : null;
            const birthDate = convertExcelDateToGregorian(row['วันเกิด']);
            const lastAppointment = convertExcelDateToGregorian(row['แต่งตั้งครั้งสุดท้าย']);
            const currentRankSince = convertExcelDateToGregorian(row['ระดับนี้เมื่อ']);
            const enrollmentDate = convertExcelDateToGregorian(row['บรรจุ']);
            const retirementDate = convertRetirementToGregorian(row['เกษียณ']);
            const calculatedAge = calculateCompletedYears(birthDate);
            const calculatedYearsInRank = calculateYearMonthDuration(currentRankSince);
            const importedPositionData = positionDataRow
              ? {
                posCodeId: intValue(positionDataRow['POSCODE']),
                position: text(positionDataRow['ตำแหน่ง']),
                actingAs: text(positionDataRow['ทำหน้าที่']),
                unit: text(positionDataRow['หน่วย']),
              }
              : null;
            const existingPositionRecord = !importedPositionData
              ? await tx.policePersonnel.findFirst({
                where: {
                  year: importYear,
                  isActive: true,
                  positionNumber,
                  nationalId: null,
                },
                select: {
                  id: true,
                  posCodeId: true,
                  position: true,
                  actingAs: true,
                  unit: true,
                  notes: true,
                },
              })
              : null;
            const existingPositionNote = existingPositionRecord?.notes
              ?.split('\n')
              .find((line) => line.startsWith('หมายเหตุตำแหน่ง:'))
              ?.replace('หมายเหตุตำแหน่ง:', '')
              .trim() || null;
            const personnelData: any = {
              year: importYear,
              isActive: true,
              seniority: text(row['อาวุโส']),
              rank: text(row['ยศ']),
              fullName: text(row['ชื่อ สกุล']),
              nationalId,
              positionNumber,
              posCodeId: importedPositionData?.posCodeId || existingPositionRecord?.posCodeId || null,
              position: importedPositionData?.position || existingPositionRecord?.position || null,
              actingAs: importedPositionData?.actingAs || existingPositionRecord?.actingAs || null,
              unit: importedPositionData?.unit || existingPositionRecord?.unit || null,
              notes: combineNotes(personNote, positionNote || existingPositionNote),
              age: text(row['อายุ']) || (calculatedAge !== null ? `${calculatedAge}ป.` : null),
              education: text(row['คุณวุฒิ'])?.substring(0, 5000),
              trainingLocation: text(row['ตท.']),
              trainingCourse: text(row['นรต.']),
              birthDate,
              lastAppointment,
              currentRankSince,
              enrollmentDate,
              retirementDate,
              yearsOfService: text(row['จำนวนปี']) || calculatedYearsInRank,
              requestedPosition: requestRow ? text(requestRow['ตำแหน่งที่ร้องขอ']) : null,
              supporterName: requestRow ? text(requestRow['ชื่อผู้สนับสนุน']) : null,
              supportReason: requestRow
                ? firstText(requestRow, ['เหตุผลที่สนันสุนน', 'เหตุผลที่สนับสนุน', 'เหตุผล'])?.substring(0, 5000)
                : null,
              createdBy: username,
              updatedBy: username,
            };

            Object.keys(personnelData).forEach((key) => {
              if (personnelData[key] === undefined || personnelData[key] === null || personnelData[key] === '') {
                delete personnelData[key];
              }
            });

            const existing = await tx.policePersonnel.findUnique({
              where: {
                nationalId_year: {
                  nationalId,
                  year: importYear,
                },
              },
              select: { id: true },
            });

            if (existing) {
              await tx.policePersonnel.update({
                where: { id: existing.id },
                data: {
                  ...personnelData,
                  updatedBy: username,
                  updatedAt: new Date(),
                },
              });
              success++;
              updated++;
            } else if (existingPositionRecord) {
              await tx.policePersonnel.update({
                where: { id: existingPositionRecord.id },
                data: {
                  ...personnelData,
                  updatedBy: username,
                  updatedAt: new Date(),
                },
              });
              success++;
              updated++;
            } else {
              await tx.policePersonnel.create({
                data: personnelData,
              });
              success++;
            }
          } catch (error: any) {
            failed++;
            errors.push(`ไฟล์ข้อมูลบุคคล แถวที่ ${rowNumber}: ${error.message}`);
          }
        }
      }, {
        maxWait: 30000,
        timeout: 120000,
      });

        processed += batchRows.length;
        await updateJobProgress();
      }
    }

    if (positionRows.length > 0 && personRows.length === 0) {
      for (let index = 0; index < positionRows.length; index++) {
        const row = positionRows[index];
        const positionNumber = text(row['เลขตำแหน่ง']);

        if (!positionNumber) {
          failed++;
          errors.push(`ไฟล์ตำแหน่ง แถวที่ ${index + 2}: ไม่พบเลขตำแหน่ง`);
          processed++;
          continue;
        }

        const positionNote = firstText(row, ['หมายเหตุตำแหน่ง', 'หมายเหตุ']);
        const updateData: any = {
          posCodeId: intValue(row['POSCODE']),
          position: text(row['ตำแหน่ง']),
          actingAs: text(row['ทำหน้าที่']),
          unit: text(row['หน่วย']),
          updatedBy: username,
          updatedAt: new Date(),
        };

        Object.keys(updateData).forEach((key) => {
          if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
            delete updateData[key];
          }
        });

        const matchedPeople = await prisma.policePersonnel.findMany({
          where: { year: importYear, isActive: true, positionNumber },
          select: { id: true, notes: true },
        });

        if (matchedPeople.length > 0) {
          for (const person of matchedPeople) {
            await prisma.policePersonnel.update({
              where: { id: person.id },
              data: {
                ...updateData,
                notes: mergePositionNote(person.notes, positionNote),
              },
            });
          }
          success += matchedPeople.length;
          updated += matchedPeople.length;
        } else {
          await prisma.policePersonnel.create({
            data: {
              year: importYear,
              isActive: true,
              positionNumber,
              posCodeId: updateData.posCodeId,
              position: updateData.position,
              actingAs: updateData.actingAs,
              unit: updateData.unit,
              notes: positionNote ? `หมายเหตุตำแหน่ง: ${positionNote}` : undefined,
              createdBy: username,
              updatedBy: username,
            },
          });
          success++;
        }

        processed++;
        if (index % 100 === 0) await updateJobProgress();
      }
      await updateJobProgress();
    }

    if (requestRows.length > 0 && personRows.length === 0) {
      for (let index = 0; index < requestRows.length; index++) {
        const row = requestRows[index];
        const nationalId = nationalIdText(row['เลขประจำตัวประชาชน']);

        if (!nationalId) {
          failed++;
          errors.push(`ไฟล์คำร้อง แถวที่ ${index + 2}: ไม่พบเลขประจำตัวประชาชน`);
          processed++;
          continue;
        }

        const updateData: any = {
          requestedPosition: text(row['ตำแหน่งที่ร้องขอ']),
          supporterName: text(row['ชื่อผู้สนับสนุน']),
          supportReason: firstText(row, ['เหตุผลที่สนันสุนน', 'เหตุผลที่สนับสนุน', 'เหตุผล'])?.substring(0, 5000),
          updatedBy: username,
          updatedAt: new Date(),
        };

        Object.keys(updateData).forEach((key) => {
          if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
            delete updateData[key];
          }
        });

        const result = await prisma.policePersonnel.updateMany({
          where: { year: importYear, isActive: true, nationalId },
          data: updateData,
        });

        if (result.count > 0) {
          success += result.count;
          updated += result.count;
        } else {
          failed++;
          errors.push(`ไฟล์คำร้อง แถวที่ ${index + 2}: ไม่พบเลขประจำตัวประชาชน ${nationalId} ในปี ${importYear}`);
        }

        processed++;
        if (index % 100 === 0) await updateJobProgress();
      }
      await updateJobProgress();
    }

    const message = `นำเข้าข้อมูลปี ${importYear} สำเร็จ ${success} รายการ (อัปเดต ${updated} รายการ, ล้มเหลว ${failed} รายการ)`;

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        errorMessage: message,
      },
    });
  } catch (error: any) {
    console.error(`[Import Bundle] Job ${jobId} error:`, error);

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        failedRows: failed,
        errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null,
        errorMessage: error.message || 'เกิดข้อผิดพลาด',
      },
    });
  }
}
