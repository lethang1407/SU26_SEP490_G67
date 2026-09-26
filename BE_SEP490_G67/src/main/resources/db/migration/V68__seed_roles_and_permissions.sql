-- ============================================================
-- V67: Seed core roles, permissions, and role_permissions for production
-- ============================================================

-- 1. ROLES
INSERT INTO `roles` (`id`, `name`, `description`, `is_removed`, `created_at`, `updated_at`)
VALUES
(1, 'MANAGER', 'Quản lý / Chủ cửa hàng - toàn quyền', b'0', NOW(), NOW()),
(2, 'STAFF',   'Nhân viên',                         b'0', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`);

-- 2. PERMISSIONS
INSERT INTO `permissions` (`id`, `module`, `code`, `name`, `is_removed`, `created_at`, `updated_at`)
VALUES
(1,  'STAFF',        'STAFF:VIEW',                'Xem danh sách & chi tiết nhân viên', b'0', NOW(), NOW()),
(2,  'STAFF',        'STAFF:CREATE',              'Thêm mới nhân viên',                 b'0', NOW(), NOW()),
(3,  'STAFF',        'STAFF:UPDATE',              'Cập nhật thông tin nhân viên',       b'0', NOW(), NOW()),
(4,  'STORE',        'STORE:VIEW',                'Xem thông tin cửa hàng',            b'0', NOW(), NOW()),
(5,  'STORE',        'STORE:UPDATE',              'Cập nhật thông tin cửa hàng',       b'0', NOW(), NOW()),
(6,  'PRODUCT',      'PRODUCT:VIEW',              'Xem sản phẩm & danh mục',           b'0', NOW(), NOW()),
(7,  'PRODUCT',      'PRODUCT:CREATE',            'Tạo sản phẩm & danh mục mới',       b'0', NOW(), NOW()),
(8,  'PRODUCT',      'PRODUCT:UPDATE',            'Cập nhật sản phẩm & danh mục',      b'0', NOW(), NOW()),
(9,  'PRODUCT',      'PRODUCT:DELETE',            'Xóa sản phẩm & ảnh',               b'0', NOW(), NOW()),
(10, 'WAREHOUSE',    'WAREHOUSE:VIEW',            'Xem sơ đồ & vị trí kho',            b'0', NOW(), NOW()),
(11, 'WAREHOUSE',    'WAREHOUSE:LOCATION_MANAGE', 'Quản lý vùng & vị trí kho',          b'0', NOW(), NOW()),
(12, 'WAREHOUSE',    'WAREHOUSE:CHECK_VIEW',      'Xem danh sách phiếu kiểm kho',      b'0', NOW(), NOW()),
(13, 'WAREHOUSE',    'WAREHOUSE:CHECK_CREATE',    'Tạo & chốt phiếu kiểm kho',        b'0', NOW(), NOW()),
(14, 'IMPORT',       'IMPORT:VIEW',               'Xem danh sách phiếu nhập hàng',     b'0', NOW(), NOW()),
(15, 'IMPORT',       'IMPORT:CREATE',             'Tạo phiếu nhập hàng',               b'0', NOW(), NOW()),
(16, 'IMPORT',       'IMPORT:UPDATE',             'Cập nhật phiếu nhập hàng',          b'0', NOW(), NOW()),
(17, 'IMPORT',       'IMPORT:CANCEL',             'Hủy phiếu nhập nháp',               b'0', NOW(), NOW()),
(18, 'SUPPLIER',     'SUPPLIER:VIEW',             'Xem thông tin nhà cung cấp',        b'0', NOW(), NOW()),
(19, 'SUPPLIER',     'SUPPLIER:CREATE',           'Thêm mới nhà cung cấp',             b'0', NOW(), NOW()),
(20, 'SUPPLIER',     'SUPPLIER:UPDATE',           'Cập nhật nhà cung cấp',             b'0', NOW(), NOW()),
(21, 'SUPPLIER',     'SUPPLIER:DELETE',           'Xóa nhà cung cấp',                 b'0', NOW(), NOW()),
(22, 'SUPPLIER',     'SUPPLIER:PAYMENT',          'Thanh toán nợ nhà cung cấp',        b'0', NOW(), NOW()),
(23, 'POS',          'POS:SALE',                  'Bán hàng POS & Tạo đơn bán',        b'0', NOW(), NOW()),
(24, 'POS',          'POS:EXCHANGE',              'Xử lý đổi trả hàng tại POS',        b'0', NOW(), NOW()),
(25, 'SALES_ORDER',  'SALES_ORDER:VIEW_ALL',      'Xem tất cả đơn bán hàng',          b'0', NOW(), NOW()),
(26, 'SALES_ORDER',  'SALES_ORDER:VIEW_OWN',      'Xem đơn bán hàng cá nhân',          b'0', NOW(), NOW()),
(27, 'SALES_ORDER',  'SALES_ORDER:INVOICE',       'Xem & in hóa đơn bán hàng',         b'0', NOW(), NOW()),
(28, 'CUSTOMER',     'CUSTOMER:VIEW',             'Xem danh sách khách hàng',          b'0', NOW(), NOW()),
(29, 'CUSTOMER',     'CUSTOMER:DEBT_VIEW',        'Xem công nợ khách hàng',            b'0', NOW(), NOW()),
(30, 'CUSTOMER',     'CUSTOMER:DEBT_MANAGE',      'Quản lý thu nợ khách hàng',         b'0', NOW(), NOW()),
(31, 'AUDIT',        'AUDIT:VIEW',                'Báo cáo doanh thu & đối soát ca',   b'0', NOW(), NOW()),
(32, 'AUDIT',        'AUDIT:RESOLVE',             'Xử lý & chốt đối soát ca',         b'0', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    `module` = VALUES(`module`),
    `code`   = VALUES(`code`),
    `name`   = VALUES(`name`);

-- 3. ROLE_PERMISSIONS
INSERT IGNORE INTO `role_permissions` (`permission_id`, `role_id`) VALUES
(1,1),(2,1),(3,1),(4,1),(5,1),(6,1),(7,1),(8,1),(9,1),(10,1),(11,1),(12,1),(13,1),(14,1),(15,1),(16,1),
(17,1),(18,1),(19,1),(20,1),(21,1),(22,1),(23,1),(24,1),(25,1),(26,1),(27,1),(28,1),(29,1),(30,1),(31,1),(32,1),
(6,2),(23,2),(24,2),(26,2),(27,2),(28,2);

-- 4. USERS_ROLES (Đảm bảo tài khoản quản trị id=1 có role MANAGER)
INSERT IGNORE INTO `users_roles` (`roles_id`, `users_id`)
SELECT 1, u.id FROM `users` u WHERE u.id = 1;

