-- Bỏ tích hợp PayOS, chuyển sang ảnh VietQR quicklink.
--
-- Hệ thống không còn đứng giữa cuộc chuyển tiền nữa: ảnh QR do img.vietqr.io dựng
-- từ thông tin tài khoản của cửa hàng, khách quét và chuyển thẳng cho ngân hàng.
-- Thu ngân nhìn app ngân hàng thấy tiền về rồi mới bấm "Thanh toán". Vì vậy không
-- còn phiên thanh toán nào để lưu, cũng không còn webhook nào gọi về.

-- Thông tin thụ hưởng in lên ảnh VietQR. Để trống thì POS báo "chưa cấu hình"
-- thay vì dựng ra một mã QR trỏ vào tài khoản rỗng.
ALTER TABLE `store_config`
  -- Mã BIN ngân hàng theo chuẩn NAPAS, ví dụ 970422 = MB Bank.
  ADD COLUMN `bank_id`           VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN `bank_account_no`   VARCHAR(50)  DEFAULT NULL,
  -- Tên chủ tài khoản, hiện trên ảnh QR để khách đối chiếu trước khi chuyển.
  ADD COLUMN `bank_account_name` VARCHAR(100) DEFAULT NULL;

DROP TABLE IF EXISTS `payos_checkout_sessions`;

-- `payment_reference` ở lại: nay giữ nội dung chuyển khoản in trên mã QR, là thứ
-- duy nhất nối hóa đơn với dòng sao kê ngân hàng khi cuối ca cần đối soát.
ALTER TABLE `sales_orders` DROP COLUMN `payos_order_code`;
