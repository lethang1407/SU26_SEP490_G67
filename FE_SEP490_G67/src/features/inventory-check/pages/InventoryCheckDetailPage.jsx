import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, Printer } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getCheckLinesById, getInventoryCheckById } from '../api/mockData';
import InventoryCheckLineTable from '../components/InventoryCheckLineTable';
import InventoryCheckStatusBadge from '../components/InventoryCheckStatusBadge';
import {
    InventoryCheckInfoPanel,
    InventoryCheckNotePanel,
    InventoryCheckSummaryPanel,
} from '../components/InventoryCheckSidePanels';
import { INVENTORY_CHECK_ROUTES } from '../constants';
import { isEditableStatus } from '../utils/inventoryCheckUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/InventoryCheck.css';

export default function InventoryCheckDetailPage() {
    const { checkId } = useParams();
    const navigate = useNavigate();
    const [lineKeyword, setLineKeyword] = useState('');

    const check = useMemo(() => getInventoryCheckById(checkId), [checkId]);
    const lines = useMemo(() => getCheckLinesById(checkId), [checkId]);

    if (!check) {
        return (
            <div className="admin-layout">
                <SideBar />
                <div className="admin-content">
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container inventory-check-page">
                            <div className="inventory-check-table-card inventory-check-table-card--empty">
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
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <SideBar />
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
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => window.alert('Chức năng in phiếu đang phát triển.')}
                                >
                                    <Printer size={18} />
                                    In phiếu
                                </button>
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => window.alert('Chức năng xuất file đang phát triển.')}
                                >
                                    <Download size={18} />
                                    Xuất file
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
                                <InventoryCheckInfoPanel check={check} />
                                <InventoryCheckSummaryPanel lines={lines} />
                                <InventoryCheckNotePanel note={check.generalNote} />
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
