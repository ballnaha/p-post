import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST - Sync Vacant Positions from police_personnel to vacant_position
 * คัดลอกตำแหน่งว่างจาก police_personnel → vacant_position สำหรับปีที่ระบุ
 * ใช้เมื่อ: เริ่มต้นปีใหม่ หรือ หลัง import police_personnel ใหม่
 * ส่ง progress แบบ real-time ผ่าน streaming response
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { year, unit, forceResync } = body;

  if (!year) {
    return NextResponse.json(
      { success: false, error: 'Year is required' },
      { status: 400 }
    );
  }

  const yearNumber = parseInt(year);
  if (isNaN(yearNumber) || yearNumber < 2500 || yearNumber > 2600) {
    return NextResponse.json(
      { success: false, error: 'Invalid year format (expected Buddhist year 25xx-26xx)' },
      { status: 400 }
    );
  }

  // สร้าง streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        console.log(`🔄 Starting sync for year ${yearNumber}${unit ? ` (unit: ${unit})` : ''}${forceResync ? ' (Force Re-sync)' : ''}...`);

        // ถ้าเลือก Force Re-sync ให้ลบข้อมูลเดิมก่อน
        if (forceResync) {
          const deleteWhereCondition: any = {
            year: yearNumber,
            nominator: null,
            requestedPositionId: null
          };

          // ถ้าระบุ unit ให้ลบเฉพาะ unit นั้น
          if (unit && unit !== 'all') {
            deleteWhereCondition.unit = unit;
          }

          const deletedCount = await prisma.vacantPosition.deleteMany({
            where: deleteWhereCondition
          });

          console.log(`🗑️  Deleted ${deletedCount.count} existing records before re-sync`);

          sendProgress({
            type: 'progress',
            current: 0,
            total: 0,
            message: `ลบข้อมูลเดิม ${deletedCount.count} รายการเรียบร้อย`
          });
        }

        // ดึงตำแหน่งว่างทั้งหมดจาก police_personnel
        const whereCondition: any = {
          posCodeId: { not: null },
          OR: [
            { fullName: null },
            { fullName: '' },
            { fullName: 'ว่าง' },
            { fullName: 'ว่าง (กันตำแหน่ง)' },
            { fullName: 'ว่าง(กันตำแหน่ง)' }
          ]
        };

        // เพิ่ม filter unit ถ้ามี
        if (unit && unit !== 'all') {
          whereCondition.unit = unit;
        }

        const vacantPositionsFromPersonnel = await prisma.policePersonnel.findMany({
          where: whereCondition,
          include: {
            posCodeMaster: true
          },
          orderBy: [
            { unit: 'asc' },
            { position: 'asc' }
          ]
        });

        const totalRecords = vacantPositionsFromPersonnel.length;
        console.log(`📊 Found ${totalRecords} vacant positions in police_personnel`);

        if (totalRecords === 0) {
          sendProgress({
            type: 'complete',
            data: {
              year: yearNumber,
              synced: 0,
              skipped: 0,
              total: 0
            }
          });
          controller.close();
          return;
        }

        // ส่ง progress เริ่มต้น
        sendProgress({
          type: 'progress',
          current: 0,
          total: totalRecords,
          message: 'เริ่มต้น sync...'
        });

        let synced = 0;
        let skipped = 0;
        let errors: string[] = [];

        // แบ่งเป็น batch (50 records ต่อ batch)
        const BATCH_SIZE = 50;
        const batches = [];
        for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
          batches.push(vacantPositionsFromPersonnel.slice(i, i + BATCH_SIZE));
        }

        // Process แต่ละ batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          
          try {
            await prisma.$transaction(
              async (tx) => {
                for (const vacantPos of batch) {
                  try {
                    // ตรวจสอบว่ามี record อยู่แล้วหรือไม่
                    const existing = await tx.vacantPosition.findFirst({
                      where: {
                        year: yearNumber,
                        positionNumber: vacantPos.positionNumber || undefined,
                        unit: vacantPos.unit || undefined,
                        posCodeId: vacantPos.posCodeId || undefined,
                        nominator: null,
                        requestedPositionId: null
                      }
                    });

                    if (existing) {
                      skipped++;
                    } else {
                      // สร้าง record ใหม่
                      await tx.vacantPosition.create({
                        data: {
                          year: yearNumber,
                          posCodeId: vacantPos.posCodeId,
                          position: vacantPos.position,
                          positionNumber: vacantPos.positionNumber,
                          unit: vacantPos.unit,
                          actingAs: vacantPos.actingAs,
                          seniority: vacantPos.seniority,
                          rank: vacantPos.rank,
                          fullName: vacantPos.fullName,
                          nationalId: vacantPos.nationalId,
                          birthDate: vacantPos.birthDate,
                          age: vacantPos.age,
                          education: vacantPos.education,
                          lastAppointment: vacantPos.lastAppointment,
                          currentRankSince: vacantPos.currentRankSince,
                          enrollmentDate: vacantPos.enrollmentDate,
                          retirementDate: vacantPos.retirementDate,
                          yearsOfService: vacantPos.yearsOfService,
                          trainingLocation: vacantPos.trainingLocation,
                          trainingCourse: vacantPos.trainingCourse,
                          isAssigned: false,
                          displayOrder: 1, // ✅ ตั้งค่าเริ่มต้นเป็น 1 เพื่อไม่ให้ต้อง auto-assign ทีหลัง
                          notes: `Synced from police_personnel on ${new Date().toISOString().split('T')[0]}`
                        }
                      });
                      synced++;
                    }

                    // ส่ง progress
                    const current = synced + skipped;
                    sendProgress({
                      type: 'progress',
                      current,
                      total: totalRecords,
                      message: `กำลังประมวลผล... (${current}/${totalRecords})`
                    });

                  } catch (error) {
                    const errorMsg = `Error syncing position ${vacantPos.positionNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    console.error(errorMsg);
                    errors.push(errorMsg);
                  }
                }
              },
              {
                maxWait: 10000,
                timeout: 30000,
              }
            );
          } catch (error) {
            const batchError = `Batch ${batchIndex + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(batchError);
            errors.push(batchError);
          }
        }

        console.log(`✅ Sync completed: ${synced} synced, ${skipped} skipped${forceResync ? ' (Force Re-sync)' : ''}`);

        // ส่งผลลัพธ์สุดท้าย
        sendProgress({
          type: 'complete',
          data: {
            year: yearNumber,
            synced,
            skipped,
            total: totalRecords,
            forceResync: forceResync || false,
            errors: errors.length > 0 ? errors : undefined
          }
        });

        controller.close();

      } catch (error) {
        console.error('❌ Sync error:', error);
        sendProgress({
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to sync vacant positions'
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * GET - ตรวจสอบสถานะการ sync
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unit = searchParams.get('unit');

    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);

    // สร้าง where condition สำหรับ police_personnel
    const personnelWhereCondition: any = {
      posCodeId: { not: null },
      OR: [
        { fullName: null },
        { fullName: '' },
        { fullName: 'ว่าง' },
        { fullName: 'ว่าง (กันตำแหน่ง)' },
        { fullName: 'ว่าง(กันตำแหน่ง)' }
      ]
    };

    // สร้าง where condition สำหรับ vacant_position
    const vacantWhereCondition: any = {
      year: yearNumber,
      nominator: null,
      requestedPositionId: null
    };

    // เพิ่ม filter unit ถ้ามี
    if (unit && unit !== 'all') {
      personnelWhereCondition.unit = unit;
      vacantWhereCondition.unit = unit;
    }

    // นับจำนวนตำแหน่งว่างใน police_personnel
    const personnelCount = await prisma.policePersonnel.count({
      where: personnelWhereCondition
    });

    // นับจำนวนตำแหน่งว่างที่ sync แล้วใน vacant_position
    const syncedCount = await prisma.vacantPosition.count({
      where: vacantWhereCondition
    });

    // นับจำนวนผู้ยื่นขอที่ถูกจับคู่แล้ว (requestedPositionId !== null และ isAssigned = true)
    const assignedApplicantsCount = await prisma.vacantPosition.count({
      where: {
        year: yearNumber,
        requestedPositionId: { not: null },
        isAssigned: true
      }
    });

    // เหลือ = ตำแหน่งว่างทั้งหมด - ผู้ยื่นขอที่จับคู่แล้ว
    const availableCount = syncedCount - assignedApplicantsCount;

    const needsSync = personnelCount > syncedCount;

    return NextResponse.json({
      success: true,
      data: {
        year: yearNumber,
        personnelVacantCount: personnelCount,
        syncedCount: syncedCount,
        assignedCount: assignedApplicantsCount,
        availableCount: availableCount,
        needsSync,
        syncPercentage: personnelCount > 0 ? Math.round((syncedCount / personnelCount) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - ลบข้อมูล vacant_position ที่ sync แล้ว
 * สามารถลบตามปี และหน่วย (ถ้าระบุ)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const unit = searchParams.get('unit');

    if (!year) {
      return NextResponse.json(
        { success: false, error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const yearNumber = parseInt(year);
    if (isNaN(yearNumber) || yearNumber < 2500 || yearNumber > 2600) {
      return NextResponse.json(
        { success: false, error: 'Invalid year format (expected Buddhist year 25xx-26xx)' },
        { status: 400 }
      );
    }

    // สร้าง where condition
    const deleteWhereCondition: any = {
      year: yearNumber,
      nominator: null,
      requestedPositionId: null
    };

    // ถ้าระบุ unit ให้ลบเฉพาะ unit นั้น
    if (unit && unit !== 'all') {
      deleteWhereCondition.unit = unit;
    }

    console.log(`🗑️  Deleting vacant_position for year ${yearNumber}${unit && unit !== 'all' ? ` (unit: ${unit})` : ''}...`);

    // ลบข้อมูล
    const result = await prisma.vacantPosition.deleteMany({
      where: deleteWhereCondition
    });

    console.log(`✅ Deleted ${result.count} records successfully`);

    return NextResponse.json({
      success: true,
      data: {
        year: yearNumber,
        unit: unit && unit !== 'all' ? unit : 'all',
        deletedCount: result.count,
        message: `ลบข้อมูล ${result.count} รายการเรียบร้อย`
      }
    });

  } catch (error) {
    console.error('Error deleting vacant positions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete vacant positions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
