-- ============================================================
-- V33: Create api_endpoint_permissions table for dynamic API authorization.
-- ============================================================

CREATE TABLE IF NOT EXISTS api_endpoint_permissions (
    id INT NOT NULL AUTO_INCREMENT,
    http_method VARCHAR(10) NOT NULL,
    url_pattern VARCHAR(255) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_removed BIT(1) DEFAULT b'0',
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by INT NULL,
    updated_by INT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
