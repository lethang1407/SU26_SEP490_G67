import { AlertTriangle, X } from 'lucide-react';

export default function AlertNoticeModal({
    open,
    title = 'Cảnh báo',
    message,
    onClose,
}) {
    if (!open || !message) return null;

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-modal--confirm alert-notice-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="alert-notice-title"
            >
                <div className="alert-notice-modal__top">
                    <button
                        type="button"
                        className="supplier-modal__close"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body supplier-modal__body--confirm alert-notice-modal__body">
                    <AlertTriangle
                        size={48}
                        className="alert-notice-modal__icon"
                        aria-hidden="true"
                    />
                    <h2 id="alert-notice-title" className="alert-notice-modal__title">
                        {title}
                    </h2>
                    <p className="supplier-modal__confirm-text">{message}</p>
                </div>
            </div>
        </div>
    );
}
