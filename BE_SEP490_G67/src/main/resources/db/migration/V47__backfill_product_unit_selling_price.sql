-- ============================================================
-- V43 — Điền giá bán cho từng đơn vị tính.
--
-- Từ nay POS và SalesOrderService lấy giá từ product_units.selling_price chứ không
-- suy từ products.selling_price nữa, để cửa hàng đặt được giá lốc/thùng rẻ hơn mua
-- lẻ. Nhưng dữ liệu hiện tại đang NULL toàn bộ, nên không điền trước thì mọi lần
-- bán đều bị chặn vì "Sản phẩm chưa được đặt giá bán".
--
-- Giá suy ra = products.selling_price × product_units.unit_base, tức là đúng bằng
-- giá mua lẻ nhân số lượng — giữ nguyên doanh thu như trước, không tự ý giảm giá
-- thay cửa hàng. Muốn bán sỉ rẻ hơn thì sửa lại từng đơn vị ở màn quản lý sản phẩm.
--
-- Chỉ đụng vào dòng đang NULL hoặc <= 0: giá đã đặt tay thì giữ nguyên.
-- ============================================================

UPDATE product_units pu
JOIN products p ON p.id = pu.product_id
SET pu.selling_price = ROUND(
        COALESCE(p.selling_price, 0) * COALESCE(NULLIF(pu.unit_base, 0), 1), 2)
WHERE (pu.selling_price IS NULL OR pu.selling_price <= 0)
  AND COALESCE(p.selling_price, 0) > 0;
