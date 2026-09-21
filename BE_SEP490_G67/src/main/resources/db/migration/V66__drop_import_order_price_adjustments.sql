-- ============================================================
-- V66: Bỏ bảng lưu tạm giá bán trên phiếu nhập.
--      Giá bán mới chỉ ghi vào product_units khi Hoàn thành.
-- ============================================================

DROP TABLE IF EXISTS import_order_price_adjustments;
