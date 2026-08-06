-- ============================================================
-- V8: Mã lô hàng (batch_code) gắn với phiếu nhập — LO-NH000001.
-- Guarded: dev DB có thể đã có cột từ lần chạy migration thất bại / ddl-auto.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_batches'
      AND COLUMN_NAME = 'batch_code'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE stock_batches ADD COLUMN batch_code VARCHAR(50) NULL AFTER import_order_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE stock_batches sb
    INNER JOIN import_orders io ON sb.import_order_id = io.id
SET sb.batch_code = CONCAT('LO-', io.order_code)
WHERE sb.batch_code IS NULL
  AND io.order_code IS NOT NULL;

UPDATE stock_batches
SET batch_code = CONCAT('BATCH-', id)
WHERE batch_code IS NULL;

ALTER TABLE stock_batches
    MODIFY COLUMN batch_code VARCHAR(50) NOT NULL;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_batches'
      AND INDEX_NAME = 'idx_stock_batches_batch_code'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX idx_stock_batches_batch_code ON stock_batches (batch_code)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
