import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, QrCode, ScanLine, ShoppingCart, X } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';

import ProductImportTable from '../components/ProductImportTable';
import ImportPanel from '../components/ImportPanel';
import ProductStockCardModal from '../components/ProductStockCardModal';
import UnitConversionModal from '../components/UnitConversionModal';
import ProductEditModal from '../components/ProductEditModal';
import QuickBarcodeScanModal from '../components/QuickBarcodeScanModal';
import DraftPoWarningModal from '../components/DraftPoWarningModal';
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
  const days = Number(ov?.leadTimeDays ?? item.leadTimeDays ?? 3) || 3;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function confirmOpenPoAdd(openEntries) {
  if (!openEntries.length) return true;
  const lines = openEntries.map(
    (e) => `• ${e.name} (Đơn DRAFT: ${e.code})`,
  );
  return window.confirm(
    `Các sản phẩm sau đang có đơn DRAFT mở:\n\n${lines.join('\n')}\n\nBạn có chắc muốn thêm tiếp vào đơn này?`,
  );
}

function validateLines(panelItems, overrides) {
  const errors = [];
  panelItems.forEach((item) => {
    const ov = overrides[item.productId] || {};
    const supplierId = ov.supplierId ?? item.supplierId;
    const qty = Number(ov.quantity ?? item.suggestedQty) || 0;
    const packQty = ov.quantity ?? item.suggestedQty;
    const name = item.productName || `SP #${item.productId}`;

    if (!supplierId) {
      errors.push(`Chưa chọn nhà cung cấp cho “${name}”.`);
    }
    if (packQty == null || Number(packQty) <= 0 || qty <= 0) {
      errors.push(`Số lượng phải > 0 cho “${name}”.`);
    }
  });

  return errors;
}

export default function ProductImportPage() {
  const navigate = useNavigate();
  const [facet, setFacet] = useState('all');
  const [searchName, setSearchName] = useState('');
  const [debouncedSearchName, setDebouncedSearchName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialBarcode, setCreateModalInitialBarcode] = useState('');
  const [isBarcodeScanModalOpen, setIsBarcodeScanModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Persistent State for Draft Order Panel
  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('pi_draft_selected_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [panelItems, setPanelItems] = useState(() => {
    try {
      const saved = localStorage.getItem('pi_draft_panel_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [overrides, setOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('pi_draft_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [step, setStep] = useState('setup');
  const [creating, setCreating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [stockCardProduct, setStockCardProduct] = useState(null);
  const [unitModalProduct, setUnitModalProduct] = useState(null);
  const [editModalProduct, setEditModalProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openPoById, setOpenPoById] = useState(() => ({}));
  const [supplierFallback, setSupplierFallback] = useState([]);
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const [draftPoWarning, setDraftPoWarning] = useState({
    isOpen: false,
    items: [],
    pendingIds: [],
  });

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const panelIdsRef = useRef(new Set());
  panelIdsRef.current = new Set(panelItems.map((p) => p.productId));

  // Sync draft order to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pi_draft_selected_ids', JSON.stringify(Array.from(selectedIds)));
    } catch { }
  }, [selectedIds]);

  useEffect(() => {
    try {
      localStorage.setItem('pi_draft_panel_items', JSON.stringify(panelItems));
    } catch { }
  }, [panelItems]);

  useEffect(() => {
    try {
      localStorage.setItem('pi_draft_overrides', JSON.stringify(overrides));
    } catch { }
  }, [overrides]);
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
        onHand: detail.stock ?? detail.onHand ?? listItem.onHand ?? 0,
        supplierName:
          detail.supplierName ||
          detail.supplier ||
          listItem.supplierName ||
          '',
        leadTimeDays: detail.leadTimeDays ?? listItem.leadTimeDays ?? 3,
        safetyStock: detail.safetyStock ?? listItem.safetyStock ?? 0,
        pendingPoQty: detail.pendingPoQty ?? listItem.pendingPoQty ?? 0,
        avgDailyRate:
          detail.avgDailySalesRate ??
          detail.avgDailyRate ??
          listItem.avgDailyRate ??
          0,
        units: Array.isArray(detail.units) ? detail.units : listItem.units,
      });
    } catch {
      // keep basic item
    }
  }, []);

  const closeDetail = () => {
    detailRequestRef.current += 1;
    setDetailProduct(null);
  };

  const loadCategories = useCallback(() => {
    categoriesApi
      .getAllCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    loadCategories();
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
  }, [loadCategories]);

  // Debounce product name search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchName(searchName.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchName]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await productsApi.getProducts({
        facet,
        categoryId: typeof categoryId === 'number' ? categoryId : undefined,
        keyword: debouncedSearchName || undefined,
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
          if (p.openPoCode || p.openPoId) {
            next[p.id] = {
              id: p.id,
              orderId: p.openPoId,
              code: p.openPoCode,
              qty: p.openPoQty,
              name: p.name,
              unitName: p.unitName,
            };
          } else {
            delete next[p.id];
          }
          if (Array.isArray(p.children)) {
            p.children.forEach((c) => {
              if (c.openPoCode || c.openPoId) {
                next[c.id] = {
                  id: c.id,
                  orderId: c.openPoId,
                  code: c.openPoCode,
                  qty: c.openPoQty,
                  name: c.name,
                  unitName: c.unitName || p.unitName,
                };
              } else if (c.id) {
                delete next[c.id];
              }
            });
          }
          if (p.isGroup && Array.isArray(p.variantGroups)) {
            p.variantGroups.forEach((vg) => {
              (vg.sizes || []).forEach((sz) => {
                if (sz.openPoCode || sz.openPoId) {
                  next[sz.id] = {
                    id: sz.id,
                    orderId: sz.openPoId,
                    code: sz.openPoCode,
                    qty: sz.openPoQty,
                    name: sz.name,
                    unitName: sz.unitName || p.unitName,
                  };
                } else if (sz.id) {
                  delete next[sz.id];
                }
              });
            });
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
  }, [facet, categoryId, debouncedSearchName, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Global Hardware Barcode Scanner listener on product page
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalScan = async (e) => {
      // Don't capture when typing inside an input/textarea or when modals are open
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      if (isCreateModalOpen || editModalProduct || stockCardProduct || unitModalProduct || isBarcodeScanModalOpen) {
        return;
      }
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        const code = buffer.trim();
        if (code.length >= 3) {
          e.preventDefault();
          buffer = '';
          try {
            const found = await productsApi.getByBarcode(code);
            if (found && found.id) {
              setEditModalProduct(found);
              setSuccessMsg(`Đã nhận diện sản phẩm: ${found.name}`);
            } else {
              setCreateModalInitialBarcode(code);
              setIsCreateModalOpen(true);
              setSuccessMsg(`Mã vạch "${code}" chưa có trong kho. Bạn có thể tạo mới ngay!`);
            }
          } catch {
            setCreateModalInitialBarcode(code);
            setIsCreateModalOpen(true);
            setSuccessMsg(`Mã vạch "${code}" chưa có trong kho. Bạn có thể tạo mới ngay!`);
          }
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleGlobalScan);
    return () => window.removeEventListener('keydown', handleGlobalScan);
  }, [isCreateModalOpen, editModalProduct, stockCardProduct, unitModalProduct, isBarcodeScanModalOpen]);

  const handleDeleteProduct = useCallback(async (product) => {
    if (!product?.id) return;
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`);
    if (!confirmed) return;

    try {
      await productsApi.delete(product.id);
      setSuccessMsg(`Đã xóa sản phẩm "${product.name}" thành công.`);
      loadProducts();
    } catch {
      setErrorMsg(`Không thể xóa sản phẩm "${product.name}". Vui lòng thử lại sau.`);
    }
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

  const removeFromPanel = useCallback((rawIds) => {
    const arr = Array.isArray(rawIds) ? rawIds.flat(Infinity) : [rawIds];
    const removeSet = new Set();
    arr.forEach((id) => {
      if (id != null) {
        removeSet.add(Number(id));
        removeSet.add(String(id));
      }
    });

    setPanelItems((prev) => {
      const remaining = prev.filter(
        (p) =>
          !removeSet.has(Number(p.productId || p.id)) &&
          !removeSet.has(String(p.productId || p.id)),
      );
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
      removeSet.forEach((id) => {
        next.delete(id);
        next.delete(Number(id));
        next.delete(String(id));
      });
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
            orderId: openPoById[id].orderId,
            name: openPoById[id].name,
            code: openPoById[id].code,
            qty: openPoById[id].qty,
            unitName: openPoById[id].unitName,
          }));

        if (openEntries.length > 0) {
          setDraftPoWarning({
            isOpen: true,
            items: openEntries,
            pendingIds: want,
          });
          return;
        }
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
        if (Array.isArray(p.children) && p.children.length > 0) {
          p.children.forEach((c) => {
            if (c.id) pageIds.push(c.id);
          });
        } else if (Array.isArray(p.variantGroups)) {
          p.variantGroups.forEach((vg) => {
            (vg.sizes || []).forEach((sz) => {
              if (sz.id) pageIds.push(sz.id);
            });
          });
        }
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

  const handleConfirmDraftAdd = () => {
    const ids = draftPoWarning.pendingIds;
    setDraftPoWarning({ isOpen: false, items: [], pendingIds: [] });
    if (ids && ids.length) {
      addToPanel(ids, { skipOpenPoConfirm: true });
    }
  };

  const handleCancelDraftAdd = () => {
    const affectedIds = new Set(draftPoWarning.items.map((i) => i.id));
    const cleanIds = (draftPoWarning.pendingIds || []).filter((id) => !affectedIds.has(id));
    setDraftPoWarning({ isOpen: false, items: [], pendingIds: [] });
    if (cleanIds.length > 0) {
      addToPanel(cleanIds, { skipOpenPoConfirm: true });
    }
  };

  const handleOpenDraftPo = (orderId) => {
    if (orderId) {
      navigate(`/admin/warehouse/import/${orderId}/edit`);
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
    try {
      localStorage.removeItem('pi_draft_selected_ids');
      localStorage.removeItem('pi_draft_panel_items');
      localStorage.removeItem('pi_draft_overrides');
    } catch { }
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
      clearAllSelection();
      setIsOrderPanelOpen(false);

      if (Array.isArray(created) && created.length > 0 && created[0]?.id) {
        const firstPoId = created[0].id;
        navigate(`/admin/warehouse/import/${firstPoId}/edit`);
        return;
      }

      const codes = (created || []).map((o) => o.orderCode).filter(Boolean);
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
    <div className="admin-content">
      <AdminHeader />
      <main className="admin-main product-import-page">
        <div className="pi-main">
          <div className="pi-content">
            <section className="pi-results" id="piResults">
              {/* ─── Unified Card Header ─── */}
              <div className="pi-card-head">
                <div className="pi-card-title-wrap">
                  <h1 className="pi-card-title">Danh sách hàng hóa</h1>
                  {showStatusNote ? (
                    <span
                      className={`page-note${errorMsg ? ' page-note--error' : ''}${successMsg && !errorMsg ? ' page-note--ok' : ''}`}
                      style={{ margin: 0, padding: '4px 10px' }}
                    >
                      {errorMsg || successMsg}
                    </span>
                  ) : null}
                </div>

                <div className="pi-head-actions">
                  {(selectedIds.size > 0 || panelItems.length > 0) && (
                    <div className="pi-head-action-group">
                      <button
                        type="button"
                        className="pi-btn-action pi-btn-action--secondary"
                        onClick={() => setIsOrderPanelOpen(true)}
                        style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
                      >
                        <ShoppingCart size={16} />
                        Đơn chuẩn bị ({panelItems.length || selectedIds.size})
                      </button>
                      <button
                        type="button"
                        className="pi-btn-clear-selection"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearAllSelection();
                        }}
                        title="Bỏ chọn tất cả và xóa đơn chuẩn bị"
                        aria-label="Bỏ chọn tất cả"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="pi-btn-action pi-btn-action--primary"
                    onClick={() => {
                      setCreateModalInitialBarcode('');
                      setIsCreateModalOpen(true);
                    }}
                  >
                    <Plus size={16} />
                    Thêm hàng hóa
                  </button>
                </div>
              </div>

              {/* ─── Unified Card Filter Toolbar ─── */}
              <div className="pi-card-filter-toolbar">
                {/* Ô tìm kiếm theo tên hàng hóa tích hợp nút quét mã vạch */}
                <div className="pi-filter-search">
                  <Search size={14} />
                  <input
                    placeholder="Tìm kiếm theo tên hàng hóa…"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pi-search-barcode-btn"
                    onClick={() => setIsBarcodeScanModalOpen(true)}
                    title="Quét mã vạch barcode"
                    aria-label="Quét mã vạch"
                  >
                    <ScanLine size={15} />
                  </button>
                </div>

                {/* Dropdown 1: Danh mục (Đẩy lên trước) */}
                <select
                  className={`pi-filter-select${categoryId !== null ? ' is-active' : ''}`}
                  value={categoryId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryId(val === '' ? null : Number(val));
                    setPage(0);
                  }}
                >
                  <option value="">-- Danh mục --</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Dropdown 2: Tình trạng hàng hóa / Tồn kho */}
                <select
                  className={`pi-filter-select${facet !== 'all' ? ' is-active' : ''}`}
                  value={facet}
                  onChange={(e) => handleFacetChange(e.target.value)}
                  title="Lọc theo tình trạng hàng hóa"
                >
                  <option value="all">-- Tình trạng (Tất cả) --</option>
                  <option value="new">🆕 Mới tạo (cần nhập lần đầu)</option>
                  <option value="hot">🔴 Hết hàng – Bán chạy (cần nhập ngay)</option>
                  <option value="warn">🟠 Cảnh báo sắp hết hàng</option>
                  <option value="ok">🟢 Đang kinh doanh (tồn an toàn)</option>
                  <option value="season">🟣 Hàng mùa vụ</option>
                  <option value="slow">⚪ Hết hàng – Ít bán</option>
                  <option value="stop">⛔ Ngừng kinh doanh</option>
                </select>

                {/* Nút Xóa lọc sát lề phải */}
                {(facet !== 'all' || categoryId !== null || searchName) && (
                  <div className="pi-filter-actions-right">
                    <button
                      type="button"
                      className="pi-filter-clear"
                      onClick={() => {
                        setFacet('all');
                        setCategoryId(null);
                        setSearchName('');
                        setPage(0);
                        setSuccessMsg('');
                      }}
                    >
                      ✕ Xóa lọc
                    </button>
                  </div>
                )}
              </div>

              <ProductImportTable
                items={products}
                loading={loading}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                onDeleteProduct={handleDeleteProduct}
                onManageUnits={(p) => setUnitModalProduct(p)}
                onEditProduct={(p) => setEditModalProduct(p)}
                onViewStockCard={(p) => setStockCardProduct(p)}
                onOpenDraftPo={handleOpenDraftPo}
                page={page}
                totalPages={totalPages}
                totalElements={totalElements}
                onPageChange={setPage}
              />
            </section>
          </div>

          {(selectedIds.size > 0 || panelItems.length > 0) && !isOrderPanelOpen && (
            <div className="floating-btn-wrap show">
              <button
                type="button"
                className="floating-btn-main"
                onClick={() => {
                  setIsOrderPanelOpen(true);
                }}
              >
                <ShoppingCart size={18} />
                Xem đơn chuẩn bị
                <span className="floating-badge">{panelItems.length || selectedIds.size}</span>
              </button>
              <div className="floating-btn-divider" />
              <button
                type="button"
                className="floating-btn-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAllSelection();
                }}
                title="Bỏ chọn tất cả và xóa đơn chuẩn bị"
                aria-label="Bỏ chọn tất cả"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Pop-up Chuẩn bị đơn nhập hàng */}
        <ImportPanel
          isOpen={isOrderPanelOpen}
          panelItems={panelItems}
          overrides={overrides}
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
          onRemove={(id) => removeFromPanel(id)}
          onCreate={handleCreate}
          onClose={() => setIsOrderPanelOpen(false)}
          creating={creating}
        />

        {/* Pop-up Thẻ kho & Lịch sử giá */}
        <ProductStockCardModal
          isOpen={Boolean(stockCardProduct)}
          onClose={() => setStockCardProduct(null)}
          product={stockCardProduct}
        />

        {/* Pop-up Quản lý quy đổi đơn vị (Image 1) */}
        <UnitConversionModal
          isOpen={Boolean(unitModalProduct)}
          onClose={() => setUnitModalProduct(null)}
          product={unitModalProduct}
          onUnitUpdated={() => {
            loadProducts();
          }}
        />

        {/* Pop-up Cập nhật hàng hóa (Image 2) */}
        <ProductEditModal
          isOpen={Boolean(editModalProduct)}
          onClose={() => setEditModalProduct(null)}
          product={editModalProduct}
          onProductUpdated={() => {
            loadProducts();
            setSuccessMsg('Đã cập nhật thông tin sản phẩm thành công.');
          }}
        />

        {/* Pop-up Thêm mới hàng hóa */}
        <ProductEditModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setCreateModalInitialBarcode('');
          }}
          product={createModalInitialBarcode ? { barcode: createModalInitialBarcode } : null}
          onProductUpdated={() => {
            loadProducts();
            setSuccessMsg('Đã tạo hàng hóa mới thành công.');
          }}
        />

        {/* Pop-up Quét mã vạch Barcode */}
        <QuickBarcodeScanModal
          isOpen={isBarcodeScanModalOpen}
          onClose={() => setIsBarcodeScanModalOpen(false)}
          onScanNewProduct={(scannedCode) => {
            setCreateModalInitialBarcode(scannedCode);
            setIsCreateModalOpen(true);
          }}
          onScanExistingProduct={(foundProduct) => {
            setEditModalProduct(foundProduct);
          }}
        />

        {/* Pop-up Cảnh báo sản phẩm đang có đơn DRAFT */}
        <DraftPoWarningModal
          isOpen={draftPoWarning.isOpen}
          items={draftPoWarning.items}
          onConfirmAdd={handleConfirmDraftAdd}
          onCancel={handleCancelDraftAdd}
          onOpenDraftPo={handleOpenDraftPo}
        />
      </main>
    </div>
  );
}
