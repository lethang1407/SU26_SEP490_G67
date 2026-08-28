import { useEffect } from 'react';
import { X } from 'lucide-react';
import SupplierExpandPanel from './SupplierExpandPanel';

export default function SupplierDetailModal({
    open,
    supplierId,
    supplierName,
    listDebt,
    onClose,
    onPaymentSuccess,
    onSupplierUpdated,
}) {
    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            if (document.querySelectorAll('.supplier-modal-overlay').length > 1) return;
            onClose?.();
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    if (!open || !supplierId) return null;

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-detail-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplier-detail-title"
            >
                <div className="supplier-modal__header supplier-detail-modal__header">
                    <h2 id="supplier-detail-title" className="supplier-modal__title">
                        {supplierName ? `Chi tiết: ${supplierName}` : 'Chi tiết nhà cung cấp'}
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

                <div className="supplier-detail-modal__body">
                    <SupplierExpandPanel
                        supplierId={supplierId}
                        listDebt={listDebt}
                        onPaymentSuccess={onPaymentSuccess}
                        onUpdated={onSupplierUpdated}
                    />
                </div>
            </div>
        </div>
    );
}
