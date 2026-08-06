import { Package, Trash2 } from 'lucide-react';
import { computeLineTotal, formatCurrency } from '../utils/importReturnUtils';

export default function ImportReturnLineTable({
    lines,
    onQuantityChange,
    onPriceChange,
    onRemoveLine,
}) {
    if (lines.length === 0) {
        return (
            <div className="import-return-line-card import-return-line-card--empty">
                <Package size={36} />
                <p>Chưa có sản phẩm nào được chọn. Hãy tìm kiếm ở thanh công cụ phía trên</p>
            </div>
        );
    }

    return (
        <div className="import-return-line-card">
            <div className="import-return-line-table-wrap">
                <table className="import-return-line-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Sản phẩm</th>
                            <th>SL Trả</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, index) => (
                            <tr key={line.id}>
                                <td>{index + 1}</td>
                                <td>
                                    <div className="import-return-line-product">
                                        <strong>{line.productName}</strong>
                                        <span>
                                            {line.productCode} · {line.unit}
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        min="1"
                                        className="import-return-line-input"
                                        value={line.quantity}
                                        onChange={(event) =>
                                            onQuantityChange(line.id, event.target.value)
                                        }
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        min="0"
                                        className="import-return-line-input"
                                        value={line.returnPrice}
                                        onChange={(event) =>
                                            onPriceChange(line.id, event.target.value)
                                        }
                                    />
                                </td>
                                <td>{formatCurrency(computeLineTotal(line))}</td>
                                <td>
                                    <button
                                        type="button"
                                        className="import-return-line-remove"
                                        onClick={() => onRemoveLine(line.id)}
                                        aria-label="Xóa dòng"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
