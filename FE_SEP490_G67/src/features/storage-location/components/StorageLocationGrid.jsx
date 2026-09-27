import { getAssignableZoneGroups } from '../utils/storageLocationUtils';
import { RECEIVING_ZONE_CODE, getZoneDisplayTitle } from '../constants';

function ZoneSummaryPills({ stats }) {
    return (
        <div className="storage-location-zone__pills">
            <span className="storage-location-zone__pill storage-location-zone__pill--primary">
                {stats.emptyCount} ô trống
            </span>
            <span className="storage-location-zone__pill">
                {stats.occupiedCount}/{stats.totalLocations} có hàng
            </span>
            {(stats.largeEmpty > 0 || stats.mediumEmpty > 0 || stats.smallEmpty > 0) && (
                <span className="storage-location-zone__pill storage-location-zone__pill--muted">
                    trống: {stats.largeEmpty} to · {stats.mediumEmpty} vừa · {stats.smallEmpty} bé
                </span>
            )}
        </div>
    );
}

function ZoneSection({ group, onOpenZone }) {
    const isReceivingZone = String(group.zone ?? '').toUpperCase() === RECEIVING_ZONE_CODE;
    return (
        <section
            className={[
                'storage-location-zone',
                'storage-location-zone--clickable',
                isReceivingZone ? 'storage-location-zone--receiving' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <button
                type="button"
                className="storage-location-zone__toggle"
                onClick={() => onOpenZone?.(group)}
            >
                <div className="storage-location-zone__toggle-main">
                    <div className="storage-location-zone__heading">
                        <div className="storage-location-zone__title-row">
                            <h2 className="storage-location-zone__title">
                                {getZoneDisplayTitle(group)}
                            </h2>
                        </div>
                        <p className="storage-location-zone__subtitle">
                            {isReceivingZone
                                ? 'Hàng vừa nhập — chờ xếp sang vị trí bán'
                                : group.productPreview}
                        </p>
                    </div>
                    <ZoneSummaryPills stats={group.stats} />
                </div>
            </button>
        </section>
    );
}

export default function StorageLocationGrid({ groups, onOpenZone }) {
    const assignable = getAssignableZoneGroups(groups);

    if (assignable.length === 0) {
        return (
            <div className="storage-location-empty">
                <p>Không tìm thấy vị trí phù hợp với bộ lọc.</p>
            </div>
        );
    }

    return (
        <div className="storage-location-grid">
            {assignable.map((group) => (
                <ZoneSection key={group.zone} group={group} onOpenZone={onOpenZone} />
            ))}
        </div>
    );
}
