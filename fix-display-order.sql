-- แก้ไข displayOrder ให้เป็น sequence ที่ถูกต้อง
-- เรียงตาม createdAt ก่อน

SET @row_number = 0;

UPDATE vacant_position
SET display_order = (@row_number:=@row_number + 1)
ORDER BY 
  COALESCE(display_order, 999999),
  created_at ASC;

-- ตรวจสอบผลลัพธ์หลัง update
SELECT 
  id,
  full_name,
  display_order,
  year,
  requested_position_id,
  created_at
FROM vacant_position
ORDER BY display_order ASC;
