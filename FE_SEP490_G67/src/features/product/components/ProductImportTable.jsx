import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api';

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
      <div className="pi-img">
        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5 }} />
      </div>
    );
  }
  return <div className="pi-img">{img || '📦'}</div>;
}

function PriceHistoryView({ productId, currentCostPrice }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi.getPriceHistory(productId)
      .then(res => {
        setHistory(res || []);
      })
      .catch(err => {
        console.error(err);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return <div style={{ padding: 20, fontSize: 13, color: '#64748B' }}>Đang tải lịch sử giá…</div>;
  }

  const prices = history.map(h => Number(h.price)).filter(p => !isNaN(p) && p > 0);
  const minPrice = prices.length ? Math.min(...prices) : Number(currentCostPrice) || 0;
  const maxPrice = prices.length ? Math.max(...prices) : Number(currentCostPrice) || 0;

  const timeline = [...history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const current = timeline[0];
  const previous = timeline[1];

  let diffText = '';
  let diffClass = '';
  if (current && previous) {
    const diff = Number(current.price) - Number(previous.price);
    const pct = ((diff / Number(previous.price)) * 100).toFixed(1);
    if (diff < 0) {
      diffText = `↓ ${Math.abs(diff).toLocaleString()} đ (-${Math.abs(pct)}%)`;
      diffClass = 'down';
    } else if (diff > 0) {
      diffText = `↑ ${diff.toLocaleString()} đ (+${pct}%)`;
      diffClass = 'up';
    }
  }

  return (
    <div className="vd-price-history">
      <div className="vd-ph-section">
        <div className="vd-ph-title">Giá nhập hiện tại</div>
        <div className="vd-ph-main-price">
          <span className="vd-ph-price-val">
            {current ? Number(current.price).toLocaleString() : Number(currentCostPrice || 0).toLocaleString()} đ
          </span>
          {current && (
            <span className="vd-ph-date">
              cập nhật ngày {new Date(current.createdAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
        {diffText && (
          <div className="vd-ph-diff">
            <span className={`vd-ph-diff-val ${diffClass}`}>{diffText}</span>
            <span className="vd-ph-prev">so với giá trước: {Number(previous.price).toLocaleString()} đ</span>
          </div>
        )}
        <div className="vd-ph-minmax">
          Thấp nhất: {minPrice.toLocaleString()} đ · Cao nhất: {maxPrice.toLocaleString()} đ (trong các lần nhập gần đây)
        </div>
      </div>

      <div className="vd-ph-section">
        <div className="vd-ph-title">Lịch sử thay đổi</div>
        {timeline.length === 0 ? (
          <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Chưa có lịch sử nhập hàng.</div>
        ) : (
          <div className="vd-ph-timeline">
            {timeline.map((item, idx) => {
              const prevItem = timeline[idx + 1];
              let itemDiffText = '';
              let itemDiffClass = '';
              if (prevItem) {
                const diff = Number(item.price) - Number(prevItem.price);
                if (diff < 0) {
                  itemDiffText = `↓ ${Math.abs(diff).toLocaleString()} đ`;
                  itemDiffClass = 'down';
                } else if (diff > 0) {
                  itemDiffText = `↑ ${diff.toLocaleString()} đ`;
                  itemDiffClass = 'up';
                }
              }
              return (
                <div className="vd-pht-item" key={item.id || idx}>
                  <span className="vd-pht-date">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="vd-pht-price">{Number(item.price).toLocaleString()} đ</span>
                  {itemDiffText && (
                    <span className={`vd-pht-diff ${itemDiffClass}`}>{itemDiffText}</span>
                  )}
                  <span className="vd-pht-supplier">{item.supplierName || 'N/A'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductInlineDetailPanel({
  isDetailOpen,
  currentTab,
  onTabChange,
  product,
  allChildren = [],
  onEditProduct,
}) {
  const navigate = useNavigate();
  if (!isDetailOpen || !product) return null;

  const sku = product.sku || `SP${String(product.id).padStart(6, '0')}`;
  const barcode = product.barcode || 'Chưa có';
  const categoryName = product.categoryName || '—';
  const brand = product.brand || 'Chưa có';
  const supplierName = product.supplierName || 'Chưa rõ';
  const costPrice = product.costPrice ? product.costPrice.toLocaleString() + ' đ' : 'Chưa có';
  const sellingPrice = product.sellingPrice ? product.sellingPrice.toLocaleString() + ' đ' : 'Chưa có';
  const onHand = product.onHand ?? product.stock ?? 0;
  const minStock = product.minStock ?? 0;
  const coverDays = product.coverDaysOverride || product.categoryCoverDays || 14;
  const parentName = product.parentName || (product.parentId ? `Nhóm #${product.parentId}` : '—');
  const unitName = product.baseUnitName || product.unitName || 'Cái';
  const vatPercent = product.vatPercent ? `${product.vatPercent}%` : '10%';
  const seasonTag = product.seasonTag || 'Bán quanh năm';
  const statusLabel = product.status === 'inactive' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';

  return (
    <div className="pi-detail open" onClick={(e) => e.stopPropagation()}>
      {/* Tabs Bar matching sample KiotViet image structure */}
      <div className="vd-tabs">
        <div
          className={`vd-tab ${currentTab === 'info' ? 'active' : ''}`}
          onClick={() => onTabChange('info')}
        >
          Thông tin
        </div>
        <div
          className={`vd-tab ${currentTab === 'desc' ? 'active' : ''}`}
          onClick={() => onTabChange('desc')}
        >
          Mô tả, ghi chú
        </div>
        <div
          className={`vd-tab ${currentTab === 'price' ? 'active' : ''}`}
          onClick={() => onTabChange('price')}
        >
          Thẻ kho (Lịch sử giá)
        </div>
        <div
          className={`vd-tab ${currentTab === 'stock' ? 'active' : ''}`}
          onClick={() => onTabChange('stock')}
        >
          Tồn kho
        </div>
        {allChildren.length > 0 && (
          <div
            className={`vd-tab ${currentTab === 'siblings' ? 'active' : ''}`}
            onClick={() => onTabChange('siblings')}
          >
            Hàng hóa cùng loại ({allChildren.length})
          </div>
        )}
      </div>

      {/* Tab 1: Thông tin (Complete 4-column layout + attributes + actions) */}
      {currentTab === 'info' && (
        <div className="vd-body-container">
          <div className="vd-body-main" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 20, width: '100%' }}>
            {/* Thumbnail preview on the left */}
            <div className="vd-img" style={{ width: 100, height: 100, borderRadius: 8, border: '1px solid #CBD5E1', overflow: 'hidden', flexShrink: 0, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {product.productImg && (product.productImg.startsWith('http') || product.productImg.startsWith('/')) ? (
                <img src={product.productImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 40 }}>📦</span>
              )}
            </div>

            {/* Main Header Info strictly on the RIGHT side of the image */}
            <div className="vd-info" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="vd-title" style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{product.name}</span>
                {product.primaryAttrValue && (
                  <span className="vd-size-badge">{product.primaryAttrValue}</span>
                )}
                {product.sizeValue && (
                  <span className="vd-size-badge">{product.sizeValue}</span>
                )}
                <span className="vd-size-badge" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>{unitName}</span>
              </div>

              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8, marginTop: 4 }}>
                Nhóm hàng: <b style={{ color: '#334155' }}>{categoryName}</b>
              </div>

              <div className="vd-badges" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 0 }}>
                <span className="vd-badge-pill active">Hàng hóa thường</span>
                <span className="vd-badge-pill info">Bán trực tiếp</span>
                <span className="vd-badge-pill warn">VAT: {vatPercent}</span>
                {seasonTag && seasonTag !== '—' && (
                  <span className="vd-badge-pill ok">Mùa vụ: {seasonTag}</span>
                )}
              </div>
            </div>
          </div>

          {/* 4 Columns Fields Grid matching sample KiotViet image structure */}
          <div className="vd-fields-grid">
            <div>
              <div className="vd-field-label">MÃ HÀNG</div>
              <div className="vd-field-val" style={{ color: '#2563EB', fontFamily: 'monospace' }}>{sku}</div>
            </div>
            <div>
              <div className="vd-field-label">MÃ VẠCH</div>
              <div className="vd-field-val">{barcode}</div>
            </div>
            <div>
              <div className="vd-field-label">TỒN KHO</div>
              <div className="vd-field-val" style={{ color: onHand > 0 ? '#16A34A' : '#DC2626' }}>{onHand}</div>
            </div>
            <div>
              <div className="vd-field-label">ĐỊNH MỨC TỒN</div>
              <div className="vd-field-val">{minStock} - 999,999,999</div>
            </div>

            <div>
              <div className="vd-field-label">GIÁ VỐN</div>
              <div className="vd-field-val">{costPrice}</div>
            </div>
            <div>
              <div className="vd-field-label">GIÁ BÁN</div>
              <div className="vd-field-val" style={{ color: '#1D4ED8' }}>{sellingPrice}</div>
            </div>
            <div>
              <div className="vd-field-label">THƯƠNG HIỆU</div>
              <div className="vd-field-val">{brand}</div>
            </div>
            <div>
              <div className="vd-field-label">NHÀ CUNG CẤP</div>
              <div className="vd-field-val">{supplierName}</div>
            </div>

            {product.parentId && (
              <div>
                <div className="vd-field-label">SẢN PHẨM CHA (NHÓM)</div>
                <div className="vd-field-val" style={{ color: '#2563EB' }}>{parentName}</div>
              </div>
            )}
            <div>
              <div className="vd-field-label">ĐƠN VỊ CƠ BẢN</div>
              <div className="vd-field-val">{unitName}</div>
            </div>
            <div>
              <div className="vd-field-label">TỐC ĐỘ BÁN HÀNG</div>
              <div className="vd-field-val">{salesPaceStat(product)}</div>
            </div>
            <div>
              <div className="vd-field-label">TRẠNG THÁI KINH DOANH</div>
              <div className="vd-field-val">{statusLabel}</div>
            </div>
          </div>

          {/* Dynamic Attributes Section */}
          {Array.isArray(product.attributes) && product.attributes.length > 0 && (
            <div className="vd-section-box">
              <div className="vd-sec-header">THUỘC TÍNH SẢN PHẨM</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {product.attributes.map((a, i) => (
                  <div key={i} style={{ fontSize: 13 }}>
                    <span style={{ color: '#64748B' }}>{a.name || a.attributeName}: </span>
                    <b style={{ color: '#1E293B' }}>{a.value || a.attributeValue}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Units Section */}
          {Array.isArray(product.units) && product.units.length > 0 && (
            <div className="vd-section-box">
              <div className="vd-sec-header">ĐƠN VỊ TÍNH QUY ĐỔI</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {product.units.map((u, i) => (
                  <div key={i} style={{ background: '#FFF', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: 6, fontSize: 12 }}>
                    <b>{u.name}</b> = {u.unitBase || 1} {unitName} {u.sellingPrice ? `(Giá: ${Number(u.sellingPrice).toLocaleString()} đ)` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar with only Chỉnh sửa button */}
          <div className="vd-action-bar" style={{ justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
            <button
              type="button"
              className="vd-btn primary"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditProduct) {
                  onEditProduct(product);
                } else {
                  navigate(`/admin/products/${product.id}/edit`);
                }
              }}
            >
              ✏️ Chỉnh sửa
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Mô tả, ghi chú */}
      {currentTab === 'desc' && (
        <div className="vd-body-container">
          <div className="vd-section-box" style={{ marginTop: 0 }}>
            <div className="vd-sec-header">MÔ TẢ SẢN PHẨM</div>
            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
              {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
            </div>
          </div>
          <div className="vd-section-box">
            <div className="vd-sec-header">GHI CHÚ KHO HÀNG</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              Mặt hàng kinh doanh bình thường, lưu kho ở nhiệt độ phòng.
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Thẻ kho / Biến động giá nhập */}
      {currentTab === 'price' && (
        <div className="vd-body-container">
          <PriceHistoryView productId={product.id} currentCostPrice={product.costPrice} />
        </div>
      )}

      {/* Tab 4: Tồn kho */}
      {currentTab === 'stock' && (
        <div className="vd-body-container">
          <div className="vd-fields-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <div>
              <div className="vd-field-label">TỒN KHO THỰC TẾ</div>
              <div className="vd-field-val" style={{ fontSize: 18, color: onHand > 0 ? '#16A34A' : '#DC2626' }}>{onHand}</div>
            </div>
            <div>
              <div className="vd-field-label">ĐỊNH MỨC TỒN TỐI THIỂU</div>
              <div className="vd-field-val">{minStock}</div>
            </div>
            <div>
              <div className="vd-field-label">NGÀY TRỮ KHO DỰ KIẾN</div>
              <div className="vd-field-val">{coverDays} ngày</div>
            </div>
            <div>
              <div className="vd-field-label">TỐC ĐỘ BÁN HÀNG</div>
              <div className="vd-field-val">{salesPaceStat(product)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Hàng hóa cùng loại */}
      {currentTab === 'siblings' && allChildren.length > 0 && (
        <div className="vd-body-container">
          <div className="vd-sec-header">DANH SÁCH SẢN PHẨM CÙNG NHÓM</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '8px 12px' }}>SKU</th>
                <th style={{ padding: '8px 12px' }}>Tên mặt hàng con</th>
                <th style={{ padding: '8px 12px' }}>Giá vốn</th>
                <th style={{ padding: '8px 12px' }}>Giá bán</th>
                <th style={{ padding: '8px 12px' }}>Tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {allChildren.map((c) => (
                <tr key={`sib-${c.id}`} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2563EB' }}>{c.sku || `SP${c.id}`}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '8px 12px' }}>{c.costPrice ? c.costPrice.toLocaleString() + ' đ' : '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{c.sellingPrice ? c.sellingPrice.toLocaleString() + ' đ' : '—'}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: (c.onHand ?? 0) > 0 ? '#16A34A' : '#DC2626' }}>{c.onHand ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ProductImportTable({
  items,
  loading,
  facet,
  selectedIds,
  detailProductId,
  isOrderPanelOpen,
  onToggle,
  onToggleAll,
  onOpenDetail,
  page,
  totalPages,
  totalElements,
  onPageChange,
}) {
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(new Set());
  const [openDetailId, setOpenDetailId] = useState(null);
  const [activeTabs, setActiveTabs] = useState({});

  useEffect(() => {
    if (isOrderPanelOpen) {
      setOpenDetailId(null);
    }
  }, [isOrderPanelOpen]);

  const allVisibleIds = [];
  items.forEach((p) => {
    if (p.isGroup) {
      (p.variantGroups || []).forEach((vg) => {
        (vg.sizes || []).forEach((sz) => {
          if (sz.id) allVisibleIds.push(sz.id);
        });
      });
    } else {
      if (p.id) allVisibleIds.push(p.id);
    }
  });

  const allChecked = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleDetail = (id) => {
    if (isOrderPanelOpen) return;
    if (openDetailId === id) {
      setOpenDetailId(null);
    } else {
      setOpenDetailId(id);
      setActiveTabs((prev) => ({ ...prev, [id]: 'info' }));
    }
  };

  const getActiveTab = (id) => {
    return activeTabs[id] || 'info';
  };

  const setActiveTab = (id, tab) => {
    setActiveTabs((prev) => ({ ...prev, [id]: tab }));
  };

  return (
    <div className="pi-table-card">
      {/* Sticky header */}
      <div className="pi-thead">
        <div className="pi-th col-cb">
          <input
            type="checkbox"
            className="pi-cb"
            checked={allChecked}
            onChange={(e) => onToggleAll(e.target.checked)}
          />
        </div>
        <div className="pi-th col-img"></div>
        <div className="pi-th col-sku">Mã hàng</div>
        <div className="pi-th col-name">Tên hàng</div>
        <div className="pi-th col-cprod">Sản phẩm</div>
        <div className="pi-th col-ps">Giá bán</div>
        <div className="pi-th col-pc">Giá vốn</div>
        <div className="pi-th col-st">Tồn kho</div>
        <div className="pi-th col-rt">Mức bán</div>
      </div>

      {/* Scrollable body */}
      <div className="pi-table-scroll pi-autohide-scroll">
        {loading && (
          <div style={{ textAlign: 'center', color: '#64748B', padding: 24, fontSize: 14 }}>
            Đang tải…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748B', padding: 24, fontSize: 14 }}>
            Không có sản phẩm trong nhóm này.
          </div>
        )}
        {!loading &&
          items.map((p) => {
            if (p.isGroup) {
              const allChildren = [];
              const allChildIds = [];
              (p.variantGroups || []).forEach((vg) => {
                (vg.sizes || []).forEach((sz) => {
                  if (sz.id) {
                    allChildIds.push(sz.id);
                    const primaryVal = sz.primaryAttrValue || vg.primaryAttrValue;
                    const sizeVal = sz.sizeValue;
                    const unitStr = sz.unitName || p.unitName || 'đôi';
                    
                    let formattedName = sz.name;
                    if (!formattedName) {
                      let parts = [p.name];
                      if (sizeVal) parts.push(sizeVal);
                      if (primaryVal && primaryVal !== sizeVal) parts.push(primaryVal);
                      formattedName = parts.join('-');
                    }

                    allChildren.push({
                      ...sz,
                      primaryAttrValue: primaryVal,
                      name: formattedName,
                      productImg: sz.productImg || vg.productImg || p.productImg,
                      parentName: p.name,
                      parentCategoryName: p.categoryName,
                    });
                  }
                });
              });

              const hasChildren = allChildIds.length > 0;
              const groupAllChecked =
                hasChildren && allChildIds.every((id) => selectedIds.has(id));
              const isCollapsed = collapsedGroupIds.has(p.id);

              const parentKey = `parent-${p.id}`;
              const isParentDetailOpen = openDetailId === parentKey;
              const parentCurrentTab = getActiveTab(parentKey, true);

              if (!hasChildren) {
                // Parent product without children -> Display default SKU and inline detail on click
                const checked = selectedIds.has(p.id);
                return (
                  <div className="pi-variant-wrap" key={`standalone-${p.id}`}>
                    <div
                      className={`pi-row ${isParentDetailOpen ? 'row-selected' : ''}`}
                      onClick={() => toggleDetail(parentKey)}
                    >
                      <div className="pi-td col-cb" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="pi-cb"
                          checked={checked}
                          onChange={() => onToggle(p.id)}
                        />
                      </div>
                      <div className="pi-td col-img">
                        <ProductThumb product={p} />
                      </div>
                      <div className="pi-td col-sku" style={{ fontFamily: 'monospace' }}>
                        {p.sku || `SP${p.id}`}
                      </div>
                      <div className="pi-td col-name">
                        <div className="cprod-name" title={p.name}>
                          {p.name}
                        </div>
                      </div>
                      <div className="pi-td col-cprod">
                        <div className="cprod">
                          <ProductThumb product={p} />
                          <div className="cprod-info">
                            <div className="cprod-name">{p.name}</div>
                            <div className="cprod-sub">Mã: {p.sku || p.id}</div>
                          </div>
                        </div>
                      </div>
                      <div className="pi-td col-ps">{p.sellingPrice ? p.sellingPrice.toLocaleString() : '—'}</div>
                      <div className="pi-td col-pc">{p.costPrice ? p.costPrice.toLocaleString() : '—'}</div>
                      <div className="pi-td col-st">{p.onHand ?? 0}</div>
                      <div className="pi-td col-rt">{salesPaceStat(p)}</div>
                    </div>

                    {/* Dropdown Inline Detail Panel (Structure matching KiotViet image) */}
                    <ProductInlineDetailPanel
                      isDetailOpen={isParentDetailOpen}
                      currentTab={parentCurrentTab}
                      onTabChange={(tab) => setActiveTab(parentKey, tab)}
                      product={p}
                      allChildren={[]}
                    />
                  </div>
                );
              }

              return (
                <div key={`grp-${p.id}`} className="pi-group">
                  {/* Parent Row */}
                  <div
                    className="pi-row parent"
                    onClick={() => toggleGroupCollapse(p.id)}
                  >
                    <div className="pi-td col-cb" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="pi-cb"
                        checked={groupAllChecked}
                        onChange={() => onToggle(allChildIds)}
                      />
                    </div>
                    <div className="pi-td col-sku">
                      <span className="parent-variant-badge" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600, display: 'inline-block' }}>
                        ({allChildIds.length} phân loại)
                      </span>
                    </div>
                    <div className="pi-td col-name" style={{ fontWeight: '700', color: '#1E293B' }}>
                      {p.name}
                    </div>
                    <div className="pi-td col-cprod">
                      <div className="cprod">
                        <ProductThumb product={p} />
                        <div className="cprod-info">
                          <div className="cprod-name">{p.name}</div>
                          <div className="cprod-sub">({allChildIds.length} mặt hàng con)</div>
                        </div>
                      </div>
                    </div>
                    <div className="pi-td col-ps">
                      {p.sellingPrice ? p.sellingPrice.toLocaleString() : '—'}
                    </div>
                    <div className="pi-td col-pc">
                      {p.costPrice ? p.costPrice.toLocaleString() : '—'}
                    </div>
                    <div className="pi-td col-st" style={{ fontWeight: 700 }}>{p.onHand ?? 0}</div>
                    <div className="pi-td col-rt">{salesPaceStat(p)}</div>
                  </div>

                  {/* Expanded Child Variant Rows (Mọi thằng con trực tiếp) */}
                  {!isCollapsed && (
                    <div className="pi-variant-block" style={{ paddingLeft: 12, backgroundColor: '#F8FAFC' }}>
                      {allChildren.map((child) => {
                        const childKey = `child-${child.id}`;
                        const isChildSelected = selectedIds.has(child.id);
                        const isDetailOpen = openDetailId === childKey;
                        const currentTab = getActiveTab(childKey, false);

                        const childNameFormatted = child.name || [p.name, child.sizeValue, child.primaryAttrValue !== child.sizeValue ? child.primaryAttrValue : null].filter(Boolean).join('-');

                        const childItem = {
                          ...child,
                          name: childNameFormatted,
                          unitName: child.unitName || p.unitName || 'Đôi',
                          supplierName: child.supplierName || p.supplierName,
                          categoryName: p.categoryName || 'Đồ dùng gia đình',
                        };

                        return (
                          <div className="pi-variant-wrap" key={`wrap-${child.id}`}>
                            <div
                              className={`pi-row variant child-variant-row ${isDetailOpen ? 'row-selected' : ''}`}
                              style={{ borderLeft: '3px solid #3B82F6', marginTop: 2, marginBottom: 2, background: isDetailOpen ? '#EFF6FF' : (isChildSelected ? '#F0F9FF' : '#FFFFFF') }}
                              onClick={() => toggleDetail(childKey)}
                            >
                              <div className="pi-td col-cb" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  className="pi-cb"
                                  checked={isChildSelected}
                                  onChange={() => onToggle(child.id)}
                                />
                              </div>
                              <div className="pi-td col-img">
                                <ProductThumb product={child} />
                              </div>
                              <div className="pi-td col-sku" style={{ color: '#2563EB', fontWeight: 600, fontFamily: 'monospace' }}>
                                {child.sku || `SP${child.id}`}
                              </div>
                              <div className="pi-td col-name" style={{ fontWeight: 500 }} title={childNameFormatted}>
                                {childNameFormatted}
                              </div>
                              <div className="pi-td col-cprod">
                                <div className="cprod">
                                  <ProductThumb product={child} />
                                  <div className="cprod-info">
                                    <div className="cprod-name" style={{ fontWeight: 600 }}>{childNameFormatted}</div>
                                    <div className="cprod-sub" style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                                      {child.primaryAttrValue && (
                                        <span className="vtag" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                                          {child.primaryAttrValue}
                                        </span>
                                      )}
                                      {child.sizeValue && (
                                        <span className="vtag" style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                                          {child.sizeValue}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="pi-td col-ps">
                                {child.sellingPrice ? child.sellingPrice.toLocaleString() : '—'}
                              </div>
                              <div className="pi-td col-pc">
                                {child.costPrice ? child.costPrice.toLocaleString() : '—'}
                              </div>
                              <div className="pi-td col-st" style={{ fontWeight: 600 }}>{child.onHand ?? 0}</div>
                              <div className="pi-td col-rt">{salesPaceStat(child)}</div>
                            </div>

                            {/* Dropdown Inline Detail Panel (Structure matching KiotViet image) */}
                            <ProductInlineDetailPanel
                              isDetailOpen={isDetailOpen}
                              currentTab={currentTab}
                              onTabChange={(tab) => setActiveTab(childKey, tab)}
                              product={childItem}
                              allChildren={[]}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              // Standalone product
              const checked = selectedIds.has(p.id);
              const standaloneKey = `standalone-${p.id}`;
              const isDetailOpen = openDetailId === standaloneKey;
              const currentTab = getActiveTab(standaloneKey, true);

              return (
                <div className="pi-variant-wrap" key={`standalone-${p.id}`}>
                  <div
                    className={`pi-row ${isDetailOpen ? 'row-selected' : ''}`}
                    onClick={() => toggleDetail(standaloneKey)}
                  >
                    <div className="pi-td col-cb" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="pi-cb"
                        checked={checked}
                        onChange={() => onToggle(p.id)}
                      />
                    </div>
                    <div className="pi-td col-img">
                      <ProductThumb product={p} />
                    </div>
                    <div className="pi-td col-sku" style={{ fontFamily: 'monospace' }}>{p.sku || `SP${p.id}`}</div>
                    <div className="pi-td col-name">
                      <div className="cprod-name" title={p.name}>
                        {p.name}
                      </div>
                    </div>
                    <div className="pi-td col-cprod">
                      <div className="cprod">
                        <ProductThumb product={p} />
                        <div className="cprod-info">
                          <div className="cprod-name">{p.name}</div>
                          <div className="cprod-sub">Mã: {p.sku || p.id}</div>
                        </div>
                      </div>
                    </div>
                    <div className="pi-td col-ps">{p.sellingPrice ? p.sellingPrice.toLocaleString() : '—'}</div>
                    <div className="pi-td col-pc">{p.costPrice ? p.costPrice.toLocaleString() : '—'}</div>
                    <div className="pi-td col-st">{p.onHand ?? 0}</div>
                    <div className="pi-td col-rt">{salesPaceStat(p)}</div>
                  </div>

                  {/* Dropdown Inline Detail Panel (Structure matching KiotViet image) */}
                  <ProductInlineDetailPanel
                    isDetailOpen={isDetailOpen}
                    currentTab={currentTab}
                    onTabChange={(tab) => setActiveTab(standaloneKey, tab)}
                    product={p}
                    allChildren={[]}
                  />
                </div>
              );
            }
          })}
      </div>

      {/* Foot */}
      <div className="pi-foot">
        <span>{totalElements} sản phẩm</span>
        <div className="pi-pages">
          <button
            type="button"
            className="pi-pg"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </button>
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`pi-pg ${page === i ? 'cur' : ''}`}
              onClick={() => onPageChange(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className="pi-pg"
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
