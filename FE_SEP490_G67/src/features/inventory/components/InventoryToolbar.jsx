import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { categoriesApi } from '../../category/api';
import { CATEGORY_FILTER, INVENTORY_STATUS_OPTIONS } from '../constants';

export default function InventoryToolbar({
    keyword,
    categoryFilter,
    statusFilter,
    onKeywordChange,
    onCategoryChange,
    onStatusChange,
    onFilter,
}) {
    const [categoryOptions, setCategoryOptions] = useState([
        { value: CATEGORY_FILTER.ALL, label: 'Tất cả danh mục' },
    ]);

    useEffect(() => {
        let isCancelled = false;

        categoriesApi
            .getAllCategories()
            .then((items) => {
                if (!isCancelled && items.length > 0) {
                    setCategoryOptions([
                        { value: CATEGORY_FILTER.ALL, label: 'Tất cả danh mục' },
                        ...items.map((item) => ({ value: item.name, label: item.name })),
                    ]);
                }
            })
            .catch(() => {});

        return () => {
            isCancelled = true;
        };
    }, []);

    return (
        <div className="inventory-toolbar">
            <div className="inventory-toolbar__search">
                <input
                    type="text"
                    className="inventory-toolbar__search-input"
                    placeholder="Tìm theo tên hoặc mã sản phẩm (VD: SP001)..."
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            onFilter();
                        }
                    }}
                />
            </div>

            <div className="inventory-toolbar__filters">
                <select
                    className="inventory-toolbar__select"
                    value={categoryFilter}
                    onChange={(event) => onCategoryChange(event.target.value)}
                >
                    {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <select
                    className="inventory-toolbar__select"
                    value={statusFilter}
                    onChange={(event) => onStatusChange(event.target.value)}
                >
                    {INVENTORY_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    className="inventory-toolbar__filter-btn"
                    onClick={onFilter}
                    aria-label="Lọc"
                >
                    <SlidersHorizontal size={18} />
                </button>
            </div>
        </div>
    );
}
