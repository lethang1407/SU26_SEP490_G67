import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { Printer } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { suppliersApi } from '../../supplier/api';
import { createImportReturn, fetchImportReturns } from '../api';
import ImportReturnHistoryList from '../components/ImportReturnHistoryList';
import ImportReturnLineTable from '../components/ImportReturnLineTable';
import ImportReturnProductSearch from '../components/ImportReturnProductSearch';
import ImportReturnSummaryPanel from '../components/ImportReturnSummaryPanel';
import {
    buildCreateReturnPayload,
    createReturnLineFromProduct,
    validateReturnForm,
} from '../utils/importReturnUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/ImportReturn.css';

export default function ImportReturnPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [supplierId, setSupplierId] = useState('');
    const [note, setNote] = useState('');
    const [lines, setLines] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const result = await fetchImportReturns({ page: 0, size: 50 });
            setHistory(result.content ?? []);
        } catch (loadError) {
            setError(
                getApiErrorMessage(loadError, 'Không tải được danh sách đơn trả hàng.'),
            );
            setHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadLookups = async () => {
            try {
                const supplierPage = await suppliersApi.getSuppliers({ page: 0, size: 100 });
                if (!cancelled) {
                    setSuppliers(supplierPage?.content ?? []);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(
                        getApiErrorMessage(loadError, 'Không tải được danh sách nhà cung cấp.'),
                    );
                }
            }
        };

        loadLookups();
        loadHistory();

        return () => {
            cancelled = true;
        };
    }, [loadHistory]);

    const handleAddProduct = (product) => {
        setLines((prev) => {
            const existing = prev.find((line) => line.productId === product.id);
            if (existing) {
                return prev.map((line) =>
                    line.productId === product.id
                        ? { ...line, quantity: Number(line.quantity || 0) + 1 }
                        : line,
                );
            }
            return [...prev, createReturnLineFromProduct(product)];
        });
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

    const handlePriceChange = (lineId, value) => {
        setLines((prev) =>
            prev.map((line) =>
                line.id === lineId
                    ? { ...line, returnPrice: value === '' ? '' : Number(value) }
                    : line,
            ),
        );
    };

    const handleRemoveLine = (lineId) => {
        setLines((prev) => prev.filter((line) => line.id !== lineId));
    };

    const handleSubmit = async () => {
        const validationError = validateReturnForm({ supplierId, lines });
        if (validationError) {
            window.alert(validationError);
            return;
        }

        const supplier = suppliers.find((item) => String(item.id) === String(supplierId));
        setSubmitting(true);
        setError(null);

        try {
            const payload = buildCreateReturnPayload({ supplierId, note, lines });
            const created = await createImportReturn({
                ...payload,
                supplierName: supplier?.name,
            });

            setLines([]);
            setNote('');
            await loadHistory();
            window.alert(`Đã hoàn tất trả hàng.\nMã phiếu: ${created?.returnCode ?? ''}`);
        } catch (submitError) {
            setError(
                getApiErrorMessage(submitError, 'Không thể tạo phiếu trả hàng. Vui lòng thử lại.'),
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
                    <div className="dashboard-container import-return-page">
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Trả hàng</h1>
                                <p className="inventory-page__subtitle">
                                    Tạo phiếu trả hàng nhập cho nhà cung cấp và theo dõi lịch sử đã
                                    trả.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => window.print()}
                                >
                                    <Printer size={18} />
                                    In
                                </button>
                            </div>
                        </header>

                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <section className="import-return-supplier-row">
                            <label className="import-return-supplier-row__label" htmlFor="return-supplier">
                                Nhà cung cấp <span className="import-return-required">*</span>
                            </label>
                            <select
                                id="return-supplier"
                                className="import-return-supplier-row__select"
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
                        </section>

                        <ImportReturnProductSearch
                            onSelectProduct={handleAddProduct}
                            onAddClick={() =>
                                window.alert('Nhập tên hoặc mã sản phẩm rồi chọn từ danh sách.')
                            }
                        />

                        <div className="import-return-layout">
                            <div className="import-return-main">
                                <ImportReturnLineTable
                                    lines={lines}
                                    onQuantityChange={handleQuantityChange}
                                    onPriceChange={handlePriceChange}
                                    onRemoveLine={handleRemoveLine}
                                />

                                <div className="import-return-note-box">
                                    <h3 className="import-return-note-box__title">
                                        Lưu ý về quy trình trả hàng
                                    </h3>
                                    <p className="import-return-note-box__text">
                                        Khi bấm hoàn tất, hệ thống sẽ trừ tồn kho tương ứng và ghi
                                        nhận công nợ với nhà cung cấp. Hãy kiểm tra kỹ số lượng và
                                        đơn giá trước khi xác nhận.
                                    </p>
                                </div>

                                <ImportReturnHistoryList
                                    items={history}
                                    loading={loadingHistory}
                                />
                            </div>

                            <ImportReturnSummaryPanel
                                lines={lines}
                                note={note}
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
