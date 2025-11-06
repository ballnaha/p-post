-- AlterTable
ALTER TABLE `police_personnel` ADD COLUMN `support_reason` TEXT NULL,
    ADD COLUMN `supporter_name` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `police_personnel_supporter_name_idx` ON `police_personnel`(`supporter_name`);
