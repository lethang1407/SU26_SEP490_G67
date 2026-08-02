import { useEffect, useRef } from 'react';
import {
  coverClass,
  formatCoverDays,
  formatRate,
  rowClass,
  stockClass,
} from '../utils/productUtils';

const HOVER_OPEN_MS = 2000;

function ProductThumb({ product }) {
  const img = product.productImg;
  if (img && (img.startsWith('http') || img.startsWith('/'))) {
    return (
      <div className="prod-img">
        <img src={img} alt="" />
      </div>
    );
  }
  return <div className="prod-img">{img || '📦'}</div>;
}

export default function ProductImportTable({
  items,
  loading,
  facet,
  selectedIds,
  detailProductId,
  onToggle,
  onToggleAll,
  onOpenDetail,
  onHoverDetailCancel,
  page,
  totalPages,
  totalElements,
  onPageChange,
}) {
  const allChecked = items.length > 0 && items.every((p) => selectedIds.has(p.id));
  const hoverTimerRef = useRef(null);
  const hoverIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoverIdRef.current = null;
  };

  const handleRowEnter = (product) => {
    clearHoverTimer();
    hoverIdRef.current = product.id;
    hoverTimerRef.current = setTimeout(() => {
      if (hoverIdRef.current === product.id) {
        onOpenDetail?.(product);
      }
    }, HOVER_OPEN_MS);
  };

  const handleRowLeave = () => {
    clearHoverTimer();
    onHoverDetailCancel?.();
  };

  return (
    <div className={`tablewrap ${detailProductId ? 'tablewrap--detail-open' : ''}`}>
      <div className="tscroll">
        <table>
          <thead>
            <tr>
              <th className="col-cb">
                <span
                  className={`cb ${allChecked ? 'on' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAll(!allChecked);
                  }}
                  role="checkbox"
                  aria-checked={allChecked}
                />
              </th>
              <th className="col-prod">Sản phẩm</th>
              <th className="col-rate" title="Tốc độ bán">Tốc độ</th>
              <th className="col-stock" title="Tồn kho">Tồn</th>
              <th className="col-cover" title="Còn bán được">Còn bán</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748B', padding: 24 }}>
                  Đang tải…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748B', padding: 24 }}>
                  Không có sản phẩm trong nhóm này.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((p) => {
                const checked = selectedIds.has(p.id);
                const unit = p.unitName || 'sp';
                const isDetailFocus = detailProductId === p.id;
                return (
                  <tr
                    key={p.id}
                    className={`${rowClass(facet || p.facetStatus, checked)} ${
                      isDetailFocus ? 'detail-focus' : ''
                    } ${detailProductId && !isDetailFocus ? 'detail-dimmed' : ''}`.trim()}
                    onClick={() => onOpenDetail?.(p)}
                    onMouseEnter={() => handleRowEnter(p)}
                    onMouseLeave={handleRowLeave}
                  >
                    <td
                      className="col-cb"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(p.id);
                      }}
                    >
                      <span className={`cb ${checked ? 'on' : ''}`} />
                    </td>
                    <td className="col-prod">
                      <div className="prod">
                        <ProductThumb product={p} />
                        <div className="prod-name" title={p.name}>{p.name}</div>
                      </div>
                    </td>
                    <td className="col-rate">
                      <div className="rate-main" title={formatRate(p.avgDailyRate, `${unit}/ngày`)}>
                        {formatRate(p.avgDailyRate, `${unit}/ngày`)}
                      </div>
                      <div className="rate-sub" title={formatRate(p.avgWeeklyRate, `${unit}/tuần`)}>
                        {formatRate(p.avgWeeklyRate, `${unit}/tuần`)}
                      </div>
                    </td>
                    <td className={`col-stock ${stockClass(p.onHand, facet || p.facetStatus)}`}>
                      {p.onHand ?? 0}
                    </td>
                    <td
                      className={`col-cover ${coverClass(p.coverDaysLeft)}`}
                      title={formatCoverDays(p.coverDaysLeft)}
                    >
                      {formatCoverDays(p.coverDaysLeft)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className="foot">
        <div>{totalElements} sản phẩm</div>
        <div className="pages">
          <button
            type="button"
            className="pg"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </button>
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`pg ${page === i ? 'cur' : ''}`}
              onClick={() => onPageChange(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className="pg"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
