import {
    IMPORT_ORDER_STATUS_LABEL,
    IMPORT_PAYMENT_LABEL,
} from '../constants/mockSupplierDetails';
import { formatCurrency, formatDate } from '../utils/supplierUtils';

export default function SupplierImportHistoryTable({ items }) {
    if (!items?.length) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Chưa có lịch sử nhập hàng.</p>
            </div>
        );
    }

    return (
        <div className="supplier-table-card">
            <div className="supplier-table-wrapper">
                <table className="supplier-table supplier-table--detail">
                    <thead>
                        <tr>
                            <th>Mã đơn</th>
                            <th>Ngày nhập</th>
                            <th>Loại</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((order) => (
                            <tr key={order.id}>
                                <td className="supplier-table__code-text">{order.orderCode}</td>
                                <td>{formatDate(order.receivedDate)}</td>
                                <td>{IMPORT_PAYMENT_LABEL[order.paymentType] || order.paymentType}</td>
                                <td className="supplier-table__debt">{formatCurrency(order.totalCost)}</td>
                                <td>
                                    <span
                                        className={`supplier-import-status supplier-import-status--${order.status?.toLowerCase()}`}
                                    >
                                        {IMPORT_ORDER_STATUS_LABEL[order.status] || order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
