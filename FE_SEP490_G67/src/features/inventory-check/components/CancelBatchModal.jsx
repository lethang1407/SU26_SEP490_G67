import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function CancelBatchModal({
    open,
    line,
    onClose,
    onConfirm,
    submitting = false,
}) {
    const maxQty = Number(line?.systemQty ?? 0);
    const [quantity, setQuantity] = useState(maxQty);

    useEffect(() => {
        if (open) {
            setQuantity(Number(line?.systemQty ?? 0));
        }
    }, [open, line]);

    if (!open || !line) return null;

    const qtyNum = Number(quantity);
    const canSubmit =
        !submitting &&
        Number.isFinite(qtyNum) &&
        qtyNum >= 1 &&
        qtyNum <= maxQty &&
        line.stockBatchId != null;

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm?.({ batchId: line.stockBatchId, quantity: qtyNum, line });
    };

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-batch-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="cancel-batch-title" className="supplier-modal__title">
                        Hủy lô hàng
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

                <div className="supplier-modal__body">
                    <p className="supplier-modal__confirm-text">
                        <strong>{line.productName}</strong>
                        <br />
                        Lô: {line.batchCode || '—'} · Tồn hệ thống: {maxQty}
                        {line.unit ? ` ${line.unit}` : ''}
                    </p>
                    <label className="inventory-check-modal-field">
                        <span>Số lượng hủy</span>
                        <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            disabled={submitting}
                        />
                    </label>
                    <button
                        type="button"
                        className="inventory-btn inventory-btn--secondary"
                        onClick={() => setQuantity(maxQty)}
                        disabled={submitting || maxQty < 1}
                    >
                        Hủy toàn bộ
                    </button>
                </div>

                <div className="supplier-modal__footer">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Đóng
                    </button>
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary"
                        onClick={handleConfirm}
                        disabled={!canSubmit}
                    >
                        {submitting ? 'Đang hủy...' : 'Xác nhận hủy'}
                    </button>
                </div>
            </div>
        </div>
    );
}
