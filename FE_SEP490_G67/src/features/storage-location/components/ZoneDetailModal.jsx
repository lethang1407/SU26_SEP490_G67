import { Modal } from 'react-bootstrap';
import StorageLocationCell from './StorageLocationCell';

function ZoneSummaryPills({ stats }) {
    if (!stats) {
        return null;
    }
    return (
        <div className="storage-location-zone__pills">
            <span className="storage-location-zone__pill storage-location-zone__pill--primary">
                {stats.emptyCount} ô trống
            </span>
            <span className="storage-location-zone__pill">
                {stats.occupiedCount}/{stats.totalLocations} có hàng
            </span>
            {stats.nearExpiryCount > 0 && (
                <span className="storage-location-zone__pill storage-location-zone__pill--warn">
                    {stats.nearExpiryCount} sắp HSD
                </span>
            )}
        </div>
    );
}

export default function ZoneDetailModal({
    show,
    zoneGroup,
    onHide,
    selectedLocationId,
    onSelectLocation,
}) {
    if (!show || !zoneGroup) {
        return null;
    }

    const floorGroups = zoneGroup.floors ?? zoneGroup.aisles ?? [];

    return (
        <Modal
            show={show}
            onHide={onHide}
            dialogClassName="storage-adjust-modal storage-zone-detail-modal"
            centered
            enforceFocus={!selectedLocationId}
        >
            <Modal.Header className="storage-adjust-modal__header" closeButton>
                <div className="storage-adjust-modal__header-main">
                    <Modal.Title>Kệ {zoneGroup.zone}</Modal.Title>
                    <div className="storage-zone-detail-modal__toolbar">
                        <ZoneSummaryPills stats={zoneGroup.stats} />
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body className="storage-zone-detail-modal__body">
                {floorGroups.length === 0 ? (
                    <div className="storage-location-empty">
                        <p>Khu này chưa có ô kệ.</p>
                    </div>
                ) : (
                    floorGroups.map((floorGroup) => {
                        const floorKey = floorGroup.floor ?? floorGroup.aisle ?? 'none';
                        const locations = floorGroup.locations ?? [];
                        return (
                            <div key={floorKey} className="storage-zone-detail-modal__floor">
                                <h4 className="storage-zone-detail-modal__floor-title">
                                    Tầng {floorKey}
                                </h4>
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
                            </div>
                        );
                    })
                )}
            </Modal.Body>
        </Modal>
    );
}
