-- AlterTable
ALTER TABLE `swap_transaction_detail` ADD COLUMN `from_acting_as` VARCHAR(191) NULL,
    ADD COLUMN `to_acting_as` VARCHAR(191) NULL;
