-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: dbdev
-- ------------------------------------------------------
-- Server version	8.4.10

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

--
-- Table structure for table `attributes`
--

DROP TABLE IF EXISTS `attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attributes` (
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `name` varchar(60) NOT NULL,
  PRIMARY KEY (`id`)
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
  `created_by` int DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `updated_by` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `action_type` varchar(50) DEFAULT NULL,
  `entity_name` varchar(60) DEFAULT NULL,
  `new_value` tinytext,
  `old_value` tinytext,
  PRIMARY KEY (`id`),
  KEY `FKjs4iimve3y0xssbtve5ysyef0` (`user_id`),
  CONSTRAINT `FKjs4iimve3y0xssbtve5ysyef0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
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
  `batch_id` int NOT NULL,
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `location_id` int NOT NULL,
  `quantity` int DEFAULT '0',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK953j92kwcpseuw706gbk1vm1o` (`batch_id`),
  KEY `FK3oxe47ikk9xu4p1s0h2d0ggju` (`location_id`),
  CONSTRAINT `FK3oxe47ikk9xu4p1s0h2d0ggju` FOREIGN KEY (`location_id`) REFERENCES `storage_locations` (`id`),
  CONSTRAINT `FK953j92kwcpseuw706gbk1vm1o` FOREIGN KEY (`batch_id`) REFERENCES `stock_batches` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `total_debt` decimal(15,2) DEFAULT '0.00',
  `total_paid` decimal(15,2) DEFAULT '0.00',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
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
  `amount_paid` decimal(15,2) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `customer_id` int NOT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `processed_by` int DEFAULT NULL,
  `sales_order_id` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'CASH',
  `notes` tinytext,
  PRIMARY KEY (`id`),
  KEY `FK2d7swc8ly8pg9idktdccmskgp` (`customer_id`),
  KEY `FKd3tl2h35hlwq3nfnfi59jf7hv` (`sales_order_id`),
  CONSTRAINT `FK2d7swc8ly8pg9idktdccmskgp` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `FKd3tl2h35hlwq3nfnfi59jf7hv` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE SET NULL
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
  `cost_per_unit` decimal(15,2) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `import_order_id` int NOT NULL,
  `is_removed` bit(1) DEFAULT b'0',
  `line_total` decimal(15,2) DEFAULT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK38tsfqowfvuy8jkgraja3iuv5` (`import_order_id`),
  KEY `FK3mnxfhpalpqsbg24lf6or5n7b` (`product_id`),
  CONSTRAINT `FK38tsfqowfvuy8jkgraja3iuv5` FOREIGN KEY (`import_order_id`) REFERENCES `import_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK3mnxfhpalpqsbg24lf6or5n7b` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `received_date` date DEFAULT NULL,
  `supplier_id` int NOT NULL,
  `total_cost` decimal(15,2) DEFAULT '0.00',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `order_code` varchar(30) DEFAULT NULL,
  `note` tinytext,
  PRIMARY KEY (`id`),
  KEY `FK5d8le1rq70wflcxloxhwnthlt` (`supplier_id`),
  CONSTRAINT `FK5d8le1rq70wflcxloxhwnthlt` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `import_return_id` int NOT NULL,
  `is_removed` bit(1) DEFAULT b'0',
  `product_id` int NOT NULL,
  `quantity` int DEFAULT NULL,
  `return_price` decimal(15,2) DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `return_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKhi2w488xwhj7bylhww1ebpvxu` (`import_return_id`),
  KEY `FKhtgbodm2urm3meg1l77oircg1` (`product_id`),
  CONSTRAINT `FKhi2w488xwhj7bylhww1ebpvxu` FOREIGN KEY (`import_return_id`) REFERENCES `import_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FKhtgbodm2urm3meg1l77oircg1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `import_order_id` int NOT NULL,
  `is_removed` bit(1) DEFAULT b'0',
  `total_refund` decimal(15,2) DEFAULT '0.00',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `return_code` varchar(30) DEFAULT NULL,
  `note` tinytext,
  PRIMARY KEY (`id`),
  KEY `FKkw5n4klftugkwax9g9ps1p4y4` (`import_order_id`),
  CONSTRAINT `FKkw5n4klftugkwax9g9ps1p4y4` FOREIGN KEY (`import_order_id`) REFERENCES `import_orders` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_read` bit(1) DEFAULT NULL,
  `is_removed` bit(1) DEFAULT b'0',
  `notification_id` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKiuf5qgbttjq6ry57u1dni7qn4` (`notification_id`),
  KEY `FKce9mdpy7u99n8tn3s2iflds4t` (`user_id`),
  CONSTRAINT `FKce9mdpy7u99n8tn3s2iflds4t` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKiuf5qgbttjq6ry57u1dni7qn4` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `reference_id` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  `notification_type` varchar(100) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `message` tinytext,
  PRIMARY KEY (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `module` varchar(60) DEFAULT NULL,
  `code` varchar(100) DEFAULT NULL,
  `name` varchar(150) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (NULL,1,_binary '\0',NULL,NULL,NULL,'AUTH','AUTH:LOGIN','Login',NULL),(NULL,2,_binary '\0',NULL,NULL,NULL,'AUTH','AUTH:RESET_PASSWORD','Reset Password',NULL);
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_attributes`
--

DROP TABLE IF EXISTS `product_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_attributes` (
  `attribute_id` int NOT NULL,
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `product_id` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `value` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK6ksuorb5567jpa08ihcumumy1` (`attribute_id`),
  KEY `FKcex46yvx4g18b2pn09p79h1mc` (`product_id`),
  CONSTRAINT `FK6ksuorb5567jpa08ihcumumy1` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FKcex46yvx4g18b2pn09p79h1mc` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `product_id` int NOT NULL,
  `unit_base` decimal(10,4) DEFAULT '1.0000',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK5kqda142dwa9lo7vigynbg4sb` (`product_id`),
  CONSTRAINT `FK5kqda142dwa9lo7vigynbg4sb` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
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
  `category_id` int DEFAULT NULL,
  `cost_price` decimal(15,2) DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `min_stock` int DEFAULT '0',
  `selling_price` decimal(15,2) DEFAULT '0.00',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `name` varchar(200) DEFAULT NULL,
  `product_img` varchar(500) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKog2rp4qthbtt2lfyhfo32lsw9` (`category_id`),
  CONSTRAINT `FKog2rp4qthbtt2lfyhfo32lsw9` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `line_refund` decimal(15,2) DEFAULT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT NULL,
  `return_order_id` int NOT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKqghhbg8r4t36iovk7u3ttfrwb` (`product_id`),
  KEY `FK8i4y8s6m5kmd0t9xkg8wnl96j` (`return_order_id`),
  CONSTRAINT `FK8i4y8s6m5kmd0t9xkg8wnl96j` FOREIGN KEY (`return_order_id`) REFERENCES `return_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FKqghhbg8r4t36iovk7u3ttfrwb` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `refund_amount` decimal(15,2) DEFAULT '0.00',
  `sales_order_id` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `return_code` varchar(30) DEFAULT NULL,
  `note` tinytext,
  `resolution_type` tinytext,
  `return_reason` tinytext,
  PRIMARY KEY (`id`),
  KEY `FKk51ur5i7ilk21amnxdh2wj1h7` (`sales_order_id`),
  CONSTRAINT `FKk51ur5i7ilk21amnxdh2wj1h7` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`)
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
  `permission_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `FKn5fotdgk8d1xvo8nav9uv3muc` (`role_id`),
  CONSTRAINT `FKegdk29eiy7mdtefy5c7eirr6e` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`),
  CONSTRAINT `FKn5fotdgk8d1xvo8nav9uv3muc` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(2,1);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKofx66keruapi6vyqpv6f2or37` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (NULL,1,_binary '\0',NULL,NULL,NULL,'ADMIN',NULL),(NULL,2,_binary '\0',NULL,NULL,NULL,'STAFF',NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_order_details`
--

DROP TABLE IF EXISTS `sales_order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_details` (
  `created_by` int DEFAULT NULL,
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `line_total` decimal(15,2) DEFAULT NULL,
  `product_id` int NOT NULL,
  `quantity` int DEFAULT NULL,
  `sales_order_id` int NOT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKncwh5cjveg0gvgko7m77qawva` (`product_id`),
  KEY `FKpy7rkbtos35e8ajjplvcp836v` (`sales_order_id`),
  CONSTRAINT `FKncwh5cjveg0gvgko7m77qawva` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `FKpy7rkbtos35e8ajjplvcp836v` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE
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
  `created_by` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `id` int NOT NULL AUTO_INCREMENT,
  `is_debt` bit(1) DEFAULT b'0',
  `is_removed` bit(1) DEFAULT b'0',
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `order_code` varchar(30) DEFAULT NULL,
  `order_status` varchar(50) DEFAULT 'COMPLETED',
  `payment_method` varchar(50) DEFAULT 'CASH',
  `note` tinytext,
  PRIMARY KEY (`id`),
  KEY `FKfs1owechmxg3lvej5vq1s8t8i` (`customer_id`),
  CONSTRAINT `FKfs1owechmxg3lvej5vq1s8t8i` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `product_id` int NOT NULL,
  `quantity_after` int DEFAULT NULL,
  `quantity_before` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKh0emjv0ifyv4bpghf1pfcaue4` (`product_id`),
  CONSTRAINT `FKh0emjv0ifyv4bpghf1pfcaue4` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
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
  `cost_per_unit` decimal(15,2) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `import_order_id` int DEFAULT NULL,
  `is_removed` bit(1) DEFAULT b'0',
  `product_id` int NOT NULL,
  `quantity_in` int DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `batch_note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK7vmin8vgxuxipgobt9cr6tffc` (`import_order_id`),
  KEY `FKde4mxi94h28dwxdtr6lg8umfs` (`product_id`),
  CONSTRAINT `FK7vmin8vgxuxipgobt9cr6tffc` FOREIGN KEY (`import_order_id`) REFERENCES `import_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FKde4mxi94h28dwxdtr6lg8umfs` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `quantity_delta` int DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `stock_after` int DEFAULT NULL,
  `stock_batch_id` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `movement_type` varchar(40) DEFAULT NULL,
  `reference_type` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKp51h136u1l8y5xchtxickoaxl` (`stock_batch_id`),
  CONSTRAINT `FKp51h136u1l8y5xchtxickoaxl` FOREIGN KEY (`stock_batch_id`) REFERENCES `stock_batches` (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_active` bit(1) DEFAULT b'1',
  `is_removed` bit(1) DEFAULT b'0',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `aisle` varchar(20) DEFAULT NULL,
  `bin` varchar(20) DEFAULT NULL,
  `shelf` varchar(20) DEFAULT NULL,
  `label` varchar(50) NOT NULL,
  `zone` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `tax_rate` decimal(5,2) DEFAULT '10.00',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'VND',
  `tax_code` varchar(20) DEFAULT NULL,
  `owner_full_name` varchar(100) DEFAULT NULL,
  `store_name` varchar(200) NOT NULL DEFAULT 'Cửa hàng tạp hóa Đức Thắng',
  `address` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_config`
--

LOCK TABLES `store_config` WRITE;
/*!40000 ALTER TABLE `store_config` DISABLE KEYS */;
INSERT INTO `store_config` VALUES (NULL,1,_binary '\0',1.50,NULL,NULL,NULL,'VND','0999999999','Le Thang','Cửa hàng Đức Thắng','Ha Noi');
/*!40000 ALTER TABLE `store_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_payments`
--

DROP TABLE IF EXISTS `supplier_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `is_removed` bit(1) DEFAULT b'0',
  `updated_at` datetime(6) DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `payment_code` varchar(30) NOT NULL,
  `payment_date` datetime(6) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'CASH',
  `import_order_id` int DEFAULT NULL,
  `supplier_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKd2weihl6bepfbt1di7rvtxt39` (`import_order_id`),
  KEY `FKdwv3fhnvnbuvd6h2ri8iuiw2q` (`supplier_id`),
  CONSTRAINT `FKd2weihl6bepfbt1di7rvtxt39` FOREIGN KEY (`import_order_id`) REFERENCES `import_orders` (`id`),
  CONSTRAINT `FKdwv3fhnvnbuvd6h2ri8iuiw2q` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_payments`
--

LOCK TABLES `supplier_payments` WRITE;
/*!40000 ALTER TABLE `supplier_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `supplier_code` varchar(30) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `notes` tinytext,
  PRIMARY KEY (`id`)
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `period_end` date DEFAULT NULL,
  `period_start` date DEFAULT NULL,
  `tax_amount_paid` decimal(15,2) DEFAULT '0.00',
  `tax_amount_payable` decimal(15,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `taxable_revenue` decimal(15,2) DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `submitted_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `payment_status` varchar(30) DEFAULT 'UNPAID',
  `notes` tinytext,
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
  `created_by` int DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `is_removed` bit(1) DEFAULT b'0',
  `updated_by` int DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'ACTIVE',
  `username` varchar(50) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK9q63snka3mdh91as4io72espi` (`phone_number`),
  UNIQUE KEY `UKr43af9ap4edm43mmtq01oddj6` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (NULL,1,_binary '\0',NULL,'2026-06-09 16:07:56.000000','2026-06-18 13:29:02.000000','0901234573','ACTIVE','test123','Hồ Huy Thành','$2a$10$vPWDXVGwlcy9CkI4GyoG7ezYjUsZT2q6owkXtjDKgRDzPzNAdOeSq');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_roles`
--

DROP TABLE IF EXISTS `users_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_roles` (
  `roles_id` int NOT NULL,
  `users_id` int NOT NULL,
  PRIMARY KEY (`roles_id`,`users_id`),
  KEY `FKml90kef4w2jy7oxyqv742tsfc` (`users_id`),
  CONSTRAINT `FKa62j07k5mhgifpp955h37ponj` FOREIGN KEY (`roles_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `FKml90kef4w2jy7oxyqv742tsfc` FOREIGN KEY (`users_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_roles`
--

LOCK TABLES `users_roles` WRITE;
/*!40000 ALTER TABLE `users_roles` DISABLE KEYS */;
INSERT INTO `users_roles` VALUES (1,1);
/*!40000 ALTER TABLE `users_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'dbdev'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-23 21:19:47
