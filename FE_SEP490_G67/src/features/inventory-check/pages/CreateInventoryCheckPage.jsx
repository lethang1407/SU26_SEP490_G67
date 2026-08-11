import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import { History } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import { getApiErrorMessage } from '../../../utils/api-utils';
import {
    cancelStockBatch,
    createInventoryCheck,
    fetchInventoryCheckAttention,
    fetchInventoryCheckProductPreview,
} from '../api';
import { createImportReturnDraftFromInventoryCheck } from '../../import-return/api';
import AddReturnToDraftModal from '../components/AddReturnToDraftModal';
import CancelBatchModal from '../components/CancelBatchModal';
import InventoryCheckAttentionPanel from '../components/InventoryCheckAttentionPanel';
import InventoryCheckLineTable from '../components/InventoryCheckLineTable';
import InventoryCheckProductSearch from '../components/InventoryCheckProductSearch';
import InventoryCheckReturnDraftPanel from '../components/InventoryCheckReturnDraftPanel';
import InventoryCheckUnsavedModal from '../components/InventoryCheckUnsavedModal';
import {
    InventoryCheckNotePanel,
    InventoryCheckSummaryPanel,
} from '../components/InventoryCheckSidePanels';
import { INVENTORY_CHECK_ROUTES } from '../constants';
import '../../../css/AdminDashboard.css';
import '../../../css/Inventory.css';
import '../../../css/InventoryCheck.css';
import '../../../css/ImportOrder.css';
import '../../../css/Supplier.css';

function lineKey(productId, stockBatchId) {
    return `${productId}-${stockBatchId ?? 'ALL'}`;
}

function buildLineFromPreview(preview, stockBatchId = null) {
    const batches = preview.batches ?? [];
    const selected = stockBatchId
        ? batches.find((b) => b.id === stockBatchId)
        : null;
    const systemQty = selected
        ? (selected.quantity ?? 0)
        : (preview.systemQty ?? 0);

    return {
        id: `new-${lineKey(preview.productId, stockBatchId)}`,
        productId: preview.productId,
        productCode: preview.productCode,
        productName: preview.productName,
        unit: preview.unit,
        stockBatchId: stockBatchId ?? null,
        batchCode: selected?.batchCode ?? null,
        batches,
        systemQty,
        actualQty: systemQty,
        importPrice: selected?.costPerUnit ?? preview.importPrice ?? 0,
        note: '',
        supplierId: selected?.supplierId ?? null,
        supplierName: selected?.supplierName ?? null,
        importOrderId: selected?.importOrderId ?? null,
    };
}

function buildLocalDraftView(localReturnLines) {
    const totalRefund = localReturnLines.reduce(
        (sum, line) => sum + Number(line.quantity || 0) * Number(line.returnPrice || 0),
        0,
    );
    return {
        id: null,
        totalRefund,
        lines: localReturnLines,
    };
}

export default function CreateInventoryCheckPage() {
    const navigate = useNavigate();
    const [note, setNote] = useState('');
    const [lineKeyword, setLineKeyword] = useState('');
    const [lines, setLines] = useState([]);
    const [localReturnLines, setLocalReturnLines] = useState([]);
    const [attention, setAttention] = useState([]);
    const [attentionLoading, setAttentionLoading] = useState(true);
    const [addingProduct, setAddingProduct] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const allowLeaveRef = useRef(false);

    const [cancelTarget, setCancelTarget] = useState(null);
    const [returnTarget, setReturnTarget] = useState(null);
    const [cancelSubmitting, setCancelSubmitting] = useState(false);
    const [returnSubmitting, setReturnSubmitting] = useState(false);

    const isDirty = useMemo(
        () => lines.length > 0 || localReturnLines.length > 0 || Boolean(note?.trim()),
        [lines, localReturnLines, note],
    );

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            !allowLeaveRef.current &&
            isDirty &&
            currentLocation.pathname !== nextLocation.pathname,
    );

    const loadAttention = useCallback(async () => {
        setAttentionLoading(true);
        try {
            const items = await fetchInventoryCheckAttention();
            setAttention(items);
        } catch {
            setAttention([]);
        } finally {
            setAttentionLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAttention();
    }, [loadAttention]);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!isDirty || allowLeaveRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const refreshLineAfterStockChange = async (line) => {
        if (!line?.productId) return;
        try {
            const preview = await fetchInventoryCheckProductPreview(line.productId);
            setLines((prev) =>
                prev
                    .map((row) => {
                        if (row.productId !== line.productId) {
                            return row;
                        }
                        const batches = preview.batches ?? [];
                        if (row.stockBatchId != null) {
                            const selected = batches.find((b) => b.id === row.stockBatchId);
                            if (!selected || (selected.quantity ?? 0) <= 0) {
                                return null;
                            }
                            return {
                                ...row,
                                batches,
                                batchCode: selected.batchCode,
                                systemQty: selected.quantity ?? 0,
                                actualQty: selected.quantity ?? 0,
                                importPrice: selected.costPerUnit ?? row.importPrice,
                                supplierId: selected.supplierId ?? null,
                                supplierName: selected.supplierName ?? null,
                                importOrderId: selected.importOrderId ?? null,
                            };
                        }
                        const systemQty = preview.systemQty ?? 0;
                        return {
                            ...row,
                            batches,
                            systemQty,
                            actualQty: systemQty,
                            importPrice: preview.importPrice ?? row.importPrice,
                        };
                    })
                    .filter(Boolean),
            );
        } catch (refreshError) {
            setError(
                getApiErrorMessage(
                    refreshError,
                    'Đã cập nhật tồn nhưng không làm mới được dòng kiểm.',
                ),
            );
        }
    };

    const addOrMergeLine = (nextLine) => {
        const key = lineKey(nextLine.productId, nextLine.stockBatchId);
        setLines((prev) => {
            const hasAll = prev.some(
                (line) => line.productId === nextLine.productId && line.stockBatchId == null,
            );
            const hasBatch = prev.some(
                (line) => line.productId === nextLine.productId && line.stockBatchId != null,
            );
            if (nextLine.stockBatchId == null && hasBatch) {
                window.alert(
                    'Sản phẩm này đã có dòng kiểm theo lô. Không thể thêm dòng “Tất cả lô”.',
                );
                return prev;
            }
            if (nextLine.stockBatchId != null && hasAll) {
                window.alert(
                    'Sản phẩm này đang kiểm “Tất cả lô”. Không thể thêm dòng lô riêng.',
                );
                return prev;
            }
            if (prev.some((line) => lineKey(line.productId, line.stockBatchId) === key)) {
                window.alert('Dòng sản phẩm/lô này đã có trong phiếu kiểm.');
                return prev;
            }
            return [...prev, nextLine];
        });
    };

    const handleSelectProduct = async (product, preferredBatchId = null) => {
        if (!product?.id) return;

        setAddingProduct(true);
        setError(null);
        try {
            const preview = await fetchInventoryCheckProductPreview(product.id);
            addOrMergeLine(buildLineFromPreview(preview, preferredBatchId));
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

    const handleAddAttentionItem = (item) => {
        handleSelectProduct(
            { id: item.productId, name: item.productName },
            item.batchId ?? null,
        );
    };

    const handleBatchChange = (rowKey, nextBatchId) => {
        setLines((prev) =>
            prev.map((line) => {
                if ((line.id ?? lineKey(line.productId, line.stockBatchId)) !== rowKey) {
                    return line;
                }
                const batchId = nextBatchId === '' || nextBatchId === 'ALL' ? null : Number(nextBatchId);
                const selected = batchId
                    ? (line.batches ?? []).find((b) => b.id === batchId)
                    : null;
                const systemQty = selected
                    ? (selected.quantity ?? 0)
                    : (line.batches ?? []).reduce((sum, b) => sum + (b.quantity ?? 0), 0);
                return {
                    ...line,
                    id: `new-${lineKey(line.productId, batchId)}`,
                    stockBatchId: batchId,
                    batchCode: selected?.batchCode ?? null,
                    systemQty,
                    actualQty: systemQty,
                    supplierId: selected?.supplierId ?? null,
                    supplierName: selected?.supplierName ?? null,
                    importOrderId: selected?.importOrderId ?? null,
                };
            }),
        );
    };

    const handleActualQtyChange = (rowKey, value) => {
        setLines((prev) =>
            prev.map((line) =>
                (line.id ?? lineKey(line.productId, line.stockBatchId)) === rowKey
                    ? { ...line, actualQty: value === '' ? '' : Number(value) }
                    : line,
            ),
        );
    };

    const handleNoteChange = (rowKey, value) => {
        setLines((prev) =>
            prev.map((line) =>
                (line.id ?? lineKey(line.productId, line.stockBatchId)) === rowKey
                    ? { ...line, note: value }
                    : line,
            ),
        );
    };

    const handleRemoveLine = (rowKey) => {
        setLines((prev) =>
            prev.filter(
                (line) => (line.id ?? lineKey(line.productId, line.stockBatchId)) !== rowKey,
            ),
        );
    };

    const handleConfirmCancelBatch = async ({ batchId, quantity, line }) => {
        setCancelSubmitting(true);
        setError(null);
        try {
            await cancelStockBatch(batchId, quantity);
            setCancelTarget(null);
            await refreshLineAfterStockChange(line);
            loadAttention();
        } catch (cancelError) {
            setError(getApiErrorMessage(cancelError, 'Không thể hủy lô. Vui lòng thử lại.'));
        } finally {
            setCancelSubmitting(false);
        }
    };

    const handleConfirmReturnDraft = ({ batchId, quantity, returnReason, line }) => {
        setReturnSubmitting(true);
        setError(null);
        try {
            const localKey = `batch-${batchId}`;
            setLocalReturnLines((prev) => {
                const existing = prev.find((item) => item.stockBatchId === batchId);
                if (existing) {
                    return prev.map((item) =>
                        item.stockBatchId === batchId
                            ? {
                                  ...item,
                                  quantity: Number(item.quantity || 0) + Number(quantity),
                                  returnReason: returnReason || item.returnReason,
                              }
                            : item,
                    );
                }
                return [
                    ...prev,
                    {
                        localKey,
                        detailId: null,
                        stockBatchId: batchId,
                        batchCode: line?.batchCode ?? null,
                        productId: line?.productId ?? null,
                        productCode: line?.productCode ?? null,
                        productName: line?.productName ?? null,
                        quantity: Number(quantity),
                        returnPrice: Number(line?.importPrice ?? 0),
                        returnReason: returnReason || null,
                        supplierId: line?.supplierId ?? null,
                        supplierName: line?.supplierName ?? null,
                        importOrderId: line?.importOrderId ?? null,
                    },
                ];
            });
            setReturnTarget(null);
        } finally {
            setReturnSubmitting(false);
        }
    };

    const handleRemoveDraftLine = (localKeyOrDetailId) => {
        setLocalReturnLines((prev) =>
            prev.filter(
                (line) =>
                    line.localKey !== localKeyOrDetailId &&
                    line.detailId !== localKeyOrDetailId,
            ),
        );
    };

    const clearFormState = () => {
        setLines([]);
        setLocalReturnLines([]);
        setNote('');
        setLineKeyword('');
        setError(null);
    };

    const persistInventoryCheck = async () => {
        if (lines.length === 0) {
            window.alert('Vui lòng thêm ít nhất một sản phẩm vào phiếu kiểm.');
            return null;
        }

        const hasEmptyActual = lines.some(
            (line) => line.actualQty === '' || line.actualQty === null || Number.isNaN(line.actualQty),
        );
        if (hasEmptyActual) {
            window.alert('Vui lòng nhập số lượng thực tế cho tất cả các dòng.');
            return null;
        }

        const created = await createInventoryCheck({
            warehouse: 'Kho chính - CH01',
            note,
            lines: lines.map((line) => ({
                productId: line.productId,
                stockBatchId: line.stockBatchId ?? null,
                actualQty: Number(line.actualQty),
                note: line.note || null,
            })),
        });

        if (localReturnLines.length > 0 && created?.id) {
            await createImportReturnDraftFromInventoryCheck({
                inventoryCheckId: created.id,
                lines: localReturnLines.map((line) => ({
                    batchId: line.stockBatchId,
                    quantity: Number(line.quantity),
                    returnReason: line.returnReason || null,
                })),
            });
        }

        return created;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        setSuccess(null);
        try {
            const hadReturnDraft = localReturnLines.length > 0;
            const created = await persistInventoryCheck();
            if (!created) {
                return;
            }
            clearFormState();
            setSuccess({
                code: created?.code,
                id: created?.id,
                kind: 'check',
                hasReturnDraft: hadReturnDraft,
            });
            loadAttention();
        } catch (submitError) {
            setError(
                getApiErrorMessage(submitError, 'Không thể lưu phiếu kiểm kho. Vui lòng thử lại.'),
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleBlockerStay = () => {
        if (blocker.state === 'blocked') {
            blocker.reset();
        }
    };

    const handleBlockerDiscard = () => {
        allowLeaveRef.current = true;
        clearFormState();
        if (blocker.state === 'blocked') {
            blocker.proceed();
        }
    };

    const handleBlockerSave = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const created = await persistInventoryCheck();
            if (!created) {
                if (blocker.state === 'blocked') {
                    blocker.reset();
                }
                return;
            }
            allowLeaveRef.current = true;
            clearFormState();
            if (blocker.state === 'blocked') {
                blocker.proceed();
            }
        } catch (submitError) {
            setError(
                getApiErrorMessage(submitError, 'Không thể lưu phiếu kiểm kho. Vui lòng thử lại.'),
            );
            if (blocker.state === 'blocked') {
                blocker.reset();
            }
        } finally {
            setSubmitting(false);
        }
    };

    const localDraftView = buildLocalDraftView(localReturnLines);

    return (
        <div className="admin-layout">
            <SideBar />
            <div className="admin-content">
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container inventory-check-page inventory-check-create-page">
                        <header className="inventory-check-detail-header">
                            <div>
                                <h1 className="inventory-page__title">Tạo phiếu kiểm kho</h1>
                                <p className="inventory-page__subtitle">
                                    Thêm sản phẩm/lô cần kiểm. Có thể chọn tất cả lô hoặc từng lô.
                                </p>
                            </div>
                            <div className="inventory-page__actions">
                                <button
                                    type="button"
                                    className="inventory-btn inventory-btn--secondary"
                                    onClick={() => navigate(INVENTORY_CHECK_ROUTES.history)}
                                >
                                    <History size={18} />
                                    Lịch sử kiểm kho
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
                        {success && success.kind === 'check' && (
                            <Alert variant="success" className="mb-0">
                                Đã lưu phiếu {success.code}.
                                {success.hasReturnDraft
                                    ? ' Đã tạo phiếu trả nháp — mở ở màn Trả hàng NCC để xác nhận.'
                                    : null}{' '}
                                {success.id ? (
                                    <Link to={INVENTORY_CHECK_ROUTES.detail(success.id)}>
                                        Xem phiếu
                                    </Link>
                                ) : null}
                            </Alert>
                        )}

                        <InventoryCheckAttentionPanel
                            items={attention}
                            loading={attentionLoading}
                            onAddItem={handleAddAttentionItem}
                        />

                        <section className="inventory-check-search-section">
                            <InventoryCheckProductSearch onSelect={(p) => handleSelectProduct(p)} />
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
                                    onBatchChange={handleBatchChange}
                                    onCancelBatch={setCancelTarget}
                                    onReturnBatch={setReturnTarget}
                                />
                            </div>

                            <aside className="inventory-check-detail-sidebar">
                                <InventoryCheckSummaryPanel lines={lines} />
                                <InventoryCheckReturnDraftPanel
                                    draft={localDraftView}
                                    loading={false}
                                    showCommit={false}
                                    onRemoveLine={handleRemoveDraftLine}
                                />
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

            <CancelBatchModal
                open={Boolean(cancelTarget)}
                line={cancelTarget}
                onClose={() => !cancelSubmitting && setCancelTarget(null)}
                onConfirm={handleConfirmCancelBatch}
                submitting={cancelSubmitting}
            />
            <AddReturnToDraftModal
                open={Boolean(returnTarget)}
                line={returnTarget}
                onClose={() => !returnSubmitting && setReturnTarget(null)}
                onConfirm={handleConfirmReturnDraft}
                submitting={returnSubmitting}
            />
            <InventoryCheckUnsavedModal
                open={blocker.state === 'blocked'}
                saving={submitting}
                onSave={handleBlockerSave}
                onStay={handleBlockerStay}
                onDiscard={handleBlockerDiscard}
            />
        </div>
    );
}
