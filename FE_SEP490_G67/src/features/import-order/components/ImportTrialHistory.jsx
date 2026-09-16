import { formatCurrency, formatDateTime, formatMoneyPlain } from '../utils/importOrderUtils';

function soldQtyOf(line) {
    const received = Number(line.receivedQty) || 0;
    const counted = Number(line.countedRemainingQty) || 0;
    return Math.max(received - counted, 0);
}

function resultOf(line) {
    const unit = line.unitName ? ` ${line.unitName}` : '';
    const received = Number(line.receivedQty) || 0;
    const sold = soldQtyOf(line);
    const returned = Number(line.returnedQty) || 0;
    const unsellable = Number(line.unsellableQty) || 0;
    const kept = Math.max((Number(line.countedRemainingQty) || 0) - unsellable, 0);
    const parts = [`Nhận ${received}${unit}`];
    if (sold > 0) parts.push(`bán ${sold}${unit}`);
    if (returned > 0) parts.push(`trả ${returned}${unit}`);
    if (kept > 0 && returned <= 0) parts.push(`giữ ${kept}${unit}`);
    if (unsellable > 0) parts.push(`hỏng ${unsellable}${unit}`);
    return parts.join(', ');
}

function paymentOf(settlement) {
    const discount = Number(settlement.discountAmount) || 0;
    const remaining = Number(settlement.remainingDebt) || 0;
    const status = remaining > 0 ? `Còn ${formatCurrency(remaining)}` : 'Đã trả';
    if (discount > 0) {
        return `Giảm ${formatCurrency(discount)} · ${status}`;
    }
    return status;
}

export default function ImportTrialHistory({
    settlements = [],
    emptyText = 'Chưa có lần quyết toán bán thử.',
    hideOrderCode = false,
}) {
    if (!settlements.length) {
        return <p className="supplier-detail-empty-text">{emptyText}</p>;
    }

    return (
        <div className="import-order-expand__table-wrap">
            <table className="import-order-expand__table trial-settle-table import-trial-history-table">
                <thead>
                    <tr>
                        <th>Ngày</th>
                        {hideOrderCode ? null : <th>Phiếu</th>}
                        <th>Sản phẩm</th>
                        <th>Kết quả</th>
                        <th className="trial-settle-table__num">Tiền</th>
                        <th>Thanh toán</th>
                    </tr>
                </thead>
                <tbody>
                    {settlements.map((settlement) => {
                        const lines = settlement.lines?.length ? settlement.lines : [null];
                        const rowSpan = lines.length;
                        return lines.map((line, lineIndex) => (
                            <tr
                                key={
                                    line?.importOrderDetailId
                                    || `${settlement.id || settlement.importOrderId}-${lineIndex}`
                                }
                            >
                                {lineIndex === 0 ? (
                                    <>
                                        <td rowSpan={rowSpan} className="import-trial-history-table__meta">
                                            {formatDateTime(settlement.settledAt)}
                                        </td>
                                        {hideOrderCode ? null : (
                                            <td rowSpan={rowSpan} className="import-trial-history-table__code">
                                                {settlement.orderCode || '—'}
                                            </td>
                                        )}
                                    </>
                                ) : null}
                                <td>{line?.productName || '—'}</td>
                                <td>{line ? resultOf(line) : '—'}</td>
                                <td className="trial-settle-table__num">
                                    {line ? formatMoneyPlain(line.payableAmount) : '—'}
                                </td>
                                {lineIndex === 0 ? (
                                    <td
                                        rowSpan={rowSpan}
                                        className={
                                            Number(settlement.remainingDebt) > 0
                                                ? 'import-trial-history-table__pay import-trial-history-table__pay--debt'
                                                : 'import-trial-history-table__pay import-trial-history-table__pay--done'
                                        }
                                    >
                                        {paymentOf(settlement)}
                                    </td>
                                ) : null}
                            </tr>
                        ));
                    })}
                </tbody>
            </table>
        </div>
    );
}
