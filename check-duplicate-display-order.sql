-- ตรวจสอบ displayOrder ที่ซ้ำกัน
SELECT 
  display_order,
  COUNT(*) as count,
  GROUP_CONCAT(id) as ids,
  GROUP_CONCAT(full_name) as names
FROM vacant_position
WHERE display_order IS NOT NULL
GROUP BY display_order
HAVING COUNT(*) > 1
ORDER BY display_order;

-- แสดงค่า displayOrder ทั้งหมด
SELECT 
  id,
  full_name,
  display_order,
  year,
  requested_position_id
FROM vacant_position
ORDER BY display_order ASC, year DESC;
