-- Bỏ store_id khỏi document_sequences.
--
-- V16 giữ cột này để dành cho trường hợp sau này có nhiều chi nhánh, và mã
-- chứng từ khi đó có một đoạn dành cho mã cửa hàng. Format mã nay đã bỏ đoạn
-- đó ({PREFIX}-{yyMMdd}-{SEQ}), bản dựng vẫn là một cửa hàng duy nhất, nên cột
-- không còn tác dụng gì ngoài việc làm khóa duy nhất phức tạp thêm.
--
-- Ba bước, mỗi bước đều có guard để chạy lại được:
--   1. Gộp các dòng trùng (doc_type, seq_date) của nhiều cửa hàng, giữ counter
--      lớn nhất — nếu không khóa duy nhất mới sẽ dựng không lên.
--   2. Bỏ khóa duy nhất cũ, dựng lại theo (doc_type, seq_date).
--   3. Bỏ cột.

-- ---------- 1. Gộp dòng trùng, giữ counter lớn nhất ----------
-- Giữ counter lớn nhất chứ không cộng dồn: counter là số cuối cùng đã cấp, lấy
-- max đảm bảo mã tiếp theo không đụng mã nào đã phát hành.
UPDATE document_sequences ds
JOIN (
    SELECT doc_type, seq_date, MIN(id) AS keep_id, MAX(counter) AS max_counter
    FROM document_sequences
    GROUP BY doc_type, seq_date
) agg ON ds.id = agg.keep_id
SET ds.counter = agg.max_counter;

DELETE ds FROM document_sequences ds
JOIN (
    SELECT doc_type, seq_date, MIN(id) AS keep_id
    FROM document_sequences
    GROUP BY doc_type, seq_date
) agg ON ds.doc_type = agg.doc_type
     AND ds.seq_date = agg.seq_date
     AND ds.id <> agg.keep_id;

-- ---------- 2. Dựng lại khóa duy nhất ----------
SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document_sequences'
      AND INDEX_NAME = 'UK_document_sequences_slot'
);
SET @sql := IF(@idx_exists > 0,
    'ALTER TABLE document_sequences DROP INDEX UK_document_sequences_slot',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE document_sequences
    ADD CONSTRAINT UK_document_sequences_slot UNIQUE (doc_type, seq_date);

-- ---------- 3. Bỏ cột ----------
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document_sequences'
      AND COLUMN_NAME = 'store_id'
);
SET @sql := IF(@col_exists > 0,
    'ALTER TABLE document_sequences DROP COLUMN store_id',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
