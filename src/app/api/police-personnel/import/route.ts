import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import * as XLSX from '@e965/xlsx';

// ฟังก์ชันสำหรับแปลง Excel Serial Number เป็นวันที่ไทย
function convertExcelDateToThai(value: any): string | null {
  if (!value) return null;

  // ถ้าเป็น string แล้วและมีรูปแบบวันที่ไทย ให้ return เลย
  if (typeof value === 'string' && value.includes('/')) {
    return value;
  }

  // ถ้าเป็น number (Excel Serial Number)
  if (typeof value === 'number') {
    try {
      // แปลง Excel Serial Number เป็น Date
      const excelDate = XLSX.SSF.parse_date_code(value);
      if (excelDate) {
        // แปลงเป็นรูปแบบไทย DD/MM/YYYY (ปี พ.ศ.)
        const day = String(excelDate.d).padStart(2, '0');
        const month = String(excelDate.m).padStart(2, '0');
        const year = excelDate.y + 543; // แปลงเป็น พ.ศ.
        return `${day}/${month}/${year}`;
      }
    } catch (error) {
      console.error('Error converting Excel date:', error);
    }
  }

  // ถ้าแปลงไม่ได้ ให้ return เป็น string
  return value ? String(value) : null;
}

// Helper function to create Server-Sent Events stream
function createProgressStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
  });

  const sendProgress = (data: any) => {
    if (controller) {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(message));
    }
  };

  const close = () => {
    if (controller) {
      controller.close();
    }
  };

  return { stream, sendProgress, close };
}

export async function POST(request: NextRequest) {
  try {
    // Get authentication
    const session = await getServerSession(authOptions);
    const username = session?.user?.username || 'system';

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const yearParam = formData.get('year') as string;

    // Parse year จาก form data (default = ปีปัจจุบัน พ.ศ.)
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const importYear = yearParam ? parseInt(yearParam) : currentBuddhistYear;

    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์' }, { status: 400 });
    }

    // สร้าง ImportJob
    const importJob = await prisma.importJob.create({
      data: {
        year: importYear,
        importMode: 'full',
        status: 'pending',
        fileName: file.name,
        fileSize: file.size,
        createdBy: username,
      }
    });

    console.log(`[Import] Created job ${importJob.id} for year: ${importYear}`);

    // Start background processing (don't await)
    processImportJob(importJob.id, file, importYear, username).catch(err => {
      console.error(`[Import] Background job ${importJob.id} failed:`, err);
    });

    // Return job ID ทันที
    return NextResponse.json({
      success: true,
      jobId: importJob.id,
      message: 'เริ่มการนำเข้าข้อมูลในพื้นหลัง'
    });

  } catch (error: any) {
    console.error('Import API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาด'
    }, { status: 500 });
  }
}

// Background processing function
async function processImportJob(jobId: string, file: File, importYear: number, username: string) {
  try {
    // Update status to processing
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        startedAt: new Date()
      }
    });

    console.log(`[Import] Job ${jobId}: Started processing`);

    // อ่านไฟล์ Excel (อ่านเป็น formatted text เพื่อให้ได้วันที่ตามที่แสดงใน Excel)
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: false,
      raw: false  // ใช้ formatted text แทน raw value
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // แปลงเป็น JSON โดยรักษาค่าที่แสดงใน Excel
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,  // ไม่ใช้ raw value เพื่อให้ได้ formatted text
      defval: null
    });

    if (data.length === 0) {
      throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
    }

    // ตรวจสอบจำนวนคอลัมน์ในไฟล์
    const firstRow: any = data[0];
    const columnCount = Object.keys(firstRow).length;

    if (columnCount < 10) {
      throw new Error(`ไฟล์นี้มีเพียง ${columnCount} คอลัมน์ ต้องมีอย่างน้อย 21 คอลัมน์`);
    }

    // ตรวจสอบว่ามี pos_code_master ในระบบหรือไม่
    const posCodeCount = await prisma.posCodeMaster.count();
    if (posCodeCount === 0) {
      throw new Error('กรุณาเพิ่มข้อมูล POS Code Master ในระบบก่อน');
    }

    // Update total rows
    await prisma.importJob.update({
      where: { id: jobId },
      data: { totalRows: data.length }
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      created: [] as any[],
      updated: 0,
      deleted: 0,
      totalProcessed: 0,
    };

    // ตรวจสอบว่ามีข้อมูลของปีนี้อยู่แล้วหรือไม่
    const existingRecordsCount = await prisma.policePersonnel.count({
      where: {
        year: importYear,
        isActive: true
      }
    });

    const isUpdateMode = existingRecordsCount > 0;
    console.log(`[Import] Job ${jobId}: ${isUpdateMode ? 'UPSERT' : 'INSERT'} mode (${existingRecordsCount} existing records)`);

    // นำเข้าข้อมูลแบบ batch เพื่อความเร็ว
    // ลด batch size ลงเพื่อป้องกัน connection timeout บน production
    const batchSize = 500; // ลดจาก 1000 เป็น 500 records ต่อ batch
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, data.length);
      const batchData = data.slice(startIndex, endIndex);

      try {
        // เตรียมข้อมูลทั้ง batch
        const personnelDataArray = batchData.map((row: any, index: number) => {
          try {
            const personnelData: any = {
              year: importYear,           // เพิ่มปี พ.ศ.
              isActive: true,             // เพิ่ม isActive (ข้อมูลใหม่เป็น active เสมอ)
              seniority: row['อาวุโส'] ? String(row['อาวุโส']) : null,
              rank: row['ยศ'] ? String(row['ยศ']) : null,
              fullName: row['ชื่อ สกุล'] ? String(row['ชื่อ สกุล']) : null,
              noId: row['ID'] ? parseInt(String(row['ID'])) : null,
              posCodeId: (row['POSCODE'] || row['ID/POSCODE']) ? parseInt(String(row['POSCODE'] || row['ID/POSCODE'])) : null,
              position: row['ตำแหน่ง'] ? String(row['ตำแหน่ง']) : null,
              positionNumber: row['เลขตำแหน่ง'] ? String(row['เลขตำแหน่ง']) : null,
              actingAs: row['ทำหน้าที่'] ? String(row['ทำหน้าที่']) : null,
              age: row['อายุ'] ? String(row['อายุ']) : null,
              education: row['คุณวุฒิ'] ? String(row['คุณวุฒิ']).substring(0, 5000) : null, // จำกัดความยาวไม่เกิน 5000 ตัวอักษร
              nationalId: row['เลขประจำตัวประชาชน'] ? String(row['เลขประจำตัวประชาชน']) : null,
              unit: row['หน่วย'] ? String(row['หน่วย']) : null,
              trainingLocation: row['ตท.'] ? String(row['ตท.']) : null,
              trainingCourse: row['นรต.'] ? String(row['นรต.']) : null,
              notes: row['หมายเหตุ/เงื่อนไข'] ? String(row['หมายเหตุ/เงื่อนไข']) : null,
              supporterName: row['ชื่อผู้สนับสนุน'] ? String(row['ชื่อผู้สนับสนุน']) : null,
              supportReason: row['เหตุผล'] ? String(row['เหตุผล']).substring(0, 5000) : null,
              birthDate: convertExcelDateToThai(row['วันเกิด']),
              lastAppointment: convertExcelDateToThai(row['แต่งตั้งครั้งสุดท้าย']),
              currentRankSince: convertExcelDateToThai(row['ระดับนี้เมื่อ']),
              enrollmentDate: convertExcelDateToThai(row['บรรจุ']),
              retirementDate: convertExcelDateToThai(row['เกษียณ']),
              yearsOfService: row['จำนวนปี'] ? String(row['จำนวนปี']) : null,
              requestedPosition: row['ตำแหน่งที่ร้องขอ'] ? String(row['ตำแหน่งที่ร้องขอ']) : null,
              createdBy: username,
              updatedBy: username,
            };

            // ลบค่า undefined/null ออก
            Object.keys(personnelData).forEach(key => {
              if (personnelData[key] === undefined || personnelData[key] === null || personnelData[key] === '') {
                delete personnelData[key];
              }
            });

            return personnelData;
          } catch (rowError: any) {
            results.failed++;
            results.errors.push(`แถวที่ ${startIndex + index + 2}: ${rowError.message}`);
            return null;
          }
        }).filter(data => data !== null);

        // บันทึกทั้ง batch โดยใช้ UPSERT (UPDATE หรือ INSERT)
        if (personnelDataArray.length > 0) {
          await prisma.$transaction(async (tx) => {
            if (isUpdateMode) {
              // UPDATE mode: ใช้ upsert แต่ละรายการ (ช้ากว่าแต่รักษา ID เดิม)
              for (const personnelData of personnelDataArray) {
                try {
                  if (personnelData.nationalId) {
                    // กรณีที่ 1: มีเลขบัตรประชาชน → UPSERT ด้วย nationalId + year
                    await tx.policePersonnel.upsert({
                      where: {
                        // ใช้ compound unique key (ต้องสร้าง unique index ใน schema)
                        nationalId_year: {
                          nationalId: personnelData.nationalId,
                          year: importYear
                        }
                      },
                      update: {
                        ...personnelData,
                        updatedBy: username,
                        updatedAt: new Date()
                      },
                      create: personnelData
                    });
                    results.success++;
                    results.updated++;
                  } else if (personnelData.positionNumber) {
                    // กรณีที่ 2: ไม่มีเลขบัตรประชาชน (ตำแหน่งว่าง) → ค้นหาด้วยเลขตำแหน่ง + ปี
                    const existingRecord = await tx.policePersonnel.findFirst({
                      where: {
                        positionNumber: personnelData.positionNumber,
                        year: importYear,
                        isActive: true,
                        nationalId: null // ต้องเป็นตำแหน่งว่าง
                      }
                    });

                    if (existingRecord) {
                      // UPDATE ข้อมูลเดิม
                      await tx.policePersonnel.update({
                        where: { id: existingRecord.id },
                        data: {
                          ...personnelData,
                          updatedBy: username,
                          updatedAt: new Date()
                        }
                      });
                      results.success++;
                      results.updated++;
                    } else {
                      // INSERT ข้อมูลใหม่
                      await tx.policePersonnel.create({
                        data: personnelData
                      });
                      results.success++;
                    }
                  } else if (personnelData.noId) {
                    // กรณีที่ 3: ไม่มีเลขบัตรและเลขตำแหน่ง แต่มี noId → ค้นหาด้วย noId + ปี
                    const existingRecord = await tx.policePersonnel.findFirst({
                      where: {
                        noId: personnelData.noId,
                        year: importYear,
                        isActive: true,
                        nationalId: null // ต้องเป็นตำแหน่งว่าง
                      }
                    });

                    if (existingRecord) {
                      // UPDATE ข้อมูลเดิม
                      await tx.policePersonnel.update({
                        where: { id: existingRecord.id },
                        data: {
                          ...personnelData,
                          updatedBy: username,
                          updatedAt: new Date()
                        }
                      });
                      results.success++;
                      results.updated++;
                    } else {
                      // INSERT ข้อมูลใหม่
                      await tx.policePersonnel.create({
                        data: personnelData
                      });
                      results.success++;
                    }
                  } else {
                    // กรณีที่ 4: ไม่มีทั้งเลขบัตร เลขตำแหน่ง และ noId → INSERT เท่านั้น
                    await tx.policePersonnel.create({
                      data: personnelData
                    });
                    results.success++;
                  }
                } catch (upsertError: any) {
                  console.error('Upsert error:', upsertError);
                  results.failed++;
                  const identifier = personnelData.nationalId || personnelData.positionNumber || personnelData.noId || 'unknown';
                  results.errors.push(`${identifier}: ${upsertError.message}`);
                }
              }
            } else {
              // INSERT mode: ใช้ createMany สำหรับความเร็ว
              const created = await tx.policePersonnel.createMany({
                data: personnelDataArray,
                skipDuplicates: true,
              });
              results.success += created.count;
            }
          }, {
            maxWait: 30000,
            timeout: 120000, // เพิ่ม timeout เป็น 120 วินาที (UPSERT ช้ากว่า)
          });
        }

        // Update progress in database
        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            processedRows: endIndex,
            successRows: results.success,
            failedRows: results.failed,
            updatedRows: results.updated,
            errors: results.errors.length > 0 ? JSON.stringify(results.errors.slice(0, 100)) : null
          }
        });

        console.log(`[Import] Job ${jobId}: Batch ${batchIndex + 1}/${totalBatches} completed (${endIndex}/${data.length})`);

        // Delay เล็กน้อย
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError: any) {
        console.error(`Error in batch ${batchIndex + 1}:`, batchError);
        // หากทั้ง batch ล้มเหลว ให้ลองทีละรายการ (fallback)
        for (let i = 0; i < batchData.length; i++) {
          const row: any = batchData[i];
          try {
            const personnelData: any = {
              year: importYear,
              isActive: true,
              seniority: row['อาวุโส'] ? String(row['อาวุโส']) : null,
              rank: row['ยศ'] ? String(row['ยศ']) : null,
              fullName: row['ชื่อ สกุล'] ? String(row['ชื่อ สกุล']) : null,
              noId: row['ID'] ? parseInt(String(row['ID'])) : null,
              posCodeId: row['ID/POSCODE'] ? parseInt(String(row['ID/POSCODE'])) : null,
              position: row['ตำแหน่ง'] ? String(row['ตำแหน่ง']) : null,
              positionNumber: row['เลขตำแหน่ง'] ? String(row['เลขตำแหน่ง']) : null,
              actingAs: row['ทำหน้าที่'] ? String(row['ทำหน้าที่']) : null,
              age: row['อายุ'] ? String(row['อายุ']) : null,
              education: row['คุณวุฒิ'] ? String(row['คุณวุฒิ']).substring(0, 5000) : null, // จำกัดความยาวไม่เกิน 5000 ตัวอักษร
              nationalId: row['เลขประจำตัวประชาชน'] ? String(row['เลขประจำตัวประชาชน']) : null,
              unit: row['หน่วย'] ? String(row['หน่วย']) : null,
              trainingLocation: row['ตท.'] ? String(row['ตท.']) : null,
              trainingCourse: row['นรต.'] ? String(row['นรต.']) : null,
              notes: row['หมายเหตุ/เงื่อนไข'] ? String(row['หมายเหตุ/เงื่อนไข']) : null,
              supporterName: row['ชื่อผู้สนับสนุน'] ? String(row['ชื่อผู้สนับสนุน']) : null,
              supportReason: row['เหตุผล'] ? String(row['เหตุผล']).substring(0, 5000) : null,
              birthDate: convertExcelDateToThai(row['วันเกิด']),
              lastAppointment: convertExcelDateToThai(row['แต่งตั้งครั้งสุดท้าย']),
              currentRankSince: convertExcelDateToThai(row['ระดับนี้เมื่อ']),
              enrollmentDate: convertExcelDateToThai(row['บรรจุ']),
              retirementDate: convertExcelDateToThai(row['เกษียณ']),
              yearsOfService: row['จำนวนปี'] ? String(row['จำนวนปี']) : null,
              requestedPosition: row['ตำแหน่งที่ร้องขอ'] ? String(row['ตำแหน่งที่ร้องขอ']) : null,
              createdBy: username,
              updatedBy: username,
            };

            // ลบค่า undefined/null ออก
            Object.keys(personnelData).forEach(key => {
              if (personnelData[key] === undefined || personnelData[key] === null || personnelData[key] === '') {
                delete personnelData[key];
              }
            });

            // บันทึกลงฐานข้อมูลทีละรายการ (fallback)
            const created = await prisma.policePersonnel.create({
              data: personnelData,
            });

            results.success++;
          } catch (error: any) {
            results.failed++;
            results.errors.push(`แถวที่ ${startIndex + i + 2}: ${error.message}`);
            console.error(`Error importing row ${startIndex + i + 2}:`, error);
          }
        }
      }
    }

    // Complete job
    const successMessage = isUpdateMode
      ? `อัปเดตข้อมูลปี ${importYear} สำเร็จ: ${results.success} รายการ (อัปเดต ${results.updated} รายการ, ล้มเหลว ${results.failed} รายการ)`
      : `นำเข้าข้อมูลปี ${importYear} ใหม่สำเร็จ ${results.success} รายการ (ล้มเหลว ${results.failed} รายการ)`;

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        errorMessage: successMessage
      }
    });

    console.log(`[Import] Job ${jobId}: Completed - ${successMessage}`);

  } catch (error: any) {
    console.error(`[Import] Job ${jobId} error:`, error);

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error.message || 'เกิดข้อผิดพลาด'
      }
    });
  }
}
