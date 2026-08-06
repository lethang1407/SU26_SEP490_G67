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
      <div className="sp-body sp-body--setup pi-autohide-scroll">
        <div className="sp-empty">
          Chọn sản phẩm ở danh sách bên trái để thêm vào đơn.
        </div>
      </div>
    );
  }

  return (
    <div className="sp-body sp-body--setup pi-autohide-scroll">
      {items.map((item) => {
        const cover = overrides[item.productId]?.coverDays ?? item.coverDays ?? 7;
        const units = resolveUnits(item);
        const defaultUnit = pickDefaultUnit(units);
        const unitId =
          overrides[item.productId]?.productUnitId ?? defaultUnit?.id ?? '';
        const unitBase = Number(
          overrides[item.productId]?.unitBase ?? defaultUnit?.unitBase ?? 1,
        ) || 1;
        const unitName =
          overrides[item.productId]?.unitName ?? defaultUnit?.name ?? 'sp';
        const packQty =
          overrides[item.productId]?.quantity ??
          Math.max(1, Math.ceil(Number(item.suggestedQty || 0) / unitBase));
        const supplierId =
          overrides[item.productId]?.supplierId ?? item.supplierId ?? '';
        const orderTiming =
          overrides[item.productId]?.orderTiming ??
          (item.orderToday === false ? 'lead' : 'today');
        const optionsFromSuggest = Array.isArray(item.supplierOptions)
          ? item.supplierOptions
          : [];
        const options =
          optionsFromSuggest.length > 0
            ? optionsFromSuggest
            : supplierFallback;
        const cost = resolveCost(item, overrides);
        const lead =
          overrides[item.productId]?.leadTimeDays ?? item.leadTimeDays ?? 3;
        const selected = options.find((s) => s.id === Number(supplierId));
        const packCost = cost * unitBase;
        const baseQty = Math.round(packQty * unitBase);

        const handleCoverChange = (nextCover) => {
          onChangeCover(item.productId, nextCover);
          let nextBaseQty = calcSoq({
            avgDaily: Number(item.avgDailyRate || 0),
            onHand: Number(item.onHand || 0),
            leadTimeDays: Number(lead),
            coverDays: nextCover,
            safetyDays: 1,
          });
          if (
            nextBaseQty === 0 &&
            Number(item.onHand || 0) <= 0 &&
            Number(item.avgDailyRate || 0) > 0
          ) {
            nextBaseQty = Math.ceil(
              Number(item.avgDailyRate) * Math.max(nextCover, 1),
            );
          }
          onChangeQty(
            item.productId,
            Math.max(1, Math.ceil(Math.max(nextBaseQty, 0) / unitBase)),
          );
        };

        const handleSupplierChange = (e) => {
          const id = Number(e.target.value) || null;
          const found = options.find((s) => s.id === id);
          onChangeSupplier(item.productId, {
            supplierId: id,
            supplierName: found?.name || '',
            costPerUnit:
              found?.costPerUnit != null ? Number(found.costPerUnit) : cost,
            leadTimeDays: found?.leadTimeDays ?? lead,
          });
        };

        const handleUnitChange = (e) => {
          const nextId = e.target.value === '' ? null : Number(e.target.value);
          const found =
            units.find((u) => String(u.id) === String(nextId)) ||
            units.find((u) => u.id == null && nextId == null) ||
            defaultUnit;
          const nextBase = Number(found?.unitBase || 1) || 1;
          const prevBase = unitBase;
          const nextPackQty = Math.max(
            1,
            Math.round((packQty * prevBase) / nextBase),
          );
          onChangeUnit?.(item.productId, {
            productUnitId: found?.id ?? null,
            unitName: found?.name || 'sp',
            unitBase: nextBase,
            quantity: nextPackQty,
          });
        };

        return (
          <div className="rule" key={item.productId}>
            <div className="rule-top">
              <div className="rule-name" title={item.productName}>
                {item.emoji ? `${item.emoji} ` : ''}
                {item.productName}
              </div>
              <button
                type="button"
                className="rule-remove"
                onClick={() => onRemove(item.productId)}
              >
                Bỏ
              </button>
            </div>

            <div className="fields fields--supplier-row">
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
                      title={
                        selected
                          ? `${selected.name}${
                              selected.costPerUnit != null
                                ? ` · ${formatMoney(selected.costPerUnit)}`
                                : ''
                            }`
                          : ''
                      }
                    >
                      <option value="">Chọn NCC</option>
                      {options.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.costPerUnit != null
                            ? ` · ${formatMoney(s.costPerUnit)}`
                            : ''}
                          {s.cheapest ? ' · Rẻ nhất' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={
                        overrides[item.productId]?.supplierName ??
                        item.supplierName ??
                        ''
                      }
                      onChange={(e) =>
                        onChangeSupplier(item.productId, {
                          supplierName: e.target.value,
                          supplierId: item.supplierId,
                          costPerUnit: cost,
                        })
                      }
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="fields fields--meta-row">
              <div className="field">
                <div className="field-label">Đặt hàng</div>
                <div className="field-box">
                  <select
                    value={orderTiming}
                    onChange={(e) =>
                      onChangeOrderTiming?.(item.productId, e.target.value)
                    }
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
                    title={
                      unitBase > 1
                        ? `${unitName} (= ${unitBase} sp)`
                        : unitName
                    }
                  >
                    {units.map((u) => (
                      <option
                        key={u.id ?? `name-${u.name}`}
                        value={u.id ?? ''}
                      >
                        {u.name}
                        {Number(u.unitBase) > 1
                          ? ` ×${Number(u.unitBase)}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="fields fields--qty-row">
              <div className="field field--cover">
                <div className="field-label">Đủ bán</div>
                <div className="field-box">
                  <select
                    value={cover}
                    onChange={(e) =>
                      handleCoverChange(Number(e.target.value))
                    }
                  >
                    {COVER_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} ngày
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field field--qty">
                <div className="field-label">
                  SL
                  <span className="field-label-hint"> · {unitName}</span>
                </div>
                <div className="field-box field-box--qty">
                  <input
                    type="number"
                    min={1}
                    value={packQty}
                    onChange={(e) =>
                      onChangeQty(item.productId, Number(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
            {unitBase > 1 ? (
              <div className="qty-hint">
                = {baseQty} sp · {formatMoney(packCost)}/{unitName}
              </div>
            ) : (
              <div className="qty-hint">{formatMoney(cost)}/{unitName}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
