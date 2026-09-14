import { Search } from 'lucide-react';
import { LOCATION_STATUS_OPTIONS } from '../constants';

export default function StorageLocationToolbar({
    keyword,
    zoneFilter,
    aisleFilter,
    statusFilter,
    zoneOptions,
    aisleOptions,
    searchSuggestions = [],
    searchOpen = false,
    searchLoading = false,
    onKeywordChange,
    onZoneFilterChange,
    onAisleFilterChange,
    onStatusFilterChange,
    onFilter,
    onSelectSuggestion,
    onSearchFocus,
    onSearchBlur,
    searchWrapRef,
}) {
    const showDropdown = searchOpen && keyword.trim().length >= 1;

    return (
        <div className="storage-location-toolbar">
            <div className="storage-location-toolbar__row">
                <div className="storage-location-toolbar__search" ref={searchWrapRef}>
                    <Search size={18} className="storage-location-toolbar__search-icon" />
                    <input
                        type="text"
                        className="storage-location-toolbar__search-input"
                        placeholder="Tìm theo sản phẩm, số lô..."
                        value={keyword}
                        onChange={(event) => onKeywordChange(event.target.value)}
                        onFocus={onSearchFocus}
                        onBlur={onSearchBlur}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                onFilter();
                            }
                        }}
                        aria-label="Tìm sản phẩm hoặc số lô"
                        autoComplete="off"
                    />

                    {showDropdown ? (
                        <div className="storage-location-toolbar__dropdown">
                            {searchLoading ? (
                                <div className="storage-location-toolbar__dropdown-empty">
                                    Đang tìm...
                                </div>
                            ) : searchSuggestions.length === 0 ? (
                                <div className="storage-location-toolbar__dropdown-empty">
                                    Không tìm thấy ô kệ chứa sản phẩm / lô này
                                </div>
                            ) : (
                                <ul className="storage-location-toolbar__dropdown-list">
                                    {searchSuggestions.map((item) => (
                                        <li key={`${item.location.id}-${item.batchCode || item.productName}`}>
                                            <button
                                                type="button"
                                                className="storage-location-toolbar__dropdown-item"
                                                onMouseDown={(event) => {
                                                    event.preventDefault();
                                                    onSelectSuggestion?.(item);
                                                }}
                                            >
                                                <span className="storage-location-toolbar__dropdown-label">
                                                    {item.location.label}
                                                </span>
                                                <span className="storage-location-toolbar__dropdown-meta">
                                                    {item.productName}
                                                    {item.batchCode ? ` · ${item.batchCode}` : ''}
                                                    {item.quantity != null
                                                        ? ` · SL ${item.quantity}`
                                                        : ''}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ) : null}
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
                        Lọc
                    </button>
                </div>
            </div>
        </div>
    );
}
