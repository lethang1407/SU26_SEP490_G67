import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function AddReturnToDraftModal({
    open,
    line,
    onClose,
    onConfirm,
    submitting = false,
}) {
    const maxQty = Number(line?.systemQty ?? 0);
    const [quantity, setQuantity] = useState(1);
    const [returnReason, setReturnReason] = useState('');

    useEffect(() => {
        if (open) {
            setQuantity(Math.min(1, maxQty) || 1);
            setReturnReason('');
        }
    }, [open, line, maxQty]);

    if (!open || !line) return null;

    const qtyNum = Number(quantity);
    const canSubmit =
        !submitting &&
        Number.isFinite(qtyNum) &&
        qtyNum >= 1 &&
        qtyNum <= maxQty &&
        line.stockBatchId != null &&
        line.importOrderId != null;

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm?.({
            batchId: line.stockBatchId,
            quantity: qtyNum,
            returnReason: returnReason.trim() || null,
            line,
        });
    };

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="return-draft-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="return-draft-title" className="supplier-modal__title">
                        Thêm vào phiếu trả NCC
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
                        Lô: {line.batchCode || '—'}
                        {line.supplierName ? ` · NCC: ${line.supplierName}` : ''}
                        <br />
                        Tồn lô: {maxQty}
                        {line.unit ? ` ${line.unit}` : ''}
                    </p>
                    <label className="inventory-check-modal-field">
                        <span>Số lượng trả</span>
                        <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            disabled={submitting}
                        />
                    </label>
                    <label className="inventory-check-modal-field">
                        <span>Lý do trả (tuỳ chọn)</span>
                        <input
                            type="text"
                            value={returnReason}
                            placeholder="Ví dụ: gần HSD, bao bì lỗi..."
                            onChange={(event) => setReturnReason(event.target.value)}
                            disabled={submitting}
                        />
                    </label>
                </div>

                <div className="supplier-modal__footer inventory-check-return-modal__footer">
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--danger-outline"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary"
                        onClick={handleConfirm}
                        disabled={!canSubmit}
                    >
                        {submitting ? 'Đang trả...' : 'Trả nhà cung cấp'}
                    </button>
                </div>
            </div>
        </div>
    );
}
