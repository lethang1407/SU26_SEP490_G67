import { Package, Settings2, Star, X } from 'lucide-react';
import { LOCATION_STATUS } from '../constants';
import {
    formatCurrency,
    formatDate,
    formatLocationAddress,
    getLocationProduct,
    getLocationStatus,
    isNearExpiry,
} from '../utils/storageLocationUtils';

export default function StorageLocationDetailDrawer({
    location,
    onClose,
    onAdjustLocation,
    onSetPrimarySaleLocation,
    settingPrimary = false,
}) {
    if (!location) {
        return null;
    }

    const status = getLocationStatus(location);
    const product = getLocationProduct(location);
    const isEmpty = status === LOCATION_STATUS.EMPTY;

    return (
        <div className="storage-location-drawer" role="presentation">
            <button
                type="button"
                className="storage-location-drawer__backdrop"
                onClick={onClose}
                aria-label="Đóng"
            />

            <aside className="storage-location-drawer__panel" role="dialog" aria-modal="true">
                <header className="storage-location-drawer__header">
                    <div>
                        <h2 className="storage-location-drawer__title">
                            {location.label}
                            {location.isPrimarySale ? (
                                <span className="storage-location-drawer__sale-badge">Ô bán</span>
                            ) : null}
                        </h2>
                        <p className="storage-location-drawer__address">
                            {formatLocationAddress(location)}
                        </p>
                        {location.description && (
                            <p className="storage-location-drawer__description">
                                {location.description}
                            </p>
                        )}
                        {product && (
                            <div className="storage-location-drawer__product">
                                <span className="storage-location-drawer__product-name">
                                    {product.productName}
                                </span>
                                <span className="storage-location-drawer__product-meta">
                                    Mã SP: {product.productCode} · {product.unit}
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        className="storage-location-drawer__close"
                        onClick={onClose}
                        aria-label="Đóng chi tiết"
                    >
                        <X size={20} />
                    </button>
                </header>

                {isEmpty ? (
                    <div className="storage-location-drawer__empty">
                        <div className="storage-location-drawer__empty-icon">
                            <Package size={32} />
                        </div>
                        <h3>Ô kệ này đang trống</h3>
                        <p>Chưa có lô hàng nào được gán vào vị trí này.</p>
                        <p className="storage-location-drawer__rule-note">
                            Mỗi kệ chỉ lưu một loại sản phẩm; có thể có nhiều lô cùng SP.
                        </p>
                    </div>
                ) : (
                    <div className="storage-location-drawer__contents">
                        <h3 className="storage-location-drawer__section-title">
                            Các lô trên kệ
                        </h3>
                        {(location.contents ?? []).map((item) => (
                            <article key={item.id} className="storage-location-content-card">
                                <h4 className="storage-location-content-card__batch">
                                    {item.batchCode}
                                </h4>
                                <dl className="storage-location-content-card__details">
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
                                                    ? 'storage-location-content-card__expiry--warning'
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
                            </article>
                        ))}
                    </div>
                )}

                <footer className="storage-location-drawer__footer">
                    {!isEmpty && product && onSetPrimarySaleLocation ? (
                        <button
                            type="button"
                            className="inventory-btn inventory-btn--primary storage-location-drawer__action"
                            disabled={settingPrimary || location.isPrimarySale}
                            onClick={() => onSetPrimarySaleLocation(location)}
                        >
                            <Star size={18} />
                            {location.isPrimarySale ? 'Đang là ô bán' : 'Đặt làm ô bán của SP'}
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="inventory-btn inventory-btn--secondary storage-location-drawer__action"
                        onClick={() => onAdjustLocation(location)}
                    >
                        <Settings2 size={18} />
                        Điều chỉnh
                    </button>
                </footer>
            </aside>
        </div>
    );
}
