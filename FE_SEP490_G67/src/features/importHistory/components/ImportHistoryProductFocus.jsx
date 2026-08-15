import { X } from 'lucide-react';
import {
  formatDateTime,
  formatMoney,
  formatMoneyCompact,
  formatQty,
} from '../utils/importHistoryUtils';

export default function ImportHistoryProductFocus({ product, summary, onClear }) {
  if (!product) return null;

  return (
    <section className="ih-card ih-product-focus">
      <div className="ih-product-focus__main">
        <div className="ih-product-focus__thumb" aria-hidden="true">
          📦
        </div>
        <div className="ih-product-focus__meta">
          <div className="ih-product-focus__kicker">Lịch sử nhập theo sản phẩm</div>
          <h2 className="ih-product-focus__title">{product.productName}</h2>
          <div className="ih-product-focus__sku">SKU: {product.sku}</div>
          {summary.lastImportedAt ? (
            <div className="ih-product-focus__last">
              Lần nhập gần nhất: {formatDateTime(summary.lastImportedAt)}
            </div>
          ) : null}
        </div>
        <button type="button" className="ih-product-focus__clear" onClick={onClear}>
          <X size={16} />
          Xem tất cả
        </button>
      </div>

      <div className="ih-product-focus__stats">
        <div className="ih-product-stat">
          <div className="ih-stat__label">Tổng SL đã nhập</div>
          <div className="ih-stat__value">
            {formatQty(summary.totalQty, product.unitName)}
          </div>
        </div>
        <div className="ih-product-stat">
          <div className="ih-stat__label">Số lần / đơn nhập</div>
          <div className="ih-stat__value">{summary.totalOrders} đơn</div>
        </div>
        <div className="ih-product-stat">
          <div className="ih-stat__label">Giá nhập TB</div>
          <div className="ih-stat__value">{formatMoney(summary.avgUnitPrice)}</div>
        </div>
        <div className="ih-product-stat ih-product-stat--accent">
          <div className="ih-stat__label">Tổng chi phí</div>
          <div className="ih-stat__value ih-stat__value--blue">
            {formatMoneyCompact(summary.totalCost)} đ
          </div>
        </div>
      </div>
    </section>
  );
}
