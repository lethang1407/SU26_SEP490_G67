import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { createInventoryCheck, fetchInventoryCheckProductPreview } from '../api';
import InventoryCheckLineTable from '../components/InventoryCheckLineTable';
import InventoryCheckProductSearch from '../components/InventoryCheckProductSearch';
import {
    InventoryCheckNotePanel,
    InventoryCheckSummaryPanel,
} from '../components/InventoryCheckSidePanels';
import { INVENTORY_CHECK_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/InventoryCheck.css';
import '../../../css/ImportOrder.css';

export default function CreateInventoryCheckPage() {
    const navigate = useNavigate();
    const [note, setNote] = useState('');
    const [lineKeyword, setLineKeyword] = useState('');
    const [lines, setLines] = useState([]);
    const [addingProduct, setAddingProduct] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSelectProduct = async (product) => {
        if (!product?.id) return;

        if (lines.some((line) => line.productId === product.id)) {
            window.alert('Sản phẩm này đã có trong phiếu kiểm.');
            return;
        }

        setAddingProduct(true);
        setError(null);
        try {
            const preview = await fetchInventoryCheckProductPreview(product.id);
            setLines((prev) => [
                ...prev,
                {
                    id: `new-${preview.productId}`,
                    productId: preview.productId,
                    productCode: preview.productCode,
                    productName: preview.productName,
                    unit: preview.unit,
                    systemQty: preview.systemQty ?? 0,
                    actualQty: preview.systemQty ?? 0,
                    importPrice: preview.importPrice ?? 0,
                    note: '',
                },
            ]);
        } catch (fetchError) {
            setError(
                getApiErrorMessage(
                    fetchError,
                    'Không tải được tồn hệ thống của sản phẩm. Vui lòng thử lại.',
                ),
            );
        } finally {
            setAddingProduct(false);
        }
    };

    const handleActualQtyChange = (lineId, value) => {
        setLines((prev) =>
            prev.map((line) =>
                (line.id ?? line.productId) === lineId
                    ? { ...line, actualQty: value === '' ? '' : Number(value) }
                    : line,
            ),
        );
    };

    const handleNoteChange = (lineId, value) => {
        setLines((prev) =>
            prev.map((line) =>
                (line.id ?? line.productId) === lineId ? { ...line, note: value } : line,
            ),
        );
    };

    const handleRemoveLine = (lineId) => {
        setLines((prev) => prev.filter((line) => (line.id ?? line.productId) !== lineId));
    };

    const handleSubmit = async () => {
        if (lines.length === 0) {
            window.alert('Vui lòng thêm ít nhất một sản phẩm vào phiếu kiểm.');
            return;
        }

        const hasEmptyActual = lines.some(
            (line) => line.actualQty === '' || line.actualQty === null || Number.isNaN(line.actualQty),
        );
        if (hasEmptyActual) {
            window.alert('Vui lòng nhập số lượng thực tế cho tất cả các dòng.');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const created = await createInventoryCheck({
                warehouse: 'Kho chính - CH01',
                note,
                lines: lines.map((line) => ({
                    productId: line.productId,
                    actualQty: Number(line.actualQty),
                    note: line.note || null,
                })),
            });
            window.alert(
                `Đã lưu phiếu kiểm kho ${created?.code ?? ''}.\nTồn kho đã được cập nhật theo kết quả kiểm.`,
            );
            navigate(INVENTORY_CHECK_ROUTES.list);
        } catch (submitError) {
            setError(
                getApiErrorMessage(submitError, 'Không thể lưu phiếu kiểm kho. Vui lòng thử lại.'),
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container inventory-check-page inventory-check-create-page">
                        <nav className="inventory-check-breadcrumb" aria-label="Breadcrumb">
                            <Link
                                to={INVENTORY_CHECK_ROUTES.list}
                                className="inventory-check-breadcrumb__link"
                            >
                                Kho hàng
                            </Link>
                            <span className="inventory-check-breadcrumb__sep">›</span>
                            <Link
                                to={INVENTORY_CHECK_ROUTES.list}
                                className="inventory-check-breadcrumb__link"
                            >
                                Kiểm kho
                            </Link>
                            <span className="inventory-check-breadcrumb__sep">›</span>
                            <span className="inventory-check-breadcrumb__current">
                                Tạo phiếu kiểm kho
                            </span>
                        </nav>

                        <header className="inventory-check-detail-header">
                            <div>
                                <h1 className="inventory-page__title">Tạo phiếu kiểm kho</h1>
                                <p className="inventory-page__subtitle">
                                    Tự thêm sản phẩm cần kiểm — giống cách thêm hàng khi nhập kho.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => navigate(INVENTORY_CHECK_ROUTES.list)}
                                    disabled={submitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--primary"
                                    onClick={handleSubmit}
                                    disabled={submitting || addingProduct}
                                >
                                    {submitting ? 'Đang lưu...' : 'Lưu phiếu'}
                                </button>
                            </div>
                        </header>

                        {error && (
                            <Alert variant="danger" className="mb-0">
                                {error}
                            </Alert>
                        )}

                        <section className="inventory-check-search-section">
                            <InventoryCheckProductSearch onSelect={handleSelectProduct} />
                            {addingProduct ? (
                                <p className="inventory-check-search-section__hint">
                                    Đang lấy tồn hệ thống...
                                </p>
                            ) : null}
                        </section>

                        <div className="inventory-check-detail-layout">
                            <div className="inventory-check-detail-main">
                                <InventoryCheckLineTable
                                    lines={lines}
                                    keyword={lineKeyword}
                                    onKeywordChange={setLineKeyword}
                                    editable
                                    onActualQtyChange={handleActualQtyChange}
                                    onNoteChange={handleNoteChange}
                                    onRemoveLine={handleRemoveLine}
                                />
                            </div>

                            <aside className="inventory-check-detail-sidebar">
                                <InventoryCheckSummaryPanel lines={lines} />
                                <InventoryCheckNotePanel
                                    note={note}
                                    editable
                                    onChange={setNote}
                                />
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
