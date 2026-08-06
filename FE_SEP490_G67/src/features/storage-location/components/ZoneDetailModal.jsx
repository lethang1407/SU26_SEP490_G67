import { useEffect, useState } from 'react';
import { Alert, Modal } from 'react-bootstrap';
import { updateStorageZone } from '../api';
import { ZONE_TYPE, ZONE_TYPE_OPTIONS } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
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
    onZoneUpdated,
}) {
    const [zoneType, setZoneType] = useState(ZONE_TYPE.WAREHOUSE);
    const [isSavingType, setIsSavingType] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!show || !zoneGroup) {
            return;
        }
        setZoneType(
            zoneGroup.zoneType === ZONE_TYPE.SALES ? ZONE_TYPE.SALES : ZONE_TYPE.WAREHOUSE,
        );
        setError(null);
    }, [show, zoneGroup]);

    if (!show || !zoneGroup) {
        return null;
    }

    const floorGroups = zoneGroup.floors ?? zoneGroup.aisles ?? [];

    const handleZoneTypeChange = async (nextType) => {
        if (nextType === zoneType || isSavingType) {
            return;
        }
        const previous = zoneType;
        setZoneType(nextType);
        setIsSavingType(true);
        setError(null);
        try {
            await updateStorageZone(zoneGroup.zone, { zoneType: nextType });
            onZoneUpdated?.();
        } catch (saveError) {
            setZoneType(previous);
            setError(getApiErrorMessage(saveError, 'Không thể cập nhật loại khu.'));
        } finally {
            setIsSavingType(false);
        }
    };

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
                    <Modal.Title>Khu {zoneGroup.zone}</Modal.Title>
                    <div className="storage-zone-detail-modal__toolbar">
                        <div
                            className={[
                                'storage-zone-type-switch',
                                zoneType === ZONE_TYPE.SALES
                                    ? 'storage-zone-type-switch--sales'
                                    : 'storage-zone-type-switch--warehouse',
                                isSavingType ? 'storage-zone-type-switch--saving' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            role="group"
                            aria-label="Loại khu"
                        >
                            <span className="storage-zone-type-switch__thumb" aria-hidden="true" />
                            {ZONE_TYPE_OPTIONS.map((option) => {
                                const isActive = zoneType === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={[
                                            'storage-zone-type-switch__option',
                                            isActive
                                                ? 'storage-zone-type-switch__option--active'
                                                : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        aria-pressed={isActive}
                                        disabled={isSavingType}
                                        onClick={() => handleZoneTypeChange(option.value)}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        <ZoneSummaryPills stats={zoneGroup.stats} />
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body className="storage-zone-detail-modal__body">
                {error && <Alert variant="danger">{error}</Alert>}

                {floorGroups.length === 0 ? (
                    <div className="storage-location-empty">
                        <p>Khu này chưa có ô kệ.</p>
                    </div>
                ) : (
                    floorGroups.map((floorGroup) => {
                        const floorKey = floorGroup.floor ?? floorGroup.aisle ?? 'none';
                        const floorLabel = floorGroup.floor ?? floorGroup.aisle;
                        return (
                            <div key={floorKey} className="storage-location-aisle">
                                <div className="storage-location-aisle__label">
                                    {floorLabel ? `Tầng ${floorLabel}` : 'Chưa gán tầng'}
                                    <span className="storage-location-aisle__count">
                                        {floorGroup.locations.length} ô
                                    </span>
                                </div>
                                <div className="storage-location-aisle__map">
                                    {floorGroup.locations.map((location) => (
                                        <StorageLocationCell
                                            key={location.id}
                                            location={location}
                                            isSelected={selectedLocationId === location.id}
                                            onSelect={(loc) => {
                                                onSelectLocation?.(loc);
                                            }}
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
