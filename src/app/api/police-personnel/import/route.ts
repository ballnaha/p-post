import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    // Optional: Check authentication (uncomment to require login)
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }
    
    // Get username for audit trail (use 'system' if no session)
    const session = await getServerSession(authOptions);
    const username = session?.user?.username || 'system';

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์' }, { status: 400 });
    }

    // อ่านไฟล์ Excel
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลในไฟล์ Excel' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      created: [] as any[],
    };

    // นำเข้าข้อมูลทีละแถว
    for (let i = 0; i < data.length; i++) {
      const row: any = data[i];
      try {
        // แปลงข้อมูลตามฟิลด์ต่างๆ (ปรับตามชื่อ column ใน Excel)
        const personnelData: any = {
          posCodeId: row['รหัสตำแหน่ง'] ? parseInt(row['รหัสตำแหน่ง']) : null,
          position: row['ตำแหน่ง'] || null,
          positionNumber: row['เลขตำแหน่ง']?.toString() || null,
          unit: row['หน่วย'] || null,
          actingAs: row['ทำหน้าที่'] || null,
          seniority: row['อาวุโส'] ? parseInt(row['อาวุโส']) : null,
          rank: row['ยศ'] || null,
          fullName: row['ชื่อ-สกุล'] || null,
          nationalId: row['เลขบัตรประชาชน']?.toString() || null,
          age: row['อายุ'] ? parseInt(row['อายุ']) : null,
          education: row['คุณวุฒิ'] || null,
          trainingLocation: row['ตท'] || null,
          trainingCourse: row['นรต'] || null,
          notes: row['หมายเหตุ'] || null,
          createdBy: username,
          updatedBy: username,
        };

        // แปลงวันที่ถ้ามี
        if (row['วันเกิด']) {
          const birthDate = parseExcelDate(row['วันเกิด']);
          if (birthDate) personnelData.birthDate = birthDate;
        }
        if (row['แต่งตั้งครั้งสุดท้าย']) {
          const lastAppointment = parseExcelDate(row['แต่งตั้งครั้งสุดท้าย']);
          if (lastAppointment) personnelData.lastAppointment = lastAppointment;
        }
        if (row['ระดับนี้เมื่อ']) {
          const currentRankSince = parseExcelDate(row['ระดับนี้เมื่อ']);
          if (currentRankSince) personnelData.currentRankSince = currentRankSince;
        }
        if (row['บรรจุ']) {
          const enrollmentDate = parseExcelDate(row['บรรจุ']);
          if (enrollmentDate) personnelData.enrollmentDate = enrollmentDate;
        }
        if (row['เกษียณ']) {
          const retirementDate = parseExcelDate(row['เกษียณ']);
          if (retirementDate) personnelData.retirementDate = retirementDate;
        }
        if (row['จำนวนปี']) {
          personnelData.yearsOfService = parseInt(row['จำนวนปี']);
        }

        // ลบค่า undefined/null ออก
        Object.keys(personnelData).forEach(key => {
          if (personnelData[key] === undefined || personnelData[key] === null || personnelData[key] === '') {
            delete personnelData[key];
          }
        });

        // บันทึกลงฐานข้อมูล
        const created = await prisma.policePersonnel.create({
          data: personnelData,
        });

        results.success++;
        results.created.push(created);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`แถวที่ ${i + 2}: ${error.message}`);
        console.error(`Error importing row ${i + 2}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อมูลสำเร็จ ${results.success} แถว, ล้มเหลว ${results.failed} แถว`,
      results,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' },
      { status: 500 }
    );
  }
}

// ฟังก์ชันแปลงวันที่จาก Excel
function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  
  // ถ้าเป็น Date object อยู่แล้ว
  if (value instanceof Date) {
    return value;
  }
  
  // ถ้าเป็นตัวเลข (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }
  
  // ถ้าเป็น string ลองแปลง
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  return null;
}
