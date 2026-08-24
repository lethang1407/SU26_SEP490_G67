import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { Plus, Settings2 } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import AdjustStorageLocationModal from '../components/AdjustStorageLocationModal';
import { fetchStorageLocations, fetchUnplacedBatches, setStorageLocationFull } from '../api';
import CreateStorageLocationModal from '../components/CreateStorageLocationModal';
import StorageLocationDetailModal from '../components/StorageLocationDetailModal';
import StorageLocationGrid from '../components/StorageLocationGrid';
import StorageLocationToolbar from '../components/StorageLocationToolbar';
import ReturnHoldPanel from '../components/ReturnHoldPanel';
import UnplacedBatchesPanel from '../components/UnplacedBatchesPanel';
import ZoneDetailModal from '../components/ZoneDetailModal';
import { LOCATION_STATUS } from '../constants';
import {
    filterStorageLocations,
    getFloorOptions,
    getReturnHoldLocation,
    getShelfLocations,
    getZoneOptions,
    groupLocationsByZone,
} from '../utils/storageLocationUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/Supplier.css';
import '../../../css/StorageLocation.css';

const DEFAULT_FILTERS = {
    keyword: '',
    zoneFilter: 'all',
    aisleFilter: 'all',
    statusFilter: LOCATION_STATUS.ALL,
};

function buildLocationSearchSuggestions(locations, keyword) {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];

    const results = [];
    for (const location of locations) {
        for (const item of location.contents ?? []) {
            const productName = String(item.productName || '');
            const productCode = String(item.productCode || '');
            const batchCode = String(item.batchCode || '');
            const matched =
                productName.toLowerCase().includes(q) ||
                productCode.toLowerCase().includes(q) ||
                batchCode.toLowerCase().includes(q);
            if (!matched) continue;
            results.push({
                location,
                productName: productName || '—',
                batchCode: batchCode || null,
                quantity: item.quantity,
            });
            if (results.length >= 20) return results;
        }
    }
    return results;
}

export default function StorageLocationListPage() {
    const [allLocations, setAllLocations] = useState([]);
    const [unplacedBatches, setUnplacedBatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unplacedLoading, setUnplacedLoading] = useState(true);
    const [error, setError] = useState(null);
    const [togglingFull, setTogglingFull] = useState(false);

    const [keyword, setKeyword] = useState('');
    const [zoneFilter, setZoneFilter] = useState('all');
    const [aisleFilter, setAisleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState(LOCATION_STATUS.ALL);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustInitialLocationId, setAdjustInitialLocationId] = useState(null);
    const [adjustInitialBatchId, setAdjustInitialBatchId] = useState(null);
    const [selectedZoneGroup, setSelectedZoneGroup] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [draftLocations, setDraftLocations] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchWrapRef = useRef(null);

    useEffect(() => {
        let isCancelled = false;

        const loadLocations = async () => {
            setIsLoading(true);
            setUnplacedLoading(true);
            setError(null);

            try {
                const [locations, unplaced] = await Promise.all([
                    fetchStorageLocations(),
                    fetchUnplacedBatches().catch(() => []),
                ]);
                if (!isCancelled) {
                    setAllLocations(locations);
                    setUnplacedBatches(unplaced);
                    setDraftLocations(null);
                }
            } catch (fetchError) {
                if (!isCancelled) {
                    setAllLocations([]);
                    setUnplacedBatches([]);
                    setError(
                        getApiErrorMessage(
                            fetchError,
                            'Không thể tải danh sách vị trí kho. Vui lòng thử lại.',
                        ),
                    );
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                    setUnplacedLoading(false);
                }
            }
        };

        loadLocations();

        return () => {
            isCancelled = true;
        };
    }, [reloadKey]);

    const locationsData = draftLocations ?? allLocations;
    const shelfLocations = useMemo(
        () => getShelfLocations(locationsData),
        [locationsData],
    );
    const returnHoldLocation = useMemo(
        () => getReturnHoldLocation(locationsData),
        [locationsData],
    );

    const zoneOptions = useMemo(() => getZoneOptions(shelfLocations), [shelfLocations]);
    const aisleOptions = useMemo(
        () => getFloorOptions(shelfLocations, appliedFilters.zoneFilter),
        [shelfLocations, appliedFilters.zoneFilter],
    );

    const filteredLocations = useMemo(
        () => filterStorageLocations(shelfLocations, appliedFilters),
        [shelfLocations, appliedFilters],
    );

    const zoneGroups = useMemo(
        () => groupLocationsByZone(filteredLocations),
        [filteredLocations],
    );

    const searchSuggestions = useMemo(
        () => buildLocationSearchSuggestions(shelfLocations, keyword),
        [shelfLocations, keyword],
    );

    useEffect(() => {
        if (!selectedZoneGroup) {
            return;
        }
        const refreshed = zoneGroups.find((group) => group.zone === selectedZoneGroup.zone);
        if (refreshed && refreshed !== selectedZoneGroup) {
            setSelectedZoneGroup(refreshed);
        }
        if (!refreshed) {
            setSelectedZoneGroup(null);
        }
    }, [zoneGroups, selectedZoneGroup]);

    const existingZones = useMemo(
        () => [
            ...new Set(
                shelfLocations.map((location) => location.zone).filter(Boolean),
            ),
        ],
        [shelfLocations],
    );

    const handleLocationCreated = (createdLocation) => {
        setReloadKey((prev) => prev + 1);
        setSelectedLocation(createdLocation ?? null);
    };

    const handleAdjustSaved = () => {
        setShowAdjustModal(false);
        setDraftLocations(null);
        setReloadKey((prev) => prev + 1);
    };

    const handleApplyFilters = () => {
        setAppliedFilters({
            keyword,
            zoneFilter,
            aisleFilter,
            statusFilter,
        });
        setSearchOpen(false);
    };

    const handleZoneChange = (value) => {
        setZoneFilter(value);
        setAisleFilter('all');
    };

    const handleAdjustLocation = (location) => {
        setAdjustInitialLocationId(location?.id ?? null);
        setAdjustInitialBatchId(null);
        setSelectedLocation(null);
        setShowAdjustModal(true);
    };

    const openAdjustModal = (batch = null) => {
        setAdjustInitialLocationId(null);
        setAdjustInitialBatchId(batch?.id ?? null);
        setShowAdjustModal(true);
    };

    const handleOpenZone = (group) => {
        setSelectedZoneGroup(group);
    };

    const handleSelectLocationFromZone = (location) => {
        setSelectedLocation(location);
    };

    const handleZoneUpdated = () => {
        setReloadKey((prev) => prev + 1);
    };

    const handleSelectSuggestion = (item) => {
        setSelectedLocation(item.location);
        setKeyword(item.productName || item.batchCode || '');
        setSearchOpen(false);
        setAppliedFilters({
            keyword: item.productName || item.batchCode || '',
            zoneFilter,
            aisleFilter,
            statusFilter,
        });
    };

    const handleToggleFull = async (location, isFull) => {
        if (!location?.id || togglingFull) {
            return;
        }
        if (isFull && !(location.contents ?? []).length) {
            setError('Ô đang trống, không thể đánh dấu đầy.');
            return;
        }
        setTogglingFull(true);
        setError(null);
        try {
            const updated = await setStorageLocationFull(location.id, isFull);
            setAllLocations((prev) =>
                prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
            );
            setSelectedLocation(updated);
        } catch (toggleError) {
            setError(
                getApiErrorMessage(
                    toggleError,
                    'Không thể cập nhật trạng thái đầy. Vui lòng thử lại.',
                ),
            );
        } finally {
            setTogglingFull(false);
        }
    };

    return (
        <div className="admin-content">
            <AdminHeader />
            <main className="admin-main">
                <div className="dashboard-container storage-location-page">
                    <header className="inventory-page__header">
                        <div>
                            <h1 className="inventory-page__title">Vị trí hàng hóa</h1>
                            <p className="inventory-page__subtitle">
                                Vị trí hàng hóa đang lưu trữ trong cửa hàng
                            </p>
                        </div>
                        <div className="inventory-page__actions">
                            <button
                                type="button"
                                className="inventory-btn inventory-btn--secondary"
                                onClick={() => openAdjustModal()}
                            >
                                <Settings2 size={18} />
                                Điều chỉnh
                            </button>
                            <button
                                type="button"
                                className="inventory-btn inventory-btn--primary"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <Plus size={18} />
                                Thêm vị trí
                            </button>
                        </div>
                    </header>

                    <StorageLocationToolbar
                        keyword={keyword}
                        zoneFilter={zoneFilter}
                        aisleFilter={aisleFilter}
                        statusFilter={statusFilter}
                        zoneOptions={zoneOptions}
                        aisleOptions={aisleOptions}
                        searchSuggestions={searchSuggestions}
                        searchOpen={searchOpen}
                        searchLoading={false}
                        onKeywordChange={(value) => {
                            setKeyword(value);
                            setSearchOpen(true);
                        }}
                        onZoneFilterChange={handleZoneChange}
                        onAisleFilterChange={setAisleFilter}
                        onStatusFilterChange={setStatusFilter}
                        onFilter={handleApplyFilters}
                        onSelectSuggestion={handleSelectSuggestion}
                        onSearchFocus={() => setSearchOpen(true)}
                        onSearchBlur={() => {
                            setTimeout(() => setSearchOpen(false), 120);
                        }}
                        searchWrapRef={searchWrapRef}
                    />

                    {error && <Alert variant="danger">{error}</Alert>}

                    {isLoading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </Spinner>
                        </div>
                    ) : (
                        <>
                            <UnplacedBatchesPanel
                                batches={unplacedBatches}
                                loading={unplacedLoading}
                                onPlaceBatch={(batch) => openAdjustModal(batch)}
                            />

                            <StorageLocationGrid
                                groups={zoneGroups}
                                selectedLocationId={selectedLocation?.id ?? null}
                                onOpenZone={handleOpenZone}
                                onSelectLocation={setSelectedLocation}
                            />

                            <ReturnHoldPanel
                                location={returnHoldLocation}
                                loading={isLoading}
                            />
                        </>
                    )}
                </div>
            </main>

            <CreateStorageLocationModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                onSuccess={handleLocationCreated}
                existingZones={existingZones}
            />

            <AdjustStorageLocationModal
                show={showAdjustModal}
                onHide={() => {
                    setShowAdjustModal(false);
                    setAdjustInitialLocationId(null);
                    setAdjustInitialBatchId(null);
                }}
                locations={locationsData}
                onSaved={handleAdjustSaved}
                initialLocationId={adjustInitialLocationId}
                initialUnplacedBatchId={adjustInitialBatchId}
            />

            <ZoneDetailModal
                show={Boolean(selectedZoneGroup)}
                zoneGroup={selectedZoneGroup}
                onHide={() => setSelectedZoneGroup(null)}
                selectedLocationId={selectedLocation?.id ?? null}
                onSelectLocation={handleSelectLocationFromZone}
                onZoneUpdated={handleZoneUpdated}
            />

            <StorageLocationDetailModal
                location={selectedLocation}
                onClose={() => setSelectedLocation(null)}
                onAdjustLocation={handleAdjustLocation}
                onToggleFull={handleToggleFull}
                togglingFull={togglingFull}
            />
        </div>
    );
}
