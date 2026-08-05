-- ============================================================
-- V10: Indexes for the return lookup (redesign v3 §7a).
--
--     "Product + time range is the workhorse combination and must be
--      fast" (§7a). The whole §8 not-found path is the SAME query, and
--      §8 sets a hard target: under 10 seconds from scan to a
--      defensible "no". A sequential scan over sales_order_details is
--      what makes that target unreachable as the shop accumulates
--      history.
--
--     Guarded with information_schema checks, same as V4-V9.
-- ============================================================

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_order_details'
      AND INDEX_NAME = 'IX_sod_product'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX IX_sod_product ON sales_order_details (product_id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND INDEX_NAME = 'IX_so_created_at'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX IX_so_created_at ON sales_orders (created_at)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
