import { formatCoverDays, formatMoney, formatRate } from '../utils/productUtils';
import { PRODUCT_ROUTES } from '../constants';
import { useNavigate } from 'react-router-dom';

const FACET_PILL = {
  hot: { className: 'out', label: '✕ Hết hàng · đang bán tốt' },
  slow: { className: 'out', label: '✕ Hết hàng · ít người mua' },
  warn: { className: 'warn', label: '⚠ Sắp hết · đang bán tốt' },
  season: { className: 'ok', label: 'Còn hàng · sắp mùa lễ' },
  ok: { className: 'ok', label: '✓ Còn đủ hàng' },
  stop: { className: 'out', label: 'Đã ngừng bán' },
};

function Thumb({ product }) {
  const img = product.productImg;
  if (img && (img.startsWith('http') || img.startsWith('/'))) {
    return (
      <div className="d-thumb">
        <img src={img} alt="" />
      </div>
    );
  }
  return <div className="d-thumb">{img || '📦'}</div>;
}

function marginPct(selling, cost) {
  if (!selling || selling <= 0) return null;
  const m = ((selling - (cost || 0)) / selling) * 100;
  return Math.round(m * 10) / 10;
}

export default function ProductDetailDrawer({
  product,
  onClose,
  onPrepareImport,
}) {
  const navigate = useNavigate();
  if (!product) return null;

  const facet = product.facetStatus || 'hot';
  const pill = FACET_PILL[facet] || FACET_PILL.hot;
  const unit = product.unitName || product.baseUnitName || 'sp';
  const selling = product.sellingPrice ?? product.price ?? null;
  const cost = product.costPrice ?? null;
  const margin = selling != null ? marginPct(selling, cost) : null;
  const profit =
    selling != null && cost != null ? selling - cost : null;
  const coverOverride = product.coverDaysOverride;
  const categoryCover = product.categoryCoverDays ?? 14;
  const categoryName = product.categoryName || '—';

  return (
    <>
      <div className="pi-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-label="Chi tiết sản phẩm">
        <div className="d-head">
          <div className="d-head-left">
            <div className="d-kicker">CHI TIẾT SẢN PHẨM</div>
            <div className="d-title">{product.name}</div>
          </div>
          <button type="button" className="d-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="d-body pi-autohide-scroll">
          <div className="d-hero">
            <Thumb product={product} />
            <div className="d-hero-meta">
              <span className={`status-pill ${pill.className}`}>{pill.label}</span>
              <div className="meta-line">
                SKU: <b>{product.sku || `SP${String(product.id).padStart(3, '0')}`}</b>
              </div>
              <div className="meta-line">
                Mã vạch: <b>{product.barcode || '—'}</b>
              </div>
              <div className="meta-line">
                Danh mục: <b>{categoryName}</b>
              </div>
            </div>
          </div>

          <div className="d-section">
            <div className="d-sec-title">THÔNG TIN CƠ BẢN</div>
            <div className="field-grid">
              <div className="field">
                <div className="field-label">Đơn vị tính</div>
                <div className="field-value">{unit}</div>
              </div>
              <div className="field">
                <div className="field-label">Nhà cung cấp</div>
                <div className="field-value">{product.supplierName || '—'}</div>
              </div>
              <div className="field full">
                <div className="field-label">Mô tả</div>
                <div className="field-value muted">
                  {product.description || `${product.name} — xem tồn và tốc độ bán để quyết định nhập.`}
                </div>
              </div>
            </div>
          </div>

          <div className="d-section">
            <div className="d-sec-title">GIÁ CẢ</div>
            <div className="field-grid">
              <div className="field">
                <div className="field-label">Giá bán</div>
                <div className="field-value price-big">
                  {selling != null ? formatMoney(selling) : '—'}
                </div>
              </div>
              <div className="field">
                <div className="field-label">Giá nhập</div>
                <div className="field-value">
                  {cost != null ? formatMoney(cost) : '—'}
                </div>
              </div>
              <div className="field">
                <div className="field-label">Biên lợi nhuận</div>
                {margin != null ? (
                  <div className="margin-inline">
                    <span className={`margin-badge ${margin < 16 ? 'low' : ''}`}>{margin}%</span>
                    {profit != null && (
                      <span className="field-value muted">
                        +{formatMoney(profit).replace(' đ', '')} đ/{unit}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="field-value muted">—</div>
                )}
              </div>
              <div className="field">
                <div className="field-label">Tốc độ bán</div>
                <div className="field-value muted">
                  {formatRate(product.avgDailyRate, `${unit}/ngày`)}
                </div>
              </div>
            </div>
          </div>

          <div className="d-section">
            <div className="d-sec-title">TỒN KHO</div>
            <div className="stock-big">
              <span className="num">{product.onHand ?? 0}</span>
              <span className="den">/ còn bán được {formatCoverDays(product.coverDaysLeft)}</span>
            </div>
            {(facet === 'hot' || facet === 'warn' || product.onHand === 0) && (
              <div className="stock-alert">
                <b>
                  {facet === 'hot'
                    ? `Hết hàng · đang bán tốt (~${product.avgDailyRate ?? '—'}/${unit}/ngày).`
                    : facet === 'warn'
                      ? `Sắp hết · còn bán được ${formatCoverDays(product.coverDaysLeft)}.`
                      : 'Cần xem xét nhập hàng.'}
                </b>{' '}
                Nên chuẩn bị đơn nhập.
              </div>
            )}
            <div className="field-grid" style={{ marginTop: 12 }}>
              <div className="field">
                <div className="field-label">Vị trí kệ</div>
                <div className="field-value muted">{product.shelfLocation || '—'}</div>
              </div>
              <div className="field">
                <div className="field-label">Nhập gần nhất</div>
                <div className="field-value muted">{product.lastImportNote || '—'}</div>
              </div>
            </div>
          </div>

          <div className="d-section">
            <div className="d-sec-title">KHI NHẬP HÀNG</div>
            <div className="field-grid">
              <div className="field full">
                <div className="field-label">Đủ bán trong bao lâu?</div>
                <div className="field-value">
                  {coverOverride != null ? (
                    <>
                      Cài riêng <b>{coverOverride} ngày</b>
                    </>
                  ) : (
                    <>
                      Theo nhóm <b>{categoryName} · {categoryCover} ngày</b>
                    </>
                  )}
                </div>
              </div>
              <div className="field">
                <div className="field-label">Cài riêng cho sản phẩm này?</div>
                <div className="field-value muted">
                  {coverOverride != null ? `Có — ${coverOverride} ngày` : 'Không — đang dùng theo nhóm'}
                </div>
              </div>
              <div className="field">
                <div className="field-label">Nếu bật cài riêng</div>
                <div className="field-value muted">Nhập số ngày (vd. 7)</div>
              </div>
            </div>
            <div className="field-value muted" style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
              Chỉ bật khi sản phẩm này nhập khác với cả nhóm. Lúc tạo đơn vẫn có thể đổi tạm cho lần đó.
            </div>
          </div>
        </div>

        <div className="d-foot">
          <div className="d-foot-row">
            <button type="button" className="btn primary" onClick={() => onPrepareImport?.(product)}>
              Tạo đơn nhập
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                onClose?.();
                navigate(PRODUCT_ROUTES.edit(product.id));
              }}
            >
              Chỉnh sửa
            </button>
          </div>
          <div className="d-foot-row">
            <button type="button" className="btn ghost" onClick={onClose}>
              Đóng
            </button>
            <button type="button" className="btn danger">
              Ngừng kinh doanh
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
