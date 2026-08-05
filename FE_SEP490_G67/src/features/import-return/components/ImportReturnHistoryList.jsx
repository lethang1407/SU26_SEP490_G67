import { formatCurrency, formatDateTime } from '../utils/importReturnUtils';

export default function ImportReturnHistoryList({ items, loading }) {
    return (
        <section className="import-return-history">
            <header className="import-return-history__header">
                <h2 className="import-return-history__title">Đơn hàng đã trả</h2>
                <p className="import-return-history__subtitle">
                    Danh sách các phiếu trả hàng nhập đã hoàn tất
                </p>
            </header>

            {loading ? (
                <p className="import-return-history__empty">Đang tải danh sách...</p>
            ) : items.length === 0 ? (
                <p className="import-return-history__empty">Chưa có đơn trả hàng nào.</p>
            ) : (
                <div className="import-return-history__table-wrap">
                    <table className="import-return-history__table">
                        <thead>
                            <tr>
                                <th>Mã phiếu</th>
                                <th>Nhà cung cấp</th>
                                <th>Số SP</th>
                                <th>Tổng SL</th>
                                <th>Giá trị hoàn</th>
                                <th>Thời gian</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td className="import-return-history__code">
                                        {item.returnCode}
                                    </td>
                                    <td>{item.supplierName || '—'}</td>
                                    <td>{item.itemCount ?? item.items?.length ?? '—'}</td>
                                    <td>{item.totalQuantity ?? '—'}</td>
                                    <td>{formatCurrency(item.totalRefund)}</td>
                                    <td>{formatDateTime(item.createdAt)}</td>
                                    <td className="import-return-history__note">
                                        {item.note || '—'}
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
