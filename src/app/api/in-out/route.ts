import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

        // Fetch all personnel (ข้อมูลปัจจุบัน - ปีปัจจุบันและ active เท่านั้น)
        const currentBuddhistYear = new Date().getFullYear() + 543;
        const personnel = await prisma.policePersonnel.findMany({
            where: {
                ...personnelWhere,
                year: currentBuddhistYear,
                isActive: true
            },
            include: {
                posCodeMaster: true,
            },
        });

        // Fetch swap details for the selected year
        // รวมทุกประเภท: two-way, three-way, multi-way, promotion, promotion-chain
        const swapDetails = await prisma.swapTransactionDetail.findMany({
            where: {
                transaction: {
                    year: year,
                    status: 'completed',
                },
            },
            select: {
                id: true,
                transactionId: true,
                personnelId: true,
                noId: true,
                fullName: true,
                rank: true,
                nationalId: true,
                age: true,
                seniority: true,
                birthDate: true,
                education: true,
                lastAppointment: true,
                currentRankSince: true,
                enrollmentDate: true,
                retirementDate: true,
                yearsOfService: true,
                trainingLocation: true,
                trainingCourse: true,
                posCodeId: true,
                fromPosition: true,
                fromPositionNumber: true,
                fromUnit: true,
                fromActingAs: true,
                toPosCodeId: true,
                toPosition: true,
                toPositionNumber: true,
                toUnit: true,
                toActingAs: true,
                sequence: true, // ← เพิ่ม sequence
                transaction: true,
                posCodeMaster: true,
                toPosCodeMaster: true,
            },
        });
        
        // Debug: ตรวจสอบ sequence จาก DB
        const withSequence = swapDetails.filter(d => d.sequence != null);
        console.log('[API In-Out] Sequence from DB:', {
            total: swapDetails.length,
            withSequence: withSequence.length,
            samples: swapDetails.slice(0, 3).map(d => ({
                name: d.fullName,
                sequence: d.sequence,
                transactionId: d.transactionId
            }))
        });

        // สร้าง Map สำหรับจับคู่ข้อมูล (ใช้หลายเงื่อนไข)
        const swapByPersonnelId = new Map();
        const swapByNationalId = new Map();
        const swapByNameRank = new Map();
        
        swapDetails.forEach(detail => {
            if (detail.personnelId) {
                swapByPersonnelId.set(detail.personnelId, detail);
            }
            if (detail.nationalId) {
                swapByNationalId.set(detail.nationalId, detail);
            }
            if (detail.fullName && detail.rank) {
                const key = `${detail.rank}|${detail.fullName}`;
                swapByNameRank.set(key, detail);
            }
        });

        // Function สำหรับหา swap info ที่ตรงกับ person
        const findSwapInfo = (person: any) => {
            // 1. ลองจับคู่ด้วย personnelId
            let swapInfo = swapByPersonnelId.get(person.id);
            if (swapInfo) return swapInfo;
            
            // 2. ลองจับคู่ด้วย nationalId
            if (person.nationalId) {
                swapInfo = swapByNationalId.get(person.nationalId);
                if (swapInfo) return swapInfo;
            }
            
            // 3. ลองจับคู่ด้วย rank + fullName
            if (person.rank && person.fullName) {
                const key = `${person.rank}|${person.fullName}`;
                swapInfo = swapByNameRank.get(key);
                if (swapInfo) return swapInfo;
            }
            
            return null;
        };

        // Part 1: รวมข้อมูลจาก police_personnel + swap info
        const personnelWithSwap = personnel.map(person => {
            const swapInfo = findSwapInfo(person);
            
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
                
                // ตำแหน่งเดิม - ใช้จาก swap ถ้ามี (เพราะเป็น snapshot ที่ถูกต้อง)
                posCodeId: swapInfo?.posCodeId || person.posCodeId,
                posCodeMaster: swapInfo?.posCodeMaster || person.posCodeMaster,
                fromPosition: swapInfo?.fromPosition || person.position,
                fromPositionNumber: swapInfo?.fromPositionNumber || person.positionNumber,
                fromUnit: swapInfo?.fromUnit || person.unit,
                fromActingAs: swapInfo?.fromActingAs || person.actingAs,
                
                // ตำแหน่งใหม่ - มีเฉพาะคนที่สลับแล้ว
                toPosCodeId: swapInfo?.toPosCodeId || null,
                toPosCodeMaster: swapInfo?.toPosCodeMaster || null,
                toPosition: swapInfo?.toPosition || null,
                toPositionNumber: swapInfo?.toPositionNumber || null,
                toUnit: swapInfo?.toUnit || null,
                toActingAs: swapInfo?.toActingAs || null,
                
                // Transaction info
                transaction: swapInfo ? {
                    id: swapInfo.transaction.id,
                    year: swapInfo.transaction.year,
                    swapDate: swapInfo.transaction.swapDate,
                    swapType: swapInfo.transaction.swapType,
                    groupNumber: swapInfo.transaction.groupNumber,
                } : null,
                
                // Sequence สำหรับเรียงลำดับ
                sequence: swapInfo?.sequence ?? null,
                
                hasSwapped: !!swapInfo,
                source: 'personnel' as const,
                replacedPerson: null as { rank: string | null; fullName: string | null; nationalId: string | null } | null,
            };
        });

        // Part 2: หาคนที่สลับแล้วแต่ไม่อยู่ใน police_personnel (เช่น ลาออก/เกษียณ)
        const personnelIds = new Set(personnel.map(p => p.id));
        const personnelNationalIds = new Set(personnel.map(p => p.nationalId).filter(Boolean));
        const personnelNameRanks = new Set(
            personnel.map(p => p.rank && p.fullName ? `${p.rank}|${p.fullName}` : null).filter(Boolean)
        );

        const swappedButNotInPersonnel = swapDetails
            .filter(detail => {
                // ตรวจสอบว่าคนนี้ไม่อยู่ใน personnel แล้ว
                if (detail.personnelId && personnelIds.has(detail.personnelId)) return false;
                if (detail.nationalId && personnelNationalIds.has(detail.nationalId)) return false;
                if (detail.rank && detail.fullName) {
                    const key = `${detail.rank}|${detail.fullName}`;
                    if (personnelNameRanks.has(key)) return false;
                }
                
                // ตรวจสอบว่าตรงกับ filter ที่เลือกหรือไม่
                // Filter by unit (ตำแหน่งเดิม)
                if (unit !== 'all' && detail.fromUnit !== unit) return false;
                
                // Filter by posCodeId (ตำแหน่งเดิม)
                if (posCodeId !== 'all') {
                    const posCodeIdNum = parseInt(posCodeId);
                    if (!isNaN(posCodeIdNum) && detail.posCodeId !== posCodeIdNum) return false;
                }
                
                // Filter by status
                if (status !== 'all') {
                    if (status === 'vacant') {
                        // ตำแหน่งว่าง - ไม่มี rank
                        if (detail.rank && detail.rank.trim() !== '') return false;
                        if (detail.fullName && (detail.fullName.includes('ว่าง (กันตำแหน่ง)') || detail.fullName.includes('ว่าง(กันตำแหน่ง)'))) return false;
                    } else if (status === 'reserved') {
                        // ว่าง (กันตำแหน่ง)
                        if (!detail.fullName || (!detail.fullName.includes('ว่าง (กันตำแหน่ง)') && !detail.fullName.includes('ว่าง(กันตำแหน่ง)'))) return false;
                    } else if (status === 'occupied') {
                        // มีคนดำรงตำแหน่ง
                        if (!detail.rank || detail.rank.trim() === '') return false;
                    }
                }
                
                return true;
            })
            .map(detail => ({
                id: detail.id,
                personnelId: detail.personnelId || detail.id,
                noId: detail.noId,
                fullName: detail.fullName,
                rank: detail.rank,
                nationalId: detail.nationalId,
                age: detail.age,
                seniority: detail.seniority,
                birthDate: detail.birthDate,
                education: detail.education,
                lastAppointment: detail.lastAppointment,
                currentRankSince: detail.currentRankSince,
                enrollmentDate: detail.enrollmentDate,
                retirementDate: detail.retirementDate,
                yearsOfService: detail.yearsOfService,
                trainingLocation: detail.trainingLocation,
                trainingCourse: detail.trainingCourse,
                
                // ตำแหน่งเดิม
                posCodeId: detail.posCodeId,
                posCodeMaster: detail.posCodeMaster,
                fromPosition: detail.fromPosition,
                fromPositionNumber: detail.fromPositionNumber,
                fromUnit: detail.fromUnit,
                fromActingAs: detail.fromActingAs,
                
                // ตำแหน่งใหม่
                toPosCodeId: detail.toPosCodeId,
                toPosCodeMaster: detail.toPosCodeMaster,
                toPosition: detail.toPosition,
                toPositionNumber: detail.toPositionNumber,
                toUnit: detail.toUnit,
                toActingAs: detail.toActingAs,
                
                // Transaction info
                transaction: {
                    id: detail.transaction.id,
                    year: detail.transaction.year,
                    swapDate: detail.transaction.swapDate,
                    swapType: detail.transaction.swapType,
                    groupNumber: detail.transaction.groupNumber,
                },
                
                // Sequence สำหรับเรียงลำดับ
                sequence: detail.sequence ?? null,
                
                hasSwapped: true,
                source: 'swap_only' as const, // คนที่ไม่อยู่ใน personnel แล้ว
                replacedPerson: null as { rank: string | null; fullName: string | null; nationalId: string | null } | null,
            }));

        // รวมข้อมูลทั้ง 2 ส่วน
        let combinedData = [...personnelWithSwap, ...swappedButNotInPersonnel];

        // หาคนเดิมที่ดำรงตำแหน่งใหม่ (คนที่ถูกแทนที่)
        // สร้าง Map: toPosCodeId -> คนเดิมที่อยู่ตำแหน่งนั้น
        const replacedPersonMap = new Map();
        swapDetails.forEach(detail => {
            if (detail.toPosCodeId) {
                // หาคนที่เคยอยู่ในตำแหน่งนี้ (posCodeId ของคนอื่น = toPosCodeId ของคนนี้)
                const previousPerson = swapDetails.find(d => 
                    d.id !== detail.id && 
                    d.posCodeId === detail.toPosCodeId &&
                    d.transaction.id === detail.transaction.id // ต้องอยู่ใน transaction เดียวกัน
                );
                if (previousPerson) {
                    replacedPersonMap.set(detail.id, {
                        rank: previousPerson.rank,
                        fullName: previousPerson.fullName,
                        nationalId: previousPerson.nationalId,
                    });
                }
            }
        });

        // เพิ่มข้อมูลคนที่ถูกแทนที่เข้าไปใน combinedData
        combinedData = combinedData.map(item => ({
            ...item,
            replacedPerson: replacedPersonMap.get(item.id) || null,
        }));

        // Debug: ตรวจสอบข้อมูลที่มี toPosition
        const withToPosition = combinedData.filter(d => d.toPosition);
        console.log(`Total records: ${combinedData.length}, With toPosition: ${withToPosition.length}`);
        if (withToPosition.length > 0) {
            console.log('Sample with toPosition:', {
                fullName: withToPosition[0].fullName,
                fromPosition: withToPosition[0].fromPosition,
                toPosition: withToPosition[0].toPosition,
                toPosCodeMaster: withToPosition[0].toPosCodeMaster,
                replacedPerson: withToPosition[0].replacedPerson,
            });
        }

        // Filter by swap type (in memory)
        let filteredData = combinedData;
        if (swapType !== 'all') {
            filteredData = filteredData.filter(d => d.transaction?.swapType === swapType);
        }
        
        // Filter by search text (in memory)
        if (search) {
            const searchLower = search.toLowerCase();
            filteredData = filteredData.filter(d => 
                d.fullName?.toLowerCase().includes(searchLower) ||
                d.nationalId?.toLowerCase().includes(searchLower) ||
                d.rank?.toLowerCase().includes(searchLower) ||
                d.fromUnit?.toLowerCase().includes(searchLower) ||
                d.toUnit?.toLowerCase().includes(searchLower) ||
                d.fromPosition?.toLowerCase().includes(searchLower) ||
                d.toPosition?.toLowerCase().includes(searchLower)
            );
        }

        // Get total count after filtering
        const totalCount = filteredData.length;

        // เรียงลำดับ: คนที่มีตำแหน่งใหม่ (hasSwapped) ขึ้นก่อน
        filteredData.sort((a, b) => {
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

        // Apply pagination AFTER sorting
        const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);

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
                swapDetails: paginatedData,
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
