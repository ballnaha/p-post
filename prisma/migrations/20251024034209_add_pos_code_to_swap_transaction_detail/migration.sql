/*
  Warnings:

  - You are about to drop the column `age` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `birth_date` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `current_rank_since` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `education` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `enrollment_date` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `from_acting_as` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `last_appointment` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `no_id` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `retirement_date` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `seniority` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `training_course` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `training_location` on the `swap_transaction_detail` table. All the data in the column will be lost.
  - You are about to drop the column `years_of_service` on the `swap_transaction_detail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `swap_transaction_detail` DROP COLUMN `age`,
    DROP COLUMN `birth_date`,
    DROP COLUMN `current_rank_since`,
    DROP COLUMN `education`,
    DROP COLUMN `enrollment_date`,
    DROP COLUMN `from_acting_as`,
    DROP COLUMN `last_appointment`,
    DROP COLUMN `no_id`,
    DROP COLUMN `retirement_date`,
    DROP COLUMN `seniority`,
    DROP COLUMN `training_course`,
    DROP COLUMN `training_location`,
    DROP COLUMN `years_of_service`,
    ADD COLUMN `pos_code_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `swap_transaction_detail` ADD CONSTRAINT `swap_transaction_detail_pos_code_id_fkey` FOREIGN KEY (`pos_code_id`) REFERENCES `pos_code_master`(`pos_code_id`) ON DELETE SET NULL ON UPDATE CASCADE;
