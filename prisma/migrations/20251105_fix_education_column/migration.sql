-- AlterTable education column to TEXT type
ALTER TABLE `police_personnel` MODIFY COLUMN `education` TEXT NULL;
ALTER TABLE `vacant_position` MODIFY COLUMN `education` TEXT NULL;
