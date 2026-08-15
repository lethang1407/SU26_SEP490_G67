import { useEffect, useMemo, useState } from 'react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import ImportHistoryOverviewSummary from '../components/ImportHistoryOverviewSummary';
import ImportHistoryProductFocus from '../components/ImportHistoryProductFocus';
import ImportHistoryFilters from '../components/ImportHistoryFilters';
import ImportHistoryTable from '../components/ImportHistoryTable';
import ImportHistoryPagination from '../components/ImportHistoryPagination';
import { importHistoryApi } from '../api/importHistoryApi';
import {
  MOCK_IMPORT_HISTORY,
  MOCK_MONTHLY_SUMMARY,
  MOCK_WEEKLY_CASHFLOW,
} from '../api/importHistoryMockData';
import { IMPORT_HISTORY_PAGE_SIZE } from '../constants';
import {
  extractProductCatalog,
  filterImportHistory,
} from '../utils/importHistoryUtils';
import {
  monthTitleFromSummary,
  resolveImportDateRange,
} from '../utils/dateRangeUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/ImportHistory.css';

const EMPTY_PRODUCT_SUMMARY = {
  totalQty: 0,
  totalOrders: 0,
  totalCost: 0,
  lastImportedAt: null,
  avgUnitPrice: 0,
};

export default function ImportHistoryPage() {
  const [dateRange, setDateRange] = useState('this-month');
  const [supplierKeyword, setSupplierKeyword] = useState('');
  const [productKeyword, setProductKeyword] = useState('');
  const [focusedProduct, setFocusedProduct] = useState(null);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [overview, setOverview] = useState(MOCK_MONTHLY_SUMMARY);
  const [weekly, setWeekly] = useState(MOCK_WEEKLY_CASHFLOW);
  const [productSummary, setProductSummary] = useState(EMPTY_PRODUCT_SUMMARY);
  const [catalogRows, setCatalogRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  const { from, to } = useMemo(() => resolveImportDateRange(dateRange), [dateRange]);

  const productCatalog = useMemo(
    () => extractProductCatalog(catalogRows.length ? catalogRows : rows),
    [catalogRows, rows],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const productId = focusedProduct?.productId ?? undefined;
        const [listRes, summaryRes] = await Promise.all([
          importHistoryApi.getList({
            from,
            to,
            supplierKeyword: supplierKeyword || undefined,
            productId,
            page: page - 1,
            size: IMPORT_HISTORY_PAGE_SIZE,
          }),
          importHistoryApi.getSummary({
            from,
            to,
            productId,
          }),
        ]);

        if (cancelled) return;
        setUsingMock(false);
        setRows(listRes.content || []);
        setTotalElements(listRes.totalElements ?? 0);
        setTotalPages(Math.max(1, listRes.totalPages ?? 1));

        if (productId && summaryRes) {
          setProductSummary({
            totalQty: summaryRes.totalQty ?? 0,
            totalOrders: summaryRes.totalOrders ?? 0,
            totalCost: Number(summaryRes.totalCost ?? 0),
            lastImportedAt: summaryRes.lastImportedAt ?? null,
            avgUnitPrice: Number(summaryRes.avgUnitPrice ?? 0),
          });
          if (summaryRes.productName) {
            setFocusedProduct((prev) =>
              prev
                ? {
                    ...prev,
                    productName: summaryRes.productName,
                    sku: summaryRes.sku || prev.sku,
                    unitName: summaryRes.unitName || prev.unitName,
                  }
                : prev,
            );
          }
        } else if (summaryRes) {
          setOverview({
            monthLabel: summaryRes.monthLabel || overview.monthLabel,
            todayLabel: summaryRes.todayLabel || overview.todayLabel,
            totalQty: summaryRes.totalQty ?? 0,
            totalOrders: summaryRes.totalOrders ?? 0,
            totalCost: Number(summaryRes.totalCost ?? 0),
          });
          setWeekly({
            monthTitle: monthTitleFromSummary(summaryRes),
            weeks: (summaryRes.weeks || []).map((w) => ({
              ...w,
              amount: Number(w.amount ?? 0),
            })),
          });
        }
      } catch {
        if (cancelled) return;
        setUsingMock(true);
        const filtered = filterImportHistory(MOCK_IMPORT_HISTORY, {
          supplierKeyword,
          focusedProductId: focusedProduct?.productId ?? null,
        });
        const size = IMPORT_HISTORY_PAGE_SIZE;
        const start = (page - 1) * size;
        setRows(filtered.slice(start, start + size));
        setTotalElements(filtered.length);
        setTotalPages(Math.max(1, Math.ceil(filtered.length / size)));
        setOverview(MOCK_MONTHLY_SUMMARY);
        setWeekly(MOCK_WEEKLY_CASHFLOW);
        setCatalogRows(MOCK_IMPORT_HISTORY);
        if (focusedProduct) {
          const all = filterImportHistory(MOCK_IMPORT_HISTORY, {
            focusedProductId: focusedProduct.productId,
          });
          const orderCodes = new Set(all.map((r) => r.orderCode));
          const totalQty = all.reduce((s, r) => s + (r.qty || 0), 0);
          const totalCost = all.reduce((s, r) => s + (r.totalAmount || 0), 0);
          setProductSummary({
            totalQty,
            totalOrders: orderCodes.size,
            totalCost,
            lastImportedAt: all[0]?.importedAt ?? null,
            avgUnitPrice: all.length
              ? Math.round(totalCost / Math.max(1, totalQty))
              : 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- overview labels only used as fallback
  }, [from, to, supplierKeyword, focusedProduct?.productId, page]);

  // Lightweight catalog for product search (no product filter)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listRes = await importHistoryApi.getList({
          from,
          to,
          page: 0,
          size: 100,
        });
        if (!cancelled) setCatalogRows(listRes.content || []);
      } catch {
        if (!cancelled) setCatalogRows(MOCK_IMPORT_HISTORY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const startIndex = totalElements === 0 ? 0 : (page - 1) * IMPORT_HISTORY_PAGE_SIZE + 1;
  const endIndex = Math.min(page * IMPORT_HISTORY_PAGE_SIZE, totalElements);

  const handleSelectProduct = (product) => {
    setFocusedProduct(product);
    setProductKeyword(product.productName);
    setPage(1);
  };

  const handleClearProduct = () => {
    setFocusedProduct(null);
    setProductKeyword('');
    setPage(1);
  };

  return (
    <div className="admin-content">
      <AdminHeader />
      <main className="admin-main">
          <div className="dashboard-container ih-page">
            <nav className="ih-breadcrumb" aria-label="Breadcrumb">
              <span>Quản lý kho</span>
              <span className="ih-breadcrumb__sep">&gt;</span>
              <span className="ih-breadcrumb__current">Lịch sử nhập hàng</span>
            </nav>

            <header className="ih-page__header">
              <h1 className="ih-page__title">Lịch sử nhập hàng sản phẩm</h1>
              {usingMock ? (
                <p className="ih-page__hint">Đang dùng dữ liệu demo (API chưa sẵn sàng).</p>
              ) : null}
              {loading ? <p className="ih-page__hint">Đang tải…</p> : null}
            </header>

            {focusedProduct ? (
              <ImportHistoryProductFocus
                product={focusedProduct}
                summary={productSummary}
                onClear={handleClearProduct}
              />
            ) : (
              <ImportHistoryOverviewSummary summary={overview} weekly={weekly} />
            )}

            <ImportHistoryFilters
              dateRange={dateRange}
              onDateRangeChange={(v) => {
                setDateRange(v);
                setPage(1);
              }}
              supplierKeyword={supplierKeyword}
              onSupplierKeywordChange={(v) => {
                setSupplierKeyword(v);
                setPage(1);
              }}
              productKeyword={productKeyword}
              onProductKeywordChange={(v) => {
                setProductKeyword(v);
                if (focusedProduct) setFocusedProduct(null);
              }}
              productCatalog={productCatalog}
              focusedProduct={focusedProduct}
              onSelectProduct={handleSelectProduct}
              onExport={() => alert('Xuất Excel sẽ được bổ sung sau.')}
            />

            <ImportHistoryTable
              items={rows}
              hideProductColumn={Boolean(focusedProduct)}
              onSelectProduct={handleSelectProduct}
            />

            <ImportHistoryPagination
              page={page}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalElements}
              onPageChange={setPage}
            />
          </div>
        </main>
      </div>
  );
}
