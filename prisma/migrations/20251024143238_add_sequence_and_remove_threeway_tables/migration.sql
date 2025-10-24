/*
  Warnings:

  - You are about to drop the `three_way_transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `three_way_transaction_detail` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `three_way_transaction_detail` DROP FOREIGN KEY `three_way_transaction_detail_transaction_id_fkey`;

-- AlterTable
ALTER TABLE `swap_transaction_detail` ADD COLUMN `sequence` INTEGER NULL;

-- DropTable
DROP TABLE `three_way_transaction`;

-- DropTable
DROP TABLE `three_way_transaction_detail`;

-- CreateIndex
CREATE INDEX `swap_transaction_detail_sequence_idx` ON `swap_transaction_detail`(`sequence`);
