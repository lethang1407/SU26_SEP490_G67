import { Search } from 'lucide-react';
import { ORDER_STATUS_FILTER, ORDER_STATUS_FILTER_LABEL } from '../constants';

const STATUS_FILTER_OPTIONS = [
    ORDER_STATUS_FILTER.ALL,
    ORDER_STATUS_FILTER.DRAFT,
    ORDER_STATUS_FILTER.IMPORTED,
];

export default function ImportOrderToolbar({
    keyword,
    orderStatusFilter,
    onKeywordChange,
    onOrderStatusFilterChange,
}) {
    return (
        <div className="supplier-toolbar">
            <div className="supplier-toolbar__search">
                <Search size={20} className="supplier-toolbar__search-icon" />
                <input
                    type="text"
                    className="supplier-toolbar__search-input"
                    placeholder="Tìm theo mã nhập hàng, mã NCC hoặc tên nhà cung cấp..."
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                    aria-label="Tìm đơn nhập hàng"
                />
            </div>

            <div className="supplier-toolbar__filters">
                <span className="supplier-toolbar__filter-label">Trạng thái:</span>
                <div className="supplier-toolbar__chips" role="group" aria-label="Lọc theo trạng thái đơn nhập">
                    {STATUS_FILTER_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={`supplier-toolbar__chip ${
                                orderStatusFilter === option ? 'supplier-toolbar__chip--active' : ''
                            }`}
                            onClick={() => onOrderStatusFilterChange(option)}
                        >
                            {ORDER_STATUS_FILTER_LABEL[option]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
