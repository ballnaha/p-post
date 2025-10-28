import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    console.log('Received applicant reorder request:', updates);

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'Invalid updates data' },
        { status: 400 }
      );
    }

    // Update each applicant's displayOrder in vacantPosition table
    const results = await Promise.all(
      updates.map((update: { id: string; displayOrder: number }) =>
        prisma.vacantPosition.update({
          where: { id: update.id },
          data: { displayOrder: update.displayOrder },
        })
      )
    );

    console.log('Updated displayOrder for applicants:', results.map(r => ({ id: r.id, displayOrder: r.displayOrder })));

    return NextResponse.json({ 
      success: true,
      message: 'Applicant display order updated successfully',
      updated: results.length
    });
  } catch (error) {
    console.error('Error updating applicant display order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update applicant display order' },
      { status: 500 }
    );
  }
}