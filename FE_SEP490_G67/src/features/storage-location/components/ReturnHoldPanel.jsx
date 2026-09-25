import { useEffect, useMemo, useState } from 'react';
import { Package, RotateCcw } from 'lucide-react';
import {
    formatCurrency,
    formatDateTime,
    getLineValue,
} from '../utils/storageLocationUtils';
import ReturnHoldActionModal from './ReturnHoldActionModal';
import { RETURN_HOLD_ANCHOR } from '../constants';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function ReturnHoldPanel({
    location,
    locations = [],
    loading = false,
    onProcessed,
}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [actionMode, setActionMode] = useState(null);
    const [actionItem, setActionItem] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const [actionError, setActionError] = useState(null);

    const contents = useMemo(() => {
        const items = [...(location?.contents ?? [])];
        return items.sort((a, b) => {
            const timeA = a.placedAt ? new Date(a.placedAt).getTime() : 0;
            const timeB = b.placedAt ? new Date(b.placedAt).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;
            return String(a.productName ?? '').localeCompare(String(b.productName ?? ''), 'vi');
        });
    }, [location]);

    const totalItems = contents.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
    const totalQty = contents.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
    const totalValue = contents.reduce((sum, item) => sum + getLineValue(item), 0);

    useEffect(() => {
        setPage(1);
    }, [contents, pageSize]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const pagedItems = useMemo(() => {
        const start = (page - 1) * pageSize;
        return contents.slice(start, start + pageSize);
    }, [contents, page, pageSize]);

    const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const endIndex = Math.min(page * pageSize, totalItems);

    const openAction = (mode, item) => {
        setActionMode(mode);
        setActionItem(item);
        setActionError(null);
    };

    const closeAction = () => {
        if (confirming) return;
        setActionMode(null);
        setActionItem(null);
        setActionError(null);
    };

    const handleConfirm = async (payload) => {
        if (!actionMode) return;
        setConfirming(true);
        setActionError(null);
        try {
            await onProcessed?.(actionMode, payload);
            setActionMode(null);
            setActionItem(null);
        } catch (err) {
            setActionError(err?.message || 'Không xử lý được. Thử lại.');
        } finally {
            setConfirming(false);
        }
    };

    return (
        <section id={RETURN_HOLD_ANCHOR} className="storage-return-hold-panel">
            <div className="storage-return-hold-panel__header">
                <div>
                    <h2 className="storage-return-hold-panel__title">
                        <RotateCcw size={18} aria-hidden="true" />
                        Hàng đổi trả từ bán hàng
                    </h2>
                    <p className="storage-return-hold-panel__subtitle">
                        Xử lý hàng đổi/trả khách: đẩy vào kho bán, trả/đổi NCC, hoặc hủy.
                    </p>
                </div>
                <div className="storage-return-hold-panel__summary">
                    <span>{totalQty} SL</span>
                    <span>{formatCurrency(totalValue)}</span>
                </div>
            </div>

            {loading ? (
                <p className="storage-return-hold-panel__empty">Đang tải...</p>
            ) : !location ? (
                <div className="storage-return-hold-panel__empty storage-return-hold-panel__empty--box">
                    <Package size={20} />
                    <span>
                        Chưa có vị trí chứa hàng đổi trả.
                    </span>
                </div>
            ) : totalItems === 0 ? (
                <div className="storage-return-hold-panel__empty storage-return-hold-panel__empty--box">
                    <Package size={20} />
                    <span>Chưa có hàng đổi trả .</span>
                </div>
            ) : (
                <>
                    <div className="storage-return-hold-panel__table-wrap">
                        <table className="storage-return-hold-panel__table">
                            <thead>
                                <tr>
                                    <th className="storage-return-hold-panel__stt">STT</th>
                                    <th>Ngày vào</th>
                                    <th>Sản phẩm</th>
                                    <th>Mã lô</th>
                                    <th>Số lượng</th>
                                    <th>Đơn giá</th>
                                    <th>Giá trị</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedItems.map((item, index) => (
                                    <tr key={item.id ?? `${item.batchId}-${index}`}>
                                        <td className="storage-return-hold-panel__stt">
                                            {startIndex + index}
                                        </td>
                                        <td>{formatDateTime(item.placedAt)}</td>
                                        <td>
                                            <strong>{item.productName || '—'}</strong>
                                            {item.productCode ? (
                                                <span className="storage-return-hold-panel__code">
                                                    {item.productCode}
                                                </span>
                                            ) : null}
                                        </td>
                                        <td>{item.batchCode || '—'}</td>
                                        <td>
                                            {item.quantity ?? 0}
                                            {item.unit ? ` ${item.unit}` : ''}
                                        </td>
                                        <td>{formatCurrency(item.importPrice)}</td>
                                        <td>{formatCurrency(getLineValue(item))}</td>
                                        <td>
                                            <div className="storage-return-hold-panel__actions">
                                                <button
                                                    type="button"
                                                    className="storage-return-hold-panel__action-btn"
                                                    onClick={() => openAction('release', item)}
                                                >
                                                    Đẩy kho
                                                </button>
                                                <button
                                                    type="button"
                                                    className="storage-return-hold-panel__action-btn storage-return-hold-panel__action-btn--primary"
                                                    onClick={() => openAction('supplier', item)}
                                                >
                                                    Đổi/Trả NCC
                                                </button>
                                                <button
                                                    type="button"
                                                    className="storage-return-hold-panel__action-btn storage-return-hold-panel__action-btn--danger"
                                                    onClick={() => openAction('cancel', item)}
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="storage-return-hold-panel__pagination">
                        <div className="storage-return-hold-panel__pagination-info">
                            Hiển thị {startIndex}–{endIndex} / {totalItems} bản ghi
                        </div>
                        <div className="storage-return-hold-panel__pagination-controls">
                            <label className="storage-return-hold-panel__page-size">
                                <span>Số bản ghi/trang</span>
                                <select
                                    value={pageSize}
                                    onChange={(event) =>
                                        setPageSize(Number(event.target.value))
                                    }
                                >
                                    {PAGE_SIZE_OPTIONS.map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                className="storage-return-hold-panel__page-btn"
                                disabled={page <= 1}
                                onClick={() => setPage((prev) => prev - 1)}
                                aria-label="Trang trước"
                            >
                                ‹
                            </button>
                            <span className="storage-return-hold-panel__page-label">
                                Trang {page}/{totalPages}
                            </span>
                            <button
                                type="button"
                                className="storage-return-hold-panel__page-btn"
                                disabled={page >= totalPages}
                                onClick={() => setPage((prev) => prev + 1)}
                                aria-label="Trang sau"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </>
            )}

            <ReturnHoldActionModal
                open={Boolean(actionMode && actionItem)}
                mode={actionMode}
                item={actionItem}
                locations={locations}
                confirming={confirming}
                error={actionError}
                onClose={closeAction}
                onConfirm={handleConfirm}
            />
        </section>
    );
}
