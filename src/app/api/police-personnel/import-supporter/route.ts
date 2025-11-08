import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

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
      // Get username for audit trail
      const session = await getServerSession(authOptions);
      const username = session?.user?.username || 'system';

      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        sendProgress({ type: 'error', error: 'ไม่พบไฟล์' });
        close();
        return;
      }

      // อ่านไฟล์ Excel
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { 
        type: 'buffer', 
        cellDates: false,
        raw: false
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false,
        defval: null
      });

      if (data.length === 0) {
        sendProgress({ type: 'error', error: 'ไม่พบข้อมูลในไฟล์ Excel' });
        close();
        return;
      }

      // ตรวจสอบจำนวนคอลัมน์ในไฟล์ (อัปเดตผู้สนับสนุนควรมี 4 คอลัมน์)
      const firstRow: any = data[0];
      const columnCount = Object.keys(firstRow).length;
      
      if (columnCount > 10) {
        sendProgress({ 
          type: 'error', 
          error: `ไฟล์นี้มี ${columnCount} คอลัมน์ ซึ่งเป็นไฟล์ Template สำหรับ Import แบบเต็ม\n\nหากต้องการ Import ข้อมูลทั้งหมด กรุณาเลือก "Import แบบเต็ม" แทน\nหรือดาวน์โหลด Template สำหรับอัปเดตผู้สนับสนุน (4 คอลัมน์)` 
        });
        close();
        return;
      }

      // ตรวจสอบว่ามีคอลัมน์ที่จำเป็น
      const requiredColumns = ['ชื่อ สกุล', 'เลขประจำตัวประชาชน'];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      
      if (missingColumns.length > 0) {
        sendProgress({ 
          type: 'error', 
          error: `ไฟล์ไม่มีคอลัมน์ที่จำเป็น: ${missingColumns.join(', ')}\n\nกรุณาใช้ Template ที่ดาวน์โหลดจากระบบ` 
        });
        close();
        return;
      }

      const results = {
        success: 0,
        failed: 0,
        notFound: 0,
        errors: [] as string[],
        updated: [] as any[],
        totalProcessed: 0,
      };

      // Send initial progress
      sendProgress({
        type: 'progress',
        current: 0,
        total: data.length,
        message: 'เริ่มอัปเดตข้อมูลผู้สนับสนุน...'
      });

      // อัปเดตข้อมูลทีละรายการ
      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        
        try {
          const fullName = row['ชื่อ สกุล'] ? String(row['ชื่อ สกุล']).trim() : null;
          const nationalId = row['เลขประจำตัวประชาชน'] ? String(row['เลขประจำตัวประชาชน']).trim() : null;
          const supporterName = row['ชื่อผู้สนับสนุน'] ? String(row['ชื่อผู้สนับสนุน']).trim() : null;
          const supportReason = row['เหตุผล'] ? String(row['เหตุผล']).substring(0, 5000).trim() : null;

          // ตรวจสอบว่ามีข้อมูลที่จำเป็น
          if (!nationalId || !fullName) {
            results.failed++;
            results.errors.push(`แถวที่ ${i + 2}: ไม่พบเลขประจำตัวประชาชนหรือชื่อ-นามสกุล`);
            continue;
          }

          // ค้นหาบุคลากรจากเลขบัตรประชาชนและชื่อ-นามสกุล
          const personnel = await prisma.policePersonnel.findFirst({
            where: {
              nationalId: nationalId,
              fullName: fullName,
            }
          });

          if (!personnel) {
            results.notFound++;
            results.errors.push(`แถวที่ ${i + 2}: ไม่พบข้อมูลบุคลากร "${fullName}" (บัตร: ${nationalId}) ในระบบ`);
            continue;
          }

          // อัปเดตข้อมูลผู้สนับสนุนและเหตุผล
          const updateData: any = {
            updatedBy: username,
            updatedAt: new Date(),
          };

          // อัปเดตเฉพาะฟิลด์ที่มีค่า
          if (supporterName !== null) {
            updateData.supporterName = supporterName;
          }
          if (supportReason !== null) {
            updateData.supportReason = supportReason;
          }

          const updated = await prisma.policePersonnel.update({
            where: { id: personnel.id },
            data: updateData,
          });

          results.success++;
          results.updated.push({
            fullName: updated.fullName,
            nationalId: updated.nationalId,
            supporterName: updated.supporterName,
            supportReason: updated.supportReason,
          });

        } catch (error: any) {
          results.failed++;
          results.errors.push(`แถวที่ ${i + 2}: ${error.message}`);
          console.error(`Error updating row ${i + 2}:`, error);
        }

        results.totalProcessed = i + 1;

        // Send progress update every 10 records
        if ((i + 1) % 10 === 0 || i === data.length - 1) {
          sendProgress({
            type: 'progress',
            current: i + 1,
            total: data.length,
          });
        }
      }

      sendProgress({
        type: 'complete',
        success: true,
        message: `อัปเดตข้อมูลสำเร็จ ${results.success} แถว, ไม่พบในระบบ ${results.notFound} แถว, ล้มเหลว ${results.failed} แถว`,
        results,
      });
    } catch (error: any) {
      console.error('Import supporter error:', error);
      sendProgress({
        type: 'error',
        error: error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
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
