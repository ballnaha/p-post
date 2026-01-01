import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear() + 543));
    const limit = parseInt(searchParams.get('limit') || '15');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: { suggestions: [] },
      });
    }

    const searchTerm = query.trim();

    // ค้นหาจาก policePersonnel - ไม่ filter unit เพื่อให้ค้นหาได้ทุกหน่วย
    const whereConditions: any = {
      year: year,
      isActive: true,
      OR: [
        { fullName: { contains: searchTerm } },
        { rank: { contains: searchTerm } },
        { position: { contains: searchTerm } },
        { positionNumber: { contains: searchTerm } },
        { nationalId: { contains: searchTerm } },
        { unit: { contains: searchTerm } },
      ],
    };

    // ค้นหาบุคลากร
    const personnel = await prisma.policePersonnel.findMany({
      where: whereConditions,
      select: {
        id: true,
        fullName: true,
        rank: true,
        position: true,
        unit: true,
        positionNumber: true,
        nationalId: true,
        posCodeId: true,
        posCodeMaster: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { posCodeId: 'asc' },
        { fullName: 'asc' },
      ],
    });

    // Type definition for suggestions
    interface Suggestion {
      id: string;
      label: string;
      subtitle: string;
      type: 'personnel' | 'position_number';
      posCode: string | null;
      searchText: string;
      originalData: {
        fullName: string | null;
        rank: string | null;
        position: string | null;
        unit: string | null;
        positionNumber: string | null;
      } | null;
    }

    // แปลงข้อมูลเป็น suggestion format
    const suggestions: Suggestion[] = personnel.map((p) => {
      const parts: string[] = [];

      // ชื่อเต็มพร้อมยศ
      if (p.rank) parts.push(p.rank);
      if (p.fullName) parts.push(p.fullName);

      const displayName = parts.join(' ');

      // สร้าง subtitle
      const subtitleParts: string[] = [];
      if (p.position) subtitleParts.push(p.position);
      if (p.unit) subtitleParts.push(p.unit);
      if (p.positionNumber) subtitleParts.push(`#${p.positionNumber}`);

      return {
        id: p.id,
        label: displayName || 'ไม่ระบุชื่อ',
        subtitle: subtitleParts.join(' · ') || '',
        type: 'personnel' as const,
        posCode: p.posCodeMaster ? `${p.posCodeMaster.id} - ${p.posCodeMaster.name}` : null,
        searchText: searchTerm,
        // ข้อมูลเพิ่มเติมสำหรับการค้นหา
        originalData: {
          fullName: p.fullName,
          rank: p.rank,
          position: p.position,
          unit: p.unit,
          positionNumber: p.positionNumber,
        },
      };
    });

    // เพิ่ม suggestion สำหรับ position number ถ้าค้นหาด้วยตัวเลข
    if (/^\d+$/.test(searchTerm)) {
      const positionNumberSuggestion: Suggestion = {
        id: `pos-${searchTerm}`,
        label: `เลขตำแหน่ง: ${searchTerm}`,
        subtitle: 'ค้นหาตามเลขตำแหน่ง',
        type: 'position_number' as const,
        posCode: null,
        searchText: searchTerm,
        originalData: null,
      };

      // เพิ่มเป็นตัวเลือกแรก
      suggestions.unshift(positionNumberSuggestion);
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions,
        query: searchTerm,
        total: suggestions.length,
      },
    });
  } catch (error) {
    console.error('Autocomplete API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch autocomplete suggestions' },
      { status: 500 }
    );
  }
}
