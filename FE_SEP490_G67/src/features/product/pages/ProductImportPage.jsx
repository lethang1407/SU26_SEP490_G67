import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductFacet from '../components/ProductFacet';
import ProductImportTable from '../components/ProductImportTable';
import ImportPanel from '../components/ImportPanel';
import ProductDetailDrawer from '../components/ProductDetailDrawer';
import { productsApi } from '../api';
import { importOrderApi } from '../api/importOrderApi';
import { categoriesApi } from '../../category/api';
import { suppliersApi } from '../../supplier/api';
import { PAGE_SIZE } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Product.css';

function buildCoverOverrides(productIds, overrides) {
  const map = {};
  productIds.forEach((id) => {
    if (overrides[id]?.coverDays != null) {
      map[id] = overrides[id].coverDays;
    }
  });
  return map;
}

function resolveOrderDate(item, ov) {
  const timing =
    ov?.orderTiming ?? (item.orderToday === false ? 'lead' : 'today');
  if (timing !== 'lead') {
    return new Date().toISOString().slice(0, 10);
  }
  const lead = Number(ov?.leadTimeDays ?? item.leadTimeDays ?? 3);
  const d = new Date();
  d.setDate(d.getDate() + Math.max(lead, 0));
  return d.toISOString().slice(0, 10);
}

function confirmOpenPoAdd(entries) {
  if (!entries.length) return true;
  const sample = entries
    .slice(0, 3)
    .map((e) => `${e.name || `#${e.id}`} (${e.code})`)
    .join(', ');
  const more = entries.length > 3 ? ` và ${entries.length - 3} SP khác` : '';
  return window.confirm(
    `Các sản phẩm sau đang nằm trên phiếu tạm DRAFT: ${sample}${more}.\nVẫn thêm vào đơn mới?`,
  );
}

function validateLines(panelItems, overrides) {
  const errors = [];
  if (!panelItems.length) {
    errors.push('Chưa có sản phẩm nào để tạo đơn.');
    return errors;
  }

  panelItems.forEach((item) => {
    const ov = overrides[item.productId] || {};
    const unitBase = Number(ov.unitBase ?? 1) || 1;
    const packQty = ov.quantity ?? item.suggestedQty;
    const qty = Math.round(Number(packQty || 0) * unitBase);
    const supplierId = ov.supplierId ?? item.supplierId;
    const name = item.productName || `#${item.productId}`;

    if (!item.productId) {
      errors.push(`Thiếu mã sản phẩm: ${name}`);
    }
    if (!supplierId || Number(supplierId) <= 0) {
      errors.push(`Chưa có nhà cung cấp hợp lệ cho “${name}”.`);
    }
    if (packQty == null || Number(packQty) <= 0 || qty <= 0) {
      errors.push(`Số lượng phải > 0 cho “${name}”.`);
    }
  });

  return errors;
}

export default function ProductImportPage() {
  const [facet, setFacet] = useState('hot');
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [panelItems, setPanelItems] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [step, setStep] = useState('setup');
  const [creating, setCreating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openPoById, setOpenPoById] = useState(() => ({}));
  const [supplierFallback, setSupplierFallback] = useState([]);
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const panelIdsRef = useRef(new Set());
  panelIdsRef.current = new Set(panelItems.map((p) => p.productId));
  const detailRequestRef = useRef(0);

  const openDetail = useCallback(async (listItem) => {
    if (!listItem?.id) return;
    const requestId = ++detailRequestRef.current;
    setDetailProduct(listItem);
    try {
      const detail = await productsApi.getById(listItem.id);
      if (detailRequestRef.current !== requestId || !detail) return;
      setDetailProduct({
        ...listItem,
        ...detail,
        avgDailyRate: listItem.avgDailyRate,
        avgWeeklyRate: listItem.avgWeeklyRate,
        onHand: listItem.onHand,
        coverDaysLeft: listItem.coverDaysLeft,
        facetStatus: listItem.facetStatus,
        unitName: detail.baseUnitName || listItem.unitName,
        supplierName: detail.supplierName || listItem.supplierName,
        categoryCoverDays: listItem.categoryCoverDays ?? detail.categoryCoverDays,
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const closeDetail = () => {
    detailRequestRef.current += 1;
    setDetailProduct(null);
  };

  useEffect(() => {
    categoriesApi
      .getAllCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
    suppliersApi
      .getSuppliers({ page: 0, size: 200 })
      .then((pageRes) => {
        const list = pageRes?.content || pageRes?.items || [];
        setSupplierFallback(
          (Array.isArray(list) ? list : []).map((s) => ({
            id: s.id,
            name: s.name,
            leadTimeDays: s.leadTimeDays ?? 3,
            costPerUnit: null,
            cheapest: false,
          })),
        );
      })
      .catch(() => setSupplierFallback([]));
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await productsApi.getProducts({
        facet,
        categoryId: typeof categoryId === 'number' ? categoryId : undefined,
        keyword: keyword || undefined,
        page,
        size: PAGE_SIZE,
      });
      const content = result.content || [];
      setProducts(content);
      setTotalElements(result.totalElements || 0);
      setTotalPages(Math.max(1, result.totalPages || 1));
      setOpenPoById((prev) => {
        const next = { ...prev };
        content.forEach((p) => {
          if (p.openPoCode) {
            next[p.id] = {
              code: p.openPoCode,
              qty: p.openPoQty,
              name: p.name,
            };
          } else {
            delete next[p.id];
          }
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      setProducts([]);
      setTotalElements(0);
      setTotalPages(1);
      setErrorMsg(
        err?.response?.data?.message ||
          'Không tải được danh sách sản phẩm. Kiểm tra kết nối API.',
      );
    } finally {
      setLoading(false);
    }
  }, [facet, categoryId, keyword, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const timers = new Map();
    const onScroll = (e) => {
      const el = e.target;
      if (!(el instanceof Element) || !el.classList.contains('pi-autohide-scroll')) {
        return;
      }
      el.classList.add('is-scrolling');
      const prev = timers.get(el);
      if (prev) clearTimeout(prev);
      timers.set(
        el,
        setTimeout(() => {
          el.classList.remove('is-scrolling');
          timers.delete(el);
        }, 1000),
      );
    };
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!detailProduct) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setDetailProduct(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailProduct]);

  const removeFromPanel = useCallback((ids) => {
    const removeSet = new Set(ids);
    setPanelItems((prev) => {
      const remaining = prev.filter((p) => !removeSet.has(p.productId));
      if (remaining.length === 0) {
        setIsOrderPanelOpen(false);
      }
      return remaining;
    });
    setOverrides((prev) => {
      const next = { ...prev };
      removeSet.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      removeSet.forEach((id) => next.delete(id));
      selectedIdsRef.current = next;
      if (next.size === 0) {
        setIsOrderPanelOpen(false);
      }
      return next;
    });
  }, []);

  /** Gộp gợi ý vào panel — giữ SP đã chọn từ facet khác */
  const addToPanel = useCallback(
    async (ids, { skipOpenPoConfirm = false } = {}) => {
      const want = [...new Set(ids)].filter((id) => id != null);
      if (!want.length) return;

      if (!skipOpenPoConfirm) {
        const openEntries = want
          .filter((id) => openPoById[id] && !panelIdsRef.current.has(id))
          .map((id) => ({
            id,
            name: openPoById[id].name,
            code: openPoById[id].code,
          }));
        if (!confirmOpenPoAdd(openEntries)) return;
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        want.forEach((id) => next.add(id));
        selectedIdsRef.current = next;
        return next;
      });

      const missing = want.filter((id) => !panelIdsRef.current.has(id));
      if (!missing.length) {
        setStep('setup');
        return;
      }

      setSuggesting(true);
      setErrorMsg('');
      setSuccessMsg('');
      try {
        const coverOverrides = buildCoverOverrides(missing, overrides);
        const suggestions = await importOrderApi.getSuggestions(missing, coverOverrides);

        setPanelItems((prev) => {
          const byId = new Map(prev.map((p) => [p.productId, p]));
          const selected = selectedIdsRef.current;
          (suggestions || []).forEach((s) => {
            if (selected.has(s.productId) && !byId.has(s.productId)) {
              byId.set(s.productId, s);
            }
          });
          const kept = prev.filter((p) => selected.has(p.productId));
          const keptIds = new Set(kept.map((p) => p.productId));
          const added = (suggestions || []).filter(
            (s) => selected.has(s.productId) && !keptIds.has(s.productId),
          );
          return [...kept, ...added];
        });
        setOverrides((prev) => {
          const next = { ...prev };
          (suggestions || []).forEach((s) => {
            if (!selectedIdsRef.current.has(s.productId)) return;
            const units = Array.isArray(s.units) ? s.units : [];
            const baseUnit =
              units.find((u) => u.isBase || Number(u.unitBase) === 1) ||
              units[0];
            const unitBase = Number(baseUnit?.unitBase ?? 1) || 1;
            const existing = next[s.productId] || {};
            next[s.productId] = {
              ...existing,
              supplierId: existing.supplierId ?? s.supplierId,
              supplierName: existing.supplierName ?? s.supplierName,
              costPerUnit: existing.costPerUnit ?? s.costPerUnit,
              leadTimeDays: existing.leadTimeDays ?? s.leadTimeDays,
              productUnitId: existing.productUnitId ?? baseUnit?.id ?? null,
              unitName: existing.unitName ?? baseUnit?.name ?? 'sp',
              unitBase: existing.unitBase ?? unitBase,
              quantity:
                existing.quantity ??
                Math.max(1, Math.ceil(Number(s.suggestedQty || 0) / unitBase)),
            };
          });
          return next;
        });
        setStep('setup');
      } catch (err) {
        console.error(err);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          missing.forEach((id) => {
            if (!panelIdsRef.current.has(id)) next.delete(id);
          });
          return next;
        });
        setErrorMsg(
          err?.response?.data?.message ||
            'Không lấy được gợi ý nhập hàng. Kiểm tra API / quyền truy cập.',
        );
      } finally {
        setSuggesting(false);
      }
    },
    [overrides, openPoById],
  );

  const handleFacetChange = (key) => {
    setFacet(key);
    setPage(0);
    setDetailProduct(null);
    setSuccessMsg('');
  };

  const handleToggle = (ids) => {
    const idArr = Array.isArray(ids) ? ids : [ids];
    const allSelected = idArr.every(id => selectedIdsRef.current.has(id));
    if (allSelected) {
      removeFromPanel(idArr);
    } else {
      addToPanel(idArr);
    }
  };

  const handleToggleAll = (checked) => {
    const pageIds = [];
    products.forEach((p) => {
      if (p.isGroup) {
        (p.variantGroups || []).forEach((vg) => {
          (vg.sizes || []).forEach((sz) => {
            if (sz.id) pageIds.push(sz.id);
          });
        });
      } else {
        if (p.id) pageIds.push(p.id);
      }
    });
    if (!pageIds.length) return;
    if (checked) {
      addToPanel(pageIds);
    } else {
      removeFromPanel(pageIds);
    }
  };

  const clearAllSelection = () => {
    selectedIdsRef.current = new Set();
    setSelectedIds(new Set());
    setPanelItems([]);
    setOverrides({});
    setStep('setup');
    setErrorMsg('');
    setIsOrderPanelOpen(false);
  };

  const handleCreate = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const validationErrors = validateLines(panelItems, overrides);
    if (validationErrors.length) {
      setErrorMsg(validationErrors.join('\n'));
      setStep('setup');
      return;
    }

    const openOnCreate = panelItems
      .filter((item) => openPoById[item.productId])
      .map((item) => ({
        id: item.productId,
        name: item.productName || openPoById[item.productId]?.name,
        code: openPoById[item.productId].code,
      }));
    if (
      openOnCreate.length &&
      !window.confirm(
        `Có ${openOnCreate.length} sản phẩm đang trên phiếu tạm DRAFT. Vẫn tạo đơn mới?`,
      )
    ) {
      return;
    }

    const lines = panelItems.map((item) => {
      const ov = overrides[item.productId] || {};
      const cost = ov.costPerUnit ?? item.costPerUnit;
      const unitBase = Number(ov.unitBase ?? 1) || 1;
      const packQty = Number(ov.quantity ?? item.suggestedQty) || 0;
      const baseQty = Math.max(1, Math.round(packQty * unitBase));
      return {
        productId: item.productId,
        supplierId: Number(ov.supplierId ?? item.supplierId),
        quantity: baseQty,
        coverDays: Number(ov.coverDays ?? item.coverDays ?? 7),
        orderDate: resolveOrderDate(item, ov),
        ...(cost != null ? { costPerUnit: Number(cost) } : {}),
      };
    });

    setCreating(true);
    try {
      const created = await importOrderApi.createOrders(lines);
      const codes = (created || []).map((o) => o.orderCode).filter(Boolean);
      clearAllSelection();
      setSuccessMsg(
        codes.length
          ? `Đã tạo ${codes.length} đơn nhập: ${codes.join(', ')}.`
          : 'Đã tạo đơn nhập thành công.',
      );
      await loadProducts();
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.message ||
          'Không tạo được đơn nhập. Kiểm tra NCC, số lượng và API.',
      );
    } finally {
      setCreating(false);
    }
  };

  const showStatusNote = Boolean(errorMsg || successMsg);

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        productCount: c.productCount ?? 0,
      })),
    [categories],
  );

  return (
    <div className="admin-layout">
      <SideBar />
      <div className="admin-content">
        <AdminHeader />
        <main
          className={`admin-main product-import-page ${detailProduct ? 'detail-open' : ''}`}
        >
          <div className="pi-main">
            <div className="pi-head">
              <div>
                <h1>Nhập sản phẩm</h1>
                {showStatusNote ? (
                  <div
                    className={`page-note${errorMsg ? ' page-note--error' : ''}${successMsg && !errorMsg ? ' page-note--ok' : ''}`}
                  >
                    {errorMsg || successMsg}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="pi-content">
              <ProductFacet
                facet={facet}
                onFacetChange={handleFacetChange}
                categories={categoryOptions}
                categoryId={categoryId}
                onCategoryChange={(id) => {
                  setCategoryId(id);
                  setPage(0);
                }}
              />

              <section className={`pi-results ${isOrderPanelOpen ? 'compact' : ''}`} id="piResults">
                <div className="pi-zone-head">Danh sách sản phẩm</div>
                <div className="pi-search">
                  <div className="pi-search-inner">
                    <Search size={16} />
                    <input
                      placeholder="Tìm tên, SKU, mã vạch…"
                      value={keyword}
                      onChange={(e) => {
                        setKeyword(e.target.value);
                        setPage(0);
                      }}
                    />
                  </div>
                </div>

                <ProductImportTable
                  items={products}
                  loading={loading}
                  facet={facet}
                  selectedIds={selectedIds}
                  detailProductId={detailProduct?.id ?? null}
                  isOrderPanelOpen={isOrderPanelOpen}
                  onToggle={handleToggle}
                  onToggleAll={handleToggleAll}
                  onOpenDetail={openDetail}
                  page={page}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  onPageChange={setPage}
                />
              </section>

              <ImportPanel
                isOpen={isOrderPanelOpen}
                panelItems={panelItems}
                overrides={overrides}
                step={step}
                suggesting={suggesting}
                supplierFallback={supplierFallback}
                onChangeQty={(id, quantity) =>
                  setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], quantity } }))
                }
                onChangeCover={(id, coverDays) =>
                  setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], coverDays } }))
                }
                onChangeSupplier={(id, supplier) =>
                  setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...supplier } }))
                }
                onChangeOrderTiming={(id, orderTiming) =>
                  setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], orderTiming } }))
                }
                onChangeUnit={(id, unitPatch) =>
                  setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...unitPatch } }))
                }
                onRemove={(id) => removeFromPanel([id])}
                onPreview={() => {
                  const errs = validateLines(panelItems, overrides);
                  if (errs.length) {
                    setErrorMsg(errs.join('\n'));
                    return;
                  }
                  setErrorMsg('');
                  setStep('preview');
                }}
                onBackSetup={() => setStep('setup')}
                onCreate={handleCreate}
                onClose={() => setIsOrderPanelOpen(false)}
                creating={creating}
              />
            </div>

            {selectedIds.size > 0 && !isOrderPanelOpen && (
              <button
                type="button"
                className="floating-btn show"
                onClick={() => {
                  setIsOrderPanelOpen(true);
                  setDetailProduct(null);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Xem đơn chuẩn bị
                <span className="floating-badge">{selectedIds.size}</span>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
