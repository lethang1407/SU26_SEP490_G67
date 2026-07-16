-- Thêm trạng thái phiếu nhập: DRAFT (phiếu tạm) | IMPORTED (đã nhập hàng)
ALTER TABLE import_orders
    ADD COLUMN order_status VARCHAR(20) NULL;
