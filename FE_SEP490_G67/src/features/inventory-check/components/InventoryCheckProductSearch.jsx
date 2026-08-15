import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { searchProductsForCheck } from '../api';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function mapProduct(product) {
    const baseUnit = (product.productUnits || []).find(
        (unit) => unit.unitBase != null && Number(unit.unitBase) === 1,
    );
    return {
        id: product.id,
        name: product.name,
        code: product.barcode || `SP${String(product.id).padStart(5, '0')}`,
        barcode: product.barcode || '',
        unit: baseUnit?.name || 'Cái',
    };
}

export default function InventoryCheckProductSearch({
    onSelect,
    placeholder = 'Tìm tên hàng hóa để thêm vào phiếu kiểm...',
}) {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const requestIdRef = useRef(0);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const trimmed = keyword.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) {
            setResults([]);
            setError('');
            setLoading(false);
            return undefined;
        }

        const currentRequestId = ++requestIdRef.current;
        setLoading(true);
        setError('');

        const timer = setTimeout(async () => {
            try {
                const data = await searchProductsForCheck(trimmed);
                if (currentRequestId !== requestIdRef.current) return;
                setResults((data || []).map(mapProduct));
            } catch {
                if (currentRequestId !== requestIdRef.current) return;
                setResults([]);
                setError('Không thể tải sản phẩm. Vui lòng thử lại.');
            } finally {
                if (currentRequestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [keyword]);

    const handleSelect = (product) => {
        onSelect?.(product);
        setKeyword('');
        setResults([]);
        setOpen(false);
    };

    const showDropdown = open && keyword.trim().length >= MIN_QUERY_LENGTH;

    return (
        <div className="ioc-search-row">
            <div className="ioc-search" ref={wrapRef}>
                <Search size={18} className="ioc-search__icon" />
                <input
                    type="text"
                    className="ioc-search__input"
                    placeholder={placeholder}
                    value={keyword}
                    onChange={(event) => {
                        setKeyword(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    aria-label="Tìm sản phẩm"
                />

                {showDropdown && (
                    <div className="ioc-search__dropdown">
                        {loading ? (
                            <div className="ioc-search__empty">Đang tìm...</div>
                        ) : error ? (
                            <div className="ioc-search__empty">{error}</div>
                        ) : results.length === 0 ? (
                            <div className="ioc-search__empty">Không tìm thấy sản phẩm phù hợp</div>
                        ) : (
                            <ul className="ioc-search__list">
                                {results.map((product) => (
                                    <li key={product.id}>
                                        <button
                                            type="button"
                                            className="ioc-search__item"
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                handleSelect(product);
                                            }}
                                        >
                                            <span className="ioc-search__item-name">{product.name}</span>
                                            <span className="ioc-search__item-meta">
                                                {product.code}
                                                {product.barcode ? ` · ${product.barcode}` : ''}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
