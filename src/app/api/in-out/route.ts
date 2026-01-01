import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';


export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filtersOnly = searchParams.get('filtersOnly') === 'true';
        const unit = searchParams.get('unit') || 'all';
        const posCodeId = searchParams.get('posCodeId') || 'all';
        const status = searchParams.get('status') || 'all';
        const swapType = searchParams.get('swapType') || 'all';
        const search = searchParams.get('search') || '';
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear() + 543));
        const page = parseInt(searchParams.get('page') || '0');
        const pageSize = parseInt(searchParams.get('pageSize') || '10');

        if (filtersOnly) {
            const currentBuddhistYear = new Date().getFullYear() + 543;

            const [units, positionCodes] = await Promise.all([
                prisma.policePersonnel.findMany({
                    where: {
                        unit: { not: null },
                        year: currentBuddhistYear,
                        isActive: true
                    },
                    select: { unit: true },
                    distinct: ['unit'],
                    orderBy: { unit: 'asc' },
                }),
                prisma.posCodeMaster.findMany({
                    orderBy: { id: 'asc' },
                })
            ]);

            return NextResponse.json({
                success: true,
                data: {
                    filters: {
                        units: units.map(u => u.unit).filter(Boolean),
                        positionCodes: positionCodes.map(p => ({
                            id: p.id,
                            name: p.name,
                        })),
                    },
                },
            });
        }

        const currentBuddhistYear = new Date().getFullYear() + 543;

        const personnelWhere: Prisma.PolicePersonnelWhereInput = {
            year: currentBuddhistYear,
            isActive: true
        };

        const andConditions: Prisma.PolicePersonnelWhereInput[] = [];

        if (unit !== 'all') andConditions.push({ unit });
        if (posCodeId !== 'all') {
            const posCodeIdNum = parseInt(posCodeId);
            if (!isNaN(posCodeIdNum)) andConditions.push({ posCodeId: posCodeIdNum });
        }

        if (status !== 'all') {
            if (status === 'vacant') {
                andConditions.push({
                    AND: [
                        { OR: [{ rank: null }, { rank: '' }] },
                        {
                            OR: [
                                { fullName: null },
                                { fullName: '' },
                                {
                                    AND: [
                                        { fullName: { not: null } },
                                        { fullName: { not: { contains: 'ว่าง (กันตำแหน่ง)' } } },
                                        { fullName: { not: { contains: 'ว่าง(กันตำแหน่ง)' } } }
                                    ]
                                }
                            ]
                        }
                    ]
                });
            } else if (status === 'reserved') {
                andConditions.push({
                    OR: [
                        { fullName: { contains: 'ว่าง (กันตำแหน่ง)' } },
                        { fullName: { contains: 'ว่าง(กันตำแหน่ง)' } }
                    ]
                });
            } else if (status === 'occupied') {
                andConditions.push({
                    AND: [
                        { rank: { not: null } },
                        { rank: { not: '' } }
                    ]
                });
            }
        }

        if (search) {
            andConditions.push({
                OR: [
                    { fullName: { contains: search } },
                    { nationalId: { contains: search } },
                    { rank: { contains: search } },
                    { unit: { contains: search } },
                    { position: { contains: search } },
                    { positionNumber: { contains: search } },
                ]
            });
        }

        if (andConditions.length > 0) {
            personnelWhere.AND = andConditions;
        }

        const [personnel, swapDetails] = await Promise.all([
            prisma.policePersonnel.findMany({
                where: personnelWhere,
                include: { posCodeMaster: true },
                orderBy: { noId: 'asc' },
            }),
            prisma.swapTransactionDetail.findMany({
                where: {
                    transaction: {
                        year,
                        status: 'completed'
                    }
                },
                include: {
                    transaction: true,
                    posCodeMaster: true,
                    toPosCodeMaster: true,
                },
            })
        ]);

        const swapByPersonnelId = new Map();
        const swapByNationalId = new Map();

        swapDetails.forEach(detail => {
            if (detail.personnelId) swapByPersonnelId.set(detail.personnelId, detail);
            if (detail.nationalId) swapByNationalId.set(detail.nationalId, detail);
        });

        let combinedData = personnel.map(person => {
            const swapInfo = swapByPersonnelId.get(person.id) ||
                (person.nationalId ? swapByNationalId.get(person.nationalId) : null);

            return {
                id: person.id,
                personnelId: person.id,
                noId: person.noId,
                fullName: person.fullName,
                rank: person.rank,
                nationalId: person.nationalId,
                age: person.age,
                seniority: person.seniority,
                birthDate: person.birthDate,
                education: person.education,
                lastAppointment: person.lastAppointment,
                currentRankSince: person.currentRankSince,
                enrollmentDate: person.enrollmentDate,
                retirementDate: person.retirementDate,
                yearsOfService: person.yearsOfService,
                trainingLocation: person.trainingLocation,
                trainingCourse: person.trainingCourse,
                avatarUrl: person.avatarUrl,

                posCodeId: swapInfo?.posCodeId || person.posCodeId,
                posCodeMaster: swapInfo?.posCodeMaster || person.posCodeMaster,
                fromPosition: swapInfo?.fromPosition || person.position,
                fromPositionNumber: swapInfo?.fromPositionNumber || person.positionNumber,
                fromUnit: swapInfo?.fromUnit || person.unit,
                fromActingAs: swapInfo?.fromActingAs || person.actingAs,

                toPosCodeId: swapInfo?.toPosCodeId || null,
                toPosCodeMaster: swapInfo?.toPosCodeMaster || null,
                toPosition: swapInfo?.toPosition || null,
                toPositionNumber: swapInfo?.toPositionNumber || null,
                toUnit: swapInfo?.toUnit || null,
                toActingAs: swapInfo?.toActingAs || null,

                transaction: swapInfo ? {
                    id: swapInfo.transaction.id,
                    year: swapInfo.transaction.year,
                    swapDate: swapInfo.transaction.swapDate,
                    swapType: swapInfo.transaction.swapType,
                    groupNumber: swapInfo.transaction.groupNumber,
                } : null,

                sequence: swapInfo?.sequence ?? null,
                hasSwapped: !!swapInfo,
                replacedPerson: null as any,
            };
        });

        if (swapType !== 'all') {
            if (swapType === 'none') {
                combinedData = combinedData.filter(d => !d.transaction);
            } else {
                combinedData = combinedData.filter(d =>
                    d.transaction && d.transaction.swapType === swapType
                );
            }
        }

        // เรียงตาม noId เหมือนหน้า police_personnel (ไม่เรียงตาม hasSwapped)
        combinedData.sort((a, b) => {
            const noIdA = a.noId || '';
            const noIdB = b.noId || '';

            if (noIdA && noIdB) {
                const compareNum = String(noIdA).localeCompare(String(noIdB), undefined, { numeric: true });
                if (compareNum !== 0) return compareNum;
            }

            if (noIdA && !noIdB) return -1;
            if (!noIdA && noIdB) return 1;

            return (a.fullName || '').localeCompare(b.fullName || '', 'th');
        });

        const totalCount = combinedData.length;
        const paginatedData = combinedData.slice(page * pageSize, (page + 1) * pageSize);

        const transactionIds = [...new Set(paginatedData.filter(d => d.transaction).map(d => d.transaction!.id))];

        if (transactionIds.length > 0) {
            const allTransactionDetails = await prisma.swapTransactionDetail.findMany({
                where: { transactionId: { in: transactionIds } },
                include: {
                    posCodeMaster: true,
                    toPosCodeMaster: true,
                }
            });

            paginatedData.forEach((detail, index) => {
                if (!detail.toPosition && !detail.toPositionNumber) {
                    paginatedData[index].replacedPerson = null;
                    return;
                }

                const transactionPeople = allTransactionDetails.filter(d =>
                    d.transactionId === detail.transaction?.id
                );

                let replaced = null;

                if (detail.toPositionNumber) {
                    replaced = transactionPeople.find(d =>
                        d.id !== detail.id && d.fromPositionNumber === detail.toPositionNumber
                    );
                }

                if (!replaced && detail.toPosition) {
                    replaced = transactionPeople.find(d =>
                        d.id !== detail.id && d.fromPosition === detail.toPosition
                    );
                }

                if (!replaced && detail.transaction?.swapType === 'two-way' && transactionPeople.length === 2) {
                    replaced = transactionPeople.find(d => d.id !== detail.id);
                }

                paginatedData[index].replacedPerson = replaced ? {
                    id: replaced.id,
                    personnelId: replaced.personnelId,
                    noId: replaced.noId,
                    fullName: replaced.fullName,
                    rank: replaced.rank,
                    nationalId: replaced.nationalId,
                    age: replaced.age,
                    seniority: replaced.seniority,
                    birthDate: replaced.birthDate,
                    education: replaced.education,
                    lastAppointment: replaced.lastAppointment,
                    currentRankSince: replaced.currentRankSince,
                    enrollmentDate: replaced.enrollmentDate,
                    retirementDate: replaced.retirementDate,
                    yearsOfService: replaced.yearsOfService,
                    trainingLocation: replaced.trainingLocation,
                    trainingCourse: replaced.trainingCourse,
                    avatarUrl: replaced.avatarUrl,
                    posCodeId: replaced.posCodeId,
                    posCodeMaster: replaced.posCodeMaster,
                    fromPosition: replaced.fromPosition,
                    fromPositionNumber: replaced.fromPositionNumber,
                    fromUnit: replaced.fromUnit,
                    fromActingAs: replaced.fromActingAs,
                    toPosCodeId: replaced.toPosCodeId,
                    toPosCodeMaster: replaced.toPosCodeMaster,
                    toPosition: replaced.toPosition,
                    toPositionNumber: replaced.toPositionNumber,
                    toUnit: replaced.toUnit,
                    toActingAs: replaced.toActingAs,
                    transaction: null,
                    sequence: replaced.sequence,
                } : null;
            });
        } else {
            paginatedData.forEach((_, index) => {
                paginatedData[index].replacedPerson = null;
            });
        }

        const [units, positionCodes] = await Promise.all([
            prisma.policePersonnel.findMany({
                where: {
                    unit: { not: null },
                    year: currentBuddhistYear,
                    isActive: true
                },
                select: { unit: true },
                distinct: ['unit'],
                orderBy: { unit: 'asc' },
            }),
            prisma.posCodeMaster.findMany({
                orderBy: { id: 'asc' },
            })
        ]);

        // คำนวณสถิติสรุป
        const summary = {
            totalPersonnel: combinedData.length,
            promoted: combinedData.filter(d =>
                d.posCodeId && d.toPosCodeId && d.toPosCodeId < d.posCodeId
            ).length,
            transferred: combinedData.filter(d =>
                d.posCodeId && d.toPosCodeId && d.toPosCodeId === d.posCodeId
            ).length,
            replacedOthers: combinedData.filter(d => d.replacedPerson).length,
            filledVacant: combinedData.filter(d =>
                (d.toPosCodeMaster || d.toPosition) && !d.replacedPerson
            ).length,
            notAssigned: combinedData.filter(d =>
                !d.toPosCodeMaster && !d.toPosition
            ).length,
        };

        return NextResponse.json({
            success: true,
            data: {
                swapDetails: paginatedData,
                totalCount,
                page,
                pageSize,
                summary,
                filters: {
                    units: units.map(u => u.unit).filter(Boolean),
                    positionCodes: positionCodes.map(p => ({
                        id: p.id,
                        name: p.name,
                    })),
                },
            },
        });
    } catch (error: any) {
        console.error('[In-Out API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch data',
                message: error?.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
