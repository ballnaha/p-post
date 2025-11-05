-- SQL สำหรบอพเดท noId ในขอมลเกา
-- อพเดท no_id จาก police_personnel โดยอางองจาก personnel_id

UPDATE swap_transaction_detail std
INNER JOIN police_personnel pp ON std.personnel_id = pp.id
SET std.no_id = pp.no_id
WHERE std.personnel_id IS NOT NULL
  AND std.no_id IS NULL;

-- ตรวจสอบวาอพเดทสำเรจ
SELECT 
  std.id,
  std.full_name,
  std.personnel_id,
  std.no_id,
  pp.no_id as personnel_no_id
FROM swap_transaction_detail std
LEFT JOIN police_personnel pp ON std.personnel_id = pp.id
WHERE std.personnel_id IS NOT NULL
LIMIT 10;
