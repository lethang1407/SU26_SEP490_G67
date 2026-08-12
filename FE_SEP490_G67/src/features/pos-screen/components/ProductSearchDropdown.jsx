import { useEffect, useRef } from 'react';
import { Loader2, PackageSearch } from 'lucide-react';

export default function ProductSearchDropdown({ results, loading, error, onSelect, onClose }) {
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                onClose?.();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="product-search-dropdown" ref={ref}>
            {loading && (
                <div className="psd-state-row">
                    <Loader2 size={16} className="psd-spinner" />
                    <span>Đang tìm kiếm...</span>
                </div>
            )}

            {!loading && error && (
                <div className="psd-state-row psd-error">
                    {error}
                </div>
            )}

            {!loading && !error && results.length === 0 && (
                <div className="psd-state-row psd-empty">
                    <PackageSearch size={16} />
                    <span>Không tìm thấy sản phẩm phù hợp</span>
                </div>
            )}

            {!loading && !error && results.length > 0 && (
                <ul className="psd-list">
                    {results.map((product) => (
                        <li
                            key={product.id}
                            className="psd-item"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelect(product);
                            }}
                        >
                            <div className="psd-item-name">{product.name}</div>
                            <div className="psd-item-meta">
                                {product.barcode && (
                                    <span className="psd-barcode">{product.barcode}</span>
                                )}
                                {/* Tồn kho để thu ngân biết còn hàng hay không trước khi thêm */}
                                <span className={`psd-stock${Number(product.stockQuantity ?? 0) <= 0 ? ' psd-stock--empty' : ''}`}>
                                    Tồn kho: {Number(product.stockQuantity ?? 0).toLocaleString('vi-VN')}
                                </span>
                                <span className="psd-price">
                                    {product.sellingPrice != null
                                        ? Number(product.sellingPrice).toLocaleString() + ' ₫'
                                        : '—'}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
