import { useState, useMemo } from 'react';
import { Edit3, ArrowUp, ArrowDown, ArrowUpDown, FileText, ExternalLink } from 'lucide-react';
import '../../../css/Product.css';

function salesPaceStat(product) {
  if (!product) return '—';
  const unit = product.unitName || product.baseUnitName || product.unit || 'sp';

  if (product.sold14Days != null) {
    const qty = Number(product.sold14Days) || 0;
    return `${qty.toLocaleString()} ${unit}`;
  }

  if (product.avgDailyRate != null) {
    const daily = Number(product.avgDailyRate);
    if (Number.isFinite(daily)) {
      const estimated14Days = Math.round(daily * 14);
      return `${estimated14Days.toLocaleString()} ${unit}`;
    }
  }

  if (product.avgWeeklyRate != null) {
    const weekly = Number(product.avgWeeklyRate);
    if (Number.isFinite(weekly)) {
      const estimated14Days = Math.round(weekly * 2);
      return `${estimated14Days.toLocaleString()} ${unit}`;
    }
  }

  return `0 ${unit}`;
}

function renderStockDisplay(onHand) {
  const stock = Number(onHand) || 0;
  if (stock <= 0) {
    return <span className="pi-stock-tag pi-stock-tag--out">0</span>;
  }
  if (stock <= 5) {
    return <span className="pi-stock-tag pi-stock-tag--low">{stock}</span>;
  }
  return <span className="pi-stock-tag pi-stock-tag--good">{stock}</span>;
}

function renderSalesPaceDisplay(product) {
  const text = salesPaceStat(product);
  if (!text || text === '—') {
    return <span style={{ color: '#94A3B8' }}>—</span>;
  }
  return (
    <span className="pi-sales-pace-pill" title={`Tổng lượng bán 2 tuần (14 ngày) gần nhất: ${text}`}>
      {text}
    </span>
  );
}

function ProductThumb({ product }) {
  const img = product?.productImg || product?.imageUrl || product?.image || product?.parentImg || product?.parent?.productImg || product?.parent?.imageUrl;
  if (img && (img.startsWith('http') || img.startsWith('/') || img.startsWith('blob:') || img.startsWith('data:'))) {
    return (
      <div className="pi-img">
        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
      </div>
    );
  }
  return <div className="pi-img">{img || '📦'}</div>;
}

const FACET_CONFIG = {
  new: {
    label: 'Mới tạo',
    icon: '🆕',
    style: { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
  },
  hot: {
    label: 'Hết – Bán chạy',
    icon: '🔴',
    style: { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },
  },
  warn: {
    label: 'Sắp hết hàng',
    icon: '🟠',
    style: { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' },
  },
  ok: {
    label: 'Đủ hàng',
    icon: '🟢',
    style: { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' },
  },
  season: {
    label: 'Mùa vụ',
    icon: '🟣',
    style: { background: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF' },
  },
  slow: {
    label: 'Hết – Ít bán',
    icon: '⚪',
    style: { background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' },
  },
  stop: {
    label: 'Ngừng bán',
    icon: '⛔',
    style: { background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' },
  },
};

function renderFacetBadge(product) {
  // Tạm tắt hiển thị badge facetStatus
  return null;
}

function renderOpenPoBadge(product, onOpenDraftPo) {
  const code = product?.openPoCode;
  const qty = product?.openPoQty;
  const poId = product?.openPoId;
  const hasOpen = Boolean(product?.hasOpenPo || code || poId);
  if (!hasOpen) return null;

  const unit = product?.unitName || '';
  const tooltipText = `Đang có đơn tạm: ${code || 'DRAFT'}${qty ? ` (${qty} ${unit})` : ''} • Bấm để xem`;

  return (
    <button
      type="button"
      className="pi-open-po-icon-btn"
      title={tooltipText}
      aria-label={tooltipText}
      onClick={(e) => {
        e.stopPropagation();
        if (onOpenDraftPo && poId) {
          onOpenDraftPo(poId);
        }
      }}
    >
      <FileText size={13} />
      <span className="pi-open-po-dot" />
    </button>
  );
}

function SortHeader({ label, sortKey, currentSort, onSort, className }) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <div
      className={`pi-th ${className} pi-th--sortable ${isActive ? 'is-sorted' : ''}`}
      onClick={() => onSort(sortKey)}
      title={`Bấm để sắp xếp theo ${label} (${direction === 'asc' ? 'Tăng dần → bấm để Giảm dần' : direction === 'desc' ? 'Giảm dần → bấm để Bỏ sắp xếp' : 'Bấm để Tăng dần'})`}
    >
      <span className="pi-th-label">{label}</span>
      <span className="pi-sort-icon">
        {direction === 'asc' ? (
          <ArrowUp size={13} className="sort-icon-active" />
        ) : direction === 'desc' ? (
          <ArrowDown size={13} className="sort-icon-active" />
        ) : (
          <ArrowUpDown size={12} className="sort-icon-idle" />
        )}
      </span>
    </div>
  );
}

export default function ProductImportTable({
  items,
  loading,
  selectedIds,
  onToggle,
  onToggleAll,
  onDeleteProduct,
  onManageUnits,
  onEditProduct,
  onViewStockCard,
  onOpenDraftPo,
  page = 0,
  totalPages = 1,
  totalElements = 0,
  onPageChange,
}) {
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set());
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key: null, direction: null };
    });
  };

  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    const { key, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...items].sort((a, b) => {
      let valA, valB;
      switch (key) {
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          return valA.localeCompare(valB, 'vi') * multiplier;
        case 'unit':
          valA = (a.unitName || a.baseUnitName || '').toLowerCase();
          valB = (b.unitName || b.baseUnitName || '').toLowerCase();
          return valA.localeCompare(valB, 'vi') * multiplier;
        case 'sellingPrice':
          valA = Number(a.sellingPrice) || 0;
          valB = Number(b.sellingPrice) || 0;
          return (valA - valB) * multiplier;
        case 'costPrice':
          valA = Number(a.costPrice) || 0;
          valB = Number(b.costPrice) || 0;
          return (valA - valB) * multiplier;
        case 'onHand':
          valA = Number(a.onHand ?? a.inventoryQuantity) || 0;
          valB = Number(b.onHand ?? b.inventoryQuantity) || 0;
          return (valA - valB) * multiplier;
        case 'salesPace':
          valA = a.sold14Days ?? (a.avgDailyRate != null ? Number(a.avgDailyRate) * 14 : (Number(a.avgWeeklyRate) * 2 || 0));
          valB = b.sold14Days ?? (b.avgDailyRate != null ? Number(b.avgDailyRate) * 14 : (Number(b.avgWeeklyRate) * 2 || 0));
          return (valA - valB) * multiplier;
        default:
          return 0;
      }
    });
  }, [items, sortConfig]);

  // Flatten all visible product IDs for header checkbox
  const allVisibleIds = [];
  items.forEach((p) => {
    if (p.isGroup) {
      if (Array.isArray(p.children) && p.children.length > 0) {
        p.children.forEach((c) => {
          if (c.id) allVisibleIds.push(c.id);
        });
      } else if (Array.isArray(p.variantGroups)) {
        p.variantGroups.forEach((vg) => {
          (vg.sizes || []).forEach((sz) => {
            if (sz.id) allVisibleIds.push(sz.id);
          });
        });
      }
      if (allVisibleIds.length === 0 && p.id) {
        allVisibleIds.push(p.id);
      }
    } else {
      allVisibleIds.push(p.id);
    }
  });

  const allChecked = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));

  const toggleGroupExpand = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
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
        <SortHeader
          label="Tên hàng"
          sortKey="name"
          currentSort={sortConfig}
          onSort={handleSort}
          className="col-name"
        />
        <SortHeader
          label="Đ.vị"
          sortKey="unit"
          currentSort={sortConfig}
          onSort={handleSort}
          className="col-unit"
        />
        <div className="pi-th col-cprod">Sản phẩm</div>
        <SortHeader
          label="Giá bán"
          sortKey="sellingPrice"
          currentSort={sortConfig}
          onSort={handleSort}
          className="col-ps"
        />
        <SortHeader
          label="Giá vốn"
          sortKey="costPrice"
          currentSort={sortConfig}
          onSort={handleSort}
          className="col-pc"
        />
        <SortHeader
          label="Tồn kho"
          sortKey="onHand"
          currentSort={sortConfig}
          onSort={handleSort}
          className="col-st"
        />
        <SortHeader
          label={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Bán (2 tuần)
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#E2E8F0',
                  color: '#475569',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'help',
                }}
                title="Tổng lượng sản phẩm đã bán trong 2 tuần (14 ngày) gần nhất"
              >
                i
              </span>
            </span>
          }
          sortKey="salesPace"
          currentSort={sortConfig}
          onSort={handleSort}
          className="col-rt"
        />
        <div className="pi-th col-act">Thao tác</div>
      </div>

      {/* Scrollable body */}
      <div className="pi-table-scroll pi-autohide-scroll">
        {loading && (
          <div style={{ textAlign: 'center', color: '#64748B', padding: 32, fontSize: 14 }}>
            Đang tải dữ liệu sản phẩm…
          </div>
        )}
        {!loading && sortedItems.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748B', padding: 32, fontSize: 14 }}>
            Không có sản phẩm nào phù hợp với bộ lọc.
          </div>
        )}
        {!loading &&
          sortedItems.map((p) => {
            if (p.isGroup) {
              const allChildren = [];
              const allChildIds = [];
              const parentImg = p.productImg || p.imageUrl || p.image;
              if (Array.isArray(p.children) && p.children.length > 0) {
                p.children.forEach((c) => {
                  if (c && c.id) {
                    allChildIds.push(c.id);
                    allChildren.push({
                      ...c,
                      productImg: c.productImg || c.imageUrl || c.image || parentImg,
                      parentId: p.id,
                      parentName: p.name,
                      categoryName: p.categoryName,
                      unitName: c.unitName || p.unitName,
                    });
                  }
                });
              } else if (Array.isArray(p.variantGroups)) {
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
                        productImg: sz.productImg || sz.imageUrl || sz.image || parentImg,
                        name: formattedName,
                        unitName: unitStr,
                        sellingPrice: sz.sellingPrice || p.sellingPrice,
                        costPrice: sz.costPrice || p.costPrice,
                        onHand: sz.onHand ?? sz.stock ?? 0,
                        sold14Days: sz.sold14Days ?? (sz.avgDailyRate != null ? Math.round(Number(sz.avgDailyRate) * 14) : undefined),
                        hasOpenPo: sz.hasOpenPo || p.hasOpenPo,
                        primaryAttrValue: primaryVal,
                        sizeValue: sizeVal,
                        categoryName: p.categoryName,
                        parentId: p.id,
                        parentName: p.name,
                        facetStatus: sz.facetStatus || p.facetStatus,
                      });
                    }
                  });
                });
              }

              const isExpanded = expandedGroupIds.has(p.id);
              const groupAllChecked =
                allChildIds.length > 0 && allChildIds.every((id) => selectedIds.has(id));

              if (allChildIds.length <= 1) {
                // If parent has 0 or 1 child/variant, display directly as single standalone item
                const singleTarget = allChildIds.length === 1 ? {
                  ...p,
                  ...allChildren[0],
                  productImg: allChildren[0].productImg || parentImg,
                  name: allChildren[0].name || [p.name, allChildren[0].sizeValue, allChildren[0].primaryAttrValue !== allChildren[0].sizeValue ? allChildren[0].primaryAttrValue : null].filter(Boolean).join('-') || p.name,
                  id: allChildren[0].id,
                  parentId: p.id,
                  categoryName: p.categoryName,
                  unitName: allChildren[0].unitName || p.unitName,
                } : p;

                const targetId = singleTarget.id;
                const checked = selectedIds.has(targetId);

                return (
                  <div className="pi-variant-wrap" key={`single-${targetId}`}>
                    <div
                      className={`pi-row ${checked ? 'row-selected is-selected' : ''}`}
                      onClick={() => onToggle(targetId)}
                    >
                      <div className="pi-td col-cb" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="pi-cb"
                          checked={checked}
                          onChange={() => onToggle(targetId)}
                        />
                      </div>
                      <div className="pi-td col-img">
                        <ProductThumb product={singleTarget} />
                      </div>
                      <div className="pi-td col-name" style={{ fontWeight: 600, color: '#0F172A' }} title={singleTarget.name}>
                        <span>{singleTarget.name}</span>
                        {renderFacetBadge(singleTarget)}
                        {renderOpenPoBadge(singleTarget, onOpenDraftPo)}
                      </div>
                      <div className="pi-td col-unit" style={{ color: '#475569' }}>
                        {singleTarget.unitName || singleTarget.baseUnitName || 'N/A'}
                      </div>
                      <div className="pi-td col-cprod">
                        <div className="cprod">
                          <ProductThumb product={singleTarget} />
                          <div className="cprod-info">
                            <div className="cprod-name">
                              <span>{singleTarget.name}</span>
                              {renderFacetBadge(singleTarget)}
                            </div>
                            <div className="cprod-sub">Mã: {singleTarget.sku || singleTarget.barcode || targetId}</div>
                            {renderOpenPoBadge(singleTarget, onOpenDraftPo)}
                          </div>
                        </div>
                      </div>
                      <div className="pi-td col-ps">{singleTarget.sellingPrice ? Number(singleTarget.sellingPrice).toLocaleString('vi-VN') : 'N/A'}</div>
                      <div className="pi-td col-pc">{singleTarget.costPrice ? Number(singleTarget.costPrice).toLocaleString('vi-VN') : 'N/A'}</div>
                      <div className="pi-td col-st">{renderStockDisplay(singleTarget.onHand)}</div>
                      <div className="pi-td col-rt">{renderSalesPaceDisplay(singleTarget)}</div>
                      <div className="pi-td col-act" onClick={(e) => e.stopPropagation()}>
                        <div className="pi-row-actions">
                          <button
                            type="button"
                            className="pi-act-btn pi-act-btn--primary"
                            title="Cập nhật sản phẩm"
                            onClick={() => onEditProduct?.(singleTarget)}
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={`grp-${p.id}`} className="pi-group">
                  {/* Parent Row */}
                  <div
                    className={`pi-row parent ${groupAllChecked ? 'row-selected is-selected' : ''}`}
                    onClick={() => toggleGroupExpand(p.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="pi-td col-cb" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="pi-cb"
                        checked={groupAllChecked}
                        onChange={() => onToggle(allChildIds)}
                      />
                    </div>
                    <div className="pi-td col-img">
                      <ProductThumb product={p} />
                    </div>
                    <div className="pi-td col-name" style={{ fontWeight: '700', color: '#1E293B' }}>
                      <span>{p.name}</span>
                      <span className="parent-variant-badge" style={{ marginLeft: 8, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 12, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 }}>
                        ({allChildIds.length} phân loại)
                      </span>
                      {renderFacetBadge(p)}
                      {renderOpenPoBadge(p, onOpenDraftPo)}
                    </div>
                    <div className="pi-td col-unit" style={{ color: '#475569' }}>
                      {p.unitName || p.baseUnitName || 'N/A'}
                    </div>
                    <div className="pi-td col-cprod">
                      <div className="cprod">
                        <ProductThumb product={p} />
                        <div className="cprod-info">
                          <div className="cprod-name">
                            <span>{p.name}</span>
                            {renderFacetBadge(p)}
                          </div>
                          <div className="cprod-sub">({allChildIds.length} mặt hàng con)</div>
                          {renderOpenPoBadge(p, onOpenDraftPo)}
                        </div>
                      </div>
                    </div>
                    <div className="pi-td col-ps">
                      {p.sellingPrice ? Number(p.sellingPrice).toLocaleString('vi-VN') : 'N/A'}
                    </div>
                    <div className="pi-td col-pc">
                      {p.costPrice ? Number(p.costPrice).toLocaleString('vi-VN') : 'N/A'}
                    </div>
                    <div className="pi-td col-st">{renderStockDisplay(p.onHand)}</div>
                    <div className="pi-td col-rt">{renderSalesPaceDisplay(p)}</div>
                    <div className="pi-td col-act" onClick={(e) => e.stopPropagation()}>
                      <div className="pi-row-actions">
                        <button
                          type="button"
                          className="pi-act-btn pi-act-btn--primary"
                          title="Cập nhật sản phẩm"
                          onClick={() => onEditProduct?.(p)}
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Child Variant Rows */}
                  {isExpanded && (
                    <div className="pi-variant-block" style={{ paddingLeft: 12, backgroundColor: '#F8FAFC' }}>
                      {allChildren.map((child) => {
                        const isChildSelected = selectedIds.has(child.id);
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
                              className={`pi-row variant child-variant-row ${isChildSelected ? 'row-selected is-selected' : ''}`}
                              style={{ borderLeft: '3px solid #3B82F6', marginTop: 2, marginBottom: 2 }}
                              onClick={() => onToggle(child.id)}
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
                              <div className="pi-td col-name" style={{ fontWeight: 500 }} title={childNameFormatted}>
                                <span>{childNameFormatted}</span>
                                {renderFacetBadge(child)}
                                {renderOpenPoBadge(child, onOpenDraftPo)}
                              </div>
                              <div className="pi-td col-unit" style={{ color: '#475569' }}>
                                {child.unitName || p.unitName || 'N/A'}
                              </div>
                              <div className="pi-td col-cprod">
                                <div className="cprod">
                                  <ProductThumb product={child} />
                                  <div className="cprod-info">
                                    <div className="cprod-name" style={{ fontWeight: 600 }}>
                                      <span>{childNameFormatted}</span>
                                      {renderFacetBadge(child)}
                                    </div>
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
                                    {renderOpenPoBadge(child, onOpenDraftPo)}
                                  </div>
                                </div>
                              </div>
                              <div className="pi-td col-ps">
                                {child.sellingPrice ? Number(child.sellingPrice).toLocaleString('vi-VN') : 'N/A'}
                              </div>
                              <div className="pi-td col-pc">
                                {child.costPrice ? Number(child.costPrice).toLocaleString('vi-VN') : 'N/A'}
                              </div>
                              <div className="pi-td col-st">{renderStockDisplay(child.onHand)}</div>
                              <div className="pi-td col-rt">{renderSalesPaceDisplay(child)}</div>
                              <div className="pi-td col-act" onClick={(e) => e.stopPropagation()}>
                                <div className="pi-row-actions">
                                  <button
                                    type="button"
                                    className="pi-act-btn pi-act-btn--primary"
                                    title="Cập nhật sản phẩm"
                                    onClick={() => onEditProduct?.(child)}
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
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

              return (
                <div className="pi-variant-wrap" key={`standalone-${p.id}`}>
                  <div
                    className={`pi-row ${checked ? 'row-selected is-selected' : ''}`}
                    onClick={() => onToggle(p.id)}
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
                    <div className="pi-td col-name" style={{ fontWeight: 600, color: '#0F172A' }} title={p.name}>
                      <span>{p.name}</span>
                      {renderFacetBadge(p)}
                      {renderOpenPoBadge(p, onOpenDraftPo)}
                    </div>
                    <div className="pi-td col-unit" style={{ color: '#475569' }}>
                      {p.unitName || p.baseUnitName || 'N/A'}
                    </div>
                    <div className="pi-td col-cprod">
                      <div className="cprod">
                        <ProductThumb product={p} />
                        <div className="cprod-info">
                          <div className="cprod-name">
                            <span>{p.name}</span>
                            {renderFacetBadge(p)}
                          </div>
                          <div className="cprod-sub">Mã: {p.sku || p.id}</div>
                          {renderOpenPoBadge(p, onOpenDraftPo)}
                        </div>
                      </div>
                    </div>
                    <div className="pi-td col-ps">{p.sellingPrice ? Number(p.sellingPrice).toLocaleString('vi-VN') : 'N/A'}</div>
                    <div className="pi-td col-pc">{p.costPrice ? Number(p.costPrice).toLocaleString('vi-VN') : 'N/A'}</div>
                    <div className="pi-td col-st">{renderStockDisplay(p.onHand)}</div>
                    <div className="pi-td col-rt">{renderSalesPaceDisplay(p)}</div>
                    <div className="pi-td col-act" onClick={(e) => e.stopPropagation()}>
                      <div className="pi-row-actions">
                        <button
                          type="button"
                          className="pi-act-btn pi-act-btn--primary"
                          title="Cập nhật sản phẩm"
                          onClick={() => onEditProduct?.(p)}
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
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
          <span>
            Trang {page + 1} / {Math.max(1, totalPages)}
          </span>
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
