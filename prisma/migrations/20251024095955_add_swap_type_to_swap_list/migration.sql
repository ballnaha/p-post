-- AlterTable
ALTER TABLE `swap_list` ADD COLUMN `swap_type` VARCHAR(191) NOT NULL DEFAULT 'two-way';

-- CreateIndex
CREATE INDEX `swap_list_swap_type_idx` ON `swap_list`(`swap_type`);
