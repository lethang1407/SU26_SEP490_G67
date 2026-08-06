-- ============================================================
-- V15: Liên kết chặt storage_locations.zone_id → storage_zones.id
-- Guarded: Hibernate ddl-auto có thể đã thêm zone_id / thử tạo FK.
-- ============================================================

-- 0) Bỏ FK tạm (Hibernate hoặc lần chạy trước) trên zone_id nếu có
SET @fk_zone := (
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'storage_locations'
      AND COLUMN_NAME = 'zone_id'
      AND REFERENCED_TABLE_NAME = 'storage_zones'
    LIMIT 1
);
SET @sql := IF(@fk_zone IS NOT NULL,
    CONCAT('ALTER TABLE storage_locations DROP FOREIGN KEY `', @fk_zone, '`'),
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1) Thêm cột zone_id nếu chưa có
SET @col_zone_id := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'storage_locations'
      AND COLUMN_NAME = 'zone_id'
);
SET @sql := IF(@col_zone_id = 0,
    'ALTER TABLE storage_locations ADD COLUMN zone_id INT NULL AFTER id',
    'ALTER TABLE storage_locations MODIFY COLUMN zone_id INT NULL');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Seed khu từ cột zone string (nếu còn)
SET @col_zone := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'storage_locations'
      AND COLUMN_NAME = 'zone'
);
SET @sql := IF(@col_zone > 0,
    'INSERT INTO storage_zones (code, title, zone_type, sort_order, is_removed, created_at, updated_at)
     SELECT DISTINCT
         UPPER(TRIM(sl.zone)) AS code,
         CONCAT(''Khu '', UPPER(TRIM(sl.zone))) AS title,
         ''WAREHOUSE'' AS zone_type,
         0 AS sort_order,
         0 AS is_removed,
         NOW(6) AS created_at,
         NOW(6) AS updated_at
     FROM storage_locations sl
     WHERE sl.zone IS NOT NULL
       AND TRIM(sl.zone) <> ''''
       AND NOT EXISTS (
           SELECT 1 FROM storage_zones sz
           WHERE UPPER(TRIM(sz.code)) = UPPER(TRIM(sl.zone))
       )',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Đảm bảo có ít nhất 1 khu để gán orphan
INSERT INTO storage_zones (code, title, zone_type, sort_order, is_removed, created_at, updated_at)
SELECT 'A', 'Khu A', 'WAREHOUSE', 0, 0, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM storage_zones LIMIT 1);

-- 3) Xóa zone_id orphan (0 / không tồn tại trong storage_zones)
UPDATE storage_locations sl
LEFT JOIN storage_zones sz ON sz.id = sl.zone_id
SET sl.zone_id = NULL
WHERE sl.zone_id IS NOT NULL
  AND sz.id IS NULL;

-- 4) Backfill từ cột zone string nếu còn
SET @sql := IF(@col_zone > 0,
    'UPDATE storage_locations sl
     INNER JOIN storage_zones sz
         ON UPPER(TRIM(sz.code)) = UPPER(TRIM(sl.zone))
     SET sl.zone_id = sz.id
     WHERE sl.zone_id IS NULL
       AND sl.zone IS NOT NULL
       AND TRIM(sl.zone) <> ''''',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) Mọi dòng còn NULL → gán khu đầu tiên
UPDATE storage_locations sl
CROSS JOIN (SELECT id FROM storage_zones ORDER BY id ASC LIMIT 1) z
SET sl.zone_id = z.id
WHERE sl.zone_id IS NULL;

-- 6) NOT NULL + FK ổn định + index
ALTER TABLE storage_locations
    MODIFY COLUMN zone_id INT NOT NULL;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'storage_locations'
      AND CONSTRAINT_NAME = 'fk_storage_locations_zone'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE storage_locations
        ADD CONSTRAINT fk_storage_locations_zone
        FOREIGN KEY (zone_id) REFERENCES storage_zones (id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'storage_locations'
      AND INDEX_NAME = 'idx_storage_locations_zone_id'
);
SET @sql := IF(@idx_exists = 0,
    'CREATE INDEX idx_storage_locations_zone_id ON storage_locations (zone_id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7) Bỏ cột zone string nếu còn
SET @sql := IF(@col_zone > 0,
    'ALTER TABLE storage_locations DROP COLUMN zone',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
