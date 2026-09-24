-- ============================================================
-- SEED DATA CHUẨN ĐỂ TEST THỬ MODULE THUẾ VÀ KẾ TOÁN (TAX & ACCOUNTING)
-- Hộ kinh doanh: Cửa hàng Tạp hóa Đức Thắng
-- Năm thuế: 2026
-- Mốc bắt đầu theo dõi: 2026-01-01 00:00:00 (Asia/Ho_Chi_Minh)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. STORE CONFIG (Đảm bảo Store 1 tồn tại và đầy đủ thông tin pháp lý)
INSERT INTO `store_config` (`id`, `store_name`, `owner_full_name`, `address`, `currency`, `tax_rate`, `tax_code`, `is_removed`, `created_at`, `updated_at`)
VALUES (1, 'Cửa hàng Tạp hóa Đức Thắng', 'Lê Thắng', '123 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM', 'VND', 1.50, '0123456789', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE `store_name` = VALUES(`store_name`), `tax_code` = VALUES(`tax_code`);

-- 2. CUSTOMERS (Khách hàng mẫu để tạo đơn bán hàng)
INSERT INTO `customers` (`id`, `store_id`, `name`, `phone_number`, `debt_amount`, `is_check_unstable_debt`, `is_removed`, `created_at`, `updated_at`)
VALUES 
(101, 1, 'Nguyễn Thị Mai', '0901234567', 0.00, 0, 0, '2026-01-01 08:00:00', '2026-01-01 08:00:00'),
(102, 1, 'Trần Văn Hùng', '0912345678', 0.00, 0, 0, '2026-01-01 08:00:00', '2026-01-01 08:00:00'),
(103, 1, 'Phạm Thị Lan', '0923456789', 0.00, 0, 0, '2026-01-01 08:00:00', '2026-01-01 08:00:00')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. SALES ORDERS (Đơn bán hàng hoàn tất các tháng 1, 2, 3 năm 2026)
INSERT INTO `sales_orders` (`id`, `order_code`, `customer_id`, `subtotal`, `discount_amount`, `total_amount`, `paid_amount`, `payment_method`, `order_status`, `is_debt`, `is_removed`, `created_at`, `updated_at`, `created_by`)
VALUES
-- Tháng 1/2026: 3 đơn bán hàng (Tổng: 250k + 450k + 600k = 1.300.000đ)
(101, 'HD-20260105-001', 101, 250000.00, 0.00, 250000.00, 250000.00, 'CASH', 'COMPLETED', 0, 0, '2026-01-05 09:30:00.000000', '2026-01-05 09:30:00.000000', 1),
(102, 'HD-20260112-002', 102, 480000.00, 30000.00, 450000.00, 450000.00, 'BANK_TRANSFER', 'COMPLETED', 0, 0, '2026-01-12 14:15:00.000000', '2026-01-12 14:15:00.000000', 1),
(103, 'HD-20260120-003', 103, 600000.00, 0.00, 600000.00, 600000.00, 'CASH', 'COMPLETED', 0, 0, '2026-01-20 18:00:00.000000', '2026-01-20 18:00:00.000000', 1),

-- Tháng 2/2026: 2 đơn bán hàng (Tổng: 800k + 1.200k = 2.000.000đ)
(201, 'HD-20260208-001', 101, 850000.00, 50000.00, 800000.00, 800000.00, 'CASH', 'COMPLETED', 0, 0, '2026-02-08 10:00:00.000000', '2026-02-08 10:00:00.000000', 1),
(202, 'HD-20260215-002', 102, 1200000.00, 0.00, 1200000.00, 1200000.00, 'BANK_TRANSFER', 'COMPLETED', 0, 0, '2026-02-15 15:30:00.000000', '2026-02-15 15:30:00.000000', 1),

-- Tháng 3/2026: 2 đơn bán hàng (Tổng: 500k + 750k = 1.250.000đ) - Kỳ OPEN sẵn sàng test đồng bộ
(301, 'HD-20260305-001', 101, 500000.00, 0.00, 500000.00, 500000.00, 'CASH', 'COMPLETED', 0, 0, '2026-03-05 09:00:00.000000', '2026-03-05 09:00:00.000000', 1),
(302, 'HD-20260310-002', 103, 750000.00, 0.00, 750000.00, 750000.00, 'BANK_TRANSFER', 'COMPLETED', 0, 0, '2026-03-10 14:00:00.000000', '2026-03-10 14:00:00.000000', 1)
ON DUPLICATE KEY UPDATE `total_amount` = VALUES(`total_amount`), `order_status` = VALUES(`order_status`);

-- 4. RETURN ORDERS (Phiếu trả hàng giảm trừ doanh thu)
INSERT INTO `return_orders` (`id`, `return_code`, `sales_order_id`, `customer_id`, `refund_amount`, `return_reason`, `status`, `is_removed`, `created_at`, `updated_at`, `created_by`)
VALUES
-- Trả hàng Tháng 1 cho đơn HD-20260120-003 (giảm 100k -> Doanh thu ròng T1 = 1.300k - 100k = 1.200.000đ)
(101, 'TH-20260122-001', 103, 103, 100000.00, 'Khách trả lại 2 thùng nước ngọt', 'COMPLETED', 0, '2026-01-22 10:00:00.000000', '2026-01-22 10:00:00.000000', 1),
-- Trả hàng Tháng 2 cho đơn HD-20260208-001 (giảm 150k -> Doanh thu ròng T2 = 2.000k - 150k + 50k = 1.900.000đ)
(201, 'TH-20260218-001', 101, 101, 150000.00, 'Khách đổi trả bánh kẹo cận date', 'COMPLETED', 0, '2026-02-18 11:20:00.000000', '2026-02-18 11:20:00.000000', 1),
-- Trả hàng Tháng 3 cho đơn HD-20260305-001 (giảm 80k -> Doanh thu ròng T3 = 1.250k - 80k = 1.170.000đ)
(301, 'TH-20260312-001', 101, 101, 80000.00, 'Khách trả bớt hàng mua dư', 'COMPLETED', 0, '2026-03-12 16:30:00.000000', '2026-03-12 16:30:00.000000', 1)
ON DUPLICATE KEY UPDATE `refund_amount` = VALUES(`refund_amount`), `status` = VALUES(`status`);

-- 5. BUSINESS TAX PROFILE (Hồ sơ thuế năm 2026 đã xác nhận CONFIRMED)
DELETE FROM `accounting_revenue_lines` WHERE `period_id` IN (SELECT `id` FROM `accounting_periods` WHERE `profile_id` IN (SELECT `id` FROM `business_tax_profiles` WHERE `store_id` = 1 AND `tax_year` = 2026));
DELETE FROM `revenue_adjustments` WHERE `profile_id` IN (SELECT `id` FROM `business_tax_profiles` WHERE `store_id` = 1 AND `tax_year` = 2026);
DELETE FROM `accounting_periods` WHERE `profile_id` IN (SELECT `id` FROM `business_tax_profiles` WHERE `store_id` = 1 AND `tax_year` = 2026);
DELETE FROM `business_tax_profiles` WHERE `store_id` = 1 AND `tax_year` = 2026;

INSERT INTO `business_tax_profiles` 
(`id`, `store_id`, `tax_year`, `tracking_started_at`, `declared_method`, `taxpayer_identity`, `taxpayer_name`, `taxpayer_address`, `tax_authority`, `invoice_registration_status`, `status`, `confirmed_by`, `confirmed_at`, `version`, `is_removed`, `created_at`, `updated_at`, `created_by`, `updated_by`)
VALUES
(1, 1, 2026, '2026-01-01 00:00:00.000000', 'REVENUE_BASED', '0123456789', 'Hộ kinh doanh Tạp hóa Đức Thắng', '123 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'Chi cục Thuế Quận 1', 'NOT_REGISTERED', 'CONFIRMED', 1, '2026-01-01 08:00:00.000000', 1, 0, '2026-01-01 08:00:00.000000', '2026-01-01 08:00:00.000000', 1, 1);

-- 6. ACCOUNTING PERIODS (3 kỳ kế toán: Tháng 1 & 2 đã CLOSED, Tháng 3 OPEN)
INSERT INTO `accounting_periods`
(`id`, `profile_id`, `accounting_month`, `start_at`, `end_exclusive`, `status`, `version`, `closed_by`, `closed_at`, `is_removed`, `created_at`, `updated_at`, `created_by`, `updated_by`)
VALUES
-- Kỳ Tháng 1: Đã khóa sổ (CLOSED)
(1, 1, 1, '2026-01-01 00:00:00.000000', '2026-02-01 00:00:00.000000', 'CLOSED', 1, 1, '2026-02-05 08:30:00.000000', 0, '2026-01-01 08:00:00.000000', '2026-02-05 08:30:00.000000', 1, 1),
-- Kỳ Tháng 2: Đã khóa sổ (CLOSED)
(2, 1, 2, '2026-02-01 00:00:00.000000', '2026-03-01 00:00:00.000000', 'CLOSED', 1, 1, '2026-03-05 08:30:00.000000', 0, '2026-02-01 08:00:00.000000', '2026-03-05 08:30:00.000000', 1, 1),
-- Kỳ Tháng 3: Đang mở (OPEN) để test trực tiếp các thao tác nghiệp vụ
(3, 1, 3, '2026-03-01 00:00:00.000000', '2026-04-01 00:00:00.000000', 'OPEN', 0, NULL, NULL, 0, '2026-03-01 08:00:00.000000', '2026-03-01 08:00:00.000000', 1, 1);

-- 7. REVENUE ADJUSTMENTS (Các khoản điều chỉnh doanh thu mẫu)
INSERT INTO `revenue_adjustments`
(`id`, `profile_id`, `related_period_id`, `source_type`, `source_id`, `occurred_at`, `posting_date`, `signed_amount`, `classification`, `inclusion_reason`, `evidence`, `status`, `approved_by`, `approved_at`, `idempotency_key`, `version`, `is_removed`, `created_at`, `updated_at`, `created_by`, `updated_by`)
VALUES
-- Khoản 1: Đã APPROVED hạch toán vào Tháng 2 (+50k thu thanh lý bao bì carton)
(1, 1, NULL, 'REVENUE_ADJUSTMENT', NULL, '2026-02-25 14:00:00.000000', '2026-02-25', 50000.00, 'OTHER_REVENUE', 'Thu tiền thanh lý vỏ thùng carton và bao bì', 'Phiếu thu tiền mặt số PT-20260225-01', 'APPROVED', 1, '2026-02-25 15:00:00.000000', 'ADJ-2026-0001', 1, 0, '2026-02-25 14:00:00.000000', '2026-02-25 15:00:00.000000', 1, 1),
-- Khoản 2: Bản DRAFT ở Tháng 3 (-30k điều chỉnh sai lệch đơn 301) - sẵn sàng test API Approve/Reject
(2, 1, 3, 'SALES_ORDER', 301, '2026-03-15 10:00:00.000000', '2026-03-15', -30000.00, 'CORRECTION', 'Điều chỉnh giảm giá bù tiền cho khách do sản phẩm móp méo', 'Biên bản thỏa thuận giảm giá đơn hàng HD-20260305-001', 'DRAFT', NULL, NULL, 'ADJ-2026-0002', 0, 0, '2026-03-15 10:00:00.000000', '2026-03-15 10:00:00.000000', 1, 1),
-- Khoản 3: Bản REJECTED ở Tháng 3 (Bị từ chối do thiếu chứng từ)
(3, 1, NULL, 'REVENUE_ADJUSTMENT', NULL, '2026-03-16 11:00:00.000000', '2026-03-16', 20000.00, 'OTHER_REVENUE', 'Khoản thu phụ phí ship', 'Không có hóa đơn chứng từ kèm theo', 'REJECTED', NULL, NULL, 'ADJ-2026-0003', 0, 0, '2026-03-16 11:00:00.000000', '2026-03-16 11:30:00.000000', 1, 1);

SET FOREIGN_KEY_CHECKS = 1;
