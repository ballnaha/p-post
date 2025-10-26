-- AlterTable
ALTER TABLE `vacant_position` ADD COLUMN `requested_position_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `vacant_position_pos_code_idx` ON `vacant_position`(`pos_code`);

-- CreateIndex
CREATE INDEX `vacant_position_requested_position_id_idx` ON `vacant_position`(`requested_position_id`);

-- AddForeignKey
ALTER TABLE `vacant_position` ADD CONSTRAINT `vacant_position_requested_position_id_fkey` FOREIGN KEY (`requested_position_id`) REFERENCES `pos_code_master`(`pos_code_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vacant_position` ADD CONSTRAINT `vacant_position_pos_code_fkey` FOREIGN KEY (`pos_code`) REFERENCES `pos_code_master`(`pos_code_id`) ON DELETE SET NULL ON UPDATE CASCADE;
