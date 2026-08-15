import { formatMoney, groupSuggestionsBySupplier } from '../utils/productUtils';

export default function ImportPanelPreview({ items, overrides }) {
  const merged = items.map((item) => {
    const ov = overrides[item.productId] || {};
    const unitBase = Number(ov.unitBase ?? 1) || 1;
    const packQty = Number(ov.quantity ?? item.suggestedQty) || 0;
    const baseQty = Math.round(packQty * unitBase);
    const cost = Number(ov.costPerUnit ?? item.costPerUnit) || 0;
    return {
      ...item,
      suggestedQty: baseQty,
      quantity: baseQty,
      packQty,
      unitName: ov.unitName || item.unitName || 'sp',
      unitBase,
      coverDays: ov.coverDays ?? item.coverDays,
      supplierName: ov.supplierName ?? item.supplierName,
      supplierId: ov.supplierId ?? item.supplierId,
      costPerUnit: cost,
      lineTotal: baseQty * cost,
    };
  });

  const groups = groupSuggestionsBySupplier(merged);

  if (!groups.length) {
    return (
      <div className="sp-body sp-body--preview pi-autohide-scroll">
        <div className="sp-empty">Chưa có dòng để xem trước.</div>
      </div>
    );
  }

  return (
    <div className="sp-body sp-body--preview pi-autohide-scroll">
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
                  {line.packQty != null && line.unitBase > 1
                    ? `${line.packQty} ${line.unitName} (= ${line.quantity} sp)`
                    : `${line.quantity} ${line.unitName || 'sp'}`}
                  {' · '}
                  {formatMoney(line.costPerUnit)}/sp
                </div>
              </div>
              <div className="po-line-right">
                <div className="po-line-qty">
                  {line.packQty != null && line.unitBase > 1
                    ? `${line.packQty} ${line.unitName}`
                    : line.quantity}
                </div>
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
