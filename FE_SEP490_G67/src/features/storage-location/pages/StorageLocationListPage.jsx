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
import StorageLocationSummaryCards from '../components/StorageLocationSummaryCards';
import StorageLocationTable from '../components/StorageLocationTable';
import StorageLocationToolbar from '../components/StorageLocationToolbar';
import { INVENTORY_CHECK_ROUTES } from '../../inventory-check/constants';
import { INVENTORY_ROUTES } from '../../inventory/constants';
import { LOCATION_STATUS, VIEW_MODE } from '../constants';
import {
    buildLocationSummary,
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
    const [successMessage, setSuccessMessage] = useState(null);
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

    const summary = useMemo(() => buildLocationSummary(locationsData), [locationsData]);

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

    const existingZones = useMemo(
        () => [...new Set(locationsData.map((location) => location.zone).filter(Boolean))],
        [locationsData],
    );

    const handleLocationCreated = (createdLocation) => {
        setSuccessMessage(`Đã thêm vị trí ${createdLocation?.label ?? ''} thành công.`);
        setReloadKey((prev) => prev + 1);
        setSelectedLocation(createdLocation ?? null);
    };

    const handleAdjustSaved = () => {
        setShowAdjustModal(false);
        setDraftLocations(null);
        setSuccessMessage('Đã cập nhật vị trí lô hàng.');
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

    const handleStatFilter = (status) => {
        setStatusFilter(status);
        setAppliedFilters((prev) => ({
            ...prev,
            statusFilter: status,
        }));
    };

    const handleCheckLocation = (location) => {
        navigate(`${INVENTORY_CHECK_ROUTES.create}?location=${encodeURIComponent(location.label)}`);
    };

    const handleViewInventory = (location) => {
        const product = location.contents?.[0];
        if (product?.productName) {
            navigate(`${INVENTORY_ROUTES.list}?keyword=${encodeURIComponent(product.productName)}`);
            return;
        }
        navigate(INVENTORY_ROUTES.list);
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
                                <h1 className="inventory-page__title">Vị trí kệ hàng</h1>
                                <p className="inventory-page__subtitle">
                                    Tra cứu vị trí kệ và hàng hóa đang lưu. Mỗi kệ chỉ chứa một
                                    loại sản phẩm, có thể có nhiều lô cùng SP.
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

                        <StorageLocationSummaryCards
                            summary={summary}
                            onFilterStatus={handleStatFilter}
                        />

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

                        {successMessage && (
                            <Alert
                                variant="success"
                                dismissible
                                onClose={() => setSuccessMessage(null)}
                            >
                                {successMessage}
                            </Alert>
                        )}

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
                onViewInventory={handleViewInventory}
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
