-- Check promotion-chain data
SELECT 
    std.id,
    std.full_name,
    std.from_position_number,
    std.to_position_number,
    std.is_placeholder,
    st.swap_type,
    st.group_number,
    st.group_name
FROM swap_transaction_detail std
INNER JOIN swap_transaction st ON std.transaction_id = st.id
WHERE st.swap_type = 'promotion-chain'
ORDER BY st.id, std.sequence
LIMIT 50;
