import { useCallback, useEffect, useState } from 'react';
import { suppliersApi } from '../api';
import { formatCurrency, formatDate } from '../utils/supplierUtils';
import ImportTrialSettleModal from '../../import-order/components/ImportTrialSettleModal';
import ImportTrialHistory from '../../import-order/components/ImportTrialHistory';
import '../../../css/ImportOrder.css';

function trialApiErrorMessage(error) {
    return error?.response?.data?.message
        || error?.message
        || 'Không tải được hàng bán thử. Vui lòng thử lại.';
}

export default function SupplierTrialTab({ supplierId, refreshToken, onSettled }) {
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [settlingOrderId, setSettlingOrderId] = useState(null);

    const fetchData = useCallback(() => {
        if (!supplierId) return;
        setLoading(true);
        setError('');
        Promise.allSettled([
            suppliersApi.getOpenTrial(supplierId),
            suppliersApi.getTrialHistory(supplierId),
        ])
            .then(([openResult, historyResult]) => {
                const openFailed = openResult.status === 'rejected';
                const historyFailed = historyResult.status === 'rejected';
                setOrders(openFailed ? [] : (openResult.value || []));
                setHistory(historyFailed ? [] : (historyResult.value || []));
                if (openFailed || historyFailed) {
                    const reason = openFailed ? openResult.reason : historyResult.reason;
                    setError(trialApiErrorMessage(reason));
                }
            })
            .finally(() => setLoading(false));
    }, [supplierId]);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshToken]);

    if (loading) {
        return <p className="supplier-detail-empty-text">Đang tải hàng bán thử...</p>;
    }

    if (error && !orders.length && !history.length) {
        return (
            <div className="supplier-trial-tab">
                <p className="supplier-detail-empty-text supplier-trial-tab__error">{error}</p>
                <button type="button" className="supplier-btn supplier-btn--primary" onClick={fetchData}>
                    Thử lại
                </button>
            </div>
        );
    }

    if (!orders.length && !history.length) {
        return (
            <p className="supplier-detail-empty-text">
                Chưa có hàng bán thử với nhà cung cấp này.
            </p>
        );
    }

    return (
        <div className="supplier-trial-tab">
            {error ? (
                <p className="supplier-detail-empty-text supplier-trial-tab__error">{error}</p>
            ) : null}
            {orders.length > 0 ? (
                <section>
                    {orders.map((order) => (
                        <article key={order.importOrderId} className="supplier-trial-card">
                            <div className="supplier-trial-card__head">
                                <div>
                                    <div className="supplier-trial-card__code">{order.orderCode}</div>
                                    <div className="supplier-trial-card__meta">
                                        Ngày nhận: {formatDate(order.receivedDate)} · Ước tính nếu trả phần còn:{' '}
                                        {formatCurrency(order.estimatedPayableIfReturnRest)} · Nếu giữ hết:{' '}
                                        {formatCurrency(order.estimatedPayableIfKeepAll)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="supplier-btn supplier-btn--primary"
                                    onClick={() => setSettlingOrderId(order.importOrderId)}
                                >
                                    Quyết toán
                                </button>
                            </div>
                            <ul className="supplier-trial-card__lines">
                                {(order.lines || []).map((line) => {
                                    const unitBase = Number(line.unitBase) > 0 ? Number(line.unitBase) : 1;
                                    const baseUnit = line.baseUnitName || line.unitName || '';
                                    const showBasePrice =
                                        unitBase !== 1 || (baseUnit && baseUnit !== line.unitName);
                                    const costPerBase = Math.round((Number(line.costPerUnit) || 0) / unitBase);
                                    return (
                                    <li key={line.importOrderDetailId}>
                                        <span
                                            className={showBasePrice ? 'trial-settle-product' : undefined}
                                        >
                                            <span className={showBasePrice ? 'trial-settle-product__name' : undefined}>
                                                {line.productName}
                                            </span>
                                            {showBasePrice ? (
                                                <span className="trial-settle-product__tip" role="tooltip">
                                                    <span>
                                                        {formatCurrency(line.costPerUnit)}
                                                        {line.unitName ? ` / ${line.unitName}` : ''}
                                                    </span>
                                                    <span>
                                                        {formatCurrency(costPerBase)}
                                                        {baseUnit ? ` / ${baseUnit}` : ''}
                                                    </span>
                                                </span>
                                            ) : null}
                                        </span>
                                        : nhận {line.receivedQty}
                                        {line.unitName || line.baseUnitName
                                            ? ` ${line.unitName || line.baseUnitName}`
                                            : ''}
                                        {Number(line.receivedBaseQty) > 0
                                        && Number(line.receivedBaseQty) !== Number(line.receivedQty)
                                            ? ` (= ${line.receivedBaseQty}${line.baseUnitName ? ` ${line.baseUnitName}` : ''})`
                                            : ''}
                                        , còn {line.systemRemainingQty}
                                        {line.baseUnitName || line.unitName
                                            ? ` ${line.baseUnitName || line.unitName}`
                                            : ''}
                                        , đã bán {line.suggestedSoldQty}
                                        {line.baseUnitName || line.unitName
                                            ? ` ${line.baseUnitName || line.unitName}`
                                            : ''}
                                    </li>
                                    );
                                })}
                            </ul>
                        </article>
                    ))}
                </section>
            ) : null}

            <section>
                <header className="ioc-section__head">
                    <h2 className="ioc-section__title">Lịch sử bán thử</h2>
                </header>
                <ImportTrialHistory
                    settlements={history}
                    emptyText="Chưa có lần quyết toán bán thử với nhà cung cấp này."
                />
            </section>

            <ImportTrialSettleModal
                open={Boolean(settlingOrderId)}
                orderId={settlingOrderId}
                onClose={() => setSettlingOrderId(null)}
                onSettled={() => {
                    setSettlingOrderId(null);
                    fetchData();
                    onSettled?.();
                }}
            />
        </div>
    );
}
