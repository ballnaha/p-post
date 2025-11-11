import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const unit = searchParams.get('unit') || 'all';
        const posCodeId = searchParams.get('posCodeId') || 'all';
        const status = searchParams.get('status') || 'all';
        const search = searchParams.get('search') || '';
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear() + 543));
        const page = parseInt(searchParams.get('page') || '0');
        const pageSize = parseInt(searchParams.get('pageSize') || '10');

        // Build where clause for police personnel
        const personnelWhere: Record<string, unknown> = {};
        const andConditions: Record<string, unknown>[] = [];

        // Filter by unit
        if (unit !== 'all') {
            andConditions.push({ unit: { equals: unit } });
        }

        // Filter by posCodeId
        if (posCodeId !== 'all') {
            const posCodeIdNum = parseInt(posCodeId);
            if (!isNaN(posCodeIdNum)) {
                andConditions.push({ posCodeId: { equals: posCodeIdNum } });
            }
        }

        // Filter by status
        if (status !== 'all') {
            if (status === 'vacant') {
                // ตำแหน่งว่าง - ไม่มี rank และไม่มีคำว่า "ว่าง (กันตำแหน่ง)"
                andConditions.push({
                    AND: [
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
                    ]
                });
            } else if (status === 'reserved') {
                // ว่าง (กันตำแหน่ง)
                andConditions.push({
                    OR: [
                        { fullName: { contains: 'ว่าง (กันตำแหน่ง)' } },
                        { fullName: { contains: 'ว่าง(กันตำแหน่ง)' } }
                    ]
                });
            } else if (status === 'occupied') {
                // มีคนดำรงตำแหน่ง
                andConditions.push({
                    AND: [
                        { rank: { not: null } },
                        { rank: { not: '' } }
                    ]
                });
            }
        }

        // Filter by search text
        if (search) {
            const searchConditions = [
                { fullName: { contains: search } },
                { nationalId: { contains: search } },
                { rank: { contains: search } },
                { unit: { contains: search } },
                { position: { contains: search } },
            ];
            andConditions.push({ OR: searchConditions });
        }

        // Apply all conditions
        if (andConditions.length > 0) {
            personnelWhere.AND = andConditions;
        }

        // Get total count
        const totalCount = await prisma.policePersonnel.count({ where: personnelWhere });

        // Fetch all personnel with pagination
        const personnel = await prisma.policePersonnel.findMany({
            where: personnelWhere,
            include: {
                posCodeMaster: true,
            },
            orderBy: [
                { unit: 'asc' },
                { rank: 'asc' },
                { fullName: 'asc' },
            ],
            skip: page * pageSize,
            take: pageSize,
        });

        // Fetch swap details for the selected year to match with personnel
        const swapDetails = await prisma.swapTransactionDetail.findMany({
            where: {
                transaction: {
                    year: year,
                    status: 'completed',
                },
            },
            include: {
                transaction: true,
                posCodeMaster: true,
                toPosCodeMaster: true,
            },
        });

        // Create a map of personnelId to swap detail
        const swapMap = new Map();
        swapDetails.forEach(detail => {
            if (detail.personnelId) {
                swapMap.set(detail.personnelId, detail);
            }
        });

        // Combine personnel with their swap information
        const combinedData = personnel.map(person => {
            const swapInfo = swapMap.get(person.id);
            
            return {
                id: person.id,
                personnelId: person.id,
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
                
                // ตำแหน่งเดิม (จาก police_personnel)
                posCodeId: person.posCodeId,
                posCodeMaster: person.posCodeMaster,
                fromPosition: person.position,
                fromPositionNumber: person.positionNumber,
                fromUnit: person.unit,
                fromActingAs: person.actingAs,
                
                // ตำแหน่งใหม่ (จาก swap_transaction_detail ถ้ามี)
                toPosCodeId: swapInfo?.toPosCodeId || null,
                toPosCodeMaster: swapInfo?.toPosCodeMaster || null,
                toPosition: swapInfo?.toPosition || null,
                toPositionNumber: swapInfo?.toPositionNumber || null,
                toUnit: swapInfo?.toUnit || null,
                toActingAs: swapInfo?.toActingAs || null,
                
                // Transaction info (ถ้ามี)
                transaction: swapInfo ? {
                    id: swapInfo.transaction.id,
                    year: swapInfo.transaction.year,
                    swapDate: swapInfo.transaction.swapDate,
                    swapType: swapInfo.transaction.swapType,
                    groupNumber: swapInfo.transaction.groupNumber,
                } : null,
                
                // Flag สำหรับการเรียงลำดับ
                hasSwapped: !!swapInfo,
            };
        });

        // เรียงลำดับ: คนที่สลับแล้วขึ้นก่อน
        combinedData.sort((a, b) => {
            // เรียงตาม hasSwapped ก่อน (true ขึ้นก่อน)
            if (a.hasSwapped !== b.hasSwapped) {
                return b.hasSwapped ? 1 : -1;
            }
            // ถ้า hasSwapped เท่ากัน เรียงตามหน่วย, ยศ, ชื่อ
            if (a.fromUnit !== b.fromUnit) {
                return (a.fromUnit || '').localeCompare(b.fromUnit || '');
            }
            if (a.rank !== b.rank) {
                return (a.rank || '').localeCompare(b.rank || '');
            }
            return (a.fullName || '').localeCompare(b.fullName || '');
        });

        // Get unique units
        const units = await prisma.policePersonnel.findMany({
            where: { unit: { not: null } },
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
    } catch (error) {
        console.error('Error fetching in-out data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch data' },
            { status: 500 }
        );
    }
}
