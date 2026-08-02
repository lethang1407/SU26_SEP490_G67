import { X } from 'lucide-react';

export default function BatchSelectModal({ product, onSelect, onClose }) {
    if (!product) return null;

    const batches = product.stockBatches ?? [];

    return (
        <div className="batch-modal-overlay" onClick={onClose}>
            <div className="batch-modal" onClick={(e) => e.stopPropagation()}>
                <div className="batch-modal-header">
                    <div>
                        <div className="batch-modal-title">Chọn lô hàng</div>
                        <div className="batch-modal-subtitle">{product.name}</div>
                    </div>
                    <button className="batch-modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {batches.length === 0 ? (
                    <div className="batch-modal-empty">Không có lô hàng khả dụng.</div>
                ) : (
                    <table className="batch-modal-table">
                        <thead>
                            <tr>
                                <th>Mã lô</th>
                                <th className="text-right">Tồn kho</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map((b) => (
                                <tr
                                    key={b.id}
                                    className="batch-modal-row"
                                    onClick={() => onSelect(b.id)}
                                >
                                    <td>
                                        <span className="batch-cell">{b.batchCode ?? b.id}</span>
                                    </td>
                                    <td className="text-right">
                                        {b.quantity.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
