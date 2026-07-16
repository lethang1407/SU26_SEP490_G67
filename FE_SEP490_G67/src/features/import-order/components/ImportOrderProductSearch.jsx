import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { getProductList } from '../../product/api';
import { mapProductForSearch, searchProducts } from '../utils/importOrderUtils';

const SEARCH_DEBOUNCE_MS = 300;

export default function ImportOrderProductSearch({ onSelectProduct }) {
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
                const mapped = (result.content ?? []).map(mapProductForSearch);
                setProducts(searchProducts(mapped, trimmed).length ? mapped : mapped);
            } catch {
                setProducts([]);
            } finally {
                setLoading(false);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

    const results = useMemo(() => {
        if (!keyword.trim()) {
            return [];
        }
        return products;
    }, [products, keyword]);

    const handleSelect = (product) => {
        onSelectProduct?.(product);
        setKeyword('');
        setOpen(false);
        setProducts([]);
    };

    return (
        <div className="import-order-product-search" ref={containerRef}>
            <Search size={18} className="import-order-product-search__icon" />
            <input
                type="text"
                className="import-order-product-search__input"
                placeholder="Tìm sản phẩm theo tên, mã SKU hoặc barcode..."
                value={keyword}
                onChange={(event) => {
                    setKeyword(event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
            />

            {open && keyword.trim() && (
                <div className="import-order-product-search__dropdown">
                    {loading ? (
                        <p className="import-order-product-search__empty">Đang tìm sản phẩm...</p>
                    ) : results.length === 0 ? (
                        <p className="import-order-product-search__empty">Không tìm thấy sản phẩm.</p>
                    ) : (
                        results.map((product) => (
                            <button
                                key={product.id}
                                type="button"
                                className="import-order-product-search__item"
                                onClick={() => handleSelect(product)}
                            >
                                <span className="import-order-product-search__item-name">
                                    {product.productName}
                                </span>
                                <span className="import-order-product-search__item-meta">
                                    {product.productCode} · {product.barcode || '—'} · {product.unit}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
