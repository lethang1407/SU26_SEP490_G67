import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatDateTime, formatMoney, formatQty } from '../utils/warehouseReportUtils';

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

function DirectionBadge({ direction }) {
  const inbound = direction === 'Nhập';
  return (
    <span className={`wr-badge ${inbound ? 'wr-badge--in' : 'wr-badge--out'}`}>
      {inbound ? '+ Nhập' : '− Xuất'}
    </span>
  );
}

function DocumentCell({ line, onDocumentClick }) {
  const code = line.documentCode;
  if (!code) return <span className="wr-muted">—</span>;
  const canOpen = line.documentKind && line.documentId;
  if (!canOpen) return <span>{code}</span>;
  return (
    <button
      type="button"
      className="wr-doc-link"
      onClick={() => onDocumentClick?.(line)}
      title="Xem chi tiết đơn"
    >
      {code}
    </button>
  );
}

export default function ProductMovementsModal({
  open,
  product,
  periodLabel,
  onClose,
  onDocumentClick,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !product) return null;

  const lines = product.lines || [];

  return createPortal(
    <div
      className="wr-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="wr-modal wr-modal--movements"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wr-movements-title"
      >
        <div className="wr-modal__header">
          <div>
            <h3 id="wr-movements-title">Chi tiết xuất/nhập</h3>
            <p className="wr-modal__subtitle">
              {product.sku ? (
                <>
                  <strong>{product.sku}</strong>
                  {' · '}
                </>
              ) : null}
              {product.productName}
              {product.unitName ? ` (${product.unitName})` : ''}
              {periodLabel ? ` · ${periodLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="wr-modal__close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="wr-modal__summary">
          <span>{lines.length} phát sinh</span>
          <span className="wr-col--opening">
            Đầu: {formatQty(product.openingQty)} / {formatMoney(product.openingAmount)}
          </span>
          <span className="wr-col--import">
            Nhập: {formatQty(product.importQty)} / {formatMoney(product.importAmount)}
          </span>
          <span className="wr-col--export">
            Xuất: {formatQty(product.exportQty)} / {formatMoney(product.exportAmount)}
          </span>
          <span className="wr-col--closing">
            Cuối: {formatQty(product.closingQty)} / {formatMoney(product.closingAmount)}
          </span>
        </div>

        <div className="wr-modal__table-wrap wr-modal__table-wrap--scroll">
          <table className="wr-table wr-table--modal">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Ngày giờ</th>
                <th className="wr-th--doc">Mã đơn</th>
                <th>Loại</th>
                <th>Diễn giải</th>
                <th className="wr-th--opening wr-col-start wr-th--num">Tồn đầu SL</th>
                <th className="wr-th--opening wr-th--money">Tồn đầu Tiền</th>
                <th className="wr-th--import wr-col-start wr-th--num">Nhập SL</th>
                <th className="wr-th--import wr-th--money">Nhập Tiền</th>
                <th className="wr-th--export wr-col-start wr-th--num">Xuất SL</th>
                <th className="wr-th--export wr-th--money">Xuất Tiền</th>
                <th className="wr-th--closing wr-col-start wr-th--num">Tồn cuối SL</th>
                <th className="wr-th--closing wr-th--money">Tồn cuối Tiền</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={13} className="wr-table__empty">
                    Không có phát sinh trong khoảng lọc
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const inbound = line.direction === 'Nhập';
                  return (
                    <tr
                      key={`${line.occurredAt}-${idx}`}
                      className={`wr-table__line ${inbound ? 'wr-table__line--in' : 'wr-table__line--out'}`}
                    >
                      <td className="wr-table__index-cell">
                        <span
                          className={`wr-row-bar ${inbound ? 'wr-row-bar--in' : 'wr-row-bar--out'}`}
                          aria-hidden
                        />
                        <span className="wr-table__index">{idx + 1}</span>
                      </td>
                      <td>{formatDateTime(line.occurredAt)}</td>
                      <td className="wr-td--doc">
                        <DocumentCell line={line} onDocumentClick={onDocumentClick} />
                      </td>
                      <td>
                        <DirectionBadge direction={line.direction} />
                      </td>
                      <td>{line.description || '—'}</td>
                      <td className="wr-td--opening wr-col-start wr-td--num">
                        <QtyCell value={line.openingQty} tone="opening" />
                      </td>
                      <td className="wr-td--opening wr-td--num wr-td--money">
                        <MoneyCell value={line.openingAmount} tone="opening" />
                      </td>
                      <td className="wr-td--import wr-col-start wr-td--num">
                        <QtyCell value={line.importQty} tone="import" />
                      </td>
                      <td className="wr-td--import wr-td--num wr-td--money">
                        <MoneyCell value={line.importAmount} tone="import" />
                      </td>
                      <td className="wr-td--export wr-col-start wr-td--num">
                        <QtyCell value={line.exportQty} tone="export" />
                      </td>
                      <td className="wr-td--export wr-td--num wr-td--money">
                        <MoneyCell value={line.exportAmount} tone="export" />
                      </td>
                      <td className="wr-td--closing wr-col-start wr-td--num">
                        <QtyCell value={line.closingQty} tone="closing" />
                      </td>
                      <td className="wr-td--closing wr-td--num wr-td--money">
                        <MoneyCell value={line.closingAmount} tone="closing" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="wr-modal__footer">
          <button type="button" className="wr-btn wr-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
