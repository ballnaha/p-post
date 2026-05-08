ALTER TABLE `police_personnel`
    ADD COLUMN `position_notes` TEXT NULL;

UPDATE `police_personnel`
SET
    `position_notes` = CASE
        WHEN `notes` IS NULL OR `notes` = '' THEN NULL
        WHEN LOCATE('หมายเหตุตำแหน่ง:', `notes`) = 0 THEN NULL
        ELSE TRIM(
            SUBSTRING_INDEX(
                SUBSTRING(`notes`, LOCATE('หมายเหตุตำแหน่ง:', `notes`) + CHAR_LENGTH('หมายเหตุตำแหน่ง:')),
                '\n',
                1
            )
        )
    END,
    `notes` = CASE
        WHEN `notes` IS NULL OR `notes` = '' THEN NULL
        WHEN LOCATE('หมายเหตุตัวคน:', `notes`) > 0 THEN TRIM(
            SUBSTRING_INDEX(
                SUBSTRING(`notes`, LOCATE('หมายเหตุตัวคน:', `notes`) + CHAR_LENGTH('หมายเหตุตัวคน:')),
                '\n',
                1
            )
        )
        WHEN LOCATE('หมายเหตุตำแหน่ง:', `notes`) > 0 THEN NULLIF(
            TRIM(
                REPLACE(
                    SUBSTRING_INDEX(`notes`, 'หมายเหตุตำแหน่ง:', 1),
                    '\n',
                    ''
                )
            ),
            ''
        )
        ELSE `notes`
    END;
