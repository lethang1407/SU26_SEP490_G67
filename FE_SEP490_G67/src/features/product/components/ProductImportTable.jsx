import {
  coverClass,
  formatCoverDays,
  rowClass,
  stockClass,
} from '../utils/productUtils';

function salesPaceLabel(facetStatus) {
  switch (facetStatus) {
    case 'hot':
    case 'warn':
      return 'Bán chạy';
    case 'slow':
      return 'Ít bán';
    case 'stop':
      return 'Ngừng bán';
    case 'ok':
    case 'season':
    default:
      return 'Bình thường';
  }
}

/** Một số ngắn: ưu tiên /tuần (dễ hình dung), fallback /ngày */
function salesPaceStat(product) {
  const format = (n, suffix) => {
    const text = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
    return `~${text}${suffix}`;
  };
  const weekly = Number(product.avgWeeklyRate);
  if (Number.isFinite(weekly) && weekly > 0) return format(weekly, '/tuần');
  const daily = Number(product.avgDailyRate);
  if (Number.isFinite(daily) && daily > 0) return format(daily, '/ngày');
  if (Number.isFinite(weekly) && weekly === 0) return '~0/tuần';
  if (Number.isFinite(daily) && daily === 0) return '~0/ngày';
  return '—';
}

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
  onOpenPo,
  page,
  totalPages,
  totalElements,
  onPageChange,
}) {
  const allChecked = items.length > 0 && items.every((p) => selectedIds.has(p.id));

  return (
    <div className={`tablewrap ${detailProductId ? 'tablewrap--detail-open' : ''}`}>
      <div className="tscroll pi-autohide-scroll">
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
              <th className="col-rate" title="Mức bán">Mức bán</th>
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
                const isDetailFocus = detailProductId === p.id;
                return (
                  <tr
                    key={p.id}
                    className={`${rowClass(facet || p.facetStatus, checked)} ${
                      isDetailFocus ? 'detail-focus' : ''
                    } ${detailProductId && !isDetailFocus ? 'detail-dimmed' : ''}`.trim()}
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
                    <td
                      className="col-prod"
                      onClick={() => onOpenDetail?.(p)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="prod">
                        <ProductThumb product={p} />
                        <div className="prod-text">
                          <div className="prod-name" title={p.name}>
                            {p.name}
                          </div>
                          {p.openPoCode ? (
                            <span
                              className="open-po-badge"
                              title={`Đang nằm trong phiếu tạm ${p.openPoCode}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPo?.(p);
                              }}
                            >
                              Đang {p.openPoCode}
                              {p.openPoQty != null ? ` · SL ${p.openPoQty}` : ''}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="col-rate">
                      <div
                        className={`rate-label rate-label--${facet || p.facetStatus || 'ok'}`}
                      >
                        {salesPaceLabel(facet || p.facetStatus)}
                      </div>
                      <div
                        className="rate-stat"
                        title={
                          p.avgDailyRate != null
                            ? `Trung bình ~${Number(p.avgDailyRate).toFixed(1).replace(/\.0$/, '')}/${p.unitName || 'sp'}/ngày (14 ngày gần nhất)`
                            : undefined
                        }
                      >
                        {salesPaceStat(p)}
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
