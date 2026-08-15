import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import { History } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SuccessNoticeModal from '../../../components/ui/SuccessNoticeModal';
import AlertNoticeModal from '../../../components/ui/AlertNoticeModal';
import { getApiErrorMessage } from '../../../utils/api-utils';
import {
    createInventoryCheck,
    fetchInventoryCheckAttention,
    fetchInventoryCheckProductPreview,
} from '../api';
import { createImportReturnDraftFromInventoryCheck } from '../../import-return/api';
import AddReturnToDraftModal, {
    RETURN_DRAFT_MODE,
} from '../components/AddReturnToDraftModal';
import InventoryCheckAttentionPanel from '../components/InventoryCheckAttentionPanel';
import InventoryCheckLineTable from '../components/InventoryCheckLineTable';
import InventoryCheckProductSearch from '../components/InventoryCheckProductSearch';
import InventoryCheckReturnDraftPanel from '../components/InventoryCheckReturnDraftPanel';
import InventoryCheckUnsavedModal from '../components/InventoryCheckUnsavedModal';
import {
    InventoryCheckSummaryPanel,
} from '../components/InventoryCheckSidePanels';
import { getProfile } from '../../profile/api';
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

function getAlreadyReturnedQty(localReturnLines, batchId) {
    return localReturnLines.reduce((sum, item) => {
        if (Number(item.stockBatchId) !== Number(batchId)) return sum;
        return sum + (Number(item.quantity) || 0);
    }, 0);
}

function getReturnedQtyForCheckLine(line, localReturnLines) {
    if (line?.stockBatchId != null) {
        return getAlreadyReturnedQty(localReturnLines, line.stockBatchId);
    }
    if (line?.productId == null) return 0;
    return localReturnLines.reduce((sum, item) => {
        if (Number(item.productId) !== Number(line.productId)) return sum;
        return sum + (Number(item.quantity) || 0);
    }, 0);
}

/** SL còn có thể trả: min(Thực tế còn lại, Tồn HT − đã có trong nháp). */
function getAvailableReturnQty(line, localReturnLines) {
    if (!line?.stockBatchId) return 0;
    const byActual = Math.max(0, Number(line.actualQty ?? 0));
    const alreadyReturned = getAlreadyReturnedQty(localReturnLines, line.stockBatchId);
    const bySystem = Math.max(0, Number(line.systemQty ?? 0) - alreadyReturned);
    return Math.min(byActual, bySystem);
}

function todayInputValue() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function CreateInventoryCheckPage() {
    const navigate = useNavigate();
    const [note, setNote] = useState('');
    const [checkDate, setCheckDate] = useState(todayInputValue);
    const [checkerName, setCheckerName] = useState('');
    const [lineKeyword, setLineKeyword] = useState('');
    const [lines, setLines] = useState([]);
    const [localReturnLines, setLocalReturnLines] = useState([]);
    const [attention, setAttention] = useState([]);
    const [attentionLoading, setAttentionLoading] = useState(true);
    const [addingProduct, setAddingProduct] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [warning, setWarning] = useState(null);
    const allowLeaveRef = useRef(false);

    const [returnTarget, setReturnTarget] = useState(null);
    const [returnMode, setReturnMode] = useState(RETURN_DRAFT_MODE.RETURN);
    const [returnSubmitting, setReturnSubmitting] = useState(false);

    const isDirty = useMemo(
        () =>
            lines.length > 0 ||
            localReturnLines.length > 0 ||
            Boolean(note?.trim()) ||
            checkDate !== todayInputValue(),
        [lines, localReturnLines, note, checkDate],
    );

    const visibleAttention = useMemo(() => {
        if (!attention.length || !lines.length) return attention;
        const selectedKeys = new Set(
            lines.map((line) => lineKey(line.productId, line.stockBatchId)),
        );
        return attention.filter((item) => {
            const key = lineKey(item.productId, item.batchId ?? null);
            return !selectedKeys.has(key);
        });
    }, [attention, lines]);

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
        let cancelled = false;
        getProfile()
            .then((profile) => {
                if (!cancelled) {
                    setCheckerName(profile?.fullName || '');
                }
            })
            .catch(() => {
                if (!cancelled) setCheckerName('');
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!isDirty || allowLeaveRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

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
                queueMicrotask(() =>
                    setWarning(
                        'Sản phẩm này đã có dòng kiểm theo lô. Không thể thêm dòng “Tất cả lô”.',
                    ),
                );
                return prev;
            }
            if (nextLine.stockBatchId != null && hasAll) {
                queueMicrotask(() =>
                    setWarning(
                        'Sản phẩm này đang kiểm “Tất cả lô”. Không thể thêm dòng lô riêng.',
                    ),
                );
                return prev;
            }
            if (prev.some((line) => lineKey(line.productId, line.stockBatchId) === key)) {
                queueMicrotask(() =>
                    setWarning('Dòng sản phẩm/lô này đã có trong phiếu kiểm.'),
                );
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

    const openReturnDraftModal = (line, mode) => {
        setReturnMode(mode);
        setReturnTarget(line);
    };

    const handleConfirmReturnDraft = ({ batchId, quantity, returnReason, method, line }) => {
        setReturnSubmitting(true);
        setError(null);
        try {
            const returnQty = Number(quantity) || 0;
            const draftMethod = method || returnMode || RETURN_DRAFT_MODE.RETURN;
            const remaining = getAvailableReturnQty(line, localReturnLines);
            if (returnQty < 1 || returnQty > remaining) {
                setError(
                    remaining < 1
                        ? 'Lô này đã trả/đổi hết, không thể thêm.'
                        : `Số lượng không được vượt quá ${remaining}.`,
                );
                return;
            }
            const localKey = `batch-${batchId}-${draftMethod}`;
            setLocalReturnLines((prev) => {
                const existing = prev.find(
                    (item) =>
                        Number(item.stockBatchId) === Number(batchId) &&
                        (item.method || RETURN_DRAFT_MODE.RETURN) === draftMethod,
                );
                if (existing) {
                    return prev.map((item) =>
                        item.localKey === existing.localKey
                            ? {
                                  ...item,
                                  quantity: Number(item.quantity || 0) + returnQty,
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
                        quantity: returnQty,
                        returnPrice: Number(line?.importPrice ?? 0),
                        returnReason: returnReason || null,
                        method: draftMethod,
                        supplierId: line?.supplierId ?? null,
                        supplierName: line?.supplierName ?? null,
                        importOrderId: line?.importOrderId ?? null,
                    },
                ];
            });

            // Chỉ trừ Thực tế; Tồn HT giữ nguyên để đối soát chênh lệch.
            setLines((prev) =>
                prev.map((row) => {
                    const sameBatch =
                        row.stockBatchId != null && Number(row.stockBatchId) === Number(batchId);
                    const sameProductAllLots =
                        row.stockBatchId == null &&
                        line?.productId != null &&
                        Number(row.productId) === Number(line.productId);
                    if (!sameBatch && !sameProductAllLots) {
                        return row;
                    }
                    const currentActual = Number(row.actualQty);
                    const nextActual = Number.isFinite(currentActual)
                        ? Math.max(0, currentActual - returnQty)
                        : row.actualQty;
                    return {
                        ...row,
                        actualQty: nextActual,
                    };
                }),
            );

            setReturnTarget(null);
        } finally {
            setReturnSubmitting(false);
        }
    };

    const handleRemoveDraftLine = (localKeyOrDetailId) => {
        setLocalReturnLines((prev) => {
            const removed = prev.find(
                (line) =>
                    line.localKey === localKeyOrDetailId ||
                    line.detailId === localKeyOrDetailId,
            );
            if (removed) {
                const restoreQty = Number(removed.quantity) || 0;
                setLines((linesPrev) =>
                    linesPrev.map((row) => {
                        const sameBatch =
                            row.stockBatchId != null &&
                            Number(row.stockBatchId) === Number(removed.stockBatchId);
                        const sameProductAllLots =
                            row.stockBatchId == null &&
                            removed.productId != null &&
                            Number(row.productId) === Number(removed.productId);
                        if (!sameBatch && !sameProductAllLots) {
                            return row;
                        }
                        const currentActual = Number(row.actualQty);
                        return {
                            ...row,
                            actualQty: Number.isFinite(currentActual)
                                ? currentActual + restoreQty
                                : row.actualQty,
                        };
                    }),
                );
            }
            return prev.filter(
                (line) =>
                    line.localKey !== localKeyOrDetailId &&
                    line.detailId !== localKeyOrDetailId,
            );
        });
    };

    const clearFormState = () => {
        setLines([]);
        setLocalReturnLines([]);
        setNote('');
        setCheckDate(todayInputValue());
        setLineKeyword('');
        setError(null);
    };

    const persistInventoryCheck = async () => {
        if (lines.length === 0) {
            setWarning('Vui lòng thêm ít nhất một sản phẩm vào phiếu kiểm.');
            return null;
        }

        const hasEmptyActual = lines.some(
            (line) => line.actualQty === '' || line.actualQty === null || Number.isNaN(line.actualQty),
        );
        if (hasEmptyActual) {
            setWarning('Vui lòng nhập số lượng thực tế cho tất cả các dòng.');
            return null;
        }

        const created = await createInventoryCheck({
            warehouse: 'Kho chính - CH01',
            note,
            checkDate: checkDate || null,
            lines: lines.map((line) => {
                const actualQty = Number(line.actualQty);
                const returnedQty = getReturnedQtyForCheckLine(line, localReturnLines);
                return {
                    productId: line.productId,
                    stockBatchId: line.stockBatchId ?? null,
                    // Giữ SL thực tế trên phiếu (đã trừ trả/đổi để đối soát).
                    actualQty,
                    // Điều chỉnh tồn bỏ qua phần sẽ trừ bởi nháp trả/đổi — tránh trừ đôi.
                    stockAdjustQty: actualQty + returnedQty,
                    note: line.note || null,
                };
            }),
        });

        if (localReturnLines.length > 0 && created?.id) {
            await createImportReturnDraftFromInventoryCheck({
                inventoryCheckId: created.id,
                lines: localReturnLines.map((line) => ({
                    batchId: line.stockBatchId,
                    quantity: Number(line.quantity),
                    returnReason: line.returnReason || null,
                    method: line.method || RETURN_DRAFT_MODE.RETURN,
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
        <div className="admin-content">
            
                <AdminHeader />
                <main className="admin-main">
                    <div className="dashboard-container inventory-check-page inventory-check-create-page">
                        <header className="inventory-check-detail-header">
                            <div>
                                <h1 className="inventory-page__title">Tạo phiếu kiểm kho</h1>
                                <p className="inventory-page__subtitle">
                                    Thực hiện kiểm đếm hàng hóa đang lưu trữ trong cửa hàng
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

                        <InventoryCheckSummaryPanel
                            lines={lines}
                            note={note}
                            noteEditable
                            onNoteChange={setNote}
                            showNote
                            showMeta
                            checkDate={checkDate}
                            checkerName={checkerName}
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
                                    onExchangeBatch={(line) =>
                                        openReturnDraftModal(line, RETURN_DRAFT_MODE.EXCHANGE)
                                    }
                                    onReturnBatch={(line) =>
                                        openReturnDraftModal(line, RETURN_DRAFT_MODE.RETURN)
                                    }
                                />
                            </div>

                            <aside className="inventory-check-detail-sidebar">
                                <InventoryCheckAttentionPanel
                                    items={visibleAttention}
                                    loading={attentionLoading}
                                    onAddItem={handleAddAttentionItem}
                                />
                                <InventoryCheckReturnDraftPanel
                                    draft={localDraftView}
                                    loading={false}
                                    showCommit={false}
                                    onRemoveLine={handleRemoveDraftLine}
                                />
                            </aside>
                        </div>
                    </div>
                </main>

            <AddReturnToDraftModal
                open={Boolean(returnTarget)}
                line={returnTarget}
                mode={returnMode}
                availableQty={
                    returnTarget
                        ? getAvailableReturnQty(returnTarget, localReturnLines)
                        : 0
                }
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
            <SuccessNoticeModal
                open={Boolean(success)}
                message={
                    success
                        ? `Đã lưu phiếu kiểm kho${success.code ? ` ${success.code}` : ''}.`
                        : null
                }
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
