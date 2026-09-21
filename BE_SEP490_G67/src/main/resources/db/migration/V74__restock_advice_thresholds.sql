-- ============================================================
-- V53: Ngưỡng phân loại cho widget "Sản phẩm cần quyết định nhập hàng".
--
-- Widget xếp sản phẩm tồn thấp/hết hàng thành ba mức dựa trên sản lượng bán gần
-- đây, chứ không coi tồn <= min_stock là mặc định phải nhập:
--
--   PRIORITY_RESTOCK  bán >= high_volume_sold_units          -> ưu tiên nhập
--   REVIEW            bán >= slow_moving_sold_units          -> cần xem xét
--   SLOW_MOVING       bán <  slow_moving_sold_units          -> bán chậm
--
-- high_volume_sold_units / high_volume_window_days đã có từ V46 (thẻ "Kho hàng"
-- dùng chung), ở đây chỉ bổ sung ngưỡng sàn để tách REVIEW khỏi SLOW_MOVING.
-- Đơn vị của ngưỡng là ĐƠN VỊ CƠ SỞ của sản phẩm (lon, gói...), không phải đơn
-- vị bán — backend quy đổi trước khi so sánh.
-- ============================================================

SET @has_slow_moving := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'slow_moving_sold_units'
);
SET @sql := IF(@has_slow_moving = 0,
    'ALTER TABLE store_config ADD COLUMN slow_moving_sold_units INT NOT NULL DEFAULT 5',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Số dòng widget hiển thị trên dashboard. Phần còn lại xem ở trang danh sách SP.
SET @has_preview := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'restock_advice_preview_limit'
);
SET @sql := IF(@has_preview = 0,
    'ALTER TABLE store_config ADD COLUMN restock_advice_preview_limit INT NOT NULL DEFAULT 5',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
