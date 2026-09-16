import { Link } from 'react-router-dom';
import { ExternalLink, ImageIcon } from 'lucide-react';
import { IMPORT_ORDER_STATUS_LABEL, ORDER_STATUS, ORDER_STATUS_LABEL } from '../constants';
import {
    computeDisplayLineTotal,
    computeOpenTrialAmount,
    computeSettledTrialAmount,
    describeSettledTrial,
    formatDate,
    formatMoneyPlain,
    hasSettledTrial,
    resolveLineType,
    settlementLineByDetailId,
} from '../utils/importOrderUtils';
import { mapPendingReturnLine } from '../utils/importReturnAttachUtils';
import ImportOrderReturnSection from './ImportOrderReturnSection';
import ImportTrialHistory from './ImportTrialHistory';

export default function ImportOrderInfoTab({
    order,
    hideSupplierLink = false,
}) {
    const items = order.items || [];
    const regularItems = items.filter((item) => resolveLineType(item) === 'REGULAR');
    const trialItems = items.filter((item) => resolveLineType(item) === 'TRIAL');
    const promoItems = items.filter((item) => resolveLineType(item) === 'PROMOTION');
    const displayItems = [...regularItems, ...trialItems, ...promoItems];
    const returnLines = (order.returnLines || []).map(mapPendingReturnLine);
    const trialSettlements = order.trialSettlements || [];
    const settleByDetailId = settlementLineByDetailId(trialSettlements);
    const computedGoodsTotal = displayItems.reduce(
        (sum, item) => sum + computeDisplayLineTotal(item),
        0,
    );
    const computedOpenTrial = computeOpenTrialAmount(displayItems);
    const computedSettledTrial = computeSettledTrialAmount(displayItems);
    const showSettledTrial =
        trialSettlements.length > 0
        || (hasSettledTrial(displayItems) && order.settledTrialAmount != null);
    const openTrialAmount =
        order.openTrialAmount != null ? Number(order.openTrialAmount) || 0 : computedOpenTrial;
    const settledTrialAmount =
        order.settledTrialAmount != null ? Number(order.settledTrialAmount) || 0 : computedSettledTrial;
    const goodsTotal = computedGoodsTotal;
    const discountAmount = Number(order.discountAmount) || 0;
    const returnDeductionAmount = Number(order.returnDeductionAmount) || 0;
    const supplierRefundAmount = Number(order.supplierRefundAmount) || 0;
    const totalCost = Number(order.totalCost) || 0;
    const paidAmount = Number(order.paidAmount) || 0;
    const remainingDebt =
        order.remainingDebt != null
            ? Number(order.remainingDebt) || 0
            : Math.max(totalCost - paidAmount, 0);
    const netGoods = Math.max(goodsTotal - discountAmount - returnDeductionAmount, 0);
    const isImported = order.orderStatus === ORDER_STATUS.IMPORTED;
    const displayDue = isImported
        ? totalCost
        : Math.max(totalCost, netGoods);
    const itemCount = displayItems.filter((item) => resolveLineType(item) !== 'PROMOTION').length;
    const statusClass = String(order.orderStatus || '').toLowerCase();
    const showPaymentBadge = isImported && Boolean(order.status);
    const receivedLabel = order.receivedDate ? formatDate(order.receivedDate) : '—';

    return (
        <div className="import-order-info-tab">
            <div className="import-order-expand__header">
                <div className="import-order-expand__header-left">
                    <h3 className="import-order-expand__code">{order.orderCode || '—'}</h3>
                    <span className={`import-order-status import-order-status--${statusClass}`}>
                        {ORDER_STATUS_LABEL[order.orderStatus] || order.orderStatus || '—'}
                    </span>
                    {showPaymentBadge ? (
                        <span className={`import-order-status import-order-status--${String(order.status).toLowerCase()}`}>
                            {IMPORT_ORDER_STATUS_LABEL[order.status]}
                        </span>
                    ) : null}
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
                    {order.supplierId && !hideSupplierLink ? (
                        <Link
                            to="/admin/warehouse/supplier"
                            state={{
                                expandSupplierId: order.supplierId,
                                expandSupplierName: order.supplierName || '',
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

            <section className="import-order-expand__import-section">
                <header className="ioc-section__head">
                    <h2 className="ioc-section__title">I. Hàng nhập</h2>
                </header>
                <div className="import-order-expand__table-wrap">
                    <table className="import-order-expand__table">
                        <thead>
                            <tr>
                                <th className="import-order-expand__col-stt">STT</th>
                                <th>Tên hàng</th>
                                <th className="import-order-expand__col-num">Số lượng</th>
                                <th className="import-order-expand__col-num">Đơn giá</th>
                                <th className="import-order-expand__col-num">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="import-order-expand__empty-cell">
                                        Phiếu chưa có dòng hàng.
                                    </td>
                                </tr>
                            ) : (
                                displayItems.map((item, index) => {
                                    const lineType = resolveLineType(item);
                                    const isPromotion = lineType === 'PROMOTION';
                                    const isTrial = lineType === 'TRIAL';
                                    return (
                                    <tr
                                        key={item.id || `${order.id}-${index}`}
                                        className={
                                            isTrial
                                                ? 'import-order-expand__row--trial'
                                                : isPromotion
                                                  ? 'import-order-expand__row--promo'
                                                  : undefined
                                        }
                                    >
                                        <td className="import-order-expand__col-stt">{index + 1}</td>
                                        <td>
                                            <div className="import-order-expand__product-name">
                                                {item.productName || item.parentName || '—'}
                                            </div>
                                            <div className="import-order-expand__line-meta">
                                                {item.expiryDate ? (
                                                    <span>
                                                        Hạn sử dụng: {formatDate(item.expiryDate)}
                                                    </span>
                                                ) : (
                                                    <span className="import-order-expand__line-meta--muted">
                                                        Chưa ghi hạn sử dụng
                                                    </span>
                                                )}
                                                {item.note?.trim() ? (
                                                    <span> · Ghi chú: {item.note.trim()}</span>
                                                ) : null}
                                            </div>
                                            {isTrial ? (
                                                <div className="ioc-line-meta">
                                                    <span
                                                        className={`ioc-promo-chip ioc-trial-chip ioc-trial-chip--on${
                                                            item.trialStatus === 'SETTLED'
                                                                ? ' ioc-trial-chip--settled'
                                                                : ''
                                                        }`}
                                                        title="Hàng bán thử — quyết toán khi nhân viên NCC đến"
                                                    >
                                                        {item.trialStatus === 'SETTLED'
                                                            ? 'Bán thử · đã quyết toán'
                                                            : 'Bán thử'}
                                                    </span>
                                                    {item.trialStatus === 'SETTLED' ? (
                                                        <span className="import-order-expand__settle-note">
                                                            {describeSettledTrial(
                                                                item,
                                                                settleByDetailId.get(item.id),
                                                            )}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : isPromotion ? (
                                                <div className="ioc-line-meta">
                                                    <span
                                                        className="ioc-promo-chip ioc-promo-chip--on"
                                                        title="Hàng khuyến mãi / trả thưởng — không thu tiền"
                                                    >
                                                        Hàng KM
                                                    </span>
                                                </div>
                                            ) : null}
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
                                                isTrial
                                                    ? 'import-order-expand__col-total--trial'
                                                    : isPromotion
                                                      ? 'import-order-expand__col-total--promo'
                                                      : ''
                                            }`}
                                        >
                                            {isPromotion ? (
                                                <span title="Không thu tiền">0</span>
                                            ) : (
                                                <span
                                                    title={
                                                        isTrial && item.trialStatus === 'SETTLED'
                                                            ? 'Giá trị lúc nhận (số lượng × đơn giá)'
                                                            : isTrial
                                                              ? 'Giá trị thỏa thuận — đã ghi vào công nợ NCC'
                                                              : undefined
                                                    }
                                                >
                                                    {formatMoneyPlain(computeDisplayLineTotal(item))}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {trialSettlements.length > 0 ? (
                <section className="import-order-expand__import-section">
                    <header className="ioc-section__head">
                        <h2 className="ioc-section__title">II. Quyết toán bán thử</h2>
                    </header>
                    <ImportTrialHistory
                        settlements={trialSettlements}
                        hideOrderCode
                        emptyText="Chưa có lần quyết toán bán thử."
                    />
                </section>
            ) : null}

            {returnLines.length > 0 ? (
                <div className="import-order-expand__returns">
                    <ImportOrderReturnSection
                        lines={returnLines}
                        selectedLineKeys={returnLines.map((line) => line.key)}
                        readOnly
                        variant="expand"
                    />
                </div>
            ) : null}

            <div className="import-order-expand__footer">
                <div className="import-order-expand__note-box">
                    <div className="import-order-expand__note-text">
                        {order.note?.trim() ? order.note : 'Không có ghi chú'}
                    </div>
                </div>

                <div className="import-order-expand__summary">
                    <div className="import-order-expand__summary-row">
                        <span>Tổng tiền hàng{itemCount > 0 ? ` (${itemCount})` : ''}</span>
                        <strong>{formatMoneyPlain(goodsTotal)}</strong>
                    </div>
                    {openTrialAmount > 0 ? (
                        <div className="import-order-expand__summary-row import-order-expand__summary-row--trial">
                            <span>Hàng bán thử</span>
                            <strong>{formatMoneyPlain(openTrialAmount)}</strong>
                        </div>
                    ) : null}
                    {showSettledTrial ? (
                        <div className="import-order-expand__summary-row import-order-expand__summary-row--trial">
                            <span>Quyết toán bán thử</span>
                            <strong>{formatMoneyPlain(settledTrialAmount)}</strong>
                        </div>
                    ) : null}
                    <div className="import-order-expand__summary-row">
                        <span>Giảm giá</span>
                        <strong>{formatMoneyPlain(discountAmount)}</strong>
                    </div>
                    {returnDeductionAmount > 0 ? (
                        <div className="import-order-expand__summary-row">
                            <span>Trừ hàng trả NCC</span>
                            <strong>−{formatMoneyPlain(returnDeductionAmount)}</strong>
                        </div>
                    ) : null}
                    {supplierRefundAmount > 0 ? (
                        <div className="import-order-expand__summary-row">
                            <span>NCC trả lại</span>
                            <strong>{formatMoneyPlain(supplierRefundAmount)}</strong>
                        </div>
                    ) : null}
                    <div className="import-order-expand__summary-row import-order-expand__summary-row--grand">
                        <span>{supplierRefundAmount > 0 ? 'Cần trả NCC' : 'Tổng cộng'}</span>
                        <strong>{formatMoneyPlain(displayDue)}</strong>
                    </div>
                    <div className="import-order-expand__summary-row">
                        <span>Tiền đã trả NCC</span>
                        <strong>{formatMoneyPlain(paidAmount)}</strong>
                    </div>
                    {remainingDebt > 0 ? (
                        <div className="import-order-expand__summary-row import-order-expand__summary-row--trial">
                            <span>Còn nợ</span>
                            <strong>{formatMoneyPlain(remainingDebt)}</strong>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
