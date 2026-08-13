-- ============================================================
-- V27: Đổi trả NCC — IN_PROGRESS, method, line_status, exchange_batch
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'method'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN method VARCHAR(20) NOT NULL DEFAULT ''RETURN'' AFTER return_reason',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'line_status'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN line_status VARCHAR(30) NOT NULL DEFAULT ''WAITING_SUPPLIER'' AFTER method',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'note'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN note VARCHAR(500) NULL AFTER line_status',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'stock_reserved'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN stock_reserved TINYINT(1) NOT NULL DEFAULT 0 AFTER note',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'exchange_batch_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN exchange_batch_id INT NULL AFTER stock_reserved',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND CONSTRAINT_NAME = 'fk_import_return_details_exchange_batch'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE import_return_details
        ADD CONSTRAINT fk_import_return_details_exchange_batch
        FOREIGN KEY (exchange_batch_id) REFERENCES stock_batches (id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
