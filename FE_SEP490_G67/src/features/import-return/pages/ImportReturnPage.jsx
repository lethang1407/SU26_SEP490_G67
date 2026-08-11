import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-bootstrap';
import { History, FileText, X } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { fetchInventoryCheckProductPreview } from '../../inventory-check/api';
import InventoryCheckProductSearch from '../../inventory-check/components/InventoryCheckProductSearch';
import {
    createAndSubmitImportReturn,
    createImportReturnDraft,
    fetchImportReturnDraft,
    submitImportReturn,
    updateImportReturnDraft,
} from '../api';
import ImportReturnListModal from '../components/ImportReturnListModal';
import { RETURN_METHOD, formatCurrency } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/ImportReturn.css';
import '../../../css/InventoryCheck.css';
import '../../../css/Supplier.css';

function createRowKey() {
    return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ImportReturnPage() {
    const [rows, setRows] = useState([]);
    const [note, setNote] = useState('');
    const [editingDraftId, setEditingDraftId] = useState(null);
    const [bannerDraft, setBannerDraft] = useState(null);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [modalMode, setModalMode] = useState(null);
    const [modalDetailId, setModalDetailId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loadingBatchesFor, setLoadingBatchesFor] = useState(null);

    const loadBanner = useCallback(async () => {
        try {
            const draft = await fetchImportReturnDraft({
                source: 'INVENTORY_CHECK',
                createIfMissing: false,
            });
            if (draft?.id && (draft.lines?.length ?? 0) > 0) {
                setBannerDraft(draft);
            } else {
                setBannerDraft(null);
            }
        } catch {
            setBannerDraft(null);
        }
    }, []);

    useEffect(() => {
        loadBanner();
    }, [loadBanner]);

    const totalValue = useMemo(
        () =>
            rows.reduce(
                (sum, row) => sum + Number(row.quantity || 0) * Number(row.returnPrice || 0),
                0,
            ),
        [rows],
    );

    const supplierCount = useMemo(() => {
        const set = new Set(rows.map((r) => r.supplierId).filter(Boolean));
        return set.size;
    }, [rows]);

    const handleSelectProduct = async (product) => {
        if (!product?.id) return;
        setError(null);
        setLoadingBatchesFor(product.id);
        try {
            const preview = await fetchInventoryCheckProductPreview(product.id);
            const batches = (preview.batches ?? []).filter((b) => b.importOrderId);
            if (batches.length === 0) {
                window.alert('Sản phẩm không có lô gắn phiếu nhập để đổi/trả.');
                return;
            }
            const first = batches[0];
            setRows((prev) => [
                ...prev,
                {
                    key: createRowKey(),
                    productId: preview.productId,
                    productCode: preview.productCode,
                    productName: preview.productName,
                    batches,
                    stockBatchId: first.id,
                    batchCode: first.batchCode,
                    quantity: Math.min(1, first.quantity ?? 1),
                    maxQuantity: first.quantity ?? 0,
                    supplierId: first.supplierId ?? null,
                    supplierName: first.supplierName ?? null,
                    importOrderId: first.importOrderId ?? null,
                    returnPrice: Number(first.costPerUnit ?? preview.importPrice ?? 0),
                    note: '',
                    method: RETURN_METHOD.RETURN,
                },
            ]);
        } catch (loadError) {
            setError(getApiErrorMessage(loadError, 'Không tải được lô sản phẩm.'));
        } finally {
            setLoadingBatchesFor(null);
        }
    };

    const updateRow = (key, patch) => {
        setRows((prev) =>
            prev.map((row) => {
                if (row.key !== key) return row;
                const next = { ...row, ...patch };
                if (patch.stockBatchId != null) {
                    const batch = (row.batches ?? []).find(
                        (b) => String(b.id) === String(patch.stockBatchId),
                    );
                    if (batch) {
                        next.batchCode = batch.batchCode;
                        next.maxQuantity = batch.quantity ?? 0;
                        next.supplierId = batch.supplierId ?? null;
                        next.supplierName = batch.supplierName ?? null;
                        next.importOrderId = batch.importOrderId ?? null;
                        next.returnPrice = Number(batch.costPerUnit ?? row.returnPrice ?? 0);
                        next.quantity = Math.min(
                            Number(next.quantity) || 1,
                            next.maxQuantity || 1,
                        );
                    }
                }
                return next;
            }),
        );
    };

    const removeRow = (key) => {
        setRows((prev) => prev.filter((row) => row.key !== key));
    };

    const buildPayload = () => ({
        note: note || null,
        source: 'MANUAL',
        lines: rows.map((row) => ({
            batchId: row.stockBatchId,
            quantity: Number(row.quantity),
            method: row.method,
            note: row.note || null,
            returnReason: row.note || null,
        })),
    });

    const validateRows = () => {
        if (rows.length === 0) {
            window.alert('Vui lòng thêm ít nhất một sản phẩm.');
            return false;
        }
        for (const row of rows) {
            const qty = Number(row.quantity);
            if (!row.stockBatchId || !Number.isFinite(qty) || qty < 1 || qty > row.maxQuantity) {
                window.alert(`Số lượng không hợp lệ cho ${row.productName}.`);
                return false;
            }
        }
        return true;
    };

    const clearWorking = () => {
        setRows([]);
        setNote('');
        setEditingDraftId(null);
    };

    const handleSaveDraft = async () => {
        if (!validateRows()) return;
        setSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            const payload = buildPayload();
            if (editingDraftId) {
                await updateImportReturnDraft(editingDraftId, payload);
                setSuccess('Đã cập nhật phiếu nháp (đã điều chỉnh tồn).');
            } else {
                await createImportReturnDraft(payload);
                setSuccess('Đã lưu phiếu nháp và trừ tồn.');
            }
            clearWorking();
            loadBanner();
        } catch (saveError) {
            setError(getApiErrorMessage(saveError, 'Không lưu nháp được.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveSubmit = async () => {
        if (!validateRows()) return;
        setSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            if (editingDraftId) {
                await updateImportReturnDraft(editingDraftId, buildPayload());
                await submitImportReturn(editingDraftId);
            } else {
                await createAndSubmitImportReturn(buildPayload());
            }
            setSuccess('Đã lưu đổi trả. Phiếu vào lịch sử (đang đổi trả).');
            clearWorking();
            loadBanner();
        } catch (saveError) {
            setError(getApiErrorMessage(saveError, 'Không lưu đổi trả được.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditDraft = (detail) => {
        if (!detail) return;
        setEditingDraftId(detail.id);
        setNote(detail.note || '');
        setRows(
            (detail.lines ?? []).map((line) => ({
                key: createRowKey(),
                productId: line.productId,
                productCode: line.productCode,
                productName: line.productName,
                batches: [
                    {
                        id: line.stockBatchId,
                        batchCode: line.batchCode,
                        quantity: line.maxQuantity ?? line.quantity,
                        supplierId: line.supplierId,
                        supplierName: line.supplierName,
                        importOrderId: line.importOrderId,
                        costPerUnit: line.returnPrice,
                    },
                ],
                stockBatchId: line.stockBatchId,
                batchCode: line.batchCode,
                quantity: line.quantity,
                maxQuantity: line.maxQuantity ?? line.quantity,
                supplierId: line.supplierId,
                supplierName: line.supplierName,
                importOrderId: line.importOrderId,
                returnPrice: Number(line.returnPrice || 0),
                note: line.note || line.returnReason || '',
                method: line.method || RETURN_METHOD.RETURN,
            })),
        );
        setSuccess('Đã tải phiếu nháp lên trang chính để chỉnh sửa.');
    };

    const showBanner = !bannerDismissed && bannerDraft?.id;

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container import-return-page">
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Đổi trả hàng nhà cung cấp</h1>
                                <p className="inventory-page__subtitle">
                                    Thêm sản phẩm vào bảng, chọn lô / hình thức, rồi lưu nháp hoặc lưu
                                    đổi trả.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => {
                                        setModalDetailId(null);
                                        setModalMode('drafts');
                                    }}
                                >
                                    <FileText size={18} />
                                    Nháp
                                </button>
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => {
                                        setModalDetailId(null);
                                        setModalMode('history');
                                    }}
                                >
                                    <History size={18} />
                                    Lịch sử trả hàng
                                </button>
                            </div>
                        </header>

                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}

                        {showBanner ? (
                            <div className="import-return-check-banner">
                                <button
                                    type="button"
                                    className="import-return-check-banner__main"
                                    onClick={() => {
                                        setModalDetailId(bannerDraft.id);
                                        setModalMode('drafts');
                                    }}
                                >
                                    <strong>
                                        Có {(bannerDraft.lines ?? []).length} sản phẩm cần trả từ kiểm
                                        kho
                                    </strong>
                                    <span>
                                        Giá trị hoàn: {formatCurrency(bannerDraft.totalRefund)}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="import-return-check-banner__close"
                                    onClick={() => setBannerDismissed(true)}
                                    aria-label="Đóng"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : null}

                        <div className="import-return-workspace">
                            <div className="import-return-workspace__main">
                                <div className="import-return-card">
                                    <InventoryCheckProductSearch
                                        onSelect={handleSelectProduct}
                                        showAddProduct={false}
                                        placeholder="Tìm hàng hóa theo mã hoặc tên để thêm vào phiếu đổi trả..."
                                    />
                                    {loadingBatchesFor ? (
                                        <p className="text-muted mt-2">Đang tải lô...</p>
                                    ) : null}
                                </div>

                                <div className="import-return-card import-return-table-card">
                                    <div className="import-return-table-wrap">
                                        <table className="import-return-main-table">
                                            <thead>
                                                <tr>
                                                    <th>STT</th>
                                                    <th>Tên SP</th>
                                                    <th>Số lô</th>
                                                    <th>Số lượng</th>
                                                    <th>Nhà cung cấp</th>
                                                    <th>Ghi chú</th>
                                                    <th>Hình thức</th>
                                                    <th>Giá trị</th>
                                                    <th />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} className="text-muted">
                                                            Chưa có dòng. Tìm và chọn sản phẩm ở trên.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    rows.map((row, index) => (
                                                        <tr key={row.key}>
                                                            <td>{index + 1}</td>
                                                            <td>{row.productName}</td>
                                                            <td>
                                                                <select
                                                                    value={row.stockBatchId ?? ''}
                                                                    onChange={(e) =>
                                                                        updateRow(row.key, {
                                                                            stockBatchId: Number(
                                                                                e.target.value,
                                                                            ),
                                                                        })
                                                                    }
                                                                >
                                                                    {(row.batches ?? []).map((b) => (
                                                                        <option key={b.id} value={b.id}>
                                                                            {b.batchCode} ({b.quantity})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    max={row.maxQuantity}
                                                                    value={row.quantity}
                                                                    onChange={(e) =>
                                                                        updateRow(row.key, {
                                                                            quantity: e.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </td>
                                                            <td>{row.supplierName || '—'}</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={row.note}
                                                                    placeholder="Ghi chú"
                                                                    onChange={(e) =>
                                                                        updateRow(row.key, {
                                                                            note: e.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </td>
                                                            <td>
                                                                <select
                                                                    value={row.method}
                                                                    onChange={(e) =>
                                                                        updateRow(row.key, {
                                                                            method: e.target.value,
                                                                        })
                                                                    }
                                                                >
                                                                    <option value={RETURN_METHOD.RETURN}>
                                                                        Trả
                                                                    </option>
                                                                    <option
                                                                        value={RETURN_METHOD.EXCHANGE}
                                                                    >
                                                                        Đổi
                                                                    </option>
                                                                </select>
                                                            </td>
                                                            <td>
                                                                {formatCurrency(
                                                                    Number(row.quantity || 0) *
                                                                        Number(row.returnPrice || 0),
                                                                )}
                                                            </td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="inventory-check-line-table__remove"
                                                                    onClick={() => removeRow(row.key)}
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="import-return-footer-bar">
                                    <div className="import-return-footer-bar__total">
                                        Tổng giá trị:{' '}
                                        <strong>{formatCurrency(totalValue)}</strong>
                                    </div>
                                    <div className="import-return-footer-bar__actions">
                                        <button
                                            type="button"
                                            className="inventory-btn inventory-btn--secondary"
                                            disabled={submitting}
                                            onClick={handleSaveDraft}
                                        >
                                            {submitting ? 'Đang lưu...' : 'Lưu Nháp'}
                                        </button>
                                        <button
                                            type="button"
                                            className="inventory-btn inventory-btn--primary"
                                            disabled={submitting}
                                            onClick={handleSaveSubmit}
                                        >
                                            {submitting ? 'Đang lưu...' : 'Lưu Đổi Trả'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <aside className="import-return-workspace__side">
                                <section className="import-return-side-card">
                                    <h3>Thông tin phiếu</h3>
                                    <dl>
                                        <div>
                                            <dt>Số dòng</dt>
                                            <dd>{rows.length}</dd>
                                        </div>
                                        <div>
                                            <dt>Số NCC</dt>
                                            <dd>{supplierCount}</dd>
                                        </div>
                                        <div>
                                            <dt>Tổng hoàn</dt>
                                            <dd>{formatCurrency(totalValue)}</dd>
                                        </div>
                                        {editingDraftId ? (
                                            <div>
                                                <dt>Đang sửa nháp</dt>
                                                <dd>#{editingDraftId}</dd>
                                            </div>
                                        ) : null}
                                    </dl>
                                    <label className="import-return-side-card__note">
                                        Ghi chú phiếu
                                        <textarea
                                            rows={4}
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Ghi chú chung..."
                                        />
                                    </label>
                                </section>
                            </aside>
                        </div>
                    </div>
                </main>
            </div>

            <ImportReturnListModal
                open={modalMode === 'drafts'}
                mode="drafts"
                initialDetailId={modalDetailId}
                onClose={() => {
                    setModalMode(null);
                    setModalDetailId(null);
                    loadBanner();
                }}
                onEditDraft={handleEditDraft}
            />
            <ImportReturnListModal
                open={modalMode === 'history'}
                mode="history"
                initialDetailId={null}
                onClose={() => setModalMode(null)}
            />
        </div>
    );
}
