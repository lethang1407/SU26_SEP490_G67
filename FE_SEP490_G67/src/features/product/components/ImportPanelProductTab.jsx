import { COVER_OPTIONS } from '../constants';
import { calcSoq } from '../utils/soqUtils';

function resolveCost(item, overrides) {
  if (overrides[item.productId]?.costPerUnit != null) {
    return Number(overrides[item.productId].costPerUnit);
  }
  return Number(item.costPerUnit || 0);
}

function resolveUnits(item) {
  const list = Array.isArray(item.units) ? item.units : [];
  if (list.length) return list;
  return [
    {
      id: null,
      name: item.unitName || 'sp',
      unitBase: 1,
      isBase: true,
    },
  ];
}

function pickDefaultUnit(units) {
  return units.find((u) => u.isBase || Number(u.unitBase) === 1) || units[0];
}

function formatMoney(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')} đ`;
}

export default function ImportPanelProductTab({
  items,
  overrides,
  supplierFallback = [],
  onChangeQty,
  onChangeCover,
  onChangeSupplier,
  onChangeOrderTiming,
  onChangeUnit,
  onRemove,
}) {
  if (!items.length) {
    return (
      <div className="sp-body pi-autohide-scroll">
        <div className="sp-empty" style={{ textAlign: 'center', color: '#64748B', padding: 24, fontSize: 13 }}>
          Chọn sản phẩm ở danh sách bên trái để thêm vào đơn.
        </div>
      </div>
    );
  }

  const groups = [];
  const groupMap = new Map();

  items.forEach((item) => {
    const parentId = item.parentId || `standalone-${item.productId}`;
    const parentName = item.parentName || item.productName;
    if (!groupMap.has(parentId)) {
      const g = {
        parentId,
        parentName,
        isGroup: !!item.parentId,
        itemSample: item,
        variants: [],
      };
      groupMap.set(parentId, g);
      groups.push(g);
    }
    groupMap.get(parentId).variants.push(item);
  });

  return (
    <div className="sp-body pi-autohide-scroll">
      {groups.map((g) => {
        const v1 = g.itemSample;
        const cover = overrides[v1.productId]?.coverDays ?? v1.coverDays ?? 7;
        const units = resolveUnits(v1);
        const defaultUnit = pickDefaultUnit(units);
        const unitId = overrides[v1.productId]?.productUnitId ?? defaultUnit?.id ?? '';
        const unitBase = Number(overrides[v1.productId]?.unitBase ?? defaultUnit?.unitBase ?? 1) || 1;
        const unitName = overrides[v1.productId]?.unitName ?? defaultUnit?.name ?? 'sp';
        const supplierId = overrides[v1.productId]?.supplierId ?? v1.supplierId ?? '';
        const orderTiming = overrides[v1.productId]?.orderTiming ?? (v1.orderToday === false ? 'lead' : 'today');
        const optionsFromSuggest = Array.isArray(v1.supplierOptions) ? v1.supplierOptions : [];
        const options = optionsFromSuggest.length > 0 ? optionsFromSuggest : supplierFallback;
        const lead = overrides[v1.productId]?.leadTimeDays ?? v1.leadTimeDays ?? 3;
        const selected = options.find((s) => s.id === Number(supplierId));

        const handleSupplierChange = (e) => {
          const id = Number(e.target.value) || null;
          const found = options.find((s) => s.id === id);
          g.variants.forEach((variant) => {
            onChangeSupplier(variant.productId, {
              supplierId: id,
              supplierName: found?.name || '',
              costPerUnit: found?.costPerUnit != null ? Number(found.costPerUnit) : resolveCost(variant, overrides),
              leadTimeDays: found?.leadTimeDays ?? (overrides[variant.productId]?.leadTimeDays ?? variant.leadTimeDays ?? 3),
            });
          });
        };

        const handleUnitChange = (e) => {
          const nextId = e.target.value === '' ? null : Number(e.target.value);
          const found = units.find((u) => String(u.id) === String(nextId)) ||
                        units.find((u) => u.id == null && nextId == null) ||
                        defaultUnit;
          const nextBase = Number(found?.unitBase || 1) || 1;
          g.variants.forEach((variant) => {
            const vUnitBase = Number(overrides[variant.productId]?.unitBase ?? defaultUnit?.unitBase ?? 1) || 1;
            const vPackQty = overrides[variant.productId]?.quantity ?? Math.max(1, Math.ceil(Number(variant.suggestedQty || 0) / vUnitBase));
            const nextPackQty = Math.max(1, Math.round((vPackQty * vUnitBase) / nextBase));
            onChangeUnit?.(variant.productId, {
              productUnitId: found?.id ?? null,
              unitName: found?.name || 'sp',
              unitBase: nextBase,
              quantity: nextPackQty,
            });
          });
        };

        const handleOrderTimingChange = (e) => {
          const val = e.target.value;
          g.variants.forEach((variant) => {
            onChangeOrderTiming?.(variant.productId, val);
          });
        };

        const handleCoverChange = (nextCover) => {
          g.variants.forEach((variant) => {
            const vUnitBase = Number(overrides[variant.productId]?.unitBase ?? defaultUnit?.unitBase ?? 1) || 1;
            onChangeCover(variant.productId, nextCover);
            let nextBaseQty = calcSoq({
              avgDaily: Number(variant.avgDailyRate || 0),
              onHand: Number(variant.onHand || 0),
              leadTimeDays: Number(overrides[variant.productId]?.leadTimeDays ?? variant.leadTimeDays ?? 3),
              coverDays: nextCover,
              safetyDays: 1,
            });
            if (nextBaseQty === 0 && Number(variant.onHand || 0) <= 0 && Number(variant.avgDailyRate || 0) > 0) {
              nextBaseQty = Math.ceil(Number(variant.avgDailyRate) * Math.max(nextCover, 1));
            }
            onChangeQty(variant.productId, Math.max(1, Math.ceil(Math.max(nextBaseQty, 0) / vUnitBase)));
          });
        };

        const totalPackQty = g.variants.reduce((sum, v) => {
          const vUnitBase = Number(overrides[v.productId]?.unitBase ?? defaultUnit?.unitBase ?? 1) || 1;
          const vPackQty = overrides[v.productId]?.quantity ?? Math.max(1, Math.ceil(Number(v.suggestedQty || 0) / vUnitBase));
          return sum + vPackQty;
        }, 0);

        const totalBaseQty = g.variants.reduce((sum, v) => {
          const vUnitBase = Number(overrides[v.productId]?.unitBase ?? defaultUnit?.unitBase ?? 1) || 1;
          const vPackQty = overrides[v.productId]?.quantity ?? Math.max(1, Math.ceil(Number(v.suggestedQty || 0) / vUnitBase));
          return sum + Math.round(vPackQty * vUnitBase);
        }, 0);

        const totalCost = g.variants.reduce((sum, v) => {
          const vUnitBase = Number(overrides[v.productId]?.unitBase ?? defaultUnit?.unitBase ?? 1) || 1;
          const vPackQty = overrides[v.productId]?.quantity ?? Math.max(1, Math.ceil(Number(v.suggestedQty || 0) / vUnitBase));
          const vCost = resolveCost(v, overrides);
          return sum + (vPackQty * vUnitBase * vCost);
        }, 0);

        return (
          <div className="rule" key={g.parentId}>
            <div className="rule-top">
              <div className="rule-name" title={g.parentName}>
                {g.isGroup ? '🩴 ' : '🍶 '}
                {g.parentName}
              </div>
              <button
                type="button"
                className="rule-remove"
                onClick={() => onRemove(g.variants.map((v) => v.productId))}
              >
                Bỏ
              </button>
            </div>

            <div className="fields">
              {/* Supplier Select */}
              <div className="field field--supplier">
                <div className="field-label">
                  Nhà cung cấp
                  {selected?.cheapest ? (
                    <span className="price-hint"> · Rẻ nhất</span>
                  ) : null}
                </div>
                <div className="field-box">
                  {options.length ? (
                    <select
                      value={supplierId || ''}
                      onChange={handleSupplierChange}
                    >
                      <option value="">Chọn NCC</option>
                      {options.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.costPerUnit != null ? ` · ${formatMoney(s.costPerUnit)}` : ''}
                          {s.cheapest ? ' · Rẻ nhất' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={overrides[v1.productId]?.supplierName ?? v1.supplierName ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        g.variants.forEach((v) => {
                          onChangeSupplier(v.productId, {
                            supplierName: val,
                            supplierId: v.supplierId,
                            costPerUnit: resolveCost(v, overrides),
                          });
                        });
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Order Timing and Unit selectors */}
              <div className="fields" style={{ width: '100%', margin: 0 }}>
                <div className="field">
                  <div className="field-label">Đặt hàng</div>
                  <div className="field-box">
                    <select
                      value={orderTiming}
                      onChange={handleOrderTimingChange}
                    >
                      <option value="today">Hôm nay</option>
                      <option value="lead">Sau {lead} ngày</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <div className="field-label">Đơn vị</div>
                  <div className="field-box">
                    <select
                      value={unitId === null || unitId === undefined ? '' : unitId}
                      onChange={handleUnitChange}
                    >
                      {units.map((u) => (
                        <option key={u.id ?? `name-${u.name}`} value={u.id ?? ''}>
                          {u.name}
                          {Number(u.unitBase) > 1 ? ` ×${Number(u.unitBase)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* List of child variant items */}
            <div className="variant-list">
              {g.variants.map((variant) => {
                const vUnitBase = Number(overrides[variant.productId]?.unitBase ?? defaultUnit?.unitBase ?? 1) || 1;
                const packQty = overrides[variant.productId]?.quantity ?? Math.max(1, Math.ceil(Number(variant.suggestedQty || 0) / vUnitBase));

                return (
                  <div className="variant-item" key={variant.productId}>
                    <div className="vi-info">
                      {g.isGroup ? (
                        <div className="vi-name">
                          {variant.secondaryAttrVal ? (
                            <span className="vtag">{variant.secondaryAttrVal}</span>
                          ) : null}
                          {variant.primaryAttrVal ? (
                            <span className="vtag" style={{ background: '#E8F0FA', color: '#004AC6' }}>
                              {variant.primaryAttrVal}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="vi-name" style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                          {variant.productName}
                        </div>
                      )}
                      <div className="vi-sku">{variant.sku || `SP${variant.productId}`}</div>
                    </div>

                    <div className="vi-qty-wrap">
                      <button
                        type="button"
                        className="vi-qty-btn"
                        onClick={() => onChangeQty(variant.productId, Math.max(1, packQty - 1))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="vi-qty-input"
                        value={packQty}
                        onChange={(e) => onChangeQty(variant.productId, Number(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        className="vi-qty-btn"
                        onClick={() => onChangeQty(variant.productId, packQty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aggregated Totals */}
            <div className="qty-hint">
              Tổng: {totalPackQty} {unitName} {unitBase > 1 ? `(= ${totalBaseQty} sp)` : ''} · {formatMoney(totalCost)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
