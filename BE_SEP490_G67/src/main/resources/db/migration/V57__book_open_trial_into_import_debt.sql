-- Phiếu bán thử OPEN cũ: line_total = 0 nên chưa vào công nợ.
-- Cộng giá trị thỏa thuận vào dòng và total_cost phiếu.

UPDATE import_orders o
INNER JOIN (
    SELECT
        d.import_order_id,
        SUM(
            (COALESCE(d.cost_per_unit, 0) * COALESCE(d.quantity, 0))
            - COALESCE(d.line_total, 0)
        ) AS delta
    FROM import_order_details d
    WHERE d.line_type = 'TRIAL'
      AND d.trial_status = 'OPEN'
      AND (d.is_removed = 0 OR d.is_removed IS NULL)
      AND (COALESCE(d.cost_per_unit, 0) * COALESCE(d.quantity, 0)) > COALESCE(d.line_total, 0)
    GROUP BY d.import_order_id
) t ON t.import_order_id = o.id
SET o.total_cost = COALESCE(o.total_cost, 0) + t.delta
WHERE (o.is_removed = 0 OR o.is_removed IS NULL)
  AND t.delta > 0;

UPDATE import_order_details
SET line_total = COALESCE(cost_per_unit, 0) * COALESCE(quantity, 0)
WHERE line_type = 'TRIAL'
  AND trial_status = 'OPEN'
  AND (is_removed = 0 OR is_removed IS NULL)
  AND COALESCE(line_total, 0) < (COALESCE(cost_per_unit, 0) * COALESCE(quantity, 0));
