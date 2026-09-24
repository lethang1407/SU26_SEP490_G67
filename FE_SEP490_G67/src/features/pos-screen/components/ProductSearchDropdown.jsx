import { useEffect, useRef } from 'react';
import { Ban, Loader2, PackageSearch } from 'lucide-react';
import ProductThumb from './ProductThumb';
import { displayStock, isUnsellable, UNSELLABLE_HINT } from '../utils/productStock';

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
                    {results.map((product) => {
                        const blocked = isUnsellable(product);
                        const stock = displayStock(product);
                        return (
                            <li
                                key={product.id}
                                className={`psd-item${blocked ? ' psd-item--blocked' : ''}`}
                                title={blocked ? UNSELLABLE_HINT : undefined}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    if (blocked) return;
                                    onSelect(product);
                                }}
                            >
                                <ProductThumb url={product.imageUrl} alt={product.name} size={40} />
                                <div className="psd-item-body">
                                <div className="psd-item-name">
                                    {product.name}
                                    {blocked && <Ban size={13} className="psd-blocked-icon" />}
                                </div>
                                <div className="psd-item-meta">
                                    {product.barcode && (
                                        <span className="psd-barcode">{product.barcode}</span>
                                    )}
                                    {/* Tồn bán được, không phải lượng nhập — xem utils/productStock */}
                                    <span className={`psd-stock${stock <= 0 ? ' psd-stock--empty' : ''}`}>
                                        Tồn kho: {stock.toLocaleString('vi-VN')}
                                    </span>
                                    {blocked && (
                                        <span className="psd-debt-summary">Chưa xếp vị trí kho</span>
                                    )}
                                </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
