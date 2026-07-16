import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getStorageLocations } from '../api/mockData';
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
    const allLocations = useMemo(() => getStorageLocations(), []);

    const [keyword, setKeyword] = useState('');
    const [zoneFilter, setZoneFilter] = useState('all');
    const [aisleFilter, setAisleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState(LOCATION_STATUS.ALL);
    const [viewMode, setViewMode] = useState(VIEW_MODE.GRID);
    const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
    const [selectedLocation, setSelectedLocation] = useState(null);

    const summary = useMemo(() => buildLocationSummary(allLocations), [allLocations]);

    const zoneOptions = useMemo(() => getZoneOptions(allLocations), [allLocations]);
    const aisleOptions = useMemo(
        () => getAisleOptions(allLocations, appliedFilters.zoneFilter),
        [allLocations, appliedFilters.zoneFilter],
    );

    const filteredLocations = useMemo(
        () => filterStorageLocations(allLocations, appliedFilters),
        [allLocations, appliedFilters],
    );

    const zoneGroups = useMemo(
        () => groupLocationsByZone(filteredLocations),
        [filteredLocations],
    );

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
                                    Tra cứu vị trí kệ và hàng hóa đang lưu.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    
                                >
                                    <Download size={18} />
                                    Xuất danh sách
                                </button>
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--primary"
                                    onClick={() =>
                                        window.alert('Chức năng thêm vị trí đang được phát triển.')
                                    }
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
                    </div>
                </main>
            </div>

            <StorageLocationDetailDrawer
                location={selectedLocation}
                onClose={() => setSelectedLocation(null)}
                onCheckLocation={handleCheckLocation}
                onViewInventory={handleViewInventory}
            />
        </div>
    );
}
