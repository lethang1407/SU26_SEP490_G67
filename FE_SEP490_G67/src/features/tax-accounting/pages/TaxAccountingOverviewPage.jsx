import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, Edit3, FileText, Plus, RefreshCw, Search } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getStoreInfor } from '../../store/api';
import { accountingPeriodsApi, accountingReportsApi, adjustmentsApi, taxProfilesApi, taxSupportApi } from '../api';
import '../../../css/AdminDashboard.css';
import '../../../css/TaxAccounting.css';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, index) => CURRENT_YEAR - index);

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  CONFIRMED: 'Đã xác nhận',
  OPEN: 'Đang mở',
  CLOSED: 'Đã khóa',
  MISSING: 'Chưa tạo',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const REVENUE_CLASSIFICATION_LABELS = {
  SALE: 'Bán hàng',
  SALES: 'Bán hàng',
  SALES_ORDER: 'Bán hàng',
  RETURN: 'Trả hàng',
  SALES_RETURN: 'Trả hàng',
  EXCHANGE_RETURN: 'Đổi / trả hàng',
  REVENUE_ADJUSTMENT: 'Điều chỉnh doanh thu',
  CORRECTION: 'Điều chỉnh',
};

function asList(value) {
  if (Array.isArray(value)) return value;
  return value?.content ?? value?.items ?? [];
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Chưa thiết lập';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
}

function getVietnamYear(value) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  }).formatToParts(new Date(value));
  return Number(parts.find((part) => part.type === 'year')?.value) || null;
}

function statusLabel(status) {
  return STATUS_LABELS[status] || 'Không xác định';
}

function revenueClassificationLabel(classification) {
  if (!classification) return 'Không xác định';
  return REVENUE_CLASSIFICATION_LABELS[String(classification).toUpperCase()] || 'Không xác định';
}

function reportPeriodLabel(periodType) {
  return {
    YEAR: 'Năm',
    QUARTER: 'Quý',
    MONTH: 'Tháng',
  }[periodType] || 'Kỳ';
}

function getProfileInformation(profile) {
  return profile?.information ?? profile ?? {};
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function emptyProfileForm(year) {
  return {
    taxYear: year,
    trackingStartedAt: `${year}-01-01T00:00`,
    taxpayerIdentity: '',
    taxpayerName: '',
    taxpayerAddress: '',
    taxAuthority: '',
    declaredMethod: 'UNKNOWN',
    invoiceRegistrationStatus: 'NOT_REGISTERED',
  };
}

function periodMonth(period) {
  return period?.accountingMonth ?? period?.month;
}

function revenueLinesFrom(value) {
  if (Array.isArray(value)) return value;
  return value?.lines ?? value?.revenueLines ?? value?.content ?? value?.items ?? [];
}

function emptyAdjustmentForm() {
  return {
    sourceType: 'REVENUE_ADJUSTMENT',
    sourceId: '',
    relatedPeriodId: '',
    occurredAt: '',
    postingDate: '',
    signedAmount: '',
    classification: 'CORRECTION',
    inclusionReason: '',
    evidence: '',
  };
}

function downloadBlobFile(file) {
  if (!file?.blob || !(file.blob instanceof Blob)) return;
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function TaxAccountingOverviewPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(() => emptyProfileForm(CURRENT_YEAR));
  const [trackingReason, setTrackingReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [periodDetail, setPeriodDetail] = useState(null);
  const [revenueLines, setRevenueLines] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodError, setPeriodError] = useState('');
  const [periodModal, setPeriodModal] = useState(null);
  const [periodReason, setPeriodReason] = useState('');
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentModal, setAdjustmentModal] = useState(null);
  const [adjustmentForm, setAdjustmentForm] = useState(emptyAdjustmentForm);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentError, setAdjustmentError] = useState('');
  const [storeLoading, setStoreLoading] = useState(false);
  const [trackingStartYear, setTrackingStartYear] = useState(null);
  const [reportType, setReportType] = useState('YEAR');
  const [reportMonth, setReportMonth] = useState(1);
  const [reportQuarter, setReportQuarter] = useState(1);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [downloadLoading, setDownloadLoading] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      try {
        const profiles = asList(await taxProfilesApi.list());
        const startYears = profiles
          .map((item) => getVietnamYear(item.trackingStartedAt))
          .filter(Boolean);
        if (startYears.length > 0) setTrackingStartYear(Math.min(...startYears));
      } catch {
        // The selected profile below remains the fallback source for the tracking year.
      }

      let profileResult;
      try {
        profileResult = await taxProfilesApi.getByYear(year);
      } catch (requestError) {
        if (requestError.response?.status === 404) {
          setProfile(null);
          setSummary(null);
          setPeriods([]);
          setAdjustments([]);
          return;
        }
        throw requestError;
      }

      setProfile(profileResult);
      const profileStartYear = getVietnamYear(profileResult?.trackingStartedAt);
      if (profileStartYear) setTrackingStartYear((current) => current ?? profileStartYear);
      const [summaryResult, periodsResult, adjustmentsResult] = await Promise.all([
        accountingReportsApi.getYearSummary(year),
        accountingPeriodsApi.list(year),
        adjustmentsApi.list(year).catch(() => []),
      ]);
      setSummary(summaryResult);
      setPeriods(asList(periodsResult));
      setAdjustments(asList(adjustmentsResult));
    } catch (requestError) {
      setSummary(null);
      setPeriods([]);
      setAdjustments([]);
      setError(requestError.response?.data?.message || 'Không thể tải tổng quan thuế và kế toán.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  const openProfileForm = async () => {
    setForm({
      ...emptyProfileForm(year),
      ...(profile ? {
        trackingStartedAt: toDateTimeLocal(profile.trackingStartedAt),
        ...information,
        invoiceRegistrationStatus: profile.invoiceRegistrationStatus === 'UNKNOWN'
          ? 'NOT_REGISTERED'
          : profile.invoiceRegistrationStatus,
      } : {}),
    });
    setError('');
    setModal('profile');

    if (!profile) {
      setStoreLoading(true);
      try {
        const store = await getStoreInfor();
        setForm((previous) => ({
          ...previous,
          taxpayerName: store?.ownerFullName || previous.taxpayerName,
          taxpayerIdentity: store?.taxCode || previous.taxpayerIdentity,
          taxpayerAddress: store?.address || previous.taxpayerAddress,
        }));
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Không thể tải thông tin cửa hàng để điền mặc định.');
      } finally {
        setStoreLoading(false);
      }
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const informationPayload = {
      taxpayerIdentity: form.taxpayerIdentity.trim(),
      taxpayerName: form.taxpayerName.trim(),
      taxpayerAddress: form.taxpayerAddress.trim(),
      taxAuthority: form.taxpayerAddress.trim(),
      declaredMethod: 'REVENUE_BASED',
      invoiceRegistrationStatus: form.invoiceRegistrationStatus || 'NOT_REGISTERED',
    };
    try {
      if (profile) {
        await taxProfilesApi.update(year, { version: profile.version, information: informationPayload });
      } else {
        await taxProfilesApi.create({
          taxYear: year,
          trackingStartedAt: new Date(form.trackingStartedAt).toISOString(),
          information: informationPayload,
        });
      }
      setModal(null);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu hồ sơ thuế.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!profile || !window.confirm('Xác nhận hồ sơ thuế? Sau khi xác nhận, dữ liệu hồ sơ và mốc theo dõi ảnh hưởng đến các kỳ kế toán.')) return;
    setSubmitting(true);
    setError('');
    try {
      await taxProfilesApi.confirm(year, profile.version);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xác nhận hồ sơ thuế.');
    } finally {
      setSubmitting(false);
    }
  };

  const openTrackingForm = () => {
    setForm((previous) => ({
      ...previous,
      trackingStartedAt: toDateTimeLocal(profile?.trackingStartedAt),
    }));
    setTrackingReason('');
    setError('');
    setModal('tracking');
  };

  const handleTrackingSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await taxProfilesApi.updateTrackingStart(year, {
        version: profile.version,
        trackingStartedAt: new Date(form.trackingStartedAt).toISOString(),
        reason: trackingReason.trim(),
      });
      setModal(null);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể đổi mốc bắt đầu theo dõi.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadPeriodDetail = useCallback(async (month) => {
    setSelectedMonth(month);
    setPeriodLoading(true);
    setPeriodError('');
    try {
      const [detailResult, linesResult, reconciliationResult] = await Promise.all([
        accountingPeriodsApi.getByMonth(year, month),
        accountingPeriodsApi.getRevenueLines(year, month),
        accountingPeriodsApi.getReconciliation(year, month),
      ]);
      setPeriodDetail(detailResult);
      setRevenueLines(revenueLinesFrom(linesResult));
      setReconciliation(reconciliationResult);
    } catch (requestError) {
      setPeriodDetail(null);
      setRevenueLines([]);
      setReconciliation(null);
      setPeriodError(requestError.response?.data?.message || 'Không thể tải chi tiết kỳ kế toán.');
    } finally {
      setPeriodLoading(false);
    }
  }, [year]);

  const handleCreatePeriod = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setPeriodError('');
    try {
      await accountingPeriodsApi.create(year, selectedMonth, profile.version);
      setPeriodModal(null);
      await loadOverview();
      await loadPeriodDetail(selectedMonth);
    } catch (requestError) {
      setPeriodError(requestError.response?.data?.message || 'Không thể tạo kỳ kế toán.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSynchronizeAndReconcile = async () => {
    setPeriodLoading(true);
    setPeriodError('');
    try {
      if (periodDetail?.status === 'OPEN') {
        await accountingPeriodsApi.synchronize(year, selectedMonth);
      }
      const reconciliationResult = await accountingPeriodsApi.getReconciliation(year, selectedMonth);
      setReconciliation(reconciliationResult);
      await loadOverview();
      await loadPeriodDetail(selectedMonth);
    } catch (requestError) {
      setPeriodError(requestError.response?.data?.message || 'Không thể đồng bộ doanh thu.');
      setPeriodLoading(false);
    }
  };

  const handleClosePeriod = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setPeriodError('');
    try {
      await accountingPeriodsApi.close(year, selectedMonth, {
        version: periodDetail.version,
        reason: periodReason.trim(),
      });
      setPeriodModal(null);
      setPeriodReason('');
      await loadOverview();
      await loadPeriodDetail(selectedMonth);
    } catch (requestError) {
      setPeriodError(requestError.response?.data?.message || 'Không thể khóa kỳ kế toán.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustmentForm = (adjustment = null) => {
    const information = adjustment?.information ?? adjustment ?? {};
    setAdjustmentForm({
      ...emptyAdjustmentForm(),
      ...information,
      occurredAt: toDateTimeLocal(information.occurredAt),
      sourceId: information.sourceId ?? '',
      relatedPeriodId: information.relatedPeriodId ?? '',
      signedAmount: information.signedAmount ?? '',
    });
    setAdjustmentError('');
    setAdjustmentModal(adjustment ? { type: 'edit', adjustment } : { type: 'create' });
  };

  const handleAdjustmentSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setAdjustmentError('');
    const information = {
      sourceType: adjustmentForm.sourceType || 'REVENUE_ADJUSTMENT',
      sourceId: adjustmentForm.sourceId ? Number(adjustmentForm.sourceId) : null,
      relatedPeriodId: adjustmentForm.relatedPeriodId ? Number(adjustmentForm.relatedPeriodId) : null,
      originalAdjustmentId: null,
      occurredAt: new Date(adjustmentForm.occurredAt).toISOString(),
      postingDate: adjustmentForm.postingDate,
      signedAmount: String(adjustmentForm.signedAmount),
      classification: adjustmentForm.classification || 'CORRECTION',
      inclusionReason: adjustmentForm.inclusionReason.trim(),
      evidence: adjustmentForm.evidence.trim(),
    };
    try {
      if (adjustmentModal.type === 'edit') {
        await adjustmentsApi.update(year, adjustmentModal.adjustment.id, {
          version: adjustmentModal.adjustment.version,
          information,
        });
      } else {
        await adjustmentsApi.create(year, {
          idempotencyKey: `ADJ-${year}-${Date.now()}`,
          information,
        });
      }
      setAdjustmentModal(null);
      await loadOverview();
    } catch (requestError) {
      setAdjustmentError(requestError.response?.data?.message || 'Không thể lưu điều chỉnh doanh thu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustmentDecision = async (adjustment, decision) => {
    if (!adjustmentReason.trim()) {
      setAdjustmentError('Vui lòng nhập lý do xử lý điều chỉnh.');
      return;
    }
    setSubmitting(true);
    setAdjustmentError('');
    try {
      const payload = { version: adjustment.version, reason: adjustmentReason.trim() };
      if (decision === 'approve') payload.acceptCrossPeriodPosting = false;
      if (decision === 'approve') await adjustmentsApi.approve(year, adjustment.id, payload);
      else await adjustmentsApi.reject(year, adjustment.id, payload);
      setAdjustmentModal(null);
      setAdjustmentReason('');
      await loadOverview();
      if (selectedMonth) await loadPeriodDetail(selectedMonth);
    } catch (requestError) {
      setAdjustmentError(requestError.response?.data?.message || 'Không thể xử lý điều chỉnh doanh thu.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustmentDecision = (adjustment, decision) => {
    setAdjustmentReason('');
    setAdjustmentError('');
    setAdjustmentModal({ type: decision, adjustment });
  };

  const loadReport = async () => {
    setReportLoading(true);
    setReportError('');
    try {
      const result = reportType === 'YEAR'
        ? await accountingReportsApi.getYearSummary(year)
        : reportType === 'QUARTER'
          ? await accountingReportsApi.getQuarterSummary(year, reportQuarter)
          : await accountingReportsApi.getMonthSummary(year, reportMonth);
      setReport(result);
    } catch (requestError) {
      setReport(null);
      setReportError(requestError.response?.data?.message || 'Không thể tải báo cáo.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownload = async (type) => {
    setDownloadLoading(type);
    setReportError('');
    try {
      const file = type === 's1a'
        ? await taxSupportApi.downloadS1a(year, selectedMonth)
        : await taxSupportApi.downloadTaxDeclaration(year);
      downloadBlobFile(file);
    } catch (requestError) {
      setReportError(requestError.response?.data?.message || 'Không thể tải tệp.');
    } finally {
      setDownloadLoading('');
    }
  };

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      loadOverview();
    }, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [loadOverview]);

  const information = getProfileInformation(profile);
  const confirmed = profile?.status === 'CONFIRMED';
  const summaryMonths = Array.isArray(summary?.months) ? summary.months : [];
  const summaryByMonth = new Map(summaryMonths.map((month) => [Number(month.month), month]));
  const closedPeriods = summaryMonths.filter((month) => month.status === 'CLOSED').length;
  const trackingIsPartial = Boolean(summary?.partialTracking);
  const periodByMonth = new Map(periods.map((period) => [Number(periodMonth(period)), period]));
  const selectedPeriodRevenue = reconciliation?.recordedRevenue ?? periodDetail?.recordedRevenue;
  const yearOptions = YEARS.filter((optionYear) => !trackingStartYear || optionYear >= trackingStartYear);

  return (
    <div className="admin-content">
      <AdminHeader />
      <main className="admin-main">
        <div className="dashboard-container tax-accounting-page">
          <div className="tax-accounting-page__header">
            <div>
              <p className="tax-accounting-eyebrow">Thuế và sổ kế toán hộ kinh doanh</p>
              <h1 className="db-page-header_title">Tổng quan năm {year}</h1>
              <p className="db-page-header_subtitle">
                Theo dõi hồ sơ thuế, doanh thu và trạng thái khóa kỳ.
              </p>
            </div>
            <div className="tax-accounting-page__actions">
              <label htmlFor="tax-year">Năm thuế</label>
              <select id="tax-year" value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {yearOptions.map((optionYear) => <option key={optionYear} value={optionYear}>{optionYear}</option>)}
              </select>
              <button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={loadOverview} disabled={loading}>
                <RefreshCw size={16} /> Làm mới
              </button>
            </div>
          </div>

          {error && <div className="tax-accounting-alert tax-accounting-alert--danger"><AlertCircle size={18} /> <span>{error}</span></div>}
          {trackingIsPartial && <div className="tax-accounting-alert tax-accounting-alert--warning"><AlertCircle size={18} /> Doanh thu chỉ được tính từ mốc bắt đầu theo dõi.</div>}

          {loading ? (
            <div className="tax-accounting-loading">Đang tải dữ liệu năm {year}...</div>
          ) : (
            <>
              <section className="tax-accounting-kpis" aria-label="Tóm tắt năm">
                <article className="tax-accounting-kpi"><span>Trạng thái hồ sơ</span><strong>{statusLabel(profile?.status)}</strong><small>{confirmed ? 'Có thể quản lý kỳ kế toán' : 'Cần xác nhận hồ sơ trước khi tạo kỳ'}</small></article>
                <article className="tax-accounting-kpi"><span>Doanh thu năm</span><strong>{formatMoney(summary?.recordedRevenue)}</strong><small>{summary?.sourceCompletenessVerified ? 'Đã đối chiếu nguồn' : 'Chưa đối chiếu đầy đủ'}</small></article>
                <article className="tax-accounting-kpi"><span>Kỳ đã khóa</span><strong>{closedPeriods} / 12</strong><small>{periods.length} kỳ đã được tạo</small></article>
              </section>

              <section className="tax-accounting-panel tax-accounting-reports">
                <div className="tax-accounting-panel__heading"><FileText size={18} /><h2>Báo cáo và biểu mẫu</h2></div>
                <div className="tax-accounting-report-controls">
                  <div className="tax-accounting-report-tabs" role="tablist">
                    {['YEAR', 'QUARTER', 'MONTH'].map((type) => <button type="button" role="tab" aria-selected={reportType === type} className={reportType === type ? 'is-active' : ''} key={type} onClick={() => setReportType(type)}>{type === 'YEAR' ? 'Năm' : type === 'QUARTER' ? 'Quý' : 'Tháng'}</button>)}
                  </div>
                  {reportType === 'QUARTER' && <label>Quý<select value={reportQuarter} onChange={(event) => setReportQuarter(Number(event.target.value))}>{[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>{quarter}</option>)}</select></label>}
                  {reportType === 'MONTH' && <label>Tháng<select value={reportMonth} onChange={(event) => setReportMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}</option>)}</select></label>}
                  <button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={loadReport} disabled={reportLoading}><RefreshCw size={15} /> Xem báo cáo</button>
                  <button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={() => handleDownload('declaration')} disabled={downloadLoading === 'declaration' || !profile}>{downloadLoading === 'declaration' ? 'Đang tải...' : 'Tải mẫu 01/TKN-CNKD'}</button>
                  <button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={() => handleDownload('s1a')} disabled={!selectedMonth || downloadLoading === 's1a'}>{downloadLoading === 's1a' ? 'Đang tải...' : 'Tải S1a Excel'}</button>
                </div>
                {reportError && <div className="tax-accounting-alert tax-accounting-alert--danger tax-accounting-alert--inline"><AlertCircle size={18} /> <span>{reportError}</span></div>}
                {reportLoading ? <div className="tax-accounting-loading">Đang tải báo cáo...</div> : report ? <div className="tax-accounting-report-result"><div><span>Kỳ báo cáo</span><strong>{reportPeriodLabel(report.periodType || reportType)} {report.periodNumber || year}</strong></div><div><span>Doanh thu ghi nhận</span><strong>{formatMoney(report.recordedRevenue)}</strong></div><div><span>Đối chiếu nguồn</span><strong>{report.sourceCompletenessVerified ? 'Đạt' : 'Chưa đạt'}</strong></div>{report.partialTracking && <p className="tax-accounting-report-warning">Doanh thu chỉ được tính từ mốc bắt đầu theo dõi.</p>}</div> : <p className="tax-accounting-muted">Chọn kỳ và bấm “Xem báo cáo” để tải dữ liệu.</p>}
              </section>

              <section className="tax-accounting-grid">
                <article className="tax-accounting-panel">
                  <div className="tax-accounting-panel__heading"><FileText size={18} /><h2>Hồ sơ người nộp thuế</h2></div>
                  {profile ? (
                    <>
                    <dl className="tax-accounting-details">
                      <div><dt>Tên người nộp thuế</dt><dd>{information.taxpayerName || 'Chưa cập nhật'}</dd></div>
                      <div><dt>Mã số thuế / định danh</dt><dd>{information.taxpayerIdentity || 'Chưa cập nhật'}</dd></div>
                      <div><dt>Địa chỉ</dt><dd>{information.taxpayerAddress || 'Chưa cập nhật'}</dd></div>
                      <div><dt>Mốc bắt đầu theo dõi</dt><dd>{formatDate(profile.trackingStartedAt)}</dd></div>
                    </dl>
                    <div className="tax-accounting-panel__actions">
                      <button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={openProfileForm} disabled={submitting}><Edit3 size={15} /> Chỉnh sửa hồ sơ</button>
                      {!confirmed && <button type="button" className="tax-accounting-button tax-accounting-button--primary" onClick={handleConfirm} disabled={submitting}><CheckCircle2 size={15} /> Xác nhận hồ sơ</button>}
                      <button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={openTrackingForm} disabled={submitting}><CalendarDays size={15} /> Đổi mốc theo dõi</button>
                    </div>
                    </>
                  ) : <p className="tax-accounting-empty">Chưa có hồ sơ thuế cho năm này.</p>}
                  {!profile && <div className="tax-accounting-panel__actions"><button type="button" className="tax-accounting-button tax-accounting-button--primary" onClick={openProfileForm}><Plus size={15} /> Tạo hồ sơ năm {year}</button></div>}
                </article>

                <article className="tax-accounting-panel">
                  <div className="tax-accounting-panel__heading"><CheckCircle2 size={18} /><h2>Đối chiếu năm</h2></div>
                  <div className={`tax-accounting-reconciliation${summary?.sourceCompletenessVerified ? ' is-complete' : ''}`}>
                    <strong>{summary?.sourceCompletenessVerified ? 'Đã đối chiếu đầy đủ' : 'Chưa đối chiếu đầy đủ'}</strong>
                    <span>{summary?.months?.length || 0} tháng có dữ liệu tổng hợp</span>
                  </div>
                </article>
              </section>

              <section className="tax-accounting-panel tax-accounting-periods">
                <div className="tax-accounting-panel__heading"><CalendarDays size={18} /><h2>Kỳ kế toán theo tháng</h2></div>
                <div className="tax-accounting-table-wrap">
                  <table>
                    <thead><tr><th>Tháng</th><th>Khoảng thời gian</th><th>Trạng thái</th><th>Doanh thu</th><th>Đối chiếu</th><th>Thao tác</th></tr></thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                        const period = periodByMonth.get(month);
                        const monthSummary = summaryByMonth.get(month);
                        const monthStatus = monthSummary?.status || period?.status;
                        return (
                          <tr key={month}>
                            <td>Tháng {month}</td>
                            <td>{period ? `${formatDate(period.startAt || period.periodStart || period.startDate)} - ${formatDate(period.endExclusive || period.periodEnd || period.endDate)}` : monthSummary?.trackingStart ? `Từ ${formatDate(monthSummary.trackingStart)}` : 'Chưa tạo'}</td>
                            <td>{monthStatus ? <span className={`tax-accounting-status tax-accounting-status--${String(monthStatus).toLowerCase()}`}>{statusLabel(monthStatus)}</span> : <span className="tax-accounting-status tax-accounting-status--missing">Chưa tạo</span>}</td>
                            <td>{monthSummary ? formatMoney(monthSummary.recordedRevenue) : period?.recordedRevenue != null ? formatMoney(period.recordedRevenue) : '—'}</td>
                            <td>{monthSummary ? (monthSummary.sourceCompletenessVerified ? 'Đạt' : 'Chưa đạt') : period ? (period.sourceCompletenessVerified ? 'Đạt' : 'Chưa đạt') : '—'}</td>
                            <td><button type="button" className="tax-accounting-table-action" onClick={() => period ? loadPeriodDetail(month) : (setSelectedMonth(month), setPeriodModal('create'))} disabled={!confirmed || submitting}><Search size={14} /> {period ? 'Chi tiết' : 'Tạo kỳ'}</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {selectedMonth && (
                <section className="tax-accounting-panel tax-accounting-period-detail">
                  <div className="tax-accounting-panel__heading"><ChevronDown size={18} /><h2>Chi tiết kỳ tháng {selectedMonth}/{year}</h2></div>
                  {periodError && <div className="tax-accounting-alert tax-accounting-alert--danger tax-accounting-alert--inline"><AlertCircle size={18} /> <span>{periodError}</span></div>}
                  {periodLoading ? <div className="tax-accounting-loading">Đang tải chi tiết kỳ...</div> : periodDetail ? (
                    <>
                      <div className="tax-accounting-period-toolbar">
                        <div><span>Trạng thái</span><strong className={`tax-accounting-status tax-accounting-status--${String(periodDetail.status || '').toLowerCase()}`}>{statusLabel(periodDetail.status)}</strong></div>
                        <div><span>Doanh thu ghi nhận</span><strong>{formatMoney(selectedPeriodRevenue)}</strong></div>
                        <div><span>Đối chiếu</span><strong>{reconciliation?.sourceCompletenessVerified ? 'Đạt' : 'Chưa đạt'}</strong></div>
                        <div className="tax-accounting-period-toolbar__actions">
                          <button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={handleSynchronizeAndReconcile} disabled={periodLoading}><RefreshCw size={15} /> {periodDetail.status === 'OPEN' ? 'Đồng bộ và đối chiếu' : 'Đối chiếu'}</button>
                          {periodDetail.status === 'OPEN' && <button type="button" className="tax-accounting-button tax-accounting-button--primary" onClick={() => { setPeriodReason(''); setPeriodModal('close'); }} disabled={!reconciliation?.canClose || periodLoading}><CheckCircle2 size={15} /> Khóa kỳ</button>}
                        </div>
                      </div>
                      {reconciliation?.issues?.length > 0 && <div className="tax-accounting-issues"><strong>Lỗi đối chiếu</strong><ul>{reconciliation.issues.map((issue, index) => <li key={`${issue}-${index}`}>{typeof issue === 'string' ? issue : issue.message || JSON.stringify(issue)}</li>)}</ul></div>}
                      <div className="tax-accounting-table-wrap">
                        <table>
                          <thead><tr><th>Ngày hạch toán</th><th>Nội dung giao dịch</th><th>Số tiền</th><th>Phân loại</th></tr></thead>
                          <tbody>{revenueLines.length === 0 ? <tr><td colSpan="4" className="tax-accounting-empty">Chưa có dòng doanh thu.</td></tr> : revenueLines.map((line, index) => <tr key={line.id || line.sourceId || index}><td>{formatDate(line.postingDate || line.accountingDate || line.date)}</td><td>{line.description || line.content || '—'}</td><td>{formatMoney(line.amount ?? line.signedAmount)}</td><td>{revenueClassificationLabel(line.classification || line.sourceType)}</td></tr>)}</tbody>
                        </table>
                      </div>
                    </>
                  ) : <div className="tax-accounting-empty">Chưa có chi tiết kỳ được chọn.</div>}
                </section>
              )}

              <section className="tax-accounting-panel tax-accounting-adjustments">
                <div className="tax-accounting-panel__heading"><Edit3 size={18} /><h2>Điều chỉnh doanh thu</h2><button type="button" className="tax-accounting-heading-action" onClick={() => openAdjustmentForm()} disabled={!confirmed || submitting}><Plus size={15} /> Tạo điều chỉnh</button></div>
                {adjustmentError && <div className="tax-accounting-alert tax-accounting-alert--danger tax-accounting-alert--inline"><AlertCircle size={18} /> <span>{adjustmentError}</span></div>}
                <div className="tax-accounting-table-wrap">
                  <table>
                    <thead><tr><th>Mã</th><th>Ngày phát sinh</th><th>Ngày hạch toán</th><th>Số tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                    <tbody>{adjustments.length === 0 ? <tr><td colSpan="6" className="tax-accounting-empty">Chưa có điều chỉnh doanh thu.</td></tr> : adjustments.map((adjustment) => { const information = adjustment.information ?? adjustment; const status = adjustment.status; return <tr key={adjustment.id}><td>{adjustment.id ?? '—'}</td><td>{formatDate(information.occurredAt)}</td><td>{formatDate(information.postingDate)}</td><td>{formatMoney(information.signedAmount)}</td><td><span className={`tax-accounting-status tax-accounting-status--${String(status || '').toLowerCase()}`}>{statusLabel(status)}</span></td><td><div className="tax-accounting-row-actions">{status === 'DRAFT' && <><button type="button" className="tax-accounting-table-action" onClick={() => openAdjustmentForm(adjustment)}><Edit3 size={14} /> Sửa</button><button type="button" className="tax-accounting-table-action" onClick={() => openAdjustmentDecision(adjustment, 'approve')}>Duyệt</button><button type="button" className="tax-accounting-table-action tax-accounting-table-action--danger" onClick={() => openAdjustmentDecision(adjustment, 'reject')}>Từ chối</button></>}</div></td></tr>; })}</tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      {modal && (
        <div className="tax-accounting-modal-overlay" role="presentation" onClick={() => !submitting && setModal(null)}>
          <div className="tax-accounting-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="tax-accounting-modal__header">
              <div><h2>{modal === 'tracking' ? 'Đổi mốc bắt đầu theo dõi' : profile ? 'Chỉnh sửa hồ sơ thuế' : `Tạo hồ sơ thuế năm ${year}`}</h2><p>{modal === 'tracking' ? 'Thay đổi này có thể làm thay đổi phạm vi dữ liệu của nhiều hồ sơ năm.' : 'Kiểm tra thông tin trước khi lưu.'}</p></div>
              <button type="button" className="tax-accounting-modal__close" onClick={() => setModal(null)} aria-label="Đóng">×</button>
            </div>
            {modal === 'tracking' ? (
              <form onSubmit={handleTrackingSubmit}>
                <label>Mốc bắt đầu theo dõi<input type="datetime-local" value={form.trackingStartedAt} onChange={(event) => setForm({ ...form, trackingStartedAt: event.target.value })} required /></label>
                <label>Lý do thay đổi<textarea value={trackingReason} onChange={(event) => setTrackingReason(event.target.value)} minLength={3} required /></label>
                <div className="tax-accounting-modal__footer"><button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={() => setModal(null)}>Hủy</button><button type="submit" className="tax-accounting-button tax-accounting-button--primary" disabled={submitting}>Lưu mốc theo dõi</button></div>
              </form>
            ) : (
              <form onSubmit={handleProfileSubmit}>
                {!profile && <label>Năm thuế<input type="number" value={form.taxYear} onChange={(event) => setForm({ ...form, taxYear: Number(event.target.value) })} min="2000" max="2100" required /></label>}
                {!profile && <label>Mốc bắt đầu theo dõi<input type="datetime-local" value={form.trackingStartedAt} onChange={(event) => setForm({ ...form, trackingStartedAt: event.target.value })} required /></label>}
                <div className="tax-accounting-form-grid">
                  <label>Tên người nộp thuế<input value={form.taxpayerName} onChange={(event) => setForm({ ...form, taxpayerName: event.target.value })} required /></label>
                  <label>Mã số thuế / định danh<input value={form.taxpayerIdentity} onChange={(event) => setForm({ ...form, taxpayerIdentity: event.target.value })} required /></label>
                </div>
                <label>Địa chỉ<input value={form.taxpayerAddress} onChange={(event) => setForm({ ...form, taxpayerAddress: event.target.value })} required /></label>
                <label>Phương pháp kê khai<input value="Theo doanh thu" readOnly /></label>
                <div className="tax-accounting-modal__footer"><button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={() => setModal(null)}>Hủy</button><button type="submit" className="tax-accounting-button tax-accounting-button--primary" disabled={submitting || storeLoading}>{storeLoading ? 'Đang lấy thông tin cửa hàng...' : 'Lưu hồ sơ'}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
      {periodModal && (
        <div className="tax-accounting-modal-overlay" role="presentation" onClick={() => !submitting && setPeriodModal(null)}>
          <div className="tax-accounting-modal tax-accounting-modal--small" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="tax-accounting-modal__header"><div><h2>{periodModal === 'create' ? `Tạo kỳ tháng ${selectedMonth}/${year}` : `Khóa kỳ tháng ${selectedMonth}/${year}`}</h2><p>{periodModal === 'create' ? 'Chỉ hồ sơ đã xác nhận mới được tạo kỳ.' : 'Chỉ khóa kỳ khi đối chiếu đạt và không còn lỗi nguồn dữ liệu.'}</p></div><button type="button" className="tax-accounting-modal__close" onClick={() => setPeriodModal(null)} aria-label="Đóng">×</button></div>
            {periodModal === 'create' ? <form onSubmit={handleCreatePeriod}><div className="tax-accounting-modal__footer"><button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={() => setPeriodModal(null)}>Hủy</button><button type="submit" className="tax-accounting-button tax-accounting-button--primary" disabled={submitting}>Tạo kỳ</button></div></form> : <form onSubmit={handleClosePeriod}><label>Lý do khóa kỳ<textarea value={periodReason} onChange={(event) => setPeriodReason(event.target.value)} minLength={3} required /></label><div className="tax-accounting-modal__footer"><button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={() => setPeriodModal(null)}>Hủy</button><button type="submit" className="tax-accounting-button tax-accounting-button--primary" disabled={submitting}>Xác nhận khóa kỳ</button></div></form>}
          </div>
        </div>
      )}
      {adjustmentModal && (
        <div className="tax-accounting-modal-overlay" role="presentation" onClick={() => !submitting && setAdjustmentModal(null)}>
          <div className="tax-accounting-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="tax-accounting-modal__header"><div><h2>{adjustmentModal.type === 'create' ? 'Tạo điều chỉnh doanh thu' : adjustmentModal.type === 'edit' ? 'Sửa điều chỉnh doanh thu' : adjustmentModal.type === 'approve' ? 'Duyệt điều chỉnh doanh thu' : 'Từ chối điều chỉnh doanh thu'}</h2><p>{adjustmentModal.type === 'approve' || adjustmentModal.type === 'reject' ? 'Nhập lý do xử lý để lưu dấu vết nghiệp vụ.' : 'Điều chỉnh chỉ được cộng vào doanh thu sau khi được duyệt.'}</p></div><button type="button" className="tax-accounting-modal__close" onClick={() => setAdjustmentModal(null)} aria-label="Đóng">×</button></div>
            {adjustmentModal.type === 'approve' || adjustmentModal.type === 'reject' ? <form onSubmit={(event) => { event.preventDefault(); handleAdjustmentDecision(adjustmentModal.adjustment, adjustmentModal.type); }}><label>Lý do xử lý<textarea value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} minLength={3} required /></label>{adjustmentError && <div className="tax-accounting-alert tax-accounting-alert--danger">{adjustmentError}</div>}<div className="tax-accounting-modal__footer"><button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={() => setAdjustmentModal(null)}>Hủy</button><button type="submit" className="tax-accounting-button tax-accounting-button--primary" disabled={submitting}>{adjustmentModal.type === 'approve' ? 'Duyệt điều chỉnh' : 'Từ chối điều chỉnh'}</button></div></form> : <form onSubmit={handleAdjustmentSubmit}><div className="tax-accounting-form-grid"><label>Ngày phát sinh<input type="datetime-local" value={adjustmentForm.occurredAt} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, occurredAt: event.target.value })} required /></label><label>Ngày hạch toán<input type="date" value={adjustmentForm.postingDate} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, postingDate: event.target.value })} required /></label></div><label>Số tiền có dấu<input type="number" step="0.01" value={adjustmentForm.signedAmount} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, signedAmount: event.target.value })} required /></label><label>Lý do đưa vào sổ<textarea value={adjustmentForm.inclusionReason} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, inclusionReason: event.target.value })} minLength={3} required /></label><div className="tax-accounting-modal__footer"><button type="button" className="tax-accounting-button tax-accounting-button--secondary" onClick={() => setAdjustmentModal(null)}>Hủy</button><button type="submit" className="tax-accounting-button tax-accounting-button--primary" disabled={submitting}>Lưu bản nháp</button></div></form>}
          </div>
        </div>
      )}
    </div>
  );
}
