import { COVER_OPTIONS } from '../constants';

export default function ImportPanelProductTab({
  items,
  overrides,
  onChangeQty,
  onChangeCover,
  onChangeSupplier,
  onRemove,
}) {
  if (!items.length) {
    return (
      <div className="sp-body">
        <div className="sp-empty">Chọn sản phẩm ở list giữa rồi bấm “Chuẩn bị đơn →”.</div>
      </div>
    );
  }

  return (
    <div className="sp-body">
      {items.map((item) => {
        const cover = overrides[item.productId]?.coverDays ?? item.coverDays;
        const qty = overrides[item.productId]?.quantity ?? item.suggestedQty;
        return (
          <div className="rule" key={item.productId}>
            <div className="rule-top">
              <div className="rule-name">
                {item.emoji ? `${item.emoji} ` : ''}
                {item.productName}
              </div>
              <button type="button" className="rule-remove" onClick={() => onRemove(item.productId)}>
                Bỏ
              </button>
            </div>
            <div className="why">
              <div className="why-facts">{item.whyFacts}</div>
              <div className="why-result">
                <span className="hl">{item.whyResult}</span>
              </div>
            </div>
            <div className="fields">
              <div className="field">
                <div className="field-label">Nhà cung cấp</div>
                <div className="field-box">
                  <input
                    value={overrides[item.productId]?.supplierName ?? item.supplierName ?? ''}
                    onChange={(e) =>
                      onChangeSupplier(item.productId, {
                        supplierName: e.target.value,
                        supplierId: item.supplierId,
                      })
                    }
                  />
                </div>
              </div>
              <div className="field">
                <div className="field-label">Số lượng</div>
                <div className="field-box">
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => onChangeQty(item.productId, Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="field">
                <div className="field-label">Khi đặt</div>
                <div className="field-box">
                  Hôm nay <span className="caret">▾</span>
                </div>
                <div className="cover-src" aria-hidden="true">
                  &nbsp;
                </div>
              </div>
              <div className="field field--cover">
                <div className="field-label">Đủ bán (ngày)</div>
                <div className="field-box">
                  <select
                    value={cover}
                    onChange={(e) => onChangeCover(item.productId, Number(e.target.value))}
                  >
                    {COVER_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
               
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
