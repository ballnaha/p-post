import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

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
  const { stream, sendProgress, close } = createProgressStream();

  // Start processing in the background
  (async () => {
    try {
      // Optional: Check authentication (uncomment to require login)
      // const session = await getServerSession(authOptions);
      // if (!session) {
      //   sendProgress({ type: 'error', error: 'Unauthorized' });
      //   close();
      //   return;
      // }
      
      // Get username for audit trail (use 'system' if no session)
      const session = await getServerSession(authOptions);
      const username = session?.user?.username || 'system';

      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        sendProgress({ type: 'error', error: 'ไม่พบไฟล์' });
        close();
        return;
      }

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
        sendProgress({ type: 'error', error: 'ไม่พบข้อมูลในไฟล์ Excel' });
        close();
        return;
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
        created: [] as any[],
        deleted: 0,
        totalProcessed: 0,
      };

      // ลบข้อมูลเก่าทั้งหมดก่อนนำเข้าใหม่
      try {
        const deletedCount = await prisma.policePersonnel.deleteMany({});
        results.deleted = deletedCount.count;
        console.log(`Deleted ${deletedCount.count} existing police personnel records`);
        
        // Send initial progress
        sendProgress({
          type: 'progress',
          current: 0,
          total: data.length,
          message: 'เริ่มนำเข้าข้อมูล...'
        });
      } catch (deleteError) {
        console.error('Error deleting existing data:', deleteError);
        sendProgress({ 
          type: 'error', 
          error: 'เกิดข้อผิดพลาดในการลบข้อมูลเก่า กรุณาลองใหม่อีกครั้ง' 
        });
        close();
        return;
      }

      // นำเข้าข้อมูลแบบ batch เพื่อความเร็ว
      const batchSize = 1000; // จำนวน records ต่อ batch
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
              seniority: row['อาวุโส'] ? String(row['อาวุโส']) : null,
              rank: row['ยศ'] ? String(row['ยศ']) : null,
              fullName: row['ชื่อ สกุล'] ? String(row['ชื่อ สกุล']) : null,
              noId: row['ID'] ? parseInt(String(row['ID'])) : null,
              posCodeId: (row['POSCODE'] || row['ID/POSCODE']) ? parseInt(String(row['POSCODE'] || row['ID/POSCODE'])) : null,
              position: row['ตำแหน่ง'] ? String(row['ตำแหน่ง']) : null,
              positionNumber: row['เลขตำแหน่ง'] ? String(row['เลขตำแหน่ง']) : null,
              actingAs: row['ทำหน้าที่'] ? String(row['ทำหน้าที่']) : null,
              age: row['อายุ'] ? String(row['อายุ']) : null,
              education: row['คุณวุฒิ'] ? String(row['คุณวุฒิ']) : null,
              nationalId: row['เลขประจำตัวประชาชน'] ? String(row['เลขประจำตัวประชาชน']) : null,
              unit: row['หน่วย'] ? String(row['หน่วย']) : null,
              trainingLocation: row['ตท.'] ? String(row['ตท.']) : null,
              trainingCourse: row['นรต.'] ? String(row['นรต.']) : null,
              notes: row['หมายเหตุ/เงื่อนไข'] ? String(row['หมายเหตุ/เงื่อนไข']) : null,
              birthDate: convertExcelDateToThai(row['วันเกิด']),
              lastAppointment: convertExcelDateToThai(row['แต่งตั้งครั้งสุดท้าย']),
              currentRankSince: convertExcelDateToThai(row['ระดับนี้เมื่อ']),
              enrollmentDate: convertExcelDateToThai(row['บรรจุ']),
              retirementDate: convertExcelDateToThai(row['เกษียณ']),
              yearsOfService: row['จำนวนปี'] ? String(row['จำนวนปี']) : null,
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

        // บันทึกทั้ง batch ใน transaction เดียว
        if (personnelDataArray.length > 0) {
          await prisma.$transaction(async (tx) => {
            const created = await tx.policePersonnel.createMany({
              data: personnelDataArray,
              skipDuplicates: true, // ข้ามข้อมูลซ้ำ
            });
            
            results.success += created.count;
          });
        }

        console.log(`Batch ${batchIndex + 1}/${totalBatches} completed (${endIndex}/${data.length} records)`);
        results.totalProcessed = endIndex;

        // Send progress update
        sendProgress({
          type: 'progress',
          current: endIndex,
          total: data.length,
          batch: batchIndex + 1,
          totalBatches: totalBatches,
        });

      } catch (batchError: any) {
        console.error(`Error in batch ${batchIndex + 1}:`, batchError);
        // หากทั้ง batch ล้มเหลว ให้ลองทีละรายการ (fallback)
        for (let i = 0; i < batchData.length; i++) {
          const row: any = batchData[i];
          try {
            const personnelData: any = {         
              seniority: row['อาวุโส'] ? String(row['อาวุโส']) : null,
              rank: row['ยศ'] ? String(row['ยศ']) : null,
              fullName: row['ชื่อ สกุล'] ? String(row['ชื่อ สกุล']) : null,
              noId: row['ID'] ? parseInt(String(row['ID'])) : null,
              posCodeId: row['ID/POSCODE'] ? parseInt(String(row['ID/POSCODE'])) : null,
              position: row['ตำแหน่ง'] ? String(row['ตำแหน่ง']) : null,
              positionNumber: row['เลขตำแหน่ง'] ? String(row['เลขตำแหน่ง']) : null,
              actingAs: row['ทำหน้าที่'] ? String(row['ทำหน้าที่']) : null,
              age: row['อายุ'] ? String(row['อายุ']) : null,
              education: row['คุณวุฒิ'] ? String(row['คุณวุฒิ']) : null,
              nationalId: row['เลขประจำตัวประชาชน'] ? String(row['เลขประจำตัวประชาชน']) : null,
              unit: row['หน่วย'] ? String(row['หน่วย']) : null,
              trainingLocation: row['ตท.'] ? String(row['ตท.']) : null,
              trainingCourse: row['นรต.'] ? String(row['นรต.']) : null,
              notes: row['หมายเหตุ/เงื่อนไข'] ? String(row['หมายเหตุ/เงื่อนไข']) : null,
              birthDate: convertExcelDateToThai(row['วันเกิด']),
              lastAppointment: convertExcelDateToThai(row['แต่งตั้งครั้งสุดท้าย']),
              currentRankSince: convertExcelDateToThai(row['ระดับนี้เมื่อ']),
              enrollmentDate: convertExcelDateToThai(row['บรรจุ']),
              retirementDate: convertExcelDateToThai(row['เกษียณ']),
              yearsOfService: row['จำนวนปี'] ? String(row['จำนวนปี']) : null,
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

      sendProgress({
        type: 'complete',
        success: true,
        message: `ลบข้อมูลเก่า ${results.deleted} แถว และนำเข้าข้อมูลใหม่สำเร็จ ${results.success} แถว, ล้มเหลว ${results.failed} แถว`,
        results,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      sendProgress({
        type: 'error',
        error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล'
      });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
