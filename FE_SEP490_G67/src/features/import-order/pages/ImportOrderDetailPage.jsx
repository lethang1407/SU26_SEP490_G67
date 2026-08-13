import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { fetchImportOrderById } from '../api';
import ImportOrderDetailInfo from '../components/ImportOrderDetailInfo';
import ImportOrderLineTable from '../components/ImportOrderLineTable';
import ImportOrderStatusBadge from '../components/ImportOrderStatusBadge';
import ImportOrderSummaryPanel from '../components/ImportOrderSummaryPanel';
import { IMPORT_ORDER_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/ImportOrder.css';

export default function ImportOrderDetailPage() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const loadDetail = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchImportOrderById(orderId);
                if (!cancelled) {
                    setOrder(result);
                }
            } catch (fetchError) {
                if (!cancelled) {
                    setOrder(null);
                    setError(
                        getApiErrorMessage(fetchError, 'Không tìm thấy đơn nhập hàng.'),
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
    }, [orderId]);

    const lines = (order?.items ?? []).map((item, index) => ({
        id: item.batchId ?? `item-${index}`,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.parentName || item.productName,
        parentName: item.parentName || '',
        attributes: item.attributes || [],
        productUnitId: item.productUnitId,
        productUnits: item.productUnits || [],
        unitName: item.unitName || item.unit || 'Cái',
        unit: item.unitName || item.unit || 'Cái',
        quantity: item.quantity,
        costPerUnit: item.costPerUnit,
        expiryDate: item.expiryDate,
        locationId: item.locationId,
        locationLabel: item.locationLabel,
        batchCode: item.batchCode,
        isPromotion: Boolean(item.isPromotion),
        note: item.note || '',
    }));

    if (loading) {
        return (
            <div className="admin-content">
                
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container import-order-page">
                            <div className="import-order-table-card import-order-table-card--empty">
                                <Spinner animation="border" size="sm" className="me-2" />
                                Đang tải chi tiết đơn nhập...
                            </div>
                        </div>
                    </main>
                </div>
        );
    }

    if (!order) {
        return (
            <div className="admin-content">
                
                    <AdminHeader />
                    <main className="admin-main">
                        <div className="dashboard-container import-order-page">
                            <div className="import-order-table-card import-order-table-card--empty">
                                {error && <Alert variant="danger">{error}</Alert>}
                                <p>Không tìm thấy đơn nhập hàng.</p>
                                <Link
                                    to={IMPORT_ORDER_ROUTES.list}
                                    className="import-order-breadcrumb__link"
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
                    <div className="dashboard-container import-order-page import-order-detail-page">
                        <nav className="import-order-breadcrumb" aria-label="Breadcrumb">
                            <Link
                                to={IMPORT_ORDER_ROUTES.list}
                                className="import-order-breadcrumb__link"
                            >
                                Kho hàng
                            </Link>
                            <span className="import-order-breadcrumb__sep">›</span>
                            <Link
                                to={IMPORT_ORDER_ROUTES.list}
                                className="import-order-breadcrumb__link"
                            >
                                Nhập hàng
                            </Link>
                            <span className="import-order-breadcrumb__sep">›</span>
                            <span className="import-order-breadcrumb__current">Chi tiết đơn nhập</span>
                        </nav>

                        <header className="import-order-detail-header">
                            <div className="import-order-detail-header__title-row">
                                <h1 className="inventory-page__title">{order.orderCode}</h1>
                                <ImportOrderStatusBadge status={order.status} />
                            </div>
                            <p className="inventory-page__subtitle">
                                Chi tiết các dòng nhập — mỗi dòng là một lô đã tạo trong kho.
                            </p>
                        </header>

                        <div className="import-order-create-layout">
                            <div className="import-order-create-main">
                                <ImportOrderLineTable lines={lines} readOnly />
                            </div>

                            <aside className="import-order-detail-sidebar">
                                <ImportOrderDetailInfo order={order} />
                                <ImportOrderSummaryPanel lines={lines} note={order.note} />
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
    );
}
