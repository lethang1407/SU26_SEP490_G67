-- ============================================================
-- V65: Giá bán thiết lập lúc nhập — lưu tạm trên phiếu,
--      chỉ ghi vào product_units khi phiếu chuyển IMPORTED.
-- ============================================================

CREATE TABLE IF NOT EXISTS import_order_price_adjustments (
    id INT NOT NULL AUTO_INCREMENT,
    import_order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_unit_id INT NOT NULL,
    selling_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    is_removed BIT(1) DEFAULT b'0',
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by INT NULL,
    updated_by INT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_import_price_adj_order_unit (import_order_id, product_unit_id),
    CONSTRAINT fk_import_price_adj_order FOREIGN KEY (import_order_id)
        REFERENCES import_orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_import_price_adj_product FOREIGN KEY (product_id)
        REFERENCES products (id),
    CONSTRAINT fk_import_price_adj_unit FOREIGN KEY (product_unit_id)
        REFERENCES product_units (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
