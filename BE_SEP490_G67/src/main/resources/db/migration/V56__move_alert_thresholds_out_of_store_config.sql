-- ============================================================
-- V56: Tách ngưỡng dashboard và hạn đổi trả ra khỏi store_config.
--
-- store_config là hồ sơ cửa hàng: tên, địa chỉ, mã số thuế, tài khoản ngân hàng.
-- Bảy cột dưới đây chuyển sang bảng riêng alert_threshold_config:
--
--   high_volume_sold_units, high_volume_window_days   thẻ "Kho hàng" + widget nhập hàng
--   return_hold_orange_days, return_hold_red_days     màu hàng chờ ở khu đổi trả
--   slow_moving_sold_units                            tách "cần xem xét" / "bán chậm"
--   restock_advice_preview_limit                      số dòng widget nhập hàng
--   return_window_days                                hạn đổi trả (chính sách, không phải ngưỡng)
--
-- Đồng thời đổi hạn đổi trả của cửa hàng từ 4 ngày sang 7 ngày (đảo lại V30).
--
-- Chưa có màn hình sửa các giá trị này (đã chốt 11/09/2026). Muốn đổi thì
-- UPDATE thẳng alert_threshold_config.
--
-- Thứ tự: tạo bảng → chép giá trị đang dùng → xoá cột cũ. Mỗi bước tự kiểm tra
-- trạng thái nên chạy lại trên CSDL đã chuyển một phần vẫn an toàn — kể cả CSDL đã
-- chạy bản V56 trước đó (bản chỉ chuyển 6 ngưỡng, chưa có return_window_days).
-- ============================================================

-- 1. Bảng mới --------------------------------------------------------------

SET @has_table := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'alert_threshold_config'
);
SET @sql := IF(@has_table = 0, '
CREATE TABLE alert_threshold_config (
    id                           INT AUTO_INCREMENT PRIMARY KEY,
    high_volume_sold_units       INT NOT NULL DEFAULT 30,
    high_volume_window_days      INT NOT NULL DEFAULT 30,
    return_hold_orange_days      INT NOT NULL DEFAULT 7,
    return_hold_red_days         INT NOT NULL DEFAULT 14,
    slow_moving_sold_units       INT NOT NULL DEFAULT 5,
    restock_advice_preview_limit INT NOT NULL DEFAULT 5,
    return_window_days           INT NULL DEFAULT 7,
    is_removed                   TINYINT(1) DEFAULT 0,
    created_at                   DATETIME(6) NULL,
    updated_at                   DATETIME(6) NULL,
    created_by                   INT NULL,
    updated_by                   INT NULL
)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- CSDL đã chạy bản V56 cũ có bảng nhưng thiếu cột này.
-- NULL có nghĩa riêng (không đặt hạn đổi trả) nên cột KHÔNG được NOT NULL.
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alert_threshold_config'
      AND COLUMN_NAME = 'return_window_days');
SET @sql := IF(@has_col = 0,
    'ALTER TABLE alert_threshold_config ADD COLUMN return_window_days INT NULL DEFAULT 7',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Chép 6 ngưỡng đang dùng -----------------------------------------------
-- Chỉ chép khi bảng mới còn rỗng VÀ store_config còn đủ 6 cột cũ. Không chép
-- thì những ngưỡng ai đó đã sửa tay trong DB sẽ lặng lẽ quay về mặc định.

SET @old_columns := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME IN ('high_volume_sold_units', 'high_volume_window_days',
                          'return_hold_orange_days', 'return_hold_red_days',
                          'slow_moving_sold_units', 'restock_advice_preview_limit')
);
SET @new_rows := (SELECT COUNT(*) FROM alert_threshold_config);
SET @sql := IF(@old_columns = 6 AND @new_rows = 0, '
INSERT INTO alert_threshold_config
    (high_volume_sold_units, high_volume_window_days,
     return_hold_orange_days, return_hold_red_days,
     slow_moving_sold_units, restock_advice_preview_limit,
     is_removed, created_at, updated_at)
SELECT high_volume_sold_units, high_volume_window_days,
       return_hold_orange_days, return_hold_red_days,
       slow_moving_sold_units, restock_advice_preview_limit,
       0, NOW(6), NOW(6)
FROM store_config
ORDER BY id
LIMIT 1', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- store_config chưa có dòng nào (CSDL mới tinh) thì vẫn tạo một dòng mặc định,
-- để bảng luôn có đúng một dòng như store_config.
INSERT INTO alert_threshold_config (is_removed, created_at, updated_at)
SELECT 0, NOW(6), NOW(6)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM alert_threshold_config);

-- 3. Chép hạn đổi trả ------------------------------------------------------
-- Chép cả NULL (= không đặt hạn). store_config không có dòng nào thì giữ mặc định 7
-- thay vì ghi NULL — nếu không, một CSDL rỗng sẽ thành "đổi trả vô thời hạn".

SET @old_window := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'return_window_days');
SET @sql := IF(@old_window > 0, '
UPDATE alert_threshold_config
SET return_window_days = (SELECT sc.return_window_days FROM store_config sc ORDER BY sc.id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM store_config)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Đổi hạn đổi trả 4 -> 7 ngày (quyết định 11/09/2026) -----------------------
-- Đảo lại V30 (7 -> 4). Có điều kiện, giống V30: CSDL nào đang đặt giá trị khác 4
-- (kể cả NULL) là đã chọn có chủ ý, không ghi đè.
-- Chỉ chạy khi store_config còn cột cũ, tức đây là lần chuyển dữ liệu đầu tiên:
-- chạy lại sau này không được đè lên một giá trị 4 mà người dùng tự đặt về sau.

SET @sql := IF(@old_window > 0,
    'UPDATE alert_threshold_config SET return_window_days = 7 WHERE return_window_days = 4',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Xoá cột cũ khỏi store_config ------------------------------------------
-- Giữ lại hai bản thì sớm muộn lệch nhau. Sau bước này dữ liệu chỉ còn ở bảng mới.

SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'high_volume_sold_units');
SET @sql := IF(@has_col > 0, 'ALTER TABLE store_config DROP COLUMN high_volume_sold_units', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'high_volume_window_days');
SET @sql := IF(@has_col > 0, 'ALTER TABLE store_config DROP COLUMN high_volume_window_days', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'return_hold_orange_days');
SET @sql := IF(@has_col > 0, 'ALTER TABLE store_config DROP COLUMN return_hold_orange_days', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'return_hold_red_days');
SET @sql := IF(@has_col > 0, 'ALTER TABLE store_config DROP COLUMN return_hold_red_days', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'slow_moving_sold_units');
SET @sql := IF(@has_col > 0, 'ALTER TABLE store_config DROP COLUMN slow_moving_sold_units', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'restock_advice_preview_limit');
SET @sql := IF(@has_col > 0, 'ALTER TABLE store_config DROP COLUMN restock_advice_preview_limit', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@old_window > 0, 'ALTER TABLE store_config DROP COLUMN return_window_days', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
