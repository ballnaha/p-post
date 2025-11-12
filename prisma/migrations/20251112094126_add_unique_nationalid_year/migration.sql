/*
  Warnings:

  - A unique constraint covering the columns `[national_id,year]` on the table `police_personnel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `police_personnel_national_id_year_key` ON `police_personnel`(`national_id`, `year`);
