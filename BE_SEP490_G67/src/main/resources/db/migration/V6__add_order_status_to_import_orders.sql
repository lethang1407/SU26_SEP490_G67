-- Thêm trạng thái phiếu nhập (DRAFT | IMPORTED)
ALTER TABLE import_orders
    ADD COLUMN order_status VARCHAR(20) NULL;

-- Dữ liệu cũ coi như đã nhập hàng
UPDATE import_orders
SET order_status = 'IMPORTED'
WHERE order_status IS NULL;
