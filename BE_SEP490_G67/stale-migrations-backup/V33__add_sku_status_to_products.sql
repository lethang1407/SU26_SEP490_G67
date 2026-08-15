-- ============================================================
-- V33 — products.sku và products.status
--
-- Hai cột này đã có trong entity Product từ đợt làm hàng theo nhóm/biến thể
-- (`sku`, `status` NOT NULL) nhưng chưa migration nào tạo ra chúng: trên máy
-- đã từng bật ddl-auto=update thì Hibernate lặng lẽ thêm hộ, còn DB dựng sạch
-- từ dump thì không có, và V34 (seed hàng theo nhóm) chết ngay ở INSERT vì
-- Unknown column.
--
-- Đặt trước V34 để file seed có chỗ mà ghi vào.
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'sku'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE products ADD COLUMN sku VARCHAR(50) NULL AFTER barcode',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- UNIQUE chứ không NOT NULL: hàng cũ chưa có SKU, và MySQL không so sánh các
-- giá trị NULL trong unique index nên chúng không va nhau.
SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND INDEX_NAME = 'UK_products_sku'
);
SET @sql := IF(@idx_exists = 0,
    'ALTER TABLE products ADD CONSTRAINT UK_products_sku UNIQUE (sku)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- status NOT NULL DEFAULT 'active': entity đặt mặc định "active" ngay ở field,
-- nên hàng cũ được backfill đúng giá trị đó chứ không để rỗng.
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'status'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE products ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''active''',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
