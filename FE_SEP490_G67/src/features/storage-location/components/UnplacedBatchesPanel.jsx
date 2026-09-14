import { useEffect, useMemo, useState } from 'react';
import { Package, Search } from 'lucide-react';
import { formatDate } from '../utils/storageLocationUtils';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function UnplacedBatchesPanel({
    batches = [],
    loading = false,
    onPlaceBatch,
}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [keyword, setKeyword] = useState('');

    const filteredBatches = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return batches;
        return batches.filter((batch) => {
            const name = String(batch.productName || '').toLowerCase();
            const code = String(batch.productCode || '').toLowerCase();
            const batchCode = String(batch.batchCode || '').toLowerCase();
            return name.includes(q) || code.includes(q) || batchCode.includes(q);
        });
    }, [batches, keyword]);

    const totalItems = filteredBatches.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);

    useEffect(() => {
        setPage(1);
    }, [filteredBatches, pageSize, keyword]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const pagedBatches = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredBatches.slice(start, start + pageSize);
    }, [filteredBatches, page, pageSize]);

    const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
    const endIndex = Math.min(page * pageSize, totalItems);

    return (
        <section className="storage-unplaced-panel">
            <div className="storage-unplaced-panel__header">
                <div>
                    <h2 className="storage-unplaced-panel__title">Hàng hóa chưa sắp xếp</h2>
                    <p className="storage-unplaced-panel__subtitle">
                        Các hàng hóa còn số lượng chưa nằm trong ô kệ nào
                    </p>
                </div>
                <div className="storage-unplaced-panel__search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Tìm theo tên sản phẩm, số lô..."
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <p className="storage-unplaced-panel__empty">Đang tải danh sách...</p>
            ) : batches.length === 0 ? (
                <div className="storage-unplaced-panel__empty storage-unplaced-panel__empty--box">
                    <Package size={20} />
                    <span>Không còn hàng hóa chưa sắp xếp.</span>
                </div>
            ) : filteredBatches.length === 0 ? (
                <div className="storage-unplaced-panel__empty storage-unplaced-panel__empty--box">
                    <Package size={20} />
                    <span>Không tìm thấy hàng khớp từ khóa.</span>
                </div>
            ) : (
                <>
                    <div className="storage-unplaced-panel__table-wrap">
                        <table className="storage-unplaced-panel__table">
                            <thead>
                                <tr>
                                    <th className="storage-unplaced-panel__stt">STT</th>
                                    <th>Sản phẩm</th>
                                    <th>Mã lô</th>
                                    <th>Số lượng</th>
                                    <th>HSD</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {pagedBatches.map((batch, index) => (
                                    <tr key={batch.id ?? batch.batchId}>
                                        <td className="storage-unplaced-panel__stt">
                                            {startIndex + index}
                                        </td>
                                        <td>
                                            <strong>{batch.productName || '—'}</strong>
                                            {batch.productCode ? (
                                                <span className="storage-unplaced-panel__code">
                                                    {batch.productCode}
                                                </span>
                                            ) : null}
                                        </td>
                                        <td>{batch.batchCode || '—'}</td>
                                        <td>
                                            {batch.quantity ?? 0}
                                            {batch.unit ? ` ${batch.unit}` : ''}
                                        </td>
                                        <td>{formatDate(batch.expiryDate)}</td>
                                        <td className="storage-unplaced-panel__action">
                                            {onPlaceBatch ? (
                                                <button
                                                    type="button"
                                                    className="inventory-btn inventory-btn--secondary storage-unplaced-panel__btn"
                                                    onClick={() => onPlaceBatch(batch)}
                                                >
                                                    Xếp kệ
                                                </button>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="storage-unplaced-panel__pagination">
                        <div className="storage-unplaced-panel__pagination-info">
                            Hiển thị {startIndex}–{endIndex} / {totalItems} bản ghi
                        </div>
                        <div className="storage-unplaced-panel__pagination-controls">
                            <label className="storage-unplaced-panel__page-size">
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
                                className="storage-unplaced-panel__page-btn"
                                disabled={page <= 1}
                                onClick={() => setPage((prev) => prev - 1)}
                                aria-label="Trang trước"
                            >
                                ‹
                            </button>
                            <span className="storage-unplaced-panel__page-label">
                                Trang {page}/{totalPages}
                            </span>
                            <button
                                type="button"
                                className="storage-unplaced-panel__page-btn"
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
        </section>
    );
}
