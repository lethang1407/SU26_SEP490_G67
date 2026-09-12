-- ============================================================
-- V59: giảm giá lúc quyết toán hàng bán thử (cấp lần quyết toán).
-- Guarded: Hibernate ddl-auto có thể đã thêm cột.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_trial_settlements'
      AND COLUMN_NAME = 'discount_amount'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_trial_settlements ADD COLUMN discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER payable_amount',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
