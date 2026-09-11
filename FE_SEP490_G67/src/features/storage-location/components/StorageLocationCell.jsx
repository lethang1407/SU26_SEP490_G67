import { AlertTriangle } from 'lucide-react';
import { LOCATION_STATUS, LOCATION_STATUS_LABEL } from '../constants';
import {
    getLocationMetrics,
    getLocationProductPreview,
    getLocationStatus,
    getShelfProfile,
} from '../utils/storageLocationUtils';

export default function StorageLocationCell({ location, isSelected, onSelect }) {
    const status = getLocationStatus(location);
    const { batchCount, totalQty, productCount, product } = getLocationMetrics(location);
    const profile = getShelfProfile(location);
    const isEmpty = status === LOCATION_STATUS.EMPTY;
    const productPreview = getLocationProductPreview(location, productCount > 1 ? 2 : 1);
    const fullProductTitle = (location.contents ?? [])
        .map((item) => item.productName)
        .filter(Boolean)
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .join(', ');

    return (
        <button
            type="button"
            className={[
                'storage-location-cell',
                `storage-location-cell--${status}`,
                `storage-location-cell--size-${profile.size}`,
                isEmpty ? 'storage-location-cell--muted' : '',
                isSelected ? 'storage-location-cell--selected' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            onClick={() => onSelect(location)}
            title={`${location.label} · ${profile.sizeLabel}`}
        >
            <div className="storage-location-cell__header">
                <span className="storage-location-cell__label">{location.label}</span>
                <span
                    className={`storage-location-cell__dot storage-location-cell__dot--${status}`}
                    title={LOCATION_STATUS_LABEL[status]}
                />
            </div>

            <span className="storage-location-cell__meta">
                <span className="storage-location-cell__size">{profile.sizeLabel}</span>
                {location.shelf || location.bin ? (
                    <span className="storage-location-cell__address">
                        {location.shelf ? `Tầng ${location.shelf}` : '—'}
                        {location.bin ? ` · Ô ${location.bin}` : ''}
                    </span>
                ) : (
                    <span className="storage-location-cell__address">Kệ {location.zone}</span>
                )}
            </span>

            <div className="storage-location-cell__body">
                {isEmpty ? (
                    <span className="storage-location-cell__empty"></span>
                ) : (
                    <>
                        <span className="storage-location-cell__product" title={fullProductTitle}>
                            {productPreview}
                        </span>
                        <span className="storage-location-cell__qty">
                            {productCount > 1
                                ? `${productCount} SP · ${batchCount} lô · ${totalQty} đv`
                                : `${batchCount} lô · ${totalQty} ${product?.unit ?? 'đv'}`}
                        </span>
                    </>
                )}
            </div>

            {status === LOCATION_STATUS.NEAR_EXPIRY && (
                <span className="storage-location-cell__badge">
                    <AlertTriangle size={12} />
                    Sắp HSD
                </span>
            )}
            {status === LOCATION_STATUS.FULL ? (
                <span className="storage-location-cell__badge storage-location-cell__badge--full">
                    Đầy
                </span>
            ) : null}
        </button>
    );
}
