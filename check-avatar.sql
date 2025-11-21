-- ตรวจสอบ avatarUrl ในฐานข้อมูล
SELECT id, full_name, avatar_url FROM police_personnel WHERE avatar_url IS NOT NULL LIMIT 10;
