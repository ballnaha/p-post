-- CreateTable
CREATE TABLE `pos_code_master` (
    `pos_code_id` INTEGER NOT NULL,
    `pos_code_name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`pos_code_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `police_personnel` (
    `id` VARCHAR(191) NOT NULL,
    `no_id` INTEGER NULL,
    `pos_code` INTEGER NULL,
    `position` VARCHAR(191) NULL,
    `position_number` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `acting_as` VARCHAR(191) NULL,
    `seniority` VARCHAR(191) NULL,
    `rank` VARCHAR(191) NULL,
    `full_name` VARCHAR(191) NULL,
    `national_id` VARCHAR(191) NULL,
    `birth_date` VARCHAR(191) NULL,
    `age` VARCHAR(191) NULL,
    `education` VARCHAR(191) NULL,
    `last_appointment` VARCHAR(191) NULL,
    `current_rank_since` VARCHAR(191) NULL,
    `enrollment_date` VARCHAR(191) NULL,
    `retirement_date` VARCHAR(191) NULL,
    `years_of_service` VARCHAR(191) NULL,
    `training_location` VARCHAR(191) NULL,
    `training_course` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `police_personnel_pos_code_idx`(`pos_code`),
    INDEX `police_personnel_national_id_idx`(`national_id`),
    INDEX `police_personnel_rank_idx`(`rank`),
    INDEX `police_personnel_unit_idx`(`unit`),
    INDEX `police_personnel_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `swap_list` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `original_personnel_id` VARCHAR(191) NULL,
    `no_id` INTEGER NULL,
    `pos_code` INTEGER NULL,
    `position` VARCHAR(191) NULL,
    `position_number` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `acting_as` VARCHAR(191) NULL,
    `seniority` VARCHAR(191) NULL,
    `rank` VARCHAR(191) NULL,
    `full_name` VARCHAR(191) NULL,
    `national_id` VARCHAR(191) NULL,
    `birth_date` VARCHAR(191) NULL,
    `age` VARCHAR(191) NULL,
    `education` VARCHAR(191) NULL,
    `last_appointment` VARCHAR(191) NULL,
    `current_rank_since` VARCHAR(191) NULL,
    `enrollment_date` VARCHAR(191) NULL,
    `retirement_date` VARCHAR(191) NULL,
    `years_of_service` VARCHAR(191) NULL,
    `training_location` VARCHAR(191) NULL,
    `training_course` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `swap_list_original_personnel_id_year_idx`(`original_personnel_id`, `year`),
    INDEX `swap_list_year_idx`(`year`),
    INDEX `swap_list_national_id_idx`(`national_id`),
    INDEX `swap_list_rank_idx`(`rank`),
    INDEX `swap_list_unit_idx`(`unit`),
    INDEX `swap_list_position_idx`(`position`),
    INDEX `swap_list_full_name_idx`(`full_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `three_way_swap` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `original_personnel_id` VARCHAR(191) NULL,
    `no_id` INTEGER NULL,
    `pos_code` INTEGER NULL,
    `position` VARCHAR(191) NULL,
    `position_number` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `acting_as` VARCHAR(191) NULL,
    `seniority` VARCHAR(191) NULL,
    `rank` VARCHAR(191) NULL,
    `full_name` VARCHAR(191) NULL,
    `national_id` VARCHAR(191) NULL,
    `birth_date` VARCHAR(191) NULL,
    `age` VARCHAR(191) NULL,
    `education` VARCHAR(191) NULL,
    `last_appointment` VARCHAR(191) NULL,
    `current_rank_since` VARCHAR(191) NULL,
    `enrollment_date` VARCHAR(191) NULL,
    `retirement_date` VARCHAR(191) NULL,
    `years_of_service` VARCHAR(191) NULL,
    `training_location` VARCHAR(191) NULL,
    `training_course` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `three_way_swap_year_idx`(`year`),
    INDEX `three_way_swap_national_id_idx`(`national_id`),
    INDEX `three_way_swap_rank_idx`(`rank`),
    INDEX `three_way_swap_unit_idx`(`unit`),
    INDEX `three_way_swap_position_idx`(`position`),
    INDEX `three_way_swap_full_name_idx`(`full_name`),
    UNIQUE INDEX `three_way_swap_original_personnel_id_year_key`(`original_personnel_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vacant_position` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `original_personnel_id` VARCHAR(191) NULL,
    `no_id` INTEGER NULL,
    `pos_code` INTEGER NULL,
    `position` VARCHAR(191) NULL,
    `position_number` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `acting_as` VARCHAR(191) NULL,
    `seniority` VARCHAR(191) NULL,
    `rank` VARCHAR(191) NULL,
    `full_name` VARCHAR(191) NULL,
    `national_id` VARCHAR(191) NULL,
    `birth_date` VARCHAR(191) NULL,
    `age` VARCHAR(191) NULL,
    `education` VARCHAR(191) NULL,
    `last_appointment` VARCHAR(191) NULL,
    `current_rank_since` VARCHAR(191) NULL,
    `enrollment_date` VARCHAR(191) NULL,
    `retirement_date` VARCHAR(191) NULL,
    `years_of_service` VARCHAR(191) NULL,
    `training_location` VARCHAR(191) NULL,
    `training_course` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `vacant_position_year_idx`(`year`),
    INDEX `vacant_position_unit_idx`(`unit`),
    INDEX `vacant_position_position_idx`(`position`),
    UNIQUE INDEX `vacant_position_original_personnel_id_year_key`(`original_personnel_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `swap_transaction` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `swapDate` DATETIME(3) NOT NULL,
    `swapType` VARCHAR(191) NOT NULL DEFAULT 'two-way',
    `group_name` VARCHAR(191) NULL,
    `group_number` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'completed',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `swap_transaction_year_idx`(`year`),
    INDEX `swap_transaction_swapDate_idx`(`swapDate`),
    INDEX `swap_transaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `swap_transaction_detail` (
    `id` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NOT NULL,
    `personnel_id` VARCHAR(191) NULL,
    `no_id` INTEGER NULL,
    `national_id` VARCHAR(191) NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `rank` VARCHAR(191) NULL,
    `seniority` VARCHAR(191) NULL,
    `age` VARCHAR(191) NULL,
    `birth_date` VARCHAR(191) NULL,
    `education` VARCHAR(191) NULL,
    `from_position` VARCHAR(191) NULL,
    `from_position_number` VARCHAR(191) NULL,
    `from_unit` VARCHAR(191) NULL,
    `from_acting_as` VARCHAR(191) NULL,
    `to_position` VARCHAR(191) NULL,
    `to_position_number` VARCHAR(191) NULL,
    `to_unit` VARCHAR(191) NULL,
    `last_appointment` VARCHAR(191) NULL,
    `current_rank_since` VARCHAR(191) NULL,
    `enrollment_date` VARCHAR(191) NULL,
    `retirement_date` VARCHAR(191) NULL,
    `years_of_service` VARCHAR(191) NULL,
    `training_location` VARCHAR(191) NULL,
    `training_course` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `swap_transaction_detail_transaction_id_idx`(`transaction_id`),
    INDEX `swap_transaction_detail_personnel_id_idx`(`personnel_id`),
    INDEX `swap_transaction_detail_national_id_idx`(`national_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `police_personnel` ADD CONSTRAINT `police_personnel_pos_code_fkey` FOREIGN KEY (`pos_code`) REFERENCES `pos_code_master`(`pos_code_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `swap_transaction_detail` ADD CONSTRAINT `swap_transaction_detail_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `swap_transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
