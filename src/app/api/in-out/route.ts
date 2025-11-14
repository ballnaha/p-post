import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

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

        console.log('[In-Out API] Request params:', { unit, posCodeId, status, swapType, year, page, pageSize, search });
        
        // ถ้าขอแค่ filters ให้ return เฉพาะ filters เท่านั้น (เร็วมาก)
        if (filtersOnly) {
            const currentBuddhistYear = new Date().getFullYear() + 543;
            
            // Get unique units from personnel (current year & active only)
            const units = await prisma.policePersonnel.findMany({
                where: { 
                    unit: { not: null },
                    year: currentBuddhistYear,
                    isActive: true
                },
                select: { unit: true },
                distinct: ['unit'],
                orderBy: { unit: 'asc' },
            });

            // Get unique position codes
            const positionCodes = await prisma.posCodeMaster.findMany({
                orderBy: { id: 'asc' },
            });
            
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

        let combinedData: any[] = [];
        let totalCount = 0;

        // ใช้ police_personnel เป็นหลักเสมอ เพื่อดูว่าใครจับคู่แล้วและใครยังไม่ได้จับคู่
        
        // 1. Build where clause สำหรับ police_personnel
        const personnelWhere: Prisma.PolicePersonnelWhereInput = {
            year: currentBuddhistYear,
            isActive: true
        };

        const personnelAndConditions: Prisma.PolicePersonnelWhereInput[] = [];

        if (unit !== 'all') {
            personnelAndConditions.push({ unit: unit });
        }

        if (posCodeId !== 'all') {
            const posCodeIdNum = parseInt(posCodeId);
            if (!isNaN(posCodeIdNum)) {
                personnelAndConditions.push({ posCodeId: posCodeIdNum });
            }
        }

        if (status !== 'all') {
            if (status === 'vacant') {
                personnelAndConditions.push({
                    AND: [
                        {
                            OR: [
                                { rank: null },
                                { rank: '' }
                            ]
                        },
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
                personnelAndConditions.push({
                    OR: [
                        { fullName: { contains: 'ว่าง (กันตำแหน่ง)' } },
                        { fullName: { contains: 'ว่าง(กันตำแหน่ง)' } }
                    ]
                });
            } else if (status === 'occupied') {
                personnelAndConditions.push({
                    AND: [
                        { rank: { not: null } },
                        { rank: { not: '' } }
                    ]
                });
            }
        }

        if (search) {
            personnelAndConditions.push({
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

        if (personnelAndConditions.length > 0) {
            personnelWhere.AND = personnelAndConditions;
        }

        console.log('[In-Out API] Fetching personnel with filters...');

        // 2. ดึงข้อมูลจาก police_personnel ตาม filter
        const personnel = await prisma.policePersonnel.findMany({
            where: personnelWhere,
            include: {
                posCodeMaster: true,
            },
        });

        console.log('[In-Out API] Personnel count:', personnel.length);

        // 3. ดึงข้อมูลจาก swap_transaction_detail (ข้อมูลที่สลับแล้ว)
        const swapWhere: Prisma.SwapTransactionDetailWhereInput = {
            transaction: {
                year: year,
                status: 'completed',
                ...(swapType !== 'all' && { swapType: swapType })
            }
        };

        const swapDetails = await prisma.swapTransactionDetail.findMany({
            where: swapWhere,
            include: {
                transaction: true,
                posCodeMaster: true,
                toPosCodeMaster: true,
            },
        });

        console.log('[In-Out API] Swap details count:', swapDetails.length);

        // 4. สร้าง Map สำหรับจับคู่ข้อมูล
        const swapByPersonnelId = new Map();
        const swapByNationalId = new Map();
        
        swapDetails.forEach(detail => {
            if (detail.personnelId) {
                swapByPersonnelId.set(detail.personnelId, detail);
            }
            if (detail.nationalId) {
                swapByNationalId.set(detail.nationalId, detail);
            }
        });

        // 5. รวมข้อมูล personnel + swap info
        combinedData = personnel.map(person => {
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
            };
        });

        // 5.1 Filter ตาม swapType (ถ้ามีการเลือก)
        if (swapType !== 'all') {
            console.log('[In-Out API] Filtering by swapType:', swapType);
            
            if (swapType === 'none') {
                // กรองเฉพาะคนที่ยังไม่ได้จับคู่ (ไม่มี transaction)
                combinedData = combinedData.filter(d => !d.transaction);
            } else {
                // กรองเฉพาะคนที่มี transaction และ swapType ตรงกับที่เลือก
                combinedData = combinedData.filter(d => 
                    d.transaction && d.transaction.swapType === swapType
                );
            }
            
            console.log('[In-Out API] After swapType filter:', combinedData.length);
        }

        // 6. เรียงลำดับ: คนที่สลับแล้วขึ้นก่อน
        combinedData.sort((a, b) => {
            if (a.hasSwapped !== b.hasSwapped) {
                return b.hasSwapped ? 1 : -1;
            }
            if (a.transaction?.id !== b.transaction?.id) {
                return (a.transaction?.id || '').localeCompare(b.transaction?.id || '');
            }
            if (a.sequence !== b.sequence) {
                return (a.sequence ?? 999) - (b.sequence ?? 999);
            }
            return (a.fullName || '').localeCompare(b.fullName || '', 'th');
        });

        totalCount = combinedData.length;

        // 7. Paginate
        combinedData = combinedData.slice(page * pageSize, (page + 1) * pageSize);

        // 8. หา replaced persons
        try {
            const transactionIds = [...new Set(combinedData.filter(d => d.transaction).map(d => d.transaction.id))];
            console.log('[In-Out API] Transaction IDs for replaced persons:', transactionIds.length);
            
            if (transactionIds.length > 0) {
                const allTransactionDetails = await prisma.swapTransactionDetail.findMany({
                    where: {
                        transactionId: { in: transactionIds }
                    },
                    include: {
                        posCodeMaster: true,
                        toPosCodeMaster: true,
                    }
                });

                console.log('[In-Out API] All transaction details for replaced persons:', allTransactionDetails.length);

                combinedData = combinedData.map(detail => {
                    if (!detail.toPosCodeId) return { ...detail, replacedPerson: null };

                    const replaced = allTransactionDetails.find(d => 
                        d.transactionId === detail.transaction?.id &&
                        d.id !== detail.id &&
                        d.posCodeId === detail.toPosCodeId
                    );

                    return {
                        ...detail,
                        replacedPerson: replaced ? {
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
                        } : null
                    };
                });
            } else {
                // ไม่มี transaction ให้ set replacedPerson เป็น null ทั้งหมด
                combinedData = combinedData.map(detail => ({ ...detail, replacedPerson: null }));
            }
        } catch (replacedError: any) {
            console.error('[In-Out API] Error fetching replaced persons:', replacedError);
            // ถ้า error ให้ set replacedPerson เป็น null ทั้งหมด
            combinedData = combinedData.map(detail => ({ ...detail, replacedPerson: null }));
        }

        // Get filter options
        const units = await prisma.policePersonnel.findMany({
            where: { 
                unit: { not: null },
                year: currentBuddhistYear,
                isActive: true
            },
            select: { unit: true },
            distinct: ['unit'],
            orderBy: { unit: 'asc' },
        });

        const positionCodes = await prisma.posCodeMaster.findMany({
            orderBy: { id: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: {
                swapDetails: combinedData,
                totalCount,
                page,
                pageSize,
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
        console.error('[In-Out API] Error stack:', error?.stack);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch data',
                message: error?.message || 'Unknown error',
                details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
            },
            { status: 500 }
        );
    }
}
