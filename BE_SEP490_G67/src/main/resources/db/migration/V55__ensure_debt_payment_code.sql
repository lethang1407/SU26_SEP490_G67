-- Ensure customer debt payments have a stable payment code.
-- Some local databases already picked this up from an older out-of-order
-- branch migration, so guard both the column and index creation.

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'debt_payments'
    AND COLUMN_NAME = 'payment_code'
);
SET @sql := IF(@column_exists = 0,
  'ALTER TABLE `debt_payments` ADD COLUMN `payment_code` VARCHAR(30) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'debt_payments'
    AND INDEX_NAME = 'uk_debt_payments_payment_code'
);
SET @sql := IF(@index_exists = 0,
  'CREATE UNIQUE INDEX `uk_debt_payments_payment_code` ON `debt_payments` (`payment_code`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
