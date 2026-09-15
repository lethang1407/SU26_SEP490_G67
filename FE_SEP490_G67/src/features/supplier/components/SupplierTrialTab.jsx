import { useCallback, useEffect, useState } from 'react';
import { suppliersApi } from '../api';
import { formatCurrency, formatDate } from '../utils/supplierUtils';
import ImportTrialSettleModal from '../../import-order/components/ImportTrialSettleModal';
import ImportTrialHistory from '../../import-order/components/ImportTrialHistory';
import '../../../css/ImportOrder.css';

export default function SupplierTrialTab({ supplierId, refreshToken, onSettled }) {
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [settlingOrderId, setSettlingOrderId] = useState(null);

    const fetchData = useCallback(() => {
        if (!supplierId) return;
        setLoading(true);
        Promise.all([
            suppliersApi.getOpenTrial(supplierId).catch(() => []),
            suppliersApi.getTrialHistory(supplierId).catch(() => []),
        ])
            .then(([openResult, historyResult]) => {
                setOrders(openResult || []);
                setHistory(historyResult || []);
            })
            .finally(() => setLoading(false));
    }, [supplierId]);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshToken]);

    if (loading) {
        return <p className="supplier-detail-empty-text">Đang tải hàng bán thử...</p>;
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
