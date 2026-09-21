-- Vị trí hệ thống: hàng mới nhập chờ xếp (WAREHOUSE → vẫn bán được trên POS).
-- Label kỹ thuật = IMPORTED; UI hiển thị "Khu nhập hàng".

INSERT INTO storage_zones (code, title, zone_type, sort_order, is_removed, created_at, updated_at)
SELECT 'NH', 'Khu nhập hàng', 'WAREHOUSE', 0, 0, NOW(6), NOW(6)
WHERE NOT EXISTS (
    SELECT 1 FROM storage_zones
    WHERE UPPER(code) = 'NH' AND (is_removed = 0 OR is_removed IS NULL)
);

INSERT INTO storage_locations (
    zone_id,
    aisle,
    shelf,
    bin,
    label,
    description,
    size,
    is_full,
    is_active,
    is_removed,
    created_at,
    updated_at
)
SELECT
    z.id,
    NULL,
    NULL,
    NULL,
    'IMPORTED',
    'Hàng vừa nhập — chờ xếp sang vị trí bán',
    'LG',
    0,
    1,
    0,
    NOW(6),
    NOW(6)
FROM storage_zones z
WHERE UPPER(z.code) = 'NH'
  AND (z.is_removed = 0 OR z.is_removed IS NULL)
  AND NOT EXISTS (
      SELECT 1 FROM storage_locations sl
      WHERE UPPER(sl.label) IN ('IMPORTED', 'NHAP-MOI')
        AND (sl.is_removed = 0 OR sl.is_removed IS NULL)
  );
