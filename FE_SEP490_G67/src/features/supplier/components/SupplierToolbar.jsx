import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { suppliersApi } from '../api';
import { removeVietnameseTones } from '../utils/supplierUtils';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function productDisplayName(product) {
    return product.parentName || product.name || '';
}

function productAttributeLabel(product) {
    return (product.attributes || [])
        .filter((item) => item?.name && item?.value)
        .map((item) => `${item.name} ${item.value}`)
        .join(' · ');
}

export default function SupplierToolbar({
    supplierKeyword = '',
    selectedProduct,
    categoryId,
    categories = [],
    categoriesLoading = false,
    onKeywordChange,
    onSelectProduct,
    onClearProduct,
    onCategoryChange,
}) {
    const [productKeyword, setProductKeyword] = useState('');
    const [products, setProducts] = useState([]);
    const [productLoading, setProductLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
    const productRef = useRef(null);
    const categoryRef = useRef(null);
    const categorySearchRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (productRef.current && !productRef.current.contains(event.target)) {
                setOpen(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target)) {
                setCategoryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!categoryOpen) return undefined;
        categorySearchRef.current?.focus();

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setCategoryOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [categoryOpen]);

    useEffect(() => {
        if (selectedProduct) {
            setProductKeyword('');
            setProducts([]);
            setOpen(false);
            setProductLoading(false);
        }
    }, [selectedProduct]);

    useEffect(() => {
        if (selectedProduct) return undefined;

        const trimmed = productKeyword.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) {
            setProducts([]);
            setProductLoading(false);
            return undefined;
        }

        const currentRequestId = ++requestIdRef.current;
        setProductLoading(true);

        const timer = setTimeout(async () => {
            try {
                const productResults = await suppliersApi.searchProducts(trimmed);
                if (currentRequestId !== requestIdRef.current) return;
                const nextProducts = Array.isArray(productResults) ? productResults.slice(0, 8) : [];
                setProducts(nextProducts);
                setOpen(true);
            } catch {
                if (currentRequestId !== requestIdRef.current) return;
                setProducts([]);
                setOpen(true);
            } finally {
                if (currentRequestId === requestIdRef.current) {
                    setProductLoading(false);
                }
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [productKeyword, selectedProduct]);

    const showProductDropdown =
        open && !selectedProduct && productKeyword.trim().length >= MIN_QUERY_LENGTH;

    const selectedCategory = useMemo(
        () => categories.find((category) => category.id === categoryId) || null,
        [categories, categoryId],
    );

    const filteredCategories = useMemo(() => {
        const keyword = removeVietnameseTones(categorySearch);
        if (!keyword) return categories;
        return categories.filter((category) =>
            removeVietnameseTones(category.name).includes(keyword),
        );
    }, [categories, categorySearch]);

    const handleSelectCategory = (nextCategoryId) => {
        onCategoryChange?.(nextCategoryId);
        setCategoryOpen(false);
        setCategorySearch('');
    };

    return (
        <div className="supplier-toolbar">
            <div className="supplier-toolbar__fields">
                <div className="supplier-toolbar__search">
                    <Search size={20} className="supplier-toolbar__search-icon" />
                    <input
                        type="text"
                        className="supplier-toolbar__search-input"
                        placeholder="Tìm theo tên nhà cung cấp"
                        value={supplierKeyword}
                        onChange={(event) => onKeywordChange?.(event.target.value)}
                        aria-label="Tìm nhà cung cấp theo tên"
                    />
                </div>

                <div className="supplier-toolbar__search" ref={productRef}>
                    {selectedProduct ? (
                        <div className="supplier-toolbar__chip">
                            <Search size={18} className="supplier-toolbar__chip-icon" />
                            <span className="supplier-toolbar__chip-text" title={selectedProduct.name}>
                                {selectedProduct.name}
                            </span>
                            <button
                                type="button"
                                className="supplier-toolbar__chip-clear"
                                onClick={onClearProduct}
                                aria-label="Bỏ lọc sản phẩm"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Search size={20} className="supplier-toolbar__search-icon" />
                            <input
                                type="text"
                                className="supplier-toolbar__search-input"
                                placeholder="Lọc theo sản phẩm đã nhập"
                                value={productKeyword}
                                onChange={(event) => {
                                    setProductKeyword(event.target.value);
                                    setOpen(true);
                                }}
                                onFocus={() => {
                                    if (productKeyword.trim().length >= MIN_QUERY_LENGTH) {
                                        setOpen(true);
                                    }
                                }}
                                aria-label="Lọc nhà cung cấp theo sản phẩm"
                            />
                        </>
                    )}

                    {showProductDropdown && (
                        <div className="supplier-toolbar__dropdown">
                            {productLoading ? (
                                <div className="supplier-toolbar__empty">Đang tìm sản phẩm...</div>
                            ) : products.length === 0 ? (
                                <div className="supplier-toolbar__empty">Không tìm thấy sản phẩm phù hợp</div>
                            ) : (
                                <ul className="supplier-toolbar__list">
                                    {products.map((product) => {
                                        const name = productDisplayName(product);
                                        const attrs = productAttributeLabel(product);
                                        return (
                                            <li key={product.id}>
                                                <button
                                                    type="button"
                                                    className="supplier-toolbar__item"
                                                    onMouseDown={(event) => {
                                                        event.preventDefault();
                                                        onSelectProduct?.({
                                                            id: product.id,
                                                            name: attrs ? `${name} (${attrs})` : name,
                                                        });
                                                    }}
                                                >
                                                    <span className="supplier-toolbar__item-name">{name}</span>
                                                    {attrs ? (
                                                        <span className="supplier-toolbar__item-attrs">
                                                            {attrs}
                                                        </span>
                                                    ) : null}
                                                    <span className="supplier-toolbar__item-meta">
                                                        {product.sku || product.barcode || ''}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="supplier-toolbar__filters">
                <span className="supplier-toolbar__filter-label" id="supplier-category-filter-label">
                    Danh mục:
                </span>
                <div className="supplier-dropdown supplier-toolbar__category-dropdown" ref={categoryRef}>
                    <button
                        type="button"
                        id="supplier-category-filter"
                        className="supplier-dropdown__trigger"
                        onClick={() => {
                            if (categoriesLoading) return;
                            setCategoryOpen((prev) => {
                                const next = !prev;
                                if (!next) setCategorySearch('');
                                return next;
                            });
                        }}
                        disabled={categoriesLoading}
                        aria-haspopup="listbox"
                        aria-expanded={categoryOpen}
                        aria-labelledby="supplier-category-filter-label"
                    >
                        <span className="supplier-dropdown__value">
                            {categoriesLoading
                                ? 'Đang tải danh mục...'
                                : selectedCategory?.name || 'Tất cả danh mục'}
                        </span>
                        <ChevronDown
                            size={18}
                            className={`supplier-dropdown__icon ${
                                categoryOpen ? 'supplier-dropdown__icon--open' : ''
                            }`}
                        />
                    </button>

                    {categoryOpen && (
                        <div className="supplier-dropdown__menu" role="listbox">
                            <div className="supplier-dropdown__search">
                                <input
                                    ref={categorySearchRef}
                                    type="text"
                                    className="supplier-dropdown__search-input"
                                    placeholder="Tìm danh mục..."
                                    value={categorySearch}
                                    onChange={(event) => setCategorySearch(event.target.value)}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label="Tìm danh mục"
                                />
                                <Search size={16} className="supplier-dropdown__search-icon" />
                            </div>

                            <div className="supplier-dropdown__list">
                                <button
                                    type="button"
                                    className={`supplier-dropdown__item ${
                                        categoryId == null ? 'supplier-dropdown__item--active' : ''
                                    }`}
                                    onClick={() => handleSelectCategory(null)}
                                >
                                    Tất cả danh mục
                                </button>
                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map((category) => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            className={`supplier-dropdown__item ${
                                                categoryId === category.id
                                                    ? 'supplier-dropdown__item--active'
                                                    : ''
                                            }`}
                                            onClick={() => handleSelectCategory(category.id)}
                                        >
                                            {category.name}
                                        </button>
                                    ))
                                ) : (
                                    <div className="supplier-dropdown__empty">
                                        {categorySearch.trim()
                                            ? 'Không tìm thấy danh mục phù hợp'
                                            : 'Chưa có danh mục'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
