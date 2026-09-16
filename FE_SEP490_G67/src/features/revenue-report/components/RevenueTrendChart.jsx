import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import RevenueHighlights from './RevenueHighlights';
import {
  formatAxisMoney,
  formatMoney,
  formatPercent,
} from '../utils/revenueReportUtils';

const SERIES = [
  { key: 'netRevenue', label: 'Doanh thu thuần (Cột xanh)', color: '#2563eb' },
  { key: 'cogs', label: 'Giá vốn (Cột salmon)', color: '#fca5a5' },
  { key: 'profit', label: 'Lợi nhuận (Đường xanh lá)', color: '#16a34a' },
  { key: 'profitMarginPct', label: 'Biên lợi nhuận % (Đường tím nhạt)', color: '#818cf8' },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="rr-tooltip">
      <p className="rr-tooltip_label">{label}</p>
      <p className="rr-tooltip_row">
        <span className="rr-dot" style={{ background: '#2563eb' }} />
        Doanh thu thuần: <strong>{formatMoney(row.netRevenue)}</strong>
      </p>
      <p className="rr-tooltip_row">
        <span className="rr-dot" style={{ background: '#fca5a5' }} />
        Giá vốn: <strong>{formatMoney(row.cogs)}</strong>
      </p>
      <p className="rr-tooltip_row">
        <span className="rr-dot" style={{ background: '#16a34a' }} />
        Lợi nhuận: <strong>{formatMoney(row.profit)}</strong>
      </p>
      <p className="rr-tooltip_row">
        <span className="rr-dot" style={{ background: '#818cf8' }} />
        Biên lợi nhuận: <strong>{formatPercent(row.profitMarginPct)}</strong>
      </p>
    </div>
  );
}

export default function RevenueTrendChart({
  data,
  highlights,
  loading,
}) {
  const rows = data ?? [];

  return (
    <section className="rr-card rr-chart">
      <header className="rr-card_head">
        <div>
          <h2 className="rr-card_title">Doanh thu thuần, Giá vốn và Lợi nhuận</h2>
          <p className="rr-card_subtitle">Theo tháng</p>
        </div>
      </header>

      <div className="rr-chart_body">
        <div className="rr-chart_plot">
          {rows.length === 0 ? (
            <p className="rr-empty">
              {loading ? 'Đang tải biểu đồ…' : 'Chưa có số liệu trong kỳ đã chọn.'}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={rows} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  dy={6}
                />
                <YAxis
                  yAxisId="money"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={formatAxisMoney}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar
                  yAxisId="money"
                  dataKey="netRevenue"
                  fill="#2563eb"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={16}
                  name="Doanh thu thuần"
                />
                <Bar
                  yAxisId="money"
                  dataKey="cogs"
                  fill="#fca5a5"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={16}
                  name="Giá vốn"
                />
                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="profit"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  name="Lợi nhuận"
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="profitMarginPct"
                  stroke="#818cf8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Biên lợi nhuận %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          <ul className="rr-legend">
            {SERIES.map((s) => (
              <li key={s.key}>
                <span className="rr-dot" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        </div>

        <RevenueHighlights highlights={highlights} />
      </div>
    </section>
  );
}
