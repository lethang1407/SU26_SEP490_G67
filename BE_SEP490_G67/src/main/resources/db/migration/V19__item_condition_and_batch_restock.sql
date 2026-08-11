-- ============================================================
-- V14: Item condition and batch-correct restock (redesign v2 §5).
--
--     Until now every returned item went straight back into sellable
--     stock, in whatever batch happened to be available:
--       G4 - expired/damaged goods became sellable again
--       G5 - restocking into an arbitrary batch corrupts FEFO and expiry
--
--     Three columns close that:
--       return_order_details.item_condition  what state it came back in
--       sales_order_details.stock_batch_id   which batch it was sold FROM
--       products.is_returnable               policy flag for goods that
--                                            cannot come back at all
--
--     Guarded with information_schema checks, same as V4-V5, V11-V13.
-- ============================================================

-- ------------------------------------------------------------
-- return_order_details.item_condition
--
-- Added NULLABLE, backfilled, then made NOT NULL.
--
-- Legacy rows are backfilled to RESELLABLE, which is what the old code
-- effectively assumed: it put everything back into sellable stock. That
-- is a statement about what the SYSTEM DID, not a claim about the goods
-- — the condition was never recorded, and inventing a worse one would
-- retroactively write off stock that was already sold on.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'item_condition'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_order_details ADD COLUMN item_condition VARCHAR(20) NULL AFTER resolution_type',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE return_order_details
SET item_condition = 'RESELLABLE'
WHERE item_condition IS NULL;

ALTER TABLE return_order_details MODIFY COLUMN item_condition VARCHAR(20) NOT NULL;

-- ------------------------------------------------------------
-- sales_order_details.stock_batch_id
--
-- Which batch this line was drawn from, so a return can go back into
-- the same one instead of corrupting FEFO (G5).
--
-- NULLABLE for two reasons, both permanent:
--   1. rows written before this migration have no record of it
--   2. StockDeductionService allocates FEFO across batch_locations, so a
--      single line CAN span several batches. This column stores the
--      first batch allocated. A line that spanned batches therefore
--      restocks entirely into that first batch — see
--      ExchangeOrderService.addStockBack.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_order_details'
      AND COLUMN_NAME = 'stock_batch_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE sales_order_details ADD COLUMN stock_batch_id INT NULL AFTER product_unit_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_order_details'
      AND CONSTRAINT_NAME = 'FK_sod_stock_batch'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE sales_order_details
        ADD CONSTRAINT FK_sod_stock_batch
        FOREIGN KEY (stock_batch_id) REFERENCES stock_batches(id)
        ON DELETE SET NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- products.is_returnable
--
-- Defaults to 1: every product stays returnable unless the shop marks
-- it otherwise. Opting products OUT is a deliberate act (opened food,
-- promotional gifts) — defaulting to 0 would silently block returns of
-- the entire catalogue on the day this ships.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'is_returnable'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE products ADD COLUMN is_returnable BIT(1) NOT NULL DEFAULT b''1''',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
