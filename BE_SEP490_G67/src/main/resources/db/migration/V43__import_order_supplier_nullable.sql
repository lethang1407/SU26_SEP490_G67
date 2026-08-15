-- Phiếu tạm được lưu chưa chọn NCC → supplier_id nullable.
SET @nullable := (
    SELECT IS_NULLABLE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_orders'
      AND COLUMN_NAME = 'supplier_id'
);
SET @sql := IF(@nullable = 'NO',
    'ALTER TABLE import_orders MODIFY COLUMN supplier_id INT NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
