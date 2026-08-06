import { useNavigate } from 'react-router-dom';
import { INVENTORY_CHECK_ROUTES } from '../constants';
import { formatDateTime } from '../utils/inventoryCheckUtils';
import InventoryCheckStatusBadge from './InventoryCheckStatusBadge';

export default function InventoryCheckTable({ items }) {
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <div className="inventory-check-table-card inventory-check-table-card--empty">
                <p>Chưa có phiếu kiểm kho phù hợp.</p>
            </div>
        );
    }

    return (
        <div className="inventory-check-table-card">
            <div className="inventory-check-table-wrapper">
                <table className="inventory-check-table">
                    <thead>
                        <tr>
                            <th>Mã phiếu</th>
                            <th>Ngày kiểm</th>
                            <th>Người kiểm</th>
                            <th>Ghi chú</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                className="inventory-check-table__row"
                                onClick={() => navigate(INVENTORY_CHECK_ROUTES.detail(item.id))}
                            >
                                <td className="inventory-check-table__code">{item.code}</td>
                                <td>{formatDateTime(item.checkDate)}</td>
                                <td>{item.checker}</td>
                                <td className="inventory-check-table__note">{item.note || '—'}</td>
                                <td>
                                    <InventoryCheckStatusBadge status={item.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
