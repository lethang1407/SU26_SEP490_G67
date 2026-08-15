-- Migration V33: Xóa bảng daily_reconciliations (đổi sang tính toán DTO động từ các đơn hàng)
DROP TABLE IF EXISTS daily_reconciliations;
