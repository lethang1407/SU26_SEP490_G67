import { X, Printer } from 'lucide-react';
import useInvoiceExport from '../hooks/useInvoiceExport';
import { printInvoice } from '../utils/printInvoice';
import { formatVnd } from '../utils/money';


export default function ReceiptModal({ receipt, invoice = null, onClose }) {
    const { invoiceData, isLoading, error, fetchInvoice, clearInvoice } = useInvoiceExport();

    const items = receipt?.items ?? [];
    const total = receipt?.totalAmount ?? receipt?.total ?? 0;

    // Print button handler
    const handlePrint = async () => {
        if (isLoading) return;

        let data = invoice ?? invoiceData;
        if (!data) {
            if (receipt?.id == null) return;
            data = await fetchInvoice(receipt.id);
        }
        if (data) {
            printInvoice(data);
        }
    };

    // Close handler
    const handleClose = () => {
        clearInvoice();
        onClose();
    };

    if (!receipt) return null;

    return (
        <div className="receipt-modal-overlay" onClick={handleClose}>
            <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>

                {/*  Header  */}
                <div className="receipt-modal-header">
                    <div className="receipt-modal-title">
                        Hóa đơn #{receipt.orderCode ?? receipt.id}
                    </div>
                    <button className="batch-modal-close" onClick={handleClose} title="Đóng">
                        <X size={18} />
                    </button>
                </div>

                {/*  Meta  */}
                <div className="receipt-meta">
                    <span>
                        Thời gian:{' '}
                        {receipt.createdAt
                            ? new Date(receipt.createdAt).toLocaleString('vi-VN', {
                                timeZone: 'Asia/Ho_Chi_Minh',
                            })
                            : '—'}
                    </span>
                </div>

                {/*  Items  */}
                <table className="receipt-table">
                    <thead>
                        <tr>
                            <th>Tên hàng</th>
                            <th>ĐVT</th>
                            <th className="text-right">SL</th>
                            <th className="text-right">Đơn giá</th>
                            <th className="text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.name}</td>
                                <td>{item.unitName ?? '—'}</td>
                                <td className="text-right">{item.quantity}</td>
                                <td className="text-right">
                                    {formatVnd(item.unitPrice)}
                                </td>
                                <td className="text-right font-bold">
                                    {formatVnd(item.lineTotal ?? item.unitPrice * item.quantity)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} className="receipt-total-label">TỔNG CỘNG</td>
                            <td className="text-right receipt-total-value">
                                {formatVnd(total)}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/*  Invoice-fetch error  */}
                {error && (
                    <div style={{
                        color: '#dc2626',
                        fontSize: '13px',
                        marginTop: '8px',
                        padding: '6px 10px',
                        background: '#fef2f2',
                        borderRadius: '4px',
                        border: '1px solid #fca5a5',
                    }}>
                        {error}
                    </div>
                )}

                {/*  Actions  */}
                <div className="receipt-actions">
                    <button
                        id="btn-print-invoice"
                        className="btn-checkout"
                        onClick={handlePrint}
                        disabled={isLoading || (!invoice && receipt?.id == null)}
                        title="In hóa đơn"
                    >
                        <Printer size={18} style={{ marginRight: 8 }} />
                        {isLoading ? 'Đang tải...' : 'In'}
                    </button>

                    <button className="receipt-close-btn" onClick={handleClose}>
                        Hủy
                    </button>
                </div>
            </div>
        </div>
    );
}
