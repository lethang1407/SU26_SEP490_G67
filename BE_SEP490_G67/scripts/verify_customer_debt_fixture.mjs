// Integration verification in an explicitly isolated Docker database only.
// node scripts/verify_customer_debt_fixture.mjs <container> [mysql|mariadb]
// Container must mount dump read-only at /input/db_schema.sql and workspace at /workspace.
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const container = process.argv[2];
const client = process.argv[3] || 'mysql';
assert.match(container || '', /^codex-debt-fixture-20260925(?:-maria)?$/);
assert.ok(['mysql', 'mariadb'].includes(client));
const db = 'debt_fixture';
function sql(query, allowFailure = false) {
  const r = spawnSync('docker', ['exec', '-i', container, client,
    '-uroot', '--default-character-set=utf8mb4', '--batch', '--raw', '--skip-column-names', db],
  { input: query, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (!allowFailure) assert.equal(r.status, 0, r.stderr || r.error?.message);
  return r;
}
function scalar(query) { return Number(sql(query).stdout.trim()); }
function zero(name, query) { assert.equal(scalar(query), 0, name); console.log(`PASS ${name}`); }
function restore() { sql('SOURCE /input/db_schema.sql;'); }
function seed(allowFailure = false) {
  return sql(readFileSync(new URL('../customer_debt_display_cases.sql', import.meta.url), 'utf8'), allowFailure);
}
function tablesSnapshot() {
  const tables = sql(`SELECT table_name FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name`).stdout.trim().split('\n');
  const output = sql(tables.map(t => `SELECT '__FIXTURE_TABLE__${t}'; SELECT * FROM \`${t}\`;`).join('\n')).stdout;
  return new Map(output.split('__FIXTURE_TABLE__').slice(1).map(section => {
    const end = section.indexOf('\n');
    return [section.slice(0, end), section.slice(end + 1)];
  }));
}
function sameSnapshots(before, after, except = []) {
  for (const [t, rows] of before) if (!except.includes(t)) assert.equal(after.get(t), rows, `table ${t}`);
}

restore();
const before = tablesSnapshot();
assert.equal(scalar('SELECT COUNT(*) FROM customers'), 12);
assert.equal(scalar('SELECT SUM(total_debt) FROM customers'), 250000);
console.log('PASS baseline: 12 customers, 250000 debt');

// Force a late transaction failure, after customer/import/sales/stock inserts.
sql(`CREATE TRIGGER fixture_test_fail BEFORE INSERT ON debt_payments FOR EACH ROW
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FIXTURE_TEST_ROLLBACK';`);
const failed = seed(true);
assert.match(failed.stderr, /FIXTURE_TEST_ROLLBACK/);
sql('DROP TRIGGER fixture_test_fail;');
sameSnapshots(before, tablesSnapshot());
console.log('PASS rollback after late failure preserves every original row');

const ok = seed();
assert.match(ok.stdout, /OK: V2/);
assert.equal(scalar('SELECT COUNT(*) FROM customers'), 18);
assert.equal(scalar('SELECT SUM(total_debt) FROM customers'), 481000);
const after = tablesSnapshot();
for (const [t, rows] of before) {
  if (t === 'document_sequences') continue; // Expected: reserve invoice numbers.
  const originalRows = rows.split('\n').filter(Boolean);
  const newRows = new Set(after.get(t).split('\n'));
  for (const row of originalRows) assert.ok(newRows.has(row), `changed original row in ${t}`);
}
console.log('PASS all original business rows preserved (sequence counters intentionally advance)');

zero('customer balances match all debt orders', `SELECT COUNT(*) FROM customers c
 LEFT JOIN (SELECT s.customer_id,SUM(GREATEST(0,s.total_amount-s.paid_amount-COALESCE(p.paid,0))) balance
 FROM sales_orders s LEFT JOIN (SELECT sales_order_id,SUM(amount_paid) paid FROM debt_payments
 GROUP BY sales_order_id) p ON p.sales_order_id=s.id WHERE s.is_debt=1 GROUP BY s.customer_id) b
 ON b.customer_id=c.id WHERE c.total_debt<>COALESCE(b.balance,0)`);
zero('sale details, units, batch and arithmetic', `SELECT COUNT(*) FROM sales_order_details d
 JOIN sales_orders s ON s.id=d.sales_order_id JOIN product_units u ON u.id=d.product_unit_id
 JOIN stock_batches b ON b.id=d.stock_batch_id
 WHERE s.note LIKE '[DEBT-DEMO-V2]%' AND (u.product_id<>d.product_id OR b.product_id<>d.product_id
 OR d.unit_name<>u.name OR d.unit_price<>u.selling_price
 OR d.line_total<>d.quantity*d.unit_price-d.discount_amount OR s.subtotal<>d.line_total
 OR s.total_amount<>s.subtotal-s.discount_amount)`);
zero('payment ownership, chronology and no overpayment', `SELECT COUNT(*) FROM debt_payments d
 JOIN sales_orders s ON s.id=d.sales_order_id WHERE d.notes LIKE '[DEBT-DEMO-V2]%'
 AND (d.customer_id<>s.customer_id OR d.created_at<s.created_at OR d.amount_paid<=0
 OR s.total_amount<s.paid_amount+(SELECT SUM(p.amount_paid) FROM debt_payments p WHERE p.sales_order_id=s.id))`);
zero('customer, import, sale and due dates ordered', `SELECT COUNT(*) FROM sales_orders s
 JOIN customers c ON c.id=s.customer_id JOIN sales_order_details d ON d.sales_order_id=s.id
 JOIN stock_batches b ON b.id=d.stock_batch_id WHERE s.note LIKE '[DEBT-DEMO-V2]%'
 AND (s.created_at<c.created_at OR s.created_at<b.created_at OR s.due_date<=s.created_at)`);
zero('running inventory movement balances', `SELECT COUNT(*) FROM (
 SELECT m.stock_after,SUM(m.quantity_delta) OVER(PARTITION BY m.batch_location_id
 ORDER BY m.created_at,m.id ROWS UNBOUNDED PRECEDING) actual
 FROM stock_movements m JOIN stock_batches b ON b.id=m.stock_batch_id
 WHERE b.batch_note LIKE '[DEBT-DEMO-V2]%') x WHERE stock_after<>actual OR actual<0`);
zero('batch equals location equals net movements', `SELECT COUNT(*) FROM stock_batches b
 WHERE b.batch_note LIKE '[DEBT-DEMO-V2]%' AND (b.quantity_in<>20
 OR b.quantity_in<>(SELECT SUM(quantity) FROM batch_locations WHERE batch_id=b.id)
 OR b.quantity_in<>(SELECT SUM(quantity_delta) FROM stock_movements WHERE stock_batch_id=b.id))`);
zero('supplier settled and import unit conversion correct', `SELECT COUNT(*) FROM import_orders i
 JOIN import_order_details d ON d.import_order_id=i.id JOIN stock_batches b ON b.import_order_detail_id=d.id
 JOIN product_units u ON u.id=d.product_unit_id WHERE i.note LIKE '[DEBT-DEMO-V2]%'
 AND (i.total_cost<>460000 OR d.line_total<>d.quantity*d.cost_per_unit
 OR d.quantity*u.unit_base<>48 OR b.cost_per_unit<>ROUND(d.cost_per_unit/u.unit_base,2)
 OR i.total_cost<>(SELECT SUM(amount) FROM supplier_payments WHERE import_order_id=i.id))`);

// Every physical foreign key, including untouched tables: no orphan references.
const fks = sql(`SELECT table_name,column_name,referenced_table_name,referenced_column_name
 FROM information_schema.key_column_usage WHERE table_schema=DATABASE()
 AND referenced_table_name IS NOT NULL`).stdout.trim().split('\n');
const fkQueries = fks.map(fk => {
  const [t, c, rt, rc] = fk.split('\t');
  return `SELECT '${t}.${c}' fk,COUNT(*) missing FROM \`${t}\` a LEFT JOIN \`${rt}\` b
 ON a.\`${c}\`=b.\`${rc}\` WHERE a.\`${c}\` IS NOT NULL AND b.\`${rc}\` IS NULL HAVING COUNT(*)>0`;
});
assert.equal(sql(fkQueries.join(' UNION ALL ')).stdout.trim(), '', 'orphan foreign keys');
console.log(`PASS ${fks.length} foreign key references`);

const countCases = scalar(`SELECT COUNT(DISTINCT CONCAT(c.allow_debt+0,':',
 CASE WHEN EXISTS (SELECT 1 FROM sales_orders s WHERE s.customer_id=c.id AND s.is_debt=1
 AND s.due_date<'2026-09-25 06:00:00' AND s.total_amount>s.paid_amount+
 (SELECT COALESCE(SUM(d.amount_paid),0) FROM debt_payments d WHERE d.sales_order_id=s.id))
 THEN 'OVERDUE' WHEN c.total_debt>0 THEN 'IN_DEBT' ELSE 'NO_DEBT' END))
 FROM customers c WHERE c.is_removed=0`);
assert.equal(countCases, 6);
assert.equal(scalar('SELECT COUNT(*) FROM customers WHERE is_check_unstable_debt=1'), 2);
assert.equal(scalar(`SELECT SUM(amount_paid) FROM debt_payments
 WHERE created_at>='2026-09-24 17:00:00' AND created_at<'2026-09-25 17:00:00'`), 66000);
assert.equal(scalar(`SELECT COUNT(*) FROM sales_orders WHERE is_debt=1
 AND created_at>='2026-09-24 17:00:00' AND created_at<'2026-09-25 17:00:00'`), 2);
assert.equal(sql(`SELECT COUNT(DISTINCT s.customer_id),SUM(s.total_amount<=s.paid_amount+paid.amount),
 SUM(s.total_amount>s.paid_amount+paid.amount) FROM sales_orders s
 JOIN (SELECT sales_order_id,SUM(amount_paid) amount FROM debt_payments GROUP BY sales_order_id) paid
 ON paid.sales_order_id=s.id WHERE EXISTS (SELECT 1 FROM debt_payments p WHERE p.sales_order_id=s.id
 AND p.created_at>='2026-09-24 17:00:00' AND p.created_at<'2026-09-25 17:00:00')`).stdout.trim(), '2\t1\t1');
assert.equal(scalar(`SELECT SUM(s.total_amount-s.paid_amount-COALESCE(p.amount,0)) FROM sales_orders s
 LEFT JOIN (SELECT sales_order_id,SUM(amount_paid) amount FROM debt_payments GROUP BY sales_order_id) p
 ON p.sales_order_id=s.id WHERE s.is_debt=1 AND s.created_by=2
 AND s.created_at>='2026-09-24 17:00:00' AND s.created_at<'2026-09-25 17:00:00'`), 66000);
console.log('PASS six display combinations, review with/without debt, today sales and collections');

const rerun = seed();
assert.match(rerun.stdout, /SKIPPED/);
sameSnapshots(after, tablesSnapshot());
console.log('PASS rerun leaves every row and balance unchanged');

// Negative preflight cases in the same disposable DB, restoring afterwards.
restore();
sql(`UPDATE product_units SET selling_price=12000 WHERE id=37`);
const changedPrice = tablesSnapshot();
assert.match(seed(true).stderr, /khong khop dump/);
sameSnapshots(changedPrice, tablesSnapshot());
console.log('PASS changed dependency fails without writes');
restore();
sql(`INSERT INTO customers(full_name,note,is_removed,total_debt)
 VALUES('V1 guard','SEED_CUSTOMER_DEBT_CASE_TEST',0,0)`);
const v1 = tablesSnapshot();
assert.match(seed(true).stderr, /Phat hien seed V1/);
sameSnapshots(v1, tablesSnapshot());
console.log('PASS old V1 detected without mutation');
restore();
seed();
console.log('ALL CHECKS PASSED; isolated database left with clean dump + V2.');
