import { MoreVertical } from 'lucide-react';
import ImportHistoryStatusBadge from './ImportHistoryStatusBadge';
import { formatDateTime, formatMoney, formatQty } from '../utils/importHistoryUtils';

export default function ImportHistoryTable({
  items,
  hideProductColumn = false,
  onSelectProduct,
}) {
  if (!items?.length) {
    return (
      <div className="ih-table-card ih-table-card--empty">
        <p>Không có bản ghi nhập hàng phù hợp.</p>
      </div>
    );
  }

  return (
    <div className="ih-table-card">
      <div className="ih-table-wrap">
        <table className="ih-table">
          <thead>
            <tr>
              <th>Mã đơn nhập</th>
              <th>Ngày nhập kho</th>
              {!hideProductColumn ? <th>SKU &amp; Sản phẩm</th> : null}
              <th>Nhà cung cấp</th>
              <th>SL nhập</th>
              <th>Đơn giá</th>
              <th>Tổng tiền</th>
              <th>Nhân viên</th>
              <th>Trạng thái</th>
              <th aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <button type="button" className="ih-link">
                    {row.orderCode}
                  </button>
                </td>
                <td className="ih-table__muted">{formatDateTime(row.importedAt)}</td>
                {!hideProductColumn ? (
                  <td>
                    <button
                      type="button"
                      className="ih-product-cell"
                      onClick={() =>
                        onSelectProduct?.({
                          productId: row.productId,
                          productName: row.productName,
                          sku: row.sku,
                          unitName: row.unitName,
                        })
                      }
                      title="Xem lịch sử theo sản phẩm này"
                    >
                      <span className="ih-product-cell__name">{row.productName}</span>
                      <span className="ih-product-cell__sku">{row.sku}</span>
                    </button>
                  </td>
                ) : null}
                <td>{row.supplierName}</td>
                <td>{formatQty(row.qty, row.unitName)}</td>
                <td>{formatMoney(row.unitPrice)}</td>
                <td className="ih-table__strong">{formatMoney(row.totalAmount)}</td>
                <td>{row.staffName}</td>
                <td>
                  <ImportHistoryStatusBadge status={row.status} />
                </td>
                <td>
                  <button type="button" className="ih-icon-btn" aria-label="Thêm thao tác">
                    <MoreVertical size={16} />
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
