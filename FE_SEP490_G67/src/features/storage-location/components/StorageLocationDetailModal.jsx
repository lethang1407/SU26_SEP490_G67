import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { Package, Settings2, CircleDot, Search } from 'lucide-react';
import { LOCATION_STATUS, getLocationDisplayLabel, isReceivingLocation } from '../constants';
import {
    formatDate,
    formatLocationAddress,
    getLocationMetrics,
    getLocationStatus,
    isNearExpiry,
} from '../utils/storageLocationUtils';

function toDateKey(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    // YYYY-MM-DD hoặc ISO datetime
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

export default function StorageLocationDetailModal({
    location,
    onClose,
    onAdjustLocation,
    onToggleFull,
    togglingFull = false,
}) {
    const show = Boolean(location);
    const isReceiving = isReceivingLocation(location);
    const status = location ? getLocationStatus(location) : null;
    const metrics = location ? getLocationMetrics(location) : null;
    const isEmpty = status === LOCATION_STATUS.EMPTY;
    const isFull = Boolean(location?.isFull);
    const batches = location?.contents ?? [];

    const [keyword, setKeyword] = useState('');
    const [receivedFrom, setReceivedFrom] = useState('');
    const [receivedTo, setReceivedTo] = useState('');

    useEffect(() => {
        setKeyword('');
        setReceivedFrom('');
        setReceivedTo('');
    }, [location?.id]);

    const filteredBatches = useMemo(() => {
        if (!isReceiving) {
            return batches;
        }
        const q = keyword.trim().toLowerCase();
        return batches.filter((item) => {
            if (q) {
                const hay = [
                    item.productName,
                    item.productCode,
                    item.batchCode,
                    item.categoryName,
                ]
                    .map((v) => String(v || '').toLowerCase())
                    .join(' ');
                if (!hay.includes(q)) {
                    return false;
                }
            }
            const received = toDateKey(item.receivedDate || item.placedAt);
            if (receivedFrom && (!received || received < receivedFrom)) {
                return false;
            }
            if (receivedTo && (!received || received > receivedTo)) {
                return false;
            }
            return true;
        });
    }, [batches, isReceiving, keyword, receivedFrom, receivedTo]);

    const filteredMetrics = useMemo(() => {
        if (!isReceiving || filteredBatches === batches) {
            return metrics;
        }
        const productIds = new Set(
            filteredBatches.map((b) => b.productId).filter((id) => id != null),
        );
        const totalQty = filteredBatches.reduce(
            (sum, b) => sum + (Number(b.quantity) || 0),
            0,
        );
        return {
            ...metrics,
            productCount: productIds.size,
            batchCount: filteredBatches.length,
            totalQty,
        };
    }, [batches, filteredBatches, isReceiving, metrics]);

    return (
        <Modal
            show={show}
            onHide={onClose}
            className="storage-modal--stacked"
            backdropClassName="storage-location-detail-modal-backdrop"
            dialogClassName={[
                'storage-location-detail-modal',
                isReceiving ? 'storage-location-detail-modal--receiving' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            contentClassName="storage-location-detail-modal__content"
            centered
            scrollable
        >
            {location ? (
                <>
                    <Modal.Header closeButton className="storage-location-detail-modal__header">
                        <div>
                            <Modal.Title className="storage-location-detail-modal__title">
                                {getLocationDisplayLabel(location)}
                                {isFull ? (
                                    <span className="storage-location-detail-modal__full-badge">
                                        Đầy
                                    </span>
                                ) : null}
                            </Modal.Title>
                            <p className="storage-location-detail-modal__address">
                                {isReceiving
                                    ? 'Khu nhập hàng'
                                    : formatLocationAddress(location)}
                            </p>
                            {location.description && (
                                <p className="storage-location-detail-modal__description">
                                    {location.description}
                                </p>
                            )}
                        </div>
                    </Modal.Header>

                    <Modal.Body className="storage-location-detail-modal__body">
                        {isEmpty ? (
                            <div className="storage-location-detail-modal__empty">
                                <div className="storage-location-detail-modal__empty-icon">
                                    <Package size={32} />
                                </div>
                                <h3>Ô kệ này đang trống</h3>
                                <p>Chưa có lô hàng nào được gán vào vị trí này.</p>
                            </div>
                        ) : (
                            <div className="storage-location-detail-modal__product">
                                {isReceiving ? (
                                    <div className="storage-location-detail-modal__toolbar">
                                        <div className="storage-location-detail-modal__search">
                                            <Search size={16} />
                                            <input
                                                type="search"
                                                placeholder="Tìm sản phẩm, mã lô..."
                                                value={keyword}
                                                onChange={(event) => setKeyword(event.target.value)}
                                            />
                                        </div>
                                        <div className="storage-location-detail-modal__date-filters">
                                            <label>
                                                <span>Ngày nhập từ</span>
                                                <input
                                                    type="date"
                                                    value={receivedFrom}
                                                    onChange={(event) =>
                                                        setReceivedFrom(event.target.value)
                                                    }
                                                />
                                            </label>
                                            <label>
                                                <span>đến</span>
                                                <input
                                                    type="date"
                                                    value={receivedTo}
                                                    min={receivedFrom || undefined}
                                                    onChange={(event) =>
                                                        setReceivedTo(event.target.value)
                                                    }
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ) : null}

                                {filteredMetrics?.productCount > 1 ||
                                (isReceiving && filteredBatches.length > 0) ? (
                                    <div className="storage-location-detail-modal__product-head">
                                        <span className="storage-location-detail-modal__product-name">
                                            {filteredMetrics.productCount} sản phẩm ·{' '}
                                            {filteredMetrics.batchCount} lô
                                        </span>
                                        <span className="storage-location-detail-modal__product-meta">
                                            Tổng SL: {filteredMetrics.totalQty}
                                        </span>
                                    </div>
                                ) : filteredMetrics?.product ? (
                                    <div className="storage-location-detail-modal__product-head">
                                        <span className="storage-location-detail-modal__product-name">
                                            {filteredMetrics.product.productName}
                                        </span>
                                        <span className="storage-location-detail-modal__product-meta">
                                            Mã SP: {filteredMetrics.product.productCode} ·{' '}
                                            {filteredMetrics.product.unit}
                                        </span>
                                    </div>
                                ) : null}

                                {filteredBatches.length > 0 ? (
                                    filteredBatches.map((item) => (
                                        <div
                                            key={item.id}
                                            className="storage-location-detail-modal__batch"
                                        >
                                            <div className="storage-location-detail-modal__batch-code">
                                                <span className="storage-location-detail-modal__batch-product">
                                                    {item.productName || '—'}
                                                </span>
                                                <span className="storage-location-detail-modal__batch-code-text">
                                                    {item.batchCode || '—'}
                                                </span>
                                            </div>
                                            <dl className="storage-location-detail-modal__batch-details">
                                                <div>
                                                    <dt>SL tại kệ</dt>
                                                    <dd>
                                                        {item.quantity} {item.unit}
                                                    </dd>
                                                </div>
                                                {isReceiving ? (
                                                    <div>
                                                        <dt>Ngày nhập</dt>
                                                        <dd>
                                                            {formatDate(
                                                                item.receivedDate || item.placedAt,
                                                            )}
                                                        </dd>
                                                    </div>
                                                ) : null}
                                                <div>
                                                    <dt>HSD</dt>
                                                    <dd
                                                        className={
                                                            isNearExpiry(item.expiryDate)
                                                                ? 'storage-location-detail-modal__expiry--warning'
                                                                : ''
                                                        }
                                                    >
                                                        {formatDate(item.expiryDate)}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    ))
                                ) : (
                                    <div className="storage-location-detail-modal__filter-empty">
                                        Không có lô khớp tìm kiếm / ngày nhập.
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal.Body>

                    <Modal.Footer className="storage-location-detail-modal__footer">
                        {!isEmpty ? (
                            <button
                                type="button"
                                className={`inventory-btn storage-location-detail-modal__action ${
                                    isFull ? 'inventory-btn--secondary' : 'inventory-btn--primary'
                                }`}
                                disabled={togglingFull}
                                onClick={() => onToggleFull?.(location, !isFull)}
                            >
                                <CircleDot size={18} />
                                {isFull ? 'Bỏ đánh dấu đầy' : 'Đánh dấu đầy'}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="inventory-btn inventory-btn--secondary storage-location-detail-modal__action"
                            onClick={() => onAdjustLocation(location)}
                        >
                            <Settings2 size={18} />
                            Điều chỉnh
                        </button>
                    </Modal.Footer>
                </>
            ) : null}
        </Modal>
    );
}
