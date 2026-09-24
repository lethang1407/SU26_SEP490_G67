-- V81: Trạng thái kê khai độc lập với trạng thái tính toán TaxRecord.
SET @sql := IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
     AND table_name = 'tax_records' AND column_name = 'declaration_status') = 0,
    'ALTER TABLE tax_records ADD COLUMN declaration_status VARCHAR(20) NOT NULL DEFAULT ''UPDATING''',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
