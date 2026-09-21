-- Audit snapshots for tax profiles and accounting entries can contain
-- structured values longer than the legacy VARCHAR/TEXT column size.
-- Keep the database aligned with AuditLog.@Lob oldValue/newValue fields.
ALTER TABLE audit_logs
    MODIFY COLUMN old_value LONGTEXT NULL,
    MODIFY COLUMN new_value LONGTEXT NULL;
