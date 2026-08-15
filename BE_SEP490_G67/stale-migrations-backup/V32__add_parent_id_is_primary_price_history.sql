-- ------------------------------------------------------------
-- V32: Add parent_id to products, is_primary to attributes, and create price_history table
-- ------------------------------------------------------------

-- 1) parent_id in products
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'parent_id');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN parent_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND CONSTRAINT_NAME = 'fk_products_parent');
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE products ADD CONSTRAINT fk_products_parent FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) is_primary in attributes
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attributes' AND COLUMN_NAME = 'is_primary');
SET @sql := IF(@exist = 0, 'ALTER TABLE attributes ADD COLUMN is_primary BIT(1) NOT NULL DEFAULT b''0''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  supplier_id INT NULL,
  is_removed BIT(1) DEFAULT b'0',
  created_at DATETIME(6) NULL,
  updated_at DATETIME(6) NULL,
  created_by INT NULL,
  updated_by INT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_price_history_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_price_history_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
