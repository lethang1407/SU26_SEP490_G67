import { formatCurrency } from '../utils/salesOrderUtils';

export default function SalesOrderItemsTable({ items = [] }) {
    if (!items.length) {
        return (
            <div className="supplier-table-card supplier-table-card--empty">
                <p>Đơn hàng không có sản phẩm.</p>
            </div>
        );
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);

    return (
        <div className="supplier-table-card">
            <div className="supplier-table-wrapper">
                <table className="supplier-table sales-order-items-table">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Sản phẩm</th>
                            <th>ĐVT</th>
                            <th className="text-right">SL</th>
                            <th className="text-right">Đơn giá</th>
                            <th className="text-right">Giảm</th>
                            <th className="text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={`${item.productId}-${index}`}>
                                <td>{index + 1}</td>
                                <td>{item.name}</td>
                                <td>{item.unitName || '—'}</td>
                                <td className="text-right">{item.quantity ?? 0}</td>
                                <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                                <td className="text-right">{formatCurrency(item.discountAmount)}</td>
                                <td className="text-right">{formatCurrency(item.lineTotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={6} className="text-right">
                                <strong>Tổng dòng</strong>
                            </td>
                            <td className="text-right">
                                <strong>{formatCurrency(subtotal)}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
