-- ============================================================
-- V2: Add unit snapshot columns to sales_order_details
--     UC-40/41: cashier selects unit at POS -> backend resolves
--               name and stores it as an immutable snapshot.
--     product_unit_id  kept for traceability (FK, nullable)
--     unit_name        denormalized copy - MUST NOT be updated
--                      after the order is created.
-- Guarded: Hibernate ddl-auto có thể đã thêm cột / FK.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_order_details'
      AND COLUMN_NAME = 'product_unit_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE sales_order_details ADD COLUMN product_unit_id INT NULL AFTER product_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_order_details'
      AND COLUMN_NAME = 'unit_name'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE sales_order_details ADD COLUMN unit_name VARCHAR(50) NULL AFTER quantity',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_order_details'
      AND CONSTRAINT_NAME = 'FK_sod_product_unit'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE sales_order_details
        ADD CONSTRAINT FK_sod_product_unit
        FOREIGN KEY (product_unit_id)
        REFERENCES product_units(id)
        ON DELETE SET NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
