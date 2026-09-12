import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../utils/supplierUtils';
import { suppliersApi } from '../api';

function formatAmountInput(rawValue) {
    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) return '';
    return new Intl.NumberFormat('en-US').format(Number(digitsOnly));
}

function trialOf(order) {
    return Math.max(Number(order?.openTrialAmount) || 0, 0);
}

function remainingOf(order) {
    return Math.max(Number(order?.remainingDebt) || 0, 0);
}

/** Phần hàng thường được trả ở modal này — không gồm bán thử. */
function payableNowOf(order) {
    if (order?.payableNowAmount != null) {
        return Math.max(Number(order.payableNowAmount) || 0, 0);
    }
    return Math.max(remainingOf(order) - trialOf(order), 0);
}

export default function SupplierPaymentModal({ open, supplier, onClose, onSubmit, submitting, submitError }) {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !supplier?.id) return;

        setSelectedOrderIds([]);
        setAmount('');
        setNotes('');
        setPaymentMethod('CASH');
        setError('');
        setLoadingOrders(true);

        suppliersApi
            .getImportOrders(supplier.id, { status: 'DEBT', size: 100 })
            .then((result) => {
                const list = (result?.content || []).filter((order) => payableNowOf(order) > 0);
                list.sort((a, b) => {
                    const dateA = a.receivedDate || '';
                    const dateB = b.receivedDate || '';
                    if (dateA !== dateB) return dateA.localeCompare(dateB);
                    return (a.id || 0) - (b.id || 0);
                });
                setOrders(list);
            })
            .catch(() => setOrders([]))
            .finally(() => setLoadingOrders(false));
    }, [open, supplier?.id]);

    const selectedOrders = useMemo(
        () => orders.filter((order) => selectedOrderIds.includes(order.id)),
        [orders, selectedOrderIds],
    );

    const payableNowTotal = useMemo(
        () => selectedOrders.reduce((sum, order) => sum + payableNowOf(order), 0),
        [selectedOrders],
    );
    const selectedTrialTotal = useMemo(
        () => selectedOrders.reduce((sum, order) => sum + trialOf(order), 0),
        [selectedOrders],
    );

    const parsedAmount = Number(String(amount).replace(/\D/g, '')) || 0;
    const remainingAfterPayment = Math.max(payableNowTotal - parsedAmount, 0);
    const allSelected = orders.length > 0 && selectedOrderIds.length === orders.length;
    const hasSelection = selectedOrderIds.length > 0;
    const hasTrialOnSelection = selectedTrialTotal > 0;

    const applySelection = (nextIds) => {
        setSelectedOrderIds(nextIds);
        setError('');
        const nextPayable = orders
            .filter((order) => nextIds.includes(order.id))
            .reduce((sum, order) => sum + payableNowOf(order), 0);
        setAmount(nextPayable > 0 ? formatAmountInput(String(Math.round(nextPayable))) : '');
    };

    const handleToggleOrder = (orderId) => {
        const next = selectedOrderIds.includes(orderId)
            ? selectedOrderIds.filter((id) => id !== orderId)
            : [...selectedOrderIds, orderId];
        applySelection(next);
    };

    const handleToggleAll = () => {
        applySelection(allSelected ? [] : orders.map((order) => order.id));
    };

    if (!open || !supplier) {
        return null;
    }

    const handleSubmit = (event) => {
        event.preventDefault();

        if (selectedOrderIds.length === 0) {
            setError('Vui lòng chọn ít nhất một phiếu nhập để thanh toán.');
            return;
        }
        if (parsedAmount <= 0) {
            setError('Số tiền thanh toán không hợp lệ.');
            return;
        }
        if (parsedAmount > payableNowTotal) {
            setError(
                hasTrialOnSelection
                    ? `Chỉ trả được ${formatCurrency(payableNowTotal)} (hàng thường). Phần bán thử trả khi quyết toán.`
                    : `Số tiền không được vượt quá ${formatCurrency(payableNowTotal)}.`,
            );
            return;
        }

        setError('');
        onSubmit({
            importOrderIds: selectedOrders.map((order) => order.id),
            orderCodes: selectedOrders.map((order) => order.orderCode),
            amount: parsedAmount,
            paymentMethod,
            notes: notes.trim(),
        });
    };

    const displayError = submitError || error;

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal supplier-modal--payment"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="supplier-payment-title"
            >
                <div className="supplier-modal__header">
                    <h2 id="supplier-payment-title" className="supplier-modal__title">
                        Thanh toán nợ NCC
                    </h2>
                    <button type="button" className="supplier-modal__close" onClick={onClose} aria-label="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <form className="supplier-modal__form" onSubmit={handleSubmit}>
                    <div className="supplier-modal__scroll">
                    <p className="supplier-modal__supplier-name">{supplier.name}</p>

                    {displayError && <p className="supplier-modal__error">{displayError}</p>}

                    <div className="supplier-modal__field">
                        <span>Chọn phiếu nhập cần thanh toán *</span>
                        <div className="supplier-payment-orders">
                            {loadingOrders ? (
                                <span className="supplier-modal__hint">Đang tải danh sách phiếu nợ...</span>
                            ) : orders.length === 0 ? (
                                <span className="supplier-modal__hint">NCC này hiện không có phiếu nào đang nợ hàng thường.</span>
                            ) : (
                                <>
                                    <label className="supplier-payment-orders__item supplier-payment-orders__item--all">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={handleToggleAll}
                                            disabled={submitting}
                                        />
                                        <span>Chọn tất cả ({orders.length})</span>
                                    </label>
                                    {orders.map((order) => {
                                        const payable = payableNowOf(order);
                                        const trial = trialOf(order);
                                        return (
                                            <label key={order.id} className="supplier-payment-orders__item">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrderIds.includes(order.id)}
                                                    onChange={() => handleToggleOrder(order.id)}
                                                    disabled={submitting}
                                                />
                                                <span className="supplier-payment-orders__body">
                                                    <span className="supplier-payment-orders__row">
                                                        <span className="supplier-payment-orders__code">
                                                            {order.orderCode}
                                                        </span>
                                                        <span className="supplier-payment-orders__debt">
                                                            {formatCurrency(payable)}
                                                        </span>
                                                    </span>
                                                    {trial > 0 ? (
                                                        <span className="supplier-payment-orders__hint">
                                                            Bán thử {formatCurrency(trial)} — trả khi quyết toán
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>

                    <label className="supplier-modal__field">
                        <span>Số tiền trả *</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Nhập số tiền"
                            value={amount}
                            onChange={(event) => {
                                setAmount(formatAmountInput(event.target.value));
                                setError('');
                            }}
                            disabled={!hasSelection || submitting}
                            required
                        />
                    </label>
                    {hasSelection ? (
                        <p className="supplier-modal__hint supplier-payment-max-hint">
                            Tối đa {formatCurrency(payableNowTotal)}
                            {hasTrialOnSelection ? ' (hàng thường, chưa gồm bán thử)' : ''}
                        </p>
                    ) : null}

                    {hasSelection ? (
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--secondary supplier-payment-pay-all"
                            onClick={() => setAmount(formatAmountInput(String(Math.round(payableNowTotal))))}
                            disabled={submitting}
                        >
                            Trả hết phần được trả ngay
                        </button>
                    ) : null}

                    <label className="supplier-modal__field">
                        <span>Hình thức thanh toán</span>
                        <select
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value)}
                            disabled={submitting}
                        >
                            <option value="CASH">Tiền mặt</option>
                            <option value="QR">Chuyển khoản</option>
                        </select>
                    </label>

                    <label className="supplier-modal__field">
                        <span>Ghi chú</span>
                        <textarea
                            rows={2}
                            placeholder="Ghi chú (tuỳ chọn)"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            disabled={submitting}
                        />
                    </label>

                    <div className="supplier-modal__readonly-group">
                        <div className="supplier-modal__readonly-row">
                            <span>Có thể trả ngay</span>
                            <strong>{hasSelection ? formatCurrency(payableNowTotal) : '—'}</strong>
                        </div>
                        <div className="supplier-modal__readonly-row">
                            <span>Số tiền trả</span>
                            <strong>{hasSelection ? formatCurrency(parsedAmount) : '—'}</strong>
                        </div>
                        <div className="supplier-modal__readonly-row">
                            <span>Còn lại (hàng thường)</span>
                            <strong className="supplier-modal__readonly-row--highlight">
                                {hasSelection ? formatCurrency(remainingAfterPayment) : '—'}
                            </strong>
                        </div>
                        {hasTrialOnSelection ? (
                            <div className="supplier-modal__readonly-row">
                                <span>Bán thử (khi quyết toán)</span>
                                <strong>{formatCurrency(selectedTrialTotal)}</strong>
                            </div>
                        ) : null}
                    </div>
                    </div>

                    <div className="supplier-modal__footer">
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--secondary"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="supplier-btn supplier-btn--primary"
                            disabled={!hasSelection || submitting}
                        >
                            {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
