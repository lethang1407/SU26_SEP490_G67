import { Filter, Search } from 'lucide-react';
import { SUPPLIER_STATUS_FILTER } from '../constants';

const STATUS_OPTIONS = [
    { value: SUPPLIER_STATUS_FILTER.ALL, label: 'Tất cả trạng thái' },
    { value: SUPPLIER_STATUS_FILTER.ACTIVE, label: 'Đang giao dịch' },
    { value: SUPPLIER_STATUS_FILTER.HAS_DEBT, label: 'Có công nợ' },
    { value: SUPPLIER_STATUS_FILTER.PAUSED, label: 'Tạm dừng' },
];

export default function SupplierToolbar({ keyword, statusFilter, onKeywordChange, onStatusChange }) {
    return (
        <div className="supplier-toolbar">
            <div className="supplier-toolbar__search">
                <Search size={18} className="supplier-toolbar__search-icon" />
                <input
                    type="text"
                    className="supplier-toolbar__search-input"
                    placeholder="Tìm theo tên hoặc mã nhà cung cấp..."
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                />
            </div>

            <div className="supplier-toolbar__filters">
                <label className="supplier-toolbar__filter-group">
                    <span className="supplier-toolbar__filter-label">Trạng thái:</span>
                    <select
                        className="supplier-toolbar__select"
                        value={statusFilter}
                        onChange={(event) => onStatusChange(event.target.value)}
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <button type="button" className="supplier-toolbar__filter-btn" disabled title="Sắp có">
                    <Filter size={16} />
                    Lọc thêm
                </button>
            </div>
        </div>
    );
}
