import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { importOrdersApi } from '../api';
import { formatCurrency, formatMoneyInput, parseMoneyInput } from '../utils/importOrderUtils';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

function defaultDecision(line) {
    return Number(line.systemRemainingQty) > 0 ? 'PAY_SOLD_RETURN_REST' : 'PAY_SOLD_RETURN_REST';
}

function payableOf(line, counted, unsellable, decision) {
    const received = Number(line.receivedQty) || 0;
    const cost = Number(line.costPerUnit) || 0;
    const returnable = Math.max((Number(counted) || 0) - (Number(unsellable) || 0), 0);
    const payableQty = decision === 'PAY_ALL_KEEP' ? received : Math.max(received - returnable, 0);
    return payableQty * cost;
}

export default function ImportTrialSettleModal({ open, orderId, onClose, onSettled }) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [rows, setRows] = useState([]);
    const [paidAmount, setPaidAmount] = useState(0);
    const [note, setNote] = useState('');
    const paidAmountTouchedRef = useRef(false);

    useEffect(() => {
        if (!open || !orderId) {
            setPreview(null);
            setRows([]);
            setError('');
            paidAmountTouchedRef.current = false;
            return;
        }
        setLoading(true);
        setError('');
        paidAmountTouchedRef.current = false;
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

    const bookedOpenTrial = Number(preview?.bookedOpenTrialAmount) || 0;
    const currentRemaining = Number(preview?.remainingDebt) || 0;
    const debtAfterSettle = Math.max(currentRemaining - bookedOpenTrial + payableTotal, 0);
    const maxPayNow = Math.min(payableTotal, debtAfterSettle);
    const trialRemaining = Math.max(payableTotal - paidAmount, 0);

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
                                Đối chiếu với nhân viên NCC: tồn hệ thống là gợi ý từ lúc nhận đến nay.
                                Hàng hỏng, chuột cắn, bóc dở không trả được — tính vào tiền phải trả.
                            </p>
                            <div className="supplier-table-wrapper">
                                <table className="trial-settle-table">
                                    <thead>
                                        <tr>
                                            <th>Sản phẩm</th>
                                            <th className="trial-settle-table__num">Nhận</th>
                                            <th className="trial-settle-table__num">Tồn HT</th>
                                            <th className="trial-settle-table__num">Đã bán</th>
                                            <th className="trial-settle-table__num">Đếm tay</th>
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
                                            return (
                                                <tr key={line.importOrderDetailId}>
                                                    <td>
                                                        <div>{line.productName}</div>
                                                        <div className="ioc-sidebar__upload-hint">
                                                            {formatCurrency(line.costPerUnit)}
                                                            {line.unitName ? ` / ${line.unitName}` : ''}
                                                        </div>
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        {line.receivedQty}
                                                        {line.unitName ? ` ${line.unitName}` : ''}
                                                    </td>
                                                    <td className="trial-settle-table__num">{remaining}</td>
                                                    <td className="trial-settle-table__num">
                                                        {line.suggestedSoldQty}
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={remaining}
                                                            value={counted}
                                                            onChange={(event) =>
                                                                updateRow(line.importOrderDetailId, {
                                                                    countedRemainingQty: Math.min(
                                                                        remaining,
                                                                        Math.max(0, Number(event.target.value) || 0),
                                                                    ),
                                                                })
                                                            }
                                                        />
                                                    </td>
                                                    <td className="trial-settle-table__num">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={counted}
                                                            value={unsellable}
                                                            onChange={(event) =>
                                                                updateRow(line.importOrderDetailId, {
                                                                    unsellableQty: Math.min(
                                                                        counted,
                                                                        Math.max(0, Number(event.target.value) || 0),
                                                                    ),
                                                                })
                                                            }
                                                        />
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
                                                                    Trả phần còn, thu tiền đã bán
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
                                    placeholder="Ghi chú quyết toán (không bắt buộc)"
                                    value={note}
                                    onChange={(event) => setNote(event.target.value)}
                                />
                                <div className="trial-settle-paybox">
                                    <div className="trial-settle-paybox__row">
                                        <span>Tiền lô thử phải trả</span>
                                        <strong>{formatCurrency(payableTotal)}</strong>
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
