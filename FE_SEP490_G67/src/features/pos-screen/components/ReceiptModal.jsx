import { X, Printer } from 'lucide-react';

/**
 * ReceiptModal
 *
 * Displays the invoice receipt after a successful checkout.
 * "In hóa đơn" triggers window.print().
 */
export default function ReceiptModal({ receipt, onClose }) {
    if (!receipt) return null;

    const items = receipt.items ?? [];
    const total = receipt.total ?? 0;

    return (
        <div className="receipt-modal-overlay" onClick={onClose}>
            <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="receipt-modal-header">
                    <div className="receipt-modal-title">Hóa đơn #{receipt.invoiceCode}</div>
                    <button className="batch-modal-close" onClick={onClose} title="Đóng">
                        <X size={18} />
                    </button>
                </div>

                {/* Meta */}
                <div className="receipt-meta">
                    <span>Ngày: {receipt.createdAt ? new Date(receipt.createdAt).toLocaleString('vi-VN') : '—'}</span>
                    {receipt.customer && (
                        <span>Khách: {receipt.customer.name} – {receipt.customer.phone}</span>
                    )}
                    {!receipt.customer && (
                        <span className="receipt-debt-badge">Bán nợ / Khách lẻ</span>
                    )}
                </div>

                {/* Items */}
                <table className="receipt-table">
                    <thead>
                        <tr>
                            <th>Tên hàng</th>
                            <th>Lô</th>
                            <th className="text-right">SL</th>
                            <th className="text-right">Đơn giá</th>
                            <th className="text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.name}</td>
                                <td><span className="batch-cell">{item.batchCode}</span></td>
                                <td className="text-right">{item.quantity}</td>
                                <td className="text-right">{item.unitPrice?.toLocaleString()}</td>
                                <td className="text-right font-bold">
                                    {(item.unitPrice * item.quantity).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} className="receipt-total-label">TỔNG CỘNG</td>
                            <td className="text-right receipt-total-value">{total.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Actions */}
                <div className="receipt-actions">
                    <button className="btn-checkout" onClick={() => window.print()}>
                        <Printer size={18} style={{ marginRight: 8 }} />
                        In hóa đơn
                    </button>
                    <button className="receipt-close-btn" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
