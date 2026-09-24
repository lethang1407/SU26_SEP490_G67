-- V77: bổ sung phạm vi kỳ và bản tính nghĩa vụ thuế năm.
-- Dữ liệu kỳ hiện có được giữ lại với period_scope = SYSTEM.

-- MySQL phiên bản cũ không hỗ trợ ADD COLUMN IF NOT EXISTS.
-- Kiểm tra metadata để migration có thể chạy lại sau lần thất bại trước.
SET @period_scope_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'accounting_periods'
      AND column_name = 'period_scope'
);
SET @add_period_scope_sql := IF(
    @period_scope_exists = 0,
    'ALTER TABLE accounting_periods ADD COLUMN period_scope VARCHAR(30) NOT NULL DEFAULT ''SYSTEM'' AFTER profile_id',
    'SELECT 1'
);
PREPARE add_period_scope_stmt FROM @add_period_scope_sql;
EXECUTE add_period_scope_stmt;
DEALLOCATE PREPARE add_period_scope_stmt;

SET @period_scope_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'accounting_periods'
      AND index_name = 'uk_accounting_period_scope_month'
);
SET @add_period_scope_constraint_sql := IF(
    @period_scope_index_exists = 0,
    'ALTER TABLE accounting_periods ADD CONSTRAINT uk_accounting_period_scope_month UNIQUE (profile_id, accounting_month, period_scope), ADD CONSTRAINT ck_accounting_period_scope CHECK (period_scope IN (''SYSTEM'', ''HISTORICAL_SUPPLEMENT''))',
    'SELECT 1'
);
PREPARE add_period_scope_constraint_stmt FROM @add_period_scope_constraint_sql;
EXECUTE add_period_scope_constraint_stmt;
DEALLOCATE PREPARE add_period_scope_constraint_stmt;

-- Giữ uk_accounting_period_month trong V77 vì database thực tế có khóa ngoại
-- đang phụ thuộc vào index này. Không được tự ý DROP INDEX khi chưa xác định
-- và chuyển toàn bộ khóa ngoại phụ thuộc. Do đó V77 vẫn bảo toàn dữ liệu cũ;
-- migration chuyển đổi riêng sẽ xử lý khả năng cùng tháng ở hai scope sau.

CREATE TABLE IF NOT EXISTS tax_records (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    is_removed BIT DEFAULT 0,
    created_at DATETIME(6), updated_at DATETIME(6), created_by INT, updated_by INT,
    profile_id INT NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'YEAR',
    revenue_base DECIMAL(19,2) NOT NULL DEFAULT 0,
    revenue_threshold DECIMAL(19,2) NOT NULL DEFAULT 0,
    vat_rate DECIMAL(7,4) NOT NULL DEFAULT 0,
    pit_rate DECIMAL(7,4) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(19,2) NOT NULL DEFAULT 0,
    pit_amount DECIMAL(19,2) NOT NULL DEFAULT 0,
    total_tax_amount DECIMAL(19,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    due_date DATE NULL,
    calculated_at DATETIME(6) NULL,
    confirmed_at DATETIME(6) NULL,
    legal_version VARCHAR(100) NULL,
    template_version VARCHAR(100) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_tax_record_profile_period UNIQUE (profile_id, period_type),
    CONSTRAINT fk_tax_record_profile FOREIGN KEY (profile_id) REFERENCES business_tax_profiles(id),
    CONSTRAINT ck_tax_record_period_type CHECK (period_type IN ('YEAR', 'FIRST_HALF', 'SECOND_HALF')),
    CONSTRAINT ck_tax_record_status CHECK (status IN ('DRAFT', 'CALCULATED', 'CONFIRMED', 'NO_TAX_PAYABLE')),
    CONSTRAINT ck_tax_record_amounts CHECK (revenue_base >= 0 AND revenue_threshold >= 0
        AND vat_rate >= 0 AND pit_rate >= 0 AND vat_amount >= 0 AND pit_amount >= 0 AND total_tax_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
