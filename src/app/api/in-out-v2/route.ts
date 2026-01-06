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
        posCodeId: number | null;
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
        img?: string | null;
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
    status: 'filled' | 'vacant' | 'reserved' | 'swap' | 'three-way' | 'promotion' | 'pending';
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

        // Search logic - Moved to DB level
        if (search) {
            // 1. Find relevant swap details (for Incoming Person search or Group Number search)
            // Find transactions with matching groupNumber OR details with matching fullName/rank
            const matchedDetails = await prisma.swapTransactionDetail.findMany({
                where: {
                    transaction: {
                        year,
                        status: { in: ['completed', 'active'] }
                    },
                    OR: [
                        { fullName: { contains: search } }, // Incoming Person Name match
                        { rank: { contains: search } }, // Check rank too
                        { transaction: { groupNumber: { contains: search } } }, // Group Number match
                        { transaction: { groupName: { contains: search } } },
                        { toPosition: { contains: search } } // Outgoing position (from card perspective)
                    ]
                },
                select: {
                    fromPositionNumber: true,
                    toPositionNumber: true,
                }
            });

            const searchPosNums = new Set<string>();
            for (const d of matchedDetails) {
                if (d.fromPositionNumber) searchPosNums.add(normalizePositionNumber(d.fromPositionNumber));
                if (d.toPositionNumber) searchPosNums.add(normalizePositionNumber(d.toPositionNumber));
            }

            const searchPosNumArray = Array.from(searchPosNums);

            // 2. Build the main where clause
            const searchCondition: any = {
                OR: [
                    // Direct fields on PolicePersonnel
                    { fullName: { contains: search } },
                    { position: { contains: search } }, // Current position name
                    { unit: { contains: search } },
                    { positionNumber: { contains: search } },
                    { rank: { contains: search } },
                ]
            };

            // Add matches from swap/incoming logic
            if (searchPosNumArray.length > 0) {
                searchCondition.OR.push({ positionNumber: { in: searchPosNumArray } });
            }

            if (where.AND) {
                where.AND.push(searchCondition);
            } else {
                where.AND = [searchCondition];
            }
        }

        // Check if we need to do post-query filtering (for swap/promotion/three-way status)
        // Note: Search relies on DB filtering now, so we don't need post-filter for search
        const needsPostFilter = status === 'swap' || status === 'three-way' || status === 'promotion' || status === 'filled' || status === 'pending';
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
        // Create lookup maps:
        // 1. By nationalId - to find outgoing info for current holder
        // 2. By toPositionNumber - to find incoming person for a position
        // 3. By fromPositionNumber - to find outgoing move for a position (especially if vacant)
        // NOTE: positionNumber is unique across units in a given year, so we can use it as the primary key
        const swapDetailsByNationalId = new Map<string, any>();
        const incomingByPositionNumber = new Map<string, any>();
        const swapDetailsByFromPositionNumber = new Map<string, any>();
        const swapPartnerLookup = new Map<string, any>(); // key: transactionId_toPositionNumber

        for (const detail of allSwapDetails) {
            if (detail.nationalId) {
                swapDetailsByNationalId.set(detail.nationalId, detail);
            }
            // Build incoming person lookup: toPositionNumber -> detail (person moving IN)
            const normToPosNum = normalizePositionNumber(detail.toPositionNumber);
            if (normToPosNum) {
                incomingByPositionNumber.set(normToPosNum, detail);

                // For swap partner lookup
                if (detail.transactionId) {
                    swapPartnerLookup.set(`${detail.transactionId}_${normToPosNum}`, detail);
                }
            }
            // Build outgoing move lookup: fromPositionNumber -> detail (person moving OUT)
            const normFromPosNum = normalizePositionNumber(detail.fromPositionNumber);
            if (normFromPosNum) {
                swapDetailsByFromPositionNumber.set(normFromPosNum, detail);
            }
        }

        // Fetch position names ONLY for positions involved in transactions to save memory and time
        const involvedPosNumbers = new Set<string>();
        for (const detail of allSwapDetails) {
            if (detail.fromPositionNumber) {
                const norm = normalizePositionNumber(detail.fromPositionNumber);
                if (norm) involvedPosNumbers.add(norm);
            }
            if (detail.toPositionNumber) {
                const norm = normalizePositionNumber(detail.toPositionNumber);
                if (norm) involvedPosNumbers.add(norm);
            }
        }

        // Also add position numbers from the main query results (personnel)
        for (const p of personnel) {
            if (p.positionNumber) {
                const norm = normalizePositionNumber(p.positionNumber);
                if (norm) involvedPosNumbers.add(norm);
            }
        }

        const involvedPositions = await prisma.policePersonnel.findMany({
            where: {
                year,
                isActive: true,
                positionNumber: { in: Array.from(involvedPosNumbers) }
            },
            select: { positionNumber: true, position: true, unit: true },
        });

        const positionNamesMap = new Map<string, { position: string, unit: string }>();
        for (const p of involvedPositions) {
            if (p.positionNumber) {
                const norm = normalizePositionNumber(p.positionNumber);
                if (norm) {
                    positionNamesMap.set(norm, {
                        position: p.position || '',
                        unit: p.unit || ''
                    });
                }
            }
        }
        console.log(`[in-out-v2] Position lookup map built with ${positionNamesMap.size} entries`);

        // Transform personnel to InOutRecords
        let finalRecords: InOutRecord[];
        let finalTotal: number;

        const transformPerson = (person: any): InOutRecord => {
            const isReserved = checkIsReserved(person.fullName);
            const isVacant = !isReserved && checkIsVacant(person.fullName, person.rank);
            const normPosNum = person.positionNumber ? normalizePositionNumber(person.positionNumber) : null;

            // 1. Find swap detail for the person (if any)
            const swapDetailByPerson = person.nationalId ? swapDetailsByNationalId.get(person.nationalId) : null;

            // 2. Find swap detail where this position is the source (useful for vacant positions or chain continuity)
            const swapDetailByPosition = normPosNum ? swapDetailsByFromPositionNumber.get(normPosNum) : null;

            // Prefer person-based swap, fallback to position-based (especially for vacant rows)
            const swapDetail = swapDetailByPerson || swapDetailByPosition;
            const hasSwap = !!swapDetail;

            // Find incoming person - who is moving TO this position
            let incomingPerson: InOutRecord['incomingPerson'] = null;

            // For two-way or three-way swaps, find swap partner from the SAME transaction
            const swapType = swapDetail?.transaction?.swapType;
            const isSwapTransaction = swapType === 'two-way' || swapType === 'three-way';

            if (isSwapTransaction && swapDetail?.transactionId) {
                // Find other person(s) in this swap transaction who is moving TO this position
                // Use Map lookup instead of .find()
                const swapPartner = swapPartnerLookup.get(`${swapDetail.transactionId}_${normPosNum}`);

                // If the found person is the same person (can happen with positions), 
                // we might need more complex logic, but usually this is the partner
                const partnerToUse = (swapPartner && swapPartner.id !== swapDetail.id) ? swapPartner : null;

                if (partnerToUse && partnerToUse.fullName) {
                    const partnerName = partnerToUse.fullName?.trim() || '';
                    const isPlaceholder = ['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)', ''].includes(partnerName);

                    if (!isPlaceholder) {
                        incomingPerson = {
                            personnelId: partnerToUse.personnelId || partnerToUse.id,
                            name: partnerToUse.fullName || '',
                            rank: partnerToUse.rank || null,
                            fromPosition: partnerToUse.fromPosition || null,
                            fromUnit: partnerToUse.fromUnit || null,
                            posCode: partnerToUse.posCodeMaster?.name || null,
                            posCodeId: partnerToUse.posCodeId || null,
                        };
                    }
                }
            } else if (normPosNum) {
                // Fallback to original lookup for non-swap transactions
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
                            posCodeId: incomingDetail.posCodeId || null,
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
                if (swapType === 'two-way') {
                    recordStatus = 'swap';
                } else if (swapType === 'three-way') {
                    recordStatus = 'three-way';
                } else if (swapType === 'promotion-chain') {
                    recordStatus = 'promotion';
                } else {
                    recordStatus = 'filled';
                }
            } else {
                recordStatus = 'filled';
            }

            // Look up target position info from master map for accuracy
            // For swaps, if toPosition is missing, derive from swap partner's fromPosition
            let toPosition = swapDetail?.toPosition;
            let toPositionNumber = swapDetail?.toPositionNumber;
            let toUnit = swapDetail?.toUnit;
            let toPosCode = swapDetail?.toPosCodeMaster?.name || null;
            let toPosCodeId = swapDetail?.toPosCodeId || null;

            if (isSwapTransaction && swapDetail?.transactionId && (!toPosition || !toPositionNumber)) {
                // Find swap partner to get their original position as our target
                // For a 2-way swap, it's the only other person in the transaction
                const swapPartner = allSwapDetails.find(d =>
                    d.transactionId === swapDetail.transactionId &&
                    d.id !== swapDetail.id
                );

                if (swapPartner) {
                    toPosition = toPosition || swapPartner.fromPosition;
                    toPositionNumber = toPositionNumber || swapPartner.fromPositionNumber;
                    toUnit = toUnit || swapPartner.fromUnit;
                    toPosCode = toPosCode || swapPartner.posCodeMaster?.name || null;
                    toPosCodeId = toPosCodeId || swapPartner.posCodeId || null;
                }
            }

            const targetPosNorm = toPositionNumber ? normalizePositionNumber(toPositionNumber) : null;
            const targetPosInfo = targetPosNorm ? positionNamesMap.get(targetPosNorm) : null;

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
                    img: person.avatarUrl,
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
                    toPosition: targetPosInfo?.position || toPosition,
                    toPositionNumber: toPositionNumber,
                    toUnit: targetPosInfo?.unit || toUnit,
                    toPosCode: toPosCode,
                    toPosCodeId: toPosCodeId,
                    requestedPosition: swapDetail.requestedPosition || person.requestedPosition || null,
                    supporter: swapDetail.supportName || person.supporterName,
                } : null,
                status: recordStatus,
                remark: swapDetail?.notes || person.notes || null,
                swapType: swapDetail?.transaction?.swapType || null,
            };
        };

        if (needsPostFilter) {
            // Transform all and filter by status
            const allRecords = personnel.map(transformPerson);

            // Since needsPostFilter is true, status matches one of the values requiring post-processing
            let filteredRecords = allRecords.filter((r: InOutRecord) => r.status === status);
            // specific to the results. However, because we paginate AFTER filter in needsPostFilter mode,
            // we must be careful.
            // If needsPostFilter is true (e.g. status='swap'), we fetched ALL swaps (maybe filtered by search in DB).
            // So we just return them paginated.

            // Note: If we had a search, the DB query already filtered the personnel.
            // So 'filteredRecords' only contains people matching the search.
            // We just need to slice.

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
            'three-way': 0,
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
        console.log(`[in-out-v2] Query took ${endTime - startTime}ms for ${finalRecords.length} records (status: ${status}, search: ${search})`);

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
