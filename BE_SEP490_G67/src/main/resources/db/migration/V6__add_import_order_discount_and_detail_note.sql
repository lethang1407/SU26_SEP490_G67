-- Giảm giá cả đơn trên phiếu nhập
ALTER TABLE import_orders
    ADD COLUMN discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00;

-- Ghi chú từng dòng hàng trên phiếu nhập
ALTER TABLE import_order_details
    ADD COLUMN note VARCHAR(500) NULL;
