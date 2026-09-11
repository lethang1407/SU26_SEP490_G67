import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchImportReturnById } from '../api';
import {
  formatCurrency,
  formatDateOnly,
  formatLineStatus,
  formatMethod,
  formatReturnStatus,
  formatTimeOnly,
  getReturnStatusClass,
} from '../constants';
import '../../../css/ImportOrder.css';
import '../../../css/Supplier.css';
import '../../../css/ImportReturn.css';

export default function ImportReturnDetailModal({ returnId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!returnId) {
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(false);
    fetchImportReturnById(returnId)
      .then((data) => setDetail(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [returnId]);

  if (!returnId) return null;

  const lines = detail?.lines ?? [];

  return (
    <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="supplier-modal supplier-modal--detail"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-return-detail-title"
      >
        <div className="supplier-modal__header">
          <h2 id="import-return-detail-title" className="supplier-modal__title">
            Chi tiết phiếu đổi trả
          </h2>
          <button type="button" className="supplier-modal__close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="supplier-modal__body supplier-modal__body--order-detail">
          {loading ? (
            <p className="supplier-detail-empty-text">Đang tải chi tiết phiếu đổi trả...</p>
          ) : error || !detail ? (
            <p className="supplier-detail-empty-text">
              Không tải được chi tiết phiếu đổi trả. Vui lòng thử lại.
            </p>
          ) : (
            <div className="import-order-info-tab">
              <div className="import-order-expand__header">
                <div className="import-order-expand__header-left">
                  <h3 className="import-order-expand__code">{detail.returnCode || '—'}</h3>
                  <span className={getReturnStatusClass(detail.status)}>
                    {formatReturnStatus(detail.status)}
                  </span>
                </div>
              </div>

              <div className="import-order-expand__info">
                <div className="import-order-expand__info-item">
                  <span className="import-order-expand__label">Người tạo</span>
                  <span className="import-order-expand__value">{detail.createdByName || '—'}</span>
                </div>
                <div className="import-order-expand__info-item">
                  <span className="import-order-expand__label">Ngày tạo</span>
                  <span className="import-order-expand__value">
                    {formatDateOnly(detail.createdAt)}
                  </span>
                </div>
                <div className="import-order-expand__info-item">
                  <span className="import-order-expand__label">Giờ tạo</span>
                  <span className="import-order-expand__value">
                    {formatTimeOnly(detail.createdAt)}
                  </span>
                </div>
                <div className="import-order-expand__info-item">
                  <span className="import-order-expand__label">Ghi chú</span>
                  <span className="import-order-expand__value">
                    {detail.note?.trim() ? detail.note : '—'}
                  </span>
                </div>
              </div>

              <div className="import-order-expand__table-wrap">
                <table className="import-order-expand__table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Tên hàng</th>
                      <th>Số lô</th>
                      <th className="import-order-expand__col-num">SL</th>
                      <th>NCC</th>
                      <th>Hình thức</th>
                      <th>Trạng thái</th>
                      <th className="import-order-expand__col-num">Giá trị</th>
                      <th>Ghi chú</th>
                      <th>HSD mới</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="import-order-expand__empty-cell">
                          Không có dòng hàng
                        </td>
                      </tr>
                    ) : (
                      lines.map((line, index) => (
                        <tr key={line.detailId || index}>
                          <td>{index + 1}</td>
                          <td>
                            <span className="import-order-expand__product-name">
                              {line.productName || '—'}
                            </span>
                            {line.productCode ? (
                              <div className="import-order-expand__value--muted">{line.productCode}</div>
                            ) : null}
                          </td>
                          <td>{line.batchCode || '—'}</td>
                          <td className="import-order-expand__col-num">{line.quantity ?? 0}</td>
                          <td>{line.supplierName || '—'}</td>
                          <td>{formatMethod(line.method)}</td>
                          <td>{formatLineStatus(line.lineStatus)}</td>
                          <td className="import-order-expand__col-num">
                            {formatCurrency(line.lineValue)}
                          </td>
                          <td>{line.note || line.returnReason || '—'}</td>
                          <td>{line.exchangeExpiryDate || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="import-order-expand__summary">
                <div className="import-order-expand__summary-row">
                  <span>Số dòng</span>
                  <strong>{detail.itemCount ?? lines.length}</strong>
                </div>
                <div className="import-order-expand__summary-row">
                  <span>Tổng SL</span>
                  <strong>{detail.totalQuantity ?? lines.reduce((s, l) => s + (l.quantity || 0), 0)}</strong>
                </div>
                <div className="import-order-expand__summary-row import-order-expand__summary-row--grand">
                  <span>Tổng hoàn</span>
                  <strong>{formatCurrency(detail.totalRefund)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="supplier-modal__footer">
          <button type="button" className="supplier-btn supplier-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
