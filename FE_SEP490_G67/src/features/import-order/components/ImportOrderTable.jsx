import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IMPORT_ORDER_ROUTES } from '../constants';
import { formatCurrency, formatDate } from '../utils/importOrderUtils';
import ImportOrderStatusBadge from './ImportOrderStatusBadge';

export default function ImportOrderTable({ items }) {
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <div className="import-order-table-card import-order-table-card--empty">
                <p>Chưa có đơn nhập hàng phù hợp.</p>
            </div>
        );
    }

    return (
        <div className="import-order-table-card">
            <div className="import-order-table-wrapper">
                <table className="import-order-table">
                    <thead>
                        <tr>
                            <th>Mã đơn nhập</th>
                            <th>Thời gian</th>
                            <th>Nhà cung cấp</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th className="import-order-table__actions-col">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className="import-order-table__row">
                                <td className="import-order-table__code">{item.orderCode}</td>
                                <td>{formatDate(item.receivedDate)}</td>
                                <td className="import-order-table__supplier">{item.supplierName}</td>
                                <td className="import-order-table__amount">
                                    {formatCurrency(item.totalCost)}
                                </td>
                                <td>
                                    <ImportOrderStatusBadge status={item.status} />
                                </td>
                                <td className="import-order-table__actions-col">
                                    <button
                                        type="button"
                                        className="import-order-table__view-btn"
                                        title="Xem chi tiết"
                                        onClick={() => navigate(IMPORT_ORDER_ROUTES.detail(item.id))}
                                    >
                                        <Eye size={18} />
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
