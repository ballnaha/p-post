-- CreateTable
CREATE TABLE `import_job` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `importMode` VARCHAR(191) NOT NULL DEFAULT 'full',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `totalRows` INTEGER NOT NULL DEFAULT 0,
    `processedRows` INTEGER NOT NULL DEFAULT 0,
    `successRows` INTEGER NOT NULL DEFAULT 0,
    `failedRows` INTEGER NOT NULL DEFAULT 0,
    `updatedRows` INTEGER NOT NULL DEFAULT 0,
    `file_name` VARCHAR(191) NULL,
    `file_size` INTEGER NULL,
    `errors` TEXT NULL,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` VARCHAR(191) NULL,

    INDEX `import_job_status_idx`(`status`),
    INDEX `import_job_year_idx`(`year`),
    INDEX `import_job_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
