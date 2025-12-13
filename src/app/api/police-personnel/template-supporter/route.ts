import * as XLSX from '@e965/xlsx';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // สร้างข้อมูลตัวอย่างสำหรับ template อัปเดตผู้สนับสนุน (5 รายการตัวอย่าง)
    const templateData = [
      {
        'ชื่อ สกุล': 'สมชาย ใจดี',
        'เลขตำแหน่ง': 'P001',
        'เลขประจำตัวประชาชน': '1234567890123',
        'ชื่อผู้สนับสนุน': 'พ.ต.อ.สมศักดิ์ รักดี',
        'เหตุผล': 'มีความรู้ความสามารถและประสบการณ์ในการปฏิบัติงานด้านบริหารมากกว่า 15 ปี',
      },
      {
        'ชื่อ สกุล': 'สมหญิง รักงาน',
        'เลขตำแหน่ง': 'P002',
        'เลขประจำตัวประชาชน': '9876543210987',
        'ชื่อผู้สนับสนุน': 'พ.ต.ท.วิชัย สุขใจ',
        'เหตุผล': 'เหมาะสมกับตำแหน่งและมีผลงานดีเด่นในด้านการป้องกันและปราบปราม',
      },
      {
        'ชื่อ สกุล': 'ประยุทธ์ มั่นคง',
        'เลขตำแหน่ง': 'P003',
        'เลขประจำตัวประชาชน': '3456789012345',
        'ชื่อผู้สนับสนุน': 'พ.ต.ท.สุรชัย ซื่อสัตย์',
        'เหตุผล': 'มีความเชี่ยวชาญในงานสืบสวนและได้รับรางวัลตำรวจดีเด่นประจำปี 2567',
      },
      {
        'ชื่อ สกุล': 'ตำแหน่งว่าง (ยื่นขอ)',
        'เลขตำแหน่ง': 'P004',
        'เลขประจำตัวประชาชน': '',
        'ชื่อผู้สนับสนุน': 'พ.ต.อ.ธนากร วิริยะกุล',
        'เหตุผล': 'ตำแหน่งนี้เหมาะสมสำหรับผู้มีความรู้ด้านเทคโนโลยีสารสนเทศ',
      },
      {
        'ชื่อ สกุล': 'อนุชา เจริญรุ่ง',
        'เลขตำแหน่ง': 'P005',
        'เลขประจำตัวประชาชน': '7890123456789',
        'ชื่อผู้สนับสนุน': 'พล.ต.ต.ชัยพร กล้าหาญ',
        'เหตุผล': 'ทุ่มเทปฏิบัติงานด้านการข่าวและได้รับการยอมรับจากผู้บังคับบัญชา',
      }
    ];

    // สร้าง workbook และ worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Supporter Update');

    // ตั้งค่าความกว้างของคอลัมน์
    const columnWidths = [
      { wch: 30 }, // 1. ชื่อ สกุล
      { wch: 20 }, // 2. เลขตำแหน่ง
      { wch: 25 }, // 3. เลขประจำตัวประชาชน
      { wch: 30 }, // 4. ชื่อผู้สนับสนุน
      { wch: 60 }, // 5. เหตุผล
    ];
    worksheet['!cols'] = columnWidths;

    // แปลง workbook เป็น buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // ส่งไฟล์กลับไป
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="police_personnel_supporter_template.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างไฟล์ Template' },
      { status: 500 }
    );
  }
}
