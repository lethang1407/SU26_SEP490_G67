-- ============================================================
-- V14: Bảng cấu hình khu (bán hàng / kho).
-- Seed từ zone đang có trên storage_locations.
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

INSERT INTO storage_zones (code, title, zone_type, sort_order, is_removed, created_at, updated_at)
SELECT DISTINCT
    UPPER(TRIM(sl.zone)) AS code,
    CONCAT('Khu ', UPPER(TRIM(sl.zone))) AS title,
    'WAREHOUSE' AS zone_type,
    0 AS sort_order,
    0 AS is_removed,
    NOW(6) AS created_at,
    NOW(6) AS updated_at
FROM storage_locations sl
WHERE sl.zone IS NOT NULL
  AND TRIM(sl.zone) <> ''
  AND (sl.is_removed = 0 OR sl.is_removed IS NULL)
  AND NOT EXISTS (
      SELECT 1 FROM storage_zones sz
      WHERE sz.code = UPPER(TRIM(sl.zone))
  );
