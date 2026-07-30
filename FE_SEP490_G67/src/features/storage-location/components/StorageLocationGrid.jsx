import { ChevronDown } from 'lucide-react';
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
                    trống: {stats.largeEmpty} lớn · {stats.mediumEmpty} vừa · {stats.smallEmpty} nhỏ
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

export default function StorageLocationGrid({
    groups,
    selectedLocationId,
    onSelectLocation,
    expandedZones,
    onToggleZone,
}) {
    if (groups.length === 0) {
        return (
            <div className="storage-location-empty">
                <p>Không tìm thấy vị trí phù hợp với bộ lọc.</p>
            </div>
        );
    }

    return (
        <div className="storage-location-grid">
            <p className="storage-location-grid__hint">
                Mặc định ẩn sơ đồ ô kệ — nhìn nhanh sức chứa từng khu, rồi mở khu cần làm việc. Ô
                lớn / vừa / nhỏ phản ánh khả năng chứa khác nhau (tầng kệ thấp thường lớn hơn).
            </p>

            {groups.map((group) => {
                const isExpanded = expandedZones.has(group.zone);
                const stats = group.stats;

                return (
                    <section
                        key={group.zone}
                        className={[
                            'storage-location-zone',
                            isExpanded ? 'storage-location-zone--expanded' : 'storage-location-zone--collapsed',
                        ].join(' ')}
                    >
                        <button
                            type="button"
                            className="storage-location-zone__toggle"
                            onClick={() => onToggleZone(group.zone)}
                            aria-expanded={isExpanded}
                        >
                            <div className="storage-location-zone__toggle-main">
                                <div className="storage-location-zone__heading">
                                    <h2 className="storage-location-zone__title">KHU {group.zone}</h2>
                                    <p className="storage-location-zone__subtitle">
                                        {group.productPreview}
                                    </p>
                                </div>
                                <ZoneSummaryPills stats={stats} />
                            </div>
                            <span
                                className={[
                                    'storage-location-zone__chevron',
                                    isExpanded ? 'storage-location-zone__chevron--open' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            >
                                <ChevronDown size={20} />
                            </span>
                        </button>

                        {isExpanded && (
                            <div className="storage-location-zone__body">
                                {(group.aisles ?? []).map((aisleGroup) => (
                                    <div
                                        key={aisleGroup.aisle ?? 'none'}
                                        className="storage-location-aisle"
                                    >
                                        <div className="storage-location-aisle__label">
                                            {aisleGroup.aisle
                                                ? `Hàng ${aisleGroup.aisle}`
                                                : 'Chưa gán hàng'}
                                            <span className="storage-location-aisle__count">
                                                {aisleGroup.locations.length} ô
                                            </span>
                                        </div>
                                        <div className="storage-location-aisle__map">
                                            {aisleGroup.locations.map((location) => (
                                                <StorageLocationCell
                                                    key={location.id}
                                                    location={location}
                                                    isSelected={selectedLocationId === location.id}
                                                    onSelect={onSelectLocation}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
