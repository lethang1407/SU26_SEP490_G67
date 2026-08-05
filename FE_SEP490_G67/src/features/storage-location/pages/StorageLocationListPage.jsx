import { useEffect, useMemo, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { Plus, Settings2 } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import AdjustStorageLocationModal from '../components/AdjustStorageLocationModal';
import { fetchStorageLocations, setStorageLocationFull } from '../api';
import CreateStorageLocationModal from '../components/CreateStorageLocationModal';
import StorageLocationDetailModal from '../components/StorageLocationDetailModal';
import StorageLocationGrid from '../components/StorageLocationGrid';
import StorageLocationTable from '../components/StorageLocationTable';
import StorageLocationToolbar from '../components/StorageLocationToolbar';
import ZoneDetailModal from '../components/ZoneDetailModal';
import { LOCATION_STATUS, VIEW_MODE } from '../constants';
import {
    filterStorageLocations,
    getFloorOptions,
    getZoneOptions,
    groupLocationsByZone,
} from '../utils/storageLocationUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/StorageLocation.css';

const DEFAULT_FILTERS = {
    keyword: '',
    zoneFilter: 'all',
    aisleFilter: 'all',
    statusFilter: LOCATION_STATUS.ALL,
};

export default function StorageLocationListPage() {
    const [allLocations, setAllLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [togglingFull, setTogglingFull] = useState(false);

    const [keyword, setKeyword] = useState('');
    const [zoneFilter, setZoneFilter] = useState('all');
    const [aisleFilter, setAisleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState(LOCATION_STATUS.ALL);
    const [viewMode, setViewMode] = useState(VIEW_MODE.GRID);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustInitialLocationId, setAdjustInitialLocationId] = useState(null);
    const [selectedZoneGroup, setSelectedZoneGroup] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [draftLocations, setDraftLocations] = useState(null);

    useEffect(() => {
        let isCancelled = false;

        const loadLocations = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const locations = await fetchStorageLocations();
                if (!isCancelled) {
                    setAllLocations(locations);
                    setDraftLocations(null);
                }
            } catch (fetchError) {
                if (!isCancelled) {
                    setAllLocations([]);
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
                }
            }
        };

        loadLocations();

        return () => {
            isCancelled = true;
        };
    }, [reloadKey]);

    const locationsData = draftLocations ?? allLocations;

    const zoneOptions = useMemo(() => getZoneOptions(locationsData), [locationsData]);
    const aisleOptions = useMemo(
        () => getFloorOptions(locationsData, appliedFilters.zoneFilter),
        [locationsData, appliedFilters.zoneFilter],
    );

    const filteredLocations = useMemo(
        () => filterStorageLocations(locationsData, appliedFilters),
        [locationsData, appliedFilters],
    );

    const zoneGroups = useMemo(
        () => groupLocationsByZone(filteredLocations),
        [filteredLocations],
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
        () => [...new Set(locationsData.map((location) => location.zone).filter(Boolean))],
        [locationsData],
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
    };

    const handleResetFilters = () => {
        setKeyword('');
        setZoneFilter('all');
        setAisleFilter('all');
        setStatusFilter(LOCATION_STATUS.ALL);
        setAppliedFilters(DEFAULT_FILTERS);
    };

    const handleZoneChange = (value) => {
        setZoneFilter(value);
        setAisleFilter('all');
    };

    const handleAdjustLocation = (location) => {
        setAdjustInitialLocationId(location?.id ?? null);
        setSelectedLocation(null);
        setShowAdjustModal(true);
    };

    const openAdjustModal = () => {
        setAdjustInitialLocationId(null);
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
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container storage-location-page">
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Vị trí hàng hóa</h1>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={openAdjustModal}
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
                            viewMode={viewMode}
                            zoneOptions={zoneOptions}
                            aisleOptions={aisleOptions}
                            onKeywordChange={setKeyword}
                            onZoneFilterChange={handleZoneChange}
                            onAisleFilterChange={setAisleFilter}
                            onStatusFilterChange={setStatusFilter}
                            onViewModeChange={setViewMode}
                            onFilter={handleApplyFilters}
                            onReset={handleResetFilters}
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
                                {viewMode === VIEW_MODE.GRID ? (
                                    <StorageLocationGrid
                                        groups={zoneGroups}
                                        onOpenZone={handleOpenZone}
                                    />
                                ) : (
                                    <StorageLocationTable
                                        locations={filteredLocations}
                                        selectedLocationId={selectedLocation?.id ?? null}
                                        onSelectLocation={setSelectedLocation}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>

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
                }}
                locations={locationsData}
                onSaved={handleAdjustSaved}
                initialLocationId={adjustInitialLocationId}
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
