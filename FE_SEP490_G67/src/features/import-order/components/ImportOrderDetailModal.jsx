import { useEffect } from 'react';
import { X } from 'lucide-react';
import ImportOrderExpandPanel from './ImportOrderExpandPanel';

export default function ImportOrderDetailModal({
    open,
    orderId,
    onClose,
    onDraftCancelled,
}) {
    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            if (document.querySelector('.supplier-modal--confirm')) return;
            onClose?.();
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    if (!open || !orderId) return null;

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal import-order-detail-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-order-detail-title"
            >
                <div className="supplier-modal__header import-order-detail-modal__header">
                    <h2 id="import-order-detail-title" className="supplier-modal__title">
                        Chi tiết phiếu nhập
                    </h2>
                    <button
                        type="button"
                        className="supplier-modal__close"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="import-order-detail-modal__body">
                    <ImportOrderExpandPanel
                        orderId={orderId}
                        onDraftCancelled={onDraftCancelled}
                    />
                </div>
            </div>
        </div>
    );
}
