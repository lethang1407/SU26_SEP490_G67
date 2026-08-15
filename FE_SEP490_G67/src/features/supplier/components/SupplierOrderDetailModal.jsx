import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ImportOrderInfoTab from '../../import-order/components/ImportOrderInfoTab';
import { suppliersApi } from '../api';
import '../../../css/ImportOrder.css';

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
                        Chi tiết phiếu nhập
                    </h2>
                    <button type="button" className="supplier-modal__close" onClick={onClose} aria-label="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body supplier-modal__body--order-detail">
                    {loading ? (
                        <p className="supplier-detail-empty-text">Đang tải chi tiết phiếu nhập...</p>
                    ) : error || !order ? (
                        <p className="supplier-detail-empty-text">
                            Không tải được chi tiết phiếu nhập. Vui lòng thử lại.
                        </p>
                    ) : (
                        <>
                            <ImportOrderInfoTab order={order} hideSupplierLink />
                        </>
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
