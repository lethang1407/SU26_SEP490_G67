-- ============================================================
-- V25: Kiểm kho theo lô — inventory_check_details.stock_batch_id
-- NULL = kiểm tất cả lô của SP; có giá trị = đúng 1 lô.
-- Guarded: Hibernate ddl-auto có thể đã thêm cột / bảng chưa tạo.
-- ============================================================

SET @table_exists := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
);

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND COLUMN_NAME = 'stock_batch_id'
);
SET @sql := IF(@table_exists = 0 OR @col_exists > 0,
    'DO 0',
    'ALTER TABLE inventory_check_details ADD COLUMN stock_batch_id INT NULL AFTER product_id');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND CONSTRAINT_NAME = 'fk_inventory_check_details_batch'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@table_exists = 0 OR @fk_exists > 0,
    'DO 0',
    'ALTER TABLE inventory_check_details
        ADD CONSTRAINT fk_inventory_check_details_batch
        FOREIGN KEY (stock_batch_id) REFERENCES stock_batches (id)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND INDEX_NAME = 'idx_inventory_check_details_batch'
);
SET @sql := IF(@table_exists = 0 OR @idx_exists > 0,
    'DO 0',
    'CREATE INDEX idx_inventory_check_details_batch ON inventory_check_details (stock_batch_id)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
