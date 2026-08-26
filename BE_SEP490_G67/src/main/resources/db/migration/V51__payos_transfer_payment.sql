-- Thanh toán chuyển khoản qua PayOS trên POS.
--
-- Đơn bán CHỈ được ghi sổ sau khi tiền đã về: phiên thanh toán dưới đây giữ chỗ
-- cho khoảng thời gian giữa lúc thu ngân bấm "Chuyển khoản" và lúc khách quét QR
-- xong. Không có phiên nào thì không có đơn nào, nên không bao giờ có đơn đã trừ
-- kho mà chưa thu được tiền.
CREATE TABLE IF NOT EXISTS `payos_checkout_sessions` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  -- Mã đơn phía PayOS: số, duy nhất trên toàn tài khoản merchant.
  `payos_order_code`  BIGINT       NOT NULL,
  `payment_link_id`   VARCHAR(64)  DEFAULT NULL,
  `amount`            DECIMAL(15,2) NOT NULL,
  `status`            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
  `checkout_url`      VARCHAR(512) DEFAULT NULL,
  -- Tạo chuỗi VietQR thô, FE chuyển thành ảnh QR.
  `qr_code`           TEXT,
  `bin`               VARCHAR(20)  DEFAULT NULL,
  `account_number`    VARCHAR(50)  DEFAULT NULL,
  `account_name`      VARCHAR(255) DEFAULT NULL,
  `description`       VARCHAR(255) DEFAULT NULL,
  -- Tạo mã giao dịch ngân hàng, dùng để đối soát cuối ca.
  `payment_reference` VARCHAR(100) DEFAULT NULL,
  `expired_at`        DATETIME(6)  DEFAULT NULL,
  `paid_at`           DATETIME(6)  DEFAULT NULL,
  -- Lần cuối hỏi PayOS về phiên này.
  --
  -- POS hỏi lại trạng thái mỗi vài giây cho tới khi khách trả tiền xong. Nếu mỗi
  -- lần hỏi đều gọi thẳng sang PayOS thì vài quầy mở khung QR cùng lúc là đủ ăn
  -- HTTP 429 "Too Many Requests" của họ. Cột này cho phép trả lại trạng thái đã
  -- lưu khi lần đồng bộ trước còn quá mới, nên số lần gọi ra ngoài không tăng
  -- theo số lần POS hỏi.
  `last_synced_at`    DATETIME(6)  DEFAULT NULL,
  -- Đơn bán sinh ra từ phiên này. NULL = đã trả tiền nhưng chưa ghi sổ xong.
  `sales_order_id`    INT          DEFAULT NULL,
  `is_removed`        BIT(1)       DEFAULT b'0',
  `created_at`        DATETIME(6)  DEFAULT NULL,
  `updated_at`        DATETIME(6)  DEFAULT NULL,
  `created_by`        INT          DEFAULT NULL,
  `updated_by`        INT          DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payos_checkout_order_code` (`payos_order_code`),
  KEY `idx_payos_checkout_status` (`status`),
  KEY `idx_payos_checkout_sales_order` (`sales_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Gắn đơn bán với giao dịch PayOS đã thanh toán cho nó.
ALTER TABLE `sales_orders`
  ADD COLUMN `payos_order_code` BIGINT DEFAULT NULL,
  ADD COLUMN `payment_reference` VARCHAR(100) DEFAULT NULL;

CREATE INDEX `idx_sales_orders_payos_order_code` ON `sales_orders` (`payos_order_code`);
