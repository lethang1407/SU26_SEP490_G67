import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, X } from 'lucide-react';

const EXIT_ANIMATION_MS = 300;

export default function SupplierSuccessToast({ message, onDismiss, duration = 4000 }) {
    const [visible, setVisible] = useState(true);
    const [exiting, setExiting] = useState(false);

    const dismiss = useCallback(() => {
        setExiting(true);
        setTimeout(() => {
            setVisible(false);
            onDismiss?.();
        }, EXIT_ANIMATION_MS);
    }, [onDismiss]);

    useEffect(() => {
        const timer = setTimeout(dismiss, duration);
        return () => clearTimeout(timer);
    }, [dismiss, duration]);

    if (!visible) {
        return null;
    }

    return (
        <div
            className={`supplier-toast${exiting ? ' supplier-toast--exit' : ''}`}
            role="status"
            aria-live="polite"
        >
            <CircleCheck size={18} className="supplier-toast__icon" aria-hidden="true" />
            <span className="supplier-toast__text">{message}</span>
            <button
                type="button"
                className="supplier-toast__close"
                onClick={dismiss}
                aria-label="Đóng thông báo"
            >
                <X size={16} />
            </button>
        </div>
    );
}
