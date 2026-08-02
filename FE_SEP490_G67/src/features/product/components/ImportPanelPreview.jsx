import { formatMoney, groupSuggestionsBySupplier } from '../utils/productUtils';

export default function ImportPanelPreview({ items, overrides }) {
  const merged = items.map((item) => ({
    ...item,
    suggestedQty: overrides[item.productId]?.quantity ?? item.suggestedQty,
    coverDays: overrides[item.productId]?.coverDays ?? item.coverDays,
    supplierName: overrides[item.productId]?.supplierName ?? item.supplierName,
    supplierId: overrides[item.productId]?.supplierId ?? item.supplierId,
  }));

  const groups = groupSuggestionsBySupplier(merged);

  if (!groups.length) {
    return (
      <div className="sp-body sp-body--preview">
        <div className="sp-empty">Chưa có dòng để xem trước.</div>
      </div>
    );
  }

  return (
    <div className="sp-body sp-body--preview">
      {groups.map((g, idx) => (
        <div className="po" key={g.supplierId || g.supplierName}>
          <div className="po-head">
            <div className="po-title">{g.supplierName}</div>
            {g.urgent && <span className="po-badge urgent">Gấp</span>}
          </div>
          {g.lines.map((line) => (
            <div className="po-line" key={line.productId}>
              <div>
                <div className="po-line-name">{line.productName}</div>
                <div className="po-line-meta">
                  {formatMoney(line.costPerUnit)} × {line.quantity}
                </div>
              </div>
              <div className="po-line-right">
                <div className="po-line-qty">{line.quantity}</div>
                <div className="po-line-money">{formatMoney(line.lineTotal)}</div>
              </div>
            </div>
          ))}
          <div className="po-foot">
            <span>Đơn #{idx + 1}</span>
            <b>{formatMoney(g.total)}</b>
          </div>
        </div>
      ))}
    </div>
  );
}
