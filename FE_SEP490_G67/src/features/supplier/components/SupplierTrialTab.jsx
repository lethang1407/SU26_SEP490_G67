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
            <section>
                <header className="ioc-section__head">
                    <h2 className="ioc-section__title">Đang treo</h2>
                </header>
                {!orders.length ? (
                    <p className="supplier-detail-empty-text">
                        Không có hàng bán thử đang treo với nhà cung cấp này.
                    </p>
                ) : (
                    orders.map((order) => (
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
                                {(order.lines || []).map((line) => (
                                    <li key={line.importOrderDetailId}>
                                        {line.productName}: nhận {line.receivedQty}
                                        {line.unitName ? ` ${line.unitName}` : ''}, còn {line.systemRemainingQty}, đã bán{' '}
                                        {line.suggestedSoldQty}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))
                )}
            </section>

            <section>
                <header className="ioc-section__head">
                    <h2 className="ioc-section__title">Lịch sử bán thử</h2>
                </header>
                <ImportTrialHistory
                    settlements={history}
                    showOrderCode
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
