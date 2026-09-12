import { TRIAL_DECISION_LABEL } from '../constants';
import { formatCurrency, formatDateTime, formatMoneyPlain } from '../utils/importOrderUtils';

function decisionLabel(decision) {
    return TRIAL_DECISION_LABEL[decision] || decision || '—';
}

function soldQtyOf(line) {
    const received = Number(line.receivedQty) || 0;
    const counted = Number(line.countedRemainingQty) || 0;
    return Math.max(received - counted, 0);
}

export default function ImportTrialHistory({
    settlements = [],
    showOrderCode = false,
    emptyText = 'Chưa có lần quyết toán bán thử.',
}) {
    if (!settlements.length) {
        return <p className="supplier-detail-empty-text">{emptyText}</p>;
    }

    return (
        <div className="import-trial-history">
            {settlements.map((settlement, index) => (
                <article
                    key={settlement.id || `${settlement.importOrderId || 'order'}-${settlement.settledAt || index}`}
                    className="supplier-trial-card import-trial-history__card"
                >
                    <div className="supplier-trial-card__head">
                        <div>
                            {showOrderCode ? (
                                <div className="supplier-trial-card__code">
                                    {settlement.orderCode || '—'}
                                </div>
                            ) : (
                                <div className="supplier-trial-card__code">
                                    Quyết toán lần {settlements.length - index}
                                </div>
                            )}
                            <div className="supplier-trial-card__meta">
                                {formatDateTime(settlement.settledAt)}
                            </div>
                        </div>
                        <div className="import-trial-history__totals">
                            <div>
                                Phải trả: <strong>{formatCurrency(settlement.payableAmount)}</strong>
                            </div>
                            <div>
                                Đã trả: <strong>{formatCurrency(settlement.paidAmount)}</strong>
                            </div>
                            {Number(settlement.remainingDebt) > 0 ? (
                                <div>
                                    Còn nợ lần này:{' '}
                                    <strong>{formatCurrency(settlement.remainingDebt)}</strong>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="import-order-expand__table-wrap">
                        <table className="import-order-expand__table trial-settle-table">
                            <thead>
                                <tr>
                                    <th>Tên hàng</th>
                                    <th>ĐVT</th>
                                    <th className="trial-settle-table__num">Nhận</th>
                                    <th className="trial-settle-table__num">Đã bán</th>
                                    <th className="trial-settle-table__num">Trả NCC</th>
                                    <th className="trial-settle-table__num">Hỏng</th>
                                    <th>Quyết định</th>
                                    <th className="trial-settle-table__num">Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(settlement.lines || []).map((line) => (
                                    <tr key={line.importOrderDetailId || `${line.productId}-${line.productName}`}>
                                        <td>{line.productName || '—'}</td>
                                        <td>{line.unitName || '—'}</td>
                                        <td className="trial-settle-table__num">{line.receivedQty ?? '—'}</td>
                                        <td className="trial-settle-table__num">{soldQtyOf(line)}</td>
                                        <td className="trial-settle-table__num">{line.returnedQty ?? 0}</td>
                                        <td className="trial-settle-table__num">{line.unsellableQty ?? 0}</td>
                                        <td>{decisionLabel(line.decision)}</td>
                                        <td className="trial-settle-table__num">
                                            {formatMoneyPlain(line.payableAmount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>
            ))}
        </div>
    );
}
