import { Search } from 'lucide-react';
import { SUPPLIER_DEBT_FILTER } from '../constants';

const DEBT_FILTER_OPTIONS = [
    { value: SUPPLIER_DEBT_FILTER.ALL, label: 'Tất cả' },
    { value: SUPPLIER_DEBT_FILTER.NO_DEBT, label: 'Không nợ' },
    { value: SUPPLIER_DEBT_FILTER.HAS_DEBT, label: 'Còn nợ' },
];

export default function SupplierToolbar({ keyword, debtFilter, onKeywordChange, onDebtFilterChange }) {
    return (
        <div className="supplier-toolbar">
            <div className="supplier-toolbar__search">
                <Search size={20} className="supplier-toolbar__search-icon" />
                <input
                    type="text"
                    className="supplier-toolbar__search-input"
                    placeholder="Tìm theo tên hoặc mã nhà cung cấp..."
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                    aria-label="Tìm nhà cung cấp"
                />
            </div>

            <div className="supplier-toolbar__filters">
                <span className="supplier-toolbar__filter-label">Lọc theo nợ:</span>
                <div className="supplier-toolbar__chips" role="group" aria-label="Lọc theo nợ nhà cung cấp">
                    {DEBT_FILTER_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`supplier-toolbar__chip ${
                                debtFilter === option.value ? 'supplier-toolbar__chip--active' : ''
                            }`}
                            onClick={() => onDebtFilterChange(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
