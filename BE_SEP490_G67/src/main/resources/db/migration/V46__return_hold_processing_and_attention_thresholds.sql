-- ============================================================
-- V44: Xử lý hàng trong kho đổi trả (RT) + ngưỡng cảnh báo thẻ "Kho hàng".
--
-- 1. return_order_details.processed_at / processed_by
--    Hàng trả không bán lại được (DAMAGED / EXPIRED / OPENED) nay đi thẳng vào
--    khu RT (xem V41) thay vì WRITE_OFF. Hai cột này đánh dấu admin đã xử lý
--    (trả NCC hoặc tiêu huỷ) — NULL nghĩa là còn nằm chờ trong kho đổi trả.
--
-- 2. store_config.*_threshold
--    Mức độ nghiêm trọng trên thẻ "Kho hàng" leo thang theo sản lượng bán và
--    theo số ngày hàng nằm chờ. Để ở store_config nên admin đổi được mà không
--    cần deploy lại.
-- ============================================================

-- 1. Trạng thái xử lý của dòng hàng trả -----------------------------------

SET @has_processed_at := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'processed_at'
);
SET @sql := IF(@has_processed_at = 0,
    'ALTER TABLE return_order_details ADD COLUMN processed_at DATETIME(6) NULL',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_processed_by := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'processed_by'
);
SET @sql := IF(@has_processed_by = 0,
    'ALTER TABLE return_order_details ADD COLUMN processed_by INT NULL',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Dòng cũ: hàng hỏng/hết hạn trước V44 đã bị WRITE_OFF, không có hàng thật nằm
-- trong khu RT. Đánh dấu đã xử lý để thẻ dashboard không đếm lại quá khứ.
UPDATE return_order_details
SET processed_at = COALESCE(updated_at, created_at, NOW(6))
WHERE processed_at IS NULL;

-- 2. Ngưỡng leo thang mức độ nghiêm trọng ---------------------------------

SET @has_units := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'high_volume_sold_units'
);
SET @sql := IF(@has_units = 0,
    'ALTER TABLE store_config ADD COLUMN high_volume_sold_units INT NOT NULL DEFAULT 30',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_window := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'high_volume_window_days'
);
SET @sql := IF(@has_window = 0,
    'ALTER TABLE store_config ADD COLUMN high_volume_window_days INT NOT NULL DEFAULT 30',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_orange := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'return_hold_orange_days'
);
SET @sql := IF(@has_orange = 0,
    'ALTER TABLE store_config ADD COLUMN return_hold_orange_days INT NOT NULL DEFAULT 7',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_red := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'return_hold_red_days'
);
SET @sql := IF(@has_red = 0,
    'ALTER TABLE store_config ADD COLUMN return_hold_red_days INT NOT NULL DEFAULT 14',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
