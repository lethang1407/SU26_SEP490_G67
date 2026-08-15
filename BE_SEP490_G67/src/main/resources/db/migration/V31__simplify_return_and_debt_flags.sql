-- ============================================================
-- V26 — Gọn lại schema đổi/trả và cờ nợ cần rà soát
--
-- Bốn thay đổi, tất cả đều là bỏ bớt hoặc dời chỗ chứ không thêm khái niệm mới:
--
--   1. return_order_details.paired_out_detail_id — bỏ. Việc ghép cặp "dòng nào
--      thay cho dòng nào" chưa bao giờ được đọc ra ở đâu; luật nghiệp vụ của nó
--      (EXCHANGE_* phải có cặp, đổi ngang phải khớp tiền) vẫn được kiểm ở tầng
--      service theo ref trong request, chỉ là không lưu lại nữa.
--   2. return_orders.bearer_* + approved_by — bỏ. Không còn lối phê duyệt vượt
--      rào nào trong hệ thống, nên phần danh tính người mang hàng không còn
--      quyết định điều gì. (original_document_code của §11.2 vốn chưa từng được
--      thêm; vẫn drop có bảo vệ để mọi DB về cùng một hình dạng.)
--   3. is_check_unstable_debt — dời từ sales_orders sang customers. Cờ này nói
--      về KHÁCH ("khách này mới nợ lần đầu, do nhân viên lập, cần rà soát"),
--      không phải về một hoá đơn; để trên đơn thì mỗi đơn mới lại phải suy lại.
--   4. sales_orders.exchange_sales_order_id → original_sales_order_id. Đảo
--      chiều con trỏ: đơn đổi trỏ ngược về đơn gốc, thay vì đơn gốc trỏ tới đơn
--      đổi. Chiều mới cho phép một đơn gốc sinh nhiều đơn đổi qua nhiều lần trả,
--      chiều cũ chỉ giữ được lần cuối. Dữ liệu cũ được lật lại, không rename
--      suông — rename sẽ để lại id sai ý nghĩa.
-- ============================================================

-- ------------------------------------------------------------
-- 1. return_order_details.paired_out_detail_id
--    Thứ tự bắt buộc: FK → unique index → cột.
-- ------------------------------------------------------------

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND CONSTRAINT_NAME = 'FK_rod_paired_out_detail'
);
SET @sql := IF(@fk_exists > 0,
    'ALTER TABLE return_order_details DROP FOREIGN KEY FK_rod_paired_out_detail',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND INDEX_NAME = 'UK_rod_paired_out_detail'
);
SET @sql := IF(@idx_exists > 0,
    'ALTER TABLE return_order_details DROP INDEX UK_rod_paired_out_detail',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'paired_out_detail_id'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE return_order_details DROP COLUMN paired_out_detail_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2. return_orders: bearer_name / bearer_phone / bearer_is_owner /
--    approved_by / original_document_code
--
--    Mỗi cột drop riêng một lệnh có bảo vệ: V18 thêm bốn cột trong một ALTER
--    nên chỉ cần một DB nào đó lệch một cột là cả khối gộp sẽ hỏng.
--
--    original_document_code: hệ thống tra hoá đơn gốc qua sales_order_id, mã
--    đơn đọc qua join — không giữ bản sao denormalise nữa.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'bearer_name'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE return_orders DROP COLUMN bearer_name', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'bearer_phone'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE return_orders DROP COLUMN bearer_phone', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'bearer_is_owner'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE return_orders DROP COLUMN bearer_is_owner', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'approved_by'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE return_orders DROP COLUMN approved_by', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'original_document_code'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE return_orders DROP COLUMN original_document_code', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 3. is_check_unstable_debt: sales_orders → customers
--
--    Backfill trước khi drop. Khách từng có BẤT KỲ đơn nợ nào bị gắn cờ thì
--    khách đó được gắn cờ — cờ là "khách này cần rà soát", một đơn đã đủ để
--    dựng nó lên, và không có gì trong dữ liệu cũ nói nó đã được hạ xuống.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND COLUMN_NAME = 'is_check_unstable_debt'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE customers
        ADD COLUMN is_check_unstable_debt TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_debt',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @src_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'is_check_unstable_debt'
);
SET @sql := IF(@src_exists > 0,
    'UPDATE customers c
        SET c.is_check_unstable_debt = 1
        WHERE EXISTS (
            SELECT 1 FROM sales_orders so
            WHERE so.customer_id = c.id
              AND so.is_check_unstable_debt = 1
        )',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@src_exists > 0,
    'ALTER TABLE sales_orders DROP COLUMN is_check_unstable_debt',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4. sales_orders.exchange_sales_order_id → original_sales_order_id
--
--    Cột mới là INT thuần, KHÔNG có FK. Đây là con trỏ tham chiếu để tra lại
--    nguồn gốc đơn đổi, không phải quan hệ sở hữu; ràng buộc FK tự tham chiếu
--    trên chính bảng này chỉ làm mọi thao tác xoá/seed dữ liệu thêm vướng.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'original_sales_order_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE sales_orders ADD COLUMN original_sales_order_id INT NULL AFTER order_code',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Lật chiều dữ liệu cũ: dòng nào đang trỏ tới đơn đổi thì đơn đổi ĐÓ nhận id
-- của dòng này làm đơn gốc.
SET @old_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND COLUMN_NAME = 'exchange_sales_order_id'
);
SET @sql := IF(@old_exists > 0,
    'UPDATE sales_orders ex
        JOIN sales_orders orig ON orig.exchange_sales_order_id = ex.id
        SET ex.original_sales_order_id = orig.id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND CONSTRAINT_NAME = 'FK_so_exchange_sales_order'
);
SET @sql := IF(@fk_exists > 0,
    'ALTER TABLE sales_orders DROP FOREIGN KEY FK_so_exchange_sales_order',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- MySQL tự tạo index cho cột FK; drop FK không drop index đó.
SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND INDEX_NAME = 'FK_so_exchange_sales_order'
);
SET @sql := IF(@idx_exists > 0,
    'ALTER TABLE sales_orders DROP INDEX FK_so_exchange_sales_order',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(@old_exists > 0,
    'ALTER TABLE sales_orders DROP COLUMN exchange_sales_order_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
