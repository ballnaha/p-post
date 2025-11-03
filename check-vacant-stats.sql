-- ตรวจสอบสถิติตำแหน่งว่าง ปี 2568

-- 1. จำนวนตำแหน่งว่าง "ว่าง" ทั้งหมด
SELECT 
    COUNT(*) as total_vacant_positions,
    SUM(CASE WHEN full_name = 'ว่าง' THEN 1 ELSE 0 END) as vacant_only,
    SUM(CASE WHEN full_name IN ('ว่าง (กันตำแหน่ง)', 'ว่าง(กันตำแหน่ง)') THEN 1 ELSE 0 END) as reserved
FROM vacant_position
WHERE year = 2568
  AND nominator IS NULL
  AND requested_position_id IS NULL;

-- 2. จำนวนผู้ยื่นขอตำแหน่ง
SELECT 
    COUNT(*) as total_applicants,
    SUM(CASE WHEN is_assigned = 1 THEN 1 ELSE 0 END) as assigned,
    SUM(CASE WHEN is_assigned = 0 THEN 1 ELSE 0 END) as pending
FROM vacant_position
WHERE year = 2568
  AND (nominator IS NOT NULL OR requested_position_id IS NOT NULL);

-- 3. จำนวนตำแหน่งที่ถูกจับคู่ (ไม่ซ้ำ) - ใช้ position|unit|positionNumber
SELECT 
    COUNT(DISTINCT CONCAT(to_position, '|', to_unit, '|', IFNULL(to_position_number, ''))) as unique_positions_assigned,
    COUNT(*) as total_assignments,
    COUNT(DISTINCT CONCAT(to_position, '|', to_unit)) as positions_without_number
FROM swap_transaction_detail std
JOIN swap_transaction st ON std.transaction_id = st.id
WHERE st.year = 2568
  AND st.swap_type = 'vacant-assignment'
  AND st.status = 'completed';

-- 4. รายละเอียดการจับคู่ (แสดงชื่อตำแหน่ง + เลขตำแหน่ง)
SELECT 
    std.to_position,
    std.to_unit,
    std.to_position_number,
    std.full_name,
    std.rank,
    st.swap_date,
    COUNT(*) as count_assignments
FROM swap_transaction_detail std
JOIN swap_transaction st ON std.transaction_id = st.id
WHERE st.year = 2568
  AND st.swap_type = 'vacant-assignment'
  AND st.status = 'completed'
GROUP BY std.to_position, std.to_unit, std.to_position_number, std.full_name, std.rank, st.swap_date
ORDER BY std.to_position, std.to_unit, std.to_position_number;

-- 4.1 เช็คว่ามีตำแหน่งที่ชื่อเหมือนกันแต่เลขต่างกันถูกจับคู่หรือไม่
SELECT 
    std.to_position,
    std.to_unit,
    COUNT(DISTINCT std.to_position_number) as different_position_numbers,
    COUNT(*) as total_people,
    GROUP_CONCAT(CONCAT(std.full_name, ' (', IFNULL(std.to_position_number, 'ไม่มีเลข'), ')') SEPARATOR ', ') as assigned_people
FROM swap_transaction_detail std
JOIN swap_transaction st ON std.transaction_id = st.id
WHERE st.year = 2568
  AND st.swap_type = 'vacant-assignment'
  AND st.status = 'completed'
GROUP BY std.to_position, std.to_unit
HAVING COUNT(DISTINCT std.to_position_number) > 1 OR COUNT(*) > 1;

-- 5. จำนวนผู้ยื่นขอแต่ละตำแหน่ง
SELECT 
    pc.name as position_name,
    SUM(CASE WHEN vp.is_assigned = 0 THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN vp.is_assigned = 1 THEN 1 ELSE 0 END) as assigned
FROM vacant_position vp
JOIN pos_code_master pc ON vp.requested_position_id = pc.pos_code_id
WHERE vp.year = 2568
  AND vp.requested_position_id IS NOT NULL
GROUP BY pc.name
ORDER BY pending DESC, assigned DESC;

-- 6. เช็คว่าตำแหน่งที่ถูกจับคู่เป็นประเภท "ว่าง" หรือ "กันตำแหน่ง" (รวม positionNumber)
SELECT 
    vp.full_name as position_type,
    COUNT(DISTINCT CONCAT(std.to_position, '|', std.to_unit, '|', IFNULL(std.to_position_number, ''))) as unique_positions_assigned,
    COUNT(*) as total_people_assigned,
    GROUP_CONCAT(DISTINCT CONCAT(std.to_position, ' (', IFNULL(std.to_position_number, 'ไม่มีเลข'), ')') SEPARATOR ', ') as positions_detail
FROM swap_transaction_detail std
JOIN swap_transaction st ON std.transaction_id = st.id
LEFT JOIN vacant_position vp ON 
    vp.position = std.to_position 
    AND vp.unit = std.to_unit
    AND (vp.position_number = std.to_position_number OR (vp.position_number IS NULL AND std.to_position_number IS NULL))
    AND vp.year = st.year
    AND vp.nominator IS NULL
    AND vp.requested_position_id IS NULL
WHERE st.year = 2568
  AND st.swap_type = 'vacant-assignment'
  AND st.status = 'completed'
GROUP BY vp.full_name;
