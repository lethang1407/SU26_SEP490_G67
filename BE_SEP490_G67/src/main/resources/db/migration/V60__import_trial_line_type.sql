-- V60 (trước là V56): hàng bán thử — loại dòng, trạng thái quyết toán, gắn lô, sổ quyết toán.

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_order_details'
      AND COLUMN_NAME = 'line_type'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_order_details ADD COLUMN line_type VARCHAR(20) NOT NULL DEFAULT ''REGULAR'' AFTER is_promotion',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE import_order_details
SET line_type = 'PROMOTION'
WHERE is_promotion = 1
  AND (line_type IS NULL OR line_type = 'REGULAR');

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'import_order_details'
      AND COLUMN_NAME = 'trial_status'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE import_order_details ADD COLUMN trial_status VARCHAR(20) NULL AFTER line_type',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_batches'
      AND COLUMN_NAME = 'is_trial'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE stock_batches ADD COLUMN is_trial TINYINT(1) NOT NULL DEFAULT 0 AFTER batch_note',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_batches'
      AND COLUMN_NAME = 'import_order_detail_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE stock_batches ADD COLUMN import_order_detail_id INT NULL AFTER import_order_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stock_batches'
      AND CONSTRAINT_NAME = 'fk_stock_batches_import_detail'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE stock_batches ADD CONSTRAINT fk_stock_batches_import_detail FOREIGN KEY (import_order_detail_id) REFERENCES import_order_details (id) ON DELETE SET NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS import_trial_settlements (
    id INT NOT NULL AUTO_INCREMENT,
    import_order_id INT NOT NULL,
    supplier_id INT NOT NULL,
    payable_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    note VARCHAR(500) NULL,
    is_removed BIT(1) DEFAULT b'0',
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by INT NULL,
    updated_by INT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_trial_settle_import_order FOREIGN KEY (import_order_id) REFERENCES import_orders (id),
    CONSTRAINT fk_trial_settle_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_trial_settlement_lines (
    id INT NOT NULL AUTO_INCREMENT,
    settlement_id INT NOT NULL,
    import_order_detail_id INT NOT NULL,
    stock_batch_id INT NULL,
    product_id INT NOT NULL,
    received_qty INT NOT NULL,
    system_remaining_qty INT NOT NULL,
    counted_remaining_qty INT NOT NULL,
    unsellable_qty INT NOT NULL DEFAULT 0,
    returned_qty INT NOT NULL DEFAULT 0,
    payable_qty INT NOT NULL DEFAULT 0,
    decision VARCHAR(40) NOT NULL,
    cost_per_unit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    payable_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    is_removed BIT(1) DEFAULT b'0',
    created_at DATETIME(6) NULL,
    updated_at DATETIME(6) NULL,
    created_by INT NULL,
    updated_by INT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_trial_settle_line_header FOREIGN KEY (settlement_id) REFERENCES import_trial_settlements (id) ON DELETE CASCADE,
    CONSTRAINT fk_trial_settle_line_detail FOREIGN KEY (import_order_detail_id) REFERENCES import_order_details (id),
    CONSTRAINT fk_trial_settle_line_batch FOREIGN KEY (stock_batch_id) REFERENCES stock_batches (id),
    CONSTRAINT fk_trial_settle_line_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
