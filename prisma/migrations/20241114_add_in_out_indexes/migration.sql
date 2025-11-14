-- Add indexes for in-out page performance optimization

-- Indexes for swap_transaction table
CREATE INDEX `swap_transaction_year_status_idx` ON `swap_transaction`(`year`, `status`);
CREATE INDEX `swap_transaction_swapType_idx` ON `swap_transaction`(`swapType`);

-- Indexes for swap_transaction_detail table
CREATE INDEX `swap_transaction_detail_toPosCodeId_idx` ON `swap_transaction_detail`(`to_pos_code_id`);
CREATE INDEX `swap_transaction_detail_fromUnit_idx` ON `swap_transaction_detail`(`from_unit`);
CREATE INDEX `swap_transaction_detail_transactionId_sequence_idx` ON `swap_transaction_detail`(`transaction_id`, `sequence`);
