import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const MODE = {
    RETURN: 'RETURN',
    EXCHANGE: 'EXCHANGE',
};

const MODE_COPY = {
    [MODE.RETURN]: {
        title: 'Thêm vào phiếu trả NCC',
        qtyLabel: 'Số lượng trả',
        reasonLabel: 'Lý do trả (tuỳ chọn)',
        confirmLabel: 'Trả nhà cung cấp',
        submittingLabel: 'Đang trả...',
        exhaustedHint: 'Đã trả/đổi hết số lượng có thể.',
    },
    [MODE.EXCHANGE]: {
        title: 'Thêm vào phiếu đổi cho NCC',
        qtyLabel: 'Số lượng đổi',
        reasonLabel: 'Lý do đổi (tuỳ chọn)',
        confirmLabel: 'Đổi cho nhà cung cấp',
        submittingLabel: 'Đang thêm...',
        exhaustedHint: 'Đã trả/đổi hết số lượng có thể.',
    },
};

function InfoField({ label, children }) {
    return (
        <div className="inventory-check-summary-field">
            <span className="inventory-check-summary-field__label">{label}</span>
            <div className="inventory-check-summary-field__box">
                <span className="inventory-check-summary-field__value">{children}</span>
            </div>
        </div>
    );
}

export default function AddReturnToDraftModal({
    open,
    line,
    availableQty,
    mode = MODE.RETURN,
    onClose,
    onConfirm,
    submitting = false,
}) {
    const copy = MODE_COPY[mode] ?? MODE_COPY[MODE.RETURN];
    const maxQty = Math.max(
        0,
        Number(availableQty != null ? availableQty : (line?.actualQty ?? 0)),
    );
    const [quantity, setQuantity] = useState(1);
    const [returnEntireBatch, setReturnEntireBatch] = useState(false);
    const [returnReason, setReturnReason] = useState('');

    useEffect(() => {
        if (open) {
            setQuantity(maxQty > 0 ? Math.min(1, maxQty) : 0);
            setReturnEntireBatch(false);
            setReturnReason('');
        }
    }, [open, line, maxQty, mode]);

    if (!open || !line) return null;

    const qtyNum = Number(quantity);
    const unit = line.unit ? ` ${line.unit}` : '';
    const canSubmit =
        !submitting &&
        maxQty >= 1 &&
        Number.isFinite(qtyNum) &&
        qtyNum >= 1 &&
        qtyNum <= maxQty &&
        line.stockBatchId != null &&
        line.importOrderId != null;

    const handleQuantityChange = (value) => {
        setQuantity(value);
        const next = Number(value);
        setReturnEntireBatch(Number.isFinite(next) && next === maxQty && maxQty > 0);
    };

    const handleEntireBatchChange = (checked) => {
        setReturnEntireBatch(checked);
        if (checked) {
            setQuantity(maxQty > 0 ? maxQty : 1);
        }
    };

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm?.({
            batchId: line.stockBatchId,
            quantity: qtyNum,
            returnReason: returnReason.trim() || null,
            method: mode,
            line,
        });
    };

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal add-return-draft-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="return-draft-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="return-draft-title" className="supplier-modal__title">
                        {copy.title}
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
                    <div className="add-return-draft-modal__info">
                        <InfoField label="Sản phẩm">{line.productName || '—'}</InfoField>
                        <InfoField label="Lô">{line.batchCode || '—'}</InfoField>
                        <InfoField label="NCC">{line.supplierName || '—'}</InfoField>
                        <InfoField label="Tồn HT">
                            {Number(line.systemQty ?? 0)}
                            {unit}
                        </InfoField>
                    </div>

                    {maxQty < 1 ? (
                        <p className="add-return-draft-modal__hint">{copy.exhaustedHint}</p>
                    ) : null}

                    <label className="inventory-check-modal-field">
                        <span>{copy.qtyLabel}</span>
                        <input
                            type="number"
                            min={maxQty >= 1 ? 1 : 0}
                            max={maxQty}
                            value={quantity}
                            onChange={(event) => handleQuantityChange(event.target.value)}
                            disabled={submitting || returnEntireBatch || maxQty < 1}
                        />
                    </label>
                    <label className="inventory-check-modal-checkbox">
                        <input
                            type="checkbox"
                            checked={returnEntireBatch}
                            onChange={(event) => handleEntireBatchChange(event.target.checked)}
                            disabled={submitting || maxQty < 1}
                        />
                        <span>
                            Toàn bộ còn lại ({maxQty}
                            {unit})
                        </span>
                    </label>
                    <label className="inventory-check-modal-field">
                        <span>{copy.reasonLabel}</span>
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
                        {submitting ? copy.submittingLabel : copy.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export { MODE as RETURN_DRAFT_MODE };
