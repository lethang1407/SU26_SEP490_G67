-- Đánh dấu dòng hàng khuyến mại / trả thưởng (không thu tiền, vẫn nhập kho)
ALTER TABLE import_order_details
    ADD COLUMN is_promotion TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '1 = hàng KM/trả thưởng, không tính vào tổng thanh toán';
