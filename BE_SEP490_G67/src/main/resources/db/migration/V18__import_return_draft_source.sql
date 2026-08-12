-- ============================================================
-- V18: Tách draft trả NCC theo source (MANUAL | INVENTORY_CHECK)
-- ============================================================

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_returns'
      AND COLUMN_NAME = 'source'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_returns ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT ''MANUAL'' AFTER status',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_returns'
      AND COLUMN_NAME = 'inventory_check_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_returns ADD COLUMN inventory_check_id INT NULL AFTER source',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_returns'
      AND CONSTRAINT_NAME = 'fk_import_returns_inventory_check'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE import_returns
        ADD CONSTRAINT fk_import_returns_inventory_check
        FOREIGN KEY (inventory_check_id) REFERENCES inventory_checks (id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_returns'
      AND INDEX_NAME = 'idx_import_returns_draft_source'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX idx_import_returns_draft_source ON import_returns (created_by, status, source)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
