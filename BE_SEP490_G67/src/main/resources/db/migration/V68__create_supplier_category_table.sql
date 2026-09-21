-- V68: Create supplier_category table for mapping suppliers to product categories
CREATE TABLE IF NOT EXISTS `supplier_category` (
  `supplier_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  PRIMARY KEY (`supplier_id`, `category_id`),
  KEY `FK_supplier_category_category` (`category_id`),
  CONSTRAINT `FK_supplier_category_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_supplier_category_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
