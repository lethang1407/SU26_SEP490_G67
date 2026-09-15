import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import RevenuePagination from './RevenuePagination';
import {
  formatAxisMoney,
  formatCount,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  formatVnDate,
} from '../utils/revenueReportUtils';

const REFUND_COLOR = '#ef4444';
const RATE_COLOR = '#f59e0b';

/** Số phiếu trả mỗi trang, cùng cỡ với bảng Chi tiết giao dịch phát sinh. */
const SLIP_PAGE_SIZE = 10;

/** Lý do trả → tông badge; lý do khác hiện chữ thường, không badge. */
const REASON_TONES = [
  { match: /hư|hỏng|lỗi sản phẩm|móp|vỡ/i, tone: 'danger' },
  { match: /hsd|hạn|cận date/i, tone: 'warning' },
  { match: /nhà cung cấp|ncc/i, tone: 'info' },
];

function reasonTone(reason) {
  if (!reason) return null;
  return REASON_TONES.find((r) => r.match.test(reason))?.tone ?? null;
}

function FlowCard({ label, value, tone }) {
  return (
    <div className={`rr-flow_card rr-flow_card--${tone}`}>
      <span className="rr-flow_label">{label}</span>
      <strong className="rr-flow_value">{value}</strong>
    </div>
  );
}

function ItemsCell({ items }) {
  if (!items?.length) return <span className="rr-muted">—</span>;
  return (
    <div className="rr-return-items">
      {items.map((item, i) => (
        <span key={`${item.productName}-${i}`}>{item.productName}</span>
      ))}
    </div>
  );
}

function QtyCell({ items }) {
  if (!items?.length) return <span className="rr-muted">—</span>;
  return (
    <div className="rr-return-items">
      {items.map((item, i) => (
        <span key={`${item.productName}-${i}`}>
          {formatCount(item.quantity)} {item.unitName || ''}
        </span>
      ))}
    </div>
  );
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="rr-tooltip">
      <p className="rr-tooltip_label">{label}</p>
      <p className="rr-tooltip_row">
        <span className="rr-dot" style={{ background: REFUND_COLOR }} />
        Giá trị hoàn: <strong>{formatMoney(row.refundAmount)}</strong>
      </p>
      <p className="rr-tooltip_row">
        <span className="rr-dot" style={{ background: RATE_COLOR }} />
        Tỷ lệ trả hàng: <strong>{formatPercent(row.returnRatePct)}</strong>
      </p>
    </div>
  );
}

export default function RevenueAdjustments({ adjustments, summary, periodLabel, loading }) {
  const [slipPage, setSlipPage] = useState(0);

  const data = adjustments ?? {};
  const returnAmount = Math.abs(Number(data.returnAmount ?? summary?.returnAmount ?? 0));
  const discountAmount = Math.abs(Number(data.discountAmount ?? summary?.discountAmount ?? 0));
  const netRevenue = Number(summary?.netRevenue ?? 0);
  // BE chưa trả grossRevenue thì cộng ngược: doanh thu thuần = tiền hàng − chiết khấu − hàng trả lại.
  const grossRevenue = Number(summary?.grossRevenue ?? netRevenue + returnAmount + discountAmount);

  const slips = data.returnSlips ?? [];
  const trend = data.monthlyReturns ?? [];
  const slipTotal = slips.reduce((sum, s) => sum + Math.abs(Number(s.refundAmount || 0)), 0);
  const trendTotal = trend.reduce((sum, t) => sum + Math.abs(Number(t.refundAmount || 0)), 0);

  // Đổi bộ lọc có thể làm danh sách ngắn lại: kẹp trang về trang cuối thay vì reset bằng effect.
  const slipPages = Math.max(1, Math.ceil(slips.length / SLIP_PAGE_SIZE));
  const currentSlipPage = Math.min(slipPage, slipPages - 1);
  const pageSlips = slips.slice(
    currentSlipPage * SLIP_PAGE_SIZE,
    (currentSlipPage + 1) * SLIP_PAGE_SIZE,
  );

  return (
    <>
      <section className="rr-flow" aria-label="Diễn giải doanh thu thuần">
        <FlowCard label="Tổng tiền hàng" value={formatMoney(grossRevenue)} tone="base" />
        <span className="rr-flow_op" aria-hidden="true">-</span>
        <FlowCard label="Tổng chiết khấu" value={formatSignedMoney(-discountAmount)} tone="warning" />
        <span className="rr-flow_op" aria-hidden="true">-</span>
        <FlowCard label="Hàng bán trả lại" value={formatSignedMoney(-returnAmount)} tone="danger" />
        <span className="rr-flow_op rr-flow_op--eq" aria-hidden="true">=</span>
        <FlowCard label="Doanh thu thuần" value={formatMoney(netRevenue)} tone="success" />
      </section>

      <section className="rr-card">
        <header className="rr-card_head">
          <div>
            <h2 className="rr-card_title">Danh sách phiếu đổi trả</h2>
            <p className="rr-card_subtitle">Chi tiết sản phẩm khách trả lại cửa hàng trong kỳ</p>
          </div>
          <span className="rr-pill rr-pill--danger">
            {formatCount(slips.length)} phiếu trả · Tổng hoàn: {formatSignedMoney(-slipTotal)}
          </span>
        </header>

        <div className="rr-table-wrap">
          <table className="rr-table rr-table--returns">
            {/* Chia đều độ rộng cho 7 cột. */}
            <colgroup>
              {Array.from({ length: 7 }, (_, i) => (
                <col key={i} style={{ width: `${100 / 7}%` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>Số phiếu</th>
                <th className="rr-table_center">Ngày</th>
                <th>Khách hàng</th>
                <th>Hàng trả</th>
                <th>SL</th>
                <th className="rr-table_num">Giá trị hoàn</th>
                <th>Lý do</th>
              </tr>
            </thead>
            <tbody>
              {slips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="rr-table_empty">
                    {loading ? 'Đang tải số liệu…' : 'Không có phiếu trả nào trong kỳ đã chọn.'}
                  </td>
                </tr>
              ) : (
                pageSlips.map((slip) => {
                  const tone = reasonTone(slip.reason);
                  // Phiếu lập trước khi lưu chi tiết dòng trả không có hàng hóa — hiện mờ.
                  const faded = !slip.items?.length;
                  return (
                    <tr key={slip.returnId ?? slip.returnCode} className={faded ? 'rr-row--faded' : undefined}>
                      <td className="rr-code-link">{slip.returnCode}</td>
                      <td className="rr-table_center">{formatVnDate(slip.createdAt)}</td>
                      <td className="rr-table_code rr-table_ellipsis" title={slip.customerName || 'Khách lẻ'}>
                        {slip.customerName || 'Khách lẻ'}
                      </td>
                      <td><ItemsCell items={slip.items} /></td>
                      <td className="rr-table_qty"><QtyCell items={slip.items} /></td>
                      <td className="rr-table_num">
                        <span className="rr-money--negative">
                          {formatSignedMoney(-Math.abs(Number(slip.refundAmount || 0)))}
                        </span>
                      </td>
                      <td>
                        {tone ? (
                          <span className={`rr-reason rr-reason--${tone}`}>{slip.reason}</span>
                        ) : (
                          <span className="rr-reason-text">{slip.reason || 'Không ghi lý do'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {slips.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5}>Tổng cộng ({formatCount(slips.length)} phiếu)</td>
                  <td className="rr-table_num">
                    <span className="rr-money--negative">{formatSignedMoney(-slipTotal)}</span>
                  </td>
                  <td className="rr-reason-text">{formatPercent(data.returnRatePct ?? summary?.returnRatePct)} Doanh thu</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <RevenuePagination
          page={currentSlipPage}
          pageSize={SLIP_PAGE_SIZE}
          totalItems={slips.length}
          totalPages={slipPages}
          onPageChange={setSlipPage}
          disabled={loading}
          unitLabel="phiếu trả"
        />
      </section>

      <section className="rr-card">
        <header className="rr-card_head">
          <div>
            <h2 className="rr-card_title">Xu hướng đổi trả theo tháng</h2>
            <p className="rr-card_subtitle">
              Theo dõi tỷ lệ đổi trả &amp; giá trị hoàn tiền {periodLabel ? `trong ${periodLabel}` : 'theo từng tháng'}
            </p>
          </div>
          <span className="rr-pill rr-pill--danger">
            <span className="rr-dot" style={{ background: REFUND_COLOR }} />
            Tổng giá trị hoàn: {formatMoney(trendTotal || returnAmount)}
          </span>
        </header>

        {trend.length === 0 ? (
          <p className="rr-empty">{loading ? 'Đang tải biểu đồ…' : 'Chưa có số liệu đổi trả trong kỳ.'}</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={6} />
              <YAxis
                yAxisId="money"
                axisLine={false}
                tickLine={false}
                tick={{ fill: REFUND_COLOR, fontSize: 11 }}
                tickFormatter={formatAxisMoney}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: RATE_COLOR, fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<TrendTooltip />} />
              <Line
                yAxisId="money"
                type="monotone"
                dataKey="refundAmount"
                stroke={REFUND_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: '#fff', strokeWidth: 2 }}
                name="Giá trị hàng trả lại"
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="returnRatePct"
                stroke={RATE_COLOR}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                name="Tỷ lệ trả hàng %"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        <ul className="rr-legend">
          <li><span className="rr-legend_line" style={{ background: REFUND_COLOR }} />Giá trị hàng trả lại (Cột trái, VNĐ)</li>
          <li><span className="rr-legend_line rr-legend_line--dashed" style={{ color: RATE_COLOR }} />Tỷ lệ trả hàng % (Cột phải)</li>
        </ul>
      </section>
    </>
  );
}
