import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { ChevronDown, CircleDot, GripVertical, Package } from 'lucide-react';
import {
    fetchStorageLocations,
    moveAllBatchesFromLocation,
    moveBatchLocation,
    setStorageLocationFull,
} from '../api';
import {
    formatDate,
    getAssignableZoneGroups,
    getLocationMetrics,
    getLocationProductPreview,
    getLocationStatus,
    groupLocationsByZone,
    suggestLocationsForBatch,
} from '../utils/storageLocationUtils';
import { LOCATION_STATUS } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import PlaceBatchQuantityModal from './PlaceBatchQuantityModal';
import AlertNoticeModal from '../../../components/ui/AlertNoticeModal';
import { getLocationDisplayLabel, getZoneDisplayTitle } from '../constants';

const DRAG_TYPE = {
    shelf: 'shelf',
};

const PICK_MODE = {
    none: null,
    moveOne: 'moveOne',
    moveAll: 'moveAll',
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
    suggestedById = {},
}) {
    const zoneGroups = useMemo(
        () => getAssignableZoneGroups(groupLocationsByZone(draftLocations)),
        [draftLocations],
    );

    const initialLocation = useMemo(
        () => draftLocations.find((item) => item.id === initialExpandLocationId) ?? null,
        [draftLocations, initialExpandLocationId],
    );

    const [expandedZones, setExpandedZones] = useState(() => new Set());

    useEffect(() => {
        if (!initialLocation?.zone) {
            return;
        }
        setExpandedZones(new Set([initialLocation.zone]));
    }, [initialLocation]);

    useEffect(() => {
        const suggestedIds = Object.keys(suggestedById);
        if (suggestedIds.length === 0) {
            return;
        }
        const nextZones = new Set();
        draftLocations.forEach((location) => {
            if (!suggestedById[location.id]) {
                return;
            }
            if (location.zone) {
                nextZones.add(location.zone);
            }
        });
        if (nextZones.size > 0) {
            setExpandedZones((prev) => new Set([...prev, ...nextZones]));
        }
    }, [suggestedById, draftLocations]);

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

    return (
        <div className="storage-adjust-modal__location-list">
            {zoneGroups.length === 0 ? (
                <div className="storage-adjust-modal__empty">Chưa có vị trí kệ.</div>
            ) : (
                zoneGroups.map((group) => {
                    const zoneOpen = expandedZones.has(group.zone);
                    const floorCount = new Set(
                        (group.locations ?? [])
                            .map((location) => String(location.shelf ?? '').trim())
                            .filter(Boolean),
                    ).size;
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
                                <span>{getZoneDisplayTitle(group)}</span>
                                <span className="storage-adjust-modal__tree-count">
                                    {floorCount > 0 ? `${floorCount} tầng · ` : ''}
                                    {group.locations.length} ô
                                </span>
                            </button>
                            {zoneOpen && (
                                <div className="storage-adjust-modal__zone-locations">
                                    {group.locations.map((location) => {
                                        const { batchCount, productCount } =
                                            getLocationMetrics(location);
                                        const preview = getLocationProductPreview(location, 1);
                                        const status = getLocationStatus(location);
                                        const isDropTarget =
                                            dragOverTarget === `loc-${location.id}`;
                                        const suggest = suggestedById[location.id];
                                        return (
                                            <button
                                                key={location.id}
                                                type="button"
                                                className={[
                                                    'storage-adjust-modal__location-item',
                                                    `storage-adjust-modal__location-item--${status}`,
                                                    selectedLocationId === location.id
                                                        ? 'storage-adjust-modal__location-item--active'
                                                        : '',
                                                    isDropTarget
                                                        ? 'storage-adjust-modal__location-item--drop'
                                                        : '',
                                                    suggest
                                                        ? 'storage-adjust-modal__location-item--suggest'
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
                                                        prev === `loc-${location.id}`
                                                            ? null
                                                            : prev,
                                                    );
                                                }}
                                                onDrop={(event) =>
                                                    onDropOnLocation(event, location.id)
                                                }
                                            >
                                                <span className="storage-adjust-modal__location-label">
                                                    {getLocationDisplayLabel(location)}
                                                    {status === LOCATION_STATUS.FULL ? (
                                                        <span className="storage-adjust-modal__full-badge">
                                                            Đầy
                                                        </span>
                                                    ) : null}
                                                    {suggest ? (
                                                        <span className="storage-adjust-modal__suggest-badge">
                                                            Gợi ý · {suggest.reason}
                                                        </span>
                                                    ) : null}
                                                </span>
                                                <span className="storage-adjust-modal__location-meta">
                                                    {batchCount > 0
                                                        ? productCount > 1
                                                            ? `${productCount} SP · ${batchCount} lô`
                                                            : `${batchCount} lô · ${preview}`
                                                        : null}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })
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
    const [selectedLocationId, setSelectedLocationId] = useState(null);
    const [message, setMessage] = useState(null);
    const [dragOverTarget, setDragOverTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [sessionInitialLocationId, setSessionInitialLocationId] = useState(null);
    const [placeQtyRequest, setPlaceQtyRequest] = useState(null);
    const [focusBatch, setFocusBatch] = useState(null);
    const [pickMode, setPickMode] = useState(PICK_MODE.none);
    const [pendingMoveItem, setPendingMoveItem] = useState(null);
    const [alertNotice, setAlertNotice] = useState(null);

    const reportApiError = (error, fallback) => {
        const text = getApiErrorMessage(error, fallback);
        setMessage({ type: 'error', text });
    };

    const reloadData = async (preferLocations, preferredId) => {
        const nextLocations = preferLocations
            ? preferLocations
            : await fetchStorageLocations();
        const cloned = cloneLocations(nextLocations);
        setDraftLocations(cloned);
        setSelectedLocationId((prev) => {
            const preferred = preferredId ?? prev;
            if (preferred && cloned.some((location) => location.id === preferred)) {
                return preferred;
            }
            return null;
        });
        return { locations: cloned };
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
            setHasChanges(false);
            setPlaceQtyRequest(null);
            setFocusBatch(null);
            setPickMode(PICK_MODE.none);
            setPendingMoveItem(null);
            setAlertNotice(null);

            try {
                await reloadData(locations, initialLocationId);
            } catch (error) {
                if (!cancelled) {
                    const cloned = cloneLocations(locations);
                    setDraftLocations(cloned);
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
                            'Không tải được danh sách vị trí. Đang dùng dữ liệu hiện có.',
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

    const suggestions = useMemo(() => {
        if (pickMode !== PICK_MODE.moveOne || !focusBatch) {
            return [];
        }
        return suggestLocationsForBatch(focusBatch, draftLocations, {
            excludeLocationId: focusBatch._sourceLocationId ?? null,
            preferredZone: selectedLocation?.zone ?? null,
        });
    }, [pickMode, focusBatch, draftLocations, selectedLocation]);

    const suggestedById = useMemo(() => {
        const map = {};
        suggestions.forEach((item) => {
            map[item.locationId] = item;
        });
        return map;
    }, [suggestions]);

    const clearPickMode = () => {
        setPickMode(PICK_MODE.none);
        setPendingMoveItem(null);
        setFocusBatch(null);
    };

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

    const handleDropOnLocation = (event, locationId) => {
        event.preventDefault();
        setDragOverTarget(null);
        if (isSaving || placeQtyRequest) {
            return;
        }

        const payload = parseDragData(event);
        if (!payload || payload.type !== DRAG_TYPE.shelf) {
            return;
        }

        const destination = draftLocations.find((item) => item.id === locationId);
        if (!destination) {
            return;
        }

        if (payload.locationId === locationId) {
            return;
        }

        const sourceLocation = draftLocations.find((item) => item.id === payload.locationId);
        const shelfItem = (sourceLocation?.contents ?? []).find(
            (item) => item.id === payload.batchId,
        );
        const maxQty = Number(shelfItem?.quantity ?? payload.quantity) || 0;
        if (maxQty < 1) {
            return;
        }
        setMessage(null);
        setPlaceQtyRequest({
            mode: 'move',
            batchLocationId: payload.batchId,
            batchCode: shelfItem?.batchCode || payload.batchCode,
            productName: shelfItem?.productName || '',
            unit: shelfItem?.unit,
            locationId,
            locationLabel: getLocationDisplayLabel(destination),
            maxQty,
        });
    };

    const handleConfirmPlaceQuantity = async (quantity) => {
        if (!placeQtyRequest || isSaving) {
            return;
        }

        setIsSaving(true);
        try {
            await moveBatchLocation({
                batchLocationId: placeQtyRequest.batchLocationId,
                toLocationId: placeQtyRequest.locationId,
                quantity,
            });
            await reloadData(null, placeQtyRequest.locationId);
            setHasChanges(true);
            setMessage({
                type: 'success',
                text: `Đã chuyển ${quantity} ${placeQtyRequest.unit || 'đv'} sang kệ ${placeQtyRequest.locationLabel}.`,
            });
            setPlaceQtyRequest(null);
        } catch (error) {
            reportApiError(error, 'Không thể cập nhật vị trí lô. Vui lòng thử lại.');
            setPlaceQtyRequest(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectLocation = async (locationId) => {
        if (pickMode === PICK_MODE.moveAll && selectedLocationId) {
            if (locationId === selectedLocationId) {
                setMessage({
                    type: 'error',
                    text: 'Chọn một ô khác làm đích chuyển.',
                });
                return;
            }
            const destination = draftLocations.find((item) => item.id === locationId);
            setIsSaving(true);
            try {
                await moveAllBatchesFromLocation({
                    fromLocationId: selectedLocationId,
                    toLocationId: locationId,
                });
                await reloadData(null, locationId);
                setHasChanges(true);
                clearPickMode();
                setFocusBatch(null);
                setMessage({
                    type: 'success',
                    text: `Đã chuyển toàn bộ hàng sang kệ ${getLocationDisplayLabel(destination)}.`,
                });
            } catch (error) {
                reportApiError(
                    error,
                    'Không thể chuyển toàn bộ hàng. Kiểm tra rule khu kho / ô đầy.',
                );
            } finally {
                setIsSaving(false);
            }
            return;
        }

        if (pickMode === PICK_MODE.moveOne && pendingMoveItem) {
            if (locationId === pendingMoveItem.locationId) {
                setMessage({
                    type: 'error',
                    text: 'Chọn một ô khác làm đích chuyển.',
                });
                return;
            }
            const destination = draftLocations.find((item) => item.id === locationId);
            const maxQty = Number(pendingMoveItem.quantity) || 0;
            clearPickMode();
            setPlaceQtyRequest({
                mode: 'move',
                batchLocationId: pendingMoveItem.id,
                batchCode: pendingMoveItem.batchCode,
                productName: pendingMoveItem.productName,
                unit: pendingMoveItem.unit,
                locationId,
                locationLabel: getLocationDisplayLabel(destination),
                maxQty,
            });
            return;
        }

        setSelectedLocationId(locationId);
        setFocusBatch(null);
        setMessage(null);
    };

    const startMoveAll = () => {
        if (!selectedLocation || (selectedLocation.contents ?? []).length === 0) {
            return;
        }
        setPickMode(PICK_MODE.moveAll);
        setPendingMoveItem(null);
        setMessage({
            type: 'info',
            text: 'Chọn ô đích trên cột trái để chuyển toàn bộ hàng.',
        });
    };

    const handleToggleFull = async () => {
        if (!selectedLocation || isSaving) {
            return;
        }
        const nextFull = !selectedLocation.isFull;
        if (nextFull && !(selectedLocation.contents ?? []).length) {
            setMessage({
                type: 'error',
                text: 'Ô đang trống, không thể đánh dấu đầy.',
            });
            return;
        }
        setIsSaving(true);
        setMessage(null);
        try {
            const updated = await setStorageLocationFull(selectedLocation.id, nextFull);
            setDraftLocations((prev) =>
                prev.map((item) =>
                    item.id === updated.id
                        ? {
                              ...item,
                              ...updated,
                              contents: updated.contents ?? item.contents,
                          }
                        : item,
                ),
            );
            setHasChanges(true);
            setMessage({
                type: 'success',
                text: nextFull
                    ? `Đã đánh dấu đầy ô ${getLocationDisplayLabel(selectedLocation)}.`
                    : `Đã bỏ đánh dấu đầy ô ${getLocationDisplayLabel(selectedLocation)}.`,
            });
        } catch (error) {
            reportApiError(error, 'Không thể cập nhật trạng thái đầy. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    const startMoveOne = (item) => {
        if (!selectedLocation || !item) {
            return;
        }
        setFocusBatch({
            ...item,
            _sourceLocationId: selectedLocation.id,
        });
        setPickMode(PICK_MODE.moveOne);
        setPendingMoveItem({
            ...item,
            locationId: selectedLocation.id,
        });
        setMessage({
            type: 'info',
            text: `Chọn ô đích để chuyển lô ${item.batchCode}.`,
        });
    };

    const handleSuggestChipClick = (locationId) => {
        if (pickMode === PICK_MODE.moveAll || pickMode === PICK_MODE.moveOne) {
            handleSelectLocation(locationId);
            return;
        }
        setSelectedLocationId(locationId);
    };

    if (!show) {
        return null;
    }

    return (
        <>
        <Modal
            show={show}
            onHide={handleClose}
            className="storage-modal--stacked"
            backdropClassName="storage-modal-backdrop--stacked"
            dialogClassName="storage-adjust-modal"
            centered
            enforceFocus={!placeQtyRequest}
            restoreFocus={!placeQtyRequest}
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
                                onSelectLocation={handleSelectLocation}
                                dragOverTarget={dragOverTarget}
                                setDragOverTarget={setDragOverTarget}
                                onDropOnLocation={handleDropOnLocation}
                                isSaving={isSaving}
                                initialExpandLocationId={sessionInitialLocationId}
                                suggestedById={suggestedById}
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
                            <div className="storage-adjust-modal__content-header">
                                <h3 className="storage-adjust-modal__section-title">
                                    {selectedLocation
                                        ? getLocationDisplayLabel(selectedLocation)
                                        : 'Chọn vị trí'}
                                    {selectedLocation?.isFull ? (
                                        <span className="storage-adjust-modal__full-badge">
                                            Đầy
                                        </span>
                                    ) : null}
                                </h3>
                                {selectedLocation &&
                                ((selectedLocation.contents ?? []).length > 0 ||
                                    selectedLocation.isFull) ? (
                                    <div className="storage-adjust-modal__header-actions">
                                        <button
                                            type="button"
                                            className={`inventory-btn storage-adjust-modal__full-btn ${
                                                selectedLocation.isFull
                                                    ? 'inventory-btn--secondary'
                                                    : 'inventory-btn--primary'
                                            }`}
                                            disabled={isSaving || Boolean(pickMode)}
                                            onClick={handleToggleFull}
                                        >
                                            <CircleDot size={16} />
                                            {selectedLocation.isFull
                                                ? 'Bỏ đánh dấu đầy'
                                                : 'Đánh dấu đầy'}
                                        </button>
                                        {(selectedLocation.contents ?? []).length > 0 ? (
                                            <button
                                                type="button"
                                                className="inventory-btn inventory-btn--secondary storage-adjust-modal__move-all-btn"
                                                disabled={isSaving || Boolean(pickMode)}
                                                onClick={startMoveAll}
                                            >
                                                Chuyển tất cả
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                            {pickMode ? (
                                <div className="storage-adjust-modal__pick-banner">
                                    {pickMode === PICK_MODE.moveAll
                                        ? 'Đang chọn ô đích để chuyển toàn bộ hàng.'
                                        : `Đang chọn ô đích để chuyển lô ${pendingMoveItem?.batchCode || ''}.`}
                                    <button type="button" onClick={clearPickMode} disabled={isSaving}>
                                        Hủy
                                    </button>
                                </div>
                            ) : null}
                            {suggestions.length > 0 ? (
                                <div className="storage-adjust-modal__suggest-list">
                                    <p className="storage-adjust-modal__suggest-list-title">
                                        Nên xếp vào
                                        {focusBatch?.productName
                                            ? ` · ${focusBatch.productName}`
                                            : ''}
                                        {focusBatch?.categoryName
                                            ? ` (${focusBatch.categoryName})`
                                            : ''}
                                    </p>
                                    <div className="storage-adjust-modal__suggest-chips">
                                        {suggestions.map((item) => (
                                            <button
                                                key={item.locationId}
                                                type="button"
                                                className="storage-adjust-modal__suggest-chip"
                                                disabled={isSaving}
                                                onClick={() =>
                                                    handleSuggestChipClick(item.locationId)
                                                }
                                            >
                                                {item.label} · {item.reason}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {selectedLocation ? (
                                <>
                                    <p className="storage-adjust-modal__location-desc">
                                        {getLocationDisplayLabel(selectedLocation)}
                                        {selectedLocation.shelf
                                            ? ` · Tầng ${selectedLocation.shelf}`
                                            : ''}
                                        {selectedLocation.bin
                                            ? ` · Ô ${selectedLocation.bin}`
                                            : ''}
                                    </p>

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
                                                    className={[
                                                        'storage-adjust-modal__batch-item storage-adjust-modal__batch-item--draggable',
                                                        focusBatch?.id === item.id &&
                                                        focusBatch?._sourceLocationId ===
                                                            selectedLocation.id
                                                            ? 'storage-adjust-modal__batch-item--focus'
                                                            : '',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    draggable={!isSaving}
                                                    onDragStart={(event) => {
                                                        handleDragStart(event, {
                                                            type: DRAG_TYPE.shelf,
                                                            batchId: item.id,
                                                            locationId: selectedLocation.id,
                                                            quantity: item.quantity,
                                                        });
                                                    }}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <GripVertical
                                                        size={16}
                                                        className="storage-adjust-modal__drag-handle"
                                                    />
                                                    <div className="storage-adjust-modal__batch-item-body">
                                                        <strong>{item.batchCode}</strong>
                                                        <p>{item.productName}</p>
                                                        {item.categoryName ? (
                                                            <p className="storage-adjust-modal__helper storage-adjust-modal__helper--tight">
                                                                {item.categoryName}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <div className="storage-adjust-modal__batch-item-meta">
                                                        <span>
                                                            {item.quantity} {item.unit}
                                                        </span>
                                                        <span>
                                                            HSD {formatDate(item.expiryDate)}
                                                        </span>
                                                    </div>
                                                    <div className="storage-adjust-modal__batch-item-actions">
                                                        <button
                                                            type="button"
                                                            className="inventory-btn inventory-btn--secondary"
                                                            disabled={isSaving}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                startMoveOne(item);
                                                            }}
                                                        >
                                                            Chuyển
                                                        </button>
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
                                <div className="storage-adjust-modal__empty storage-adjust-modal__empty--compact">
                                    Chọn một ô từ cột trái để xem và xếp lô.
                                </div>
                            )}
                        </section>
                    </>
                )}
            </Modal.Body>
        </Modal>
            <PlaceBatchQuantityModal
                open={Boolean(placeQtyRequest)}
                mode={placeQtyRequest?.mode}
                batchCode={placeQtyRequest?.batchCode}
                productName={placeQtyRequest?.productName}
                unit={placeQtyRequest?.unit}
                locationLabel={placeQtyRequest?.locationLabel}
                maxQty={placeQtyRequest?.maxQty}
                confirming={isSaving}
                onClose={() => {
                    if (!isSaving) setPlaceQtyRequest(null);
                }}
                onConfirm={handleConfirmPlaceQuantity}
            />
            <AlertNoticeModal
                open={Boolean(alertNotice?.message)}
                title={alertNotice?.title ?? 'Cảnh báo'}
                message={alertNotice?.message}
                overlayClassName="storage-adjust-alert-overlay"
                onClose={() => setAlertNotice(null)}
            />
        </>
    );
}
