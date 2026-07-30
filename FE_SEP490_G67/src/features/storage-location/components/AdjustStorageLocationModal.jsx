import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { GripVertical, Package, Search, X } from 'lucide-react';
import {
    assignBatchToLocation,
    fetchStorageLocations,
    fetchUnplacedBatches,
    moveBatchLocation,
    unassignBatchFromLocation,
} from '../api';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { formatDate, getLocationProduct } from '../utils/storageLocationUtils';

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

export default function AdjustStorageLocationModal({ show, onHide, locations, onSaved }) {
    const [draftLocations, setDraftLocations] = useState([]);
    const [unplacedBatches, setUnplacedBatches] = useState([]);
    const [selectedLocationId, setSelectedLocationId] = useState(null);
    const [unplacedKeyword, setUnplacedKeyword] = useState('');
    const [message, setMessage] = useState(null);
    const [dragOverTarget, setDragOverTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const reloadData = async (preferLocations) => {
        const [nextLocations, nextUnplaced] = await Promise.all([
            preferLocations ? Promise.resolve(preferLocations) : fetchStorageLocations(),
            fetchUnplacedBatches(),
        ]);
        const cloned = cloneLocations(nextLocations);
        setDraftLocations(cloned);
        setUnplacedBatches(nextUnplaced ?? []);
        setSelectedLocationId((prev) => {
            if (prev && cloned.some((location) => location.id === prev)) {
                return prev;
            }
            return cloned[0]?.id ?? null;
        });
        return cloned;
    };

    useEffect(() => {
        if (!show) {
            return;
        }

        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setMessage(null);
            setDragOverTarget(null);
            setUnplacedKeyword('');
            setHasChanges(false);

            try {
                const cloned = await reloadData(locations);
                if (!cancelled) {
                    setSelectedLocationId(cloned[0]?.id ?? null);
                }
            } catch (error) {
                if (!cancelled) {
                    setDraftLocations(cloneLocations(locations));
                    setUnplacedBatches([]);
                    setSelectedLocationId(locations?.[0]?.id ?? null);
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
    }, [show, locations]);

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

                await reloadData();
                setSelectedLocationId(locationId);
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

                await reloadData();
                setSelectedLocationId(locationId);
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

            await reloadData();
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
            <Modal.Header className="storage-adjust-modal__header">
                <div>
                    <Modal.Title>Điều chỉnh vị trí lô hàng</Modal.Title>
                    <p className="storage-adjust-modal__subtitle">
                        Kéo thả lô chưa xếp từ cột phải vào ô kệ bên trái. Thay đổi được lưu ngay
                        lên hệ thống.
                    </p>
                </div>
                <button
                    type="button"
                    className="storage-adjust-modal__close"
                    onClick={handleClose}
                    aria-label="Đóng"
                >
                    <X size={18} />
                </button>
            </Modal.Header>

            <Modal.Body className="storage-adjust-modal__body">
                {isLoading ? (
                    <div className="storage-adjust-modal__loading">Đang tải dữ liệu điều chỉnh...</div>
                ) : (
                    <>
                        <aside className="storage-adjust-modal__sidebar">
                            <h3 className="storage-adjust-modal__section-title">Vị trí kệ</h3>
                            <p className="storage-adjust-modal__helper storage-adjust-modal__helper--tight">
                                Thả lô vào kệ để xếp hàng. Click để xem nội dung kệ.
                            </p>
                            <div className="storage-adjust-modal__location-list">
                                {draftLocations.map((location) => {
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
                                            onClick={() => {
                                                setSelectedLocationId(location.id);
                                                setMessage(null);
                                            }}
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
                                            onDrop={(event) => handleDropOnLocation(event, location.id)}
                                        >
                                            <span className="storage-adjust-modal__location-label">
                                                {location.label}
                                            </span>
                                            <span className="storage-adjust-modal__location-meta">
                                                {(location.contents ?? []).length > 0
                                                    ? `${location.contents.length} lô · ${product?.productName ?? ''}`
                                                    : 'Kệ trống — thả lô vào đây'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
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
                            {selectedLocation && (
                                <>
                                    <p className="storage-adjust-modal__location-desc">
                                        Khu {selectedLocation.zone} · Hàng{' '}
                                        {selectedLocation.aisle || '—'} · Kệ{' '}
                                        {selectedLocation.shelf || '—'}
                                    </p>
                                    <div className="storage-adjust-modal__rule-box">
                                        Mỗi kệ chỉ chứa 1 loại sản phẩm. Kéo lô từ cột phải thả vào
                                        đây hoặc vào danh sách kệ. Kéo lô trên kệ trả về cột phải để
                                        gỡ xếp.
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
                                                        <span>HSD {formatDate(item.expiryDate)}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="storage-adjust-modal__empty storage-adjust-modal__empty--dropzone">
                                                <Package size={28} />
                                                <p>Kệ trống</p>
                                                <span>Thả lô chưa xếp vào đây để gán vị trí</span>
                                            </div>
                                        )}
                                    </div>
                                </>
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
                                Các lô đã nhập kho nhưng chưa có vị trí. Kéo thả vào kệ để xếp.
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

            <Modal.Footer className="storage-adjust-modal__footer">
                <button
                    type="button"
                    className="inventory-btn inventory-btn--primary"
                    onClick={handleClose}
                    disabled={isSaving}
                >
                    Đóng
                </button>
            </Modal.Footer>
        </Modal>
    );
}
