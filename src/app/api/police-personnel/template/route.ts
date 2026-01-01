import * as XLSX from '@e965/xlsx';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // สร้างข้อมูลตัวอย่างตามลำดับคอลัมน์ใหม่
    const templateData = [
      {
        'อาวุโส': '1',
        'ยศ': 'พ.ต.ท.',
        'ชื่อ สกุล': 'สมชาย ใจดี',
        'ID': '1',
        'POSCODE': '11',
        'ตำแหน่ง': 'สว.ฝอ.3 บก.อก.ภ.9',
        'เลขตำแหน่ง': '1901 10318 0195',
        'ทำหน้าที่': 'อำนวยการ',
        'แต่งตั้งครั้งสุดท้าย': '01/01/2023',
        'ระดับนี้เมื่อ': '01/06/2022',
        'บรรจุ': '01/10/2000',
        'วันเกิด': '15/01/1980',
        'คุณวุฒิ': 'ศศ.บ.,สว.98',
        'เลขประจำตัวประชาชน': '1234567890123',
        'หน่วย': '9',
        'เกษียณ': '79',
        'จำนวนปี': '5ป.7ด.',
        'อายุ': '45ป.',
        'ตท.': '',
        'นรต.': '65',
        'หมายเหตุ/เงื่อนไข': 'ข้อมูลตัวอย่าง',
        'ตำแหน่งที่ร้องขอ': 'ร้องขอตำแหน่งใน จ.ราชบุรี',
        'ชื่อผู้สนับสนุน': 'พ.ต.อ.สมศักดิ์ รักดี',
        'เหตุผล': 'มีความรู้ความสามารถและประสบการณ์ในการปฏิบัติงาน',
      }
    ];

    // สร้าง workbook และ worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Police Personnel');

    // ตั้งค่าความกว้างของคอลัมน์ตามลำดับใหม่
    const columnWidths = [
      { wch: 10 }, // 1. อาวุโส
      { wch: 12 }, // 2. ยศ
      { wch: 25 }, // 3. ชื่อ สกุล
      { wch: 8 },  // 4. ID
      { wch: 15 }, // 5. POSCODE
      { wch: 20 }, // 6. ตำแหน่ง
      { wch: 15 }, // 7. เลขตำแหน่ง
      { wch: 20 }, // 8. ทำหน้าที่
      { wch: 18 }, // 9. แต่งตั้งครั้งสุดท้าย
      { wch: 18 }, // 10. ระดับนี้เมื่อ
      { wch: 15 }, // 11. บรรจุ
      { wch: 15 }, // 12. วันเกิด
      { wch: 20 }, // 13. คุณวุฒิ
      { wch: 20 }, // 14. เลขประจำตัวประชาชน
      { wch: 20 }, // 15. หน่วย
      { wch: 15 }, // 16. เกษียณ
      { wch: 12 }, // 17. จำนวนปี
      { wch: 10 }, // 18. อายุ
      { wch: 15 }, // 19. ตท.
      { wch: 15 }, // 20. นรต.
      { wch: 35 }, // 21. หมายเหตุ/เงื่อนไข
      { wch: 25 }, // 22. ตำแหน่งที่ร้องขอ
      { wch: 30 }, // 23. ชื่อผู้สนับสนุน
      { wch: 50 }, // 24. เหตุผล
    ];
    worksheet['!cols'] = columnWidths;

    // แปลง workbook เป็น buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // ส่งไฟล์กลับไป
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="police_personnel_template.xlsx"',
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
