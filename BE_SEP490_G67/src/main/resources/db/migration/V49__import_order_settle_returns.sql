-- Gắn dòng đổi/trả đang chờ vào phiếu nhập; trừ tiền trả / ghi số NCC trả lại.

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'settled_import_order_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN settled_import_order_id INT NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND CONSTRAINT_NAME = 'fk_ird_settled_import_order'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE import_return_details ADD CONSTRAINT fk_ird_settled_import_order FOREIGN KEY (settled_import_order_id) REFERENCES import_orders (id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND INDEX_NAME = 'idx_ird_settled_import_order'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX idx_ird_settled_import_order ON import_return_details (settled_import_order_id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_orders'
      AND COLUMN_NAME = 'return_deduction_amount'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_orders ADD COLUMN return_deduction_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER discount_amount',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_orders'
      AND COLUMN_NAME = 'supplier_refund_amount'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_orders ADD COLUMN supplier_refund_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER return_deduction_amount',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
