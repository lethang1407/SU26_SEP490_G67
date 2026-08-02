-- ============================================================
-- V4: Link stock_movements to the shelf location it was drawn from.
--
--     POS order creation deducts stock FEFO across batch_locations
--     (StockDeductionService), so a single sale can touch several
--     locations. Without this column the audit trail only records
--     WHICH BATCH moved, not which location, and the insert fails
--     outright because StockMovement.batchLocation has no column.
--
--     NULLABLE on purpose:
--       - rows written before this migration have no location
--       - ExchangeOrderService writes movements with stockBatch only
--     Any report joining stock_movements -> batch_locations must
--     therefore tolerate NULL.
--
--     Guarded with information_schema checks because MySQL has no
--     ADD COLUMN IF NOT EXISTS: dev databases that already picked the
--     column up from an older ddl-auto run must not fail the migration.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_movements'
      AND COLUMN_NAME = 'batch_location_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE stock_movements ADD COLUMN batch_location_id INT NULL AFTER stock_batch_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_movements'
      AND CONSTRAINT_NAME = 'FK_sm_batch_location'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE stock_movements
        ADD CONSTRAINT FK_sm_batch_location
        FOREIGN KEY (batch_location_id) REFERENCES batch_locations(id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
