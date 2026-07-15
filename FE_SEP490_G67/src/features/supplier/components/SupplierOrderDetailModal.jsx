import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { IMPORT_ORDER_STATUS_LABEL } from '../constants/mockSupplierDetails';
import { formatCurrency, formatDate } from '../utils/supplierUtils';
import { suppliersApi } from '../api';

export default function SupplierOrderDetailModal({ orderId, onClose }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!orderId) {
            setOrder(null);
            return;
        }

        setLoading(true);
        setError(false);
        suppliersApi
            .getImportOrderDetail(orderId)
            .then((detail) => setOrder(detail))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [orderId]);

    if (!orderId) {
        return null;
    }

    const items = order?.items || [];

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-modal--detail"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplier-order-detail-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="supplier-order-detail-title" className="supplier-modal__title">
                        Chi tiết đơn nhập {order?.orderCode || ''}
                    </h2>
                    <button type="button" className="supplier-modal__close" onClick={onClose} aria-label="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body">
                    {loading ? (
                        <p className="supplier-detail-empty-text">Đang tải chi tiết đơn nhập...</p>
                    ) : error || !order ? (
                        <p className="supplier-detail-empty-text">
                            Không tải được chi tiết đơn nhập. Vui lòng thử lại.
                        </p>
                    ) : (
                        <>
                            <div className="supplier-order-detail__meta">
                                <span>
                                    Ngày nhập: <strong>{formatDate(order.receivedDate)}</strong>
                                </span>
                                <span
                                    className={`supplier-import-status supplier-import-status--${order.status?.toLowerCase()}`}
                                >
                                    {IMPORT_ORDER_STATUS_LABEL[order.status] || order.status}
                                </span>
                            </div>

                            {items.length > 0 ? (
                                <div className="supplier-order-detail__table-wrapper">
                                    <table className="supplier-order-detail__table">
                                        <thead>
                                            <tr>
                                                <th>Mặt hàng</th>
                                                <th>Số lượng</th>
                                                <th>Đơn giá</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr key={`${order.id}-${index}`}>
                                                    <td>{item.productName}</td>
                                                    <td>{item.quantity}</td>
                                                    <td>{formatCurrency(item.costPerUnit)}</td>
                                                    <td>{formatCurrency(item.lineTotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="supplier-detail-empty-text">
                                    Chưa có dữ liệu chi tiết mặt hàng cho đơn nhập này.
                                </p>
                            )}

                            <div className="supplier-order-detail__total">
                                <span>Tổng tiền đơn nhập</span>
                                <strong>{formatCurrency(order.totalCost)}</strong>
                            </div>
                        </>
                    )}

                    <div className="supplier-modal__footer">
                        <button type="button" className="supplier-btn supplier-btn--secondary" onClick={onClose}>
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
