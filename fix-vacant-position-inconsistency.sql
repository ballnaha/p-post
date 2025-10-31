-- =========================================
-- แก้ไข Data Inconsistency ใน vacant_position
-- =========================================
-- ปัญหา: มี record ที่ requested_position_id = NULL แต่ is_assigned = 1
-- แก้ไข: เปลี่ยน is_assigned กลับเป็น 0 เพราะตำแหน่งว่างไม่ควรมีสถานะ "จับคู่แล้ว"
-- 
-- Business Logic ที่ถูกต้อง:
-- - ถ้า requested_position_id = NULL → is_assigned ต้องเป็น 0 (ตำแหน่งว่างที่ยังไม่มีคนยื่นขอ)
-- - ถ้า is_assigned = 1 → requested_position_id ต้องไม่เป็น NULL (ต้องระบุว่าจับคู่ไปตำแหน่งไหน)
-- =========================================

-- 1. ตรวจสอบข้อมูลที่มีปัญหาก่อน
SELECT 
    id,
    year,
    pos_code,
    position,
    unit,
    full_name,
    requested_position_id,
    is_assigned,
    created_at,
    updated_at
FROM vacant_position
WHERE requested_position_id IS NULL 
  AND is_assigned = 1
ORDER BY year DESC, created_at DESC;

-- 2. แก้ไขข้อมูล: เปลี่ยน is_assigned = 1 เป็น 0
-- (ตำแหน่งว่างที่ไม่มีคนยื่นขอไม่ควรมีสถานะจับคู่แล้ว)
UPDATE vacant_position 
SET 
    is_assigned = 0,
    updated_at = NOW()
WHERE requested_position_id IS NULL 
  AND is_assigned = 1;

-- 3. ตรวจสอบผลลัพธ์หลังแก้ไข (ควรไม่มี record)
SELECT 
    id,
    year,
    pos_code,
    position,
    unit,
    full_name,
    requested_position_id,
    is_assigned
FROM vacant_position
WHERE requested_position_id IS NULL 
  AND is_assigned = 1;

-- 4. สรุปสถิติหลังแก้ไข
SELECT 
    year,
    COUNT(*) as total_records,
    SUM(CASE WHEN requested_position_id IS NULL AND is_assigned = 0 THEN 1 ELSE 0 END) as vacant_positions,
    SUM(CASE WHEN requested_position_id IS NOT NULL AND is_assigned = 0 THEN 1 ELSE 0 END) as pending_applicants,
    SUM(CASE WHEN requested_position_id IS NOT NULL AND is_assigned = 1 THEN 1 ELSE 0 END) as assigned_applicants,
    SUM(CASE WHEN requested_position_id IS NULL AND is_assigned = 1 THEN 1 ELSE 0 END) as inconsistent_data
FROM vacant_position
GROUP BY year
ORDER BY year DESC;

-- =========================================
-- คำอธิบายผลลัพธ์:
-- - vacant_positions: ตำแหน่งว่างที่ยังไม่มีคนยื่นขอ (ถูกต้อง)
-- - pending_applicants: มีคนยื่นขอแต่ยังไม่จับคู่ (ถูกต้อง)
-- - assigned_applicants: มีคนยื่นขอและจับคู่สำเร็จแล้ว (ถูกต้อง)
-- - inconsistent_data: ข้อมูลไม่สอดคล้อง (ต้องเป็น 0)
-- =========================================
