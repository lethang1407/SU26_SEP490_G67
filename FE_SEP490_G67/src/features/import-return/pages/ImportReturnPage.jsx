import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import { History, FileText, ChevronDown, X } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SuccessNoticeModal from '../../../components/ui/SuccessNoticeModal';
import AlertNoticeModal from '../../../components/ui/AlertNoticeModal';
import StyledSelect from '../../../components/ui/StyledSelect';
import { getApiErrorMessage } from '../../../utils/api-utils';
import { fetchInventoryCheckProductPreview } from '../../inventory-check/api';
import InventoryCheckProductSearch from '../../inventory-check/components/InventoryCheckProductSearch';
import {
    createAndSubmitImportReturn,
    createImportReturnDraft,
    fetchImportReturns,
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
    const [checkDrafts, setCheckDrafts] = useState([]);
    const [bannerCollapsed, setBannerCollapsed] = useState(false);
    // Dashboard (thẻ "Kho hàng" → lằn "Chờ xử lý") mở thẳng danh sách phiếu đổi trả.
    const location = useLocation();
    const [modalMode, setModalMode] = useState(
        location.state?.openAwaitingProcessing ? 'history' : null,
    );
    const [modalDetailId, setModalDetailId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [warning, setWarning] = useState(null);
    const [loadingBatchesFor, setLoadingBatchesFor] = useState(null);

    const loadBanner = useCallback(async () => {
        try {
            const page = await fetchImportReturns({
                status: 'DRAFT',
                source: 'INVENTORY_CHECK',
                page: 0,
                size: 50,
            });
            const items = (page?.content ?? []).filter(
                (item) => Number(item.itemCount ?? 0) > 0,
            );
            setCheckDrafts(items);
        } catch {
            setCheckDrafts([]);
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
                setWarning('Sản phẩm không có lô gắn phiếu nhập để đổi/trả.');
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
            setWarning('Vui lòng thêm ít nhất một sản phẩm.');
            return false;
        }
        for (const row of rows) {
            const qty = Number(row.quantity);
            if (!row.stockBatchId || !Number.isFinite(qty) || qty < 1 || qty > row.maxQuantity) {
                setWarning(`Số lượng không hợp lệ cho ${row.productName}.`);
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
                setSuccess('Đã lưu phiếu nháp.');
            } else {
                await createImportReturnDraft(payload);
                setSuccess('Đã lưu phiếu nháp.');
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
            setSuccess('Đã lưu đổi trả.');
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
    };

    const showBanner = checkDrafts.length > 0;

    return (
        <div className="admin-content">
            
                <AdminHeader />
                <main className="admin-main import-return-main">
                    <div className="dashboard-container import-return-page">
                        <header className="inventory-page__header">
                            <div>
                                <h1 className="inventory-page__title">Đổi trả hàng hóa</h1>
                                <p className="inventory-page__subtitle">
                                    Đổi trả hàng hóa cho nhà cung cấp
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

                        {showBanner ? (
                            <section
                                className={`import-return-check-banner import-return-check-banner--top${bannerCollapsed ? ' import-return-check-banner--collapsed' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="import-return-check-banner__header"
                                    onClick={() => setBannerCollapsed((prev) => !prev)}
                                    aria-expanded={!bannerCollapsed}
                                >
                                    <strong>
                                        Cần đổi/trả từ kiểm kho ({checkDrafts.length})
                                    </strong>
                                    <ChevronDown
                                        size={18}
                                        className="import-return-check-banner__chevron"
                                        aria-hidden="true"
                                    />
                                </button>
                                {!bannerCollapsed ? (
                                    <ul className="import-return-check-banner__list">
                                        {checkDrafts.map((draft) => (
                                            <li key={draft.id}>
                                                <button
                                                    type="button"
                                                    className="import-return-check-banner__item"
                                                    onClick={() => {
                                                        setModalDetailId(draft.id);
                                                        setModalMode('drafts');
                                                    }}
                                                >
                                                    <span className="import-return-check-banner__item-title">
                                                        {draft.inventoryCheckCode
                                                            ? `Kiểm kho ${draft.inventoryCheckCode}`
                                                            : draft.returnCode ||
                                                              `Nháp #${draft.id}`}
                                                    </span>
                                                    <span className="import-return-check-banner__item-meta">
                                                        {draft.itemCount ?? 0} sản phẩm
                                                        {' · '}
                                                        {formatCurrency(draft.totalRefund)}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </section>
                        ) : (
                            <section className="import-return-side-card import-return-side-card--empty import-return-check-banner--top">
                                <h3>Cần đổi/trả từ kiểm kho</h3>
                                <p className="text-muted mb-0">
                                    Hiện không có phiếu nháp từ kiểm kho.
                                </p>
                            </section>
                        )}

                        <div className="import-return-workspace">
                            <div className="import-return-workspace__main">
                                <div className="import-return-card import-return-main-panel">
                                    <div className="import-return-main-panel__search">
                                        <InventoryCheckProductSearch
                                            onSelect={handleSelectProduct}
                                            showAddProduct={false}
                                            placeholder="Tìm hàng hóa theo mã hoặc tên để thêm vào phiếu đổi trả..."
                                        />
                                        {loadingBatchesFor ? (
                                            <p className="text-muted mt-2 mb-0">Đang tải lô...</p>
                                        ) : null}
                                    </div>

                                    <div className="import-return-main-panel__table">
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
                                                                <StyledSelect
                                                                    className="styled-select--compact"
                                                                    value={row.stockBatchId ?? ''}
                                                                    options={(row.batches ?? []).map((b) => ({
                                                                        value: b.id,
                                                                        label: `${b.batchCode} (${b.quantity})`,
                                                                    }))}
                                                                    onChange={(next) =>
                                                                        updateRow(row.key, {
                                                                            stockBatchId: Number(next),
                                                                        })
                                                                    }
                                                                />
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
                                                                <StyledSelect
                                                                    className="styled-select--compact"
                                                                    value={row.method}
                                                                    options={[
                                                                        {
                                                                            value: RETURN_METHOD.RETURN,
                                                                            label: 'Trả',
                                                                        },
                                                                        {
                                                                            value: RETURN_METHOD.EXCHANGE,
                                                                            label: 'Đổi',
                                                                        },
                                                                    ]}
                                                                    onChange={(next) =>
                                                                        updateRow(row.key, {
                                                                            method: next,
                                                                        })
                                                                    }
                                                                />
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
                                </div>
                            </div>

                            <aside className="import-return-workspace__side">
                                <section className="import-return-side-card import-return-info-card">
                                    <h3>Thông tin phiếu</h3>
                                    <div className="import-return-info-fields import-return-info-fields--plain">
                                        <div className="import-return-info-field">
                                            <span className="import-return-info-field__label">
                                                Số dòng
                                            </span>
                                            <span className="import-return-info-field__value">
                                                {rows.length}
                                            </span>
                                        </div>
                                        <div className="import-return-info-field">
                                            <span className="import-return-info-field__label">
                                                Số NCC
                                            </span>
                                            <span className="import-return-info-field__value">
                                                {supplierCount}
                                            </span>
                                        </div>
                                        <div className="import-return-info-field">
                                            <span className="import-return-info-field__label">
                                                Tổng hoàn
                                            </span>
                                            <span className="import-return-info-field__value">
                                                {formatCurrency(totalValue)}
                                            </span>
                                        </div>
                                        {editingDraftId ? (
                                            <div className="import-return-info-field">
                                                <span className="import-return-info-field__label">
                                                    Đang sửa nháp
                                                </span>
                                                <span className="import-return-info-field__value">
                                                    #{editingDraftId}
                                                </span>
                                            </div>
                                        ) : null}
                                        <div className="import-return-info-field import-return-info-field--note">
                                            <span className="import-return-info-field__label">
                                                Ghi chú phiếu
                                            </span>
                                            <textarea
                                                className="import-return-info-field__textarea"
                                                rows={3}
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder="Ghi chú chung..."
                                            />
                                        </div>
                                    </div>
                                </section>
                            </aside>
                        </div>
                    </div>

                    <div className="import-return-footer-bar">
                        <div className="import-return-footer-bar__total">
                            Tổng giá trị: <strong>{formatCurrency(totalValue)}</strong>
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
                </main>

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
            <SuccessNoticeModal
                open={Boolean(success)}
                message={success}
                onClose={() => setSuccess(null)}
            />
            <AlertNoticeModal
                open={Boolean(warning)}
                message={warning}
                onClose={() => setWarning(null)}
            />
        </div>
    );
}
