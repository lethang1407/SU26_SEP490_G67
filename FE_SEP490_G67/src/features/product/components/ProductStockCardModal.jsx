import { useState, useEffect } from 'react';
import { X, BookOpen, TrendingUp, TrendingDown, Clock, Package, Calendar } from 'lucide-react';
import { productsApi } from '../api';
import '../../../css/Product.css';

export default function ProductStockCardModal({
  isOpen,
  onClose,
  product,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && product?.id) {
      setLoading(true);
      setErrorMsg('');
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

  if (!isOpen || !product) return null;

  const unitLabel = product.unitName || product.baseUnitName || product.unit || (Array.isArray(product.units) && (product.units.find(u => u.isBase || Number(u.unitBase) === 1) || product.units[0])?.name) || 'Cái';

  return (
    <div className="pi-modal-backdrop" onClick={onClose}>
      <div className="pi-modal-dialog pi-stock-card-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pi-modal-header">
          <div className="pi-stock-head-info">
            <h2 className="pi-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} color="#2563EB" />
              Thẻ kho & Lịch sử giá
            </h2>
            <div className="pi-modal-subtitle">
              Sản phẩm: <strong>{product.name}</strong> ({product.sku || `SP${product.id}`})
            </div>
          </div>
          <button type="button" className="pi-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Overview Stats */}
        <div className="pi-stock-overview-bar">
          <div className="pi-stock-stat-item">
            <span className="pi-stock-stat-label">Tồn kho hiện tại</span>
            <span className="pi-stock-stat-val pi-stock-stat-val--blue">
              {product.onHand ?? product.stock ?? 0} {unitLabel}
            </span>
          </div>
          <div className="pi-stock-stat-item">
            <span className="pi-stock-stat-label">Giá vốn hiện tại</span>
            <span className="pi-stock-stat-val">
              {product.costPrice ? `${Number(product.costPrice).toLocaleString('vi-VN')} đ / ${unitLabel}` : '—'}
            </span>
          </div>
          <div className="pi-stock-stat-item">
            <span className="pi-stock-stat-label">Giá bán niêm yết</span>
            <span className="pi-stock-stat-val pi-stock-stat-val--green">
              {product.sellingPrice ? `${Number(product.sellingPrice).toLocaleString('vi-VN')} đ / ${unitLabel}` : '—'}
            </span>
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
              <a
                href={`/admin/warehouse/import/${product.openPoId}/edit`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#1D4ED8',
                  fontWeight: 600,
                  fontSize: 12.5,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: '#EFF6FF',
                  borderRadius: 6,
                  border: '1px solid #BFDBFE',
                }}
              >
                <span>Xem đơn tạm</span>
                <span>↗</span>
              </a>
            )}
          </div>
        )}

        {/* Body: History Table */}
        <div className="pi-modal-body pi-stock-card-body">
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
                    <th>Nhà cung cấp</th>
                    <th style={{ textAlign: 'right' }}>Giá nhập</th>
                    <th style={{ textAlign: 'right' }}>Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                          <Calendar size={13} color="#94A3B8" />
                          {item.orderDate || item.createdAt ? new Date(item.orderDate || item.createdAt).toLocaleDateString('vi-VN') : '—'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                        {item.orderCode || item.code || `PO#${item.orderId || idx + 1}`}
                      </td>
                      <td style={{ color: '#334155' }}>
                        {item.supplierName || item.supplier || 'Nhà cung cấp'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F172A' }}>
                        {item.costPerUnit || item.price ? `${Number(item.costPerUnit || item.price).toLocaleString('vi-VN')} đ / ${item.unitName || unitLabel}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        +{item.quantity ?? item.qty ?? 0} {item.unitName || unitLabel}
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
      </div>
    </div>
  );
}
