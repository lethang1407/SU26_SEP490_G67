-- ============================================================
-- V12: Repeated partial returns (redesign v2 §3).
--
--     Until now a return line recorded only WHICH PRODUCT came back, so
--     "how many of this line are still returnable" was unanswerable and
--     v1 sidestepped it by refusing any second return of an order.
--     sales_order_detail_id makes the cumulative ceiling computable:
--
--       returnable(line) = line.quantity
--                        - SUM(return_order_details.quantity
--                              WHERE sales_order_detail_id = line.id)
--
--     NULLABLE on purpose: rows written before this migration were keyed
--     by product only and cannot be attributed to a line retroactively.
--     Any query summing returned quantity must therefore tolerate NULL —
--     see ReturnOrderDetailRepository.sumReturnedQuantityByOrder, which
--     ignores legacy rows rather than mis-attributing them.
--
--     unit_name / product_unit_id snapshot the unit the line was sold in
--     (v2 G10), matching what V2 added to sales_order_details. Without
--     them a return of "1 thùng" is indistinguishable from "1 cái" once
--     the product's units are later edited.
--
--     Guarded with information_schema checks, same as V4/V5/V11.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'sales_order_detail_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_order_details
        ADD COLUMN sales_order_detail_id INT NULL AFTER product_id,
        ADD COLUMN product_unit_id       INT NULL AFTER sales_order_detail_id,
        ADD COLUMN unit_name             VARCHAR(50) NULL AFTER quantity',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND CONSTRAINT_NAME = 'FK_rod_sales_order_detail'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE return_order_details
        ADD CONSTRAINT FK_rod_sales_order_detail
        FOREIGN KEY (sales_order_detail_id) REFERENCES sales_order_details(id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND CONSTRAINT_NAME = 'FK_rod_product_unit'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE return_order_details
        ADD CONSTRAINT FK_rod_product_unit
        FOREIGN KEY (product_unit_id) REFERENCES product_units(id)
        ON DELETE SET NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- The ceiling query sums by sales_order_detail_id on every returned line.
SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND INDEX_NAME = 'IX_rod_sales_order_detail'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX IX_rod_sales_order_detail ON return_order_details (sales_order_detail_id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- sales_orders.exchange_sales_order_id
--
-- Points at the separate sales order an exchange issues. UNUSED until
-- Phase 4: ExchangeOrderService still appends exchange lines to the
-- ORIGINAL order (v2 G8), so there is nothing to point at yet. Added
-- here so Phase 4 is a code change rather than another migration.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'exchange_sales_order_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE sales_orders ADD COLUMN exchange_sales_order_id INT NULL AFTER order_code',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND CONSTRAINT_NAME = 'FK_so_exchange_sales_order'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE sales_orders
        ADD CONSTRAINT FK_so_exchange_sales_order
        FOREIGN KEY (exchange_sales_order_id) REFERENCES sales_orders(id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- store_config.return_window_days  (v2 G12, item 17)
--
-- POLICY NOT YET CONFIRMED. 7 is an assumption, not a decision — the
-- team still has to answer how long a return stays acceptable. It lives
-- in config precisely so the answer is an UPDATE, not a code change:
--
--     UPDATE store_config SET return_window_days = <n>;
--
-- NULL disables the check entirely (returns accepted indefinitely),
-- which is the behaviour before this migration.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'return_window_days'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE store_config ADD COLUMN return_window_days INT NULL DEFAULT 7 AFTER tax_rate',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
