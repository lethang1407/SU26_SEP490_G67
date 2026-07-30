import { LayoutGrid, List, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { LOCATION_STATUS_OPTIONS, VIEW_MODE } from '../constants';

export default function StorageLocationToolbar({
    keyword,
    zoneFilter,
    aisleFilter,
    statusFilter,
    viewMode,
    zoneOptions,
    aisleOptions,
    onKeywordChange,
    onZoneFilterChange,
    onAisleFilterChange,
    onStatusFilterChange,
    onViewModeChange,
    onFilter,
    onReset,
}) {
    return (
        <div className="storage-location-toolbar">
            <div className="storage-location-toolbar__row">
                <div className="storage-location-toolbar__search">
                    <Search size={18} className="storage-location-toolbar__search-icon" />
                    <input
                        type="text"
                        className="storage-location-toolbar__search-input"
                        placeholder="Tìm theo sản phẩm, số lô..."
                        value={keyword}
                        onChange={(event) => onKeywordChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                onFilter();
                            }
                        }}
                    />
                </div>

                <div className="storage-location-toolbar__filters">
                    <select
                        className="storage-location-toolbar__select"
                        value={zoneFilter}
                        onChange={(event) => onZoneFilterChange(event.target.value)}
                    >
                        {zoneOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className="storage-location-toolbar__select"
                        value={aisleFilter}
                        onChange={(event) => onAisleFilterChange(event.target.value)}
                    >
                        {aisleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className="storage-location-toolbar__select"
                        value={statusFilter}
                        onChange={(event) => onStatusFilterChange(event.target.value)}
                    >
                        {LOCATION_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className="storage-location-toolbar__filter-btn"
                        onClick={onFilter}
                        aria-label="Lọc"
                    >
                        <SlidersHorizontal size={18} />
                    </button>

                    <button
                        type="button"
                        className="storage-location-toolbar__reset-btn"
                        onClick={onReset}
                        aria-label="Đặt lại"
                    >
                        <RotateCcw size={16} />
                        Tải lại
                    </button>
                </div>
            </div>

            <div className="storage-location-toolbar__view-toggle">
                <span className="storage-location-toolbar__view-label">Chế độ xem:</span>
                <button
                    type="button"
                    className={`storage-location-toolbar__view-btn${viewMode === VIEW_MODE.GRID ? ' storage-location-toolbar__view-btn--active' : ''}`}
                    onClick={() => onViewModeChange(VIEW_MODE.GRID)}
                >
                    <LayoutGrid size={16} />
                    Lưới kệ
                </button>
                <button
                    type="button"
                    className={`storage-location-toolbar__view-btn${viewMode === VIEW_MODE.LIST ? ' storage-location-toolbar__view-btn--active' : ''}`}
                    onClick={() => onViewModeChange(VIEW_MODE.LIST)}
                >
                    <List size={16} />
                    Danh sách
                </button>
            </div>
        </div>
    );
}
