import { Search } from 'lucide-react';
import { IMPORT_HISTORY_FILTER, IMPORT_HISTORY_FILTER_LABEL } from '../constants/mockSupplierDetails';

const FILTER_OPTIONS = [IMPORT_HISTORY_FILTER.ALL, IMPORT_HISTORY_FILTER.DEBT, IMPORT_HISTORY_FILTER.DONE];

export default function SupplierImportHistoryToolbar({ keyword, statusFilter, onKeywordChange, onStatusFilterChange }) {
    return (
        <div className="supplier-toolbar supplier-toolbar--compact">
            <div className="supplier-toolbar__search">
                <Search size={18} className="supplier-toolbar__search-icon" />
                <input
                    type="text"
                    className="supplier-toolbar__search-input"
                    placeholder="Tìm theo mã đơn nhập..."
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                    aria-label="Tìm đơn nhập hàng"
                />
            </div>

            <div className="supplier-toolbar__filters">
                <span className="supplier-toolbar__filter-label">Trạng thái:</span>
                <div className="supplier-toolbar__chips" role="group" aria-label="Lọc theo trạng thái đơn nhập">
                    {FILTER_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={`supplier-toolbar__chip ${
                                statusFilter === option ? 'supplier-toolbar__chip--active' : ''
                            }`}
                            onClick={() => onStatusFilterChange(option)}
                        >
                            {IMPORT_HISTORY_FILTER_LABEL[option]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
