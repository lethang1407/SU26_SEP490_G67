import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { ChevronDown, GripVertical, Package, Search } from 'lucide-react';
import {
    assignBatchToLocation,
    fetchStorageLocations,
    fetchUnplacedBatches,
    moveAllBatchesFromLocation,
    moveBatchLocation,
    unassignBatchFromLocation,
} from '../api';
import {
    formatDate,
    getLocationMetrics,
    getLocationProductPreview,
    getLocationStatus,
    groupLocationsByZone,
    groupZoneGroupsByType,
    suggestLocationsForBatch,
} from '../utils/storageLocationUtils';
import { LOCATION_STATUS, ZONE_TYPE } from '../constants';
import { getApiErrorMessage } from '../../../utils/api-utils';
import PlaceBatchQuantityModal from './PlaceBatchQuantityModal';

const DRAG_TYPE = {
    unplaced: 'unplaced',
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

    useEffect(() => {
        const suggestedIds = Object.keys(suggestedById);
        if (suggestedIds.length === 0) {
            return;
        }
        const nextZones = new Set();
        const nextTypes = new Set();
        draftLocations.forEach((location) => {
            if (!suggestedById[location.id]) {
                return;
            }
            if (location.zone) {
                nextZones.add(location.zone);
            }
            nextTypes.add(location.zoneType === ZONE_TYPE.SALES ? 'sales' : 'warehouse');
        });
        if (nextZones.size > 0) {
            setExpandedZones((prev) => new Set([...prev, ...nextZones]));
        }
        if (nextTypes.size > 0) {
            setExpandedTypes((prev) => new Set([...prev, ...nextTypes]));
        }
    }, [suggestedById, draftLocations]);

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
                        <span>Kệ {group.zone}</span>
                        <span className="storage-adjust-modal__tree-count">
                            {floorCount > 0 ? `${floorCount} tầng · ` : ''}
                            {group.locations.length} ô
                        </span>
                    </button>
                    {zoneOpen && (
                        <div className="storage-adjust-modal__zone-locations">
                            {group.locations.map((location) => {
                                const { batchCount, productCount } = getLocationMetrics(location);
                                const preview = getLocationProductPreview(location, 1);
                                const status = getLocationStatus(location);
                                const isDropTarget = dragOverTarget === `loc-${location.id}`;
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
                                                prev === `loc-${location.id}` ? null : prev,
                                            );
                                        }}
                                        onDrop={(event) => onDropOnLocation(event, location.id)}
                                    >
                                        <span className="storage-adjust-modal__location-label">
                                            {location.label}
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
    const [placeQtyRequest, setPlaceQtyRequest] = useState(null);
    const [focusBatch, setFocusBatch] = useState(null);
    const [pickMode, setPickMode] = useState(PICK_MODE.none);
    const [pendingMoveItem, setPendingMoveItem] = useState(null);

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
            setPlaceQtyRequest(null);
            setFocusBatch(null);
            setPickMode(PICK_MODE.none);
            setPendingMoveItem(null);

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
                batch.productCode?.toLowerCase().includes(keyword) ||
                batch.categoryName?.toLowerCase().includes(keyword),
        );
    }, [unplacedBatches, unplacedKeyword]);

    const suggestions = useMemo(() => {
        // Chỉ gợi ý khi đang ở chế độ chuyển 1 lô (bấm nút Chuyển)
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
        if (!payload) {
            return;
        }

        const destination = draftLocations.find((item) => item.id === locationId);
        if (!destination) {
            return;
        }

        if (payload.type === DRAG_TYPE.unplaced) {
            const batch = unplacedBatches.find((item) => item.id === payload.batchId);
            if (!batch) {
                return;
            }
            const maxQty = Number(batch.quantity) || 0;
            if (maxQty < 1) {
                setMessage({
                    type: 'error',
                    text: 'Lô không còn số lượng chưa xếp.',
                });
                return;
            }
            setMessage(null);
            setPlaceQtyRequest({
                mode: 'assign',
                batchId: batch.batchId ?? batch.id,
                batchCode: batch.batchCode,
                productName: batch.productName,
                unit: batch.unit,
                locationId,
                locationLabel: destination.label,
                maxQty,
            });
            return;
        }

        if (payload.type === DRAG_TYPE.shelf) {
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
                locationLabel: destination.label,
                maxQty,
            });
        }
    };

    const handleConfirmPlaceQuantity = async (quantity) => {
        if (!placeQtyRequest || isSaving) {
            return;
        }

        setIsSaving(true);
        try {
            if (placeQtyRequest.mode === 'assign') {
                await assignBatchToLocation({
                    batchId: placeQtyRequest.batchId,
                    locationId: placeQtyRequest.locationId,
                    quantity,
                });
                await reloadData(null, placeQtyRequest.locationId);
                setHasChanges(true);
                setMessage({
                    type: 'success',
                    text: `Đã xếp ${quantity} ${placeQtyRequest.unit || 'đv'} lô ${placeQtyRequest.batchCode} vào kệ ${placeQtyRequest.locationLabel}.`,
                });
            } else if (placeQtyRequest.mode === 'move') {
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
            }
            setPlaceQtyRequest(null);
        } catch (error) {
            setMessage({
                type: 'error',
                text: getApiErrorMessage(error, 'Không thể cập nhật vị trí lô. Vui lòng thử lại.'),
            });
            setPlaceQtyRequest(null);
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
                    text: `Đã chuyển toàn bộ hàng sang kệ ${destination?.label || ''}.`,
                });
            } catch (error) {
                setMessage({
                    type: 'error',
                    text: getApiErrorMessage(
                        error,
                        'Không thể chuyển toàn bộ hàng. Kiểm tra rule khu kho / ô đầy.',
                    ),
                });
            } finally {
                setIsSaving(false);
            }
            return;
        }

        if (pickMode === PICK_MODE.moveOne && pendingMoveItem) {
            const isAssign = pendingMoveItem.placeMode === 'assign';
            if (!isAssign && locationId === pendingMoveItem.locationId) {
                setMessage({
                    type: 'error',
                    text: 'Chọn một ô khác làm đích chuyển.',
                });
                return;
            }
            const destination = draftLocations.find((item) => item.id === locationId);
            const maxQty = Number(pendingMoveItem.quantity) || 0;
            clearPickMode();
            if (isAssign) {
                setPlaceQtyRequest({
                    mode: 'assign',
                    batchId: pendingMoveItem.batchId ?? pendingMoveItem.id,
                    batchCode: pendingMoveItem.batchCode,
                    productName: pendingMoveItem.productName,
                    unit: pendingMoveItem.unit,
                    locationId,
                    locationLabel: destination?.label,
                    maxQty,
                });
            } else {
                setPlaceQtyRequest({
                    mode: 'move',
                    batchLocationId: pendingMoveItem.id,
                    batchCode: pendingMoveItem.batchCode,
                    productName: pendingMoveItem.productName,
                    unit: pendingMoveItem.unit,
                    locationId,
                    locationLabel: destination?.label,
                    maxQty,
                });
            }
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
            placeMode: 'move',
        });
        setMessage({
            type: 'info',
            text: `Chọn ô đích để chuyển lô ${item.batchCode}.`,
        });
    };

    const startAssignUnplaced = (batch) => {
        if (!batch) {
            return;
        }
        setFocusBatch({
            ...batch,
            _sourceLocationId: null,
        });
        setPickMode(PICK_MODE.moveOne);
        setPendingMoveItem({
            ...batch,
            locationId: null,
            placeMode: 'assign',
        });
        setMessage({
            type: 'info',
            text: `Chọn ô đích để xếp lô ${batch.batchCode}.`,
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
                            <h3 className="storage-adjust-modal__section-title">
                                {selectedLocation?.label || 'Chọn vị trí'}
                            </h3>
                            {pickMode ? (
                                <div className="storage-adjust-modal__pick-banner">
                                    {pickMode === PICK_MODE.moveAll
                                        ? 'Đang chọn ô đích để chuyển toàn bộ hàng.'
                                        : pendingMoveItem?.placeMode === 'assign'
                                          ? `Đang chọn ô đích để xếp lô ${pendingMoveItem?.batchCode || ''}.`
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
                                        Kệ {selectedLocation.zone}
                                        {selectedLocation.zoneType === ZONE_TYPE.SALES
                                            ? ' · Bán'
                                            : ' · Kho'}{' '}
                                        · Tầng {selectedLocation.shelf || '—'} · Ô{' '}
                                        {selectedLocation.bin || '—'}
                                    </p>
                                    {selectedLocation.zoneType !== ZONE_TYPE.SALES ? (
                                        <div className="storage-adjust-modal__rule-box">
                                            Khu kho: lưu trữ các sản phẩm được nhập về trong cửa hàng
                                        </div>
                                    ) : null}

                                    {(selectedLocation.contents ?? []).length > 0 ? (
                                        <div className="storage-adjust-modal__content-toolbar">
                                            <button
                                                type="button"
                                                className="inventory-btn inventory-btn--secondary"
                                                disabled={isSaving || Boolean(pickMode)}
                                                onClick={startMoveAll}
                                            >
                                                Chuyển tất cả
                                            </button>
                                        </div>
                                    ) : null}

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
                                Kéo thả hoặc bấm Chuyển để xếp vào ô kệ.
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
                                            className={[
                                                'storage-adjust-modal__unplaced-card',
                                                focusBatch?.id === batch.id &&
                                                focusBatch?._sourceLocationId == null
                                                    ? 'storage-adjust-modal__unplaced-card--focus'
                                                    : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            draggable={!isSaving}
                                            onDragStart={(event) => {
                                                handleDragStart(event, {
                                                    type: DRAG_TYPE.unplaced,
                                                    batchId: batch.id,
                                                });
                                            }}
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
                                            {batch.categoryName ? (
                                                <p className="storage-adjust-modal__helper storage-adjust-modal__helper--tight">
                                                    {batch.categoryName}
                                                </p>
                                            ) : null}
                                            <div className="storage-adjust-modal__unplaced-meta">
                                                <span>
                                                    {batch.quantity} {batch.unit}
                                                </span>
                                                <span>HSD {formatDate(batch.expiryDate)}</span>
                                            </div>
                                            <span className="storage-adjust-modal__unplaced-code">
                                                {batch.productCode}
                                            </span>
                                            <div className="storage-adjust-modal__unplaced-actions">
                                                <button
                                                    type="button"
                                                    className="inventory-btn inventory-btn--secondary"
                                                    disabled={isSaving}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        startAssignUnplaced(batch);
                                                    }}
                                                >
                                                    Chuyển
                                                </button>
                                            </div>
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
        </>
    );
}
