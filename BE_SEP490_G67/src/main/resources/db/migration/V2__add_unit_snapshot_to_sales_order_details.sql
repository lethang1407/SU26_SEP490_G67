-- ============================================================
-- V1: Add unit snapshot columns to sales_order_details
--     UC-40/41: cashier selects unit at POS -> backend resolves
--               name and stores it as an immutable snapshot.
--     product_unit_id  kept for traceability (FK, nullable)
--     unit_name        denormalized copy - MUST NOT be updated
--                      after the order is created.
-- ============================================================

ALTER TABLE sales_order_details
    ADD COLUMN product_unit_id INT NULL AFTER product_id,
    ADD COLUMN unit_name       VARCHAR(50) NULL AFTER quantity,
    ADD CONSTRAINT FK_sod_product_unit
        FOREIGN KEY (product_unit_id)
        REFERENCES product_units(id)
        ON DELETE SET NULL;
