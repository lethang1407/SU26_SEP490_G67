-- 1. Create inventory_checks and inventory_check_details if not exists
CREATE TABLE IF NOT EXISTS inventory_checks (
    id INT NOT NULL AUTO_INCREMENT,
    check_code VARCHAR(40) NOT NULL,
    check_date DATETIME(6) NULL,
    status VARCHAR(30) NOT NULL,
    warehouse VARCHAR(100) NULL,
    note VARCHAR(1000) NULL,
    is_removed BIT(1) DEFAULT b'0',
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by INT NULL,
    updated_by INT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS inventory_check_details (
    id INT NOT NULL AUTO_INCREMENT,
    inventory_check_id INT NOT NULL,
    product_id INT NOT NULL,
    stock_batch_id INT NULL,
    system_qty INT NOT NULL,
    actual_qty INT NULL,
    note VARCHAR(500) NULL,
    is_removed BIT(1) DEFAULT b'0',
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by INT NULL,
    updated_by INT NULL,
    PRIMARY KEY (id),
    CONSTRAINT FK_icd_check FOREIGN KEY (inventory_check_id) REFERENCES inventory_checks(id) ON DELETE CASCADE,
    CONSTRAINT FK_icd_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Ensure supplier_id column exists in import_returns table
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_returns' AND COLUMN_NAME = 'supplier_id');
SET @sql := IF(@exist = 0, 'ALTER TABLE import_returns ADD COLUMN supplier_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Ensure source column exists in import_returns table
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_returns' AND COLUMN_NAME = 'source');
SET @sql := IF(@exist = 0, 'ALTER TABLE import_returns ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT ''MANUAL''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Ensure inventory_check_id column exists in import_returns table
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'import_returns' AND COLUMN_NAME = 'inventory_check_id');
SET @sql := IF(@exist = 0, 'ALTER TABLE import_returns ADD COLUMN inventory_check_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Make import_order_id nullable on import_returns
ALTER TABLE import_returns MODIFY COLUMN import_order_id INT NULL;
