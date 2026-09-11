import { formatMoney } from '../utils/warehouseReportUtils';

const CARDS = [
  { key: 'opening', label: 'Tồn đầu kỳ', amountKey: 'openingAmount', color: '#2563eb' },
  { key: 'import', label: 'Nhập trong kỳ', amountKey: 'importAmount', color: '#16a34a' },
  { key: 'export', label: 'Xuất trong kỳ', amountKey: 'exportAmount', color: '#ea580c' },
  { key: 'closing', label: 'Tồn cuối kỳ', amountKey: 'closingAmount', color: '#7c3aed' },
];

export default function WarehouseReportKpi({ summary }) {
  return (
    <div className="wr-kpi">
      {CARDS.map((card) => (
        <div key={card.key} className="wr-kpi__card">
          <span className="wr-kpi__label">{card.label}</span>
          <span className="wr-kpi__value" style={{ color: card.color }}>
            {formatMoney(summary?.[card.amountKey])}
          </span>
        </div>
      ))}
    </div>
  );
}
