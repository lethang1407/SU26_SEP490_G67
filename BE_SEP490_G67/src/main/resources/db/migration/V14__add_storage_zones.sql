-- ============================================================
-- V14: Bảng cấu hình khu (bán hàng / kho).
-- Seed từ cột zone string nếu còn; nếu schema đã dùng zone_id thì bỏ qua seed.
-- ============================================================

CREATE TABLE IF NOT EXISTS storage_zones (
    id INT NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(200) NULL,
    zone_type VARCHAR(20) NOT NULL DEFAULT 'WAREHOUSE',
    sort_order INT NOT NULL DEFAULT 0,
    is_removed TINYINT(1) NULL DEFAULT 0,
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by INT NULL,
    updated_by INT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_storage_zones_code (code)
);

-- Seed từ cột zone string (chỉ khi cột còn tồn tại)
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
       AND (sl.is_removed = 0 OR sl.is_removed IS NULL)
       AND NOT EXISTS (
           SELECT 1 FROM storage_zones sz
           WHERE sz.code = UPPER(TRIM(sl.zone))
       )',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Đảm bảo có ít nhất 1 khu (schema đã migrate / không còn cột zone)
INSERT INTO storage_zones (code, title, zone_type, sort_order, is_removed, created_at, updated_at)
SELECT 'A', 'Khu A', 'WAREHOUSE', 0, 0, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM storage_zones LIMIT 1);
