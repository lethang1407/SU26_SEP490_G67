-- V78: Bổ sung các cột TaxRecord cho database đã có bảng tax_records từ phiên bản cũ.
-- Migration dùng metadata check để có thể chạy an toàn trên nhiều trạng thái schema.

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'tax_records' AND column_name = 'calculated_at') = 0,
    'ALTER TABLE tax_records ADD COLUMN calculated_at DATETIME(6) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'tax_records' AND column_name = 'confirmed_at') = 0,
    'ALTER TABLE tax_records ADD COLUMN confirmed_at DATETIME(6) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'tax_records' AND column_name = 'legal_version') = 0,
    'ALTER TABLE tax_records ADD COLUMN legal_version VARCHAR(100) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'tax_records' AND column_name = 'template_version') = 0,
    'ALTER TABLE tax_records ADD COLUMN template_version VARCHAR(100) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
