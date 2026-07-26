import { forwardRef } from 'react';
import '../../../css/InvoicePrint.css';

const InvoicePrintLayout = forwardRef(function InvoicePrintLayout({ data }, ref) {
    return (
        <div ref={ref} className="invoice-print-wrapper">
            {data && <InvoiceContent data={data} />}
        </div>
    );
});

function InvoiceContent({ data }) {
    const {
        storeName, storeAddress, taxCode, currency,
        orderId, orderCode, orderStatus, paymentMethod,
        isDebt, subtotal, discountAmount, totalAmount, paidAmount, remainingDebt,
        createdAtVn, cashierName, customer, items = [],
    } = data;

    const isCancelled = orderStatus === 'CANCELLED';
    const fmt = (num) =>
        num != null
            ? Number(num).toLocaleString('vi-VN') + ' ' + (currency ?? 'VND')
            : '—';

    const paymentLabel = {
        CASH: 'Tiền mặt',
        TRANSFER: 'Chuyển khoản',
        DEBT: 'Bán nợ',
    }[paymentMethod] ?? paymentMethod;

    return (
        <div className="invoice-print">

            {/* ── Store header ── */}
            <div className="inv-store-name">{storeName ?? 'Cửa hàng'}</div>
            {storeAddress && <div className="inv-store-meta">{storeAddress}</div>}
            {taxCode && <div className="inv-store-meta">MST: {taxCode}</div>}

            <hr />

            {/* ── Invoice title ── */}
            <div className="inv-title">Hóa đơn bán hàng</div>
            <div className="inv-code">Mã: {orderCode ?? orderId}</div>

            {/* ── Status badges ── */}
            {isCancelled && (
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <span className="inv-badge-cancelled">ĐÃ HỦY</span>
                </div>
            )}
            {isDebt && !isCancelled && (
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <span className="inv-badge-debt">BÁN NỢ</span>
                </div>
            )}

            {/* ── Meta grid ── */}
            <div className="inv-meta-grid">
                <span>Ngày: <strong>{createdAtVn ?? '—'}</strong></span>
                <span>Thu ngân: <strong>{cashierName ?? '—'}</strong></span>
                {customer ? (
                    <>
                        <span>Khách: <strong>{customer.fullName}</strong></span>
                        <span>SĐT: <strong>{customer.phoneNumber}</strong></span>
                    </>
                ) : (
                    <span style={{ gridColumn: '1 / -1' }}>Khách: <strong>Khách lẻ</strong></span>
                )}
                <span>Thanh toán: <strong>{paymentLabel}</strong></span>
            </div>

            <hr />

            {/* ── Line items table ── */}
            <table className="inv-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Tên hàng</th>
                        <th>ĐVT</th>
                        <th className="text-right">SL</th>
                        <th className="text-right">Đơn giá</th>
                        <th className="text-right">Giảm giá</th>
                        <th className="text-right">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={item.productId ?? idx}>
                            <td>{idx + 1}</td>
                            <td>{item.productName}</td>
                            {/* unit_name snapshot — never recalculated*/}
                            <td>{item.unitName ?? '—'}</td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right">
                                {Number(item.unitPrice).toLocaleString('vi-VN')}
                            </td>
                            <td className="text-right">
                                {item.discountAmount > 0
                                    ? Number(item.discountAmount).toLocaleString('vi-VN')
                                    : '—'}
                            </td>
                            <td className="text-right">
                                {Number(item.lineTotal).toLocaleString('vi-VN')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <hr />

            {/* ── Totals ── */}
            <div className="inv-totals">
                <div className="row">
                    <span className="label">Tổng tiền hàng:</span>
                    <span className="value">{fmt(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                    <div className="row">
                        <span className="label">Giảm giá:</span>
                        <span className="value">- {fmt(discountAmount)}</span>
                    </div>
                )}
                <div className="row grand-total">
                    <span className="label">TỔNG CỘNG:</span>
                    <span className="value">{fmt(totalAmount)}</span>
                </div>
                {isDebt && (
                    <>
                        <div className="row">
                            <span className="label">Đã thanh toán:</span>
                            <span className="value">{fmt(paidAmount)}</span>
                        </div>
                        <div className="row remaining-debt">
                            <span className="label">Còn nợ:</span>
                            <span className="value">{fmt(remainingDebt)}</span>
                        </div>
                    </>
                )}
            </div>

            <hr />

            {/* ── Footer ── */}
            <div className="inv-footer">
                Cảm ơn quý khách! Hẹn gặp lại.
            </div>
        </div>
    );
}

export default InvoicePrintLayout;

