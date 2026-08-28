-- ============================================================
-- V54: Chủ cửa hàng "bỏ qua" một sản phẩm trong widget gợi ý nhập hàng.
--
-- Bỏ qua chỉ có hiệu lực TRONG NGÀY: mỗi lượt bỏ qua ghi kèm ngày (giờ VN), hôm
-- sau widget đánh giá lại từ đầu — nếu sản phẩm vẫn tồn thấp và vẫn thoả điều
-- kiện thì nó xuất hiện trở lại. Vì vậy bảng này lưu theo cặp (sản phẩm, ngày)
-- chứ không phải một cờ "đã ẩn" vĩnh viễn.
--
-- created_by/created_at của BaseEntity chính là "ai đã xem và bỏ qua, lúc nào".
-- ============================================================

SET @has_table := (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'restock_advice_dismissal'
);
SET @sql := IF(@has_table = 0, '
CREATE TABLE restock_advice_dismissal (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    product_id   INT  NOT NULL,
    dismissed_on DATE NOT NULL,
    is_removed   TINYINT(1) DEFAULT 0,
    created_at   DATETIME(6) NULL,
    updated_at   DATETIME(6) NULL,
    created_by   INT NULL,
    updated_by   INT NULL,
    CONSTRAINT uq_restock_dismissal_product_day UNIQUE (product_id, dismissed_on),
    CONSTRAINT fk_restock_dismissal_product
        FOREIGN KEY (product_id) REFERENCES products (id)
)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
