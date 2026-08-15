import { useEffect, useRef } from 'react';
import { AlertCircle, Lock } from 'lucide-react';

export default function DebtConfirmModal({
    customer,
    meta,
    summary,
    overdue,
    warning,
    onConfirm,
    onCancel,
}) {
    const cancelRef = useRef(null);

    useEffect(() => {
        cancelRef.current?.focus();
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    return (
        <div
            className="debt-confirm-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div
                className="debt-confirm-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="debt-confirm-title"
            >
                <div className="debt-confirm-head">
                    <AlertCircle size={17} className="debt-confirm-head-icon" />
                    <span id="debt-confirm-title" className="debt-confirm-title">
                        Xác nhận ghi nợ
                    </span>
                </div>
                <div
                    className={`customer-debt-card customer-debt-card--${meta.cls.replace('debt-dot--', '')}`}
                >
                    <div className="cdc-head">
                        <span className={`debt-dot ${meta.cls}`} />
                        <span className="cdc-name">{customer.fullName}</span>
                        {overdue && (
                            <Lock size={14} className="cdc-lock" aria-label="Khách đang nợ quá hạn" />
                        )}
                        <span className="cdc-level">{meta.label}</span>
                    </div>
                    <div className="cdc-summary">{summary ?? 'Đang còn nợ'}</div>
                    {warning && (
                        <div className="cdc-warn">
                            <AlertCircle size={13} />
                            {warning}
                        </div>
                    )}
                </div>

                <div className="debt-confirm-question">Vẫn ghi nợ thêm đơn này?</div>

                <div className="debt-confirm-actions">
                    <button
                        type="button"
                        ref={cancelRef}
                        className="debt-confirm-btn debt-confirm-btn--ghost"
                        onClick={onCancel}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="debt-confirm-btn debt-confirm-btn--primary"
                        onClick={onConfirm}
                    >
                        Ghi nợ
                    </button>
                </div>
            </div>
        </div>
    );
}
