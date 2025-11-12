import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

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
        importMode: 'supporter',
        status: 'pending',
        fileName: file.name,
        fileSize: file.size,
        createdBy: username,
      }
    });

    console.log(`[Import Supporter] Created job ${importJob.id} for year: ${importYear}`);

    // Start background processing (don't await)
    processImportSupporterJob(importJob.id, file, importYear, username).catch(err => {
      console.error(`[Import Supporter] Background job ${importJob.id} failed:`, err);
    });

    // Return job ID ทันที
    return NextResponse.json({
      success: true,
      jobId: importJob.id,
      message: 'เริ่มการอัปเดตข้อมูลผู้สนับสนุนในพื้นหลัง'
    });

  } catch (error: unknown) {
    console.error('Import Supporter API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// Background processing function
async function processImportSupporterJob(jobId: string, file: File, importYear: number, username: string) {
  try {
    // Update status to processing
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        startedAt: new Date()
      }
    });

    console.log(`[Import Supporter] Job ${jobId}: Started processing`);

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
      throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
    }

    // ตรวจสอบจำนวนคอลัมน์ในไฟล์ (อัปเดตผู้สนับสนุนควรมี 4 คอลัมน์)
    const firstRow: any = data[0];
    const columnCount = Object.keys(firstRow).length;
    
    if (columnCount > 10) {
      throw new Error(`ไฟล์นี้มี ${columnCount} คอลัมน์ ซึ่งเป็นไฟล์ Template สำหรับ Import แบบเต็ม\n\nหากต้องการ Import ข้อมูลทั้งหมด กรุณาเลือก "Import แบบเต็ม" แทน\nหรือดาวน์โหลด Template สำหรับอัปเดตผู้สนับสนุน (4 คอลัมน์)`);
    }

    // ตรวจสอบว่ามีคอลัมน์ที่จำเป็น
    const requiredColumns = ['ชื่อ สกุล', 'เลขตำแหน่ง'];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      throw new Error(`ไฟล์ไม่มีคอลัมน์ที่จำเป็น: ${missingColumns.join(', ')}\n\nกรุณาใช้ Template ที่ดาวน์โหลดจากระบบ`);
    }

    // Update total rows
    await prisma.importJob.update({
      where: { id: jobId },
      data: { totalRows: data.length }
    });

    const results = {
      success: 0,
      failed: 0,
      notFound: 0,
      errors: [] as string[],
      updated: [] as any[],
      totalProcessed: 0,
    };

    // อัปเดตข้อมูลทีละรายการ
    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      
      try {
        const fullName = row['ชื่อ สกุล'] ? String(row['ชื่อ สกุล']).trim() : null;
        const positionNumber = row['เลขตำแหน่ง'] ? String(row['เลขตำแหน่ง']).trim() : null;
        const nationalId = row['เลขประจำตัวประชาชน'] ? String(row['เลขประจำตัวประชาชน']).trim() : null;
        const supporterName = row['ชื่อผู้สนับสนุน'] ? String(row['ชื่อผู้สนับสนุน']).trim() : null;
        const supportReason = row['เหตุผล'] ? String(row['เหตุผล']).substring(0, 5000).trim() : null;

        // ตรวจสอบว่ามีข้อมูลที่จำเป็น
        if (!fullName || !positionNumber) {
          results.failed++;
          results.errors.push(`แถวที่ ${i + 2}: ไม่พบชื่อ-นามสกุลหรือเลขตำแหน่ง`);
          continue;
        }

        // ค้นหาบุคลากร
        // กรณีที่ 1: มีเลขบัตรประชาชน → ค้นหาด้วยเลขบัตร + เลขตำแหน่ง (แม่นยำที่สุด)
        // กรณีที่ 2: ไม่มีเลขบัตรประชาชน (ตำแหน่งว่าง) → ค้นหาด้วยเลขตำแหน่ง + ชื่อ
        let personnel;
        
        if (nationalId) {
          // มีเลขบัตร: ค้นหาด้วยเลขบัตร + เลขตำแหน่ง
          personnel = await prisma.policePersonnel.findFirst({
            where: {
              nationalId: nationalId,
              positionNumber: positionNumber,
              year: importYear,
              isActive: true
            }
          });
          
          // ถ้าไม่เจอ ลองค้นหาด้วยเลขบัตรอย่างเดียว
          if (!personnel) {
            personnel = await prisma.policePersonnel.findFirst({
              where: {
                nationalId: nationalId,
                year: importYear,
                isActive: true
              }
            });
          }
        } else {
          // ไม่มีเลขบัตร (ตำแหน่งว่าง): ค้นหาด้วยเลขตำแหน่ง + ชื่อ
          personnel = await prisma.policePersonnel.findFirst({
            where: {
              positionNumber: positionNumber,
              fullName: fullName,
              year: importYear,
              isActive: true
            }
          });
          
          // ถ้าไม่เจอ ลองค้นหาด้วยเลขตำแหน่งอย่างเดียว
          if (!personnel) {
            personnel = await prisma.policePersonnel.findFirst({
              where: {
                positionNumber: positionNumber,
                year: importYear,
                isActive: true
              }
            });
          }
        }

        if (!personnel) {
          results.notFound++;
          const idInfo = nationalId ? `(บัตร: ${nationalId})` : '(ตำแหน่งว่าง)';
          results.errors.push(`แถวที่ ${i + 2}: ไม่พบข้อมูล "${fullName}" เลขตำแหน่ง: ${positionNumber} ${idInfo} ในระบบปี ${importYear}`);
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

      // Update progress every 10 records
      if ((i + 1) % 10 === 0 || i === data.length - 1) {
        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            processedRows: i + 1,
            successRows: results.success,
            failedRows: results.failed,
            updatedRows: results.success,
            errors: results.errors.length > 0 ? JSON.stringify(results.errors.slice(0, 100)) : null
          }
        });
      }
    }

    // Complete job
    const successMessage = `อัปเดตข้อมูลผู้สนับสนุนปี ${importYear} สำเร็จ: ${results.success} รายการ (ไม่พบในระบบ ${results.notFound} รายการ, ล้มเหลว ${results.failed} รายการ)`;

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        errorMessage: successMessage
      }
    });

    console.log(`[Import Supporter] Job ${jobId}: Completed - ${successMessage}`);

  } catch (error: unknown) {
    console.error(`[Import Supporter] Job ${jobId} error:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: errorMessage
      }
    });
  }
}
