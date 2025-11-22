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
                        { OR: [
                            { fullName: null },
                            { fullName: '' },
                            { AND: [
                                { fullName: { not: null } },
                                { fullName: { not: { contains: 'ว่าง (กันตำแหน่ง)' } } },
                                { fullName: { not: { contains: 'ว่าง(กันตำแหน่ง)' } } }
                            ]}
                        ]}
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

        // ไม่ filter search ที่นี่ เพราะต้องค้นหาทั้ง personnel และ swap transaction detail
        // จะ filter หลังจากรวมข้อมูลแล้ว

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
        const filledPositions = new Set(); // เก็บตำแหน่งที่มีคนเข้ามาแทนแล้ว
        
        swapDetails.forEach(detail => {
            if (detail.personnelId) swapByPersonnelId.set(detail.personnelId, detail);
            if (detail.nationalId) swapByNationalId.set(detail.nationalId, detail);
            
            // เก็บข้อมูลว่ามีคนเข้ามาแทนตำแหน่งไหนบ้าง (ดูจาก toPositionNumber เป็นหลัก)
            // ใช้ positionNumber เพราะไม่ซ้ำกัน ไม่ใช้ position เพราะซ้ำได้
            if (detail.toUnit && detail.toPositionNumber) {
                filledPositions.add(`${detail.toUnit}|${detail.toPositionNumber}`);
            }
        });

        console.log('[API] Total personnel before filter:', personnel.length);
        console.log('[API] Filled positions count:', filledPositions.size);
        console.log('[API] Filled positions:', Array.from(filledPositions).slice(0, 10));

        // สร้าง Map เก็บตำแหน่งว่างทั้งหมด (unit|positionNumber -> person)
        const vacantPositionsMap = new Map();
        personnel.forEach(person => {
            const isVacant = !person.fullName || 
                            person.fullName.trim() === '' ||
                            ['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(person.fullName.trim());
            if (isVacant && person.unit && person.positionNumber) {
                const posKey = `${person.unit}|${person.positionNumber}`;
                vacantPositionsMap.set(posKey, person);
            }
        });

        // ไม่กรองตำแหน่งว่างที่มีคนมาแทนแล้วออก เพื่อให้เห็นว่าตำแหน่งว่างมีใครเข้ามาแทนบ้าง
        let combinedData = personnel
            .map(person => {
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
                        groupName: swapInfo.transaction.groupName,
                    } : null,
                    
                    sequence: swapInfo?.sequence ?? null,
                    hasSwapped: !!swapInfo,
                    replacedPerson: null as any,
                };
            });

        // ถ้า filter สถานะ = "ว่าง" ให้เพิ่มคนที่เข้ามาแทนตำแหน่งว่างด้วย
        if (status === 'vacant') {
            console.log('[API] Filtering vacant - checking for people moving into vacant positions');
            
            // หาคนที่มี toPosition ชี้มาที่ตำแหน่งว่าง
            const peopleMovingIntoVacant = swapDetails.filter(detail => {
                if (!detail.toUnit || !detail.toPositionNumber) return false;
                
                // ตรวจสอบว่าเป็นการเข้าตำแหน่งว่างหรือไม่
                const posKey = `${detail.toUnit}|${detail.toPositionNumber}`;
                return vacantPositionsMap.has(posKey);
            });

            console.log('[API] Found people moving into vacant positions:', peopleMovingIntoVacant.length);

            // สร้าง Set เก็บตำแหน่งว่างที่มีคนเข้ามาแทนแล้ว (เพื่อใช้กรอง)
            const filledVacantPositions = new Set<string>();
            peopleMovingIntoVacant.forEach(detail => {
                if (detail.toUnit && detail.toPositionNumber) {
                    const posKey = `${detail.toUnit}|${detail.toPositionNumber}`;
                    filledVacantPositions.add(posKey);
                }
            });

            // กรองตำแหน่งว่างที่มีคนครองแล้วออกจาก combinedData
            // เก็บเฉพาะตำแหน่งว่างที่ยังไม่มีคนครอง
            combinedData = combinedData.filter(person => {
                // ตรวจสอบว่าเป็นตำแหน่งว่างหรือไม่
                const isVacant = !person.fullName || 
                                person.fullName.trim() === '' ||
                                ['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(person.fullName.trim());
                
                if (!isVacant) return true; // ถ้าไม่ใช่ตำแหน่งว่าง ให้แสดง
                
                // ถ้าเป็นตำแหน่งว่าง ตรวจสอบว่ามีคนครองหรือไม่
                const posKey = person.fromUnit && person.fromPositionNumber ? 
                              `${person.fromUnit}|${person.fromPositionNumber}` : null;
                
                if (posKey && filledVacantPositions.has(posKey)) {
                    // ตำแหน่งว่างนี้มีคนครองแล้ว ไม่ต้องแสดง (จะแสดงคนที่ครองแทน)
                    console.log('[API] Hiding vacant position (filled):', posKey);
                    return false;
                }
                
                return true; // แสดงตำแหน่งว่างที่ยังไม่มีคนครอง
            });

            // เพิ่มคนเหล่านี้เข้าไปใน combinedData
            for (const swapInfo of peopleMovingIntoVacant) {
                // ตรวจสอบว่าคนนี้มีอยู่ใน combinedData แล้วหรือไม่ (เช็คจาก personnelId)
                const exists = combinedData.some(d => d.personnelId === swapInfo.personnelId);
                if (exists) {
                    console.log('[API] Person already in data:', swapInfo.fullName);
                    continue; // ถ้ามีอยู่แล้ว ไม่ต้องเพิ่มซ้ำ
                }

                // ดึงข้อมูลเต็มของคนนี้จาก personnel (ถ้ามี)
                const fullPersonnel = await prisma.policePersonnel.findFirst({
                    where: {
                        OR: [
                            { id: swapInfo.personnelId || '' },
                            { nationalId: swapInfo.nationalId || '' }
                        ],
                        year: currentBuddhistYear,
                        isActive: true
                    },
                    include: { posCodeMaster: true }
                });

                combinedData.push({
                    id: swapInfo.personnelId || swapInfo.id,
                    personnelId: swapInfo.personnelId || swapInfo.id,
                    noId: swapInfo.noId || fullPersonnel?.noId || null,
                    fullName: swapInfo.fullName,
                    rank: swapInfo.rank,
                    nationalId: swapInfo.nationalId,
                    age: swapInfo.age,
                    seniority: swapInfo.seniority,
                    birthDate: swapInfo.birthDate,
                    education: swapInfo.education,
                    lastAppointment: swapInfo.lastAppointment,
                    currentRankSince: swapInfo.currentRankSince,
                    enrollmentDate: swapInfo.enrollmentDate,
                    retirementDate: swapInfo.retirementDate,
                    yearsOfService: swapInfo.yearsOfService,
                    trainingLocation: swapInfo.trainingLocation,
                    trainingCourse: swapInfo.trainingCourse,
                    avatarUrl: swapInfo.avatarUrl || fullPersonnel?.avatarUrl || null,
                    
                    posCodeId: swapInfo.posCodeId,
                    posCodeMaster: swapInfo.posCodeMaster,
                    fromPosition: swapInfo.fromPosition,
                    fromPositionNumber: swapInfo.fromPositionNumber,
                    fromUnit: swapInfo.fromUnit,
                    fromActingAs: swapInfo.fromActingAs,
                    
                    toPosCodeId: swapInfo.toPosCodeId,
                    toPosCodeMaster: swapInfo.toPosCodeMaster,
                    toPosition: swapInfo.toPosition,
                    toPositionNumber: swapInfo.toPositionNumber,
                    toUnit: swapInfo.toUnit,
                    toActingAs: swapInfo.toActingAs,
                    
                    transaction: {
                        id: swapInfo.transaction.id,
                        year: swapInfo.transaction.year,
                        swapDate: swapInfo.transaction.swapDate,
                        swapType: swapInfo.transaction.swapType,
                        groupNumber: swapInfo.transaction.groupNumber,
                        groupName: swapInfo.transaction.groupName,
                    },
                    
                    sequence: swapInfo.sequence ?? null,
                    hasSwapped: true,
                    replacedPerson: null as any,
                });
            }
        }

        console.log('[API] Combined data total:', combinedData.length);

        if (swapType !== 'all') {
            if (swapType === 'none') {
                combinedData = combinedData.filter(d => !d.transaction);
            } else if (swapType === 'paired') {
                // แสดงเฉพาะคนที่จับคู่แล้วทั้งหมด (two-way, three-way, transfer, promotion-chain)
                combinedData = combinedData.filter(d => 
                    d.transaction && ['two-way', 'three-way', 'transfer', 'promotion-chain'].includes(d.transaction.swapType)
                );
            } else {
                combinedData = combinedData.filter(d => 
                    d.transaction && d.transaction.swapType === swapType
                );
            }
        }

        // Filter search - ค้นหาทั้งข้อมูล personnel และ swap transaction detail
        if (search) {
            const searchLower = search.toLowerCase();
            combinedData = combinedData.filter(d => {
                // ค้นหาในข้อมูลปัจจุบัน (คนครอง)
                const matchCurrent = 
                    d.fullName?.toLowerCase().includes(searchLower) ||
                    d.nationalId?.toLowerCase().includes(searchLower) ||
                    d.rank?.toLowerCase().includes(searchLower) ||
                    d.fromUnit?.toLowerCase().includes(searchLower) ||
                    d.fromPosition?.toLowerCase().includes(searchLower) ||
                    d.fromPositionNumber?.toLowerCase().includes(searchLower);
                
                // ค้นหาในข้อมูลตำแหน่งใหม่ (ที่จะไป)
                const matchNew = 
                    d.toUnit?.toLowerCase().includes(searchLower) ||
                    d.toPosition?.toLowerCase().includes(searchLower) ||
                    d.toPositionNumber?.toLowerCase().includes(searchLower);
                
                return matchCurrent || matchNew;
            });
        }

        // เรียงตาม noId เหมือนหน้า police_personnel
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

            for (let index = 0; index < paginatedData.length; index++) {
                const detail = paginatedData[index];
                if (!detail.toPosition && !detail.toPositionNumber) {
                    paginatedData[index].replacedPerson = null;
                    continue;
                }

                const transactionPeople = allTransactionDetails.filter(d => 
                    d.transactionId === detail.transaction?.id
                );
                
                let replaced = null;
                
                // ฟังก์ชันช่วยเช็คว่าเป็น placeholder หรือไม่
                const isPlaceholder = (person: any) => {
                    const fullName = person.fullName?.trim() || '';
                    return ['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)', ''].includes(fullName);
                };
                
                if (detail.toPositionNumber) {
                    replaced = transactionPeople.find(d => 
                        d.id !== detail.id && 
                        d.fromPositionNumber === detail.toPositionNumber &&
                        !isPlaceholder(d)  // ไม่เอา placeholder
                    );
                }
                
                if (!replaced && detail.toPosition) {
                    replaced = transactionPeople.find(d => 
                        d.id !== detail.id && 
                        d.fromPosition === detail.toPosition &&
                        !isPlaceholder(d)  // ไม่เอา placeholder
                    );
                }
                
                if (!replaced && detail.transaction?.swapType === 'two-way' && transactionPeople.length === 2) {
                    replaced = transactionPeople.find(d => 
                        d.id !== detail.id &&
                        !isPlaceholder(d)  // ไม่เอา placeholder
                    );
                }
                
                // ถ้าไม่เจอคนครองและเป็น placeholder - หาข้อมูลตำแหน่งว่างจาก personnel
                if (!replaced && isPlaceholder(detail) && (detail.toPositionNumber || detail.toPosition)) {
                    let vacantPosition = null;
                    try {
                        // สร้าง where conditions ที่ยืดหยุ่น
                        const andConditions: any[] = [
                            { year: currentBuddhistYear },
                            { isActive: true },
                            {
                                OR: [
                                    { fullName: 'ว่าง' },
                                    { fullName: 'ว่าง (กันตำแหน่ง)' },
                                    { fullName: 'ว่าง(กันตำแหน่ง)' }
                                ]
                            }
                        ];
                        
                        // เพิ่ม conditions ตามข้อมูลที่มี
                        if (detail.toPositionNumber) andConditions.push({ positionNumber: detail.toPositionNumber });
                        if (detail.toUnit) andConditions.push({ unit: detail.toUnit });
                        if (detail.toPosition) andConditions.push({ position: detail.toPosition });
                        
                        vacantPosition = await prisma.policePersonnel.findFirst({
                            where: { AND: andConditions },
                            include: { posCodeMaster: true }
                        });
                    } catch (queryError) {
                        console.error('[Vacant Position Query Error]:', queryError);
                        // ถ้า query error ไม่ต้อง throw ให้ replaced = null
                    }
                    
                    if (vacantPosition) {
                        replaced = {
                            id: vacantPosition.id,
                            personnelId: vacantPosition.id,
                            noId: vacantPosition.noId,
                            fullName: vacantPosition.fullName,
                            rank: vacantPosition.rank,
                            nationalId: vacantPosition.nationalId,
                            age: vacantPosition.age,
                            seniority: vacantPosition.seniority,
                            birthDate: vacantPosition.birthDate,
                            education: vacantPosition.education,
                            lastAppointment: vacantPosition.lastAppointment,
                            currentRankSince: vacantPosition.currentRankSince,
                            enrollmentDate: vacantPosition.enrollmentDate,
                            retirementDate: vacantPosition.retirementDate,
                            yearsOfService: vacantPosition.yearsOfService,
                            trainingLocation: vacantPosition.trainingLocation,
                            trainingCourse: vacantPosition.trainingCourse,
                            avatarUrl: vacantPosition.avatarUrl,
                            posCodeId: vacantPosition.posCodeId,
                            posCodeMaster: vacantPosition.posCodeMaster,
                            fromPosition: vacantPosition.position,
                            fromPositionNumber: vacantPosition.positionNumber,
                            fromUnit: vacantPosition.unit,
                            fromActingAs: vacantPosition.actingAs,
                            toPosCodeId: null,
                            toPosCodeMaster: null,
                            toPosition: null,
                            toPositionNumber: null,
                            toUnit: null,
                            toActingAs: null,
                            transaction: null,
                            sequence: null,
                        } as any;
                    }
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
            }
        } else {
            // กรณีไม่มี transaction - ตรวจสอบว่าเป็นตำแหน่งว่างหรือไม่
            for (let index = 0; index < paginatedData.length; index++) {
                const detail = paginatedData[index];
                
                // ถ้าเป็นตำแหน่งว่างและยังไม่ได้จับคู่ - ให้แสดงข้อมูลตำแหน่งว่างตัวเอง
                const isVacantPosition = ['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(detail.fullName?.trim() || '');
                
                if (isVacantPosition) {
                    // สร้าง replaced object จากตัวเองเพื่อแสดงข้อมูลตำแหน่งว่าง
                    paginatedData[index].replacedPerson = {
                        id: detail.id,
                        personnelId: detail.personnelId,
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
                        avatarUrl: detail.avatarUrl,
                        posCodeId: detail.posCodeId,
                        posCodeMaster: detail.posCodeMaster,
                        fromPosition: detail.fromPosition,
                        fromPositionNumber: detail.fromPositionNumber,
                        fromUnit: detail.fromUnit,
                        fromActingAs: detail.fromActingAs,
                        toPosCodeId: null,
                        toPosCodeMaster: null,
                        toPosition: null,
                        toPositionNumber: null,
                        toUnit: null,
                        toActingAs: null,
                        transaction: null,
                        sequence: null,
                    } as any;
                } else {
                    paginatedData[index].replacedPerson = null;
                }
            }
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

        // นับตำแหน่งว่างทั้งหมดจาก personnel ที่ผ่าน filter แล้ว
        const totalVacantPositions = personnel.filter(p => {
            const isVacant = !p.fullName || 
                            p.fullName.trim() === '' ||
                            ['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(p.fullName.trim());
            return isVacant;
        }).length;

        // นับตำแหน่งว่างที่มีคนเลือกเข้าไปแล้ว (เฉพาะที่อยู่ใน personnel ที่ผ่าน filter)
        const vacantPositionsFilled = personnel.filter(p => {
            const isVacant = !p.fullName || 
                            p.fullName.trim() === '' ||
                            ['ว่าง', 'ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)'].includes(p.fullName.trim());
            if (!isVacant) return false;
            
            // ตรวจสอบว่าตำแหน่งนี้มีคนเข้ามาแทนหรือไม่
            const posKey = p.unit && p.positionNumber ? `${p.unit}|${p.positionNumber}` : null;
            return posKey && filledPositions.has(posKey);
        }).length;

        const summary = {
            totalPersonnel: combinedData.length,
            promoted: combinedData.filter(d => 
                d.posCodeId && d.toPosCodeId && d.toPosCodeId < d.posCodeId
            ).length,
            twoWaySwap: combinedData.filter(d => 
                d.transaction && d.transaction.swapType === 'two-way'
            ).length,
            threeWaySwap: combinedData.filter(d => 
                d.transaction && d.transaction.swapType === 'three-way'
            ).length,
            transfer: combinedData.filter(d => 
                d.transaction && d.transaction.swapType === 'transfer'
            ).length,
            totalVacant: totalVacantPositions,
            vacantFilled: vacantPositionsFilled,
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
        console.error('[New-In-Out API] Error:', error);
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
