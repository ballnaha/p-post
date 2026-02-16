import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

const BOARD_LAYOUT_TYPE = 'board-layout';

// Helper for safe integer parsing
const safeInt = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const parsed = parseInt(String(val), 10);
    return isNaN(parsed) ? null : parsed;
};

// Helper for safe relation ID (must be positive integer to avoid FK errors)
const safeRelationId = (val: any): number | null => {
    const parsed = safeInt(val);
    if (parsed === null || parsed <= 0) return null;
    return parsed;
};

/**
 * GET /api/personnel-board?year={year}
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

        const layoutRecord = await prisma.swapTransaction.findFirst({
            where: {
                year,
                swapType: BOARD_LAYOUT_TYPE,
            },
            select: { notes: true },
        });

        if (!layoutRecord || !layoutRecord.notes) {
            return NextResponse.json({
                success: true,
                year,
                columns: [],
                personnelMap: {},
            });
        }

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

        const transactionIds = boardLayout.lanes?.map((l: any) => l.transactionId).filter(Boolean) || [];
        const sortedLanes = [...(boardLayout.lanes || [])].sort((a: any, b: any) => (a.index ?? 999) - (b.index ?? 999));

        // ✅ Optimized: ใช้ select แทน include เพื่อดึงเฉพาะ field ที่ใช้
        const transactions: any[] = await prisma.swapTransaction.findMany({
            where: {
                id: { in: transactionIds },
            },
            select: {
                id: true,
                groupName: true,
                groupNumber: true,
                swapType: true,
                swapDetails: {
                    select: {
                        id: true,
                        personnelId: true,
                        noId: true,
                        nationalId: true,
                        fullName: true,
                        rank: true,
                        seniority: true,
                        age: true,
                        birthDate: true,
                        education: true,
                        lastAppointment: true,
                        currentRankSince: true,
                        enrollmentDate: true,
                        retirementDate: true,
                        yearsOfService: true,
                        trainingLocation: true,
                        trainingCourse: true,
                        supportName: true,
                        supportReason: true,
                        requestedPosition: true,
                        notes: true,
                        fromPosition: true,
                        fromPositionNumber: true,
                        fromUnit: true,
                        fromActingAs: true,
                        toPosition: true,
                        toPositionNumber: true,
                        toUnit: true,
                        toActingAs: true,
                        posCodeId: true,
                        posCodeMaster: { select: { id: true, name: true } },
                        toPosCodeId: true,
                        toPosCodeMaster: { select: { id: true, name: true } },
                    },
                    orderBy: { sequence: 'asc' },
                },
            },
        });

        const txMap = new Map(transactions.map((tx: any) => [tx.id, tx]));

        // Collect unique personnel IDs for batch lookup
        const personnelIdSet = new Set<string>();
        transactions.forEach(tx => {
            tx.swapDetails.forEach((detail: any) => {
                if (detail.personnelId) {
                    personnelIdSet.add(detail.personnelId);
                }
            });
        });
        const personnelIds = Array.from(personnelIdSet);

        // ✅ Optimized: ใช้ select เฉพาะ field ที่ใช้ + ไม่ query ถ้าไม่มี personnelIds
        const personnelDetails: any[] = personnelIds.length > 0
            ? await prisma.policePersonnel.findMany({
                where: { id: { in: personnelIds } },
                select: {
                    id: true,
                    noId: true,
                    nationalId: true,
                    fullName: true,
                    rank: true,
                    position: true,
                    positionNumber: true,
                    unit: true,
                    seniority: true,
                    age: true,
                    birthDate: true,
                    education: true,
                    lastAppointment: true,
                    currentRankSince: true,
                    enrollmentDate: true,
                    retirementDate: true,
                    yearsOfService: true,
                    trainingLocation: true,
                    trainingCourse: true,
                    supporterName: true,
                    supportReason: true,
                    requestedPosition: true,
                    notes: true,
                    actingAs: true,
                    posCodeId: true,
                    posCodeMaster: { select: { id: true, name: true } },
                },
            })
            : [];

        const personnelDetailMap = new Map(personnelDetails.map((p: any) => [p.id, p]));
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

                tx.swapDetails.forEach((detail: any) => {
                    const original = detail.personnelId ? personnelDetailMap.get(detail.personnelId) : null;

                    personnelMap[detail.id] = {
                        id: detail.id,
                        isPlaceholder: !detail.personnelId || String(detail.personnelId).startsWith('placeholder-'),
                        originalId: detail.personnelId,
                        swapDetailId: detail.id,
                        noId: safeInt(original?.noId) || safeInt(detail.noId),
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

                        supporterName: original?.supporterName || detail.supportName,
                        supportReason: original?.supportReason || detail.supportReason,
                        requestedPosition: original?.requestedPosition || detail.requestedPosition,
                        notes: detail.notes || original?.notes,
                        actingAs: detail.fromActingAs || original?.actingAs,

                        posCodeId: safeInt(original?.posCodeId) || safeInt(detail.posCodeId),
                        posCodeMaster: original?.posCodeMaster ? {
                            id: original.posCodeMaster.id,
                            name: original.posCodeMaster.name,
                        } : (detail.posCodeMaster ? {
                            id: detail.posCodeMaster.id,
                            name: detail.posCodeMaster.name,
                        } : null),

                        toPosCodeId: safeInt(detail.toPosCodeId),
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
                columns.push({
                    id: laneInfo.id,
                    title: laneInfo.title || 'Custom Lane',
                    groupNumber: laneInfo.groupNumber,
                    itemIds: laneInfo.itemIds || [],
                    vacantPosition: laneInfo.vacantPosition || null,
                    chainType: 'custom',
                    isCompleted: laneInfo.isCompleted || false,
                });

                if (laneInfo.personnel) {
                    for (const p of laneInfo.personnel) {
                        personnelMap[p.id] = p;
                    }
                }
            } else {
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

        const result = await prisma.$transaction(
            async (tx: any) => {
                const lanes: any[] = [];
                const updatedTransactionIds: string[] = [];
                const createdTransactionIds: string[] = [];

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
                    if (column.linkedTransactionId && column.linkedTransactionType) {
                        const existingTransaction = await tx.swapTransaction.findUnique({
                            where: { id: column.linkedTransactionId }
                        });

                        if (!existingTransaction) {
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

                        updatedTransactionIds.push(column.linkedTransactionId);

                        const existingDetails = await tx.swapTransactionDetail.findMany({
                            where: { transactionId: column.linkedTransactionId },
                            orderBy: { sequence: 'asc' }
                        });

                        for (let i = 0; i < column.itemIds.length; i++) {
                            const itemId = column.itemIds[i];
                            const personnel = personnelMap[itemId];

                            // Ensure personnelId is strictly string or null, checking placeholder
                            const personnelIdParam = (!personnel || personnel.isPlaceholder || !personnel.originalId || String(personnel.originalId).startsWith('placeholder-')) ? null : String(personnel.originalId);

                            // Calculate toPosition based on transaction type and chain sequence
                            let toPosition: string | null = null;
                            let toPositionNumber: string | null = null;
                            let toUnit: string | null = null;
                            let toPosCodeId: number | null = null;

                            const isSwapType = existingTransaction.swapType === 'two-way' || existingTransaction.swapType === 'three-way';

                            if (isSwapType) {
                                // For two-way swap: A -> B's position, B -> A's position
                                // For three-way swap: A -> B, B -> C, C -> A
                                if (existingTransaction.swapType === 'two-way' && column.itemIds.length === 2) {
                                    // Get the OTHER person's position
                                    const otherIndex = i === 0 ? 1 : 0;
                                    const otherItemId = column.itemIds[otherIndex];
                                    const otherPersonnel = personnelMap[otherItemId];
                                    if (otherPersonnel) {
                                        toPosition = otherPersonnel.position || null;
                                        toPositionNumber = otherPersonnel.positionNumber || null;
                                        toUnit = otherPersonnel.unit || null;
                                        toPosCodeId = safeRelationId(otherPersonnel.posCodeId);
                                    }
                                } else if (existingTransaction.swapType === 'three-way' && column.itemIds.length === 3) {
                                    // A(0) -> B(1), B(1) -> C(2), C(2) -> A(0)
                                    const targetIndex = (i + 1) % 3;
                                    const targetItemId = column.itemIds[targetIndex];
                                    const targetPersonnel = personnelMap[targetItemId];
                                    if (targetPersonnel) {
                                        toPosition = targetPersonnel.position || null;
                                        toPositionNumber = targetPersonnel.positionNumber || null;
                                        toUnit = targetPersonnel.unit || null;
                                        toPosCodeId = safeRelationId(targetPersonnel.posCodeId);
                                    }
                                }
                            } else {
                                // Promotion chain or transfer: First person goes to vacant, subsequent go to previous person's position
                                if (i === 0) {
                                    // First person goes to the vacant position
                                    toPosition = column.vacantPosition?.position || null;
                                    toPositionNumber = column.vacantPosition?.positionNumber || null;
                                    toUnit = column.vacantPosition?.unit || null;
                                    toPosCodeId = safeRelationId(column.vacantPosition?.posCodeMaster?.id || column.vacantPosition?.posCodeId);
                                } else {
                                    // Subsequent persons replace the previous person's position
                                    const prevItemId = column.itemIds[i - 1];
                                    const prevPersonnel = personnelMap[prevItemId];
                                    if (prevPersonnel) {
                                        toPosition = prevPersonnel.position || null;
                                        toPositionNumber = prevPersonnel.positionNumber || null;
                                        toUnit = prevPersonnel.unit || null;
                                        toPosCodeId = safeRelationId(prevPersonnel.posCodeId);
                                    }
                                }
                            }

                            if (personnel && existingDetails[i]) {
                                await tx.swapTransactionDetail.update({
                                    where: { id: existingDetails[i].id },
                                    data: {
                                        sequence: i,
                                        personnelId: personnelIdParam,
                                        noId: safeInt(personnel.noId),
                                        nationalId: personnel.nationalId || null,
                                        fullName: personnel.fullName || 'Unknown',
                                        rank: personnel.rank || null,
                                        seniority: personnel.seniority || null,
                                        posCodeId: safeRelationId(personnel.posCodeId),
                                        // Personal info
                                        birthDate: personnel.birthDate || null,
                                        age: personnel.age || null,
                                        education: personnel.education || null,
                                        // Appointment info
                                        lastAppointment: personnel.lastAppointment || null,
                                        currentRankSince: personnel.currentRankSince || null,
                                        enrollmentDate: personnel.enrollmentDate || null,
                                        retirementDate: personnel.retirementDate || null,
                                        yearsOfService: personnel.yearsOfService || null,
                                        // Training info
                                        trainingLocation: personnel.trainingLocation || null,
                                        trainingCourse: personnel.trainingCourse || null,
                                        // Support info
                                        supportName: personnel.supporterName || null,
                                        supportReason: personnel.supportReason || null,
                                        requestedPosition: personnel.requestedPosition || null,
                                        // From position
                                        fromPosition: personnel.position || null,
                                        fromPositionNumber: personnel.positionNumber || null,
                                        fromUnit: personnel.unit || null,
                                        fromActingAs: personnel.actingAs || null,
                                        // To position (calculated)
                                        toPosCodeId,
                                        toPosition,
                                        toPositionNumber,
                                        toUnit,
                                        toActingAs: personnel.toActingAs || null,
                                        notes: personnel.notes || null,
                                    },
                                });
                            } else if (personnel && !existingDetails[i]) {
                                await tx.swapTransactionDetail.create({
                                    data: {
                                        transactionId: column.linkedTransactionId,
                                        sequence: i,
                                        personnelId: personnelIdParam,
                                        noId: safeInt(personnel.noId),
                                        nationalId: personnel.nationalId || null,
                                        fullName: personnel.fullName || 'Unknown',
                                        rank: personnel.rank || null,
                                        seniority: personnel.seniority || null,
                                        posCodeId: safeRelationId(personnel.posCodeId),
                                        // Personal info
                                        birthDate: personnel.birthDate || null,
                                        age: personnel.age || null,
                                        education: personnel.education || null,
                                        // Appointment info
                                        lastAppointment: personnel.lastAppointment || null,
                                        currentRankSince: personnel.currentRankSince || null,
                                        enrollmentDate: personnel.enrollmentDate || null,
                                        retirementDate: personnel.retirementDate || null,
                                        yearsOfService: personnel.yearsOfService || null,
                                        // Training info
                                        trainingLocation: personnel.trainingLocation || null,
                                        trainingCourse: personnel.trainingCourse || null,
                                        // Support info
                                        supportName: personnel.supporterName || null,
                                        supportReason: personnel.supportReason || null,
                                        requestedPosition: personnel.requestedPosition || null,
                                        // From position
                                        fromPosition: personnel.position || null,
                                        fromPositionNumber: personnel.positionNumber || null,
                                        fromUnit: personnel.unit || null,
                                        fromActingAs: personnel.actingAs || null,
                                        // To position (calculated)
                                        toPosCodeId,
                                        toPosition,
                                        toPositionNumber,
                                        toUnit,
                                        toActingAs: personnel.toActingAs || null,
                                        notes: personnel.notes || null,
                                    },
                                });
                            }
                        }

                        if (existingDetails.length > column.itemIds.length) {
                            const idsToDelete = existingDetails.slice(column.itemIds.length).map((d: any) => d.id);
                            await tx.swapTransactionDetail.deleteMany({
                                where: { id: { in: idsToDelete } }
                            });
                        }

                        await tx.swapTransaction.update({
                            where: { id: column.linkedTransactionId },
                            data: {
                                groupName: column.title,
                                updatedBy: username,
                            }
                        });

                        lanes.push({
                            index: lanes.length,
                            transactionId: column.linkedTransactionId,
                            title: column.title,
                            vacantPosition: column.vacantPosition,
                            isCompleted: column.isCompleted || false,
                        });
                    } else {
                        // Map chainType to database swapType
                        let dbSwapType = 'promotion-chain';
                        if (column.chainType === 'swap') dbSwapType = 'two-way';
                        else if (column.chainType === 'three-way') dbSwapType = 'three-way';

                        const newTransaction = await tx.swapTransaction.create({
                            data: {
                                year,
                                swapDate: new Date(),
                                swapType: dbSwapType,
                                groupName: column.title,
                                groupNumber: column.groupNumber || null,
                                status: 'active',
                                isCompleted: column.itemIds.length > 0,
                                createdBy: username,
                            },
                        });

                        createdTransactionIds.push(newTransaction.id);

                        for (let i = 0; i < column.itemIds.length; i++) {
                            const itemId = column.itemIds[i];
                            const personnel = personnelMap[itemId];

                            if (personnel) {
                                const personnelIdParam = (!personnel || personnel.isPlaceholder || !personnel.originalId || String(personnel.originalId).startsWith('placeholder-')) ? null : String(personnel.originalId);

                                // Calculate toPosition based on chain sequence:
                                // - First person (i=0) goes to the vacant position
                                // - Subsequent persons (i>0) replace the previous person's position
                                let toPosition: string | null = null;
                                let toPositionNumber: string | null = null;
                                let toUnit: string | null = null;
                                let toPosCodeId: number | null = null;

                                if (i === 0) {
                                    // First person goes to the vacant position
                                    toPosition = column.vacantPosition?.position || null;
                                    toPositionNumber = column.vacantPosition?.positionNumber || null;
                                    toUnit = column.vacantPosition?.unit || null;
                                    toPosCodeId = safeRelationId(column.vacantPosition?.posCodeMaster?.id || column.vacantPosition?.posCodeId);
                                } else {
                                    // Subsequent persons replace the previous person's position
                                    const prevItemId = column.itemIds[i - 1];
                                    const prevPersonnel = personnelMap[prevItemId];
                                    if (prevPersonnel) {
                                        toPosition = prevPersonnel.position || null;
                                        toPositionNumber = prevPersonnel.positionNumber || null;
                                        toUnit = prevPersonnel.unit || null;
                                        toPosCodeId = safeRelationId(prevPersonnel.posCodeId);
                                    }
                                }

                                await tx.swapTransactionDetail.create({
                                    data: {
                                        transactionId: newTransaction.id,
                                        sequence: i,
                                        personnelId: personnelIdParam,
                                        noId: safeInt(personnel.noId),
                                        nationalId: personnel.nationalId || null,
                                        fullName: personnel.fullName || 'Unknown',
                                        rank: personnel.rank || null,
                                        seniority: personnel.seniority || null,
                                        posCodeId: safeRelationId(personnel.posCodeId),
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
                                        toPosition,
                                        toPositionNumber,
                                        toUnit,
                                        toPosCodeId,
                                        notes: personnel.notes || null,
                                    },
                                });
                            }
                        }

                        lanes.push({
                            index: lanes.length,
                            transactionId: newTransaction.id,
                            title: column.title,
                            vacantPosition: column.vacantPosition,
                            isCompleted: column.isCompleted || false,
                        });
                    }
                }

                const currentTransactionIds = lanes.map(l => l.transactionId).filter(Boolean);
                const transactionsToDelete = oldTransactionIds.filter(id => !currentTransactionIds.includes(id));

                if (transactionsToDelete.length > 0) {
                    console.log(`Cleaning up ${transactionsToDelete.length} orphan transactions:`, transactionsToDelete);
                    await tx.swapTransactionDetail.deleteMany({
                        where: { transactionId: { in: transactionsToDelete } }
                    });
                    await tx.swapTransaction.deleteMany({
                        where: { id: { in: transactionsToDelete } }
                    });
                }

                await tx.swapTransaction.deleteMany({
                    where: {
                        year,
                        swapType: BOARD_LAYOUT_TYPE,
                    },
                });

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
            },
            {
                maxWait: 10000, // 10 seconds max wait to acquire connection
                timeout: 60000, // 60 seconds max transaction time
            }
        );

        return NextResponse.json({
            success: true,
            message: `บันทึกข้อมูลปี ${year} สำเร็จ`,
            updatedTransactionsCount: result.updatedTransactionIds.length,
            createdTransactionsCount: result.createdTransactionIds.length,
            lanesCount: result.lanesCount,
            lanes: result.lanes,
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
 * DELETE /api/personnel-board
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
