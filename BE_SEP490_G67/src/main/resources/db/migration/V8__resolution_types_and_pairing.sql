-- ============================================================
-- V8: Per-line resolution types and line-to-line pairing
--     (redesign v3 §2, §3, §5).
--
--     Replaces the single free-text return_orders.resolution_type — which
--     v1 hardcoded to "EXCHANGE" for every transaction — with a per-LINE
--     enum. A single visit legitimately mixes resolutions: the customer
--     returns item 3 for cash AND swaps item 2 for another brand. A
--     per-visit type cannot express that.
--
--     paired_out_detail_id answers "which item replaced which": it points
--     at the replacement line on the outgoing invoice. NULL for REFUND and
--     STORE_CREDIT, required for EXCHANGE_*.
--
--     Guarded with information_schema checks, same as V4-V7.
-- ============================================================

-- ------------------------------------------------------------
-- return_order_details.resolution_type
--
-- Added NULLABLE first, backfilled, and only then made NOT NULL.
-- Existing rows have no resolution recorded: v1 wrote a single
-- hardcoded value on the PARENT row and nothing per line. They are
-- backfilled from that parent value, defaulting to REFUND, which is the
-- resolution that makes no claim about a replacement line — the one
-- thing we can be sure legacy rows do not have.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'resolution_type'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_order_details ADD COLUMN resolution_type VARCHAR(20) NULL AFTER unit_name',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE return_order_details rod
JOIN return_orders ro ON ro.id = rod.return_order_id
SET rod.resolution_type = CASE
        WHEN ro.resolution_type LIKE '%EXCHANGE%' THEN 'EXCHANGE_EVEN'
        ELSE 'REFUND'
    END
WHERE rod.resolution_type IS NULL;

ALTER TABLE return_order_details MODIFY COLUMN resolution_type VARCHAR(20) NOT NULL;

-- ------------------------------------------------------------
-- return_order_details.paired_out_detail_id
--
-- UNIQUE: one outgoing line may be the replacement of at most one
-- returned line. MySQL does not compare NULLs in a unique index, so the
-- many REFUND / STORE_CREDIT rows that leave it NULL do not collide —
-- do NOT "fix" this by making the column NOT NULL.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND COLUMN_NAME = 'paired_out_detail_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_order_details ADD COLUMN paired_out_detail_id INT NULL AFTER resolution_type',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND INDEX_NAME = 'UK_rod_paired_out_detail'
);
SET @sql := IF(@idx_exists = 0,
    'ALTER TABLE return_order_details
        ADD CONSTRAINT UK_rod_paired_out_detail UNIQUE (paired_out_detail_id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_order_details'
      AND CONSTRAINT_NAME = 'FK_rod_paired_out_detail'
);
SET @sql := IF(@fk_exists = 0,
    'ALTER TABLE return_order_details
        ADD CONSTRAINT FK_rod_paired_out_detail
        FOREIGN KEY (paired_out_detail_id) REFERENCES sales_order_details(id)',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- return_orders: bearer identity (§5)
--
-- The invoice line is the authority; the bearer is recorded but grants
-- nothing. bearer_is_owner is computed and STORED at transaction time —
-- recomputing it later would give a different answer if the customer
-- record changes.
--
-- §11.2 also called for a denormalised `original_document_code`. It is
-- deliberately NOT here: sales_order_id already reaches the original invoice
-- code, and one varchar cannot hold the several codes a multi-invoice visit
-- (§6.4) would need — so it does not serve the case it was added for. Read
-- the code through the join.
-- ------------------------------------------------------------

SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'return_orders'
      AND COLUMN_NAME = 'bearer_name'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE return_orders
        ADD COLUMN bearer_name            VARCHAR(100) NULL,
        ADD COLUMN bearer_phone           VARCHAR(15)  NULL,
        ADD COLUMN bearer_is_owner        BIT(1)       NULL,
        ADD COLUMN approved_by            INT          NULL',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- return_orders.sales_order_id becomes NULLABLE (§6.4)
--
-- A visit can involve items from several invoices, so the link belongs
-- on the DETAIL row (sales_order_detail_id, added in V7). The parent
-- column stays as an advisory pointer to the first source invoice.
-- ------------------------------------------------------------

ALTER TABLE return_orders MODIFY COLUMN sales_order_id INT NULL;
