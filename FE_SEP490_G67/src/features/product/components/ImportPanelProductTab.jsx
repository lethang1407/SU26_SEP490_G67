import { useMemo, useState } from 'react';
import { Trash2, Search, Layers, Info } from 'lucide-react';

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

function getBaseUnitName(item) {
  const units = resolveUnits(item);
  const base = units.find((u) => u.isBase || Number(u.unitBase) === 1) || units[0];
  return base?.name || item.unitName || 'Cái';
}

function formatMoney(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')} đ`;
}

export default function ImportPanelProductTab({
  items = [],
  overrides = {},
  supplierFallback = [],
  onChangeQty,
  onChangeSupplier,
  onChangeUnit,
  onRemove,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      const name = (item.productName || item.name || '').toLowerCase();
      const barcode = (item.barcode || '').toLowerCase();
      return name.includes(term) || barcode.includes(term);
    });
  }, [items, searchTerm]);

  if (!items.length) {
    return (
      <div style={{ textAlign: 'center', color: '#64748B', padding: '40px 20px', background: '#FFFFFF', borderRadius: 10, border: '1px dashed #CBD5E1' }}>
        Chưa có sản phẩm nào được chọn vào đơn chuẩn bị.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Thanh Header bảng: Tiêu đề "Hàng hóa chi tiết" + Ô tìm kiếm */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 2 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={18} color="#004AC6" />
          Hàng hóa chi tiết
          <span style={{ fontSize: 12.5, fontWeight: 500, color: '#64748B', background: '#E2E8F0', padding: '2px 8px', borderRadius: 12 }}>
            {items.length} mặt hàng
          </span>
        </div>

        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Tìm theo mã vạch, tên hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 32,
              paddingRight: 10,
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              fontSize: 12.5,
              outline: 'none',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Table Bảng Hàng Hóa */}
      <div className="pi-import-table-wrap">
        <table className="pi-import-table">
          <thead>
            <tr>
              <th style={{ width: 48, textAlign: 'center' }}>STT</th>
              <th style={{ minWidth: 260 }}>Hàng hóa</th>
              <th style={{ width: 140, textAlign: 'center' }}>Tồn / Tối thiểu</th>
              <th style={{ width: 140, textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span>Bán (2 tuần)</span>
                  <span
                    title="Tính theo tổng lượng hàng bán ra trong 14 ngày (2 tuần) gần nhất để dự báo và quyết định số lượng cần nhập chính xác."
                    style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: '#64748B' }}
                  >
                    <Info size={14} />
                  </span>
                </div>
              </th>
              <th style={{ width: 230 }}>Nhà cung cấp</th>
              <th style={{ width: 120 }}>Đơn vị</th>
              <th style={{ width: 105, textAlign: 'center' }}>Số lượng</th>
              <th style={{ width: 130, textAlign: 'right' }}>Đơn giá</th>
              <th style={{ width: 140, textAlign: 'right' }}>Thành tiền</th>
              <th style={{ width: 50, textAlign: 'center' }}>Xóa</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => {
              const ov = overrides[item.productId] || {};
              const units = resolveUnits(item);
              const defaultUnit = pickDefaultUnit(units);
              const unitId = ov.productUnitId ?? defaultUnit?.id ?? '';
              const unitBase = Number(ov.unitBase ?? defaultUnit?.unitBase ?? 1) || 1;
              const packQty = ov.quantity ?? Math.max(1, Math.ceil(Number(item.suggestedQty || 1) / unitBase));
              const cost = Number(ov.costPerUnit ?? resolveCost(item, overrides));
              const lineTotal = packQty * unitBase * cost;

              const onHand = Number(item.onHand || 0);
              const minStock = Number(item.minStock || 0);
              const avgDailyRate = Number(item.avgDailyRate || 0);
              const sold14Days = item.sold14Days != null ? Number(item.sold14Days) : Math.round(avgDailyRate * 14);
              const baseUnitName = getBaseUnitName(item);

              const supplierId = ov.supplierId ?? item.supplierId ?? '';
              const optionsFromSuggest = Array.isArray(item.supplierOptions) ? item.supplierOptions : [];
              const options = optionsFromSuggest.length > 0 ? optionsFromSuggest : supplierFallback;

              const handleSupplierChange = (e) => {
                const id = Number(e.target.value) || null;
                const found = options.find((s) => s.id === id);
                onChangeSupplier?.(item.productId, {
                  supplierId: id,
                  supplierName: found?.name || '',
                  costPerUnit: found?.costPerUnit != null ? Number(found.costPerUnit) : cost,
                  leadTimeDays: found?.leadTimeDays ?? (ov.leadTimeDays ?? item.leadTimeDays ?? 3),
                });
              };

              const handleUnitChange = (e) => {
                const nextId = e.target.value === '' ? null : Number(e.target.value);
                const found = units.find((u) => String(u.id) === String(nextId)) ||
                  units.find((u) => u.id == null && nextId == null) ||
                  defaultUnit;
                const nextBase = Number(found?.unitBase || 1) || 1;
                const nextPackQty = Math.max(1, Math.round((packQty * unitBase) / nextBase));
                onChangeUnit?.(item.productId, {
                  productUnitId: found?.id ?? null,
                  unitName: found?.name || 'sp',
                  unitBase: nextBase,
                  quantity: nextPackQty,
                });
              };

              const handleQtyChange = (e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                onChangeQty?.(item.productId, val);
              };

              return (
                <tr key={item.productId}>
                  <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                    {idx + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13, lineHeight: 1.3 }}>
                      {item.productName || item.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      {item.barcode && (
                        <span style={{ fontSize: 11, background: '#F1F5F9', color: '#475569', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                          {item.barcode}
                        </span>
                      )}
                      {item.variantName && (
                        <span style={{ fontSize: 11, color: '#0284C7' }}>
                          {item.variantName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700 }}>
                      <span
                        style={{
                          color: onHand <= 0 ? '#DC2626' : (minStock > 0 && onHand <= minStock ? '#D97706' : '#1E293B'),
                          background: onHand <= 0 ? '#FEE2E2' : (minStock > 0 && onHand <= minStock ? '#FEF3C7' : 'transparent'),
                          padding: '1px 5px',
                          borderRadius: 4,
                        }}
                        title={`Tồn kho thực tế: ${onHand} ${baseUnitName}`}
                      >
                        {onHand.toLocaleString('vi-VN')}
                      </span>
                      <span style={{ color: '#94A3B8', fontWeight: 400 }}>/</span>
                      <span style={{ color: '#64748B', fontWeight: 600 }} title={`Định mức tồn tối thiểu: ${minStock} ${baseUnitName}`}>
                        {minStock > 0 ? minStock.toLocaleString('vi-VN') : '-'}
                      </span>
                      <span style={{ color: '#64748B', fontSize: 11.5, fontWeight: 500, marginLeft: 2 }}>
                        {baseUnitName}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: sold14Days > 0 ? '#0284C7' : '#94A3B8',
                      }}
                      title={`Đã bán ${sold14Days} ${baseUnitName} trong 14 ngày qua`}
                    >
                      {sold14Days.toLocaleString('vi-VN')} {baseUnitName}
                    </span>
                  </td>
                  <td>
                    <select
                      className="pi-table-select"
                      value={supplierId || ''}
                      onChange={handleSupplierChange}
                    >
                      <option value="">-- Chọn NCC --</option>
                      {options.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.costPerUnit != null ? `(${formatMoney(s.costPerUnit)})` : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="pi-table-select"
                      value={unitId === null || unitId === undefined ? '' : unitId}
                      onChange={handleUnitChange}
                    >
                      {units.map((u) => (
                        <option key={u.id ?? `name-${u.name}`} value={u.id ?? ''}>
                          {u.name} {Number(u.unitBase) > 1 ? `(×${Number(u.unitBase)})` : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      className="pi-table-input"
                      style={{ textAlign: 'center' }}
                      value={packQty}
                      onChange={handleQtyChange}
                    />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: '#475569' }}>
                    {formatMoney(cost)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                    {formatMoney(lineTotal)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="pi-table-btn-del"
                      onClick={() => onRemove(item.productId || item.id)}
                      title="Xóa khỏi đơn chuẩn bị"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
