-- V67: mô hình 4 entity, enum lưu tên dạng VARCHAR.
-- V65/V66 từng được soạn rồi gỡ; không tái sử dụng số để tránh nhầm lịch sử.
-- Áp dụng cho schema chưa có bốn bảng dưới. CREATE TABLE không IF NOT EXISTS:
-- nếu còn schema thử nghiệm cũ, dừng để đối chiếu, không bỏ qua cột/ràng buộc thiếu.
-- Nếu database đã chạy V65/V66 cũ: khôi phục migration gốc đúng checksum và
-- thiết kế chuyển đổi riêng trước khi chạy. Không sửa baseline hoặc repair để che sai lệch.
-- Không xóa tax_records hoặc dữ liệu nghiệp vụ cũ trong migration này.

CREATE TABLE business_tax_profiles (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    is_removed BIT DEFAULT 0,
    created_at DATETIME(6), updated_at DATETIME(6), created_by INT, updated_by INT,
    store_id INT NOT NULL,
    tax_year INT NOT NULL,
    tracking_started_at DATETIME(6) NULL COMMENT 'Moc su dung thuc te, nhat quan giua cac ho so nam',
    declared_method VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
    taxpayer_identity VARCHAR(30),
    taxpayer_name VARCHAR(200),
    taxpayer_address VARCHAR(500),
    tax_authority VARCHAR(255),
    invoice_registration_status VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    confirmed_by INT, confirmed_at DATETIME(6),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_business_tax_profile_year UNIQUE (store_id,tax_year),
    CONSTRAINT fk_accounting_profile_store FOREIGN KEY (store_id) REFERENCES store_config(id),
    CONSTRAINT ck_accounting_profile_year CHECK (tax_year BETWEEN 2000 AND 2100),
    CONSTRAINT ck_accounting_profile_method CHECK (declared_method IN ('UNKNOWN','REVENUE_BASED','INCOME_BASED')),
    CONSTRAINT ck_accounting_profile_invoice CHECK (invoice_registration_status IN ('UNKNOWN','NOT_REGISTERED','REGISTERED')),
    CONSTRAINT ck_accounting_profile_status CHECK (status IN ('DRAFT','CONFIRMED')),
    CONSTRAINT ck_accounting_profile_confirm CHECK (
        status <> 'CONFIRMED' OR (tracking_started_at IS NOT NULL AND confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE accounting_periods (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    is_removed BIT DEFAULT 0,
    created_at DATETIME(6), updated_at DATETIME(6), created_by INT, updated_by INT,
    profile_id INT NOT NULL,
    accounting_month INT NOT NULL,
    start_at DATETIME(6) NOT NULL,
    end_exclusive DATETIME(6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    version BIGINT NOT NULL DEFAULT 0,
    closed_by INT, closed_at DATETIME(6),
    CONSTRAINT uk_accounting_period_month UNIQUE (profile_id,accounting_month),
    CONSTRAINT fk_accounting_period_profile FOREIGN KEY (profile_id) REFERENCES business_tax_profiles(id),
    CONSTRAINT ck_accounting_period_month CHECK (accounting_month BETWEEN 1 AND 12),
    CONSTRAINT ck_accounting_period_range CHECK (start_at < end_exclusive),
    CONSTRAINT ck_accounting_period_status CHECK (status IN ('OPEN','CLOSED')),
    CONSTRAINT ck_accounting_period_close CHECK (status <> 'CLOSED' OR (closed_by IS NOT NULL AND closed_at IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE revenue_adjustments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    is_removed BIT DEFAULT 0,
    created_at DATETIME(6), updated_at DATETIME(6), created_by INT, updated_by INT,
    profile_id INT NOT NULL,
    related_period_id INT NULL COMMENT 'Ky lien quan sai sot, khong phai ky ghi so',
    source_type VARCHAR(30) NOT NULL,
    source_id INT NULL,
    occurred_at DATETIME(6) NOT NULL,
    posting_date DATE NOT NULL,
    signed_amount DECIMAL(19,2) NOT NULL,
    classification VARCHAR(30) NOT NULL,
    inclusion_reason VARCHAR(1000) NOT NULL,
    evidence LONGTEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    approved_by INT, approved_at DATETIME(6),
    original_adjustment_id INT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_revenue_adjustment_request UNIQUE (profile_id,idempotency_key),
    CONSTRAINT fk_accounting_adjustment_profile FOREIGN KEY (profile_id) REFERENCES business_tax_profiles(id),
    CONSTRAINT fk_accounting_adjustment_period FOREIGN KEY (related_period_id) REFERENCES accounting_periods(id),
    CONSTRAINT fk_accounting_adjustment_original FOREIGN KEY (original_adjustment_id) REFERENCES revenue_adjustments(id),
    CONSTRAINT ck_accounting_adjustment_source CHECK (source_type IN ('SALES_ORDER','RETURN_ORDER','REVENUE_ADJUSTMENT')),
    CONSTRAINT ck_accounting_adjustment_class CHECK (classification IN ('SALE','RETURN','OTHER_REVENUE','CORRECTION','EXCLUDED')),
    CONSTRAINT ck_accounting_adjustment_status CHECK (status IN ('DRAFT','APPROVED','REJECTED')),
    CONSTRAINT ck_accounting_adjustment_approve CHECK (status <> 'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
    INDEX ix_accounting_adjustment_posting (profile_id,posting_date,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE accounting_revenue_lines (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    is_removed BIT DEFAULT 0,
    created_at DATETIME(6), updated_at DATETIME(6), created_by INT, updated_by INT,
    period_id INT NOT NULL,
    source_type VARCHAR(30) NOT NULL,
    source_id INT NOT NULL,
    source_version VARCHAR(128) NOT NULL,
    source_code VARCHAR(100),
    occurred_at DATETIME(6) NOT NULL,
    posting_date DATE NOT NULL,
    description VARCHAR(1000),
    signed_amount DECIMAL(19,2) NOT NULL,
    classification VARCHAR(30) NOT NULL,
    inclusion_reason VARCHAR(1000) NOT NULL,
    book_group_key VARCHAR(100),
    CONSTRAINT uk_accounting_revenue_source UNIQUE (source_type,source_id),
    CONSTRAINT fk_accounting_revenue_period FOREIGN KEY (period_id) REFERENCES accounting_periods(id),
    CONSTRAINT ck_accounting_revenue_source CHECK (source_type IN ('SALES_ORDER','RETURN_ORDER','REVENUE_ADJUSTMENT')),
    CONSTRAINT ck_accounting_revenue_class CHECK (classification IN ('SALE','RETURN','OTHER_REVENUE','CORRECTION','EXCLUDED')),
    INDEX ix_accounting_revenue_posting (period_id,posting_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nguon da hinh va actor ID duoc service xac minh; khong gia lap FK nguon.
-- Dong bo moc giua ho so, gio Viet Nam/ranh gioi thang, nguon cung cua hang,
-- nguon truoc moc, khoa ky va vong doi duyet can service; CHECK khong thay the chung.
