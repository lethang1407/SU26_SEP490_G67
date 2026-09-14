import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { fetchInventoryCheckById } from '../api';
import InventoryCheckLineTable from '../components/InventoryCheckLineTable';
import InventoryCheckStatusBadge from '../components/InventoryCheckStatusBadge';
import { InventoryCheckInfoPanel } from '../components/InventoryCheckSidePanels';
import { INVENTORY_CHECK_ROUTES } from '../constants';
import { isEditableStatus } from '../utils/inventoryCheckUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/InventoryCheck.css';
import '../../../css/Supplier.css';

export default function InventoryCheckDetailPage() {
    const { checkId } = useParams();
    const navigate = useNavigate();
    const [lineKeyword, setLineKeyword] = useState('');
    const [check, setCheck] = useState(null);
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const loadDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchInventoryCheckById(checkId);
                if (cancelled) return;
                setCheck(result);
                setLines(result?.lines ?? []);
            } catch (fetchError) {
                if (!cancelled) {
                    setCheck(null);
                    setLines([]);
                    setError(
                        getApiErrorMessage(fetchError, 'Không tìm thấy phiếu kiểm kho.'),
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadDetail();
        return () => {
            cancelled = true;
        };
    }, [checkId]);

    if (loading) {
        return (
            <div className="admin-content">
                
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container inventory-check-page">
                            <div className="inventory-check-table-card inventory-check-table-card--empty">
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang tải chi tiết phiếu kiểm kho...
                            </div>
                        </div>
                    </main>
                </div>
        );
    }

    if (!check) {
        return (
            <div className="admin-content">
                
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container inventory-check-page">
                            <div className="inventory-check-table-card inventory-check-table-card--empty">
                                {error && <Alert variant="danger">{error}</Alert>}
                                <p>Không tìm thấy phiếu kiểm kho.</p>
                                <Link
                                    to={INVENTORY_CHECK_ROUTES.list}
                                    className="inventory-check-breadcrumb__link"
                                >
                                    Quay lại danh sách
                                </Link>
                            </div>
                        </div>
                    </main>
                </div>
        );
    }

    return (
        <div className="admin-content">
            
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container inventory-check-page inventory-check-detail-page">
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
                                Chi tiết phiếu kiểm kho
                            </span>
                        </nav>

                        <header className="inventory-check-detail-header">
                            <div className="inventory-check-detail-header__title-row">
                                <h1 className="inventory-check-detail-header__title">
                                    Chi tiết phiếu kiểm kho: {check.code}
                                </h1>
                                <InventoryCheckStatusBadge status={check.status} />
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => navigate(INVENTORY_CHECK_ROUTES.list)}
                                >
                                    Quay lại
                                </button>
                            </div>
                        </header>

                        <div className="inventory-check-detail-layout">
                            <div className="inventory-check-detail-main">
                                <InventoryCheckLineTable
                                    lines={lines}
                                    keyword={lineKeyword}
                                    onKeywordChange={setLineKeyword}
                                    editable={isEditableStatus(check.status)}
                                />
                            </div>

                            <aside className="inventory-check-detail-sidebar">
                                <InventoryCheckInfoPanel
                                    check={check}
                                    showSummary
                                    lines={lines}
                                />
                            </aside>
                        </div>
                    </div>
                </main>
        </div>
    );
}
