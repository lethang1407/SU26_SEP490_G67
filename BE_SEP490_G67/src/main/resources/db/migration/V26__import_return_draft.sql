-- ============================================================
<<<<<<<< HEAD:BE_SEP490_G67/src/main/resources/db/migration/V25__import_return_draft.sql
-- V25: Phiếu trả NCC nháp (đa NCC) — status, supplier, batch lines
========
-- V26: Phiếu trả NCC nháp (đa NCC) — status, supplier, batch lines
>>>>>>>> f2bf1069beefccb6527b52f572c15f766f388576:BE_SEP490_G67/src/main/resources/db/migration/V26__import_return_draft.sql
-- Guarded: Hibernate ddl-auto có thể đã thêm cột / nới NULL.
-- ============================================================

-- import_returns.status
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_returns'
      AND COLUMN_NAME = 'status'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_returns ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''COMPLETED'' AFTER return_code',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- import_returns.supplier_id
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_returns'
      AND COLUMN_NAME = 'supplier_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_returns ADD COLUMN supplier_id INT NULL AFTER import_order_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_returns'
      AND CONSTRAINT_NAME = 'fk_import_returns_supplier'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE import_returns
        ADD CONSTRAINT fk_import_returns_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- import_returns.import_order_id → nullable
SET @nullable := (
    SELECT IS_NULLABLE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_returns'
      AND COLUMN_NAME = 'import_order_id'
);
SET @sql := IF(@nullable = 'NO',
    'ALTER TABLE import_returns MODIFY COLUMN import_order_id INT NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- import_return_details.stock_batch_id
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'stock_batch_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN stock_batch_id INT NULL AFTER product_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND CONSTRAINT_NAME = 'fk_import_return_details_batch'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE import_return_details
        ADD CONSTRAINT fk_import_return_details_batch
        FOREIGN KEY (stock_batch_id) REFERENCES stock_batches (id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- import_return_details.supplier_id
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'supplier_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN supplier_id INT NULL AFTER stock_batch_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND CONSTRAINT_NAME = 'fk_import_return_details_supplier'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE import_return_details
        ADD CONSTRAINT fk_import_return_details_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers (id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- import_return_details.import_order_id
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND COLUMN_NAME = 'import_order_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_return_details ADD COLUMN import_order_id INT NULL AFTER supplier_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND CONSTRAINT_NAME = 'fk_import_return_details_import_order'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE import_return_details
        ADD CONSTRAINT fk_import_return_details_import_order
        FOREIGN KEY (import_order_id) REFERENCES import_orders (id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_return_details'
      AND INDEX_NAME = 'idx_import_return_details_batch'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX idx_import_return_details_batch ON import_return_details (stock_batch_id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
