-- ============================================================
--  TEST DATA SEED  –  dbdev
--  Luồng test:
--    1. Đăng nhập  (users / roles / permissions)
--    2. Xem danh sách sản phẩm  (categories / attributes / products /
--       product_units / product_attributes / stock_batches /
--       storage_locations / batch_locations / stock_movements)
--    3. Chuẩn bị đơn bán hàng  (customers / sales_orders /
--       sales_order_details / debt_payments)
--    4. Quản lý đơn – chủ cửa hàng  (return_orders /
--       return_order_details / suppliers / import_orders /
--       import_order_details / stock_adjustments / notifications /
--       notification_recipients / audit_logs)
--
--  Tài khoản test (tất cả dùng password: Test@123)
--    username: admin        / role: ADMIN
--    username: cashier01    / role: CASHIER
--    username: accountant01 / role: ACCOUNTANT
--    username: warehouse01  / role: WAREHOUSE
-- ============================================================

SET NAMES utf8mb4;
UNLOCK TABLES;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 0. STORE CONFIG
-- ============================================================
INSERT INTO `store_config`
    (`id`,`store_name`,`owner_full_name`,`address`,`currency`,
     `tax_rate`,`tax_code`,`is_removed`,`created_at`,`updated_at`)
VALUES
(1,'Cua hang Duc Thang','Le Thang','123 Le Duan, Quan 1, TP.HCM',
 'VND',1.50,'0109999999',b'0',NOW(),NOW())
ON DUPLICATE KEY UPDATE
    `store_name`     = VALUES(`store_name`),
    `owner_full_name`= VALUES(`owner_full_name`),
    `address`        = VALUES(`address`);

-- ============================================================
-- 1. ROLES  (idempotent)
-- ============================================================
INSERT IGNORE INTO `roles`
    (`id`,`name`,`description`,`is_removed`,`created_at`,`updated_at`)
VALUES
(1,'ADMIN',     'Chu cua hang - toan quyen',  b'0',NOW(),NOW()),
(2,'CASHIER',   'Thu ngan - ban hang POS',    b'0',NOW(),NOW()),
(3,'ACCOUNTANT','Ke toan',                    b'0',NOW(),NOW()),
(4,'WAREHOUSE', 'Nhan vien kho hang',         b'0',NOW(),NOW());

-- ============================================================
-- 2. PERMISSIONS  (idempotent)
-- ============================================================
INSERT IGNORE INTO `permissions`
    (`id`,`module`,`code`,`name`,`is_removed`,`created_at`,`updated_at`)
VALUES
(1,'STAFF','STAFF:VIEW',                 'Xem danh sách & chi tiết nhân viên', b'0',NOW(),NOW()),
(2,'STAFF','STAFF:CREATE',               'Thêm mới nhân viên',                 b'0',NOW(),NOW()),
(3,'STAFF','STAFF:UPDATE',               'Cập nhật thông tin nhân viên',        b'0',NOW(),NOW()),
(4,'STORE','STORE:VIEW',                 'Xem thông tin cửa hàng',            b'0',NOW(),NOW()),
(5,'STORE','STORE:UPDATE',               'Cập nhật thông tin cửa hàng',       b'0',NOW(),NOW()),
(6,'PRODUCT','PRODUCT:VIEW',             'Xem sản phẩm & danh mục',           b'0',NOW(),NOW()),
(7,'PRODUCT','PRODUCT:CREATE',           'Tạo sản phẩm & danh mục mới',       b'0',NOW(),NOW()),
(8,'PRODUCT','PRODUCT:UPDATE',           'Cập nhật sản phẩm & danh mục',      b'0',NOW(),NOW()),
(9,'PRODUCT','PRODUCT:DELETE',           'Xóa sản phẩm & ảnh',               b'0',NOW(),NOW()),
(10,'WAREHOUSE','WAREHOUSE:VIEW',        'Xem sơ đồ & vị trí kho',            b'0',NOW(),NOW()),
(11,'WAREHOUSE','WAREHOUSE:LOCATION_MANAGE','Quản lý vùng & vị trí kho',      b'0',NOW(),NOW()),
(12,'WAREHOUSE','WAREHOUSE:CHECK_VIEW',  'Xem danh sách phiếu kiểm kho',      b'0',NOW(),NOW()),
(13,'WAREHOUSE','WAREHOUSE:CHECK_CREATE','Tạo & chốt phiếu kiểm kho',        b'0',NOW(),NOW()),
(14,'IMPORT','IMPORT:VIEW',               'Xem danh sách phiếu nhập hàng',     b'0',NOW(),NOW()),
(15,'IMPORT','IMPORT:CREATE',             'Tạo phiếu nhập hàng',               b'0',NOW(),NOW()),
(16,'IMPORT','IMPORT:UPDATE',             'Cập nhật phiếu nhập hàng',          b'0',NOW(),NOW()),
(17,'IMPORT','IMPORT:CANCEL',             'Hủy phiếu nhập nháp',               b'0',NOW(),NOW()),
(18,'SUPPLIER','SUPPLIER:VIEW',           'Xem thông tin nhà cung cấp',        b'0',NOW(),NOW()),
(19,'SUPPLIER','SUPPLIER:CREATE',         'Thêm mới nhà cung cấp',             b'0',NOW(),NOW()),
(20,'SUPPLIER','SUPPLIER:UPDATE',         'Cập nhật nhà cung cấp',             b'0',NOW(),NOW()),
(21,'SUPPLIER','SUPPLIER:DELETE',         'Xóa nhà cung cấp',                 b'0',NOW(),NOW()),
(22,'SUPPLIER','SUPPLIER:PAYMENT',        'Thanh toán nợ nhà cung cấp',        b'0',NOW(),NOW()),
(23,'POS','POS:SALE',                     'Bán hàng POS & Tạo đơn bán',        b'0',NOW(),NOW()),
(24,'POS','POS:EXCHANGE',                 'Xử lý đổi trả hàng tại POS',        b'0',NOW(),NOW()),
(25,'SALES_ORDER','SALES_ORDER:VIEW_ALL', 'Xem tất cả đơn bán hàng',          b'0',NOW(),NOW()),
(26,'SALES_ORDER','SALES_ORDER:VIEW_OWN', 'Xem đơn bán hàng cá nhân',          b'0',NOW(),NOW()),
(27,'SALES_ORDER','SALES_ORDER:INVOICE',  'Xem & in hóa đơn bán hàng',         b'0',NOW(),NOW()),
(28,'CUSTOMER','CUSTOMER:VIEW',           'Xem danh sách khách hàng',          b'0',NOW(),NOW()),
(29,'CUSTOMER','CUSTOMER:DEBT_VIEW',      'Xem công nợ khách hàng',            b'0',NOW(),NOW()),
(30,'CUSTOMER','CUSTOMER:DEBT_MANAGE',    'Quản lý thu nợ khách hàng',         b'0',NOW(),NOW()),
(31,'AUDIT','AUDIT:VIEW',                 'Xem bất thường đối soát',           b'0',NOW(),NOW()),
(32,'AUDIT','AUDIT:RESOLVE',              'Xử lý bất thường đối soát',         b'0',NOW(),NOW());

-- ============================================================
-- 3. ROLE_PERMISSIONS  (idempotent)
-- ============================================================
-- Role 1 (ADMIN): All permissions 1..32
-- Role 2 (CASHIER): 6, 23, 24, 26, 27, 28
-- Role 3 (ACCOUNTANT): 6, 14, 18, 22, 25, 26, 27, 28, 29, 30, 31, 32
-- Role 4 (WAREHOUSE): 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21
INSERT IGNORE INTO `role_permissions` (`permission_id`,`role_id`) VALUES
-- ADMIN (1)
(1,1),(2,1),(3,1),(4,1),(5,1),(6,1),(7,1),(8,1),(9,1),(10,1),
(11,1),(12,1),(13,1),(14,1),(15,1),(16,1),(17,1),(18,1),(19,1),(20,1),
(21,1),(22,1),(23,1),(24,1),(25,1),(26,1),(27,1),(28,1),(29,1),(30,1),
(31,1),(32,1),
-- CASHIER (2)
(6,2),(23,2),(24,2),(26,2),(27,2),(28,2),
-- ACCOUNTANT (3)
(6,3),(14,3),(18,3),(22,3),(25,3),(26,3),(27,3),(28,3),(29,3),(30,3),(31,3),(32,3),
-- WAREHOUSE (4)
(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),(12,4),(13,4),(14,4),(15,4),(16,4),(17,4),(18,4),(19,4),(20,4),(21,4);

-- ============================================================
-- 4. USERS
    --    BCrypt hash cho "password123":
--    $2a$10$vPWDXVGwlcy9CkI4GyoG7ezYjUsZT2q6owkXtjDKgRDzPzNAdOeSq
-- ============================================================
INSERT INTO `users`
    (`id`,`username`,`password_hash`,`full_name`,`phone_number`,
     `status`,`is_removed`,`created_at`,`updated_at`)
VALUES
(1,'admin',
    '$2a$10$vPWDXVGwlcy9CkI4GyoG7ezYjUsZT2q6owkXtjDKgRDzPzNAdOeSq',
    'Le Thang','0901234573','ACTIVE',b'0',
    '2026-06-09 16:07:56','2026-08-11 08:00:00'),
(2,'cashier01',
    '$2a$10$vPWDXVGwlcy9CkI4GyoG7ezYjUsZT2q6owkXtjDKgRDzPzNAdOeSq',
    'Nguyen Thi Lan','0912345678','ACTIVE',b'0',
    '2026-07-01 08:00:00','2026-08-11 08:00:00'),
(3,'accountant01',
    '$2a$10$vPWDXVGwlcy9CkI4GyoG7ezYjUsZT2q6owkXtjDKgRDzPzNAdOeSq',
    'Tran Van Minh','0923456789','ACTIVE',b'0',
    '2026-07-01 08:00:00','2026-08-11 08:00:00'),
(4,'warehouse01',
    '$2a$10$vPWDXVGwlcy9CkI4GyoG7ezYjUsZT2q6owkXtjDKgRDzPzNAdOeSq',
    'Pham Thi Hoa','0934567890','ACTIVE',b'0',
    '2026-07-01 08:00:00','2026-08-11 08:00:00')
ON DUPLICATE KEY UPDATE
    `username`      = VALUES(`username`),
    `full_name`     = VALUES(`full_name`),
    `phone_number`  = VALUES(`phone_number`),
    `status`        = VALUES(`status`),
    `password_hash` = VALUES(`password_hash`);

-- ============================================================
-- 5. USERS_ROLES
-- ============================================================
INSERT IGNORE INTO `users_roles` (`roles_id`,`users_id`) VALUES
(1,1),(2,2),(3,3),(4,4);

-- ============================================================
-- 6. CATEGORIES
-- ============================================================
INSERT INTO `categories`
    (`id`,`name`,`description`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'Do uong',        'Nuoc giai khat, bia, ruou, nuoc suoi',b'0',NOW(),NOW(),1),
(2,'Thuc pham kho',  'Gao, mi, bun, pho an lien',          b'0',NOW(),NOW(),1),
(3,'Banh keo',       'Banh quy, keo, socola',              b'0',NOW(),NOW(),1),
(4,'Gia vi',         'Muoi, duong, nuoc mam, dau an',      b'0',NOW(),NOW(),1),
(5,'Cham soc ca nhan','Xa phong, dau goi, kem danh rang',  b'0',NOW(),NOW(),1),
(6,'Do dung gia dinh','Coc, dia, tui nilon',               b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- ============================================================
-- 7. ATTRIBUTES
-- ============================================================
INSERT INTO `attributes`
    (`id`,`name`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'Thuong hieu',b'0',NOW(),NOW(),1),
(2,'Trong luong', b'0',NOW(),NOW(),1),
(3,'Xuat xu',     b'0',NOW(),NOW(),1),
(4,'Dung tich',   b'0',NOW(),NOW(),1),
(5,'Mau sac',     b'0',NOW(),NOW(),1),
(6,'Huong vi',    b'0',NOW(),NOW(),1),
(7,'Quy cach',    b'0',NOW(),NOW(),1),
(8,'Han su dung', b'0',NOW(),NOW(),1),
(9,'Chat lieu',   b'0',NOW(),NOW(),1),
(10,'Doi tuong su dung', b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- ============================================================
-- 8. PRODUCTS  (Sản phẩm đa dạng với Sản phẩm Cha, Sản phẩm Con parent_id, nhiều Thuộc tính & nhiều Đơn vị quy đổi)
-- ============================================================
INSERT INTO `products`
    (`id`,`name`,`barcode`,`category_id`,`cost_price`,`selling_price`,
     `min_stock`,`description`,`is_removed`,`created_at`,`updated_at`,`created_by`,`parent_id`)
VALUES
-- Do uong (cat 1)
(1, 'Nuoc suoi Lavie 500ml',      '8934563118015',1,  3500.00,  5000.00,10,'Nuoc suoi tinh khiet Lavie chai 500ml',b'0',NOW(),NOW(),1,NULL),
-- Nhom Pepsi (Parent ID: 21) & Cac San pham Con (Child Variants parent_id: 21)
(21,'Nuoc ngot Pepsi','PEPSI_GRP_01',1, 0.00,   0.00,   0, 'Nhom nuoc ngot Pepsi lon & chai',b'0',NOW(),NOW(),1,NULL),
(2, 'Nuoc ngot Pepsi-Vi Chanh Muoi-330ml','8936082960024',1, 8000.00, 12000.00,10,'Nuoc ngot Pepsi lon 330ml vi chanh muoi',b'0',NOW(),NOW(),1,21),
(22,'Nuoc ngot Pepsi-Khong Calo-330ml',  '8936082960025',1, 8000.00, 12000.00,10,'Nuoc ngot Pepsi lon 330ml khong calo',b'0',NOW(),NOW(),1,21),
(3, 'Bia Tiger 330ml',            '8934673600032',1, 15000.00, 20000.00,12,'Bia Tiger lon 330ml',b'0',NOW(),NOW(),1,NULL),
(4, 'Nuoc cam ep Tropicana 1L',   '8936001310047',1, 30000.00, 42000.00, 6,'Nuoc cam ep nguyen chat Tropicana 1 lit',b'0',NOW(),NOW(),1,NULL),

-- Thuc pham kho (cat 2)
(5, 'Gao Jasmine tui 5kg',        '8934561005043',2, 75000.00,100000.00, 5,'Gao Jasmine thom, tui 5kg',b'0',NOW(),NOW(),1,NULL),
(6, 'Mi Hao Hao tom chua cay',    '8934822010062',2,  3500.00,  5000.00,30,'Goi mi an lien Hao Hao vi tom chua cay 75g',b'0',NOW(),NOW(),1,NULL),
(7, 'Pho bo A Dong 75g',          '8935086020071',2,  7000.00, 10000.00,20,'Pho bo an lien A Dong 75g',b'0',NOW(),NOW(),1,NULL),

-- Banh keo (cat 3)
(8, 'Banh Oreo hop 137g',         '7622210951199',3, 25000.00, 35000.00,10,'Banh quy Oreo kem vani hop 137g',b'0',NOW(),NOW(),1,NULL),
(9, 'Keo cao su Extra dau',       '4902888105579',3,  8000.00, 12000.00,15,'Keo cao su Extra khong duong vi dau, vi 5 vien',b'0',NOW(),NOW(),1,NULL),

-- Gia vi (cat 4)
(10,'Nuoc mam Chin-Su 500ml',     '8934563420156',4, 22000.00, 30000.00, 8,'Nuoc mam Chin-Su dac biet, chai 500ml',b'0',NOW(),NOW(),1,NULL),
(11,'Dau an Tuong An 1 lit',      '8934561300119',4, 40000.00, 55000.00, 6,'Dau an tinh luyen Tuong An, chai 1 lit',b'0',NOW(),NOW(),1,NULL),

-- Cham soc ca nhan (cat 5)
(12,'Dau goi Clear Men 320g',     '8934804036128',5, 55000.00, 75000.00, 5,'Dau goi Clear Men sach gau, chai 320g',b'0',NOW(),NOW(),1,NULL),
(13,'Kem danh rang Colgate 230g', '9780000000138',5, 28000.00, 40000.00, 8,'Kem danh rang Colgate triple action, tuyp 230g',b'0',NOW(),NOW(),1,NULL),

-- Do dung gia dinh (cat 6)
(14,'Tui nilon den cuon lon',     '8934561991401',6,  8000.00, 12000.00,20,'Tui nilon den cuon loai lon, tien dung',b'0',NOW(),NOW(),1,NULL),
(15,'Nuoc rua chen Sunlight 750ml','8934563221152',6, 18000.00, 25000.00, 8,'Nuoc rua chen Sunlight chanh, chai 750ml',b'0',NOW(),NOW(),1,NULL),

-- SP Nhóm Dép Tổ Ong (Parent ID: 16) & Các Sản phẩm Con (Child Variants parent_id: 16)
(16,'Dep to ong sieu nhe dai cua thanh','DEP_GRP_001',6,0.00,0.00,0,'Nhom dep to ong sieu nhe dai cao cap',b'0',NOW(),NOW(),1,NULL),
(17,'Dep to ong sieu nhe dai cua thanh-Size 36-Mau Vang','8935001100171',6,37000.00,40000.00,5,'Dep to ong Mau Vang Size 36',b'0',NOW(),NOW(),1,16),
(18,'Dep to ong sieu nhe dai cua thanh-Size 37-Mau Vang','8935001100188',6,37000.00,40000.00,5,'Dep to ong Mau Vang Size 37',b'0',NOW(),NOW(),1,16),
(19,'Dep to ong sieu nhe dai cua thanh-Size 36-Mau Do',  '8935001100195',6,37000.00,40000.00,5,'Dep to ong Mau Do Size 36',b'0',NOW(),NOW(),1,16),
(20,'Dep to ong sieu nhe dai cua thanh-Size 37-Mau Do',  '8935001100201',6,37000.00,40000.00,5,'Dep to ong Mau Do Size 37',b'0',NOW(),NOW(),1,16)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `selling_price`=VALUES(`selling_price`), `parent_id`=VALUES(`parent_id`);

-- ============================================================
-- 9. PRODUCT_UNITS  (Các đơn vị tính cơ bản & đơn vị quy đổi)
-- ============================================================
INSERT INTO `product_units`
    (`id`,`product_id`,`name`,`unit_base`,`selling_price`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1, 1,'Chai',  1.0000, 5000.00,b'0',NOW(),NOW(),1),
(2, 1,'Thung',24.0000,115000.00,b'0',NOW(),NOW(),1),

-- Pepsi Lon Chanh Muoi (Child SP 2)
(3, 2,'Lon',   1.0000,12000.00,b'0',NOW(),NOW(),1),
(4, 2,'Loc',   6.0000,68000.00,b'0',NOW(),NOW(),1),
(21,2,'Thung',24.0000,260000.00,b'0',NOW(),NOW(),1),
(22,2,'Khay', 48.0000,500000.00,b'0',NOW(),NOW(),1),

-- Pepsi Lon Khong Calo (Child SP 22)
(23,22,'Lon',  1.0000,12000.00,b'0',NOW(),NOW(),1),
(24,22,'Loc',  6.0000,68000.00,b'0',NOW(),NOW(),1),
(25,22,'Thung',24.0000,260000.00,b'0',NOW(),NOW(),1),

(5, 3,'Lon',   1.0000,20000.00,b'0',NOW(),NOW(),1),
(6, 3,'Thung',24.0000,460000.00,b'0',NOW(),NOW(),1),
(7, 4,'Chai',  1.0000,42000.00,b'0',NOW(),NOW(),1),
(8, 5,'Tui',   1.0000,100000.00,b'0',NOW(),NOW(),1),
(9, 5,'Bao',  10.0000,950000.00,b'0',NOW(),NOW(),1),
(10,6,'Goi',   1.0000, 5000.00,b'0',NOW(),NOW(),1),
(11,6,'Thung',30.0000,140000.00,b'0',NOW(),NOW(),1),
(12,7,'Goi',   1.0000,10000.00,b'0',NOW(),NOW(),1),
(13,8,'Hop',   1.0000,35000.00,b'0',NOW(),NOW(),1),
(14,9,'Vi',    1.0000,12000.00,b'0',NOW(),NOW(),1),
(15,10,'Chai', 1.0000,30000.00,b'0',NOW(),NOW(),1),
(16,11,'Chai', 1.0000,55000.00,b'0',NOW(),NOW(),1),
(17,12,'Chai', 1.0000,75000.00,b'0',NOW(),NOW(),1),
(18,13,'Tuyp', 1.0000,40000.00,b'0',NOW(),NOW(),1),
(19,14,'Cuon', 1.0000,12000.00,b'0',NOW(),NOW(),1),
(20,15,'Chai', 1.0000,25000.00,b'0',NOW(),NOW(),1),

-- Dep to ong Variants (Child SP 17, 18, 19, 20)
(26,17,'Doi',  1.0000,40000.00,b'0',NOW(),NOW(),1),
(27,17,'Chuc',10.0000,380000.00,b'0',NOW(),NOW(),1),
(28,18,'Doi',  1.0000,40000.00,b'0',NOW(),NOW(),1),
(29,18,'Chuc',10.0000,380000.00,b'0',NOW(),NOW(),1),
(30,19,'Doi',  1.0000,40000.00,b'0',NOW(),NOW(),1),
(31,19,'Chuc',10.0000,380000.00,b'0',NOW(),NOW(),1),
(32,20,'Doi',  1.0000,40000.00,b'0',NOW(),NOW(),1),
(33,20,'Chuc',10.0000,380000.00,b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `selling_price`=VALUES(`selling_price`);

-- ============================================================
-- 10. PRODUCT_ATTRIBUTES  (Nhiều thuộc tính chi tiết cho các sản phẩm con & cha)
-- ============================================================
INSERT INTO `product_attributes`
    (`id`,`product_id`,`attribute_id`,`value`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1, 1,1,'Lavie',    b'0',NOW(),NOW(),1),
(2, 1,4,'500ml',    b'0',NOW(),NOW(),1),
(3, 1,3,'Viet Nam', b'0',NOW(),NOW(),1),

-- Pepsi lon chanh muoi (Child SP 2) -> 7 Thuộc tính
(4, 2,1,'Pepsi',    b'0',NOW(),NOW(),1),
(5, 2,4,'330ml',    b'0',NOW(),NOW(),1),
(23,2,3,'Viet Nam', b'0',NOW(),NOW(),1),
(24,2,5,'Xanh duong', b'0',NOW(),NOW(),1),
(25,2,6,'Chanh muoi', b'0',NOW(),NOW(),1),
(26,2,7,'Lon nhom cao cap', b'0',NOW(),NOW(),1),
(27,2,8,'12 thang', b'0',NOW(),NOW(),1),

-- Pepsi lon khong calo (Child SP 22) -> 6 Thuộc tính
(28,22,1,'Pepsi',   b'0',NOW(),NOW(),1),
(29,22,4,'330ml',   b'0',NOW(),NOW(),1),
(30,22,3,'Viet Nam',b'0',NOW(),NOW(),1),
(31,22,5,'Den',     b'0',NOW(),NOW(),1),
(32,22,6,'Khong Calo', b'0',NOW(),NOW(),1),
(33,22,8,'12 thang',b'0',NOW(),NOW(),1),

(6, 3,1,'Tiger',    b'0',NOW(),NOW(),1),
(7, 3,4,'330ml',    b'0',NOW(),NOW(),1),
(8, 4,1,'Tropicana',b'0',NOW(),NOW(),1),
(9, 4,4,'1 lit',    b'0',NOW(),NOW(),1),
(10,5,1,'Jasmine',  b'0',NOW(),NOW(),1),
(11,5,2,'5kg',      b'0',NOW(),NOW(),1),
(12,5,3,'Viet Nam', b'0',NOW(),NOW(),1),
(13,6,1,'Hao Hao',  b'0',NOW(),NOW(),1),
(14,6,2,'75g',      b'0',NOW(),NOW(),1),
(15,8,1,'Oreo',     b'0',NOW(),NOW(),1),
(16,8,2,'137g',     b'0',NOW(),NOW(),1),
(17,10,1,'Chin-Su', b'0',NOW(),NOW(),1),
(18,10,4,'500ml',   b'0',NOW(),NOW(),1),
(19,12,1,'Clear',   b'0',NOW(),NOW(),1),
(20,12,2,'320g',    b'0',NOW(),NOW(),1),
(21,13,1,'Colgate', b'0',NOW(),NOW(),1),
(22,13,2,'230g',    b'0',NOW(),NOW(),1),

-- Dep to ong Variants (Child SP 17, 18, 19, 20) -> Thuộc tính Mau sac & Kich co
(34,17,1,'Duc Thang Footwear', b'0',NOW(),NOW(),1),
(35,17,5,'Vang',    b'0',NOW(),NOW(),1),
(36,17,2,'Size 36', b'0',NOW(),NOW(),1),
(37,17,3,'Viet Nam',b'0',NOW(),NOW(),1),

(38,18,1,'Duc Thang Footwear', b'0',NOW(),NOW(),1),
(39,18,5,'Vang',    b'0',NOW(),NOW(),1),
(40,18,2,'Size 37', b'0',NOW(),NOW(),1),
(41,18,3,'Viet Nam',b'0',NOW(),NOW(),1),

(42,19,1,'Duc Thang Footwear', b'0',NOW(),NOW(),1),
(43,19,5,'Do',      b'0',NOW(),NOW(),1),
(44,19,2,'Size 36', b'0',NOW(),NOW(),1),
(45,19,3,'Viet Nam',b'0',NOW(),NOW(),1),

(46,20,1,'Duc Thang Footwear', b'0',NOW(),NOW(),1),
(47,20,5,'Do',      b'0',NOW(),NOW(),1),
(48,20,2,'Size 37', b'0',NOW(),NOW(),1),
(49,20,3,'Viet Nam',b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `value`=VALUES(`value`);

-- ============================================================
-- 11. SUPPLIERS
-- ============================================================
INSERT INTO `suppliers`
    (`id`,`supplier_code`,`name`,`contact_person`,`phone_number`,
     `address`,`notes`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'SUP-001','Cty TNHH Nuoc giai khat Mien Nam','Nguyen Van A','0211234567',
    '12 Dien Bien Phu, Q.1, TP.HCM','Nuoc uong, bia, nuoc ngot',b'0',NOW(),NOW(),1),
(2,'SUP-002','Cty CP Thuc pham A Dong',          'Tran Thi B', '0219876543',
    '45 Ly Thuong Kiet, Q.10, TP.HCM','Gao, mi an lien, pho',   b'0',NOW(),NOW(),1),
(3,'SUP-003','Cty Banh keo Hai Ha',              'Le Van C',   '0245678901',
    '78 Nguyen Trai, Q.5, TP.HCM',   'Banh keo, snack',         b'0',NOW(),NOW(),1),
(4,'SUP-004','Dai ly Gia vi Chin-Su',            'Pham Thi D', '0267890123',
    '99 Hoang Dieu, Q.4, TP.HCM',    'Gia vi, dau an, nuoc mam',b'0',NOW(),NOW(),1),
(5,'SUP-005','Cty HPC Viet Nam',                 'Hoang Van E','0289012345',
    '32 Cach Mang Thang 8, Q.3, TP.HCM','CSCA & do dung gia dinh',b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- ============================================================
-- 12. STORAGE ZONES & LOCATIONS
-- ============================================================
INSERT INTO `storage_zones`
    (`id`,`code`,`title`,`zone_type`,`sort_order`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'KHO-A','Khu vuc A','WAREHOUSE',1,b'0',NOW(),NOW(),1),
(2,'KHO-B','Khu vuc B','WAREHOUSE',2,b'0',NOW(),NOW(),1),
(3,'KHO-C','Khu vuc C','WAREHOUSE',3,b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `code`=VALUES(`code`);

INSERT INTO `storage_locations`
    (`id`,`zone_id`,`label`,`aisle`,`shelf`,`bin`,`description`,`size`,`is_full`,
     `is_active`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,1,'KHO-A-01','A','1','01','Khu A - ke 1, ngan 1','MEDIUM',b'0',b'1',b'0',NOW(),NOW(),1),
(2,1,'KHO-A-02','A','1','02','Khu A - ke 1, ngan 2','MEDIUM',b'0',b'1',b'0',NOW(),NOW(),1),
(3,2,'KHO-B-01','B','2','01','Khu B - ke 2, ngan 1','MEDIUM',b'0',b'1',b'0',NOW(),NOW(),1),
(4,2,'KHO-B-02','B','2','02','Khu B - ke 2, ngan 2','MEDIUM',b'0',b'1',b'0',NOW(),NOW(),1),
(5,3,'KHO-C-01','C','3','01','Khu C - ke 3, ngan 1','MEDIUM',b'0',b'1',b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `label`=VALUES(`label`);

-- ============================================================
-- 13. IMPORT ORDERS
-- ============================================================
INSERT INTO `import_orders`
    (`id`,`order_code`,`supplier_id`,`received_date`,`total_cost`,
     `note`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'IMP-20260701-001',1,'2026-07-01',3975000.00,'Nhap nuoc uong thang 7',    b'0',NOW(),NOW(),1),
(2,'IMP-20260705-002',2,'2026-07-05',2625000.00,'Nhap thuc pham kho thang 7',b'0',NOW(),NOW(),1),
(3,'IMP-20260710-003',3,'2026-07-10', 850000.00,'Nhap banh keo thang 7',     b'0',NOW(),NOW(),1),
(4,'IMP-20260715-004',4,'2026-07-15',2300000.00,'Nhap gia vi thang 7',       b'0',NOW(),NOW(),1),
(5,'IMP-20260720-005',5,'2026-07-20',3060000.00,'Nhap CSCA & gia dung',      b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `order_code`=VALUES(`order_code`);

-- ============================================================
-- 14. IMPORT ORDER DETAILS
-- ============================================================
INSERT INTO `import_order_details`
    (`id`,`import_order_id`,`product_id`,`quantity`,`cost_per_unit`,
     `line_total`,`expiry_date`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
-- IMP-001: Nuoc uong
(1, 1,1,300, 3500.00,1050000.00,'2027-01-01',b'0',NOW(),NOW(),1),
(2, 1,2,150, 8000.00,1200000.00,'2027-06-01',b'0',NOW(),NOW(),1),
(3, 1,3,100,15000.00,1500000.00,'2027-03-01',b'0',NOW(),NOW(),1),
(4, 1,4, 15,15000.00, 225000.00,'2027-02-01',b'0',NOW(),NOW(),1),
-- IMP-002: Thuc pham kho
(5, 2,5, 15,75000.00,1125000.00,'2027-12-31',b'0',NOW(),NOW(),1),
(6, 2,6,200, 3500.00, 700000.00,'2027-06-01',b'0',NOW(),NOW(),1),
(7, 2,7,100, 7000.00, 700000.00,'2027-06-01',b'0',NOW(),NOW(),1),
(8, 2,6,100, 3500.00, 350000.00,'2027-09-01',b'0',NOW(),NOW(),1),
-- IMP-003: Banh keo
(9, 3,8, 20,25000.00, 500000.00,'2027-04-01',b'0',NOW(),NOW(),1),
(10,3,9, 50, 7000.00, 350000.00,'2027-08-01',b'0',NOW(),NOW(),1),
-- IMP-004: Gia vi
(11,4,10,50,22000.00,1100000.00,'2028-01-01',b'0',NOW(),NOW(),1),
(12,4,11,30,40000.00,1200000.00,'2028-01-01',b'0',NOW(),NOW(),1),
-- IMP-005: CSCA & gia dung
(13,5,12,20,55000.00,1100000.00,'2028-06-01',b'0',NOW(),NOW(),1),
(14,5,13,30,28000.00, 840000.00,'2028-06-01',b'0',NOW(),NOW(),1),
(15,5,14,50, 8000.00, 400000.00,'2028-12-31',b'0',NOW(),NOW(),1),
(16,5,15,40,18000.00, 720000.00,'2028-06-01',b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `quantity`=VALUES(`quantity`);

-- ============================================================
-- 15. STOCK BATCHES
-- ============================================================
INSERT INTO `stock_batches`
    (`id`,`product_id`,`import_order_id`,`batch_code`,`quantity_in`,`cost_per_unit`,
     `received_date`,`expiry_date`,`batch_note`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1, 1,1,'BATCH-001',300, 3500.00,'2026-07-01','2027-01-01','Lavie - lo 1',        b'0',NOW(),NOW(),1),
(2, 2,1,'BATCH-002',150, 8000.00,'2026-07-01','2027-06-01','Pepsi - lo 1',        b'0',NOW(),NOW(),1),
(3, 3,1,'BATCH-003',100,15000.00,'2026-07-01','2027-03-01','Tiger - lo 1',        b'0',NOW(),NOW(),1),
(4, 4,1,'BATCH-004', 15,15000.00,'2026-07-01','2027-02-01','Tropicana - lo 1',    b'0',NOW(),NOW(),1),
(5, 5,2,'BATCH-005', 15,75000.00,'2026-07-05','2027-12-31','Gao Jasmine - lo 1',  b'0',NOW(),NOW(),1),
(6, 6,2,'BATCH-006',200, 3500.00,'2026-07-05','2027-06-01','Hao Hao - lo 1',      b'0',NOW(),NOW(),1),
(7, 7,2,'BATCH-007',100, 7000.00,'2026-07-05','2027-06-01','Pho A Dong - lo 1',   b'0',NOW(),NOW(),1),
(8, 6,2,'BATCH-008',100, 3500.00,'2026-07-05','2027-09-01','Hao Hao - lo 2',      b'0',NOW(),NOW(),1),
(9, 8,3,'BATCH-009', 20,25000.00,'2026-07-10','2027-04-01','Oreo - lo 1',         b'0',NOW(),NOW(),1),
(10,9,3,'BATCH-010', 50, 7000.00,'2026-07-10','2027-08-01','Extra - lo 1',        b'0',NOW(),NOW(),1),
(11,10,4,'BATCH-011',50,22000.00,'2026-07-15','2028-01-01','Chin-Su - lo 1',      b'0',NOW(),NOW(),1),
(12,11,4,'BATCH-012',30,40000.00,'2026-07-15','2028-01-01','Tuong An - lo 1',     b'0',NOW(),NOW(),1),
(13,12,5,'BATCH-013',20,55000.00,'2026-07-20','2028-06-01','Clear Men - lo 1',    b'0',NOW(),NOW(),1),
(14,13,5,'BATCH-014',30,28000.00,'2026-07-20','2028-06-01','Colgate - lo 1',      b'0',NOW(),NOW(),1),
(15,14,5,'BATCH-015',50, 8000.00,'2026-07-20','2028-12-31','Tui nilon - lo 1',    b'0',NOW(),NOW(),1),
(16,15,5,'BATCH-016',40,18000.00,'2026-07-20','2028-06-01','Sunlight - lo 1',     b'0',NOW(),NOW(),1),
(17,17,5,'BATCH-017',20,37000.00,'2026-07-20','2028-06-01','Dep Vang 36 - lo 1',   b'0',NOW(),NOW(),1),
(18,18,5,'BATCH-018',15,37000.00,'2026-07-20','2028-06-01','Dep Vang 37 - lo 1',   b'0',NOW(),NOW(),1),
(19,19,5,'BATCH-019',10,37000.00,'2026-07-20','2028-06-01','Dep Do 36 - lo 1',     b'0',NOW(),NOW(),1),
(20,20,5,'BATCH-020',12,37000.00,'2026-07-20','2028-06-01','Dep Do 37 - lo 1',     b'0',NOW(),NOW(),1),
(21,22,1,'BATCH-021',100, 8000.00,'2026-07-01','2027-06-01','Pepsi Khong Calo - lo 1', b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `batch_code`=VALUES(`batch_code`), `batch_note`=VALUES(`batch_note`);

-- ============================================================
-- 16. BATCH LOCATIONS
-- ============================================================
INSERT INTO `batch_locations`
    (`id`,`batch_id`,`location_id`,`quantity`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1, 1,1,280,b'0',NOW(),NOW(),1),
(2, 2,1,130,b'0',NOW(),NOW(),1),
(3, 3,2, 80,b'0',NOW(),NOW(),1),
(4, 4,2, 13,b'0',NOW(),NOW(),1),
(5, 5,3, 14,b'0',NOW(),NOW(),1),
(6, 6,3,178,b'0',NOW(),NOW(),1),
(7, 7,3, 94,b'0',NOW(),NOW(),1),
(8, 8,4, 90,b'0',NOW(),NOW(),1),
(9, 9,4, 16,b'0',NOW(),NOW(),1),
(10,10,4,48,b'0',NOW(),NOW(),1),
(11,11,5,48,b'0',NOW(),NOW(),1),
(12,12,5,30,b'0',NOW(),NOW(),1),
(13,13,5,19,b'0',NOW(),NOW(),1),
(14,14,5,30,b'0',NOW(),NOW(),1),
(15,15,5,48,b'0',NOW(),NOW(),1),
(16,16,5,40,b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `quantity`=VALUES(`quantity`);

-- ============================================================
-- 17. STOCK MOVEMENTS – nhap kho (IMPORT)
-- ============================================================
INSERT INTO `stock_movements`
    (`id`,`stock_batch_id`,`movement_type`,`quantity_delta`,`stock_after`,
     `reference_type`,`reference_id`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1, 1,'IMPORT', 300,300,'IMPORT_ORDER',1,b'0','2026-07-01 09:00:00','2026-07-01 09:00:00',1),
(2, 2,'IMPORT', 150,150,'IMPORT_ORDER',1,b'0','2026-07-01 09:00:00','2026-07-01 09:00:00',1),
(3, 3,'IMPORT', 100,100,'IMPORT_ORDER',1,b'0','2026-07-01 09:00:00','2026-07-01 09:00:00',1),
(4, 4,'IMPORT',  15, 15,'IMPORT_ORDER',1,b'0','2026-07-01 09:00:00','2026-07-01 09:00:00',1),
(5, 5,'IMPORT',  15, 15,'IMPORT_ORDER',2,b'0','2026-07-05 09:00:00','2026-07-05 09:00:00',1),
(6, 6,'IMPORT', 200,200,'IMPORT_ORDER',2,b'0','2026-07-05 09:00:00','2026-07-05 09:00:00',1),
(7, 7,'IMPORT', 100,100,'IMPORT_ORDER',2,b'0','2026-07-05 09:00:00','2026-07-05 09:00:00',1),
(8, 8,'IMPORT', 100,100,'IMPORT_ORDER',2,b'0','2026-07-05 09:00:00','2026-07-05 09:00:00',1),
(9, 9,'IMPORT',  20, 20,'IMPORT_ORDER',3,b'0','2026-07-10 09:00:00','2026-07-10 09:00:00',1),
(10,10,'IMPORT', 50, 50,'IMPORT_ORDER',3,b'0','2026-07-10 09:00:00','2026-07-10 09:00:00',1),
(11,11,'IMPORT', 50, 50,'IMPORT_ORDER',4,b'0','2026-07-15 09:00:00','2026-07-15 09:00:00',1),
(12,12,'IMPORT', 30, 30,'IMPORT_ORDER',4,b'0','2026-07-15 09:00:00','2026-07-15 09:00:00',1),
(13,13,'IMPORT', 20, 20,'IMPORT_ORDER',5,b'0','2026-07-20 09:00:00','2026-07-20 09:00:00',1),
(14,14,'IMPORT', 30, 30,'IMPORT_ORDER',5,b'0','2026-07-20 09:00:00','2026-07-20 09:00:00',1),
(15,15,'IMPORT', 50, 50,'IMPORT_ORDER',5,b'0','2026-07-20 09:00:00','2026-07-20 09:00:00',1),
(16,16,'IMPORT', 40, 40,'IMPORT_ORDER',5,b'0','2026-07-20 09:00:00','2026-07-20 09:00:00',1)
ON DUPLICATE KEY UPDATE `movement_type`=VALUES(`movement_type`);

-- ============================================================
-- 18. CUSTOMERS
-- ============================================================
INSERT INTO `customers`
    (`id`,`full_name`,`phone_number`,`total_debt`,`total_paid`,
     `is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'Khach le (vang lai)',NULL,        0.00,     0.00,b'0',NOW(),NOW(),1),
(2,'Nguyen Van Binh',   '0901111222',25000.00, 75000.00,b'0',NOW(),NOW(),1),
(3,'Tran Thi Cam',      '0912223334', 0.00,   120000.00,b'0',NOW(),NOW(),1),
(4,'Le Hoang Dung',     '0923334445',50000.00, 50000.00,b'0',NOW(),NOW(),1),
(5,'Pham Thi E',        '0934445556', 0.00,   200000.00,b'0',NOW(),NOW(),1),
(6,'Hoang Van Phuc',    '0945556667',80000.00, 20000.00,b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`), `total_debt`=VALUES(`total_debt`);

-- ============================================================
-- 19. SALES ORDERS
--   Trang thai: COMPLETED / PENDING
--   Payment:    CASH / BANK_TRANSFER / DEBT
-- ============================================================
INSERT INTO `sales_orders`
    (`id`,`order_code`,`customer_id`,`subtotal`,`discount_amount`,`total_amount`,
     `payment_method`,`order_status`,`is_debt`,`note`,
     `is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
-- Don hoan thanh - khach vang lai
(1,'SO-20260801-001',1, 86000.00,  0.00, 86000.00,'CASH',          'COMPLETED',b'0',NULL,
    b'0','2026-08-01 09:15:00','2026-08-01 09:15:00',2),
-- Don hoan thanh - chuyen khoan
(2,'SO-20260802-002',3,120000.00,  0.00,120000.00,'BANK_TRANSFER',  'COMPLETED',b'0','KH quen',
    b'0','2026-08-02 10:30:00','2026-08-02 10:30:00',2),
-- Don hoan thanh - no mot phan (tra 75k, no 25k)
(3,'SO-20260803-003',2,100000.00,  0.00,100000.00,'CASH',           'COMPLETED',b'1','Thanh toan 75k, no 25k',
    b'0','2026-08-03 11:00:00','2026-08-03 11:00:00',2),
-- Don hoan thanh - no toan bo
(4,'SO-20260804-004',4, 94000.00,  0.00, 94000.00,'DEBT',           'COMPLETED',b'1','No toan bo',
    b'0','2026-08-04 14:00:00','2026-08-04 14:00:00',2),
-- Don dang cho (PENDING) - can xu ly
(5,'SO-20260810-005',5, 95000.00,  0.00, 95000.00,'CASH',           'PENDING',  b'0','Don dang chuan bi',
    b'0','2026-08-10 15:30:00','2026-08-10 15:30:00',2),
-- Don hoan thanh - co discount
(6,'SO-20260805-006',3,175000.00,10000.00,165000.00,'CASH',         'COMPLETED',b'0','Giam 10k cho KH than thiet',
    b'0','2026-08-05 09:00:00','2026-08-05 09:00:00',2),
-- Don hoan thanh - no
(7,'SO-20260806-007',6,110000.00,  0.00,110000.00,'DEBT',           'COMPLETED',b'1','No 110k',
    b'0','2026-08-06 10:00:00','2026-08-06 10:00:00',2)
ON DUPLICATE KEY UPDATE `order_status`=VALUES(`order_status`);

-- ============================================================
-- 20. SALES ORDER DETAILS
-- ============================================================
INSERT INTO `sales_order_details`
    (`id`,`sales_order_id`,`product_id`,`quantity`,`unit_price`,
     `discount_amount`,`line_total`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
-- SO-001: Vang lai mua nuoc uong  (10 Lavie + 3 Pepsi = 86000)
(1, 1, 1,10, 5000.00,0.00, 50000.00,b'0','2026-08-01 09:15:00','2026-08-01 09:15:00',2),
(2, 1, 2, 3,12000.00,0.00, 36000.00,b'0','2026-08-01 09:15:00','2026-08-01 09:15:00',2),
-- SO-002: Tran Thi Cam (12 mi + 2 nuoc mam = 120000)
(3, 2, 6,12, 5000.00,0.00, 60000.00,b'0','2026-08-02 10:30:00','2026-08-02 10:30:00',2),
(4, 2,10, 2,30000.00,0.00, 60000.00,b'0','2026-08-02 10:30:00','2026-08-02 10:30:00',2),
-- SO-003: Nguyen Van Binh (1 gao 5kg = 100000)
(5, 3, 5, 1,100000.00,0.00,100000.00,b'0','2026-08-03 11:00:00','2026-08-03 11:00:00',2),
-- SO-004: Le Hoang Dung (2 Oreo + 2 Extra = 94000)
(6, 4, 8, 2,35000.00,0.00, 70000.00,b'0','2026-08-04 14:00:00','2026-08-04 14:00:00',2),
(7, 4, 9, 2,12000.00,0.00, 24000.00,b'0','2026-08-04 14:00:00','2026-08-04 14:00:00',2),
-- SO-005: Pham Thi E – PENDING (2 bia + 1 dau an = 95000)
(8, 5, 3, 2,20000.00,0.00, 40000.00,b'0','2026-08-10 15:30:00','2026-08-10 15:30:00',2),
(9, 5,11, 1,55000.00,0.00, 55000.00,b'0','2026-08-10 15:30:00','2026-08-10 15:30:00',2),
-- SO-006: Tran Thi Cam – co discount (20 Lavie + 1 Clear Men = 175000, discount 10k)
(10,6, 1,20, 5000.00,0.00,100000.00,b'0','2026-08-05 09:00:00','2026-08-05 09:00:00',2),
(11,6,12, 1,75000.00,0.00, 75000.00,b'0','2026-08-05 09:00:00','2026-08-05 09:00:00',2),
-- SO-007: Hoang Van Phuc – no (10 mi + 6 pho = 110000)
(12,7, 6,10, 5000.00,0.00, 50000.00,b'0','2026-08-06 10:00:00','2026-08-06 10:00:00',2),
(13,7, 7, 6,10000.00,0.00, 60000.00,b'0','2026-08-06 10:00:00','2026-08-06 10:00:00',2)
ON DUPLICATE KEY UPDATE `quantity`=VALUES(`quantity`);

-- ============================================================
-- 21. DEBT PAYMENTS
-- ============================================================
INSERT INTO `debt_payments`
    (`id`,`customer_id`,`sales_order_id`,`amount_paid`,`payment_method`,
     `notes`,`processed_by`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
-- Nguyen Van Binh tra 75k cho SO-003 (con no 25k)
(1,2,3,75000.00,'CASH','Tra mot phan, con no 25k',2,b'0',
    '2026-08-03 11:05:00','2026-08-03 11:05:00',2),
-- Le Hoang Dung tra 44k cho SO-004 (con no 50k)
(2,4,4,44000.00,'CASH','Tra mot phan no SO-004',  2,b'0',
    '2026-08-08 10:00:00','2026-08-08 10:00:00',1)
ON DUPLICATE KEY UPDATE `amount_paid`=VALUES(`amount_paid`);

-- ============================================================
-- 22. STOCK MOVEMENTS – xuat kho (SALE) – cho don da COMPLETED
-- ============================================================
INSERT INTO `stock_movements`
    (`id`,`stock_batch_id`,`movement_type`,`quantity_delta`,`stock_after`,
     `reference_type`,`reference_id`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
-- SO-001
(17,1,'SALE', -10,290,'SALES_ORDER',1,b'0','2026-08-01 09:15:00','2026-08-01 09:15:00',2),
(18,2,'SALE',  -3,147,'SALES_ORDER',1,b'0','2026-08-01 09:15:00','2026-08-01 09:15:00',2),
-- SO-002
(19,6,'SALE', -12,188,'SALES_ORDER',2,b'0','2026-08-02 10:30:00','2026-08-02 10:30:00',2),
(20,11,'SALE', -2, 48,'SALES_ORDER',2,b'0','2026-08-02 10:30:00','2026-08-02 10:30:00',2),
-- SO-003
(21,5,'SALE',  -1, 14,'SALES_ORDER',3,b'0','2026-08-03 11:00:00','2026-08-03 11:00:00',2),
-- SO-004
(22,9,'SALE',  -2, 18,'SALES_ORDER',4,b'0','2026-08-04 14:00:00','2026-08-04 14:00:00',2),
(23,10,'SALE', -2, 48,'SALES_ORDER',4,b'0','2026-08-04 14:00:00','2026-08-04 14:00:00',2),
-- SO-006
(24,1,'SALE', -20,270,'SALES_ORDER',6,b'0','2026-08-05 09:00:00','2026-08-05 09:00:00',2),
(25,13,'SALE', -1, 19,'SALES_ORDER',6,b'0','2026-08-05 09:00:00','2026-08-05 09:00:00',2),
-- SO-007
(26,6,'SALE', -10,178,'SALES_ORDER',7,b'0','2026-08-06 10:00:00','2026-08-06 10:00:00',2),
(27,7,'SALE',  -6, 94,'SALES_ORDER',7,b'0','2026-08-06 10:00:00','2026-08-06 10:00:00',2)
ON DUPLICATE KEY UPDATE `movement_type`=VALUES(`movement_type`);

-- ============================================================
-- 23. RETURN ORDERS
-- ============================================================
INSERT INTO `return_orders`
    (`id`,`return_code`,`sales_order_id`,`refund_amount`,
     `return_reason`,`resolution_type`,`note`,
     `is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'RET-20260803-001',1,12000.00,
    'San pham bi mop vo','REFUND','Hoan tien mat cho khach',
    b'0','2026-08-03 14:00:00','2026-08-03 14:00:00',2),
(2,'RET-20260807-002',6,75000.00,
    'KH doi y, khong dung duoc','EXCHANGE','Doi sang san pham khac',
    b'0','2026-08-07 09:30:00','2026-08-07 09:30:00',2)
ON DUPLICATE KEY UPDATE `return_code`=VALUES(`return_code`);

-- ============================================================
-- 24. RETURN ORDER DETAILS
-- ============================================================
INSERT INTO `return_order_details`
    (`id`,`return_order_id`,`product_id`,`quantity`,`unit_price`,
     `line_refund`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,1,2, 1,12000.00,12000.00,b'0','2026-08-03 14:00:00','2026-08-03 14:00:00',2),
(2,2,12,1,75000.00,75000.00,b'0','2026-08-07 09:30:00','2026-08-07 09:30:00',2)
ON DUPLICATE KEY UPDATE `quantity`=VALUES(`quantity`);

-- ============================================================
-- 25. STOCK MOVEMENTS – nhap lai tu return
-- ============================================================
INSERT INTO `stock_movements`
    (`id`,`stock_batch_id`,`movement_type`,`quantity_delta`,`stock_after`,
     `reference_type`,`reference_id`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(28,2, 'RETURN',1,148,'RETURN_ORDER',1,b'0','2026-08-03 14:00:00','2026-08-03 14:00:00',2),
(29,13,'RETURN',1, 20,'RETURN_ORDER',2,b'0','2026-08-07 09:30:00','2026-08-07 09:30:00',2)
ON DUPLICATE KEY UPDATE `movement_type`=VALUES(`movement_type`);

-- ============================================================
-- 26. STOCK ADJUSTMENTS (kiem ke)
-- ============================================================
INSERT INTO `stock_adjustments`
    (`id`,`product_id`,`quantity_before`,`quantity_after`,`reason`,
     `is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,14,50,48,'Kiem ke phat hien 2 cuon bi rach – xu ly huy',
    b'0','2026-08-08 16:00:00','2026-08-08 16:00:00',4),
(2,3, 100,98,'2 lon bia bi mop khi boc xep',
    b'0','2026-08-09 10:00:00','2026-08-09 10:00:00',4)
ON DUPLICATE KEY UPDATE `reason`=VALUES(`reason`);

-- ============================================================
-- 27. IMPORT RETURNS (tra hang ve nha cung cap)
-- ============================================================
INSERT INTO `import_returns`
    (`id`,`return_code`,`import_order_id`,`total_refund`,`note`,
     `is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'IRET-20260810-001',1,30000.00,'Tra 2 chai Tropicana hong bao bi',
    b'0','2026-08-10 11:00:00','2026-08-10 11:00:00',1)
ON DUPLICATE KEY UPDATE `return_code`=VALUES(`return_code`);

INSERT INTO `import_return_details`
    (`id`,`import_return_id`,`product_id`,`quantity`,`return_price`,
     `return_reason`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,1,4,2,15000.00,'Bao bi hong, khong ban duoc',
    b'0','2026-08-10 11:00:00','2026-08-10 11:00:00',1)
ON DUPLICATE KEY UPDATE `quantity`=VALUES(`quantity`);

-- ============================================================
-- 28. SUPPLIER PAYMENTS
-- ============================================================
INSERT INTO `supplier_payments`
    (`id`,`payment_code`,`supplier_id`,`import_order_id`,`amount`,
     `payment_method`,`payment_date`,`note`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'PAY-SUP-001',1,1,3975000.00,'BANK_TRANSFER','2026-07-03 10:00:00.000000',
    'Thanh toan du hoa don IMP-001',b'0',NOW(),NOW(),1),
(2,'PAY-SUP-002',2,2,1312500.00,'CASH',          '2026-07-10 09:00:00.000000',
    'Tra truoc 50% IMP-002',        b'0',NOW(),NOW(),1),
(3,'PAY-SUP-003',3,3, 850000.00,'BANK_TRANSFER', '2026-07-12 14:00:00.000000',
    'Thanh toan du IMP-003',        b'0',NOW(),NOW(),1)
ON DUPLICATE KEY UPDATE `payment_code`=VALUES(`payment_code`);

-- ============================================================
-- 29. NOTIFICATIONS
-- ============================================================
INSERT INTO `notifications`
    (`id`,`notification_type`,`title`,`message`,`reference_type`,`reference_id`,
     `is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,'LOW_STOCK',   'Canh bao ton kho thap - Gao Jasmine',
    'Ton kho Gao Jasmine 5kg con 14 tui, thap hon muc toi thieu (5). Can nhap them!',
    'PRODUCT',5,b'0','2026-08-09 08:00:00','2026-08-09 08:00:00',NULL),
(2,'ORDER_PENDING','Don hang cho xu ly - SO-20260810-005',
    'Don hang SO-20260810-005 cua KH Pham Thi E dang o trang thai PENDING.',
    'SALES_ORDER',5,b'0','2026-08-10 15:35:00','2026-08-10 15:35:00',2),
(3,'DEBT_REMINDER','Nhac no - Hoang Van Phuc',
    'Khach hang Hoang Van Phuc con no 80,000 VND, da qua 5 ngay chua thanh toan.',
    'CUSTOMER',6,b'0','2026-08-11 08:00:00','2026-08-11 08:00:00',1),
(4,'RETURN_CREATED','Don tra hang moi - RET-20260807-002',
    'Don tra hang RET-20260807-002 vua duoc tao, cho duyet.',
    'RETURN_ORDER',2,b'0','2026-08-07 09:35:00','2026-08-07 09:35:00',2)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- ============================================================
-- 30. NOTIFICATION RECIPIENTS
-- ============================================================
INSERT INTO `notification_recipients`
    (`id`,`notification_id`,`user_id`,`is_read`,
     `is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,1,1,b'0',b'0','2026-08-09 08:00:00','2026-08-09 08:00:00',NULL),
(2,1,4,b'0',b'0','2026-08-09 08:00:00','2026-08-09 08:00:00',NULL),
(3,2,1,b'0',b'0','2026-08-10 15:35:00','2026-08-10 15:35:00',2),
(4,3,1,b'0',b'0','2026-08-11 08:00:00','2026-08-11 08:00:00',1),
(5,4,1,b'1',b'0','2026-08-07 09:35:00','2026-08-07 10:00:00',2)
ON DUPLICATE KEY UPDATE `is_read`=VALUES(`is_read`);

-- ============================================================
-- 31. AUDIT LOGS
-- ============================================================
INSERT INTO `audit_logs`
    (`id`,`user_id`,`entity_name`,`entity_id`,`action_type`,
     `old_value`,`new_value`,`is_removed`,`created_at`,`updated_at`,`created_by`)
VALUES
(1,2,'sales_orders',5,'CREATE',NULL,
    '{"order_code":"SO-20260810-005","status":"PENDING","total_amount":95000}',
    b'0','2026-08-10 15:30:00','2026-08-10 15:30:00',2),
(2,1,'sales_orders',4,'UPDATE',
    '{"order_status":"PENDING"}','{"order_status":"COMPLETED"}',
    b'0','2026-08-04 14:30:00','2026-08-04 14:30:00',1),
(3,1,'users',2,'CREATE',NULL,
    '{"username":"cashier01","role":"CASHIER","status":"ACTIVE"}',
    b'0','2026-07-01 07:55:00','2026-07-01 07:55:00',1),
(4,2,'return_orders',1,'CREATE',NULL,
    '{"return_code":"RET-20260803-001","refund":12000}',
    b'0','2026-08-03 14:00:00','2026-08-03 14:00:00',2),
(5,4,'stock_adjustments',1,'CREATE',NULL,
    '{"product_id":14,"before":50,"after":48,"reason":"Kiem ke phat hien 2 cuon bi rach"}',
    b'0','2026-08-08 16:00:00','2026-08-08 16:00:00',4)
ON DUPLICATE KEY UPDATE `action_type`=VALUES(`action_type`);

-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;
-- ============================================================

-- ============================================================
-- VERIFICATION QUERIES (copy ra chay rieng de kiem tra)
-- ============================================================
/*
-- 1. Users & roles
SELECT u.id, u.username, u.full_name, u.status,
       GROUP_CONCAT(r.name ORDER BY r.id) AS roles
FROM users u
JOIN users_roles ur ON u.id = ur.users_id
JOIN roles r ON r.id = ur.roles_id
GROUP BY u.id;

-- 2. Ton kho uoc tinh (tong quantity_delta theo batch)
SELECT p.id, p.name,
       SUM(sm.quantity_delta) AS ton_kho_hien_tai
FROM products p
JOIN stock_batches sb ON sb.product_id = p.id
JOIN stock_movements sm ON sm.stock_batch_id = sb.id
GROUP BY p.id, p.name
ORDER BY p.id;

-- 3. Danh sach don ban + trang thai
SELECT so.order_code, so.order_status, so.payment_method,
       COALESCE(c.full_name,'Vang lai') AS customer,
       so.total_amount,
       IF(so.is_debt=b'1','Co no','Da thanh toan') AS debt_status
FROM sales_orders so
LEFT JOIN customers c ON c.id = so.customer_id
ORDER BY so.created_at;

-- 4. Khach con no
SELECT c.full_name, c.phone_number,
       c.total_debt, c.total_paid
FROM customers c WHERE c.total_debt > 0;

-- 5. Don tra hang
SELECT ro.return_code, so.order_code,
       ro.refund_amount, ro.return_reason, ro.resolution_type
FROM return_orders ro
JOIN sales_orders so ON so.id = ro.sales_order_id;

-- 6. Thong bao chua doc cua admin
SELECT n.title, n.notification_type,
       IF(nr.is_read=b'1','Da doc','Chua doc') AS trang_thai
FROM notification_recipients nr
JOIN notifications n ON n.id = nr.notification_id
WHERE nr.user_id = 1
ORDER BY nr.created_at DESC;
*/
