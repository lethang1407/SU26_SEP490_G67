-- Gộp khu bán vào khu kho: mọi zone assignable dùng WAREHOUSE
UPDATE storage_zones
SET zone_type = 'WAREHOUSE'
WHERE zone_type = 'SALES'
  AND (is_removed = 0 OR is_removed IS NULL);
