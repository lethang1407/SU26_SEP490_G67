import { Calendar, Search, SlidersHorizontal } from 'lucide-react';
import { DATE_FILTER_OPTIONS, IMPORT_ORDER_STATUS_OPTIONS } from '../constants';

export default function ImportOrderToolbar({
    keyword,
    dateFilter,
    statusFilter,
    onKeywordChange,
    onDateFilterChange,
    onStatusFilterChange,
    onFilter,
}) {
    return (
        <div className="import-order-toolbar">
            <div className="import-order-toolbar__search">
                <Search size={18} className="import-order-toolbar__search-icon" />
                <input
                    type="text"
                    className="import-order-toolbar__search-input"
                    placeholder="Tìm theo mã đơn, nhà cung cấp..."
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            onFilter();
                        }
                    }}
                />
            </div>

            <div className="import-order-toolbar__filters">
                <label className="import-order-toolbar__select-wrap">
                    <Calendar size={16} className="import-order-toolbar__select-icon" />
                    <select
                        className="import-order-toolbar__select"
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

                <label className="import-order-toolbar__select-wrap">
                    <select
                        className="import-order-toolbar__select"
                        value={statusFilter}
                        onChange={(event) => onStatusFilterChange(event.target.value)}
                    >
                        {IMPORT_ORDER_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <button
                    type="button"
                    className="import-order-toolbar__filter-btn"
                    onClick={onFilter}
                    aria-label="Lọc"
                >
                    <SlidersHorizontal size={18} />
                </button>
            </div>
        </div>
    );
}
