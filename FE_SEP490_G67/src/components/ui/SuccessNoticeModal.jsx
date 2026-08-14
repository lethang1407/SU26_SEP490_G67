import { CheckCircle2, X } from 'lucide-react';

export default function SuccessNoticeModal({
    open,
    title = 'Thành công',
    message,
    onClose,
}) {
    if (!open || !message) return null;

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-modal--confirm success-notice-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="success-notice-title"
            >
                <div className="success-notice-modal__top">
                    <button
                        type="button"
                        className="supplier-modal__close"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body supplier-modal__body--confirm success-notice-modal__body">
                    <CheckCircle2
                        size={48}
                        className="success-notice-modal__icon"
                        aria-hidden="true"
                    />
                    <h2 id="success-notice-title" className="success-notice-modal__title">
                        {title}
                    </h2>
                    <p className="supplier-modal__confirm-text">{message}</p>
                </div>
            </div>
        </div>
    );
}
