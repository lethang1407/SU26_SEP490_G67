-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: dbdev
-- ------------------------------------------------------
-- Server version	9.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '1af6cadd-5351-11f1-b000-f8b46a939897:1-829';

--
-- Table structure for table `attributes`
--

DROP TABLE IF EXISTS `attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attributes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attributes`
--

LOCK TABLES `attributes` WRITE;
/*!40000 ALTER TABLE `attributes` DISABLE KEYS */;
/*!40000 ALTER TABLE `attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action_type` enum('LOGIN','LOGOUT','LOGIN_FAILED','PRODUCT_PRICE_UPDATE','ORDER_CANCEL','REFUND_ISSUED','STOCK_ADJUSTMENT','DEBT_WRITEOFF','USER_CREATE','USER_UPDATE','USER_DEACTIVATE','IMPORT_RECEIVE','TAX_SUBMISSION','PERMISSION_CHANGE') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `entity_name` varchar(60) DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_al_user` (`user_id`),
  KEY `idx_al_action_type` (`action_type`),
  KEY `idx_al_entity` (`entity_name`,`entity_id`),
  KEY `idx_al_created_at` (`created_at`),
  CONSTRAINT `fk_al_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batch_locations`
--

DROP TABLE IF EXISTS `batch_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `batch_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `location_id` int NOT NULL,
  `quantity` int DEFAULT '0',
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batch_location` (`batch_id`,`location_id`),
  KEY `idx_bl_batch` (`batch_id`),
  KEY `idx_bl_location` (`location_id`),
  CONSTRAINT `fk_bl_batch` FOREIGN KEY (`batch_id`) REFERENCES `stock_batches` (`id`),
  CONSTRAINT `fk_bl_location` FOREIGN KEY (`location_id`) REFERENCES `storage_locations` (`id`),
  CONSTRAINT `chk_bl_quantity` CHECK ((`quantity` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batch_locations`
--

LOCK TABLES `batch_locations` WRITE;
/*!40000 ALTER TABLE `batch_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `batch_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `total_debt` decimal(15,2) DEFAULT '0.00',
  `total_paid` decimal(15,2) DEFAULT '0.00',
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone_number` (`phone_number`),
  KEY `idx_customers_phone` (`phone_number`),
  KEY `idx_customers_name` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `debt_payments`
--

DROP TABLE IF EXISTS `debt_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debt_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `sales_order_id` int DEFAULT NULL,
  `processed_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `amount_paid` decimal(15,2) DEFAULT NULL,
  `payment_method` enum('CASH','QR') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CASH',
  `notes` text,
  `payment_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_dp_processed_by` (`processed_by`),
  KEY `idx_dp_customer` (`customer_id`),
  KEY `idx_dp_sales_order` (`sales_order_id`),
  KEY `idx_dp_payment_date` (`payment_date`),
  CONSTRAINT `fk_dp_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_dp_sales_order` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `debt_payments`
--

LOCK TABLES `debt_payments` WRITE;
/*!40000 ALTER TABLE `debt_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `debt_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_order_details`
--

DROP TABLE IF EXISTS `import_order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_order_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `import_order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `cost_per_unit` decimal(15,2) DEFAULT NULL,
  `line_total` decimal(15,2) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_iod_import_order` (`import_order_id`),
  KEY `idx_iod_product` (`product_id`),
  CONSTRAINT `fk_iod_import_order` FOREIGN KEY (`import_order_id`) REFERENCES `import_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_iod_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_order_details`
--

LOCK TABLES `import_order_details` WRITE;
/*!40000 ALTER TABLE `import_order_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `import_order_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_orders`
--

DROP TABLE IF EXISTS `import_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `order_code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `total_cost` decimal(15,2) DEFAULT '0.00',
  `received_date` date DEFAULT NULL,
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `fk_io_created_by` (`created_by`),
  KEY `idx_io_supplier` (`supplier_id`),
  KEY `idx_io_created_at` (`created_at`),
  CONSTRAINT `fk_io_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_orders`
--

LOCK TABLES `import_orders` WRITE;
/*!40000 ALTER TABLE `import_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `import_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_return_details`
--

DROP TABLE IF EXISTS `import_return_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_return_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `import_return_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT NULL,
  `return_price` decimal(15,2) DEFAULT NULL,
  `return_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ird_import_return` (`import_return_id`),
  KEY `idx_ird_product` (`product_id`),
  CONSTRAINT `fk_ird_import_return` FOREIGN KEY (`import_return_id`) REFERENCES `import_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ird_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_return_details`
--

LOCK TABLES `import_return_details` WRITE;
/*!40000 ALTER TABLE `import_return_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `import_return_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_returns`
--

DROP TABLE IF EXISTS `import_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `import_order_id` int NOT NULL,
  `return_code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `total_refund` decimal(15,2) DEFAULT '0.00',
  `note` text,
  `return_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_code` (`return_code`),
  KEY `fk_ir_created_by` (`created_by`),
  KEY `idx_ir_import_order` (`import_order_id`),
  KEY `idx_ir_return_date` (`return_date`),
  CONSTRAINT `fk_ir_import_order` FOREIGN KEY (`import_order_id`) REFERENCES `import_orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_returns`
--

LOCK TABLES `import_returns` WRITE;
/*!40000 ALTER TABLE `import_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `import_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_recipients`
--

DROP TABLE IF EXISTS `notification_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_recipients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notification_id` int DEFAULT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_recipients_users_FK` (`user_id`),
  KEY `notification_recipients_notifications_FK` (`notification_id`),
  CONSTRAINT `notification_recipients_notifications_FK` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `notification_recipients_users_FK` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_recipients`
--

LOCK TABLES `notification_recipients` WRITE;
/*!40000 ALTER TABLE `notification_recipients` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_recipients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notification_type` enum('LOW_STOCK','OVERDUE_DEBT','EXPIRY_ALERT','IMPORT_PENDING','SYNC_CONFLICT','SYSTEM') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `reference_type` varchar(40) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif_type` (`notification_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `module` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'AUTH:LOGIN','Login','AUTH',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(2,'AUTH:RESET_PASSWORD','Reset Password','AUTH',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(3,'USER:CREATE','Create Staff Account','USER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(4,'USER:READ','View Staff Accounts','USER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(5,'USER:UPDATE','Edit Staff Account','USER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(6,'USER:MANAGE','Manage Permissions','USER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(7,'PRODUCT:CREATE','Create Product','PRODUCT',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(8,'PRODUCT:READ','View Products','PRODUCT',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(9,'PRODUCT:UPDATE','Edit Product','PRODUCT',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(10,'PRODUCT:DELETE','Deactivate Product','PRODUCT',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(11,'INVENTORY:READ','View Inventory','INVENTORY',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(12,'INVENTORY:IMPORT','Create Import Order','INVENTORY',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(13,'INVENTORY:IMPORT_RETURN','Return Goods to Supplier','INVENTORY',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(14,'INVENTORY:ADJUST','Adjust Stock','INVENTORY',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(15,'ORDER:CREATE','Process Sale','ORDER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(16,'ORDER:READ','View Orders','ORDER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(17,'ORDER:CANCEL','Cancel/Void Order','ORDER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(18,'ORDER:RETURN','Process Return/Exchange','ORDER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(19,'CUSTOMER:READ','View Customers','CUSTOMER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(20,'CUSTOMER:MANAGE','Manage Customer Debt','CUSTOMER',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(21,'REPORT:SALES','View Sales Report','REPORT',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(22,'REPORT:INVENTORY','View Inventory Report','REPORT',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(23,'REPORT:ORDER','View Order Report','REPORT',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(24,'TAX:READ','View Tax Report','TAX',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(25,'TAX:MANAGE','Manage Tax Configuration','TAX',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(26,'NOTIFICATION:READ','View Notifications','NOTIFICATION',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(27,'NOTIFICATION:MANAGE','Configure Alerts','NOTIFICATION',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL),(28,'OFFLINE:SYNC','Monitor Sync Status','OFFLINE',NULL,0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL);
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_attributes`
--

DROP TABLE IF EXISTS `product_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_attributes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `attribute_id` int NOT NULL,
  `value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_attribute` (`product_id`,`attribute_id`),
  KEY `idx_pa_product` (`product_id`),
  KEY `idx_pa_attribute` (`attribute_id`),
  CONSTRAINT `fk_pa_attribute` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pa_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_attributes`
--

LOCK TABLES `product_attributes` WRITE;
/*!40000 ALTER TABLE `product_attributes` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_units`
--

DROP TABLE IF EXISTS `product_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `unit_base` decimal(10,4) DEFAULT '1.0000',
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pu_product` (`product_id`),
  CONSTRAINT `fk_pu_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_units`
--

LOCK TABLES `product_units` WRITE;
/*!40000 ALTER TABLE `product_units` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int DEFAULT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `cost_price` decimal(15,2) DEFAULT '0.00',
  `selling_price` decimal(15,2) DEFAULT '0.00',
  `min_stock` int DEFAULT '0',
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `product_img` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `barcode` (`barcode`),
  KEY `idx_products_barcode` (`barcode`),
  KEY `idx_products_name` (`name`),
  KEY `idx_products_category` (`category_id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `return_order_details`
--

DROP TABLE IF EXISTS `return_order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `return_order_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `return_order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `line_refund` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rod_return_order` (`return_order_id`),
  KEY `idx_rod_product` (`product_id`),
  CONSTRAINT `fk_rod_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_rod_return_order` FOREIGN KEY (`return_order_id`) REFERENCES `return_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `return_order_details`
--

LOCK TABLES `return_order_details` WRITE;
/*!40000 ALTER TABLE `return_order_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `return_order_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `return_orders`
--

DROP TABLE IF EXISTS `return_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `return_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order_id` int NOT NULL,
  `return_code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `return_reason` enum('DEFECTIVE','WRONG_ITEM','CHANGED_MIND') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `resolution_type` enum('REFUND','EXCHANGE') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `refund_amount` decimal(15,2) DEFAULT '0.00',
  `note` text,
  `return_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_code` (`return_code`),
  KEY `fk_ro_created_by` (`created_by`),
  KEY `idx_ro_sales_order` (`sales_order_id`),
  KEY `idx_ro_return_date` (`return_date`),
  CONSTRAINT `fk_ro_sales_order` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `return_orders`
--

LOCK TABLES `return_orders` WRITE;
/*!40000 ALTER TABLE `return_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `return_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(2,1),(1,2),(2,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(2,8),(1,9),(1,10),(1,11),(2,11),(1,12),(1,13),(1,14),(2,14),(1,15),(2,15),(1,16),(2,16),(1,17),(1,18),(2,18),(1,19),(2,19),(1,20),(2,20),(1,21),(1,22),(1,23),(1,24),(1,25),(1,26),(2,26),(1,27),(1,28),(2,28);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMIN','Store owner – full system access',0,'2026-06-08 16:07:53','2026-06-08 16:07:53',NULL,NULL),(2,'STAFF','Store employee – daily operations',0,'2026-06-08 16:07:53','2026-06-08 16:07:53',NULL,NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_details`
--

DROP TABLE IF EXISTS `sales_order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sales_order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `line_total` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sod_sales_order` (`sales_order_id`),
  KEY `idx_sod_product` (`product_id`),
  CONSTRAINT `fk_sod_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_sod_sales_order` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_order_details`
--

LOCK TABLES `sales_order_details` WRITE;
/*!40000 ALTER TABLE `sales_order_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_order_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `order_code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `payment_method` enum('CASH','QR','DEBT') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'CASH',
  `order_status` enum('COMPLETED','CANCELLED','RETURNED','PARTIALLY_RETURNED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'COMPLETED',
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `is_debt` tinyint(1) DEFAULT '0',
  `debt_due_date` date DEFAULT NULL,
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `idx_so_customer` (`customer_id`),
  KEY `idx_so_created_by` (`created_by`),
  KEY `idx_so_order_code` (`order_code`),
  KEY `idx_so_is_debt` (`is_debt`),
  KEY `idx_so_status` (`order_status`),
  CONSTRAINT `fk_so_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_orders`
--

LOCK TABLES `sales_orders` WRITE;
/*!40000 ALTER TABLE `sales_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_adjustments`
--

DROP TABLE IF EXISTS `stock_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `quantity_before` int DEFAULT NULL,
  `quantity_after` int DEFAULT NULL,
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sa_created_by` (`created_by`),
  KEY `idx_sa_product` (`product_id`),
  CONSTRAINT `fk_sa_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_adjustments`
--

LOCK TABLES `stock_adjustments` WRITE;
/*!40000 ALTER TABLE `stock_adjustments` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_batches`
--

DROP TABLE IF EXISTS `stock_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `import_order_id` int DEFAULT NULL,
  `cost_per_unit` decimal(15,2) DEFAULT NULL,
  `quantity_in` int DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `batch_note` varchar(255) DEFAULT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sb_product` (`product_id`),
  KEY `idx_sb_import_order` (`import_order_id`),
  KEY `idx_sb_expiry` (`expiry_date`),
  CONSTRAINT `fk_sb_import_order` FOREIGN KEY (`import_order_id`) REFERENCES `import_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sb_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_batches`
--

LOCK TABLES `stock_batches` WRITE;
/*!40000 ALTER TABLE `stock_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `stock_batch_id` int NOT NULL,
  `movement_type` enum('IMPORT','SALE','RETURN_IN','RETURN_OUT','ADJUSTMENT_IN','ADJUSTMENT_OUT') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `quantity_delta` int DEFAULT NULL,
  `stock_after` int DEFAULT NULL,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sm_created_by` (`created_by`),
  KEY `idx_sm_product` (`stock_batch_id`),
  KEY `idx_sm_type` (`movement_type`),
  KEY `idx_sm_created_at` (`created_at`),
  KEY `idx_sm_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `stock_movements_stock_batches_FK` FOREIGN KEY (`stock_batch_id`) REFERENCES `stock_batches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `storage_locations`
--

DROP TABLE IF EXISTS `storage_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `storage_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `zone` varchar(50) NOT NULL,
  `aisle` varchar(20) DEFAULT NULL,
  `shelf` varchar(20) DEFAULT NULL,
  `bin` varchar(20) DEFAULT NULL,
  `label` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `storage_locations`
--

LOCK TABLES `storage_locations` WRITE;
/*!40000 ALTER TABLE `storage_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `storage_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_config`
--

DROP TABLE IF EXISTS `store_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `store_name` varchar(200) NOT NULL DEFAULT 'Cửa hàng Đức Thắng',
  `owner_full_name` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `tax_code` varchar(20) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT '10.00',
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'VND',
  `is_removed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_config`
--

LOCK TABLES `store_config` WRITE;
/*!40000 ALTER TABLE `store_config` DISABLE KEYS */;
INSERT INTO `store_config` VALUES (1,'Cửa hàng Đức Thắng',NULL,NULL,NULL,10.00,'VND',0,'2026-06-08 16:07:53','2026-06-08 16:07:53',NULL,NULL);
/*!40000 ALTER TABLE `store_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `notes` text,
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `supplier_code` varchar(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `suppliers_unique` (`supplier_code`),
  KEY `idx_suppliers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tax_records`
--

DROP TABLE IF EXISTS `tax_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `taxable_revenue` decimal(15,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `tax_amount_payable` decimal(15,2) DEFAULT NULL,
  `tax_amount_paid` decimal(15,2) DEFAULT '0.00',
  `payment_status` enum('UNPAID','PARTIAL','PAID') DEFAULT 'UNPAID',
  `submitted_at` datetime DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tax_records`
--

LOCK TABLES `tax_records` WRITE;
/*!40000 ALTER TABLE `tax_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `tax_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `full_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `phone_number` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','SUSPENDED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'ACTIVE',
  `is_removed` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `phone_number` (`phone_number`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_phone_number` (`phone_number`),
  KEY `idx_users_role` (`role_id`),
  KEY `idx_users_status` (`status`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'Chủ cửa hàng','admin','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgDwrFNfEOWxLaGRz4GnYu','0000000000','ACTIVE',0,'2026-06-08 16:07:56','2026-06-08 16:07:56',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'dbdev'
--
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-09 14:50:11
