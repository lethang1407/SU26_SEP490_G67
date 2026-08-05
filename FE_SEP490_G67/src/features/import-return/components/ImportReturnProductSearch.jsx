import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { getProductList } from '../../product/api';
import { mapProductForSearch } from '../utils/importReturnUtils';

const SEARCH_DEBOUNCE_MS = 300;

export default function ImportReturnProductSearch({ onSelectProduct, onAddClick }) {
    const [keyword, setKeyword] = useState('');
    const [open, setOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const trimmed = keyword.trim();
        if (!trimmed) {
            setProducts([]);
            return undefined;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const result = await getProductList({
                    keyword: trimmed,
                    page: 0,
                    size: 20,
                });
                setProducts((result.content ?? []).map(mapProductForSearch));
            } catch {
                setProducts([]);
            } finally {
                setLoading(false);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

    const results = useMemo(() => (keyword.trim() ? products : []), [products, keyword]);

    const handleSelect = (product) => {
        onSelectProduct?.(product);
        setKeyword('');
        setOpen(false);
        setProducts([]);
    };

    return (
        <div className="import-return-search-row">
            <div className="import-return-product-search" ref={containerRef}>
                <Search size={18} className="import-return-product-search__icon" />
                <input
                    type="text"
                    className="import-return-product-search__input"
                    placeholder="Nhập tên sản phẩm hoặc mã SKU..."
                    value={keyword}
                    onChange={(event) => {
                        setKeyword(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                />

                {open && keyword.trim() && (
                    <div className="import-return-product-search__dropdown">
                        {loading ? (
                            <p className="import-return-product-search__empty">Đang tìm...</p>
                        ) : results.length === 0 ? (
                            <p className="import-return-product-search__empty">
                                Không tìm thấy sản phẩm.
                            </p>
                        ) : (
                            results.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    className="import-return-product-search__item"
                                    onClick={() => handleSelect(product)}
                                >
                                    <span className="import-return-product-search__item-name">
                                        {product.productName}
                                    </span>
                                    <span className="import-return-product-search__item-meta">
                                        {product.productCode} · {product.unit}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            <button
                type="button"
                className="inventory-btn inventory-btn--primary"
                onClick={() => {
                    if (results[0]) {
                        handleSelect(results[0]);
                        return;
                    }
                    onAddClick?.();
                }}
            >
                <Plus size={18} />
                Thêm sản phẩm
            </button>
        </div>
    );
}
