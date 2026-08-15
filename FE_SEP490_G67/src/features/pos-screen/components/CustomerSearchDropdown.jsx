import { useEffect, useRef } from 'react';
import { Loader2, UserPlus, Ban } from 'lucide-react';
import {
    debtLevelMeta, canSellOnDebt, debtSummaryText, debtBlockReason,
} from '../utils/debtStatus';

export default function CustomerSearchDropdown({
    results, loading, error, onSelect, onAddNew, onClose, debtMode = false,
}) {
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
                        Không tìm thấy khách hàng phù hợp
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: 500 }}>
                        <UserPlus size={14} /> Thêm mới
                    </span>
                </div>
            )}

            {!loading && !error && results.length > 0 && (
                <ul className="psd-list">
                    {results.map((cust) => {
                        const meta = debtLevelMeta(cust);
                        const blocked = debtMode && !canSellOnDebt(cust);
                        const summary = debtSummaryText(cust);
                        return (
                            <li
                                key={cust.id}
                                className={`psd-item${blocked ? ' psd-item--blocked' : ''}`}
                                title={blocked ? debtBlockReason(cust) : undefined}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    if (blocked) return;
                                    onSelect(cust);
                                }}
                            >
                                <div className="psd-item-name">
                                    <span className={`debt-dot ${meta.cls}`} title={meta.label} />
                                    {cust.fullName}
                                    {blocked && <Ban size={13} className="psd-blocked-icon" />}
                                </div>
                                <div className="psd-item-meta">
                                    <span className="psd-barcode">{cust.phoneNumber}</span>
                                    {summary && <span className="psd-debt-summary">{summary}</span>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
