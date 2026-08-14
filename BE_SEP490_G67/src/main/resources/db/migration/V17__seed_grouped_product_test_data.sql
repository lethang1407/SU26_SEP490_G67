-- Seed attributes Màu sắc and Kích cỡ
INSERT INTO `attributes` (`id`, `name`, `is_removed`, `is_primary`, `created_at`, `updated_at`, `created_by`)
VALUES
(5, 'Màu sắc', b'0', b'1', NOW(), NOW(), 1),
(6, 'Kích cỡ', b'0', b'0', NOW(), NOW(), 1)
ON DUPLICATE KEY UPDATE `is_primary` = VALUES(`is_primary`);

-- Seed Parent product
INSERT INTO `products` (`id`, `name`, `barcode`, `category_id`, `cost_price`, `selling_price`, `min_stock`, `description`, `product_img`, `is_removed`, `created_at`, `updated_at`, `created_by`, `parent_id`, `status`)
VALUES
(16, 'Dép tổ ong siêu nhẹ đại của thanh', 'DEP_GRP_001', 6, 0.00, 0.00, 0, 'Nhóm dép tổ ong siêu nhẹ', NULL, b'0', NOW(), NOW(), 1, NULL, 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Seed Variant products
INSERT INTO `products` (`id`, `name`, `barcode`, `category_id`, `cost_price`, `selling_price`, `min_stock`, `description`, `product_img`, `is_removed`, `created_at`, `updated_at`, `created_by`, `parent_id`, `status`, `sku`)
VALUES
(17, 'Dép tổ ong siêu nhẹ đại của thanh-Size 36-Màu Vàng(Đôi)', 'DEP_V36', 6, 37000.00, 40000.00, 5, 'Dép tổ ong Màu Vàng Size 36', NULL, b'0', NOW(), NOW(), 1, 16, 'active', 'SP000003'),
(18, 'Dép tổ ong siêu nhẹ đại của thanh-Size 37-Màu Vàng(Đôi)', 'DEP_V37', 6, 37000.00, 40000.00, 5, 'Dép tổ ong Màu Vàng Size 37', NULL, b'0', NOW(), NOW(), 1, 16, 'active', 'SP000004'),
(19, 'Dép tổ ong siêu nhẹ đại của thanh-Size 36-Màu Đỏ(Đôi)',  'DEP_D36', 6, 37000.00, 40000.00, 5, 'Dép tổ ong Màu Đỏ Size 36',  NULL, b'0', NOW(), NOW(), 1, 16, 'active', 'SP000005')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `parent_id` = VALUES(`parent_id`), `sku` = VALUES(`sku`);

-- Seed Product Attributes for Variants
INSERT INTO `product_attributes` (`id`, `product_id`, `attribute_id`, `value`, `is_removed`, `created_at`, `updated_at`, `created_by`)
VALUES
(100, 17, 5, 'Vàng', b'0', NOW(), NOW(), 1),
(101, 17, 6, 'Size 36', b'0', NOW(), NOW(), 1),
(102, 18, 5, 'Vàng', b'0', NOW(), NOW(), 1),
(103, 18, 6, 'Size 37', b'0', NOW(), NOW(), 1),
(104, 19, 5, 'Đỏ', b'0', NOW(), NOW(), 1),
(105, 19, 6, 'Size 36', b'0', NOW(), NOW(), 1)
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- Seed price history for variants
INSERT INTO `price_history` (`id`, `product_id`, `price`, `supplier_id`, `is_removed`, `created_at`, `updated_at`, `created_by`)
VALUES
(1, 17, 35000.00, 1, b'0', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), 1),
(2, 17, 36000.00, 1, b'0', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), 1),
(3, 17, 37000.00, 1, b'0', NOW(), NOW(), 1),
(4, 18, 37000.00, 1, b'0', NOW(), NOW(), 1),
(5, 19, 37000.00, 1, b'0', NOW(), NOW(), 1)
ON DUPLICATE KEY UPDATE `price` = VALUES(`price`);

-- Seed stock batches for variants
INSERT INTO `stock_batches` (`id`, `product_id`, `import_order_id`, `quantity_in`, `cost_per_unit`, `received_date`, `expiry_date`, `batch_note`, `is_removed`, `created_at`, `updated_at`, `created_by`)
VALUES
(100, 17, 1, 20, 37000.00, '2026-07-20', '2028-06-01', 'Dép vàng size 36', b'0', NOW(), NOW(), 1),
(101, 19, 1, 5, 37000.00, '2026-07-20', '2028-06-01', 'Dép đỏ size 36', b'0', NOW(), NOW(), 1)
ON DUPLICATE KEY UPDATE `quantity_in` = VALUES(`quantity_in`);

-- Seed batch locations
INSERT INTO `batch_locations` (`id`, `batch_id`, `location_id`, `quantity`, `is_removed`, `created_at`, `updated_at`, `created_by`)
VALUES
(100, 100, 1, 20, b'0', NOW(), NOW(), 1),
(101, 101, 1, 5, b'0', NOW(), NOW(), 1)
ON DUPLICATE KEY UPDATE `quantity` = VALUES(`quantity`);
