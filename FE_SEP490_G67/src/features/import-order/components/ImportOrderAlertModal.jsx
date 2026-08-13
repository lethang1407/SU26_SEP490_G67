import { X } from 'lucide-react';

/**
 * Modal cảnh báo / xác nhận.
 * - Chỉ confirm: chặn cứng (thiếu NCC, thiếu SP)
 * - cancel + confirm: cảnh báo có thể bỏ qua (thiếu HSD)
 * - cancel + danger + confirm: rời trang khi chưa lưu
 */
export default function ImportOrderAlertModal({
    open,
    title = 'Thông báo',
    message,
    confirmLabel = 'Đồng ý',
    cancelLabel,
    dangerLabel,
    onClose,
    onConfirm,
    onDanger,
    confirmDisabled = false,
    dangerDisabled = false,
}) {
    if (!open) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            onClose?.();
        }
    };

    const isLeaveGuard = Boolean(dangerLabel);

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className={`supplier-modal supplier-modal--confirm${isLeaveGuard ? ' supplier-modal--leave-guard' : ''}`}
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

                <div className={`supplier-modal__footer${isLeaveGuard ? ' supplier-modal__footer--leave-guard' : ''}`}>
                    {cancelLabel && (
                        <button
                            type="button"
                            className={`supplier-btn ${isLeaveGuard ? 'supplier-btn--stay' : 'supplier-btn--secondary'}`}
                            onClick={onClose}
                        >
                            {cancelLabel}
                        </button>
                    )}
                    {dangerLabel && (
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--danger-outline"
                            onClick={() => onDanger?.()}
                            disabled={dangerDisabled}
                        >
                            {dangerLabel}
                        </button>
                    )}
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary"
                        onClick={handleConfirm}
                        disabled={confirmDisabled}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
