-- CreateTable
CREATE TABLE `three_way_transaction` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `swapDate` DATETIME(3) NOT NULL,
    `group_name` VARCHAR(191) NULL,
    `group_number` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'completed',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `three_way_transaction_year_idx`(`year`),
    INDEX `three_way_transaction_swapDate_idx`(`swapDate`),
    INDEX `three_way_transaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `three_way_transaction_detail` (
    `id` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `personnel_id` VARCHAR(191) NULL,
    `national_id` VARCHAR(191) NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `rank` VARCHAR(191) NULL,
    `pos_code_id` INTEGER NULL,
    `from_position` VARCHAR(191) NULL,
    `from_position_number` VARCHAR(191) NULL,
    `from_unit` VARCHAR(191) NULL,
    `to_position` VARCHAR(191) NULL,
    `to_position_number` VARCHAR(191) NULL,
    `to_unit` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `three_way_transaction_detail_transaction_id_idx`(`transaction_id`),
    INDEX `three_way_transaction_detail_personnel_id_idx`(`personnel_id`),
    INDEX `three_way_transaction_detail_national_id_idx`(`national_id`),
    INDEX `three_way_transaction_detail_sequence_idx`(`sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `three_way_transaction_detail` ADD CONSTRAINT `three_way_transaction_detail_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `three_way_transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
