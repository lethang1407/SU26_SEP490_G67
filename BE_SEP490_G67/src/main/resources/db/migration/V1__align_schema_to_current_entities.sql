-- ============================================================
-- V1: Align DB schema with current JPA entities
--
-- Baseline dump: Database/dbDev_v1.0.sql (older than current code).
-- This single migration applies ALL schema deltas needed to run the
-- app: product import/SOQ fields, product CRUD, import_orders.status,
-- sales-order unit snapshot + paid_amount/due_date, stock_movements
-- batch_location_id, and optional drop of import_orders debt cache.
--
-- Every change is guarded via information_schema so databases that
-- already picked columns up (ddl-auto / partial scripts) do not fail.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Product import / SOQ support
-- ------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'status');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''active''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'season_tag');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN season_tag VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'cover_days_override');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN cover_days_override INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'cover_days');
SET @sql := IF(@exist = 0, 'ALTER TABLE categories ADD COLUMN cover_days INT NOT NULL DEFAULT 7', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'default_supplier_id');
SET @sql := IF(@exist = 0, 'ALTER TABLE categories ADD COLUMN default_supplier_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND CONSTRAINT_NAME = 'FK_categories_default_supplier');
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE categories ADD CONSTRAINT FK_categories_default_supplier FOREIGN KEY (default_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_config' AND COLUMN_NAME = 'default_cover_days');
SET @sql := IF(@exist = 0, 'ALTER TABLE store_config ADD COLUMN default_cover_days INT NOT NULL DEFAULT 7', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'suppliers' AND COLUMN_NAME = 'lead_time_days');
SET @sql := IF(@exist = 0, 'ALTER TABLE suppliers ADD COLUMN lead_time_days INT NOT NULL DEFAULT 3', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2) Product CRUD / images
-- ------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'sku');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN sku VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'uk_products_sku');
SET @sql := IF(@exist = 0, 'CREATE UNIQUE INDEX uk_products_sku ON products (sku)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'brand');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN brand VARCHAR(100) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'vat_percent');
SET @sql := IF(@exist = 0, 'ALTER TABLE products ADD COLUMN vat_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_units' AND COLUMN_NAME = 'selling_price');
SET @sql := IF(@exist = 0, 'ALTER TABLE product_units ADD COLUMN selling_price DECIMAL(15,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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

-- ------------------------------------------------------------
-- 3) Import orders status (DRAFT | IMPORTED)
-- ------------------------------------------------------------

SET @col_status := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_orders' AND COLUMN_NAME = 'status');
SET @col_order_status := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_orders' AND COLUMN_NAME = 'order_status');

SET @sql := IF(@col_status > 0 AND @col_order_status > 0,
  'ALTER TABLE import_orders DROP COLUMN order_status',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_status := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_orders' AND COLUMN_NAME = 'status');
SET @col_order_status := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_orders' AND COLUMN_NAME = 'order_status');
SET @sql := IF(@col_status = 0 AND @col_order_status > 0,
  'ALTER TABLE import_orders CHANGE COLUMN order_status status VARCHAR(30) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_status := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_orders' AND COLUMN_NAME = 'status');
SET @sql := IF(@col_status = 0,
  'ALTER TABLE import_orders ADD COLUMN status VARCHAR(30) NULL DEFAULT ''DRAFT''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE import_orders
SET status = 'DRAFT'
WHERE status IS NULL OR status = '' OR status = 'PENDING_CHECK';

ALTER TABLE import_orders
  MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'DRAFT';

-- Drop legacy debt cache columns if present (debt is derived in service)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_orders' AND COLUMN_NAME = 'payment_status');
SET @sql := IF(@exist > 0, 'ALTER TABLE import_orders DROP COLUMN payment_status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_orders' AND COLUMN_NAME = 'remaining_debt');
SET @sql := IF(@exist > 0, 'ALTER TABLE import_orders DROP COLUMN remaining_debt', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4) Sales order details — unit snapshot (POS)
-- ------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_order_details' AND COLUMN_NAME = 'product_unit_id');
SET @sql := IF(@exist = 0, 'ALTER TABLE sales_order_details ADD COLUMN product_unit_id INT NULL AFTER product_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_order_details' AND COLUMN_NAME = 'unit_name');
SET @sql := IF(@exist = 0, 'ALTER TABLE sales_order_details ADD COLUMN unit_name VARCHAR(50) NULL AFTER quantity', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_order_details' AND CONSTRAINT_NAME = 'FK_sod_product_unit');
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE sales_order_details ADD CONSTRAINT FK_sod_product_unit FOREIGN KEY (product_unit_id) REFERENCES product_units(id) ON DELETE SET NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 5) Sales orders — paid_amount / due_date
-- ------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_orders' AND COLUMN_NAME = 'paid_amount');
SET @sql := IF(@exist = 0, 'ALTER TABLE sales_orders ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0.00 AFTER total_amount', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_orders' AND COLUMN_NAME = 'due_date');
SET @sql := IF(@exist = 0, 'ALTER TABLE sales_orders ADD COLUMN due_date DATETIME(6) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 6) Stock movements — batch_location_id (FEFO audit)
-- ------------------------------------------------------------

SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'batch_location_id');
SET @sql := IF(@exist = 0, 'ALTER TABLE stock_movements ADD COLUMN batch_location_id INT NULL AFTER stock_batch_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND CONSTRAINT_NAME = 'FK_sm_batch_location');
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE stock_movements ADD CONSTRAINT FK_sm_batch_location FOREIGN KEY (batch_location_id) REFERENCES batch_locations(id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
