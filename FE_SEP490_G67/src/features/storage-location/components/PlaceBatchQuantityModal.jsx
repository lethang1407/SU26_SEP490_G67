import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function InfoField({ label, children }) {
    return (
        <div className="place-batch-qty-modal__field">
            <span className="place-batch-qty-modal__field-label">{label}</span>
            <div className="place-batch-qty-modal__field-box">
                <span className="place-batch-qty-modal__field-value">{children}</span>
            </div>
        </div>
    );
}

export default function PlaceBatchQuantityModal({
    open,
    mode = 'assign',
    batchCode,
    productName,
    unit,
    locationLabel,
    maxQty = 0,
    confirming = false,
    onClose,
    onConfirm,
}) {
    const max = Math.max(0, Number(maxQty) || 0);
    const [quantity, setQuantity] = useState(1);
    const [useAll, setUseAll] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        setQuantity(max > 0 ? 1 : 0);
        setUseAll(false);
        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 50);
        return () => window.clearTimeout(timer);
    }, [open, max, batchCode, locationLabel, mode]);

    if (!open) return null;

    const qtyNum = Number(quantity);
    const canSubmit =
        !confirming &&
        max >= 1 &&
        Number.isFinite(qtyNum) &&
        qtyNum >= 1 &&
        qtyNum <= max;

    const title = mode === 'move' ? 'Chuyển lô vào kệ' : 'Xếp lô vào kệ';
    const confirmLabel = mode === 'move' ? 'Chuyển vào kệ' : 'Xếp vào kệ';

    const handleQuantityChange = (value) => {
        setQuantity(value);
        const next = Number(value);
        setUseAll(Number.isFinite(next) && next === max && max > 0);
    };

    const handleUseAllChange = (checked) => {
        setUseAll(checked);
        if (checked) {
            setQuantity(max > 0 ? max : 0);
        }
    };

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm?.(qtyNum);
    };

    return createPortal(
        <div
            className="supplier-modal-overlay place-batch-qty-modal-overlay"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="supplier-modal supplier-modal--confirm place-batch-qty-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="place-batch-qty-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="place-batch-qty-title" className="supplier-modal__title">
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

                <div className="supplier-modal__body">
                    <div className="place-batch-qty-modal__info">
                        <InfoField label="Sản phẩm">{productName || '—'}</InfoField>
                        <InfoField label="Lô">{batchCode || '—'}</InfoField>
                        <InfoField label="Kệ">{locationLabel || '—'}</InfoField>
                    </div>

                    <label className="inventory-check-modal-field">
                        <span>Số lượng đưa vào kệ</span>
                        <input
                            ref={inputRef}
                            type="number"
                            min={max >= 1 ? 1 : 0}
                            max={max}
                            value={quantity}
                            onChange={(event) => handleQuantityChange(event.target.value)}
                            onMouseDown={(event) => event.stopPropagation()}
                            disabled={confirming || max < 1}
                        />
                    </label>

                    <label className="inventory-check-modal-checkbox">
                        <input
                            type="checkbox"
                            checked={useAll}
                            onChange={(event) => handleUseAllChange(event.target.checked)}
                            disabled={confirming || max < 1}
                        />
                        <span>
                            Tất cả ({max}
                            {unit ? ` ${unit}` : ''})
                        </span>
                    </label>
                </div>

                <div className="supplier-modal__footer">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--secondary"
                        onClick={onClose}
                        disabled={confirming}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary"
                        onClick={handleConfirm}
                        disabled={!canSubmit}
                    >
                        {confirming ? 'Đang lưu...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
