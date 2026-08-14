import { Package } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/storageLocationUtils';

export default function UnplacedBatchesPanel({
    batches = [],
    loading = false,
    onPlaceBatch,
}) {
    return (
        <section className="storage-unplaced-panel">
            <div className="storage-unplaced-panel__header">
                <div>
                    <h2 className="storage-unplaced-panel__title">Lô chưa xếp kệ</h2>
                    <p className="storage-unplaced-panel__subtitle">
                        Các lô còn số lượng chưa nằm trong ô kệ nào
                    </p>
                </div>
            </div>

            {loading ? (
                <p className="storage-unplaced-panel__empty">Đang tải danh sách lô...</p>
            ) : batches.length === 0 ? (
                <div className="storage-unplaced-panel__empty storage-unplaced-panel__empty--box">
                    <Package size={20} />
                    <span>Không còn lô chưa xếp kệ.</span>
                </div>
            ) : (
                <div className="storage-unplaced-panel__table-wrap">
                    <table className="storage-unplaced-panel__table">
                        <thead>
                            <tr>
                                <th className="storage-unplaced-panel__stt">STT</th>
                                <th>Mã lô</th>
                                <th>Sản phẩm</th>
                                <th>Số lượng</th>
                                <th>HSD</th>
                                <th>Giá nhập</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map((batch, index) => (
                                <tr key={batch.id ?? batch.batchId}>
                                    <td className="storage-unplaced-panel__stt">{index + 1}</td>
                                    <td>
                                        <strong>{batch.batchCode || '—'}</strong>
                                        {batch.productCode ? (
                                            <span className="storage-unplaced-panel__code">
                                                {batch.productCode}
                                            </span>
                                        ) : null}
                                    </td>
                                    <td>{batch.productName || '—'}</td>
                                    <td>
                                        {batch.quantity ?? 0}
                                        {batch.unit ? ` ${batch.unit}` : ''}
                                    </td>
                                    <td>{formatDate(batch.expiryDate)}</td>
                                    <td>{formatCurrency(batch.importPrice)}</td>
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
            )}
        </section>
    );
}
