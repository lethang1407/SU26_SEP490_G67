import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ImportOrderExpandPanel from './ImportOrderExpandPanel';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

export default function ImportOrderDetailModal({
    open,
    orderId,
    onClose,
    onDraftCancelled,
}) {
    const overlayRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            if (document.querySelector('.supplier-modal--confirm')) return;
            const overlays = document.querySelectorAll('.supplier-modal-overlay');
            if (overlays[overlays.length - 1] !== overlayRef.current) return;
            onClose?.();
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    if (!open || !orderId) return null;

    return createPortal(
        <div
            ref={overlayRef}
            className="supplier-modal-overlay supplier-modal-overlay--stacked import-order-detail-modal-overlay"
            onClick={onClose}
            role="presentation"
        >
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
        </div>,
        document.body,
    );
}
