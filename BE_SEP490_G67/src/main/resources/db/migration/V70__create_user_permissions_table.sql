-- Create user_permissions table for custom permissions assigned to users
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `user_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`user_id`, `permission_id`),
  KEY `FK_user_permissions_permission` (`permission_id`),
  CONSTRAINT `FK_user_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_user_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
