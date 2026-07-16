import { Trash2 } from 'lucide-react';
import {
    computeLineTotal,
    formatCurrency,
    getAvailableLocationsForProduct,
} from '../utils/importOrderUtils';

export default function ImportOrderLineTable({
    lines,
    locations = [],
    editable = false,
    onQuantityChange,
    onCostChange,
    onExpiryChange,
    onLocationChange,
    onRemoveLine,
}) {
    if (lines.length === 0) {
        return (
            <div className="import-order-line-card import-order-line-card--empty">
                <p>Chưa có sản phẩm nào được chọn.</p>
                <span>Hãy tìm kiếm sản phẩm ở thanh công cụ phía trên.</span>
            </div>
        );
    }

    return (
        <div className="import-order-line-card">
            <div className="import-order-line-card__header">
                <div>
                    <h2 className="import-order-line-card__title">Nhập hàng</h2>
                    <p className="import-order-line-card__subtitle">
                        Mỗi dòng tương ứng một lô mới. Cùng sản phẩm nhưng HSD khác nhau cần tách
                        thành nhiều dòng.
                    </p>
                </div>
                {editable && (
                    <button
                        type="button"
                        className="inventory-btn inventory-btn--secondary inventory-btn--sm"
                        onClick={() => window.alert('Chức năng nhập từ Excel đang phát triển.')}
                    >
                        Nhập từ Excel
                    </button>
                )}
            </div>

            <div className="import-order-line-table-wrapper">
                <table className="import-order-line-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Sản phẩm</th>
                            <th>SL</th>
                            <th>Đơn giá</th>
                            <th>HSD</th>
                            <th>Vị trí kệ</th>
                            <th>Thành tiền</th>
                            {editable && <th />}
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, index) => {
                            const locationOptions = getAvailableLocationsForProduct(
                                locations,
                                line.productCode,
                            );

                            return (
                                <tr key={line.id}>
                                    <td>{index + 1}</td>
                                    <td className="import-order-line-table__product">
                                        <span className="import-order-line-table__product-name">
                                            {line.productName}
                                        </span>
                                        <span className="import-order-line-table__product-meta">
                                            {line.productCode} · {line.unit}
                                            {line.batchCode ? ` · ${line.batchCode}` : ''}
                                        </span>
                                    </td>
                                    <td>
                                        {editable ? (
                                            <input
                                                type="number"
                                                min="1"
                                                className="import-order-line-table__input import-order-line-table__input--qty"
                                                value={line.quantity}
                                                onChange={(event) =>
                                                    onQuantityChange?.(line.id, event.target.value)
                                                }
                                            />
                                        ) : (
                                            line.quantity
                                        )}
                                    </td>
                                    <td>
                                        {editable ? (
                                            <input
                                                type="number"
                                                min="0"
                                                className="import-order-line-table__input import-order-line-table__input--price"
                                                value={line.costPerUnit}
                                                onChange={(event) =>
                                                    onCostChange?.(line.id, event.target.value)
                                                }
                                            />
                                        ) : (
                                            formatCurrency(line.costPerUnit)
                                        )}
                                    </td>
                                    <td>
                                        {editable ? (
                                            line.hasExpiry !== false ? (
                                                <input
                                                    type="date"
                                                    className="import-order-line-table__input import-order-line-table__input--date"
                                                    value={line.expiryDate || ''}
                                                    onChange={(event) =>
                                                        onExpiryChange?.(line.id, event.target.value)
                                                    }
                                                />
                                            ) : (
                                                <span className="import-order-line-table__na">—</span>
                                            )
                                        ) : (
                                            line.expiryDate || '—'
                                        )}
                                    </td>
                                    <td>
                                        {editable ? (
                                            <select
                                                className="import-order-line-table__select"
                                                value={line.locationId || ''}
                                                onChange={(event) => {
                                                    const locationId = event.target.value;
                                                    const selected = locations.find(
                                                        (item) => String(item.id) === locationId,
                                                    );
                                                    onLocationChange?.(
                                                        line.id,
                                                        locationId,
                                                        selected?.label || '',
                                                    );
                                                }}
                                            >
                                                <option value="">Chưa xếp kệ</option>
                                                {locationOptions.map((location) => (
                                                    <option key={location.id} value={location.id}>
                                                        {location.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            line.locationLabel || 'Chưa xếp kệ'
                                        )}
                                    </td>
                                    <td className="import-order-line-table__total">
                                        {formatCurrency(computeLineTotal(line))}
                                    </td>
                                    {editable && (
                                        <td>
                                            <button
                                                type="button"
                                                className="import-order-line-table__remove"
                                                title="Xóa dòng"
                                                onClick={() => onRemoveLine?.(line.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
