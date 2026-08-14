-- ============================================================
-- V9: Kiểm kho theo sản phẩm — inventory_check_details.product_id
-- thay batch_location_id.
-- Guarded + dọn orphan product_id (Hibernate ddl-auto có thể đã
-- thêm cột với giá trị 0 / không khớp products).
-- Nếu bảng chưa có (Flyway chạy trước Hibernate), no-op — entity
-- InventoryCheckDetail đã map đúng product_id / stock_batch_id.
-- ============================================================

SET @table_exists := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
);

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND COLUMN_NAME = 'product_id'
);
SET @sql := IF(@table_exists = 0 OR @col_exists > 0,
    'DO 0',
    'ALTER TABLE inventory_check_details ADD COLUMN product_id INT NULL AFTER inventory_check_id');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cho phép NULL tạm để backfill / dọn dữ liệu (nếu Hibernate đã set NOT NULL)
SET @sql := IF(@table_exists = 0,
    'DO 0',
    (
        SELECT IF(
            COUNT(*) > 0,
            'ALTER TABLE inventory_check_details MODIFY COLUMN product_id INT NULL',
            'DO 0'
        )
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'inventory_check_details'
          AND COLUMN_NAME = 'product_id'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill từ batch_location nếu cột cũ còn
SET @col_bl := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND COLUMN_NAME = 'batch_location_id'
);
SET @sql := IF(@table_exists = 0 OR @col_bl = 0,
    'DO 0',
    'UPDATE inventory_check_details d
        INNER JOIN batch_locations bl ON d.batch_location_id = bl.id
        INNER JOIN stock_batches sb ON bl.batch_id = sb.id
        INNER JOIN products p ON sb.product_id = p.id
     SET d.product_id = sb.product_id
     WHERE d.product_id IS NULL OR d.product_id = 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Xóa mọi dòng không map được tới products (tránh lỗi FK 1452)
SET @sql := IF(@table_exists = 0,
    'DO 0',
    'DELETE d FROM inventory_check_details d
     WHERE d.product_id IS NULL
        OR d.product_id = 0
        OR NOT EXISTS (SELECT 1 FROM products p WHERE p.id = d.product_id)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@table_exists = 0,
    'DO 0',
    'ALTER TABLE inventory_check_details MODIFY COLUMN product_id INT NOT NULL');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Bỏ FK Hibernate tự tạo nếu có (tên random) rồi thêm FK ổn định
SET @fk_hib := (
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND COLUMN_NAME = 'product_id'
      AND REFERENCED_TABLE_NAME = 'products'
    LIMIT 1
);
SET @sql := IF(@table_exists = 0 OR @fk_hib IS NULL,
    'DO 0',
    CONCAT('ALTER TABLE inventory_check_details DROP FOREIGN KEY `', @fk_hib, '`'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND CONSTRAINT_NAME = 'FK_icd_product'
);
SET @sql := IF(@table_exists = 0 OR @fk_exists > 0,
    'DO 0',
    'ALTER TABLE inventory_check_details
        ADD CONSTRAINT FK_icd_product
        FOREIGN KEY (product_id) REFERENCES products(id)');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop FK + cột batch_location_id cũ
SET @fk_bl := (
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND COLUMN_NAME = 'batch_location_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);
SET @sql := IF(@table_exists = 0 OR @fk_bl IS NULL,
    'DO 0',
    CONCAT('ALTER TABLE inventory_check_details DROP FOREIGN KEY `', @fk_bl, '`'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_bl2 := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory_check_details'
      AND COLUMN_NAME = 'batch_location_id'
);
SET @sql := IF(@table_exists = 0 OR @col_bl2 = 0,
    'DO 0',
    'ALTER TABLE inventory_check_details DROP COLUMN batch_location_id');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
