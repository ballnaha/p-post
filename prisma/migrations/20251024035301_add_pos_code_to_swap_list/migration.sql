-- CreateIndex
CREATE INDEX `swap_list_pos_code_idx` ON `swap_list`(`pos_code`);

-- AddForeignKey
ALTER TABLE `swap_list` ADD CONSTRAINT `swap_list_pos_code_fkey` FOREIGN KEY (`pos_code`) REFERENCES `pos_code_master`(`pos_code_id`) ON DELETE SET NULL ON UPDATE CASCADE;
