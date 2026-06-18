import { useState } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../utils/supplierUtils';

export default function SupplierPaymentModal({ open, supplier, onClose, onSubmit }) {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [notes, setNotes] = useState('');

    if (!open || !supplier) {
        return null;
    }

    const handleSubmit = (event) => {
        event.preventDefault();
        const parsedAmount = Number(String(amount).replace(/\D/g, ''));
        onSubmit({
            amount: parsedAmount,
            paymentMethod,
            notes: notes.trim(),
        });
        setAmount('');
        setNotes('');
        setPaymentMethod('CASH');
    };

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
                    <p className="supplier-modal__debt">
                        Công nợ hiện tại:{' '}
                        <strong>{formatCurrency(supplier.currentDebt)}</strong>
                    </p>

                    <label className="supplier-modal__field">
                        <span>Số tiền trả *</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Nhập số tiền"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            required
                        />
                    </label>

                    <label className="supplier-modal__field">
                        <span>Phương thức</span>
                        <select
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value)}
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
                        />
                    </label>

                    <div className="supplier-modal__footer">
                        <button type="button" className="supplier-btn supplier-btn--secondary" onClick={onClose}>
                            Hủy
                        </button>
                        <button type="submit" className="supplier-btn supplier-btn--primary">
                            Xác nhận thanh toán
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
