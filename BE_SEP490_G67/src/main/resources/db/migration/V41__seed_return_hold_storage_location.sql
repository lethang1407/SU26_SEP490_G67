-- ============================================================
-- V41: Seed khu + vị trí chứa hàng đổi trả từ bán hàng (RETURN_HOLD).
-- Một chỗ dùng chung, không chia tầng/ô trên UI.
-- ============================================================

INSERT INTO storage_zones (code, title, zone_type, sort_order, is_removed, created_at, updated_at)
SELECT 'RT', 'Hàng đổi trả', 'RETURN_HOLD', 999, 0, NOW(6), NOW(6)
WHERE NOT EXISTS (
    SELECT 1 FROM storage_zones
    WHERE UPPER(code) = 'RT' AND (is_removed = 0 OR is_removed IS NULL)
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
    '0',
    '0',
    'RT-HOLD',
    'Vị trí chứa hàng đổi trả từ bán hàng',
    'LG',
    0,
    1,
    0,
    NOW(6),
    NOW(6)
FROM storage_zones z
WHERE UPPER(z.code) = 'RT'
  AND (z.is_removed = 0 OR z.is_removed IS NULL)
  AND NOT EXISTS (
      SELECT 1 FROM storage_locations sl
      WHERE UPPER(sl.label) = 'RT-HOLD'
        AND (sl.is_removed = 0 OR sl.is_removed IS NULL)
  );
