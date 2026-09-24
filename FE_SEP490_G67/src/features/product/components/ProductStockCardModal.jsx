import { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, Clock, Package, Calendar, AlertCircle, AlertTriangle } from 'lucide-react';
import { productsApi } from '../api';
import ProductToast, { ProductToastContainer } from './ProductToast';
import ImportOrderDetailModal from '../../import-order/components/ImportOrderDetailModal';
import '../../../css/Product.css';

export default function ProductStockCardModal({
  isOpen,
  onClose,
  product,
}) {
  const [history, setHistory] = useState([]);
  const [freshProduct, setFreshProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [viewOrderId, setViewOrderId] = useState(null);

  useEffect(() => {
    if (isOpen && product?.id) {
      setLoading(true);
      setErrorMsg('');

      // Fetch fresh detail to get accurate real-time onHand & prices & units
      if (productsApi.getById) {
        productsApi.getById(product.id)
          .then((detail) => {
            if (detail) setFreshProduct(detail);
          })
          .catch(() => { });
      }

      if (productsApi.getPriceHistory) {
        productsApi.getPriceHistory(product.id)
          .then((res) => {
            const list = Array.isArray(res) ? res : res?.result || [];
            setHistory(list);
          })
          .catch((err) => {
            console.error(err);
            setHistory([]);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
        setHistory([]);
      }
    }
  }, [isOpen, product]);

  const expiredBatchesCount = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return 0;
    const now = new Date();
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return history.filter((item) => {
      if (!item.expiryDate) return false;
      try {
        const d = new Date(item.expiryDate);
        if (isNaN(d.getTime())) return false;
        const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return dOnly < nowOnly;
      } catch {
        return false;
      }
    }).length;
  }, [history]);

  if (!isOpen || !product) return null;

  const effectiveProduct = freshProduct || product;

  // Extract base unit label
  const unitLabel = effectiveProduct.baseUnit?.name
    || effectiveProduct.baseUnitName
    || effectiveProduct.unitName
    || effectiveProduct.unit
    || (Array.isArray(effectiveProduct.units) && (effectiveProduct.units.find(u => u.isBase || Number(u.unitBase) === 1) || effectiveProduct.units[0])?.name)
    || 'Cái';

  // Extract conversion units for price breakdowns
  const conversionUnits = (Array.isArray(effectiveProduct.conversionUnits) && effectiveProduct.conversionUnits.length > 0)
    ? effectiveProduct.conversionUnits
    : (Array.isArray(effectiveProduct.units) ? effectiveProduct.units.filter(u => Number(u.unitBase || u.ratio) > 1) : []);

  const onHandValue = effectiveProduct.onHand ?? effectiveProduct.stock ?? effectiveProduct.stockQuantity ?? product.onHand ?? product.stock ?? 0;
  const costPriceValue = effectiveProduct.costPrice ?? product.costPrice ?? (effectiveProduct.importPrice ?? product.importPrice);
  const sellingPriceValue = effectiveProduct.sellingPrice ?? product.sellingPrice ?? (effectiveProduct.sellPrice ?? product.sellPrice);


  const renderExpiryDate = (dateStr) => {
    if (!dateStr) return <span style={{ color: '#94A3B8' }}>N/A</span>;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return <span>{dateStr}</span>;
      const now = new Date();
      const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.ceil((dOnly - nowOnly) / (1000 * 60 * 60 * 24));
      const formatted = d.toLocaleDateString('vi-VN');

      if (diffDays < 0) {
        return (
          <span className="pi-expiry-badge pi-expiry-badge--expired" title={`Đã hết hạn (${Math.abs(diffDays)} ngày trước)`}>
            <AlertCircle size={12} />
            {formatted} (Hết hạn)
          </span>
        );
      }
      return (
        <span style={{ color: '#334155', fontSize: 13, whiteSpace: 'nowrap' }}>
          {formatted}
        </span>
      );
    } catch {
      return <span>{dateStr || 'N/A'}</span>;
    }
  };

  return (
    <div className="pi-modal-backdrop">
      <div className="pi-modal-dialog pi-stock-card-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pi-modal-header">
          <div className="pi-stock-head-info">
            <h2 className="pi-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} color="#2563EB" />
              Thẻ kho & Lịch sử giá
            </h2>
            <div className="pi-modal-subtitle">
              Sản phẩm: <strong>{effectiveProduct.name}</strong> ({effectiveProduct.sku || `SP${effectiveProduct.id}`})
            </div>
          </div>
          <button type="button" className="pi-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Overview Stats Bar with Hover breakdown for Base Unit */}
        <div className="pi-stock-overview-bar">
          <div className="pi-stock-stat-item">
            <span className="pi-stock-stat-label">Tồn kho hiện tại</span>
            <span className="pi-stock-stat-val pi-stock-stat-val--blue">
              {onHandValue} {unitLabel}
            </span>
          </div>

          <div className="pi-stock-stat-item">
            <span className="pi-stock-stat-label">Giá vốn hiện tại</span>
            <div className="pi-price-tooltip-wrapper">
              <span className="pi-stock-stat-val">
                {costPriceValue != null && Number(costPriceValue) >= 0
                  ? `${Number(costPriceValue).toLocaleString('vi-VN')} đ / ${unitLabel}`
                  : 'N/A'}
              </span>
              {costPriceValue != null && Number(costPriceValue) >= 0 && (
                <div className="pi-price-tooltip">
                  <div style={{ fontWeight: 600, marginBottom: 4, color: '#93C5FD' }}>
                    🏷️ Giá vốn trên ĐVT cơ bản: {Number(costPriceValue).toLocaleString('vi-VN')} đ / {unitLabel}
                  </div>
                  {conversionUnits.length > 0 && (
                    <div style={{ fontSize: 11.5, color: '#E2E8F0', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 4, marginTop: 4 }}>
                      <div style={{ fontWeight: 500, color: '#CBD5E1', marginBottom: 2 }}>Giá vốn theo đơn vị quy đổi:</div>
                      {conversionUnits.map(u => {
                        const ratio = Number(u.unitBase || u.ratio || 1);
                        const unitCost = Number(costPriceValue) * ratio;
                        return (
                          <div key={u.id || u.name} style={{ marginLeft: 6 }}>
                            • 1 {u.name} ({ratio} {unitLabel}) ~ <strong>{Math.round(unitCost).toLocaleString('vi-VN')} đ</strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pi-stock-stat-item">
            <span className="pi-stock-stat-label">Giá bán niêm yết</span>
            <div className="pi-price-tooltip-wrapper">
              <span className="pi-stock-stat-val pi-stock-stat-val--green">
                {sellingPriceValue != null && Number(sellingPriceValue) >= 0
                  ? `${Number(sellingPriceValue).toLocaleString('vi-VN')} đ / ${unitLabel}`
                  : 'N/A'}
              </span>
              {sellingPriceValue != null && Number(sellingPriceValue) >= 0 && (
                <div className="pi-price-tooltip">
                  <div style={{ fontWeight: 600, marginBottom: 4, color: '#86EFAC' }}>
                    💰 Giá bán lẻ trên ĐVT cơ bản: {Number(sellingPriceValue).toLocaleString('vi-VN')} đ / {unitLabel}
                  </div>
                  {conversionUnits.length > 0 && (
                    <div style={{ fontSize: 11.5, color: '#E2E8F0', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 4, marginTop: 4 }}>
                      <div style={{ fontWeight: 500, color: '#CBD5E1', marginBottom: 2 }}>Giá bán theo đơn vị quy đổi:</div>
                      {conversionUnits.map(u => {
                        const ratio = Number(u.unitBase || u.ratio || 1);
                        const unitSell = (u.sellingPrice != null && Number(u.sellingPrice) > 0)
                          ? Number(u.sellingPrice)
                          : (u.sellPrice != null && Number(u.sellPrice) > 0)
                            ? Number(u.sellPrice)
                            : Number(sellingPriceValue) * ratio;
                        return (
                          <div key={u.id || u.name} style={{ marginLeft: 6 }}>
                            • {u.name} (x{ratio} {unitLabel}): <strong>{Math.round(unitSell).toLocaleString('vi-VN')} đ</strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Open Draft PO Alert Banner if exists */}
        {(product.openPoCode || product.openPoId) && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 14px',
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#92400E',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📝</span>
              <span>
                Sản phẩm đang có phiếu nhập tạm: <strong>{product.openPoCode || `PO #${product.openPoId}`}</strong>
                {product.openPoQty ? ` (Số lượng chờ nhập: ${product.openPoQty} ${unitLabel})` : ''}
              </span>
            </div>
            {product.openPoId && (
              <button
                type="button"
                onClick={() => setViewOrderId(product.openPoId)}
                style={{
                  color: '#1D4ED8',
                  fontWeight: 600,
                  fontSize: 12.5,
                  background: '#EFF6FF',
                  borderRadius: 6,
                  border: '1px solid #BFDBFE',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                }}
              >
                <span>Xem đơn tạm</span>
                <span>↗</span>
              </button>
            )}
          </div>
        )}

        {/* Body: History Table */}
        <div className="pi-modal-body pi-stock-card-body">
          {/* Expired Batches Warning Banner */}
          {expiredBatchesCount > 0 && (
            <div className="pi-stock-expired-alert-banner">
              <AlertTriangle size={18} className="pi-stock-expired-alert-icon" />
              <div className="pi-stock-expired-alert-text">
                <strong>Cảnh báo hàng hết hạn:</strong> Sản phẩm này có <span className="pi-highlight-expired-count">{expiredBatchesCount} lô nhập đã hết hạn sử dụng</span>. Vui lòng kiểm tra các dòng được đánh dấu đỏ trong bảng lịch sử bên dưới để kịp thời xử lý.
              </div>
            </div>
          )}

          <h3 className="pi-unit-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={15} color="#64748B" />
            Lịch sử biến động giá nhập & Giao dịch kho
          </h3>

          {loading && (
            <div className="pi-stock-loading">
              Đang tải dữ liệu thẻ kho…
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="pi-stock-empty">
              <Package size={36} color="#CBD5E1" />
              <p>Chưa có biến động giao dịch hoặc lịch sử giá cho sản phẩm này.</p>
            </div>
          )}

          {!loading && history.length > 0 && (
            <div className="pi-stock-table-wrap">
              <table className="pi-stock-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Mã chứng từ / Đơn nhập</th>
                    <th>Hạn sử dụng</th>
                    <th>Nhà cung cấp</th>
                    <th style={{ textAlign: 'right' }}>Giá nhập</th>
                    <th style={{ textAlign: 'right' }}>Số lượng</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', whiteSpace: 'nowrap' }}>
                          <Calendar size={13} color="#94A3B8" />
                          {item.orderDate || item.createdAt ? new Date(item.orderDate || item.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>
                        {item.orderId ? (
                          <button
                            type="button"
                            className="pi-order-link"
                            title={`Xem chi tiết đơn nhập #${item.orderCode || item.orderId}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setViewOrderId(item.orderId);
                            }}
                          >
                            {item.orderCode || item.code || `NH${String(item.orderId).padStart(5, '0')}`}
                          </button>
                        ) : (
                          <span style={{ fontWeight: 600, color: '#2563EB' }}>
                            {item.orderCode || item.code || `PO#${idx + 1}`}
                          </span>
                        )}
                      </td>
                      <td>
                        {renderExpiryDate(item.expiryDate)}
                      </td>
                      <td style={{ color: '#334155' }}>
                        {item.supplierName || item.supplier || 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>
                        {item.oldCostPrice != null && item.newCostPrice != null && Number(item.oldCostPrice) !== Number(item.newCostPrice) ? (
                          <div className="pi-price-tooltip-wrapper">
                            <span style={{ fontSize: 11, color: '#64748B', textDecoration: 'line-through', marginRight: 4 }}>
                              {Number(item.oldCostPrice).toLocaleString('vi-VN')} đ
                            </span>
                            <span>{Number(item.newCostPrice).toLocaleString('vi-VN')} đ</span>
                            <div className="pi-price-tooltip pi-price-tooltip--right">
                              <div>Giá nhập mới: {Number(item.newCostPrice).toLocaleString('vi-VN')} đ / {item.unitName || unitLabel}</div>
                              {item.unitBase && Number(item.unitBase) > 1 && (
                                <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 3 }}>
                                  • ĐVT cơ bản: {Number(item.baseCostPerUnit || Math.round(item.newCostPrice / item.unitBase)).toLocaleString('vi-VN')} đ / {item.baseUnitName || unitLabel}<br />
                                  • Tỷ lệ: 1 {item.unitName} = {item.unitBase} {item.baseUnitName || unitLabel}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (item.costPerUnit != null || item.price != null) ? (
                          <div className="pi-price-tooltip-wrapper">
                            <span>{Number(item.costPerUnit ?? item.price).toLocaleString('vi-VN')} đ / {item.unitName || unitLabel}</span>
                            <div className="pi-price-tooltip pi-price-tooltip--right">
                              <div>Giá nhập: {Number(item.costPerUnit ?? item.price).toLocaleString('vi-VN')} đ / {item.unitName || unitLabel}</div>
                              {item.unitBase && Number(item.unitBase) > 1 ? (
                                <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 3 }}>
                                  • ĐVT cơ bản: <strong>{Number(item.baseCostPerUnit || Math.round((item.costPerUnit ?? item.price) / item.unitBase)).toLocaleString('vi-VN')} đ / {item.baseUnitName || unitLabel}</strong><br />
                                  • Tỷ lệ quy đổi: 1 {item.unitName} = {item.unitBase} {item.baseUnitName || unitLabel}
                                </div>
                              ) : (
                                <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 2 }}>
                                  (Giá nhập trên đơn vị cơ bản: {item.unitName || unitLabel})
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        <div className="pi-price-tooltip-wrapper">
                          <span>+{item.quantity ?? item.qty ?? 0} {item.unitName || unitLabel}</span>
                          {item.unitBase && Number(item.unitBase) > 1 && (
                            <div className="pi-price-tooltip pi-price-tooltip--right">
                              Tương đương: +{(item.quantity ?? item.qty ?? 0) * Number(item.unitBase)} {item.baseUnitName || unitLabel} (ĐVT cơ bản)
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ color: '#64748B', fontSize: 12.5 }}>
                        {item.note || item.reason || (item.changeType ? item.changeType : 'Nhập hàng') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pi-modal-footer">
          <button type="button" className="pi-modal-btn pi-modal-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>

        {/* Floating Bottom-Right Toast Notifications */}
        <ProductToastContainer>
          {errorMsg && (
            <ProductToast
              message={errorMsg}
              type="error"
              onClose={() => setErrorMsg('')}
            />
          )}
        </ProductToastContainer>
      </div>

      <ImportOrderDetailModal
        open={!!viewOrderId}
        orderId={viewOrderId}
        onClose={() => setViewOrderId(null)}
      />
    </div>
  );
}
