import { Modal } from 'react-bootstrap';
import { Package, Settings2, CircleDot } from 'lucide-react';
import { LOCATION_STATUS, ZONE_TYPE } from '../constants';
import {
    formatCurrency,
    formatDate,
    formatLocationAddress,
    getLocationMetrics,
    getLocationStatus,
    isNearExpiry,
} from '../utils/storageLocationUtils';

export default function StorageLocationDetailModal({
    location,
    onClose,
    onAdjustLocation,
    onToggleFull,
    togglingFull = false,
}) {
    const show = Boolean(location);
    const status = location ? getLocationStatus(location) : null;
    const metrics = location ? getLocationMetrics(location) : null;
    const isEmpty = status === LOCATION_STATUS.EMPTY;
    const isFull = Boolean(location?.isFull);
    const isSales = location?.zoneType === ZONE_TYPE.SALES;
    const batches = location?.contents ?? [];

    return (
        <Modal
            show={show}
            onHide={onClose}
            className="storage-modal--stacked"
            backdropClassName="storage-modal-backdrop--stacked"
            dialogClassName="storage-location-detail-modal"
            contentClassName="storage-location-detail-modal__content"
            centered
            scrollable
        >
            {location ? (
                <>
                    <Modal.Header closeButton className="storage-location-detail-modal__header">
                        <div>
                            <Modal.Title className="storage-location-detail-modal__title">
                                {location.label}
                                {isFull ? (
                                    <span className="storage-location-detail-modal__full-badge">
                                        Đầy
                                    </span>
                                ) : null}
                            </Modal.Title>
                            <p className="storage-location-detail-modal__address">
                                {formatLocationAddress(location)}
                                {isSales ? ' · Khu bán' : ' · Khu kho'}
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
                                {metrics?.productCount > 1 ? (
                                    <div className="storage-location-detail-modal__product-head">
                                        <span className="storage-location-detail-modal__product-name">
                                            {metrics.productCount} sản phẩm · {metrics.batchCount}{' '}
                                            lô
                                        </span>
                                        <span className="storage-location-detail-modal__product-meta">
                                            Tổng SL: {metrics.totalQty}
                                        </span>
                                    </div>
                                ) : metrics?.product ? (
                                    <div className="storage-location-detail-modal__product-head">
                                        <span className="storage-location-detail-modal__product-name">
                                            {metrics.product.productName}
                                        </span>
                                        <span className="storage-location-detail-modal__product-meta">
                                            Mã SP: {metrics.product.productCode} ·{' '}
                                            {metrics.product.unit}
                                        </span>
                                    </div>
                                ) : null}

                                {batches.map((item) => (
                                    <div
                                        key={item.id}
                                        className="storage-location-detail-modal__batch"
                                    >
                                        <div className="storage-location-detail-modal__batch-code">
                                            {item.batchCode}
                                            {metrics?.productCount > 1 ? (
                                                <span className="storage-location-detail-modal__batch-product">
                                                    {item.productName}
                                                </span>
                                            ) : null}
                                        </div>
                                        <dl className="storage-location-detail-modal__batch-details">
                                            <div>
                                                <dt>SL tại kệ</dt>
                                                <dd>
                                                    {item.quantity} {item.unit}
                                                </dd>
                                            </div>
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
                                            <div>
                                                <dt>Giá nhập</dt>
                                                <dd>{formatCurrency(item.importPrice)}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                ))}
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
