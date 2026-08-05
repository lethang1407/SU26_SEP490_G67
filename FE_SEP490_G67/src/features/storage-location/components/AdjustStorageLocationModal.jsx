import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { ChevronDown, GripVertical, Package, Search } from 'lucide-react';
import {
    assignBatchToLocation,
    fetchStorageLocations,
    fetchUnplacedBatches,
    moveBatchLocation,
    unassignBatchFromLocation,
} from '../api';
import { ZONE_TYPE } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import {
    formatDate,
    getLocationProduct,
    groupLocationsByZone,
    groupZoneGroupsByType,
} from '../utils/storageLocationUtils';

const DRAG_TYPE = {
    unplaced: 'unplaced',
    shelf: 'shelf',
};

function cloneLocations(locations) {
    return (locations ?? []).map((location) => ({
        ...location,
        contents: (location.contents ?? []).map((item) => ({ ...item })),
    }));
}

function LocationTree({
    draftLocations,
    selectedLocationId,
    onSelectLocation,
    dragOverTarget,
    setDragOverTarget,
    onDropOnLocation,
    isSaving,
    initialExpandLocationId,
}) {
    const zoneGroups = useMemo(
        () => groupLocationsByZone(draftLocations),
        [draftLocations],
    );
    const { sales, warehouse } = useMemo(
        () => groupZoneGroupsByType(zoneGroups),
        [zoneGroups],
    );

    const initialLocation = useMemo(
        () => draftLocations.find((item) => item.id === initialExpandLocationId) ?? null,
        [draftLocations, initialExpandLocationId],
    );

    const [expandedTypes, setExpandedTypes] = useState(() => new Set());
    const [expandedZones, setExpandedZones] = useState(() => new Set());

    useEffect(() => {
        if (!initialLocation) {
            return;
        }
        const typeKey = initialLocation.zoneType === ZONE_TYPE.SALES ? 'sales' : 'warehouse';
        setExpandedTypes(new Set([typeKey]));
        if (initialLocation.zone) {
            setExpandedZones(new Set([initialLocation.zone]));
        }
    }, [initialLocation]);

    const toggleType = (typeKey) => {
        setExpandedTypes((prev) => {
            const next = new Set(prev);
            if (next.has(typeKey)) {
                next.delete(typeKey);
            } else {
                next.add(typeKey);
            }
            return next;
        });
    };

    const toggleZone = (zone) => {
        setExpandedZones((prev) => {
            const next = new Set(prev);
            if (next.has(zone)) {
                next.delete(zone);
            } else {
                next.add(zone);
            }
            return next;
        });
    };

    const renderZoneGroups = (groups) =>
        groups.map((group) => {
            const zoneOpen = expandedZones.has(group.zone);
            return (
                <div key={group.zone} className="storage-adjust-modal__zone-node">
                    <button
                        type="button"
                        className="storage-adjust-modal__tree-toggle"
                        onClick={() => toggleZone(group.zone)}
                    >
                        <ChevronDown
                            size={16}
                            className={
                                zoneOpen
                                    ? 'storage-adjust-modal__chevron storage-adjust-modal__chevron--open'
                                    : 'storage-adjust-modal__chevron'
                            }
                        />
                        <span>Khu {group.zone}</span>
                        <span className="storage-adjust-modal__tree-count">
                            {group.locations.length} ô
                        </span>
                    </button>
                    {zoneOpen && (
                        <div className="storage-adjust-modal__zone-locations">
                            {group.locations.map((location) => {
                                const product = getLocationProduct(location);
                                const isDropTarget = dragOverTarget === `loc-${location.id}`;
                                return (
                                    <button
                                        key={location.id}
                                        type="button"
                                        className={[
                                            'storage-adjust-modal__location-item',
                                            selectedLocationId === location.id
                                                ? 'storage-adjust-modal__location-item--active'
                                                : '',
                                            isDropTarget
                                                ? 'storage-adjust-modal__location-item--drop'
                                                : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        disabled={isSaving}
                                        onClick={() => onSelectLocation(location.id)}
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            event.dataTransfer.dropEffect = 'move';
                                            setDragOverTarget(`loc-${location.id}`);
                                        }}
                                        onDragLeave={() => {
                                            setDragOverTarget((prev) =>
                                                prev === `loc-${location.id}` ? null : prev,
                                            );
                                        }}
                                        onDrop={(event) => onDropOnLocation(event, location.id)}
                                    >
                                        <span className="storage-adjust-modal__location-label">
                                            {location.label}
                                        </span>
                                        <span className="storage-adjust-modal__location-meta">
                                            {(location.contents ?? []).length > 0
                                                ? `${location.contents.length} lô · ${product?.productName ?? ''}`
                                                : 'Kệ trống'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        });

    const renderTypeBlock = (typeKey, title, groups) => {
        if (groups.length === 0) {
            return null;
        }
        const open = expandedTypes.has(typeKey);
        return (
            <div className="storage-adjust-modal__type-node">
                <button
                    type="button"
                    className="storage-adjust-modal__tree-toggle storage-adjust-modal__tree-toggle--type"
                    onClick={() => toggleType(typeKey)}
                >
                    <ChevronDown
                        size={16}
                        className={
                            open
                                ? 'storage-adjust-modal__chevron storage-adjust-modal__chevron--open'
                                : 'storage-adjust-modal__chevron'
                        }
                    />
                    <span>{title}</span>
                    <span className="storage-adjust-modal__tree-count">
                        {groups.reduce((sum, g) => sum + g.locations.length, 0)} ô
                    </span>
                </button>
                {open && (
                    <div className="storage-adjust-modal__type-children">
                        {renderZoneGroups(groups)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="storage-adjust-modal__location-list">
            {renderTypeBlock('sales', 'Khu bán hàng', sales)}
            {renderTypeBlock('warehouse', 'Khu kho', warehouse)}
            {sales.length === 0 && warehouse.length === 0 && (
                <div className="storage-adjust-modal__empty">Chưa có vị trí kệ.</div>
            )}
        </div>
    );
}

export default function AdjustStorageLocationModal({
    show,
    onHide,
    locations,
    onSaved,
    initialLocationId = null,
}) {
    const [draftLocations, setDraftLocations] = useState([]);
    const [unplacedBatches, setUnplacedBatches] = useState([]);
    const [selectedLocationId, setSelectedLocationId] = useState(null);
    const [unplacedKeyword, setUnplacedKeyword] = useState('');
    const [message, setMessage] = useState(null);
    const [dragOverTarget, setDragOverTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [sessionInitialLocationId, setSessionInitialLocationId] = useState(null);

    const reloadData = async (preferLocations, preferredId) => {
        const [nextLocations, nextUnplaced] = await Promise.all([
            preferLocations ? Promise.resolve(preferLocations) : fetchStorageLocations(),
            fetchUnplacedBatches(),
        ]);
        const cloned = cloneLocations(nextLocations);
        setDraftLocations(cloned);
        setUnplacedBatches(nextUnplaced ?? []);
        setSelectedLocationId((prev) => {
            const preferred = preferredId ?? prev;
            if (preferred && cloned.some((location) => location.id === preferred)) {
                return preferred;
            }
            return null;
        });
        return cloned;
    };

    useEffect(() => {
        if (!show) {
            return undefined;
        }

        let cancelled = false;
        setSessionInitialLocationId(initialLocationId);

        const load = async () => {
            setIsLoading(true);
            setMessage(null);
            setDragOverTarget(null);
            setUnplacedKeyword('');
            setHasChanges(false);

            try {
                await reloadData(locations, initialLocationId);
            } catch (error) {
                if (!cancelled) {
                    const cloned = cloneLocations(locations);
                    setDraftLocations(cloned);
                    setUnplacedBatches([]);
                    setSelectedLocationId(
                        initialLocationId &&
                            cloned.some((item) => item.id === initialLocationId)
                            ? initialLocationId
                            : null,
                    );
                    setMessage({
                        type: 'error',
                        text: getApiErrorMessage(
                            error,
                            'Không tải được danh sách lô chưa xếp. Đang dùng dữ liệu vị trí hiện có.',
                        ),
                    });
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
        // Chỉ reload khi mở modal
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const selectedLocation = useMemo(
        () => draftLocations.find((location) => location.id === selectedLocationId) ?? null,
        [draftLocations, selectedLocationId],
    );

    const filteredUnplaced = useMemo(() => {
        const keyword = unplacedKeyword.trim().toLowerCase();
        if (!keyword) {
            return unplacedBatches;
        }
        return unplacedBatches.filter(
            (batch) =>
                batch.batchCode?.toLowerCase().includes(keyword) ||
                batch.productName?.toLowerCase().includes(keyword) ||
                batch.productCode?.toLowerCase().includes(keyword),
        );
    }, [unplacedBatches, unplacedKeyword]);

    const handleClose = () => {
        const shouldReload = hasChanges;
        onHide?.();
        if (shouldReload) {
            onSaved?.();
        }
    };

    const parseDragData = (event) => {
        try {
            return JSON.parse(event.dataTransfer.getData('application/json'));
        } catch {
            return null;
        }
    };

    const handleDragStart = (event, payload) => {
        if (isSaving) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.setData('application/json', JSON.stringify(payload));
        event.dataTransfer.effectAllowed = 'move';
        setMessage(null);
    };

    const handleDragEnd = () => {
        setDragOverTarget(null);
    };

    const handleDropOnLocation = async (event, locationId) => {
        event.preventDefault();
        setDragOverTarget(null);
        if (isSaving) {
            return;
        }

        const payload = parseDragData(event);
        if (!payload) {
            return;
        }

        const destination = draftLocations.find((item) => item.id === locationId);
        if (!destination) {
            return;
        }

        setIsSaving(true);
        try {
            if (payload.type === DRAG_TYPE.unplaced) {
                const batch = unplacedBatches.find((item) => item.id === payload.batchId);
                if (!batch) {
                    return;
                }

                await assignBatchToLocation({
                    batchId: batch.batchId ?? batch.id,
                    locationId,
                    quantity: batch.quantity,
                });

                await reloadData(null, locationId);
                setHasChanges(true);
                setMessage({
                    type: 'success',
                    text: `Đã xếp lô ${batch.batchCode} vào kệ ${destination.label}.`,
                });
                return;
            }

            if (payload.type === DRAG_TYPE.shelf) {
                if (payload.locationId === locationId) {
                    return;
                }

                await moveBatchLocation({
                    batchLocationId: payload.batchId,
                    toLocationId: locationId,
                    quantity: payload.quantity,
                });

                await reloadData(null, locationId);
                setHasChanges(true);
                setMessage({
                    type: 'success',
                    text: `Đã chuyển lô sang kệ ${destination.label}.`,
                });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: getApiErrorMessage(error, 'Không thể cập nhật vị trí lô. Vui lòng thử lại.'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDropOnUnplaced = async (event) => {
        event.preventDefault();
        setDragOverTarget(null);
        if (isSaving) {
            return;
        }

        const payload = parseDragData(event);
        if (!payload || payload.type !== DRAG_TYPE.shelf) {
            return;
        }

        setIsSaving(true);
        try {
            await unassignBatchFromLocation({
                batchLocationId: payload.batchId,
            });

            await reloadData(null, selectedLocationId);
            setHasChanges(true);
            setMessage({
                type: 'success',
                text: 'Đã gỡ lô khỏi kệ — trả về danh sách chưa xếp.',
            });
        } catch (error) {
            setMessage({
                type: 'error',
                text: getApiErrorMessage(error, 'Không thể gỡ lô khỏi kệ. Vui lòng thử lại.'),
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!show) {
        return null;
    }

    return (
        <Modal
            show={show}
            onHide={handleClose}
            dialogClassName="storage-adjust-modal"
            centered
        >
            <Modal.Header className="storage-adjust-modal__header" closeButton>
                <div className="storage-adjust-modal__header-main">
                    <Modal.Title>Điều chỉnh vị trí hàng hóa</Modal.Title>
                </div>
            </Modal.Header>

            <Modal.Body className="storage-adjust-modal__body">
                {isLoading ? (
                    <div className="storage-adjust-modal__loading">
                        Đang tải dữ liệu điều chỉnh...
                    </div>
                ) : (
                    <>
                        <aside className="storage-adjust-modal__sidebar">
                            <h3 className="storage-adjust-modal__section-title">Vị trí kệ</h3>

                            <LocationTree
                                draftLocations={draftLocations}
                                selectedLocationId={selectedLocationId}
                                onSelectLocation={(id) => {
                                    setSelectedLocationId(id);
                                    setMessage(null);
                                }}
                                dragOverTarget={dragOverTarget}
                                setDragOverTarget={setDragOverTarget}
                                onDropOnLocation={handleDropOnLocation}
                                isSaving={isSaving}
                                initialExpandLocationId={sessionInitialLocationId}
                            />
                        </aside>

                        <section
                            className={[
                                'storage-adjust-modal__content',
                                dragOverTarget === 'selected-shelf'
                                    ? 'storage-adjust-modal__content--drop'
                                    : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onDragOver={(event) => {
                                if (!selectedLocation || isSaving) {
                                    return;
                                }
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                                setDragOverTarget('selected-shelf');
                            }}
                            onDragLeave={() => {
                                setDragOverTarget((prev) =>
                                    prev === 'selected-shelf' ? null : prev,
                                );
                            }}
                            onDrop={(event) => {
                                if (selectedLocation) {
                                    handleDropOnLocation(event, selectedLocation.id);
                                }
                            }}
                        >
                            <h3 className="storage-adjust-modal__section-title">
                                {selectedLocation?.label || 'Chọn vị trí'}
                            </h3>
                            {selectedLocation ? (
                                <>
                                    <p className="storage-adjust-modal__location-desc">
                                        Khu {selectedLocation.zone}
                                        {selectedLocation.zoneType === ZONE_TYPE.SALES
                                            ? ' · Bán'
                                            : ' · Kho'}{' '}
                                        · Tầng {selectedLocation.shelf || '—'} · Ô{' '}
                                        {selectedLocation.bin || '—'}
                                    </p>
                                    <div className="storage-adjust-modal__rule-box">
                                        Mỗi kệ chỉ chứa 1 loại sản phẩm. Khu bán: mỗi SP chỉ 1 lô.
                                    </div>

                                    {message && (
                                        <div
                                            className={`storage-adjust-modal__message storage-adjust-modal__message--${message.type}`}
                                        >
                                            {message.text}
                                        </div>
                                    )}

                                    {isSaving && (
                                        <div className="storage-adjust-modal__message storage-adjust-modal__message--info">
                                            Đang lưu thay đổi...
                                        </div>
                                    )}

                                    <div className="storage-adjust-modal__batch-list">
                                        {(selectedLocation.contents ?? []).length > 0 ? (
                                            selectedLocation.contents.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="storage-adjust-modal__batch-item storage-adjust-modal__batch-item--draggable"
                                                    draggable={!isSaving}
                                                    onDragStart={(event) =>
                                                        handleDragStart(event, {
                                                            type: DRAG_TYPE.shelf,
                                                            batchId: item.id,
                                                            locationId: selectedLocation.id,
                                                            quantity: item.quantity,
                                                        })
                                                    }
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <GripVertical
                                                        size={16}
                                                        className="storage-adjust-modal__drag-handle"
                                                    />
                                                    <div className="storage-adjust-modal__batch-item-body">
                                                        <strong>{item.batchCode}</strong>
                                                        <p>{item.productName}</p>
                                                    </div>
                                                    <div className="storage-adjust-modal__batch-item-meta">
                                                        <span>
                                                            {item.quantity} {item.unit}
                                                        </span>
                                                        <span>
                                                            HSD {formatDate(item.expiryDate)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="storage-adjust-modal__empty storage-adjust-modal__empty--dropzone">
                                                <Package size={28} />
                                                <p>Kệ trống</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="storage-adjust-modal__empty">
                                    Chọn một ô từ cột trái để xem và xếp lô.
                                </div>
                            )}
                        </section>

                        <aside
                            className={[
                                'storage-adjust-modal__actions',
                                dragOverTarget === 'unplaced'
                                    ? 'storage-adjust-modal__actions--drop'
                                    : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onDragOver={(event) => {
                                if (isSaving) {
                                    return;
                                }
                                event.preventDefault();
                                event.dataTransfer.dropEffect = 'move';
                                setDragOverTarget('unplaced');
                            }}
                            onDragLeave={() => {
                                setDragOverTarget((prev) => (prev === 'unplaced' ? null : prev));
                            }}
                            onDrop={handleDropOnUnplaced}
                        >
                            <h3 className="storage-adjust-modal__section-title">Lô chưa xếp kệ</h3>
                            <p className="storage-adjust-modal__helper storage-adjust-modal__helper--tight">
                                Kéo thả vào ô kệ để xếp.
                            </p>

                            <div className="storage-adjust-modal__search">
                                <Search size={16} className="storage-adjust-modal__search-icon" />
                                <input
                                    type="text"
                                    className="storage-adjust-modal__search-input"
                                    placeholder="Tìm mã lô, sản phẩm..."
                                    value={unplacedKeyword}
                                    onChange={(event) => setUnplacedKeyword(event.target.value)}
                                />
                            </div>

                            <div className="storage-adjust-modal__unplaced-count">
                                {filteredUnplaced.length} lô chờ xếp
                            </div>

                            <div className="storage-adjust-modal__unplaced-list">
                                {filteredUnplaced.length > 0 ? (
                                    filteredUnplaced.map((batch) => (
                                        <div
                                            key={batch.id}
                                            className="storage-adjust-modal__unplaced-card"
                                            draggable={!isSaving}
                                            onDragStart={(event) =>
                                                handleDragStart(event, {
                                                    type: DRAG_TYPE.unplaced,
                                                    batchId: batch.id,
                                                })
                                            }
                                            onDragEnd={handleDragEnd}
                                        >
                                            <div className="storage-adjust-modal__unplaced-card-top">
                                                <GripVertical
                                                    size={16}
                                                    className="storage-adjust-modal__drag-handle"
                                                />
                                                <strong>{batch.batchCode}</strong>
                                            </div>
                                            <p className="storage-adjust-modal__unplaced-name">
                                                {batch.productName}
                                            </p>
                                            <div className="storage-adjust-modal__unplaced-meta">
                                                <span>
                                                    {batch.quantity} {batch.unit}
                                                </span>
                                                <span>HSD {formatDate(batch.expiryDate)}</span>
                                            </div>
                                            <span className="storage-adjust-modal__unplaced-code">
                                                {batch.productCode}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="storage-adjust-modal__empty">
                                        {unplacedBatches.length === 0
                                            ? 'Không còn lô chưa xếp kệ.'
                                            : 'Không tìm thấy lô phù hợp.'}
                                    </div>
                                )}
                            </div>
                        </aside>
                    </>
                )}
            </Modal.Body>
        </Modal>
    );
}
