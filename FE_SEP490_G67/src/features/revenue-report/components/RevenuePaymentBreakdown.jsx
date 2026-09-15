import { Banknote, CircleCheck, ClipboardClock, NotebookPen, QrCode } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { paymentMethodLabel } from '../api';
import {
  formatAxisMoney,
  formatCount,
  formatMoney,
  formatPercent,
} from '../utils/revenueReportUtils';

const METHOD_META = {
  TRANSFER: {
    label: 'Chuyển khoản QR',
    sub: 'VietQR',
    icon: QrCode,
    color: '#2563eb',
    tone: 'transfer',
  },
  CASH: {
    label: 'Tiền mặt',
    sub: 'Thu trực tiếp tại quầy',
    icon: Banknote,
    color: '#10b981',
    tone: 'cash',
  },
  DEBT: {
    label: 'Ghi nợ (Công nợ)',
    sub: 'Khách quen hẹn thanh toán',
    icon: NotebookPen,
    color: '#f59e0b',
    tone: 'debt',
  },
};

const METHOD_ORDER = ['TRANSFER', 'CASH', 'DEBT'];

function metaOf(method) {
  const key = String(method || '').toUpperCase();
  return (
    METHOD_META[key] ?? {
      label: paymentMethodLabel(method),
      sub: '',
      icon: Banknote,
      color: '#94a3b8',
      tone: 'other',
    }
  );
}

function SeriesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="rr-tooltip">
      <p className="rr-tooltip_label">{label}</p>
      {METHOD_ORDER.map((key) => (
        <p key={key} className="rr-tooltip_row">
          <span className="rr-dot" style={{ background: METHOD_META[key].color }} />
          {METHOD_META[key].label}: <strong>{formatMoney(row[key])}</strong>
        </p>
      ))}
    </div>
  );
}

/** Nhãn % chỉ vẽ trên đoạn chuyển khoản, và chỉ khi đoạn đủ rộng để chữ không tràn. */
function TransferShareLabel({ x, y, width, height, index, data }) {
  const row = data[index];
  if (!row || width < 36) return null;
  return (
    <text
      x={x + width - 6}
      y={y + height / 2}
      textAnchor="end"
      dominantBaseline="central"
      fill="#fff"
      fontSize={10}
      fontWeight={600}
    >
      {Math.round(row.transferPct)}%
    </text>
  );
}

export default function RevenuePaymentBreakdown({
  rows,
  paymentSummary,
  paymentSeries,
  periodLabel,
  highlightLabels,
  loading,
}) {
  const items = [...(rows ?? [])].sort(
    (a, b) =>
      (METHOD_ORDER.indexOf(String(a.paymentMethod).toUpperCase()) + 1 || 99) -
      (METHOD_ORDER.indexOf(String(b.paymentMethod).toUpperCase()) + 1 || 99),
  );

  const totalRevenue = items.reduce((sum, row) => sum + Number(row.netRevenue || 0), 0);
  const totalInvoices = items.reduce((sum, row) => sum + Number(row.invoiceCount || 0), 0);
  const rowOf = (method) => items.find((row) => String(row.paymentMethod).toUpperCase() === method);
  const cashRow = rowOf('CASH');
  const transferRow = rowOf('TRANSFER');
  const debtRow = rowOf('DEBT');

  // Chưa có số từ BE thì suy ra: phần ghi nợ coi như chưa thu, phần còn lại đã thu.
  const outstanding = Number(paymentSummary?.outstandingDebt ?? debtRow?.netRevenue ?? 0);
  const collected = Number(paymentSummary?.collectedAmount ?? totalRevenue - outstanding);
  const debtOrderCount = paymentSummary?.debtOrderCount ?? debtRow?.invoiceCount ?? 0;
  // Doanh thu ghi nợ đã về tay: trả trước lúc mua + các lần trả nợ sau đó.
  const debtCollected = Math.max(0, Number(debtRow?.netRevenue ?? 0) - outstanding);

  const series = (paymentSeries ?? []).map((point) => {
    const transfer = Number(point.transfer ?? point.TRANSFER ?? 0);
    const cash = Number(point.cash ?? point.CASH ?? 0);
    const debt = Number(point.debt ?? point.DEBT ?? 0);
    const sum = transfer + cash + debt;
    return {
      ...point,
      TRANSFER: transfer,
      CASH: cash,
      DEBT: debt,
      transferPct: sum ? (transfer / sum) * 100 : 0,
    };
  });

  return (
    <>
      <div className="rr-paysum">
        <article className="rr-paysum_card rr-paysum_card--cash">
          <header>
            <span>Tiền mặt</span>
            <Banknote size={18} />
          </header>
          <strong>{formatMoney(cashRow?.netRevenue)}</strong>
          <p>{formatCount(cashRow?.invoiceCount)} hóa đơn thu tại quầy</p>
        </article>
        <article className="rr-paysum_card rr-paysum_card--collected">
          <header>
            <span>Chuyển khoản</span>
            <QrCode size={18} />
          </header>
          <strong>{formatMoney(transferRow?.netRevenue)}</strong>
          <p>{formatCount(transferRow?.invoiceCount)} hóa đơn chuyển khoản QR</p>
        </article>
        <article className="rr-paysum_card rr-paysum_card--debt">
          <header>
            <span>Công nợ chưa thu</span>
            <ClipboardClock size={18} />
          </header>
          <strong>{formatMoney(outstanding)}</strong>
          <p>{formatCount(debtOrderCount)} hóa đơn còn nợ</p>
        </article>
        <article className="rr-paysum_card rr-paysum_card--debt-paid">
          <header>
            <span>Công nợ đã thu</span>
            <CircleCheck size={18} />
          </header>
          <strong>{formatMoney(debtCollected)}</strong>
          <p>Trả trước và trả nợ của {formatCount(debtRow?.invoiceCount)} hóa đơn ghi nợ</p>
        </article>
      </div>

      <section className="rr-card rr-card--flush">
        <header className="rr-card_head rr-card_head--padded">
          <div className="rr-card_head-left">
            <h2 className="rr-card_title">Chi tiết theo phương thức thanh toán</h2>
            <span className="rr-card_meta">{formatCount(items.length)} phương thức</span>
          </div>
        </header>

        <div className="rr-table-wrap">
          <table className="rr-table rr-table--payment">
            {/* Chia đều độ rộng cho các cột. */}
            <colgroup>
              {Array.from({ length: 4 }, (_, i) => (
                <col key={i} style={{ width: '25%' }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>Phương thức</th>
                <th className="rr-table_center">Số hóa đơn</th>
                <th className="rr-table_num">Doanh thu</th>
                <th>% Tổng DT</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="rr-table_empty">
                    {loading ? 'Đang tải số liệu…' : 'Không có giao dịch nào trong kỳ đã chọn.'}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const meta = metaOf(row.paymentMethod);
                  const Icon = meta.icon;
                  const ratio = Math.max(0, Math.min(100, Number(row.ratioPct ?? 0)));
                  return (
                    <tr key={row.paymentMethod}>
                      <td>
                        <div className="rr-method">
                          <span className={`rr-method_icon rr-method_icon--${meta.tone}`}>
                            <Icon size={16} />
                          </span>
                          <div>
                            <strong>{meta.label}</strong>
                            {meta.sub && <small>{meta.sub}</small>}
                          </div>
                        </div>
                      </td>
                      <td className="rr-table_center">{formatCount(row.invoiceCount)} HĐ</td>
                      <td className="rr-table_num rr-table_num--strong">{formatMoney(row.netRevenue)}</td>
                      <td>
                        <div className="rr-share">
                          <div className="rr-share_track">
                            <span style={{ width: `${ratio}%`, background: meta.color }} />
                          </div>
                          <span className="rr-share_pct" style={{ color: meta.color }}>
                            {formatPercent(ratio)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr>
                  <td>Tổng cộng</td>
                  <td className="rr-table_center">{formatCount(totalInvoices)} HĐ</td>
                  <td className="rr-table_num">{formatMoney(totalRevenue)}</td>
                  <td>
                    <div className="rr-share">
                      <div className="rr-share_track" aria-hidden="true" />
                      <span className="rr-share_pct rr-paytotal_pct">100%</span>
                    </div>
                  </td>
                </tr>
                <tr className="rr-paytotal-row">
                  <td colSpan={4} className="rr-table_num">
                    <span className="rr-paytotal_collected">Đã thu thực: {formatMoney(collected)}</span>
                    <span className="rr-paytotal_sep"> · </span>
                    <span className="rr-paytotal_debt">Còn ghi nợ: {formatMoney(outstanding)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="rr-card">
        <header className="rr-card_head">
          <div>
            <h2 className="rr-card_title">Xu hướng doanh thu theo PTTT - Theo tháng</h2>
            <p className="rr-card_subtitle">
              Phân bổ dòng tiền thanh toán theo từng tháng {periodLabel ? `trong ${periodLabel}` : ''}
            </p>
          </div>
          <ul className="rr-legend rr-legend--inline">
            {METHOD_ORDER.map((key) => (
              <li key={key}>
                <span className="rr-dot" style={{ background: METHOD_META[key].color }} />
                {METHOD_META[key].label.replace(' (Công nợ)', '')}
              </li>
            ))}
          </ul>
        </header>

        {series.length === 0 ? (
          <p className="rr-empty">{loading ? 'Đang tải biểu đồ…' : 'Chưa có số liệu thanh toán theo tháng.'}</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, series.length * 34 + 40)}>
            <BarChart data={series} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barSize={14}>
              <CartesianGrid stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={formatAxisMoney}
              />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                width={44}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const tone = highlightLabels?.best === payload.value
                    ? '#2563eb'
                    : highlightLabels?.worst === payload.value
                      ? '#f59e0b'
                      : '#475569';
                  return (
                    <text x={x - 4} y={y} textAnchor="end" dominantBaseline="central" fill={tone} fontSize={12} fontWeight={tone === '#475569' ? 500 : 700}>
                      {payload.value}
                    </text>
                  );
                }}
              />
              <Tooltip content={<SeriesTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="TRANSFER" stackId="pm" fill={METHOD_META.TRANSFER.color} radius={[4, 0, 0, 4]}>
                <LabelList content={(props) => <TransferShareLabel {...props} data={series} />} />
              </Bar>
              <Bar dataKey="CASH" stackId="pm" fill={METHOD_META.CASH.color} />
              <Bar dataKey="DEBT" stackId="pm" fill={METHOD_META.DEBT.color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        <ul className="rr-legend">
          {METHOD_ORDER.map((key) => (
            <li key={key}>
              <span className="rr-legend_square" style={{ background: METHOD_META[key].color }} />
              {METHOD_META[key].label}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
