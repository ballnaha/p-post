/*
  Warnings:

  - You are about to drop the column `original_personnel_id` on the `swap_list` table. All the data in the column will be lost.
  - You are about to drop the column `original_personnel_id` on the `three_way_swap` table. All the data in the column will be lost.
  - You are about to drop the column `original_personnel_id` on the `vacant_position` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `swap_list_original_personnel_id_year_idx` ON `swap_list`;

-- DropIndex
DROP INDEX `three_way_swap_original_personnel_id_year_key` ON `three_way_swap`;

-- DropIndex
DROP INDEX `vacant_position_original_personnel_id_year_key` ON `vacant_position`;

-- AlterTable
ALTER TABLE `swap_list` DROP COLUMN `original_personnel_id`;

-- AlterTable
ALTER TABLE `three_way_swap` DROP COLUMN `original_personnel_id`;

-- AlterTable
ALTER TABLE `vacant_position` DROP COLUMN `original_personnel_id`;
