import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import WarehouseReportFilters from '../components/WarehouseReportFilters';
import WarehouseReportKpi from '../components/WarehouseReportKpi';
import WarehouseReportTable from '../components/WarehouseReportTable';
import WarehouseReportPagination from '../components/WarehouseReportPagination';
import SupplierOrderDetailModal from '../../supplier/components/SupplierOrderDetailModal';
import SalesOrderDetailModal from '../../pos-screen/components/SalesOrderDetailModal';
import ImportReturnDetailModal from '../../import-return/components/ImportReturnDetailModal';
import {
  downloadWarehouseReport,
  warehouseReportApi,
} from '../api';
import { resolvePresetRange } from '../utils/warehouseReportUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/WarehouseReport.css';
import '../../../css/ImportOrder.css';
import '../../../css/Supplier.css';

const PAGE_SIZE = 15;

const EMPTY_SUMMARY = {
  openingAmount: 0,
  importAmount: 0,
  exportAmount: 0,
  closingAmount: 0,
};

export default function WarehouseReportPage() {
  const initialRange = resolvePresetRange('all');
  const [fromDate, setFromDate] = useState(initialRange.from || '');
  const [toDate, setToDate] = useState(initialRange.to || '');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [docPopup, setDocPopup] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const types = typeFilter ? [typeFilter] : [];
      const productIds = selectedProducts.map((p) => p.id);
      const result = await warehouseReportApi.getInventoryIo({
        from: fromDate || undefined,
        to: toDate || undefined,
        productIds,
        types,
        page,
        size: PAGE_SIZE,
      });
      setReport(result);
    } catch (err) {
      console.error(err);
      setError('Không tải được báo cáo. Vui lòng thử lại.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedProducts, typeFilter, page]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleDateChange = ({ fromDate: nextFrom = '', toDate: nextTo = '' }) => {
    setFromDate(nextFrom || '');
    setToDate(nextTo || '');
    setPage(0);
  };

  const handleProductsChange = (items) => {
    setSelectedProducts(items);
    setPage(0);
  };

  const handleTypeChange = (value) => {
    setTypeFilter(value);
    setPage(0);
  };

  const handleExport = async () => {
    try {
      const types = typeFilter ? [typeFilter] : [];
      const productIds = selectedProducts.map((p) => p.id);
      const blob = await warehouseReportApi.exportInventoryIo({
        from: fromDate || undefined,
        to: toDate || undefined,
        productIds,
        types,
      });
      downloadWarehouseReport(
        blob,
        `bao-cao-nhap-xuat-ton-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err) {
      console.error(err);
      setError('Xuất Excel thất bại.');
    }
  };

  const handleDocumentClick = (line) => {
    if (!line?.documentKind || !line?.documentId) return;
    setDocPopup({
      kind: line.documentKind,
      id: line.documentId,
    });
  };

  const closeDocPopup = () => setDocPopup(null);

  const summary = report
    ? {
        openingAmount: report.openingAmount,
        importAmount: report.importAmount,
        exportAmount: report.exportAmount,
        closingAmount: report.closingAmount,
      }
    : EMPTY_SUMMARY;

  const totalPages = Math.max(1, report?.totalPages ?? 1);

  return (
    <div className="admin-content">
      <AdminHeader />
      <main className="admin-main">
        <div className="dashboard-container wr-page">
          <div className="wr-page__header">
            <div>
              <h1 className="wr-page__title">Báo cáo nhập xuất tồn chi tiết</h1>
              <p className="wr-page__subtitle">
                Chi tiết từng phiếu nhập/xuất, nhóm theo hàng hóa
              </p>
            </div>
          </div>

          <WarehouseReportFilters
            fromDate={fromDate}
            toDate={toDate}
            onDateChange={handleDateChange}
            selectedProducts={selectedProducts}
            onProductsChange={handleProductsChange}
            typeFilter={typeFilter}
            onTypeChange={handleTypeChange}
            onRefresh={loadReport}
            onExport={handleExport}
            loading={loading}
          />

          {error && <div className="wr-alert">{error}</div>}

          <WarehouseReportKpi summary={summary} />

          <WarehouseReportTable
            products={report?.products || []}
            periodLabel={report?.periodLabel}
            totalProducts={report?.totalProducts}
            page={report?.page}
            totalPages={report?.totalPages}
            onDocumentClick={handleDocumentClick}
          />

          <WarehouseReportPagination
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            totalItems={report?.totalProducts ?? 0}
            onPageChange={setPage}
            disabled={loading}
          />
        </div>
      </main>

      {docPopup?.kind === 'IMPORT' && (
        <SupplierOrderDetailModal orderId={docPopup.id} onClose={closeDocPopup} />
      )}
      {docPopup?.kind === 'SALE' && (
        <SalesOrderDetailModal orderId={docPopup.id} onClose={closeDocPopup} />
      )}
      {docPopup?.kind === 'IMPORT_RETURN' && (
        <ImportReturnDetailModal returnId={docPopup.id} onClose={closeDocPopup} />
      )}
    </div>
  );
}
