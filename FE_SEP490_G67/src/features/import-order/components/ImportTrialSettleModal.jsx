import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { importOrdersApi } from '../api';
import { formatCurrency, formatMoneyInput, parseMoneyInput } from '../utils/importOrderUtils';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

function defaultDecision(line) {
    return Number(line.systemRemainingQty) > 0 ? 'PAY_SOLD_RETURN_REST' : 'PAY_SOLD_RETURN_REST';
}

function unitBaseOf(line) {
    return Number(line.unitBase) > 0 ? Number(line.unitBase) : 1;
}

function receivedBaseOf(line) {
    const fromApi = Number(line.receivedBaseQty);
    if (Number.isFinite(fromApi) && fromApi > 0) return fromApi;
    return Math.round((Number(line.receivedQty) || 0) * unitBaseOf(line));
}

function baseUnitOf(line) {
    return line.baseUnitName || line.unitName || '';
}

function costPerBaseOf(line) {
    return Math.round((Number(line.costPerUnit) || 0) / unitBaseOf(line));
}

function hasBaseUnitPrice(line) {
    return unitBaseOf(line) !== 1;
}

function importUnitOf(line) {
    return line.unitName || baseUnitOf(line);
}

function payableOf(line, counted, unsellable, decision) {
    const receivedBase = receivedBaseOf(line);
    const unitBase = unitBaseOf(line);
    const cost = Number(line.costPerUnit) || 0;
    const returnable = Math.max((Number(counted) || 0) - (Number(unsellable) || 0), 0);
    const payableQty = decision === 'PAY_ALL_KEEP' ? receivedBase : Math.max(receivedBase - returnable, 0);
    return (payableQty * cost) / unitBase;
}

export default function ImportTrialSettleModal({ open, orderId, onClose, onSettled }) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [rows, setRows] = useState([]);
    const [paidAmount, setPaidAmount] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [note, setNote] = useState('');
    const paidAmountTouchedRef = useRef(false);
    const discountTouchedRef = useRef(false);

    useEffect(() => {
        if (!open || !orderId) {
            setPreview(null);
            setRows([]);
            setError('');
            setDiscountAmount(0);
            paidAmountTouchedRef.current = false;
            discountTouchedRef.current = false;
            return;
        }
        setLoading(true);
        setError('');
        paidAmountTouchedRef.current = false;
        discountTouchedRef.current = false;
        setDiscountAmount(0);
        importOrdersApi
            .previewTrialSettlement(orderId)
            .then((result) => {
                setPreview(result);
                const nextRows = (result?.lines || []).map((line) => ({
                    importOrderDetailId: line.importOrderDetailId,
                    countedRemainingQty: Number(line.systemRemainingQty) || 0,
                    unsellableQty: 0,
                    decision: defaultDecision(line),
                }));
                setRows(nextRows);
                setNote('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Không tải được thông tin hàng bán thử.');
                setPreview(null);
            })
            .finally(() => setLoading(false));
    }, [open, orderId]);

    const payableTotal = useMemo(() => {
        if (!preview) return 0;
        return (preview.lines || []).reduce((sum, line) => {
            const row = rows.find((item) => item.importOrderDetailId === line.importOrderDetailId);
            if (!row) return sum;
            return sum + payableOf(line, row.countedRemainingQty, row.unsellableQty, row.decision);
        }, 0);
    }, [preview, rows]);

    const safeDiscount = Math.min(Math.max(Number(discountAmount) || 0, 0), payableTotal);
    const netPayable = Math.max(payableTotal - safeDiscount, 0);
    const bookedOpenTrial = Number(preview?.bookedOpenTrialAmount) || 0;
    const currentRemaining = Number(preview?.remainingDebt) || 0;
    const debtAfterSettle = Math.max(currentRemaining - bookedOpenTrial + netPayable, 0);
    const maxPayNow = Math.min(netPayable, debtAfterSettle);
    const trialRemaining = Math.max(netPayable - paidAmount, 0);

    useEffect(() => {
        if (!discountTouchedRef.current) {
            return;
        }
        setDiscountAmount((prev) => Math.min(Math.max(Number(prev) || 0, 0), payableTotal));
    }, [payableTotal]);

    useEffect(() => {
        if (!paidAmountTouchedRef.current) {
            setPaidAmount(maxPayNow);
            return;
        }
        setPaidAmount((prev) => Math.min(Math.max(Number(prev) || 0, 0), maxPayNow));
    }, [maxPayNow]);

    if (!open) return null;

    const updateRow = (detailId, patch) => {
        setRows((prev) =>
            prev.map((row) => (row.importOrderDetailId === detailId ? { ...row, ...patch } : row)),
        );
        setError('');
    };

    const handleSubmit = async () => {
        if (submitting || !preview) return;
        setSubmitting(true);
        setError('');
        try {
            const result = await importOrdersApi.settleTrial(orderId, {
                note: note.trim() || null,
                discountAmount: safeDiscount,
                paidAmount,
                paymentMethod: 'CASH',
                lines: rows.map((row) => ({
                    importOrderDetailId: row.importOrderDetailId,
                    countedRemainingQty: Number(row.countedRemainingQty) || 0,
                    unsellableQty: Number(row.unsellableQty) || 0,
                    decision: row.decision,
                })),
            });
            onSettled?.(result);
            onClose?.();
        } catch (err) {
            setError(err?.response?.data?.message || 'Không quyết toán được. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal trial-settle-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="supplier-modal__header">
                    <h2 className="supplier-modal__title">
                        Quyết toán hàng bán thử
                        {preview?.orderCode ? ` · ${preview.orderCode}` : ''}
                    </h2>
                    <button type="button" className="supplier-modal__close" onClick={onClose} aria-label="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body">
                    {loading ? (
                        <p className="supplier-detail-empty-text">Đang tải số liệu đã bán / còn tồn...</p>
                    ) : error && !preview ? (
                        <p className="supplier-detail-empty-text">{error}</p>
                    ) : !preview?.lines?.length ? (
                        <p className="supplier-detail-empty-text">Phiếu này không còn hàng bán thử đang treo.</p>
                    ) : (
                        <>
                            <p className="ioc-sidebar__upload-hint" style={{ marginBottom: 12 }}>
                                Đối chiếu với nhân viên NCC theo đơn vị cơ bản (chai/gói). Tồn hệ thống là gợi
                                ý từ lúc nhận đến nay. Hàng hỏng, chuột cắn, bóc dở không trả được — tính vào
                                tiền phải trả.
                            </p>
                            <div className="supplier-table-wrapper">
                                <table className="trial-settle-table">
                                    <thead>
                                        <tr>
                                            <th>Sản phẩm</th>
                                            <th className="trial-settle-table__num">Nhận</th>
                                            <th className="trial-settle-table__num">Tồn hệ thống</th>
                                            <th className="trial-settle-table__num">Đã bán</th>
                                            <th className="trial-settle-table__num">Thực tế</th>
                                            <th className="trial-settle-table__num">Hỏng</th>
                                            <th>Xử lý</th>
                                            <th className="trial-settle-table__num">Phải trả</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.lines.map((line) => {
                                            const row = rows.find(
                                                (item) => item.importOrderDetailId === line.importOrderDetailId,
                                            ) || {
                                                countedRemainingQty: line.systemRemainingQty,
                                                unsellableQty: 0,
                                                decision: 'PAY_SOLD_RETURN_REST',
                                            };
                                            const remaining = Number(line.systemRemainingQty) || 0;
                                            const receivedBase = receivedBaseOf(line);
                                            const baseUnit = baseUnitOf(line);
                                            const counted = Math.min(
                                                Math.max(Number(row.countedRemainingQty) || 0, 0),
                                                remaining,
                                            );
                                            const unsellable = Math.min(
                                                Math.max(Number(row.unsellableQty) || 0, 0),
                                                counted,
                                            );
                                            const returnable = counted - unsellable;
                                            const payable = payableOf(
                                                line,
                                                counted,
                                                unsellable,
                                                row.decision,
                                            );
                                            const importUnit = importUnitOf(line);
                                            const showReceivedBase = receivedBase !== Number(line.receivedQty);
                                            return (
                                                <tr key={line.importOrderDetailId}>
                                                    <td>
                                                        <div
                                                            className={
                                                                hasBaseUnitPrice(line)
                                                                    ? 'trial-settle-product'
                                                                    : undefined
                                                            }
                                                        >
                                                            <div className="trial-settle-product__name">
                                                                {line.productName}
                                                            </div>
                                                            <div className="ioc-sidebar__upload-hint">
                                                                {formatCurrency(line.costPerUnit)}
                                                                {importUnit ? ` / ${importUnit}` : ''}
                                                            </div>
                                                            {hasBaseUnitPrice(line) ? (
                                                                <div className="trial-settle-product__tip" role="tooltip">
                                                                    <div>
                                                                        {formatCurrency(line.costPerUnit)}
                                                                        {importUnit ? ` / ${importUnit}` : ''}
                                                                    </div>
                                                                    <div>
                                                                        {formatCurrency(costPerBaseOf(line))}
                                                                        {baseUnit ? ` / ${baseUnit}` : ''}
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        {line.receivedQty}
                                                        {importUnit ? ` ${importUnit}` : ''}
                                                        {showReceivedBase ? (
                                                            <span className="trial-settle-table__sub">
                                                                = {receivedBase}
                                                                {baseUnit ? ` ${baseUnit}` : ''}
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        {remaining}
                                                        {baseUnit ? (
                                                            <span className="trial-settle-qty__unit"> {baseUnit}</span>
                                                        ) : null}
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        {line.suggestedSoldQty}
                                                        {baseUnit ? (
                                                            <span className="trial-settle-qty__unit"> {baseUnit}</span>
                                                        ) : null}
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        <span className="trial-settle-qty">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={remaining}
                                                                value={counted}
                                                                onChange={(event) =>
                                                                    updateRow(line.importOrderDetailId, {
                                                                        countedRemainingQty: Math.min(
                                                                            remaining,
                                                                            Math.max(
                                                                                0,
                                                                                Number(event.target.value) || 0,
                                                                            ),
                                                                        ),
                                                                    })
                                                                }
                                                            />
                                                            {baseUnit ? (
                                                                <span className="trial-settle-qty__unit">
                                                                    {baseUnit}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        <span className="trial-settle-qty">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={counted}
                                                                value={unsellable}
                                                                onChange={(event) =>
                                                                    updateRow(line.importOrderDetailId, {
                                                                        unsellableQty: Math.min(
                                                                            counted,
                                                                            Math.max(
                                                                                0,
                                                                                Number(event.target.value) || 0,
                                                                            ),
                                                                        ),
                                                                    })
                                                                }
                                                            />
                                                            {baseUnit ? (
                                                                <span className="trial-settle-qty__unit">
                                                                    {baseUnit}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {returnable <= 0 ? (
                                                            <span>Thu tiền phần đã bán / hỏng</span>
                                                        ) : (
                                                            <div className="trial-settle-decision">
                                                                <label>
                                                                    <input
                                                                        type="radio"
                                                                        name={`decision-${line.importOrderDetailId}`}
                                                                        checked={
                                                                            row.decision === 'PAY_SOLD_RETURN_REST'
                                                                        }
                                                                        onChange={() =>
                                                                            updateRow(line.importOrderDetailId, {
                                                                                decision: 'PAY_SOLD_RETURN_REST',
                                                                            })
                                                                        }
                                                                    />{' '}
                                                                    Trả phần còn, trả tiền đã bán
                                                                </label>
                                                                <label>
                                                                    <input
                                                                        type="radio"
                                                                        name={`decision-${line.importOrderDetailId}`}
                                                                        checked={row.decision === 'PAY_ALL_KEEP'}
                                                                        onChange={() =>
                                                                            updateRow(line.importOrderDetailId, {
                                                                                decision: 'PAY_ALL_KEEP',
                                                                            })
                                                                        }
                                                                    />{' '}
                                                                    Giữ hết, trả đủ tiền lô
                                                                </label>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        {formatCurrency(payable)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="trial-settle-footer">
                                <textarea
                                    className="ioc-sidebar__textarea trial-settle-footer__note"
                                    rows={3}
                                    placeholder="Ghi chú quyết toán"
                                    value={note}
                                    onChange={(event) => setNote(event.target.value)}
                                />
                                <div className="trial-settle-paybox">
                                    <div className="trial-settle-paybox__row">
                                        <span>Tiền lô thử phải trả</span>
                                        <strong>{formatCurrency(payableTotal)}</strong>
                                    </div>
                                    <div className="trial-settle-paybox__row trial-settle-paybox__row--pay">
                                        <label htmlFor="trial-discount-amount">Giảm giá</label>
                                        <div className="trial-settle-paybox__input">
                                            <input
                                                id="trial-discount-amount"
                                                type="text"
                                                inputMode="numeric"
                                                value={formatMoneyInput(safeDiscount)}
                                                onChange={(event) => {
                                                    discountTouchedRef.current = true;
                                                    setDiscountAmount(
                                                        Math.min(
                                                            payableTotal,
                                                            parseMoneyInput(event.target.value),
                                                        ),
                                                    );
                                                }}
                                            />
                                            <span>đ</span>
                                        </div>
                                    </div>
                                    <div className="trial-settle-paybox__row trial-settle-paybox__row--pay">
                                        <label htmlFor="trial-paid-amount">Trả ngay</label>
                                        <div className="trial-settle-paybox__input">
                                            <input
                                                id="trial-paid-amount"
                                                type="text"
                                                inputMode="numeric"
                                                value={formatMoneyInput(paidAmount)}
                                                onChange={(event) => {
                                                    paidAmountTouchedRef.current = true;
                                                    setPaidAmount(
                                                        Math.min(maxPayNow, parseMoneyInput(event.target.value)),
                                                    );
                                                }}
                                            />
                                            <span>đ</span>
                                        </div>
                                    </div>
                                    <div className="trial-settle-paybox__row">
                                        <span>Còn nợ lô thử</span>
                                        <strong
                                            className={
                                                trialRemaining > 0
                                                    ? 'trial-settle-paybox__remain--debt'
                                                    : 'trial-settle-paybox__remain--clear'
                                            }
                                        >
                                            {formatCurrency(trialRemaining)}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                            {error ? (
                                <p className="supplier-detail-empty-text" style={{ color: '#dc2626' }}>
                                    {error}
                                </p>
                            ) : null}
                        </>
                    )}
                </div>

                <div className="supplier-modal__footer">
                    <button type="button" className="supplier-btn supplier-btn--secondary" onClick={onClose}>
                        Đóng
                    </button>
                    <button
                        type="button"
                        className="supplier-btn supplier-btn--primary"
                        disabled={submitting || loading || !preview?.lines?.length}
                        onClick={handleSubmit}
                    >
                        {submitting ? 'Đang chốt...' : 'Chốt quyết toán'}
                    </button>
                </div>
            </div>
        </div>
    );
}
