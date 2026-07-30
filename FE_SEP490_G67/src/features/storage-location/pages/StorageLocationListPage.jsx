import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import { Plus, Settings2 } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import AdjustStorageLocationModal from '../components/AdjustStorageLocationModal';
import { fetchStorageLocations } from '../api';
import CreateStorageLocationModal from '../components/CreateStorageLocationModal';
import StorageLocationDetailDrawer from '../components/StorageLocationDetailDrawer';
import StorageLocationGrid from '../components/StorageLocationGrid';
import StorageLocationTable from '../components/StorageLocationTable';
import StorageLocationToolbar from '../components/StorageLocationToolbar';
import { INVENTORY_CHECK_ROUTES } from '../../inventory-check/constants';
import { LOCATION_STATUS, VIEW_MODE } from '../constants';
import {
    filterStorageLocations,
    getAisleOptions,
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
    const navigate = useNavigate();
    const [allLocations, setAllLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [keyword, setKeyword] = useState('');
    const [zoneFilter, setZoneFilter] = useState('all');
    const [aisleFilter, setAisleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState(LOCATION_STATUS.ALL);
    const [viewMode, setViewMode] = useState(VIEW_MODE.GRID);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [draftLocations, setDraftLocations] = useState(null);
    const [expandedZones, setExpandedZones] = useState(() => new Set());

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
        () => getAisleOptions(locationsData, appliedFilters.zoneFilter),
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
        if (zoneGroups.length === 0) {
            return;
        }

        setExpandedZones((prev) => {
            const next = new Set();
            const hasActiveFilter =
                appliedFilters.zoneFilter !== 'all' ||
                appliedFilters.aisleFilter !== 'all' ||
                appliedFilters.statusFilter !== 'all' ||
                Boolean(appliedFilters.keyword?.trim());

            if (hasActiveFilter) {
                zoneGroups.forEach((group) => next.add(group.zone));
            } else {
                zoneGroups.forEach((group) => {
                    if (prev.has(group.zone)) {
                        next.add(group.zone);
                    }
                });
            }

            const prevList = [...prev].sort().join(',');
            const nextList = [...next].sort().join(',');
            return prevList === nextList ? prev : next;
        });
    }, [zoneGroups, appliedFilters]);

    const handleToggleZone = (zone) => {
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

    const handleCheckLocation = (location) => {
        navigate(`${INVENTORY_CHECK_ROUTES.create}?location=${encodeURIComponent(location.label)}`);
    };

    const handleAdjustLocation = (location) => {
        setSelectedLocation(null);
        setShowAdjustModal(true);
    };

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div
                        className={`dashboard-container storage-location-page${selectedLocation ? ' storage-location-page--drawer-open' : ''}`}
                    >
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Vị trí hàng hóa</h1>
                                <p className="inventory-page__subtitle">
                                    Xem sức chứa theo khu trước, rồi mở khu cần xếp hàng. Ô lớn /
                                    vừa / nhỏ phản ánh khả năng chứa khác nhau trên sơ đồ kho.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => setShowAdjustModal(true)}
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
                                        selectedLocationId={selectedLocation?.id ?? null}
                                        onSelectLocation={setSelectedLocation}
                                        expandedZones={expandedZones}
                                        onToggleZone={handleToggleZone}
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

            <StorageLocationDetailDrawer
                location={selectedLocation}
                onClose={() => setSelectedLocation(null)}
                onCheckLocation={handleCheckLocation}
                onAdjustLocation={handleAdjustLocation}
            />

            <CreateStorageLocationModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                onSuccess={handleLocationCreated}
                existingZones={existingZones}
            />

            <AdjustStorageLocationModal
                show={showAdjustModal}
                onHide={() => setShowAdjustModal(false)}
                locations={locationsData}
                onSaved={handleAdjustSaved}
            />
        </div>
    );
}
