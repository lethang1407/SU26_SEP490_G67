import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ClipboardList,
  PieChart,
  Receipt,
  RotateCcw,
  Tag,
  Wallet,
} from 'lucide-react';
import {
  formatCount,
  formatDeltaPercent,
  formatMoney,
  formatPercent,
  formatSignedMoney,
} from '../utils/revenueReportUtils';

function DeltaBadge({ value }) {
  if (value === null || value === undefined) {
    return <span className="rr-kpi_delta rr-kpi_delta--flat">Chưa có dữ liệu kỳ trước</span>;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) {
    return <span className="rr-kpi_delta rr-kpi_delta--flat">Không đổi so với kỳ trước</span>;
  }
  const up = n > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`rr-kpi_delta rr-kpi_delta--${up ? 'up' : 'down'}`}>
      <Icon size={13} />
      {formatDeltaPercent(n)} so với kỳ trước
    </span>
  );
}

function HeroCard({ tone, icon, label, value, hint, children }) {
  return (
    <article className={`rr-kpi_card rr-kpi_card--hero rr-kpi_card--${tone}`}>
      <header className="rr-kpi_head">
        <span className="rr-kpi_label">{label}</span>
        <span className="rr-kpi_icon">{icon}</span>
      </header>
      <p className="rr-kpi_value">{value}</p>
      {hint && <p className="rr-kpi_hint">{hint}</p>}
      {children}
    </article>
  );
}

function PlainCard({ icon, label, value, valueTone, hint }) {
  return (
    <article className="rr-kpi_card">
      <header className="rr-kpi_head">
        <span className="rr-kpi_label">{label}</span>
        <span className="rr-kpi_icon">{icon}</span>
      </header>
      <p className={`rr-kpi_value${valueTone ? ` rr-kpi_value--${valueTone}` : ''}`}>{value}</p>
      {hint && <p className="rr-kpi_hint">{hint}</p>}
    </article>
  );
}

export default function RevenueReportKpi({ summary }) {
  const margin = Number(summary?.profitMarginPct ?? 0);
  // Thanh biên lợi nhuận chỉ để đọc nhanh độ dày lãi, kẹp trong 0–100 để không tràn.
  const marginBar = Math.max(0, Math.min(100, margin));

  return (
    <>
      <div className="rr-kpi">
        <HeroCard
          tone="gross"
          icon={<Banknote size={16} />}
          label="Doanh thu"
          value={formatMoney(summary?.grossRevenue)}
          hint="Tổng tiền hàng bán ra, trước chiết khấu & trả hàng"
        />

        <HeroCard
          tone="revenue"
          icon={<Receipt size={16} />}
          label="Doanh thu thuần"
          value={formatMoney(summary?.netRevenue)}
          hint="Sau giảm giá, trước VAT"
        >
          <DeltaBadge value={summary?.netRevenueChangePct} />
        </HeroCard>

        <HeroCard
          tone="profit"
          icon={<Wallet size={16} />}
          label="Lợi nhuận"
          value={formatMoney(summary?.profit)}
          hint="Doanh thu thuần - Giá vốn"
        >
          <DeltaBadge value={summary?.profitChangePct} />
        </HeroCard>

        <HeroCard
          tone="margin"
          icon={<PieChart size={16} />}
          label="Biên lợi nhuận"
          value={formatPercent(margin)}
          hint={`(DTT - Giá vốn) / DTT · Giá vốn: ${formatMoney(summary?.cogs)}`}
        >
          <div
            className="rr-kpi_bar"
            role="img"
            aria-label={`Biên lợi nhuận ${formatPercent(margin)}`}
          >
            <span className="rr-kpi_bar-fill" style={{ width: `${marginBar}%` }} />
          </div>
        </HeroCard>
      </div>

      <div className="rr-kpi rr-kpi--secondary">
        <article className="rr-kpi_card">
          <header className="rr-kpi_head">
            <span className="rr-kpi_label">Giá trị TB / Hóa đơn</span>
            <span className="rr-kpi_icon">
              <ClipboardList size={16} />
            </span>
          </header>
          <p className="rr-kpi_value">{formatMoney(summary?.averageOrderValue)}</p>
          <p className="rr-kpi_hint">DTT / {formatCount(summary?.orderCount)} đơn có doanh thu</p>
          <ul className="rr-kpi_pace">
            <li>
              <span className="rr-dot rr-dot--up" />
              Cao nhất: <strong>{formatMoney(summary?.maxOrderValue)}</strong>
            </li>
            <li>
              <span className="rr-dot rr-dot--down" />
              Thấp nhất: <strong>{formatMoney(summary?.minOrderValue)}</strong>
            </li>
          </ul>
        </article>
        <PlainCard
          icon={<ClipboardList size={16} />}
          label="Giá vốn hàng bán"
          value={formatMoney(summary?.cogs)}
          hint="Tổng giá nhập của hàng đã bán"
        />
        <PlainCard
          icon={<RotateCcw size={16} />}
          label="Hàng bán trả lại"
          value={formatSignedMoney(-Math.abs(Number(summary?.returnAmount ?? 0)))}
          valueTone="negative"
          hint={`${formatPercent(summary?.returnRatePct)} trên doanh thu ${formatMoney(summary?.grossRevenue)}`}
        />
        <PlainCard
          icon={<Tag size={16} />}
          label="Tổng chiết khấu"
          value={formatMoney(summary?.discountAmount)}
          valueTone="warning"
          hint={`${formatPercent(summary?.discountRatePct)} trên doanh thu ${formatMoney(summary?.grossRevenue)}`}
        />
        <article className="rr-kpi_card">
          <header className="rr-kpi_head">
            <span className="rr-kpi_label">Nhịp kinh doanh</span>
            <span className="rr-kpi_icon">
              <Activity size={16} />
            </span>
          </header>
          <p className="rr-kpi_value">{formatCount(summary?.orderCount)} đơn hàng</p>
          <DeltaBadge value={summary?.orderCountChangePct} />
          <ul className="rr-kpi_pace">
            <li>
              <span className="rr-dot rr-dot--up" />
              Tốt nhất: <strong>{summary?.bestPeriodLabel || 'N/A'}</strong>
            </li>
            <li>
              <span className="rr-dot rr-dot--down" />
              Thấp nhất: <strong>{summary?.worstPeriodLabel || 'N/A'}</strong>
            </li>
          </ul>
        </article>
      </div>
    </>
  );
}
