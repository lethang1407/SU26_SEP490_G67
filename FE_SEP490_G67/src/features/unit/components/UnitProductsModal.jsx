import { useState, useMemo } from 'react';
import { X, Search, ArrowRight, Settings } from 'lucide-react';

export default function UnitProductsModal({
  open,
  unit,
  onClose,
  onOpenProductConversion,
}) {
  const [keyword, setKeyword] = useState('');

  const products = useMemo(() => {
    if (!unit?.products) return [];
    if (!keyword.trim()) return unit.products;
    const q = keyword.trim().toLowerCase();
    return unit.products.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q)),
    );
  }, [unit, keyword]);

  if (!open || !unit) return null;

  return (
    <div className="unit-modal-backdrop" onClick={onClose}>
      <div className="unit-modal-dialog unit-modal-dialog--wide" onClick={(e) => e.stopPropagation()}>
        <div className="unit-modal-header">
          <div>
            <h2 className="unit-modal-title">
              Sản phẩm sử dụng đơn vị: <span style={{ color: '#004AC6' }}>{unit.name}</span>
            </h2>
            <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
              Tổng cộng <strong>{unit.totalCount || 0}</strong> sản phẩm đang áp dụng
            </div>
          </div>
          <button type="button" className="unit-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="unit-modal-body" style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <div className="unit-search" style={{ width: '100%', boxSizing: 'border-box' }}>
              <Search size={15} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm theo tên, mã SKU hoặc danh mục…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          {products.length === 0 ? (
            <div className="unit-table-card--empty">
              <p>Chưa có sản phẩm nào sử dụng đơn vị tính này.</p>
            </div>
          ) : (
            <div className="unit-table-card">
              <div className="unit-table-wrap" style={{ maxHeight: '400px' }}>
                <table className="unit-table">
                  <thead>
                    <tr>
                      <th>Mã & Tên sản phẩm</th>
                      <th>Danh mục</th>
                      <th>Vai trò đơn vị</th>
                      <th>Quy đổi / Tỷ lệ</th>
                      <th>Giá bán</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const isBase = p.role === 'base';
                      return (
                        <tr key={`${p.id}-${p.role}`}>
                          <td>
                            <div className="unit-matrix-prod-name">{p.name}</div>
                            <div className="unit-matrix-prod-sku">{p.sku}</div>
                          </td>
                          <td style={{ color: '#475569', fontSize: '13px' }}>{p.categoryName}</td>
                          <td>
                            {isBase ? (
                              <span className="unit-type-pill unit-type-pill--blue">Đơn vị gốc</span>
                            ) : (
                              <span className="unit-type-pill unit-type-pill--purple">Đơn vị quy đổi</span>
                            )}
                          </td>
                          <td>
                            {isBase ? (
                              <span style={{ fontSize: '12.5px', color: '#475569' }}>1 {unit.name} = 1 {unit.name}</span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px' }}>
                                <span>1 {unit.name}</span>
                                <ArrowRight size={12} color="#94A3B8" />
                                <strong>{p.unitBase} {p.baseUnitName}</strong>
                              </div>
                            )}
                          </td>
                          <td>
                            {(p.sellingPrice || p.sellPrice) > 0 ? (
                              <strong style={{ color: '#059669', fontSize: '13px' }}>
                                {Number(p.sellingPrice || p.sellPrice).toLocaleString('vi-VN')} đ
                              </strong>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '12px' }}>Chưa đặt giá</span>
                            )}
                          </td>
                          <td>
                            <div className="unit-actions-cell">
                              <button
                                type="button"
                                className="unit-action-btn"
                                title="Thiết lập quy đổi đơn vị"
                                onClick={() => {
                                  onClose();
                                  onOpenProductConversion?.(p);
                                }}
                              >
                                <Settings size={13} />
                                Cấu hình
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="unit-modal-footer">
          <button type="button" className="cat-btn cat-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
