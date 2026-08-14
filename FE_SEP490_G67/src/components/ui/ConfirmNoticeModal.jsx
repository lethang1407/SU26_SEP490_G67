import { X } from 'lucide-react';

export default function ConfirmNoticeModal({
    open,
    title = 'Xác nhận',
    message,
    confirmLabel = 'Đồng ý',
    cancelLabel = 'Hủy',
    confirming = false,
    danger = false,
    onConfirm,
    onClose,
}) {
    if (!open || !message) return null;

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-modal--confirm"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-notice-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="confirm-notice-title" className="supplier-modal__title">
                        {title}
                    </h2>
                    <button
                        type="button"
                        className="supplier-modal__close"
                        onClick={onClose}
                        aria-label="Đóng"
                        disabled={confirming}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body supplier-modal__body--confirm">
                    <p className="supplier-modal__confirm-text">{message}</p>
                </div>

                <div className="supplier-modal__footer">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--secondary"
                        onClick={onClose}
                        disabled={confirming}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`supplier-btn ${
                            danger ? 'supplier-btn--danger-outline' : 'supplier-btn--primary'
                        }`}
                        onClick={onConfirm}
                        disabled={confirming}
                    >
                        {confirming ? 'Đang xử lý...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
