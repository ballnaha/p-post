/*
  Warnings:

  - You are about to drop the `swap_list` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `swap_list` DROP FOREIGN KEY `swap_list_pos_code_fkey`;

-- DropTable
DROP TABLE `swap_list`;
