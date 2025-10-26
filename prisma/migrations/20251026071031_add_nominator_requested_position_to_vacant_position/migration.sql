/*
  Warnings:

  - You are about to drop the column `requested_position` on the `swap_list` table. All the data in the column will be lost.
  - You are about to drop the column `supporter` on the `swap_list` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `swap_list` DROP COLUMN `requested_position`,
    DROP COLUMN `supporter`;

-- AlterTable
ALTER TABLE `vacant_position` ADD COLUMN `nominator` VARCHAR(191) NULL,
    ADD COLUMN `requested_position` VARCHAR(191) NULL;
