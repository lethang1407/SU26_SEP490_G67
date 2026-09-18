import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import { suppliersApi } from '../api';
import { formatCurrency, formatDate } from '../utils/supplierUtils';
import ImportTrialSettleModal from '../../import-order/components/ImportTrialSettleModal';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

function trialApiErrorMessage(error) {
    return error?.response?.data?.message
        || error?.message
        || 'Không tải được hàng bán thử. Vui lòng thử lại.';
}

function orderTime(order) {
    const date = order?.receivedDate || '';
    const id = Number(order?.importOrderId) || 0;
    return { date, id };
}

function compareOldestFirst(a, b) {
    const left = orderTime(a);
    const right = orderTime(b);
    if (left.date !== right.date) return left.date < right.date ? -1 : 1;
    return left.id - right.id;
}

function groupKey(group) {
    return String(group.supplierId ?? `name:${group.supplierName}`);
}

function groupOpenTrialsBySupplier(orders) {
    const groups = [];
    const indexByKey = new Map();
    for (const order of orders) {
        const key = String(order.supplierId ?? `name:${order.supplierName || ''}`);
        if (!indexByKey.has(key)) {
            indexByKey.set(key, groups.length);
            groups.push({
                supplierId: order.supplierId,
                supplierName: order.supplierName || 'Không rõ nhà cung cấp',
                orders: [],
            });
        }
        groups[indexByKey.get(key)].orders.push(order);
    }

    groups.forEach((group) => {
        group.orders.sort(compareOldestFirst);
        const oldest = group.orders[0];
        group.oldestReceivedDate = oldest?.receivedDate || '';
        group.oldestOrderId = Number(oldest?.importOrderId) || 0;
    });

    groups.sort((a, b) => {
        if (a.oldestReceivedDate !== b.oldestReceivedDate) {
            return a.oldestReceivedDate < b.oldestReceivedDate ? -1 : 1;
        }
        if (a.oldestOrderId !== b.oldestOrderId) return a.oldestOrderId - b.oldestOrderId;
        return (a.supplierName || '').localeCompare(b.supplierName || '', 'vi');
    });

    return groups;
}

function OpenTrialLines({ lines }) {
    return (
        <ul className="supplier-trial-card__lines">
            {(lines || []).map((line) => {
                const unitBase = Number(line.unitBase) > 0 ? Number(line.unitBase) : 1;
                const baseUnit = line.baseUnitName || line.unitName || '';
                const showBasePrice = unitBase !== 1 || (baseUnit && baseUnit !== line.unitName);
                const costPerBase = Math.round((Number(line.costPerUnit) || 0) / unitBase);
                return (
                    <li key={line.importOrderDetailId}>
                        <span className={showBasePrice ? 'trial-settle-product' : undefined}>
                            <span className="trial-settle-product__name">
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
    );
}

export default function OpenTrialQueueModal({ open, onClose, onSettled }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [settlingOrderId, setSettlingOrderId] = useState(null);
    const [expandedKey, setExpandedKey] = useState(null);

    const fetchData = useCallback((options = {}) => {
        const silent = options.silent === true;
        if (!silent) {
            setLoading(true);
            setError('');
        }
        suppliersApi
            .getAllOpenTrial()
            .then((result) => {
                setOrders(Array.isArray(result) ? result : []);
                setError('');
            })
            .catch((reason) => {
                if (!silent) setOrders([]);
                setError(trialApiErrorMessage(reason));
            })
            .finally(() => {
                if (!silent) setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!open) {
            setOrders([]);
            setError('');
            setSettlingOrderId(null);
            setExpandedKey(null);
            return;
        }
        fetchData();
    }, [open, fetchData]);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            if (document.querySelectorAll('.supplier-modal-overlay').length > 1) return;
            onClose?.();
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    const groups = useMemo(() => groupOpenTrialsBySupplier(orders), [orders]);

    useEffect(() => {
        if (!groups.length) {
            setExpandedKey(null);
            return;
        }
        const keys = groups.map(groupKey);
        setExpandedKey((current) => (current && keys.includes(current) ? current : null));
    }, [groups]);

    if (!open) return null;

    return createPortal(
        <>
            <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
                <div
                    className="supplier-modal open-trial-queue-modal"
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="open-trial-queue-title"
                >
                    <div className="supplier-modal__header">
                        <h2 id="open-trial-queue-title" className="supplier-modal__title">
                            Chưa quyết toán bán thử
                        </h2>
                        <button
                            type="button"
                            className="supplier-modal__close"
                            onClick={onClose}
                            aria-label="Đóng"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="supplier-modal__body open-trial-queue-modal__body">
                        {loading ? (
                            <p className="supplier-detail-empty-text">Đang tải hàng bán thử...</p>
                        ) : error && !orders.length ? (
                            <div>
                                <p className="supplier-detail-empty-text supplier-trial-tab__error">{error}</p>
                                <button type="button" className="supplier-btn supplier-btn--primary" onClick={fetchData}>
                                    Thử lại
                                </button>
                            </div>
                        ) : !orders.length ? (
                            <p className="supplier-detail-empty-text">
                                Không còn lô bán thử chưa quyết toán.
                            </p>
                        ) : (
                            <div className="open-trial-queue">
                                {error ? (
                                    <p className="supplier-detail-empty-text supplier-trial-tab__error">{error}</p>
                                ) : null}
                                {groups.map((group, index) => {
                                    const key = groupKey(group);
                                    const expanded = expandedKey === key;
                                    const orderCount = group.orders.length;
                                    const panelId = `open-trial-orders-${group.supplierId ?? `i${index}`}`;
                                    return (
                                        <section
                                            key={key}
                                            className={`open-trial-queue__group${
                                                expanded ? ' open-trial-queue__group--open' : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="open-trial-queue__toggle"
                                                aria-expanded={expanded}
                                                aria-controls={panelId}
                                                onClick={() => setExpandedKey((current) => (
                                                    current === key ? null : key
                                                ))}
                                            >
                                                <span className="open-trial-queue__toggle-text">
                                                    <span className="open-trial-queue__supplier">
                                                        {group.supplierName}
                                                        <span className="open-trial-queue__count">
                                                            {' '}({orderCount} phiếu)
                                                        </span>
                                                    </span>
                                                    <span className="open-trial-queue__meta">
                                                        Phiếu cũ nhất: {formatDate(group.oldestReceivedDate)}
                                                    </span>
                                                </span>
                                                <ChevronDown
                                                    size={18}
                                                    className={`open-trial-queue__chevron${
                                                        expanded ? ' open-trial-queue__chevron--open' : ''
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                            {expanded ? (
                                                <div id={panelId} className="open-trial-queue__orders">
                                                    {group.orders.map((order) => (
                                                        <article key={order.importOrderId} className="supplier-trial-card">
                                                            <div className="supplier-trial-card__head">
                                                                <div>
                                                                    <div className="supplier-trial-card__code">
                                                                        {order.orderCode}
                                                                    </div>
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
                                                            <OpenTrialLines lines={order.lines} />
                                                        </article>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ImportTrialSettleModal
                open={Boolean(settlingOrderId)}
                orderId={settlingOrderId}
                onClose={() => setSettlingOrderId(null)}
                onSettled={(result) => {
                    setSettlingOrderId(null);
                    fetchData({ silent: true });
                    onSettled?.(result);
                }}
            />
        </>,
        document.body,
    );
}
