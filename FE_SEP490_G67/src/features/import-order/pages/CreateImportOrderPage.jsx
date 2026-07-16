import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { suppliersApi } from '../../supplier/api';
import { fetchStorageLocations } from '../../storage-location/api';
import { createImportOrder } from '../api';
import ImportOrderLineTable from '../components/ImportOrderLineTable';
import ImportOrderProductSearch from '../components/ImportOrderProductSearch';
import ImportOrderSummaryPanel from '../components/ImportOrderSummaryPanel';
import { IMPORT_ORDER_ROUTES } from '../constants';
import {
    buildCreateImportPayload,
    createLineFromProduct,
    validateImportForm,
} from '../utils/importOrderUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/ImportOrder.css';

function todayInputValue() {
    return new Date().toISOString().slice(0, 10);
}

export default function CreateImportOrderPage() {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [supplierId, setSupplierId] = useState('');
    const [receivedDate, setReceivedDate] = useState(todayInputValue());
    const [note, setNote] = useState('');
    const [lines, setLines] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const loadLookups = async () => {
            try {
                const [supplierPage, storageLocations] = await Promise.all([
                    suppliersApi.getSuppliers({ page: 0, size: 100 }),
                    fetchStorageLocations(),
                ]);
                if (!cancelled) {
                    setSuppliers(supplierPage?.content ?? []);
                    setLocations(storageLocations ?? []);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        getApiErrorMessage(
                            loadError,
                            'Không tải được nhà cung cấp / vị trí kho.',
                        ),
                    );
                }
            }
        };

        loadLookups();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleAddProduct = (product) => {
        setLines((prev) => [...prev, createLineFromProduct(product)]);
    };

    const handleQuantityChange = (lineId, value) => {
        setLines((prev) =>
            prev.map((line) =>
                line.id === lineId
                    ? { ...line, quantity: value === '' ? '' : Number(value) }
                    : line,
            ),
        );
    };

    const handleCostChange = (lineId, value) => {
        setLines((prev) =>
            prev.map((line) =>
                line.id === lineId
                    ? { ...line, costPerUnit: value === '' ? '' : Number(value) }
                    : line,
            ),
        );
    };

    const handleExpiryChange = (lineId, value) => {
        setLines((prev) =>
            prev.map((line) => (line.id === lineId ? { ...line, expiryDate: value } : line)),
        );
    };

    const handleLocationChange = (lineId, locationId, locationLabel) => {
        setLines((prev) =>
            prev.map((line) =>
                line.id === lineId
                    ? { ...line, locationId, locationLabel: locationLabel || '' }
                    : line,
            ),
        );
    };

    const handleRemoveLine = (lineId) => {
        setLines((prev) => prev.filter((line) => line.id !== lineId));
    };

    const handleSubmit = async () => {
        const validationError = validateImportForm({ supplierId, lines });
        if (validationError) {
            window.alert(validationError);
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const payload = buildCreateImportPayload({
                supplierId,
                receivedDate,
                note,
                lines,
            });
            const created = await createImportOrder(payload);
            window.alert(
                `Đã hoàn tất nhập hàng.\nMã đơn: ${created?.orderCode ?? ''}\nSố lô tạo: ${created?.items?.length ?? lines.length}`,
            );
            navigate(IMPORT_ORDER_ROUTES.list);
        } catch (submitError) {
            setError(
                getApiErrorMessage(submitError, 'Không thể tạo phiếu nhập hàng. Vui lòng thử lại.'),
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
                    <div className="dashboard-container import-order-page import-order-create-page">
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
                            <span className="import-order-breadcrumb__current">Tạo phiếu nhập</span>
                        </nav>

                        {error && (
                            <Alert variant="danger" className="mb-0">
                                {error}
                            </Alert>
                        )}

                        <ImportOrderProductSearch onSelectProduct={handleAddProduct} />

                        <section className="import-order-create-form">
                            <div className="import-order-create-form__row">
                                <div className="import-order-create-field">
                                    <label className="import-order-create-field__label">
                                        Nhà cung cấp <span className="import-order-required">*</span>
                                    </label>
                                    <select
                                        className="import-order-create-field__select"
                                        value={supplierId}
                                        onChange={(event) => setSupplierId(event.target.value)}
                                    >
                                        <option value="">Chọn nhà cung cấp</option>
                                        {suppliers.map((supplier) => (
                                            <option key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="import-order-create-field">
                                    <label className="import-order-create-field__label">
                                        Ngày nhập <span className="import-order-required">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="import-order-create-field__input"
                                        value={receivedDate}
                                        onChange={(event) => setReceivedDate(event.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="import-order-create-layout">
                            <div className="import-order-create-main">
                                <ImportOrderLineTable
                                    lines={lines}
                                    locations={locations}
                                    editable
                                    onQuantityChange={handleQuantityChange}
                                    onCostChange={handleCostChange}
                                    onExpiryChange={handleExpiryChange}
                                    onLocationChange={handleLocationChange}
                                    onRemoveLine={handleRemoveLine}
                                />
                            </div>

                            <ImportOrderSummaryPanel
                                lines={lines}
                                note={note}
                                editable
                                onNoteChange={setNote}
                                onSubmit={handleSubmit}
                                submitting={submitting}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
