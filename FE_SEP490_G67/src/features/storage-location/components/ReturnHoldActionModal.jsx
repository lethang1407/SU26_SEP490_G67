import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getShelfLocations } from '../utils/storageLocationUtils';

const CANCEL_REASONS = [
    { value: 'EXPIRED', label: 'Hết hạn' },
    { value: 'DAMAGED', label: 'Hỏng / không sử dụng được' },
    { value: 'OTHER', label: 'Khác' },
];

/**
 * @param {'release' | 'cancel' | 'supplier'} mode
 */
export default function ReturnHoldActionModal({
    open,
    mode,
    item,
    locations = [],
    confirming = false,
    error = null,
    onClose,
    onConfirm,
}) {
    const maxQty = Math.max(0, Number(item?.quantity ?? 0));
    const shelfOptions = useMemo(
        () => getShelfLocations(locations).filter((loc) => !loc.isFull),
        [locations],
    );

    const [quantity, setQuantity] = useState(1);
    const [toLocationId, setToLocationId] = useState('');
    const [method, setMethod] = useState('RETURN');
    const [reasonCode, setReasonCode] = useState('DAMAGED');
    const [reasonNote, setReasonNote] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!open) return;
        setQuantity(maxQty > 0 ? maxQty : 1);
        setToLocationId(shelfOptions[0]?.id ? String(shelfOptions[0].id) : '');
        setMethod('RETURN');
        setReasonCode('DAMAGED');
        setReasonNote('');
        setNote('');
    }, [open, maxQty, item?.id, shelfOptions]);

    if (!open || !item) return null;

    const qtyNum = Number(quantity);
    const qtyValid = Number.isFinite(qtyNum) && qtyNum >= 1 && qtyNum <= maxQty;

    const reasonText =
        reasonCode === 'OTHER'
            ? reasonNote.trim()
            : CANCEL_REASONS.find((r) => r.value === reasonCode)?.label || reasonCode;

    const canSubmit =
        !confirming &&
        qtyValid &&
        (mode !== 'release' || Boolean(toLocationId)) &&
        (mode !== 'cancel' || (reasonCode !== 'OTHER' ? true : reasonNote.trim().length > 0)) &&
        (mode !== 'supplier' || Boolean(method));

    const title =
        mode === 'release'
            ? 'Đẩy hàng vào kho bán'
            : mode === 'cancel'
              ? 'Hủy hàng đổi trả'
              : 'Đổi / trả nhà cung cấp';

    const confirmLabel =
        mode === 'release' ? 'Đẩy vào kho' : mode === 'cancel' ? 'Xác nhận hủy' : 'Tạo phiếu đổi/trả';

    const handleConfirm = () => {
        if (!canSubmit) return;
        if (mode === 'release') {
            onConfirm?.({
                batchLocationId: item.id,
                toLocationId: Number(toLocationId),
                quantity: qtyNum,
            });
            return;
        }
        if (mode === 'cancel') {
            onConfirm?.({
                batchLocationId: item.id,
                quantity: qtyNum,
                reason: reasonText,
            });
            return;
        }
        onConfirm?.({
            batchLocationId: item.id,
            quantity: qtyNum,
            method,
            note: note.trim() || undefined,
        });
    };

    return createPortal(
        <div
            className="supplier-modal-overlay storage-return-hold-action-overlay"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="storage-return-hold-action-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <header className="storage-return-hold-action-modal__header">
                    <h3>{title}</h3>
                    <button type="button" className="storage-return-hold-action-modal__close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </header>

                <div className="storage-return-hold-action-modal__body">
                    <div className="storage-return-hold-action-modal__meta">
                        <div>
                            <span>Sản phẩm</span>
                            <strong>{item.productName || '—'}</strong>
                        </div>
                        <div>
                            <span>Mã lô</span>
                            <strong>{item.batchCode || '—'}</strong>
                        </div>
                        <div>
                            <span>Tồn RT</span>
                            <strong>
                                {maxQty}
                                {item.unit ? ` ${item.unit}` : ''}
                            </strong>
                        </div>
                    </div>

                    <label className="storage-return-hold-action-modal__field">
                        <span>Số lượng xử lý</span>
                        <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            disabled={confirming}
                        />
                    </label>

                    {mode === 'release' ? (
                        <label className="storage-return-hold-action-modal__field">
                            <span>Ô kho đích</span>
                            <select
                                value={toLocationId}
                                onChange={(e) => setToLocationId(e.target.value)}
                                disabled={confirming || shelfOptions.length === 0}
                            >
                                {shelfOptions.length === 0 ? (
                                    <option value="">Không có ô kệ khả dụng</option>
                                ) : (
                                    shelfOptions.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.label || `${loc.zone}-${loc.shelf}-${loc.bin}`}
                                            {loc.isFull ? ' (đầy)' : ''}
                                        </option>
                                    ))
                                )}
                            </select>
                        </label>
                    ) : null}

                    {mode === 'cancel' ? (
                        <>
                            <label className="storage-return-hold-action-modal__field">
                                <span>Lý do hủy</span>
                                <select
                                    value={reasonCode}
                                    onChange={(e) => setReasonCode(e.target.value)}
                                    disabled={confirming}
                                >
                                    {CANCEL_REASONS.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {reasonCode === 'OTHER' ? (
                                <label className="storage-return-hold-action-modal__field">
                                    <span>Ghi chú lý do</span>
                                    <input
                                        type="text"
                                        value={reasonNote}
                                        onChange={(e) => setReasonNote(e.target.value)}
                                        placeholder="Nhập lý do hủy"
                                        disabled={confirming}
                                    />
                                </label>
                            ) : null}
                        </>
                    ) : null}

                    {mode === 'supplier' ? (
                        <>
                            <label className="storage-return-hold-action-modal__field">
                                <span>Hình thức</span>
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    disabled={confirming}
                                >
                                    <option value="RETURN">Trả NCC</option>
                                    <option value="EXCHANGE">Đổi NCC</option>
                                </select>
                            </label>
                            <label className="storage-return-hold-action-modal__field">
                                <span>Ghi chú</span>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Tuỳ chọn"
                                    disabled={confirming}
                                />
                            </label>
                        </>
                    ) : null}

                    {error ? <p className="storage-return-hold-action-modal__error">{error}</p> : null}
                </div>

                <footer className="storage-return-hold-action-modal__footer">
                    <button type="button" className="storage-return-hold-action-modal__btn" onClick={onClose} disabled={confirming}>
                        Huỷ
                    </button>
                    <button
                        type="button"
                        className={`storage-return-hold-action-modal__btn storage-return-hold-action-modal__btn--primary${
                            mode === 'cancel' ? ' storage-return-hold-action-modal__btn--danger' : ''
                        }`}
                        onClick={handleConfirm}
                        disabled={!canSubmit}
                    >
                        {confirming ? 'Đang xử lý...' : confirmLabel}
                    </button>
                </footer>
            </div>
        </div>,
        document.body,
    );
}
