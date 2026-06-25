import {
    CATEGORY_OPTIONS,
    STATUS_OPTIONS,
    SUPPLIER_OPTIONS,
} from '../constants';

export default function ProductToolbar({
    keyword,
    categoryFilter,
    statusFilter,
    supplierFilter,
    onKeywordChange,
    onCategoryChange,
    onStatusChange,
    onSupplierChange,
    onFilter,
}) {
    return (
        <div className="product-toolbar">
            <div className="product-toolbar__search">
                <input
                    type="text"
                    className="product-toolbar__search-input"
                    placeholder="Tên sản phẩm, mã SP, mã vạch..."
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                />
            </div>

            <div className="product-toolbar__filters">
                <label className="product-toolbar__filter-group">
                    <span className="product-toolbar__filter-label">Danh mục:</span>
                    <select
                        className="product-toolbar__select"
                        value={categoryFilter}
                        onChange={(event) => onCategoryChange(event.target.value)}
                    >
                        {CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="product-toolbar__filter-group">
                    <span className="product-toolbar__filter-label">Trạng thái:</span>
                    <select
                        className="product-toolbar__select"
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

                <label className="product-toolbar__filter-group">
                    <span className="product-toolbar__filter-label">Nhà cung cấp:</span>
                    <select
                        className="product-toolbar__select"
                        value={supplierFilter}
                        onChange={(event) => onSupplierChange(event.target.value)}
                    >
                        {SUPPLIER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <button type="button" className="product-toolbar__filter-btn" onClick={onFilter}>
                    Lọc
                </button>
            </div>
        </div>
    );
}
