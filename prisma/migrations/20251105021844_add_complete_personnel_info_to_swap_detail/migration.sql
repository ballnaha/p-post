-- AlterTable
ALTER TABLE `swap_transaction_detail` ADD COLUMN `age` VARCHAR(191) NULL,
    ADD COLUMN `birth_date` VARCHAR(191) NULL,
    ADD COLUMN `current_rank_since` VARCHAR(191) NULL,
    ADD COLUMN `education` VARCHAR(191) NULL,
    ADD COLUMN `enrollment_date` VARCHAR(191) NULL,
    ADD COLUMN `last_appointment` VARCHAR(191) NULL,
    ADD COLUMN `retirement_date` VARCHAR(191) NULL,
    ADD COLUMN `seniority` VARCHAR(191) NULL,
    ADD COLUMN `training_course` VARCHAR(191) NULL,
    ADD COLUMN `training_location` VARCHAR(191) NULL,
    ADD COLUMN `years_of_service` VARCHAR(191) NULL;
