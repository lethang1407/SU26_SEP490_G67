-- ============================================================
-- V5: Add the sales_orders columns the SalesOrder entity maps but
--     Database/dbDev_v1.0.sql (dumped 2026-06-23) does not contain.
--
--     paid_amount  set by SalesOrderService.createOrder: full total for
--                  a cash order, 0 for a debt order.
--     due_date     payment deadline for debt orders.
--
--     Both appear in the current EER, so the dump is simply older than
--     the design. A database seeded from that dump cannot save a sales
--     order at all - it fails on paid_amount before stock deduction is
--     ever reached.
--
--     Guarded the same way as V4: developer databases that already have
--     these columns (from an earlier ddl-auto run) must not fail.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'paid_amount'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE sales_orders ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0.00 AFTER total_amount',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'due_date'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE sales_orders ADD COLUMN due_date DATETIME(6) NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
