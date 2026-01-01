import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

const BOARD_LAYOUT_TYPE = 'board-layout'; // Force recompile

/**
 * GET /api/personnel-board?year={year}
 * ดึงข้อมูล Personnel Board สำหรับปีที่ระบุ
 * - โหลด board layout (ลำดับ lane และ transaction IDs)
 * - ดึงข้อมูลจาก SwapTransaction จริงๆ
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');

        if (!yearParam) {
            return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
        }

        const year = parseInt(yearParam, 10);
        if (isNaN(year)) {
            return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
        }

        // ดึง board layout record
        const layoutRecord = await prisma.swapTransaction.findFirst({
            where: {
                year,
                swapType: BOARD_LAYOUT_TYPE,
            },
        });

        if (!layoutRecord || !layoutRecord.notes) {
            // No board layout found - return empty
            return NextResponse.json({
                success: true,
                year,
                columns: [],
                personnelMap: {},
            });
        }

        // Parse board layout
        let boardLayout: any;
        try {
            boardLayout = JSON.parse(layoutRecord.notes);
        } catch {
            return NextResponse.json({
                success: true,
                year,
                columns: [],
                personnelMap: {},
            });
        }

        // Fetch all referenced transactions
        const transactionIds = boardLayout.lanes?.map((l: any) => l.transactionId).filter(Boolean) || [];

        // Sort lanes by index to preserve order
        const sortedLanes = [...(boardLayout.lanes || [])].sort((a: any, b: any) => (a.index ?? 999) - (b.index ?? 999));


        const transactions = await prisma.swapTransaction.findMany({
            where: {
                id: { in: transactionIds },
            },
            include: {
                swapDetails: {
                    include: {
                        posCodeMaster: true,
                        toPosCodeMaster: true
                    },
                    orderBy: { sequence: 'asc' },
                },
            },
        });

        // Create lookup map
        const txMap = new Map(transactions.map(tx => [tx.id, tx]));

        // Collect all personnel IDs to fetch detailed info
        const personnelIds: string[] = [];
        transactions.forEach(tx => {
            tx.swapDetails.forEach(detail => {
                if (detail.personnelId) {
                    personnelIds.push(detail.personnelId);
                }
            });
        });

        // Fetch personnel details manualy since there might be no relation defined
        const personnelDetails = await prisma.policePersonnel.findMany({
            where: {
                id: { in: personnelIds }
            },
            include: {
                posCodeMaster: true,
            }
        });

        const personnelDetailMap = new Map(personnelDetails.map(p => [p.id, p]));

        // Build columns and personnelMap from actual transactions
        const columns: any[] = [];
        const personnelMap: Record<string, any> = {};

        for (const laneInfo of sortedLanes) {
            const tx = txMap.get(laneInfo.transactionId);

            if (tx) {
                columns.push({
                    id: tx.id,
                    title: tx.groupName || laneInfo.title || 'Untitled Lane',
                    groupNumber: tx.groupNumber,
                    itemIds: tx.swapDetails.map((d: any) => d.id),
                    vacantPosition: laneInfo.vacantPosition || null,
                    linkedTransactionId: tx.id,
                    linkedTransactionType: tx.swapType,
                    chainType: tx.swapType === 'three-way' ? 'three-way' :
                        tx.swapType === 'two-way' ? 'swap' :
                            tx.swapType === 'promotion-chain' ? 'promotion' : 'custom',
                    isCompleted: laneInfo.isCompleted || false,
                });

                // Add personnel from transaction
                tx.swapDetails.forEach((detail: any) => {
                    // Use data from original personnel record if available, fallback to snapshot in detail
                    const original = detail.personnelId ? personnelDetailMap.get(detail.personnelId) : null;

                    personnelMap[detail.id] = {
                        id: detail.id,
                        isPlaceholder: !detail.personnelId || detail.personnelId.startsWith('placeholder-'),
                        originalId: detail.personnelId,
                        swapDetailId: detail.id,
                        noId: original?.noId ? parseInt(String(original.noId), 10) : (detail.noId ? parseInt(String(detail.noId), 10) : null), // Ensure number
                        nationalId: original?.nationalId || detail.nationalId,
                        fullName: original?.fullName || detail.fullName,
                        rank: original?.rank || detail.rank,
                        position: original?.position || detail.fromPosition,
                        unit: original?.unit || detail.fromUnit,
                        positionNumber: original?.positionNumber || detail.fromPositionNumber,
                        seniority: original?.seniority || detail.seniority,
                        age: original?.age || detail.age,
                        birthDate: original?.birthDate || detail.birthDate,
                        education: original?.education || detail.education,
                        lastAppointment: original?.lastAppointment || detail.lastAppointment,
                        currentRankSince: original?.currentRankSince || detail.currentRankSince,
                        enrollmentDate: original?.enrollmentDate || detail.enrollmentDate,
                        retirementDate: original?.retirementDate || detail.retirementDate,
                        yearsOfService: original?.yearsOfService || detail.yearsOfService,
                        trainingLocation: original?.trainingLocation || detail.trainingLocation,
                        trainingCourse: original?.trainingCourse || detail.trainingCourse,

                        // Fields: Prefer original data if available (fresh), fallback to detail (snapshot)
                        supporterName: original?.supporterName || detail.supportName,
                        supportReason: original?.supportReason || detail.supportReason,
                        requestedPosition: original?.requestedPosition || detail.requestedPosition,
                        notes: detail.notes || original?.notes,
                        actingAs: detail.fromActingAs || original?.actingAs,

                        // Relations
                        posCodeId: original?.posCodeId || detail.posCodeId,
                        posCodeMaster: original?.posCodeMaster ? {
                            id: original.posCodeMaster.id,
                            name: original.posCodeMaster.name,
                        } : (detail.posCodeMaster ? {
                            id: detail.posCodeMaster.id,
                            name: detail.posCodeMaster.name,
                        } : null),

                        // Destination (To) fields
                        toPosCodeId: detail.toPosCodeId,
                        toPosCodeMaster: detail.toPosCodeMaster ? {
                            id: detail.toPosCodeMaster.id,
                            name: detail.toPosCodeMaster.name,
                        } : null,
                        toPosition: detail.toPosition,
                        toUnit: detail.toUnit,
                        toPositionNumber: detail.toPositionNumber,
                        toActingAs: detail.toActingAs,
                        transactionId: tx.id,
                        transactionType: tx.swapType,
                    };
                });
            } else if (laneInfo.isCustomLane) {
                // Custom lane (not linked to any transaction) - stored in layout
                columns.push({
                    id: laneInfo.id,
                    title: laneInfo.title || 'Custom Lane',
                    groupNumber: laneInfo.groupNumber,
                    itemIds: laneInfo.itemIds || [],
                    vacantPosition: laneInfo.vacantPosition || null,
                    chainType: 'custom',
                    isCompleted: laneInfo.isCompleted || false,
                });

                // Custom lane personnel are stored in layout
                if (laneInfo.personnel) {
                    for (const p of laneInfo.personnel) {
                        personnelMap[p.id] = p;
                    }
                }
            } else {
                // Lane with transactionId but transaction not found - add with saved data
                console.warn(`Lane ${laneInfo.title} (tx: ${laneInfo.transactionId}) - transaction not found, using saved data`);
                columns.push({
                    id: laneInfo.transactionId || `missing-${columns.length}`,
                    title: laneInfo.title || 'Untitled Lane',
                    groupNumber: laneInfo.groupNumber,
                    itemIds: [],
                    vacantPosition: laneInfo.vacantPosition || null,
                    linkedTransactionId: laneInfo.transactionId,
                    chainType: 'custom',
                    isCompleted: laneInfo.isCompleted || false,
                });
            }
        }

        return NextResponse.json({
            success: true,
            year,
            columns,
            personnelMap,
        });

    } catch (error: any) {
        console.error('Error loading personnel board:', error);
        return NextResponse.json(
            { error: 'Failed to load personnel board', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/personnel-board
 * บันทึกข้อมูล Personnel Board
 * - บันทึก board layout (ลำดับ lane และ transaction IDs)
 * - อัปเดต SwapTransaction จริงๆ สำหรับ linked lanes
 * - สร้าง SwapTransaction ใหม่สำหรับ custom lanes
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { year, columns, personnelMap } = body;

        if (!year || !columns) {
            return NextResponse.json({ error: 'Year and columns are required' }, { status: 400 });
        }

        const username = (session.user as any)?.username || 'system';

        // ใช้ transaction เพื่อความ consistent
        const result = await prisma.$transaction(async (tx) => {
            const lanes: any[] = [];
            const updatedTransactionIds: string[] = [];
            const createdTransactionIds: string[] = [];

            // 1. ดึง layout เก่ามาตรวจสอบว่ามี transaction ไหนถูกลบออกไปบ้าง
            const oldLayoutRecord = await tx.swapTransaction.findFirst({
                where: { year, swapType: BOARD_LAYOUT_TYPE },
            });

            let oldTransactionIds: string[] = [];
            if (oldLayoutRecord && oldLayoutRecord.notes) {
                try {
                    const oldLayout = JSON.parse(oldLayoutRecord.notes);
                    oldTransactionIds = oldLayout.lanes?.map((l: any) => l.transactionId).filter(Boolean) || [];
                } catch (e) {
                    console.error('Error parsing old layout:', e);
                }
            }

            for (const column of columns) {
                // Check if this lane is linked to an existing SwapTransaction
                if (column.linkedTransactionId && column.linkedTransactionType) {
                    // ตรวจสอบว่า transaction มีอยู่จริงก่อน
                    const existingTransaction = await tx.swapTransaction.findUnique({
                        where: { id: column.linkedTransactionId }
                    });

                    if (!existingTransaction) {
                        // Transaction ไม่มีอยู่แล้ว - skip การ update แต่ยังเพิ่มลง layout
                        console.warn(`Transaction ${column.linkedTransactionId} not found, skipping update but adding to layout`);
                        lanes.push({
                            index: lanes.length,
                            transactionId: column.linkedTransactionId,
                            title: column.title,
                            vacantPosition: column.vacantPosition,
                            isCompleted: column.isCompleted || false,
                        });
                        continue;
                    }

                    // This is linked to existing SwapTransaction - update it directly
                    updatedTransactionIds.push(column.linkedTransactionId);

                    // Get existing details
                    const existingDetails = await tx.swapTransactionDetail.findMany({
                        where: { transactionId: column.linkedTransactionId },
                        orderBy: { sequence: 'asc' }
                    });

                    // Update each detail with new personnel from board
                    for (let i = 0; i < column.itemIds.length; i++) {
                        const itemId = column.itemIds[i];
                        const personnel = personnelMap[itemId];

                        if (personnel && existingDetails[i]) {
                            // Update existing detail
                            await tx.swapTransactionDetail.update({
                                where: { id: existingDetails[i].id },
                                data: {
                                    sequence: i,
                                    personnelId: (personnel.isPlaceholder || !personnel.originalId) ? null : personnel.originalId, // Only save real person's originalId
                                    noId: personnel.noId ? parseInt(String(personnel.noId), 10) : null,
                                    nationalId: personnel.nationalId || null,
                                    fullName: personnel.fullName || 'Unknown',
                                    rank: personnel.rank || null,
                                    seniority: personnel.seniority || null,
                                    posCodeId: personnel.posCodeId || null,
                                    supportName: personnel.supporterName || null,
                                    supportReason: personnel.supportReason || null,
                                    requestedPosition: personnel.requestedPosition || null,
                                    fromPosition: personnel.position || null,
                                    fromPositionNumber: personnel.positionNumber || null,
                                    fromUnit: personnel.unit || null,
                                    fromActingAs: personnel.actingAs || null,
                                    // Add toPosition fields
                                    toPosCodeId: personnel.toPosCodeId || null,
                                    toPosition: personnel.toPosition || null,
                                    toPositionNumber: personnel.toPositionNumber || null,
                                    toUnit: personnel.toUnit || null,
                                    toActingAs: personnel.toActingAs || null,
                                    notes: personnel.notes || null,
                                },
                            });
                        } else if (personnel && !existingDetails[i]) {
                            // Create new detail
                            await tx.swapTransactionDetail.create({
                                data: {
                                    transactionId: column.linkedTransactionId,
                                    sequence: i,
                                    personnelId: (personnel.isPlaceholder || !personnel.originalId) ? null : personnel.originalId,
                                    noId: personnel.noId ? parseInt(String(personnel.noId), 10) : null,
                                    nationalId: personnel.nationalId || null,
                                    fullName: personnel.fullName || 'Unknown',
                                    rank: personnel.rank || null,
                                    seniority: personnel.seniority || null,
                                    posCodeId: personnel.posCodeId || null,
                                    supportName: personnel.supporterName || null,
                                    supportReason: personnel.supportReason || null,
                                    requestedPosition: personnel.requestedPosition || null,
                                    fromPosition: personnel.position || null,
                                    fromPositionNumber: personnel.positionNumber || null,
                                    fromUnit: personnel.unit || null,
                                    fromActingAs: personnel.actingAs || null,
                                    // Add toPosition fields
                                    toPosCodeId: personnel.toPosCodeId || null,
                                    toPosition: personnel.toPosition || null,
                                    toPositionNumber: personnel.toPositionNumber || null,
                                    toUnit: personnel.toUnit || null,
                                    toActingAs: personnel.toActingAs || null,
                                    notes: personnel.notes || null,
                                },
                            });
                        }
                    }

                    // Delete extra details if board has fewer items
                    if (existingDetails.length > column.itemIds.length) {
                        const idsToDelete = existingDetails.slice(column.itemIds.length).map(d => d.id);
                        await tx.swapTransactionDetail.deleteMany({
                            where: { id: { in: idsToDelete } }
                        });
                    }

                    // Update transaction title
                    await tx.swapTransaction.update({
                        where: { id: column.linkedTransactionId },
                        data: {
                            groupName: column.title,
                            updatedBy: username,
                        }
                    });

                    // Add to layout with explicit index
                    lanes.push({
                        index: lanes.length,
                        transactionId: column.linkedTransactionId,
                        title: column.title,
                        vacantPosition: column.vacantPosition,
                        isCompleted: column.isCompleted || false,
                    });
                } else {
                    // Custom lane - create new transaction with type 'promotion-chain' or 'custom'
                    const newTransaction = await tx.swapTransaction.create({
                        data: {
                            year,
                            swapDate: new Date(),
                            swapType: 'promotion-chain', // Use promotion-chain for board-created lanes
                            groupName: column.title,
                            groupNumber: column.groupNumber || null,
                            status: 'active',
                            isCompleted: column.itemIds.length > 0,
                            createdBy: username,
                        },
                    });

                    createdTransactionIds.push(newTransaction.id);

                    // Create details
                    for (let i = 0; i < column.itemIds.length; i++) {
                        const itemId = column.itemIds[i];
                        const personnel = personnelMap[itemId];

                        if (personnel) {
                            await tx.swapTransactionDetail.create({
                                data: {
                                    transactionId: newTransaction.id,
                                    sequence: i,
                                    personnelId: (personnel.isPlaceholder || !personnel.originalId) ? null : personnel.originalId,
                                    noId: personnel.noId ? parseInt(String(personnel.noId), 10) : null,
                                    nationalId: personnel.nationalId || null,
                                    fullName: personnel.fullName || 'Unknown',
                                    rank: personnel.rank || null,
                                    seniority: personnel.seniority || null,
                                    posCodeId: personnel.posCodeId || null,
                                    birthDate: personnel.birthDate || null,
                                    age: personnel.age || null,
                                    education: personnel.education || null,
                                    lastAppointment: personnel.lastAppointment || null,
                                    currentRankSince: personnel.currentRankSince || null,
                                    enrollmentDate: personnel.enrollmentDate || null,
                                    retirementDate: personnel.retirementDate || null,
                                    yearsOfService: personnel.yearsOfService || null,
                                    trainingLocation: personnel.trainingLocation || null,
                                    trainingCourse: personnel.trainingCourse || null,
                                    supportName: personnel.supporterName || null,
                                    supportReason: personnel.supportReason || null,
                                    requestedPosition: personnel.requestedPosition || null,
                                    fromPosition: personnel.position || null,
                                    fromPositionNumber: personnel.positionNumber || null,
                                    fromUnit: personnel.unit || null,
                                    fromActingAs: personnel.actingAs || null,
                                    toPosition: column.vacantPosition?.position || null,
                                    toPositionNumber: column.vacantPosition?.positionNumber || null,
                                    toUnit: column.vacantPosition?.unit || null,
                                    toPosCodeId: column.vacantPosition?.posCodeMaster?.id || null,
                                    notes: personnel.notes || null,
                                },
                            });
                        }
                    }

                    // Add to layout with explicit index
                    lanes.push({
                        index: lanes.length,
                        transactionId: newTransaction.id,
                        title: column.title,
                        vacantPosition: column.vacantPosition,
                        isCompleted: column.isCompleted || false,
                    });
                }
            }

            // Cleanup: ลบ TransactionId ที่เคยอยู่ใน layout เก่า แต่ไม่อยู่ใน layout ใหม่แล้ว
            const currentTransactionIds = lanes.map(l => l.transactionId).filter(Boolean);
            const transactionsToDelete = oldTransactionIds.filter(id => !currentTransactionIds.includes(id));

            if (transactionsToDelete.length > 0) {
                console.log(`Cleaning up ${transactionsToDelete.length} orphan transactions:`, transactionsToDelete);
                // ลบ details ก่อน (Cascade delete handles it but better be safe)
                await tx.swapTransactionDetail.deleteMany({
                    where: { transactionId: { in: transactionsToDelete } }
                });
                // ลบ transactions
                await tx.swapTransaction.deleteMany({
                    where: { id: { in: transactionsToDelete } }
                });
            }

            // Delete old layout record
            await tx.swapTransaction.deleteMany({
                where: {
                    year,
                    swapType: BOARD_LAYOUT_TYPE,
                },
            });


            // Create new layout record
            await tx.swapTransaction.create({
                data: {
                    year,
                    swapDate: new Date(),
                    swapType: BOARD_LAYOUT_TYPE,
                    groupName: `Board Layout ${year}`,
                    status: 'active',
                    isCompleted: true,
                    notes: JSON.stringify({ lanes }),
                    createdBy: username,
                },
            });

            return { updatedTransactionIds, createdTransactionIds, lanes, lanesCount: lanes.length };
        });

        return NextResponse.json({
            success: true,
            message: `บันทึกข้อมูลปี ${year} สำเร็จ`,
            updatedTransactionsCount: result.updatedTransactionIds.length,
            createdTransactionsCount: result.createdTransactionIds.length,
            lanesCount: result.lanesCount,
            lanes: result.lanes, // ส่ง lanes กลับไปให้ frontend update state
        });

    } catch (error: any) {
        console.error('Error saving personnel board:', error);
        return NextResponse.json(
            { error: 'Failed to save personnel board', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/personnel-board?year={year}
 * ลบข้อมูล Personnel Board Layout ของปีที่ระบุ
 * (ไม่ลบ SwapTransaction จริงๆ - แค่ลบ layout)
 */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');

        if (!yearParam) {
            return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
        }

        const year = parseInt(yearParam, 10);
        if (isNaN(year)) {
            return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
        }

        // ลบเฉพาะ layout record (ไม่ลบ SwapTransaction จริงๆ)
        const deleted = await prisma.swapTransaction.deleteMany({
            where: {
                year,
                swapType: BOARD_LAYOUT_TYPE,
            },
        });

        return NextResponse.json({
            success: true,
            message: `ลบ Board Layout ปี ${year} สำเร็จ`,
            deletedCount: deleted.count,
        });

    } catch (error: any) {
        console.error('Error deleting personnel board:', error);
        return NextResponse.json(
            { error: 'Failed to delete personnel board', details: error.message },
            { status: 500 }
        );
    }
}
