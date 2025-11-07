-- Add toPosCodeId to swap_transaction_detail table
ALTER TABLE `swap_transaction_detail` 
ADD COLUMN `to_pos_code_id` INT NULL AFTER `pos_code_id`,
ADD INDEX `swap_transaction_detail_to_pos_code_id_idx` (`to_pos_code_id`),
ADD CONSTRAINT `swap_transaction_detail_to_pos_code_id_fkey` 
  FOREIGN KEY (`to_pos_code_id`) REFERENCES `pos_code_master`(`pos_code_id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;
