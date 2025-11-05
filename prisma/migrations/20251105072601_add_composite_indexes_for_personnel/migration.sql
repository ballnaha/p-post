-- CreateIndex
CREATE INDEX `police_personnel_rank_pos_code_full_name_idx` ON `police_personnel`(`rank`, `pos_code`, `full_name`);

-- CreateIndex
CREATE INDEX `police_personnel_unit_pos_code_full_name_idx` ON `police_personnel`(`unit`, `pos_code`, `full_name`);
