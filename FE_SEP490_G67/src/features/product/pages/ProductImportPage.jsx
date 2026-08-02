import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ProductFacet from '../components/ProductFacet';
import ProductBulkBar from '../components/ProductBulkBar';
import ProductTable from '../components/ProductTable';
import ImportPanel from '../components/ImportPanel';
import ProductDetailDrawer from '../components/ProductDetailDrawer';
import { productsApi } from '../api';
import { importOrderApi } from '../api/importOrderApi';
import {
  DEMO_CATEGORY_NAMES,
  MOCK_SUGGESTIONS,
  PAGE_SIZE,
  PRODUCT_ROUTES,
} from '../constants';
import { getMockProducts, paginateLocal } from '../utils/productUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Product.css';

export default function ProductImportPage() {
  const navigate = useNavigate();
  const [facet, setFacet] = useState('hot');
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set([1, 2]));
  const [panelItems, setPanelItems] = useState(MOCK_SUGGESTIONS);
  const [overrides, setOverrides] = useState({});
  const [activeTab, setActiveTab] = useState('product');
  const [step, setStep] = useState('setup');
  const [creating, setCreating] = useState(false);
  const [usingMock, setUsingMock] = useState(true);
  const [detailProduct, setDetailProduct] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await productsApi.getProducts({
        facet,
        categoryId: typeof categoryId === 'number' ? categoryId : undefined,
        keyword,
        page,
        size: PAGE_SIZE,
      });
      if (result.content?.length) {
        setProducts(result.content);
        setTotalElements(result.totalElements);
        setTotalPages(Math.max(1, result.totalPages));
        setUsingMock(false);
      } else {
        const mock = getMockProducts(facet).filter((p) =>
          !keyword ? true : p.name.toLowerCase().includes(keyword.toLowerCase()),
        );
        const paged = paginateLocal(mock, page, PAGE_SIZE);
        setProducts(paged.content);
        setTotalElements(paged.totalElements);
        setTotalPages(paged.totalPages);
        setUsingMock(true);
      }
    } catch {
      const mock = getMockProducts(facet).filter((p) =>
        !keyword ? true : p.name.toLowerCase().includes(keyword.toLowerCase()),
      );
      const paged = paginateLocal(mock, page, PAGE_SIZE);
      setProducts(paged.content);
      setTotalElements(paged.totalElements);
      setTotalPages(paged.totalPages);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [facet, categoryId, keyword, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!detailProduct) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setDetailProduct(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailProduct]);

  const handleFacetChange = (key) => {
    setFacet(key);
    setPage(0);
    setSelectedIds(new Set());
    setDetailProduct(null);
  };

  const handleToggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      products.forEach((p) => {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      });
      return next;
    });
  };

  const closeDetail = () => setDetailProduct(null);

  const handlePrepare = async (forcedIds) => {
    const ids = forcedIds?.length ? forcedIds : Array.from(selectedIds);
    if (!ids.length) return;

    if (usingMock) {
      const mockMap = Object.fromEntries(MOCK_SUGGESTIONS.map((s) => [s.productId, s]));
      let selectedProducts = products.filter((p) => ids.includes(p.id));
      if (!selectedProducts.length && detailProduct && ids.includes(detailProduct.id)) {
        selectedProducts = [detailProduct];
      }
      const items = selectedProducts.map((p) => {
        if (mockMap[p.id]) return mockMap[p.id];
        return {
          productId: p.id,
          productName: p.name,
          emoji: p.productImg,
          whyFacts: `Tồn ${p.onHand} · ~${p.avgDailyRate}/${p.unitName || 'sp'}/ngày`,
          whyResult: `→ Gợi ý nhập ${Math.max(1, Math.ceil((p.avgDailyRate || 1) * 7))}`,
          suggestedQty: Math.max(1, Math.ceil((p.avgDailyRate || 1) * 7)),
          orderToday: (p.onHand || 0) <= 0,
          supplierId: 1,
          supplierName: p.supplierName || 'NCC mặc định',
          leadTimeDays: 3,
          coverDays: p.coverDaysOverride || p.categoryCoverDays || 7,
          coverSource: p.coverDaysOverride ? 'PRODUCT' : 'CATEGORY',
          coverSourceLabel: p.coverDaysOverride ? 'Cài riêng SP' : `Nhóm ${p.categoryName || ''}`,
          costPerUnit: p.costPrice || 20000,
          onHand: p.onHand,
          avgDailyRate: p.avgDailyRate,
        };
      });
      setPanelItems(items.length ? items : MOCK_SUGGESTIONS);
      setOverrides({});
      setStep('setup');
      setActiveTab('product');
      setDetailProduct(null);
      return;
    }

    try {
      const suggestions = await importOrderApi.getSuggestions(ids, {});
      setPanelItems(suggestions);
      setOverrides({});
      setStep('setup');
      setActiveTab('product');
      setDetailProduct(null);
    } catch (err) {
      console.error(err);
      setPanelItems(MOCK_SUGGESTIONS);
      setDetailProduct(null);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const lines = panelItems.map((item) => ({
        productId: item.productId,
        supplierId: overrides[item.productId]?.supplierId ?? item.supplierId,
        quantity: overrides[item.productId]?.quantity ?? item.suggestedQty,
        coverDays: overrides[item.productId]?.coverDays ?? item.coverDays,
        orderDate: new Date().toISOString().slice(0, 10),
      }));

      if (!usingMock) {
        await importOrderApi.createOrders(lines);
      }
      setSelectedIds(new Set());
      setPanelItems([]);
      setStep('setup');
      alert(usingMock ? 'Demo: đã mô phỏng tạo đơn thành công.' : 'Đã tạo đơn nhập thành công.');
    } catch (err) {
      console.error(err);
      alert('Không tạo được đơn. Kiểm tra API / NCC.');
    } finally {
      setCreating(false);
    }
  };

  const showBulk = selectedIds.size > 0 && ['hot', 'warn', 'season'].includes(facet);

  const summaryNote = useMemo(
    () =>
      usingMock
        ? 'Đang dùng dữ liệu demo. Hover 2s hoặc click SP (không phải checkbox) để xem chi tiết.'
        : 'Chọn SP ở giữa → quyết định nhập bên phải. Hover 2s / click hàng để xem chi tiết.',
    [usingMock],
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
                <div className="page-kicker">Quyết định nhập hàng</div>
                <h1>Chọn sản phẩm → chuẩn bị đơn nhập</h1>
                <div className="page-note">{summaryNote}</div>
              </div>
              <div className="head-actions">
                <button type="button" className="btn">
                  Nhập / Xuất Excel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate(PRODUCT_ROUTES.create)}
                >
                  + Thêm sản phẩm
                </button>
              </div>
            </div>

            <div className="content">
              <ProductFacet
                facet={facet}
                onFacetChange={handleFacetChange}
                categories={DEMO_CATEGORY_NAMES}
                categoryId={categoryId}
                onCategoryChange={(id) => {
                  setCategoryId(id);
                  setPage(0);
                }}
              />

              <section className="results">
                <div className="search-row">
                  <div className="search">
                    <Search size={18} />
                    <input
                      placeholder="Tìm tên, SKU, mã vạch…"
                      value={keyword}
                      onChange={(e) => {
                        setKeyword(e.target.value);
                        setPage(0);
                      }}
                    />
                  </div>
                  <div className="scan" title="Quét mã">Quét</div>
                  <div className="sort" title="Sắp xếp">Bán nhiều ▾</div>
                </div>

                {showBulk && (
                  <ProductBulkBar
                    count={selectedIds.size}
                    onClear={() => setSelectedIds(new Set())}
                    onPrepare={() => handlePrepare()}
                  />
                )}

                <ProductTable
                  items={products}
                  loading={loading}
                  facet={facet}
                  selectedIds={selectedIds}
                  detailProductId={detailProduct?.id ?? null}
                  onToggle={handleToggle}
                  onToggleAll={handleToggleAll}
                  onOpenDetail={setDetailProduct}
                  page={page}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  onPageChange={setPage}
                />
              </section>

              <ImportPanel
                panelItems={panelItems}
                overrides={overrides}
                activeTab={activeTab}
                step={step}
                onTabChange={setActiveTab}
                onChangeQty={(id, quantity) =>
                  setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], quantity } }))
                }
                onChangeCover={(id, coverDays) =>
                  setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], coverDays } }))
                }
                onChangeSupplier={(id, supplier) =>
                  setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...supplier } }))
                }
                onRemove={(id) => {
                  setPanelItems((prev) => prev.filter((p) => p.productId !== id));
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                  });
                }}
                onPreview={() => setStep('preview')}
                onBackSetup={() => setStep('setup')}
                onCreate={handleCreate}
                onClose={() => {
                  setPanelItems([]);
                  setStep('setup');
                }}
                creating={creating}
              />
            </div>

            {detailProduct && (
              <ProductDetailDrawer
                product={detailProduct}
                onClose={closeDetail}
                onPrepareImport={(p) => {
                  setSelectedIds((prev) => new Set(prev).add(p.id));
                  handlePrepare([p.id]);
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
