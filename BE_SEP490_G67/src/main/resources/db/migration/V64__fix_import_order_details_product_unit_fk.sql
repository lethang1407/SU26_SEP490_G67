-- ============================================================
-- V64: Fix import_order_details product_unit FK and add unit_name snapshot
--      1. Change FK constraint on product_unit_id to ON DELETE SET NULL
--      2. Add unit_name snapshot column to prevent history loss
--      3. Backfill unit_name from existing product_units
-- ============================================================

-- Step 1: Add unit_name snapshot column if not exists
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_order_details'
      AND COLUMN_NAME = 'unit_name'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_order_details ADD COLUMN unit_name VARCHAR(50) NULL AFTER product_unit_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Backfill unit_name from product_units
UPDATE import_order_details iod
JOIN product_units pu ON iod.product_unit_id = pu.id
SET iod.unit_name = pu.name
WHERE iod.unit_name IS NULL AND iod.product_unit_id IS NOT NULL;

-- Step 3: Drop any existing FK constraints on import_order_details(product_unit_id)
SET @fk_name := (
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_order_details'
      AND COLUMN_NAME = 'product_unit_id'
      AND REFERENCED_TABLE_NAME = 'product_units'
    LIMIT 1
);

SET @drop_sql := IF(@fk_name IS NOT NULL,
    CONCAT('ALTER TABLE import_order_details DROP FOREIGN KEY `', @fk_name, '`'),
    'DO 0');
PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Re-add FK constraint with ON DELETE SET NULL
SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_order_details'
      AND CONSTRAINT_NAME = 'FK_iod_product_unit'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE import_order_details
        ADD CONSTRAINT FK_iod_product_unit
        FOREIGN KEY (product_unit_id)
        REFERENCES product_units(id)
        ON DELETE SET NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
