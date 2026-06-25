import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { PRODUCT_ROUTES } from '../../product/constants';
import { INVENTORY_STATUS_LABEL } from '../constants';
import {
    formatCurrency,
    getStockProgress,
    mapInventoryProduct,
} from '../utils/inventoryUtils';

export default function InventoryTable({ items }) {
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <div className="inventory-table-card inventory-table-card--empty">
                <p>Không tìm thấy sản phẩm phù hợp.</p>
            </div>
        );
    }

    return (
        <div className="inventory-table-card">
            <div className="inventory-table-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Mã SP</th>
                            <th>Sản phẩm</th>
                            <th>Danh mục</th>
                            <th>Tình trạng kho</th>
                            <th>Đơn giá</th>
                            <th>Tổng giá trị</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((product) => {
                            const mapped = mapInventoryProduct(product);
                            const { capacity, percent } = getStockProgress(
                                mapped.stock,
                                mapped.minStock,
                            );
                            const isOutOfStock =
                                mapped.inventoryStatus === 'out_of_stock';

                            return (
                                <tr
                                    key={mapped.id}
                                    className={`inventory-table__row${
                                        isOutOfStock ? ' inventory-table__row--danger' : ''
                                    }`}
                                >
                                    <td className="inventory-table__code">{mapped.code}</td>
                                    <td>
                                        <div className="inventory-table__name-cell">
                                            <span className="inventory-table__name">
                                                {mapped.name}
                                            </span>
                                            {mapped.barcode && (
                                                <span className="inventory-table__barcode">
                                                    {mapped.barcode}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="inventory-table__category">{mapped.category}</td>
                                    <td>
                                        <div
                                            className={`inventory-stock-status inventory-stock-status--${mapped.inventoryStatus}`}
                                        >
                                            <div className="inventory-stock-status__header">
                                                <span className="inventory-stock-status__label">
                                                    {
                                                        INVENTORY_STATUS_LABEL[
                                                            mapped.inventoryStatus
                                                        ]
                                                    }
                                                </span>
                                                <span className="inventory-stock-status__count">
                                                    {mapped.stock}/{capacity}
                                                </span>
                                            </div>
                                            <div className="inventory-stock-status__track">
                                                <div
                                                    className="inventory-stock-status__fill"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="inventory-table__price">
                                        {formatCurrency(mapped.importPrice)}
                                    </td>
                                    <td className="inventory-table__value">
                                        {formatCurrency(mapped.inventoryValue)}
                                    </td>
                                    <td className="inventory-table__actions">
                                        <button
                                            type="button"
                                            className="inventory-table__action-btn"
                                            onClick={() =>
                                                navigate(PRODUCT_ROUTES.detail(mapped.id))
                                            }
                                            aria-label={`Xem ${mapped.name}`}
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
