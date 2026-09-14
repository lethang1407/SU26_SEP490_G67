-- Bỏ tích hợp PayOS, chuyển sang ảnh VietQR quicklink.
--
-- Hệ thống không còn đứng giữa cuộc chuyển tiền nữa: ảnh QR do img.vietqr.io dựng
-- từ thông tin tài khoản của cửa hàng, khách quét và chuyển thẳng cho ngân hàng.
-- Thu ngân nhìn app ngân hàng thấy tiền về rồi mới bấm "Thanh toán". Vì vậy không
-- còn phiên thanh toán nào để lưu, cũng không còn webhook nào gọi về.

-- Thông tin thụ hưởng in lên ảnh VietQR. Để trống thì POS báo "chưa cấu hình"
-- thay vì dựng ra một mã QR trỏ vào tài khoản rỗng.
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'bank_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE `store_config` ADD COLUMN `bank_id` VARCHAR(20) DEFAULT NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'bank_account_no'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE `store_config` ADD COLUMN `bank_account_no` VARCHAR(50) DEFAULT NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_config'
      AND COLUMN_NAME = 'bank_account_name'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE `store_config` ADD COLUMN `bank_account_name` VARCHAR(100) DEFAULT NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TABLE IF EXISTS `payos_checkout_sessions`;

-- `payment_reference` ở lại: nay giữ nội dung chuyển khoản in trên mã QR, là thứ
-- duy nhất nối hóa đơn với dòng sao kê ngân hàng khi cuối ca cần đối soát.
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'payos_order_code'
);
SET @sql := IF(@col_exists = 0,
    'DO 0',
    'ALTER TABLE `sales_orders` DROP COLUMN `payos_order_code`');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
