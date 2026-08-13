import { Link } from 'react-router-dom';
import { ExternalLink, ImageIcon } from 'lucide-react';
import { ORDER_STATUS_LABEL } from '../constants';
import { formatDate, formatProductAttributes } from '../utils/importOrderUtils';

function formatMoneyPlain(value) {
    const amount = Number(value) || 0;
    return new Intl.NumberFormat('vi-VN').format(amount);
}

export default function ImportOrderInfoTab({ order }) {
    const items = order.items || [];
    const goodsTotal = Number(order.goodsTotal) || 0;
    const discountAmount = Number(order.discountAmount) || 0;
    const totalCost = Number(order.totalCost) || 0;
    const paidAmount = Number(order.paidAmount) || 0;
    const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const statusClass = String(order.orderStatus || '').toLowerCase();
    const receivedLabel = order.receivedDate ? formatDate(order.receivedDate) : '—';

    return (
        <div className="import-order-info-tab">
            <div className="import-order-expand__header">
                <div className="import-order-expand__header-left">
                    <h3 className="import-order-expand__code">{order.orderCode || '—'}</h3>
                    <span className={`import-order-status import-order-status--${statusClass}`}>
                        {ORDER_STATUS_LABEL[order.orderStatus] || order.orderStatus || '—'}
                    </span>
                </div>
            </div>

            <div className="import-order-expand__info">
                <div className="import-order-expand__info-item">
                    <span className="import-order-expand__label">Người lập</span>
                    <span className="import-order-expand__value">{order.createdByName || '—'}</span>
                </div>
                <div className="import-order-expand__info-item">
                    <span className="import-order-expand__label">Ngày nhập</span>
                    <span
                        className="import-order-expand__value"
                        title={order.receivedDate ? 'Ngày hoàn thành nhập kho' : 'Phiếu tạm chưa nhập kho'}
                    >
                        {receivedLabel}
                    </span>
                </div>
                <div className="import-order-expand__info-item">
                    <span className="import-order-expand__label">Tên NCC</span>
                    {order.supplierId ? (
                        <Link
                            to="/admin/warehouse/supplier"
                            state={{
                                expandSupplierId: order.supplierId,
                                expandSupplierCode: order.supplierCode || '',
                            }}
                            className="import-order-expand__value import-order-expand__value--link"
                            title={order.supplierCode || undefined}
                        >
                            {order.supplierName || '—'}
                        </Link>
                    ) : (
                        <span className="import-order-expand__value">{order.supplierName || '—'}</span>
                    )}
                </div>
                <div className="import-order-expand__info-item">
                    <span className="import-order-expand__label">Ảnh hóa đơn</span>
                    {order.invoiceImage ? (
                        <a
                            href={order.invoiceImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="import-order-expand__invoice-chip"
                            title="Mở ảnh hóa đơn"
                        >
                            <ImageIcon size={14} />
                            <span>Có ảnh · Xem</span>
                            <ExternalLink size={13} />
                        </a>
                    ) : (
                        <span className="import-order-expand__value import-order-expand__value--muted">
                            Không có
                        </span>
                    )}
                </div>
            </div>

            <div className="import-order-expand__table-wrap">
                <table className="import-order-expand__table">
                    <thead>
                        <tr>
                            <th>Tên hàng</th>
                            <th className="import-order-expand__col-num">Số lượng</th>
                            <th className="import-order-expand__col-num">Đơn giá</th>
                            <th className="import-order-expand__col-num">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="import-order-expand__empty-cell">
                                    Phiếu chưa có dòng hàng.
                                </td>
                            </tr>
                        ) : (
                            items.map((item, index) => {
                                const attributeLabel = formatProductAttributes(item.attributes);
                                return (
                                <tr key={item.id || `${order.id}-${index}`}>
                                    <td>
                                        <div className="import-order-expand__product-name-row">
                                            <div className="import-order-expand__product-name">
                                                {item.parentName || item.productName || '—'}
                                            </div>
                                            {item.isPromotion ? (
                                                <span
                                                    className="ioc-promo-badge"
                                                    title="Hàng khuyến mãi / trả thưởng — không thu tiền"
                                                >
                                                    KM
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="import-order-expand__line-meta">
                                            {attributeLabel ? (
                                                <span className="import-order-expand__attrs">
                                                    {attributeLabel}
                                                </span>
                                            ) : null}
                                            {item.expiryDate ? (
                                                <span>
                                                    {attributeLabel ? ' · ' : ''}
                                                    Hạn sử dụng: {formatDate(item.expiryDate)}
                                                </span>
                                            ) : (
                                                <span className="import-order-expand__line-meta--muted">
                                                    {attributeLabel ? ' · ' : ''}
                                                    Chưa ghi hạn sử dụng
                                                </span>
                                            )}
                                            {item.note?.trim() ? (
                                                <span> · Ghi chú: {item.note.trim()}</span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="import-order-expand__col-num">
                                        {item.quantity != null ? (
                                            <>
                                                {item.quantity}
                                                {item.unitName ? (
                                                    <span className="import-order-expand__unit-label">
                                                        {' '}
                                                        {item.unitName}
                                                    </span>
                                                ) : null}
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                    <td className="import-order-expand__col-num">
                                        {formatMoneyPlain(item.costPerUnit)}
                                    </td>
                                    <td
                                        className={`import-order-expand__col-num import-order-expand__col-total ${
                                            item.isPromotion ? 'import-order-expand__col-total--promo' : ''
                                        }`}
                                    >
                                        {item.isPromotion ? (
                                            <span title="Không thu tiền">0</span>
                                        ) : (
                                            formatMoneyPlain(item.lineTotal)
                                        )}
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="import-order-expand__footer">
                <div className="import-order-expand__note-box">
                    <div className="import-order-expand__note-text">
                        {order.note?.trim() ? order.note : 'Không có ghi chú'}
                    </div>
                </div>

                <div className="import-order-expand__summary">
                    <div className="import-order-expand__summary-row">
                        <span>Số lượng mặt hàng</span>
                        <strong>{items.length}</strong>
                    </div>
                    <div className="import-order-expand__summary-row">
                        <span>Tổng tiền hàng{totalQty > 0 ? ` (${totalQty})` : ''}</span>
                        <strong>{formatMoneyPlain(goodsTotal)}</strong>
                    </div>
                    <div className="import-order-expand__summary-row">
                        <span>Giảm giá</span>
                        <strong>{formatMoneyPlain(discountAmount)}</strong>
                    </div>
                    <div className="import-order-expand__summary-row import-order-expand__summary-row--grand">
                        <span>Tổng cộng</span>
                        <strong>{formatMoneyPlain(totalCost)}</strong>
                    </div>
                    <div className="import-order-expand__summary-row">
                        <span>Tiền đã trả NCC</span>
                        <strong>{formatMoneyPlain(paidAmount)}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
