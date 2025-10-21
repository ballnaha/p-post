import * as XLSX from 'xlsx';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // สร้างข้อมูลตัวอย่าง
    const templateData = [
      {
        'รหัสตำแหน่ง': '1',
        'ตำแหน่ง': 'ผู้บังคับการ',
        'เลขตำแหน่ง': 'P001',
        'หน่วย': 'สน.ท่าแพ',
        'ทำหน้าที่': 'ผู้บังคับการสถานี',
        'อาวุโส': '1',
        'ยศ': 'พ.ต.ท.',
        'ชื่อ-สกุล': 'สมชาย ใจดี',
        'เลขบัตรประชาชน': '1234567890123',
        'วันเกิด': '1980-01-15',
        'อายุ': '45',
        'คุณวุฒิ': 'ป.ตรี นิติศาสตร์',
        'แต่งตั้งครั้งสุดท้าย': '2023-01-01',
        'ระดับนี้เมื่อ': '2022-06-01',
        'บรรจุ': '2000-10-01',
        'เกษียณ': '2040-10-01',
        'จำนวนปี': '25',
        'ตท': 'กรุงเทพฯ',
        'นรต': 'รุ่นที่ 65',
        'หมายเหตุ': 'ข้อมูลตัวอย่าง',
      },
      {
        'รหัสตำแหน่ง': '2',
        'ตำแหน่ง': 'รองผู้บังคับการ',
        'เลขตำแหน่ง': 'P002',
        'หน่วย': 'สน.ท่าแพ',
        'ทำหน้าที่': '',
        'อาวุโส': '2',
        'ยศ': 'พ.ต.ท.',
        'ชื่อ-สกุล': '',
        'เลขบัตรประชาชน': '',
        'วันเกิด': '',
        'อายุ': '',
        'คุณวุฒิ': '',
        'แต่งตั้งครั้งสุดท้าย': '',
        'ระดับนี้เมื่อ': '',
        'บรรจุ': '',
        'เกษียณ': '',
        'จำนวนปี': '',
        'ตท': '',
        'นรต': '',
        'หมายเหตุ': 'ตำแหน่งว่าง',
      },
    ];

    // สร้าง workbook และ worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Police Personnel');

    // ตั้งค่าความกว้างของคอลัมน์
    const columnWidths = [
      { wch: 15 }, // รหัสตำแหน่ง
      { wch: 20 }, // ตำแหน่ง
      { wch: 15 }, // เลขตำแหน่ง
      { wch: 20 }, // หน่วย
      { wch: 20 }, // ทำหน้าที่
      { wch: 10 }, // อาวุโส
      { wch: 10 }, // ยศ
      { wch: 25 }, // ชื่อ-สกุล
      { wch: 18 }, // เลขบัตรประชาชน
      { wch: 15 }, // วันเกิด
      { wch: 10 }, // อายุ
      { wch: 20 }, // คุณวุฒิ
      { wch: 18 }, // แต่งตั้งครั้งสุดท้าย
      { wch: 18 }, // ระดับนี้เมื่อ
      { wch: 15 }, // บรรจุ
      { wch: 15 }, // เกษียณ
      { wch: 12 }, // จำนวนปี
      { wch: 15 }, // ตท
      { wch: 15 }, // นรต
      { wch: 30 }, // หมายเหตุ
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
