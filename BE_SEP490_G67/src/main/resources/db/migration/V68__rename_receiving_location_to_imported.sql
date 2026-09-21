-- Đổi label hệ thống NHAP-MOI → IMPORTED; title khu NH → Khu nhập hàng.

UPDATE storage_zones
SET title = 'Khu nhập hàng',
    updated_at = NOW(6)
WHERE UPPER(code) = 'NH'
  AND (is_removed = 0 OR is_removed IS NULL);

UPDATE storage_locations
SET label = 'IMPORTED',
    updated_at = NOW(6)
WHERE UPPER(label) = 'NHAP-MOI'
  AND (is_removed = 0 OR is_removed IS NULL);
