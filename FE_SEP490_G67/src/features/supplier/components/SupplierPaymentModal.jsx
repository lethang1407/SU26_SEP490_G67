import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../utils/supplierUtils';
import { suppliersApi } from '../api';

// Hiển thị số tiền có dấu phẩy ngăn cách hàng nghìn ngay khi người dùng gõ
// (ví dụ "15000000" -> "15,000,000"), số thật lưu ở dạng chuỗi chỉ chứa chữ số
// ở nơi khác (parsedAmount) nên không ảnh hưởng logic tính toán/gửi API.
function formatAmountInput(rawValue) {
    const digitsOnly = rawValue.replace(/\D/g, '');
    if (!digitsOnly) return '';
    return new Intl.NumberFormat('en-US').format(Number(digitsOnly));
}

export default function SupplierPaymentModal({ open, supplier, onClose, onSubmit, submitting, submitError }) {
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !supplier?.id) return;

        setSelectedOrderId('');
        setAmount('');
        setNotes('');
        setPaymentMethod('CASH');
        setError('');
        setLoadingOrders(true);

        suppliersApi
            .getImportOrders(supplier.id, { status: 'DEBT', size: 100 })
            .then((result) => setOrders(result?.content || []))
            .catch(() => setOrders([]))
            .finally(() => setLoadingOrders(false));
    }, [open, supplier?.id]);

    const selectedOrder = useMemo(
        () => orders.find((order) => String(order.id) === String(selectedOrderId)) || null,
        [orders, selectedOrderId],
    );

    const parsedAmount = Number(String(amount).replace(/\D/g, '')) || 0;
    const remainingAfterPayment = selectedOrder
        ? Math.max(selectedOrder.remainingDebt - parsedAmount, 0)
        : 0;

    if (!open || !supplier) {
        return null;
    }

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!selectedOrder) {
            setError('Vui lòng chọn đơn nợ cần thanh toán.');
            return;
        }
        if (parsedAmount <= 0) {
            setError('Số tiền thanh toán không hợp lệ.');
            return;
        }
        if (parsedAmount > selectedOrder.remainingDebt) {
            setError('Số tiền vượt quá số nợ còn lại của đơn này.');
            return;
        }

        setError('');
        onSubmit({
            orderId: selectedOrder.id,
            orderCode: selectedOrder.orderCode,
            amount: parsedAmount,
            paymentMethod,
            notes: notes.trim(),
        });
    };

    // Lỗi từ server (ví dụ nợ vừa được trả ở nơi khác nên số liệu FE bị cũ) được ưu tiên
    // hiển thị hơn lỗi validate client, vì nó phản ánh đúng trạng thái mới nhất từ DB.
    const displayError = submitError || error;

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal"
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

                <form className="supplier-modal__body" onSubmit={handleSubmit}>
                    <p className="supplier-modal__supplier-name">{supplier.name}</p>

                    {displayError && <p className="supplier-modal__error">{displayError}</p>}

                    <label className="supplier-modal__field">
                        <span>Chọn đơn nợ cần thanh toán *</span>
                        <select
                            value={selectedOrderId}
                            onChange={(event) => {
                                setSelectedOrderId(event.target.value);
                                setAmount('');
                                setError('');
                            }}
                            disabled={loadingOrders || orders.length === 0 || submitting}
                            required
                        >
                            <option value="">
                                {loadingOrders ? 'Đang tải danh sách đơn nợ...' : '-- Chọn đơn nợ --'}
                            </option>
                            {orders.map((order) => (
                                <option key={order.id} value={order.id}>
                                    {order.orderCode}
                                </option>
                            ))}
                        </select>
                        {!loadingOrders && orders.length === 0 && (
                            <span className="supplier-modal__hint">NCC này hiện không có đơn nào đang nợ.</span>
                        )}
                    </label>

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
                            disabled={!selectedOrder || submitting}
                            required
                        />
                    </label>

                    <label className="supplier-modal__field">
                        <span>Hình thức thanh toán</span>
                        <select
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value)}
                            disabled={submitting}
                        >
                            <option value="CASH">Tiền mặt</option>
                            <option value="QR">Chuyển khoản / QR</option>
                        </select>
                    </label>

                    <label className="supplier-modal__field">
                        <span>Ghi chú</span>
                        <textarea
                            rows={3}
                            placeholder="Ghi chú (tuỳ chọn)"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            disabled={submitting}
                        />
                    </label>

                    <div className="supplier-modal__readonly-group">
                        <div className="supplier-modal__readonly-row">
                            <span>Công nợ hiện tại</span>
                            <strong>{selectedOrder ? formatCurrency(selectedOrder.remainingDebt) : '—'}</strong>
                        </div>
                        <div className="supplier-modal__readonly-row">
                            <span>Số tiền trả</span>
                            <strong>{selectedOrder ? formatCurrency(parsedAmount) : '—'}</strong>
                        </div>
                        <div className="supplier-modal__readonly-row">
                            <span>Số nợ còn lại</span>
                            <strong className="supplier-modal__readonly-row--highlight">
                                {selectedOrder ? formatCurrency(remainingAfterPayment) : '—'}
                            </strong>
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
                            disabled={!selectedOrder || submitting}
                        >
                            {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
