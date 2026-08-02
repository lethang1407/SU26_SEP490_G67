-- Product CRUD + import/sales history support fields

-- products.sku
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'sku');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN sku VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'uk_products_sku');
SET @sql := IF(@exist = 0, 'CREATE UNIQUE INDEX uk_products_sku ON products (sku)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- products.brand
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'brand');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN brand VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- products.vat_percent
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'vat_percent');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN vat_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- product_units.selling_price
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_units' AND COLUMN_NAME = 'selling_price');
SET @sql := IF(@exist = 0, 'ALTER TABLE product_units ADD COLUMN selling_price DECIMAL(15,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- import_orders.status
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_orders' AND COLUMN_NAME = 'status');
SET @sql := IF(@exist = 0, 'ALTER TABLE import_orders ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT ''PENDING_CHECK''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- product_images
CREATE TABLE IF NOT EXISTS product_images (
  id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  is_main BIT(1) NOT NULL DEFAULT b'0',
  sort_order INT NOT NULL DEFAULT 0,
  is_removed BIT(1) DEFAULT b'0',
  created_at DATETIME(6) NULL,
  updated_at DATETIME(6) NULL,
  created_by INT NULL,
  updated_by INT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
