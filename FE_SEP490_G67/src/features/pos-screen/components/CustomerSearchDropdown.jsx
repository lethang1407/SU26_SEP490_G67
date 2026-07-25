import { useEffect, useRef } from 'react';
import { Loader2, UserX, UserPlus } from 'lucide-react';

export default function CustomerSearchDropdown({ results, loading, error, onSelect, onAddNew, onClose }) {
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
                <div
                    className="psd-state-row psd-empty"
                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                    onMouseDown={(e) => { e.preventDefault(); onAddNew?.(); }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserX size={16} />
                        Không tìm thấy khách hàng phù hợp
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: 500 }}>
                        <UserPlus size={14} /> Thêm mới
                    </span>
                </div>
            )}

            {!loading && !error && results.length > 0 && (
                <ul className="psd-list">
                    {results.map((cust) => (
                        <li
                            key={cust.id}
                            className="psd-item"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelect(cust);
                            }}
                        >
                            <div className="psd-item-name">{cust.fullName}</div>
                            <div className="psd-item-meta">
                                <span className="psd-barcode">{cust.phoneNumber}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
