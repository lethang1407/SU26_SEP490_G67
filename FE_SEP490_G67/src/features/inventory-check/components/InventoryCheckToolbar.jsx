import { Calendar, Search, SlidersHorizontal } from 'lucide-react';
import { CHECK_STATUS_OPTIONS, DATE_FILTER_OPTIONS } from '../constants';

export default function InventoryCheckToolbar({
    keyword,
    dateFilter,
    statusFilter,
    onKeywordChange,
    onDateFilterChange,
    onStatusFilterChange,
    onFilter,
}) {
    return (
        <div className="inventory-check-toolbar">
            <div className="inventory-check-toolbar__search">
                <Search size={18} className="inventory-check-toolbar__search-icon" />
                <input
                    type="text"
                    className="inventory-check-toolbar__search-input"
                    placeholder="Tìm theo mã phiếu, ghi chú..."
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            onFilter();
                        }
                    }}
                />
            </div>

            <div className="inventory-check-toolbar__filters">
                <label className="inventory-check-toolbar__select-wrap">
                    <Calendar size={16} className="inventory-check-toolbar__select-icon" />
                    <select
                        className="inventory-check-toolbar__select"
                        value={dateFilter}
                        onChange={(event) => onDateFilterChange(event.target.value)}
                    >
                        {DATE_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="inventory-check-toolbar__select-wrap">
                    <select
                        className="inventory-check-toolbar__select"
                        value={statusFilter}
                        onChange={(event) => onStatusFilterChange(event.target.value)}
                    >
                        {CHECK_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <button
                    type="button"
                    className="inventory-check-toolbar__filter-btn"
                    onClick={onFilter}
                    aria-label="Lọc"
                >
                    <SlidersHorizontal size={18} />
                </button>
            </div>
        </div>
    );
}
