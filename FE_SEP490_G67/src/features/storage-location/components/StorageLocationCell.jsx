import { AlertTriangle } from 'lucide-react';
import { LOCATION_STATUS, LOCATION_STATUS_LABEL } from '../constants';
import { getLocationMetrics, getLocationStatus } from '../utils/storageLocationUtils';

function truncateText(text, maxLength = 28) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength)}…`;
}

export default function StorageLocationCell({ location, isSelected, onSelect }) {
    const status = getLocationStatus(location);
    const { batchCount, totalQty, product } = getLocationMetrics(location);
    const isEmpty = status === LOCATION_STATUS.EMPTY;

    return (
        <button
            type="button"
            className={[
                'storage-location-cell',
                `storage-location-cell--${status}`,
                isSelected ? 'storage-location-cell--selected' : '',
            ]
                .filter(Boolean)
                .join(' ')}
            onClick={() => onSelect(location)}
        >
            <div className="storage-location-cell__header">
                <span className="storage-location-cell__label">{location.label}</span>
                <span
                    className={`storage-location-cell__dot storage-location-cell__dot--${status}`}
                    title={LOCATION_STATUS_LABEL[status]}
                />
            </div>

            <span className="storage-location-cell__address">
                {location.aisle && location.shelf
                    ? `Lối ${location.aisle} · Kệ ${location.shelf}`
                    : `Khu ${location.zone}`}
            </span>

            <div className="storage-location-cell__body">
                {isEmpty ? (
                    <span className="storage-location-cell__empty">Trống</span>
                ) : (
                    <>
                        <span className="storage-location-cell__product" title={product?.productName}>
                            {truncateText(product?.productName)}
                        </span>
                        <span className="storage-location-cell__qty">
                            {batchCount} lô · {totalQty} {product?.unit ?? 'đv'}
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
        </button>
    );
}
