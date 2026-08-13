import { Search } from 'lucide-react';

export default function SupplierToolbar({
    keyword,
    categoryId,
    categories = [],
    categoriesLoading = false,
    onKeywordChange,
    onCategoryChange,
}) {
    return (
        <div className="supplier-toolbar">
            <div className="supplier-toolbar__search">
                <Search size={20} className="supplier-toolbar__search-icon" />
                <input
                    type="text"
                    className="supplier-toolbar__search-input"
                    placeholder="Tìm theo tên hoặc số điện thoại"
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                    aria-label="Tìm nhà cung cấp"
                />
            </div>

            <div className="supplier-toolbar__filters">
                <label className="supplier-toolbar__filter-label" htmlFor="supplier-category-filter">
                    Danh mục:
                </label>
                <select
                    id="supplier-category-filter"
                    className="supplier-toolbar__select"
                    value={categoryId ?? ''}
                    onChange={(event) => {
                        const value = event.target.value;
                        onCategoryChange(value === '' ? null : Number(value));
                    }}
                    disabled={categoriesLoading}
                    aria-label="Lọc theo danh mục"
                >
                    <option value="">Tất cả danh mục</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
