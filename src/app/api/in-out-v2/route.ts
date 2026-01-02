import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Use global prisma instance to prevent connection pool exhaustion
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export interface InOutRecord {
    id: string;
    incomingPerson: {
        personnelId: string;
        name: string;
        rank: string | null;
        fromPosition: string | null;
        fromUnit: string | null;
        posCode: string | null;
    } | null;
    currentHolder: {
        personnelId: string;
        name: string;
        rank: string | null;
        position: string | null;
        unit: string | null;
        posCode: string | null;
        posCodeId: number | null;
        age: string | null;
    } | null;
    vacantPosition: {
        position: string | null;
        posCode: string | null;
        posCodeId: number | null;
        unit: string | null;
    } | null;
    positionNumber: string | null;
    division: string | null;
    group: string | null;
    outgoingPerson: {
        toPosition: string | null;
        toPositionNumber: string | null;
        toUnit: string | null;
        toPosCode: string | null;
        toPosCodeId: number | null;
        requestedPosition: string | null;
        supporter: string | null;
    } | null;
    status: 'filled' | 'vacant' | 'reserved' | 'swap' | 'promotion' | 'pending';
    remark: string | null;
    swapType: string | null;
}

// Helper functions
const checkIsVacant = (fullName: string | null | undefined, rank: string | null | undefined): boolean => {
    const hasNoRank = !rank || rank.trim() === '';
    if (!hasNoRank) return false;
    if (fullName) {
        const trimmedName = fullName.trim();
        if (trimmedName.includes('ว่าง (กันตำแหน่ง)') || trimmedName.includes('ว่าง(กันตำแหน่ง)')) {
            return false;
        }
    }
    return true;
};

const checkIsReserved = (fullName: string | null | undefined): boolean => {
    if (!fullName) return false;
    const trimmedName = fullName.trim();
    return trimmedName.includes('ว่าง (กันตำแหน่ง)') || trimmedName.includes('ว่าง(กันตำแหน่ง)');
};

const normalizePositionNumber = (posNum: string | null | undefined): string => {
    if (!posNum) return '';
    return posNum.replace(/\s+/g, '').trim();
};

// Simple cache for filter options only (lightweight)
let filterOptionsCache: { data: { units: string[]; positionCodes: { id: number; name: string }[] }; timestamp: number; year: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
    const startTime = Date.now();

    try {
        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || '2568', 10);
        const unit = searchParams.get('unit') || 'all';
        const posCodeId = searchParams.get('posCodeId') || 'all';
        const status = searchParams.get('status') || 'all';
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '0', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

        // Build where clause - SIMILAR TO police-personnel
        const where: any = {
            year: year,
            isActive: true,
        };

        // Status filter at DB level (for vacant/reserved)
        if (status === 'vacant') {
            where.AND = [
                {
                    OR: [
                        { rank: { equals: null } },
                        { rank: { equals: '' } }
                    ]
                },
                {
                    OR: [
                        { fullName: { equals: null } },
                        { fullName: { equals: '' } },
                        {
                            AND: [
                                { fullName: { not: null } },
                                { fullName: { not: { contains: 'ว่าง (กันตำแหน่ง)' } } },
                                { fullName: { not: { contains: 'ว่าง(กันตำแหน่ง)' } } }
                            ]
                        }
                    ]
                }
            ];
        } else if (status === 'reserved') {
            where.OR = [
                { fullName: { contains: 'ว่าง (กันตำแหน่ง)' } },
                { fullName: { contains: 'ว่าง(กันตำแหน่ง)' } }
            ];
        }

        // Unit filter
        if (unit !== 'all') {
            if (where.AND) {
                where.AND.push({ unit: { equals: unit } });
            } else {
                where.AND = [{ unit: { equals: unit } }];
            }
        }

        // Position code filter
        if (posCodeId !== 'all') {
            const posCodeIdNum = parseInt(posCodeId, 10);
            if (!isNaN(posCodeIdNum)) {
                if (where.AND) {
                    where.AND.push({ posCodeId: { equals: posCodeIdNum } });
                } else {
                    where.AND = [{ posCodeId: { equals: posCodeIdNum } }];
                }
            }
        }

        // Search filter
        if (search) {
            const searchConditions = [
                { fullName: { contains: search } },
                { position: { contains: search } },
                { unit: { contains: search } },
                { positionNumber: { contains: search } },
            ];

            if (where.AND || where.OR) {
                where.AND = where.AND ? [...where.AND, { OR: searchConditions }] : [{ OR: searchConditions }];
            } else {
                where.OR = searchConditions;
            }
        }

        // Check if we need to do post-query filtering (for swap/promotion status)
        const needsPostFilter = status === 'swap' || status === 'promotion' || status === 'filled' || status === 'pending';
        const skip = page * pageSize;

        // Main query - use DB pagination when possible
        const [personnel, total] = await Promise.all([
            prisma.policePersonnel.findMany({
                where,
                ...(needsPostFilter ? {} : { skip, take: pageSize }),
                orderBy: [{ posCodeId: 'asc' }, { noId: 'asc' }],
                include: { posCodeMaster: true },
            }),
            prisma.policePersonnel.count({ where }),
        ]);

        // Get filter options (cached)
        const now = Date.now();
        if (!filterOptionsCache || filterOptionsCache.year !== year || (now - filterOptionsCache.timestamp) > CACHE_TTL) {
            const [positionCodes, unitsList] = await Promise.all([
                prisma.posCodeMaster.findMany({
                    select: { id: true, name: true },
                    orderBy: { id: 'asc' },
                }),
                prisma.policePersonnel.findMany({
                    where: { year, isActive: true },
                    select: { unit: true },
                    distinct: ['unit'],
                    orderBy: { unit: 'asc' },
                })
            ]);

            filterOptionsCache = {
                data: {
                    units: unitsList.map((u: { unit: string | null }) => u.unit).filter(Boolean) as string[],
                    positionCodes,
                },
                timestamp: now,
                year,
            };
        }

        // Fetch ALL swap transaction details for this year to find incoming persons
        // We need to find who is moving TO each position
        const allSwapDetails = await prisma.swapTransactionDetail.findMany({
            where: {
                transaction: {
                    year,
                    status: { in: ['completed', 'active'] }
                }
            },
            include: {
                transaction: true,
                posCodeMaster: true,
                toPosCodeMaster: true,
            },
        });

        // Create lookup maps:
        // 1. By nationalId - to find outgoing info for current holder
        // 2. By toPositionNumber - to find incoming person for a position
        // NOTE: positionNumber is unique across units in a given year, so we can use it as the primary key
        const swapDetailsByNationalId = new Map<string, any>();
        const incomingByPositionNumber = new Map<string, any>();

        for (const detail of allSwapDetails) {
            if (detail.nationalId) {
                swapDetailsByNationalId.set(detail.nationalId, detail);
            }
            // Build incoming person lookup: toPositionNumber -> detail (person moving IN)
            if (detail.toPositionNumber) {
                const normPosNum = normalizePositionNumber(detail.toPositionNumber);
                if (normPosNum) {
                    incomingByPositionNumber.set(normPosNum, detail);
                }
            }
        }

        // Transform personnel to InOutRecords
        let finalRecords: InOutRecord[];
        let finalTotal: number;

        const transformPerson = (person: any): InOutRecord => {
            const swapDetail = person.nationalId ? swapDetailsByNationalId.get(person.nationalId) : null;
            const isReserved = checkIsReserved(person.fullName);
            const isVacant = !isReserved && checkIsVacant(person.fullName, person.rank);
            const hasSwap = !!swapDetail;

            // Find incoming person - who is moving TO this position
            let incomingPerson: InOutRecord['incomingPerson'] = null;
            if (person.positionNumber) {
                const normPosNum = normalizePositionNumber(person.positionNumber);
                const incomingDetail = incomingByPositionNumber.get(normPosNum);
                if (incomingDetail && incomingDetail.fullName) {
                    // Don't show placeholder ("ว่าง") as incoming person
                    const incomingName = incomingDetail.fullName?.trim() || '';
                    const isPlaceholder = ['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)', ''].includes(incomingName);

                    if (!isPlaceholder) {
                        incomingPerson = {
                            personnelId: incomingDetail.personnelId || incomingDetail.id,
                            name: incomingDetail.fullName || '',
                            rank: incomingDetail.rank || null,
                            fromPosition: incomingDetail.fromPosition || null,
                            fromUnit: incomingDetail.fromUnit || null,
                            posCode: incomingDetail.posCodeMaster?.name || null,
                        };
                    }
                }
            }

            // Determine status
            let recordStatus: InOutRecord['status'] = 'pending';
            if (isReserved) {
                recordStatus = 'reserved';
            } else if (isVacant) {
                recordStatus = 'vacant';
            } else if (hasSwap) {
                const swapType = swapDetail.transaction?.swapType;
                if (swapType === 'two-way' || swapType === 'three-way') {
                    recordStatus = 'swap';
                } else if (swapType === 'promotion-chain') {
                    recordStatus = 'promotion';
                } else {
                    recordStatus = 'filled';
                }
            } else {
                recordStatus = 'filled';
            }

            return {
                id: person.id,
                incomingPerson,
                currentHolder: (isVacant || isReserved) ? null : {
                    personnelId: person.id,
                    name: person.fullName || '',
                    rank: person.rank,
                    position: person.position,
                    unit: person.unit,
                    posCode: person.posCodeMaster?.name || null,
                    posCodeId: person.posCodeId,
                    age: person.age,
                },
                vacantPosition: (isVacant || isReserved) ? {
                    position: person.position,
                    posCode: person.posCodeMaster?.name || null,
                    posCodeId: person.posCodeId,
                    unit: person.unit,
                } : null,
                positionNumber: person.positionNumber,
                division: person.unit?.split('.')[0] || null,
                group: swapDetail?.transaction?.groupNumber || null,
                outgoingPerson: hasSwap ? {
                    toPosition: swapDetail.toPosition,
                    toPositionNumber: swapDetail.toPositionNumber,
                    toUnit: swapDetail.toUnit,
                    toPosCode: swapDetail.toPosCodeMaster?.name || null,
                    toPosCodeId: swapDetail.toPosCodeId || null,
                    requestedPosition: person.requestedPosition || null,
                    supporter: person.supporterName,
                } : null,
                status: recordStatus,
                remark: swapDetail?.notes || person.notes || null,
                swapType: swapDetail?.transaction?.swapType || null,
            };
        };

        if (needsPostFilter) {
            // Transform all and filter by status
            const allRecords = personnel.map(transformPerson);
            const filteredRecords = allRecords.filter(r => r.status === status);
            finalTotal = filteredRecords.length;
            finalRecords = filteredRecords.slice(skip, skip + pageSize);
        } else {
            // Simple case - already paginated
            finalRecords = personnel.map(transformPerson);
            finalTotal = total;
        }

        // Calculate summary (simple counts from where clause - fast)
        const summary = {
            total: total,
            filled: 0,
            vacant: 0,
            reserved: 0,
            swap: 0,
            promotion: 0,
            pending: 0,
        };

        // Only populate the relevant count based on current filter
        if (status === 'vacant') {
            summary.vacant = total;
        } else if (status === 'reserved') {
            summary.reserved = total;
        } else if (status !== 'all') {
            // For swap/promotion/filled/pending, use the filtered count
            summary[status as keyof typeof summary] = finalTotal;
        }

        const endTime = Date.now();
        console.log(`[in-out-v2] Query took ${endTime - startTime}ms for ${finalRecords.length} records (status: ${status})`);

        return NextResponse.json({
            success: true,
            data: {
                records: finalRecords,
                totalCount: finalTotal,
                page,
                pageSize,
                summary,
                filters: filterOptionsCache.data,
            },
        });
    } catch (error) {
        console.error('Error fetching in-out data:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch in-out data',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
