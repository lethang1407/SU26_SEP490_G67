import StorageLocationCell from './StorageLocationCell';

export default function StorageLocationGrid({ groups, selectedLocationId, onSelectLocation }) {
    if (groups.length === 0) {
        return (
            <div className="storage-location-empty">
                <p>Không tìm thấy vị trí phù hợp với bộ lọc.</p>
            </div>
        );
    }

    return (
        <div className="storage-location-grid">
            {groups.map((group) => (
                <section key={group.zone} className="storage-location-zone">
                    <header className="storage-location-zone__header">
                        <h2 className="storage-location-zone__title">KHU {group.zone}</h2>
                        <p className="storage-location-zone__subtitle">{group.title}</p>
                    </header>

                    <div className="storage-location-zone__cells">
                        {group.locations.map((location) => (
                            <StorageLocationCell
                                key={location.id}
                                location={location}
                                isSelected={selectedLocationId === location.id}
                                onSelect={onSelectLocation}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
