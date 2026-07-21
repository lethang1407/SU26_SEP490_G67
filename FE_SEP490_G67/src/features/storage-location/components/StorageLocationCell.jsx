import { AlertTriangle } from 'lucide-react';
import { LOCATION_STATUS, LOCATION_STATUS_LABEL } from '../constants';
import {
    getLocationMetrics,
    getLocationStatus,
    getShelfProfile,
    shortenProductName,
} from '../utils/storageLocationUtils';

export default function StorageLocationCell({ location, isSelected, onSelect }) {
    const status = getLocationStatus(location);
    const { batchCount, totalQty, product } = getLocationMetrics(location);
    const profile = getShelfProfile(location);
    const isEmpty = status === LOCATION_STATUS.EMPTY;
    const shortProductName = shortenProductName(product?.productName);

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
            title={`${location.label} · ${profile.sizeLabel} · sức chứa ~${profile.capacity}`}
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
                {location.aisle && location.shelf ? (
                    <span className="storage-location-cell__address">
                        Lối {location.aisle} · Tầng {location.shelf}
                    </span>
                ) : (
                    <span className="storage-location-cell__address">Khu {location.zone}</span>
                )}
            </span>

            <div className="storage-location-cell__body">
                {isEmpty ? (
                    <span className="storage-location-cell__empty"></span>
                ) : (
                    <>
                        <span className="storage-location-cell__product" title={product?.productName}>
                            {shortProductName}
                        </span>
                        <span className="storage-location-cell__qty">
                            {batchCount} lô · {totalQty}/{profile.capacity} {product?.unit ?? 'đv'}
                        </span>
                    </>
                )}
            </div>

            <div
                className={[
                    'storage-location-cell__fill',
                    profile.isFull ? 'storage-location-cell__fill--full' : '',
                    profile.isNearFull ? 'storage-location-cell__fill--near' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                aria-hidden="true"
            >
                <span style={{ width: `${isEmpty ? 0 : Math.max(profile.fillPercent, 4)}%` }} />
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
