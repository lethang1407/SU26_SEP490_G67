import { useEffect, useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { getInvoiceData } from '../api';
import { printInvoice } from '../utils/printInvoice';
import OrderStatusBadge from './OrderStatusBadge';
import { formatVnd } from '../utils/money';
import '../../../css/SalesOrderDetailModal.css';

const PAYMENT_LABELS = {
    CASH: 'Tiền mặt',
    TRANSFER: 'Chuyển khoản',
    DEBT: 'Bán nợ',
};

const ItemTable = ({ items = [] }) => (
    <table className="sod-items">
        <thead>
            <tr>
                <th className="sod-col-idx">#</th>
                <th>Sản phẩm</th>
                <th>ĐVT</th>
                <th className="sod-num">SL</th>
                <th className="sod-num">Đơn giá</th>
                <th className="sod-num">Giảm giá</th>
                <th className="sod-num">Thành tiền</th>
            </tr>
        </thead>
        <tbody>
            {items.length === 0 && (
                <tr><td colSpan={7} className="sod-empty">Không có dòng hàng nào</td></tr>
            )}
            {items.map((item, idx) => (
                <tr key={`${item.productName}-${idx}`}>
                    <td className="sod-col-idx">{idx + 1}</td>
                    <td>{item.productName ?? ''}</td>
                    <td>{item.unitName ?? '—'}</td>
                    <td className="sod-num">{item.quantity ?? 0}</td>
                    <td className="sod-num">{formatVnd(item.unitPrice)}</td>
                    <td className="sod-num">
                        {item.discountAmount > 0 ? formatVnd(item.discountAmount) : '—'}
                    </td>
                    <td className="sod-num sod-strong">{formatVnd(item.lineTotal)}</td>
                </tr>
            ))}
        </tbody>
    </table>
);

const TotalRow = ({ label, value, grand }) => (
    <div className={`sod-total-row${grand ? ' sod-total-row--grand' : ''}`}>
        <span>{label}</span>
        <span>{value}</span>
    </div>
);

/**
 * Xem nhanh một hóa đơn ngay trong app. Cùng nguồn dữ liệu với bản in
 * (`/sales-orders/{id}/invoice`) nên số liệu luôn khớp tờ hóa đơn khách cầm về.
 */
export default function SalesOrderDetailModal({ orderId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Component được remount theo `key={orderId}` ở nơi gọi, nên state khởi tạo
    // đã là trạng thái "đang tải" — không cần reset lại trong effect.
    useEffect(() => {
        let alive = true;
        getInvoiceData(orderId)
            .then((result) => { if (alive) setData(result); })
            .catch(() => { if (alive) setError('Không thể tải chi tiết hóa đơn.'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [orderId]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const isExchange = data?.kind === 'EXCHANGE';
    const relatedDocuments = data?.relatedDocuments ?? [];
    const methodLabel = isExchange
        ? PAYMENT_LABELS[data?.refundMethod] ?? data?.refundMethod
        : PAYMENT_LABELS[data?.paymentMethod] ?? data?.paymentMethod;

    return (
        <div className="sod-overlay" onClick={onClose}>
            <div className="sod-modal" onClick={(e) => e.stopPropagation()}>

                <div className="sod-header">
                    <div className="sod-header-title">
                        <span className="sod-header-icon"><FileText size={20} /></span>
                        <div>
                            <div className="sod-title">
                                {isExchange ? 'Phiếu đổi trả' : 'Chi tiết hóa đơn'}
                                {' '}
                                <span className="sod-code">
                                    {data?.orderCode ?? `#${orderId}`}
                                </span>
                            </div>
                            <div className="sod-subtitle">{data?.createdAtVn ?? ''}</div>
                        </div>
                        {data?.orderStatus && <OrderStatusBadge status={data.orderStatus} />}
                    </div>
                    <button className="sod-close-btn" onClick={onClose} title="Đóng">
                        <X size={20} />
                    </button>
                </div>

                <div className="sod-body">
                    {loading && <div className="sod-state">Đang tải...</div>}
                    {!loading && error && <div className="sod-state sod-state--error">{error}</div>}

                    {!loading && !error && data && (
                        <>
                            <dl className="sod-meta">
                                <div>
                                    <dt>Khách hàng</dt>
                                    <dd>{data.customer?.fullName ?? 'Khách lẻ'}</dd>
                                </div>
                                <div>
                                    <dt>Số điện thoại</dt>
                                    <dd>{data.customer?.phoneNumber ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt>Thu ngân</dt>
                                    <dd>{data.cashierName ?? '—'}</dd>
                                </div>
                                <div>
                                    <dt>{isExchange ? 'Hình thức hoàn tiền' : 'Thanh toán'}</dt>
                                    <dd>{methodLabel ?? '—'}</dd>
                                </div>
                                {(isExchange || data.originalOrderCode) && (
                                    <div>
                                        <dt>Hóa đơn gốc</dt>
                                        <dd>{data.originalOrderCode ?? '—'}</dd>
                                    </div>
                                )}
                            </dl>

                            {isExchange ? (
                                <>
                                    <div className="sod-group-title">Hàng khách trả lại</div>
                                    <ItemTable items={data.returnItems} />
                                    <div className="sod-group-title">Hàng khách lấy mới</div>
                                    <ItemTable items={data.exchangeItems} />
                                </>
                            ) : (
                                <ItemTable items={data.items} />
                            )}

                            {/* Vết đổi/trả của hóa đơn này: lịch sử không còn liệt kê chúng
                                thành dòng riêng nên chi tiết hóa đơn gốc phải kể đủ. */}
                            {relatedDocuments.length > 0 && (
                                <div className="sod-related">
                                    <div className="sod-group-title">
                                        Chứng từ đổi/trả ({relatedDocuments.length})
                                    </div>
                                    {relatedDocuments.map((doc) => (
                                        <div key={`${doc.type}-${doc.id}`} className="sod-related-doc">
                                            <div className="sod-related-head">
                                                <span className="sod-related-kind">
                                                    {doc.type === 'EXCHANGE' ? 'Đơn đổi' : 'Phiếu trả'}
                                                </span>
                                                <span className="sod-code">{doc.code ?? `#${doc.id}`}</span>
                                                <span className="sod-related-time">{doc.createdAtVn ?? ''}</span>
                                                <span className="sod-related-amount">
                                                    {doc.type === 'EXCHANGE' ? 'Hàng lấy mới' : 'Hàng trả lại'}
                                                    {': '}
                                                    {formatVnd(doc.amount)}
                                                </span>
                                            </div>
                                            <ItemTable items={doc.items} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="sod-totals">
                                {isExchange ? (
                                    <>
                                        <TotalRow label="Hàng trả lại" value={formatVnd(data.returnSubtotal)} />
                                        <TotalRow label="Hàng lấy mới" value={formatVnd(data.exchangeSubtotal)} />
                                        <TotalRow
                                            grand
                                            label={
                                                data.netAmount > 0 ? 'Tiền hoàn cho khách'
                                                    : data.netAmount < 0 ? 'Khách thanh toán thêm'
                                                        : 'Không phát sinh tiền'
                                            }
                                            value={formatVnd(Math.abs(data.netAmount ?? 0))}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <TotalRow label="Tổng tiền hàng" value={formatVnd(data.subtotal)} />
                                        {data.discountAmount > 0 && (
                                            <TotalRow label="Giảm giá" value={`- ${formatVnd(data.discountAmount)}`} />
                                        )}
                                        <TotalRow grand label="Tổng cộng" value={formatVnd(data.totalAmount)} />
                                        {data.isDebt && (
                                            <>
                                                <TotalRow label="Đã thanh toán" value={formatVnd(data.paidAmount)} />
                                                <TotalRow label="Còn nợ" value={formatVnd(data.remainingDebt)} />
                                                {data.dueDate && (
                                                    <TotalRow
                                                        label="Hạn trả nợ"
                                                        value={new Date(data.dueDate).toLocaleDateString('vi-VN')}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="sod-footer">
                    <button className="sod-btn" onClick={onClose}>Đóng</button>
                    <button
                        className="sod-btn sod-btn--primary"
                        disabled={!data}
                        onClick={() => printInvoice(data)}
                    >
                        <Printer size={15} />
                        In hóa đơn
                    </button>
                </div>
            </div>
        </div>
    );
}
