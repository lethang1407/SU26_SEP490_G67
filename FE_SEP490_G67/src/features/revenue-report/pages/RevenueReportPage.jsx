import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import RevenueReportFilters from '../components/RevenueReportFilters';
import RevenueReportKpi from '../components/RevenueReportKpi';
import RevenueTrendChart from '../components/RevenueTrendChart';
import RevenueTransactionsTable from '../components/RevenueTransactionsTable';
import RevenuePaymentBreakdown from '../components/RevenuePaymentBreakdown';
import RevenueAdjustments from '../components/RevenueAdjustments';
import { revenueReportApi } from '../api';
import { formatDataFreshness, resolveRangeFor } from '../utils/revenueReportUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/RevenueReport.css';

const PAGE_SIZE = 10;

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'payment', label: 'Theo PTTT' },
  { key: 'adjustment', label: 'Đổi trả & Chiết khấu' }
];

function buildInitialFilters() {
  const year = String(new Date().getFullYear());
  const { from, to } = resolveRangeFor(year, '');
  return { year, quarter: '', from, to, paymentMethod: '', staffId: '' };
}

export default function RevenueReportPage() {
  const initialFilters = useMemo(() => buildInitialFilters(), []);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [staffOptions, setStaffOptions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  const [activeTab, setActiveTab] = useState('overview');

  const [transactions, setTransactions] = useState(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [page, setPage] = useState(0);

  const freshness = useMemo(() => formatDataFreshness(), []);

  useEffect(() => {
    let cancelled = false;
    revenueReportApi
      .listStaffOptions()
      .then((options) => {
        if (!cancelled) setStaffOptions(options);
      })
      .catch((error) => {
        console.error('Không tải được danh sách nhân viên bán hàng:', error);
        if (!cancelled) setStaffOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError('');
    try {
      const result = await revenueReportApi.getOverview(appliedFilters);
      setOverview(result);
    } catch (error) {
      console.error('Không tải được báo cáo doanh thu:', error);
      setOverviewError('Không tải được báo cáo doanh thu. Vui lòng thử lại.');
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [appliedFilters]);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError('');
    try {
      const result = await revenueReportApi.getTransactions({
        ...appliedFilters,
        keyword: debouncedKeyword || undefined,
        page,
        size: PAGE_SIZE,
      });
      setTransactions(result);
    } catch (error) {
      console.error('Không tải được danh sách giao dịch:', error);
      setTransactionsError('Không tải được danh sách giao dịch. Vui lòng thử lại.');
      setTransactions(null);
    } finally {
      setTransactionsLoading(false);
    }
  }, [appliedFilters, debouncedKeyword, page]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  /** Đổi năm hoặc quý thì kéo luôn khoảng ngày theo, người dùng vẫn sửa tay được. */
  const handleFilterChange = (key, value) => {
    setDraftFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'year' || key === 'quarter') {
        const range = resolveRangeFor(next.year, next.quarter);
        next.from = range.from;
        next.to = range.to;
      }
      return next;
    });
  };

  const handleApply = () => {
    setAppliedFilters(draftFilters);
    setPage(0);
  };

  const handleKeywordChange = (value) => {
    setKeyword(value);
    setPage(0);
  };

  const series = useMemo(() => {
    if (!overview) return [];
    return overview.series ?? [];
  }, [overview]);

  return (
    <div className="admin-content">
      <AdminHeader />
      <main className="admin-main">
        <div className="dashboard-container rr-page">
          <nav className="rr-breadcrumb" aria-label="Đường dẫn">
            <span>Báo cáo &amp; Thống kê</span>
            <span className="rr-breadcrumb_sep">/</span>
            <span className="rr-breadcrumb_current">Phân tích Doanh thu</span>
            <span className="rr-breadcrumb_freshness">{freshness}</span>
          </nav>

          <header className="rr-page_header">
            <h1 className="rr-page_title">Báo cáo &amp; Phân tích Doanh thu</h1>
            <p className="rr-page_subtitle">
              Xem doanh thu, lợi nhuận và xu hướng kinh doanh theo kỳ
            </p>
          </header>

          <RevenueReportFilters
            filters={draftFilters}
            staffOptions={staffOptions}
            onChange={handleFilterChange}
            onApply={handleApply}
            loading={overviewLoading}
          />

          {overviewError && <div className="rr-alert">{overviewError}</div>}

          <RevenueReportKpi summary={overview?.summary} />

          <RevenueTrendChart
            data={series}
            highlights={overview?.highlights}
            loading={overviewLoading}
          />

          <div className="rr-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`rr-tabs_btn${activeTab === tab.key ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              {transactionsError && <div className="rr-alert">{transactionsError}</div>}
              <RevenueTransactionsTable
                rows={transactions?.content}
                totalItems={transactions?.totalElements ?? 0}
                totalPages={transactions?.totalPages ?? 1}
                page={page}
                pageSize={PAGE_SIZE}
                keyword={keyword}
                onKeywordChange={handleKeywordChange}
                onPageChange={setPage}
                loading={transactionsLoading}
              />
            </>
          )}

          {activeTab === 'payment' && (
            <RevenuePaymentBreakdown
              rows={overview?.paymentBreakdowns}
              paymentSummary={overview?.paymentSummary}
              paymentSeries={overview?.paymentSeries}
              periodLabel={appliedFilters.quarter ? `quý ${appliedFilters.quarter}/${appliedFilters.year}` : `năm ${appliedFilters.year}`}
              highlightLabels={{
                best: overview?.summary?.bestPeriodLabel,
                worst: overview?.summary?.worstPeriodLabel,
              }}
              loading={overviewLoading}
            />
          )}

          {activeTab === 'adjustment' && (
            <RevenueAdjustments
              adjustments={overview?.adjustments}
              summary={overview?.summary}
              periodLabel={appliedFilters.quarter ? `quý ${appliedFilters.quarter}/${appliedFilters.year}` : `năm ${appliedFilters.year}`}
              loading={overviewLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}
