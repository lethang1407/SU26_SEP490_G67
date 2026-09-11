import { useState } from 'react';
import { formatMoney, formatQty } from '../utils/warehouseReportUtils';
import ProductMovementsModal from './ProductMovementsModal';

function QtyCell({ value, tone }) {
  const n = Number(value || 0);
  if (!n) return <span className="wr-muted">—</span>;
  return <span className={tone ? `wr-col--${tone}` : undefined}>{formatQty(n)}</span>;
}

function MoneyCell({ value, tone }) {
  const n = Number(value || 0);
  if (!n) return <span className="wr-muted">—</span>;
  return <span className={tone ? `wr-col--${tone}` : undefined}>{formatMoney(n)}</span>;
}

function MetricCells({
  openingQty,
  openingAmount,
  importQty,
  importAmount,
  exportQty,
  exportAmount,
  closingQty,
  closingAmount,
}) {
  return (
    <>
      <td className="wr-td--opening wr-col-start wr-td--num">
        <QtyCell value={openingQty} tone="opening" />
      </td>
      <td className="wr-td--opening wr-td--num wr-td--money">
        <MoneyCell value={openingAmount} tone="opening" />
      </td>
      <td className="wr-td--import wr-col-start wr-td--num">
        <QtyCell value={importQty} tone="import" />
      </td>
      <td className="wr-td--import wr-td--num wr-td--money">
        <MoneyCell value={importAmount} tone="import" />
      </td>
      <td className="wr-td--export wr-col-start wr-td--num">
        <QtyCell value={exportQty} tone="export" />
      </td>
      <td className="wr-td--export wr-td--num wr-td--money">
        <MoneyCell value={exportAmount} tone="export" />
      </td>
      <td className="wr-td--closing wr-col-start wr-td--num">
        <QtyCell value={closingQty} tone="closing" />
      </td>
      <td className="wr-td--closing wr-td--num wr-td--money">
        <MoneyCell value={closingAmount} tone="closing" />
      </td>
    </>
  );
}

function ProductGroupRow({ product, index, onOpen }) {
  return (
    <tr className="wr-table__group" onClick={() => onOpen(product)}>
      <td className="wr-table__index-cell">
        <span className="wr-table__index">{index}</span>
      </td>
      <td className="wr-td--product">
        <div className="wr-table__product">
          {product.sku ? (
            <strong className="wr-table__product-sku">{product.sku}</strong>
          ) : null}
          <span className="wr-table__product-name">{product.productName}</span>
        </div>
      </td>
      <td className="wr-td--unit">{product.unitName || '—'}</td>
      <td className="wr-td--moves">{Number(product.movementCount || 0)}</td>
      <MetricCells
        openingQty={product.openingQty}
        openingAmount={product.openingAmount}
        importQty={product.importQty}
        importAmount={product.importAmount}
        exportQty={product.exportQty}
        exportAmount={product.exportAmount}
        closingQty={product.closingQty}
        closingAmount={product.closingAmount}
      />
    </tr>
  );
}

export default function WarehouseReportTable({
  products = [],
  periodLabel,
  totalProducts,
  page,
  totalPages,
  onDocumentClick,
}) {
  const [detailProduct, setDetailProduct] = useState(null);

  return (
    <div className="wr-table-card">
      <div className="wr-table-card__header">
        <div>
          <h3>Chi tiết nhập xuất tồn</h3>
          <p>{periodLabel || '—'}</p>
        </div>
        <div className="wr-table-card__meta">
          {totalProducts ?? 0} hàng hóa
          {totalPages > 1 ? ` • Trang ${(page ?? 0) + 1}/${totalPages}` : ''}
        </div>
      </div>

      <div className="wr-table-wrap">
        <table className="wr-table wr-table--summary">
          <thead>
            <tr>
              <th className="wr-th--idx">#</th>
              <th>Sản phẩm</th>
              <th>Đơn vị</th>
              <th className="wr-th--moves">Lượt xuất/nhập</th>
              <th className="wr-th--opening wr-col-start">Tồn đầu SL</th>
              <th className="wr-th--opening wr-th--money">Tồn đầu Tiền</th>
              <th className="wr-th--import wr-col-start">Nhập SL</th>
              <th className="wr-th--import wr-th--money">Nhập Tiền</th>
              <th className="wr-th--export wr-col-start">Xuất SL</th>
              <th className="wr-th--export wr-th--money">Xuất Tiền</th>
              <th className="wr-th--closing wr-col-start">Tồn cuối SL</th>
              <th className="wr-th--closing wr-th--money">Tồn cuối Tiền</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={12} className="wr-table__empty">
                  Không có dữ liệu trong khoảng lọc
                </td>
              </tr>
            )}
            {products.map((product, idx) => (
              <ProductGroupRow
                key={product.productId}
                product={product}
                index={(page ?? 0) * 15 + idx + 1}
                onOpen={setDetailProduct}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ProductMovementsModal
        open={Boolean(detailProduct)}
        product={detailProduct}
        periodLabel={periodLabel}
        onClose={() => setDetailProduct(null)}
        onDocumentClick={onDocumentClick}
      />
    </div>
  );
}
