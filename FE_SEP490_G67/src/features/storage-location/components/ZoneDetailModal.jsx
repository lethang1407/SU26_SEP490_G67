import { useState } from 'react';
import { Alert, Modal, Spinner } from 'react-bootstrap';
import { Plus } from 'lucide-react';
import StorageLocationCell from './StorageLocationCell';
import {
    RECEIVING_ZONE_CODE,
    RETURN_HOLD_ZONE_CODE,
    ZONE_TYPE,
    getZoneDisplayTitle,
    normalizeZoneType,
} from '../constants';
import { appendStorageBin, appendStorageFloor } from '../api';
import { getApiErrorMessage } from '../../../utils/api-utils';

const MAX_FLOOR = 10;
const MAX_BIN = 10;

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
        </div>
    );
}

function canExtendZone(zoneGroup) {
    if (!zoneGroup) return false;
    const code = String(zoneGroup.zone ?? '').trim().toUpperCase();
    if (!code || code === RECEIVING_ZONE_CODE || code === RETURN_HOLD_ZONE_CODE) {
        return false;
    }
    if (normalizeZoneType(zoneGroup.zoneType) === ZONE_TYPE.RETURN_HOLD) {
        return false;
    }
    return true;
}

function maxFloorNumber(floorGroups) {
    let max = 0;
    for (const group of floorGroups ?? []) {
        const n = Number(group.floor ?? group.aisle);
        if (Number.isFinite(n) && n > max) max = n;
    }
    return max;
}

function lastBinSize(locations) {
    if (!locations?.length) return undefined;
    const sorted = [...locations].sort((a, b) =>
        String(a.bin ?? '').localeCompare(String(b.bin ?? ''), undefined, { numeric: true }),
    );
    return sorted[sorted.length - 1]?.size;
}

export default function ZoneDetailModal({
    show,
    zoneGroup,
    onHide,
    selectedLocationId,
    onSelectLocation,
    onExtended,
}) {
    const [busyKey, setBusyKey] = useState(null);
    const [error, setError] = useState(null);

    if (!show || !zoneGroup) {
        return null;
    }

    const floorGroups = zoneGroup.floors ?? zoneGroup.aisles ?? [];
    const extendable = canExtendZone(zoneGroup);
    const floorCount = maxFloorNumber(floorGroups);
    const canAddFloor = extendable && floorCount < MAX_FLOOR;

    const handleAppendBin = async (floor, locations) => {
        if (!extendable || busyKey) return;
        const binCount = locations?.length ?? 0;
        if (binCount >= MAX_BIN) return;

        const key = `bin-${floor}`;
        setBusyKey(key);
        setError(null);
        try {
            await appendStorageBin({
                zone: zoneGroup.zone,
                shelf: String(floor),
                size: lastBinSize(locations),
            });
            await onExtended?.();
        } catch (err) {
            setError(getApiErrorMessage(err, 'Không thêm được ô. Vui lòng thử lại.'));
        } finally {
            setBusyKey(null);
        }
    };

    const handleAppendFloor = async () => {
        if (!canAddFloor || busyKey) return;
        setBusyKey('floor');
        setError(null);
        try {
            const lastFloor = floorGroups[floorGroups.length - 1];
            const size = lastBinSize(lastFloor?.locations);
            await appendStorageFloor({
                zone: zoneGroup.zone,
                size,
            });
            await onExtended?.();
        } catch (err) {
            setError(getApiErrorMessage(err, 'Không thêm được tầng. Vui lòng thử lại.'));
        } finally {
            setBusyKey(null);
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
                    <Modal.Title>{getZoneDisplayTitle(zoneGroup)}</Modal.Title>
                    <div className="storage-zone-detail-modal__toolbar">
                        <ZoneSummaryPills stats={zoneGroup.stats} />
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body className="storage-zone-detail-modal__body">
                {error && (
                    <Alert
                        variant="danger"
                        dismissible
                        onClose={() => setError(null)}
                        className="mb-3"
                    >
                        {error}
                    </Alert>
                )}

                {floorGroups.length === 0 ? (
                    <div className="storage-location-empty">
                        <p>Khu này chưa có ô kệ.</p>
                        {canAddFloor && (
                            <button
                                type="button"
                                className="storage-zone-add-tile storage-zone-add-tile--floor"
                                disabled={Boolean(busyKey)}
                                onClick={handleAppendFloor}
                                aria-label="Thêm tầng"
                            >
                                {busyKey === 'floor' ? (
                                    <Spinner animation="border" size="sm" />
                                ) : (
                                    <Plus size={16} />
                                )}
                                <span>Thêm tầng</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {floorGroups.map((floorGroup) => {
                            const floor = floorGroup.floor ?? floorGroup.aisle ?? null;
                            const floorKey = floor ?? '_none';
                            const locations = floorGroup.locations ?? [];
                            const canAddBin =
                                extendable &&
                                floor != null &&
                                locations.length < MAX_BIN;
                            const binBusy = busyKey === `bin-${floor}`;

                            return (
                                <div key={floorKey} className="storage-zone-detail-modal__floor">
                                    {floor ? (
                                        <h4 className="storage-zone-detail-modal__floor-title">
                                            Tầng {floor}
                                        </h4>
                                    ) : null}
                                    <div className="storage-location-zone__shelves">
                                        {locations.map((location) => (
                                            <StorageLocationCell
                                                key={location.id}
                                                location={location}
                                                isSelected={selectedLocationId === location.id}
                                                onSelect={(loc) => onSelectLocation?.(loc)}
                                            />
                                        ))}
                                        {canAddBin && (
                                            <button
                                                type="button"
                                                className="storage-zone-add-tile"
                                                disabled={Boolean(busyKey)}
                                                onClick={() =>
                                                    handleAppendBin(floor, locations)
                                                }
                                                aria-label={`Thêm ô tầng ${floor}`}
                                                title="Thêm ô"
                                            >
                                                {binBusy ? (
                                                    <Spinner animation="border" size="sm" />
                                                ) : (
                                                    <Plus size={18} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {canAddFloor && (
                            <div className="storage-zone-detail-modal__add-floor">
                                <button
                                    type="button"
                                    className="storage-zone-add-tile storage-zone-add-tile--floor"
                                    disabled={Boolean(busyKey)}
                                    onClick={handleAppendFloor}
                                    aria-label="Thêm tầng"
                                    title="Thêm tầng"
                                >
                                    {busyKey === 'floor' ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <Plus size={16} />
                                    )}
                                    <span>Thêm tầng</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Modal.Body>
        </Modal>
    );
}
