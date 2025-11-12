-- AlterTable
ALTER TABLE `police_personnel` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `year` INTEGER NOT NULL DEFAULT 2024;

-- CreateIndex
CREATE INDEX `police_personnel_year_idx` ON `police_personnel`(`year`);

-- CreateIndex
CREATE INDEX `police_personnel_is_active_idx` ON `police_personnel`(`is_active`);

-- CreateIndex
CREATE INDEX `police_personnel_year_is_active_idx` ON `police_personnel`(`year`, `is_active`);

-- CreateIndex
CREATE INDEX `police_personnel_national_id_year_idx` ON `police_personnel`(`national_id`, `year`);
