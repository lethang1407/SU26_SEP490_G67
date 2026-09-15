import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RevenuePagination from './RevenuePagination';
import { paymentMethodLabel } from '../api';
import {
  formatCount,
  formatMoney,
  formatSignedMoney,
  formatVnDate,
} from '../utils/revenueReportUtils';

const STATUS_TONE = {
  COMPLETED: 'sold',
  PARTIALLY_RETURNED: 'returned',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
  DEBT: 'debt',
};

const STATUS_LABEL = {
  COMPLETED: 'Đã bán',
  PARTIALLY_RETURNED: 'Trả một phần',
  RETURNED: 'Hoàn trả',
  CANCELLED: 'Đã hủy',
  DEBT: 'Ghi nợ',
};

const SOURCE_TONE = {
  'Phiếu bán': 'sale',
  'Phiếu đổi': 'exchange',
  'Phiếu trả': 'return',
};

const PAYMENT_TONE = {
  TRANSFER: 'transfer',
  CASH: 'cash',
  DEBT: 'debt',
};

/** Cột cố định độ rộng để các trang không xô lệch nhau khi dữ liệu dài ngắn khác nhau. */
const COLUMNS = [
  { key: 'source', label: 'Nguồn', width: 96 },
  { key: 'code', label: 'Số phiếu', width: 140 },
  { key: 'status', label: 'Tình trạng', width: 116, align: 'center' },
  { key: 'date', label: 'Ngày bán', width: 104, align: 'center' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'staff', label: 'NV bán hàng' },
  { key: 'payment', label: 'PTTT', width: 124, align: 'center' },
  { key: 'total', label: 'Tổng tiền', width: 128, align: 'num' },
  { key: 'discount', label: 'Giảm giá', width: 116, align: 'num' },
  { key: 'net', label: 'Thành tiền', width: 132, align: 'num' },
];

const ALIGN_CLASS = { center: 'rr-table_center', num: 'rr-table_num' };

function MoneyCell({ value }) {
  const n = Number(value || 0);
  if (!n) return <span className="rr-muted">0 đ</span>;
  return (
    <span className={n < 0 ? 'rr-money--negative' : undefined}>
      {n < 0 ? formatSignedMoney(n) : formatMoney(n)}
    </span>
  );
}

/** Giảm giá luôn là khoản trừ: hiện dấu trừ, không có thì gạch ngang để cột gọn. */
function DiscountCell({ value }) {
  const n = Math.abs(Number(value || 0));
  if (!n) return <span className="rr-muted">—</span>;
  return <span className="rr-money--discount">{formatSignedMoney(-n)}</span>;
}

export default function RevenueTransactionsTable({
  rows,
  totalItems,
  totalPages,
  page,
  pageSize,
  keyword,
  onKeywordChange,
  onPageChange,
  loading,
}) {
  const navigate = useNavigate();
  const items = rows ?? [];

  const openOrder = (row) => {
    if (!row.orderId) return;
    navigate(`/admin/orders/${row.orderId}`);
  };

  return (
    <section className="rr-card">
      <header className="rr-card_head">
        <div className="rr-card_head-left">
          <h2 className="rr-card_title">Chi tiết giao dịch phát sinh</h2>
          <span className="rr-chip">{formatCount(totalItems)} giao dịch</span>
        </div>
        <div className="rr-search">
          <Search size={15} className="rr-search_icon" />
          <input
            type="search"
            className="rr-search_input"
            placeholder="Tìm số phiếu, khách hàng…"
            value={keyword}
            onChange={(event) => onKeywordChange?.(event.target.value)}
            aria-label="Tìm giao dịch"
          />
        </div>
      </header>

      <div className="rr-table-wrap">
        <table className="rr-table rr-table--tx">
          <colgroup>
            {COLUMNS.map((col) => (
              <col key={col.key} style={col.width ? { width: col.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className={ALIGN_CLASS[col.align]}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="rr-table_empty">
                  {loading ? 'Đang tải giao dịch…' : 'Không có giao dịch nào trong kỳ đã chọn.'}
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const status = String(row.orderStatus || '').toUpperCase();
                const sourceTone = SOURCE_TONE[row.source] ?? 'sale';
                const paymentKey = String(row.paymentMethod || '').toUpperCase();
                return (
                  <tr
                    // Phiếu trả mang orderId của đơn gốc, nên phải kèm số phiếu để key không trùng.
                    key={`${row.source}-${row.orderCode}-${row.orderId}`}
                    className="rr-table_row"
                    onClick={() => openOrder(row)}
                  >
                    <td>
                      <span className={`rr-source rr-source--${sourceTone}`}>{row.source}</span>
                    </td>
                    <td className="rr-table_code rr-table_mono">{row.orderCode || 'N/A'}</td>
                    <td className="rr-table_center">
                      <span className={`rr-badge rr-badge--${STATUS_TONE[status] || 'cancelled'}`}>
                        {STATUS_LABEL[status] || row.orderStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="rr-table_center">{formatVnDate(row.createdAt)}</td>
                    <td className="rr-table_ellipsis" title={row.customerName || 'Khách lẻ'}>
                      {row.customerName || 'Khách lẻ'}
                    </td>
                    <td className="rr-table_ellipsis" title={row.staffName || 'N/A'}>
                      {row.staffName || 'N/A'}
                    </td>
                    <td className="rr-table_center">
                      <span className={`rr-pm rr-pm--${PAYMENT_TONE[paymentKey] || 'other'}`}>
                        {paymentMethodLabel(row.paymentMethod)}
                      </span>
                    </td>
                    <td className="rr-table_num">
                      <MoneyCell value={row.totalAmount} />
                    </td>
                    <td className="rr-table_num">
                      <DiscountCell value={row.discountAmount} />
                    </td>
                    <td className="rr-table_num rr-table_num--strong">
                      <MoneyCell value={row.netAmount} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <RevenuePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={onPageChange}
        disabled={loading}
      />
    </section>
  );
}
