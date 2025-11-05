/*
  Warnings:

  - You are about to drop the column `display_order` on the `vacant_position` table. All the data in the column will be lost.
  - You are about to drop the column `is_assigned` on the `vacant_position` table. All the data in the column will be lost.
  - You are about to drop the column `nominator` on the `vacant_position` table. All the data in the column will be lost.
  - You are about to drop the column `requested_position` on the `vacant_position` table. All the data in the column will be lost.
  - You are about to drop the column `requested_position_id` on the `vacant_position` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `vacant_position` DROP FOREIGN KEY `vacant_position_requested_position_id_fkey`;

-- DropIndex
DROP INDEX `vacant_position_requested_position_id_idx` ON `vacant_position`;

-- AlterTable
ALTER TABLE `vacant_position` DROP COLUMN `display_order`,
    DROP COLUMN `is_assigned`,
    DROP COLUMN `nominator`,
    DROP COLUMN `requested_position`,
    DROP COLUMN `requested_position_id`;
