import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { suppliersApi } from '../api';

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
    const productRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (productRef.current && !productRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
