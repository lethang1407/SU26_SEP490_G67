import { X } from 'lucide-react';

/**
 * Modal cảnh báo / xác nhận.
 * - Chỉ confirm: chặn cứng (thiếu NCC, thiếu SP)
 * - cancel + confirm: cảnh báo có thể bỏ qua (thiếu HSD)
 */
export default function ImportOrderAlertModal({
    open,
    title = 'Thông báo',
    message,
    confirmLabel = 'Đồng ý',
    cancelLabel,
    onClose,
    onConfirm,
}) {
    if (!open) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            onClose?.();
        }
    };

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-modal--confirm"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ioc-alert-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="ioc-alert-title" className="supplier-modal__title">
                        {title}
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

                <div className="supplier-modal__body supplier-modal__body--confirm">
                    <p className="supplier-modal__confirm-text">{message}</p>
                </div>

                <div className="supplier-modal__footer">
                    {cancelLabel && (
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--secondary"
                            onClick={onClose}
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary"
                        onClick={handleConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
