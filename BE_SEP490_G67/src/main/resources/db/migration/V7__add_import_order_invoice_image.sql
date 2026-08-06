-- URL ảnh hóa đơn / phiếu giao hàng (Cloudinary). Tùy chọn.
ALTER TABLE import_orders
    ADD COLUMN invoice_image VARCHAR(500) NULL;
