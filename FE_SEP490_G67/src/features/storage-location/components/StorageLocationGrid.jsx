import { ZONE_TYPE, ZONE_TYPE_LABEL } from '../constants';
import { groupZoneGroupsByType } from '../utils/storageLocationUtils';
import StorageLocationCell from './StorageLocationCell';

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
            {stats.nearExpiryCount > 0 && (
                <span className="storage-location-zone__pill storage-location-zone__pill--warn">
                    {stats.nearExpiryCount} sắp HSD
                </span>
            )}
        </div>
    );
}

function ZoneSection({ group, selectedLocationId, onOpenZone, onSelectLocation }) {
    const typeLabel = ZONE_TYPE_LABEL[group.zoneType] ?? ZONE_TYPE_LABEL[ZONE_TYPE.WAREHOUSE];
    const isSales = group.zoneType === ZONE_TYPE.SALES;
    const floorGroups = group.floors ?? group.aisles ?? [];
    const locations = floorGroups.flatMap((floor) => floor.locations ?? []);

    return (
        <section className="storage-location-zone storage-location-zone--expanded">
            <div className="storage-location-zone__header-row">
                <button
                    type="button"
                    className="storage-location-zone__toggle storage-location-zone__toggle--inline"
                    onClick={() => onOpenZone?.(group)}
                >
                    <div className="storage-location-zone__toggle-main">
                        <div className="storage-location-zone__heading">
                            <div className="storage-location-zone__title-row">
                                <h2 className="storage-location-zone__title">KỆ {group.zone}</h2>
                                <span
                                    className={[
                                        'storage-location-zone__type-badge',
                                        isSales
                                            ? 'storage-location-zone__type-badge--sales'
                                            : 'storage-location-zone__type-badge--warehouse',
                                    ].join(' ')}
                                >
                                    {typeLabel}
                                </span>
                            </div>
                            <p className="storage-location-zone__subtitle">{group.productPreview}</p>
                        </div>
                        <ZoneSummaryPills stats={group.stats} />
                    </div>
                </button>
            </div>

            {locations.length === 0 ? (
                <div className="storage-location-empty storage-location-empty--compact">
                    <p>Khu này chưa có ô kệ.</p>
                </div>
            ) : (
                <div className="storage-location-zone__shelves">
                    {locations.map((location) => (
                        <StorageLocationCell
                            key={location.id}
                            location={location}
                            isSelected={selectedLocationId === location.id}
                            onSelect={(loc) => onSelectLocation?.(loc)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function ZoneTypeBlock({ title, groups, selectedLocationId, onOpenZone, onSelectLocation }) {
    return (
        <div className="storage-location-zone-block">
            <h3 className="storage-location-zone-block__title">{title}</h3>
            {groups.length === 0 ? (
                <div className="storage-location-empty storage-location-empty--compact">
                    <p>Chưa có khu nào.</p>
                </div>
            ) : (
                groups.map((group) => (
                    <ZoneSection
                        key={group.zone}
                        group={group}
                        selectedLocationId={selectedLocationId}
                        onOpenZone={onOpenZone}
                        onSelectLocation={onSelectLocation}
                    />
                ))
            )}
        </div>
    );
}

export default function StorageLocationGrid({
    groups,
    selectedLocationId,
    onOpenZone,
    onSelectLocation,
}) {
    if (groups.length === 0) {
        return (
            <div className="storage-location-empty">
                <p>Không tìm thấy vị trí phù hợp với bộ lọc.</p>
            </div>
        );
    }

    const { sales, warehouse } = groupZoneGroupsByType(groups);

    return (
        <div className="storage-location-grid storage-location-grid--stacked">
            <ZoneTypeBlock
                title="Khu bán hàng"
                groups={sales}
                selectedLocationId={selectedLocationId}
                onOpenZone={onOpenZone}
                onSelectLocation={onSelectLocation}
            />
            <ZoneTypeBlock
                title="Khu kho"
                groups={warehouse}
                selectedLocationId={selectedLocationId}
                onOpenZone={onOpenZone}
                onSelectLocation={onSelectLocation}
            />
        </div>
    );
}
