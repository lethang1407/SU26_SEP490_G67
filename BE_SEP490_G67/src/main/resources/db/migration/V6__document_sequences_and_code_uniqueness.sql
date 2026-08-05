-- ============================================================
-- V6: Human-readable document codes (redesign v3 §9).
--
--     Replaces the random truncated-UUID codes
--       SalesOrderService:   "SO-" + UUID(8)
--       ExchangeOrderService "RT-" + UUID(8)
--     with {PREFIX}-{STORE}-{yyMMdd}-{SEQ}, e.g. HD-01-260803-0042.
--     A code then answers, without a lookup: what kind of document,
--     which store, which day, and which number that day.
--
--     document_sequences holds one counter row per
--     (store_id, doc_type, seq_date). DocumentCodeService takes a row
--     lock on it (SELECT ... FOR UPDATE) and increments inside the same
--     transaction as the document insert, so two tills cannot mint the
--     same number.
--
--     store_id: this build is SINGLE-STORE. There is no `stores` table
--     and sales_orders has no store_id — `store_config` is one config
--     row. The column is kept (the code format reserves a store segment
--     and the design anticipates branches) but deliberately carries NO
--     foreign key, because there is nothing to reference yet. It is
--     populated from store_config.id, which is always 1 today.
--
--     Existing SO-/RT- codes are NOT rewritten. Reprinting a document
--     with a different code than the one the customer holds would defeat
--     the point of having stable codes (v3 §9.4 rule 5).
--
--     Guarded with information_schema checks, same as V4/V5.
-- ============================================================

CREATE TABLE IF NOT EXISTS document_sequences (
    id         INT NOT NULL AUTO_INCREMENT,
    store_id   INT NOT NULL,
    doc_type   VARCHAR(30) NOT NULL,
    seq_date   DATE NOT NULL,
    counter    INT NOT NULL DEFAULT 0,
    is_removed BIT(1) DEFAULT b'0',
    created_at DATETIME(6) DEFAULT NULL,
    updated_at DATETIME(6) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    updated_by INT DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY UK_document_sequences_slot (store_id, doc_type, seq_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- Unique codes. MySQL treats NULLs as distinct in a unique index, so
-- legacy rows with a NULL code are unaffected.
--
-- If either statement fails, the database already contains DUPLICATE
-- non-null codes — which is exactly the collision risk a truncated UUID
-- carries with no constraint behind it. Resolve the duplicates by hand
-- before re-running; do not drop the constraint.
-- ------------------------------------------------------------

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sales_orders'
      AND INDEX_NAME = 'UK_sales_orders_order_code'
);
SET @sql := IF(@idx_exists = 0,
    'ALTER TABLE sales_orders ADD CONSTRAINT UK_sales_orders_order_code UNIQUE (order_code)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND INDEX_NAME = 'UK_return_orders_return_code'
);
SET @sql := IF(@idx_exists = 0,
    'ALTER TABLE return_orders ADD CONSTRAINT UK_return_orders_return_code UNIQUE (return_code)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
