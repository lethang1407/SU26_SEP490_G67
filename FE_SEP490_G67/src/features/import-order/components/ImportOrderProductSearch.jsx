import { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { importOrdersApi } from '../api';
import ProductCreateModal from '../../product/components/ProductCreateModal';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function mapProduct(product) {
    const productUnits = (product.productUnits || []).map((unit) => ({
        id: unit.id,
        name: unit.name,
        unitBase: Number(unit.unitBase) || 1,
    }));
    const baseUnit = productUnits.find((unit) => unit.unitBase === 1) || productUnits[0];
    const lastCostPerBase = Number(product.lastCostPerBase ?? product.costPrice ?? 0) || 0;
    const attributes = product.attributes || [];
    return {
        id: product.id,
        name: product.name,
        parentId: product.parentId ?? null,
        parentName: product.parentName || '',
        attributes,
        code: product.sku || product.barcode || `SP${String(product.id).padStart(6, '0')}`,
        barcode: product.barcode || '',
        productUnits,
        unit: baseUnit?.name || 'Cái',
        lastCostPerBase,
        sellingPrice: Number(product.sellingPrice) || 0,
        // Gợi ý theo ĐVT cơ bản; createLine sẽ nhân unitBase
        importPrice: lastCostPerBase,
    };
}

export default function ImportOrderProductSearch({ onSelect }) {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
                const data = await importOrdersApi.searchProducts(trimmed);
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

    const handleProductCreated = (createdProduct) => {
        if (!createdProduct) return;
        const mapped = mapProduct({
            ...createdProduct,
            productUnits: createdProduct.units || createdProduct.productUnits || [
                { id: Date.now(), name: createdProduct.baseUnitName || 'Chai', unitBase: 1 },
            ],
        });
        onSelect?.(mapped);
    };

    const showDropdown = open && keyword.trim().length >= MIN_QUERY_LENGTH;

    return (
        <div className="ioc-search-row">
            <div className="ioc-search" ref={wrapRef}>
                <Search size={18} className="ioc-search__icon" />
                <input
                    type="text"
                    className="ioc-search__input"
                    placeholder="Tìm hàng hóa theo mã hoặc tên..."
                    value={keyword}
                    onChange={(event) => {
                        setKeyword(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    aria-label="Tìm sản phẩm nhập hàng"
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
                                            <span className="ioc-search__item-meta">{product.code}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            <button
                type="button"
                className="ioc-search-add"
                onClick={() => setIsModalOpen(true)}
                title="Thêm hàng hóa mới"
                aria-label="Thêm hàng hóa mới"
            >
                <Plus size={20} />
            </button>

            <ProductCreateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onProductCreated={handleProductCreated}
            />
        </div>
    );
}
