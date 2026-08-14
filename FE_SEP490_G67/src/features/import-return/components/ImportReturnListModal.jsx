import { ArrowLeft, Check, Pencil, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import StyledSelect from '../../../components/ui/StyledSelect';
import ConfirmNoticeModal from '../../../components/ui/ConfirmNoticeModal';
import SuccessNoticeModal from '../../../components/ui/SuccessNoticeModal';
import AlertNoticeModal from '../../../components/ui/AlertNoticeModal';
import { getApiErrorMessage } from '../../../utils/api-utils';
import {
    deleteImportReturnDraft,
    fetchImportReturnById,
    fetchImportReturns,
    submitImportReturn,
    updateImportReturnExchangeExpiry,
    updateImportReturnLineStatus,
} from '../api';
import {
    DOC_STATUS,
    LINE_STATUS,
    RETURN_METHOD,
    formatCurrency,
    formatDateOnly,
    formatDateTime,
    formatLineStatus,
    formatMethod,
    formatReturnStatus,
    formatTimeOnly,
    getReturnStatusClass,
} from '../constants';

const PAGE_SIZE = 8;

function Pagination({ page, totalPages, onChange }) {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i);
    return (
        <div className="import-return-modal__pagination">
            <button type="button" disabled={page <= 0} onClick={() => onChange(0)}>
                {'<<'} first
            </button>
            <button type="button" disabled={page <= 0} onClick={() => onChange(page - 1)}>
                {'<'} previous
            </button>
            {pages.map((p) => (
                <button
                    key={p}
                    type="button"
                    className={p === page ? 'is-active' : ''}
                    onClick={() => onChange(p)}
                >
                    {p + 1}
                </button>
            ))}
            <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => onChange(page + 1)}
            >
                next {'>'}
            </button>
            <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => onChange(totalPages - 1)}
            >
                last {'>>'}
            </button>
        </div>
    );
}

export default function ImportReturnListModal({
    open,
    mode = 'history',
    initialDetailId = null,
    onClose,
    onEditDraft,
}) {
    const isDraft = mode === 'drafts';
    const [view, setView] = useState('list');
    const [detail, setDetail] = useState(null);
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [q, setQ] = useState('');
    const [days, setDays] = useState(7);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [busy, setBusy] = useState(false);
    const [success, setSuccess] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);

    const loadList = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page,
                size: PAGE_SIZE,
                q: q.trim() || undefined,
            };
            if (isDraft) {
                params.status = DOC_STATUS.DRAFT;
            } else {
                params.statuses = [DOC_STATUS.IN_PROGRESS, DOC_STATUS.COMPLETED];
                if (from || to) {
                    params.from = from || undefined;
                    params.to = to || undefined;
                    params.days = undefined;
                } else {
                    params.days = days;
                }
            }
            const result = await fetchImportReturns(params);
            setItems(result.content ?? []);
            setTotalPages(Math.max(1, result.totalPages ?? 1));
        } catch (loadError) {
            setError(getApiErrorMessage(loadError, 'Không tải được danh sách.'));
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [page, q, days, from, to, isDraft]);

    useEffect(() => {
        if (!open) return;
        setView(initialDetailId ? 'detail' : 'list');
        setDetail(null);
        setPage(0);
        setError(null);
    }, [open, mode, initialDetailId]);

    useEffect(() => {
        if (!open) return;
        if (view === 'list') {
            loadList();
        }
    }, [open, view, loadList]);

    useEffect(() => {
        if (!open || !initialDetailId || view !== 'detail') return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const result = await fetchImportReturnById(initialDetailId);
                if (!cancelled) setDetail(result);
            } catch (loadError) {
                if (!cancelled) {
                    setError(getApiErrorMessage(loadError, 'Không tải được chi tiết.'));
                    setView('list');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, initialDetailId, view]);

    if (!open) return null;

    const openDetail = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchImportReturnById(id);
            setDetail(result);
            setView('detail');
        } catch (loadError) {
            setError(getApiErrorMessage(loadError, 'Không tải được chi tiết.'));
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setDetail(null);
        setView('list');
        loadList();
    };

    const handleDeleteDraft = (id, event) => {
        event.stopPropagation();
        setDeleteTargetId(id);
    };

    const confirmDeleteDraft = async () => {
        if (deleteTargetId == null) return;
        setBusy(true);
        try {
            await deleteImportReturnDraft(deleteTargetId);
            setDeleteTargetId(null);
            await loadList();
        } catch (deleteError) {
            setDeleteTargetId(null);
            setAlertMessage(getApiErrorMessage(deleteError, 'Không xóa được nháp.'));
        } finally {
            setBusy(false);
        }
    };

    const handleSubmitDraft = async () => {
        if (!detail?.id) return;
        setBusy(true);
        setError(null);
        try {
            const result = await submitImportReturn(detail.id);
            setDetail(result);
            setError(null);
            setSuccess('Đã lưu đổi trả.');
        } catch (submitError) {
            setError(getApiErrorMessage(submitError, 'Không lưu đổi trả được.'));
        } finally {
            setBusy(false);
        }
    };

    const handleLineStatus = async (detailId, lineStatus, exchangeExpiryDate) => {
        if (!detail?.id) return;
        setBusy(true);
        setError(null);
        try {
            const result = await updateImportReturnLineStatus(
                detail.id,
                detailId,
                lineStatus,
                exchangeExpiryDate,
            );
            setDetail(result);
        } catch (statusError) {
            setError(getApiErrorMessage(statusError, 'Không cập nhật trạng thái dòng.'));
        } finally {
            setBusy(false);
        }
    };

    const handleExchangeExpiry = async (detailId, exchangeExpiryDate) => {
        if (!detail?.id) return;
        setBusy(true);
        setError(null);
        try {
            const result = await updateImportReturnExchangeExpiry(
                detail.id,
                detailId,
                exchangeExpiryDate,
            );
            setDetail(result);
        } catch (expiryError) {
            setAlertMessage(getApiErrorMessage(expiryError, 'Không cập nhật được HSD lô đổi.'));
        } finally {
            setBusy(false);
        }
    };

    const title =
        view === 'detail'
            ? isDraft
                ? `Phiếu nháp: ${detail?.returnCode || detail?.id || '—'}`
                : `Phiếu đổi trả hàng: ${detail?.returnCode || detail?.id || '—'}`
            : isDraft
              ? 'Phiếu nháp'
              : 'Lịch sử đổi trả hàng';

    return (
        <div className="supplier-modal-overlay" onClick={onClose} role="presentation">
            <div
                className="supplier-modal import-return-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="supplier-modal__header import-return-modal__header">
                    <div className="import-return-modal__title-row">
                        {view === 'detail' ? (
                            <button
                                type="button"
                                className="import-return-modal__back"
                                onClick={handleBack}
                                aria-label="Quay lại"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        ) : null}
                        <h2 className="supplier-modal__title">{title}</h2>
                    </div>
                    <button type="button" className="supplier-modal__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="supplier-modal__body import-return-modal__body">
                    {error ? <p className="supplier-modal__error">{error}</p> : null}

                    {view === 'list' ? (
                        <>
                            {!isDraft ? (
                                <div className="import-return-modal__filters">
                                    <div className="import-return-modal__search">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Tìm mã trả hàng, ghi chú, sản phẩm..."
                                            value={q}
                                            onChange={(e) => {
                                                setPage(0);
                                                setQ(e.target.value);
                                            }}
                                        />
                                    </div>
                                    <div className="import-return-modal__date-filters">
                                        <StyledSelect
                                            value={from || to ? 'custom' : String(days)}
                                            options={[
                                                { value: '7', label: '7 ngày' },
                                                { value: '15', label: '15 ngày' },
                                                { value: '30', label: '30 ngày' },
                                                { value: 'custom', label: 'Tuỳ chọn' },
                                            ]}
                                            onChange={(next) => {
                                                setPage(0);
                                                if (next === 'custom') return;
                                                setDays(Number(next));
                                                setFrom('');
                                                setTo('');
                                            }}
                                        />
                                        <input
                                            type="date"
                                            className="import-return-modal__control"
                                            value={from}
                                            onChange={(e) => {
                                                setPage(0);
                                                setFrom(e.target.value);
                                            }}
                                        />
                                        <span className="import-return-modal__date-sep">→</span>
                                        <input
                                            type="date"
                                            className="import-return-modal__control"
                                            value={to}
                                            onChange={(e) => {
                                                setPage(0);
                                                setTo(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {loading ? (
                                <p>Đang tải...</p>
                            ) : items.length === 0 ? (
                                <p className="text-muted">Chưa có phiếu nào.</p>
                            ) : (
                                <div className="import-return-modal__table-wrap">
                                    <table className="import-return-modal__table">
                                        <thead>
                                            <tr>
                                                <th>STT</th>
                                                <th>{isDraft ? 'Mã phiếu' : 'Mã trả hàng'}</th>
                                                <th>{isDraft ? 'Số SP trả' : 'Số SP'}</th>
                                                <th>Ngày tạo</th>
                                                <th>Ghi chú</th>
                                                <th>Giá trị</th>
                                                {!isDraft ? <th>Trạng thái</th> : <th />}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr
                                                    key={item.id}
                                                    className="import-return-modal__row"
                                                    onClick={() => openDetail(item.id)}
                                                >
                                                    <td>{page * PAGE_SIZE + index + 1}</td>
                                                    <td>{item.returnCode || `NHAP-${item.id}`}</td>
                                                    <td>{item.itemCount ?? 0}</td>
                                                    <td>{formatDateTime(item.createdAt)}</td>
                                                    <td>{item.note || '—'}</td>
                                                    <td>{formatCurrency(item.totalRefund)}</td>
                                                    {!isDraft ? (
                                                        <td>
                                                            <span className={getReturnStatusClass(item.status)}>
                                                                {formatReturnStatus(item.status)}
                                                            </span>
                                                        </td>
                                                    ) : (
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="inventory-check-line-table__remove"
                                                                title="Xóa nháp"
                                                                disabled={busy}
                                                                onClick={(e) =>
                                                                    handleDeleteDraft(item.id, e)
                                                                }
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                        </>
                    ) : (
                        <DetailBody
                            isDraft={isDraft}
                            detail={detail}
                            loading={loading}
                            busy={busy}
                            onSubmitDraft={handleSubmitDraft}
                            onEditDraft={() => {
                                onEditDraft?.(detail);
                                onClose?.();
                            }}
                            onLineStatus={handleLineStatus}
                            onSaveExchangeExpiry={handleExchangeExpiry}
                        />
                    )}
                </div>
            </div>
            <ConfirmNoticeModal
                open={deleteTargetId != null}
                title="Xóa phiếu nháp"
                message="Xóa phiếu nháp này? Tồn kho sẽ được hoàn lại."
                confirmLabel="Xóa nháp"
                cancelLabel="Hủy"
                danger
                confirming={busy}
                onClose={() => {
                    if (!busy) setDeleteTargetId(null);
                }}
                onConfirm={confirmDeleteDraft}
            />
            <SuccessNoticeModal
                open={Boolean(success)}
                message={success}
                onClose={() => {
                    setSuccess(null);
                    onClose?.();
                }}
            />
            <AlertNoticeModal
                open={Boolean(alertMessage)}
                message={alertMessage}
                onClose={() => setAlertMessage(null)}
            />
        </div>
    );
}

function DetailBody({
    isDraft,
    detail,
    loading,
    busy,
    onSubmitDraft,
    onEditDraft,
    onLineStatus,
    onSaveExchangeExpiry,
}) {
    const [pendingExpiry, setPendingExpiry] = useState({});
    const [editingExpiryId, setEditingExpiryId] = useState(null);
    const [editExpiryValue, setEditExpiryValue] = useState('');

    useEffect(() => {
        setPendingExpiry({});
        setEditingExpiryId(null);
        setEditExpiryValue('');
    }, [detail?.id]);

    if (loading || !detail) {
        return <p>Đang tải chi tiết...</p>;
    }

    const lines = detail.lines ?? [];
    const showHistoryCols = !isDraft;

    const getPendingExpiry = (line) => {
        const key = String(line.detailId);
        if (Object.prototype.hasOwnProperty.call(pendingExpiry, key)) {
            return pendingExpiry[key];
        }
        return line.exchangeExpiryDate || '';
    };

    const startEditExpiry = (line) => {
        setEditingExpiryId(line.detailId);
        setEditExpiryValue(line.exchangeExpiryDate || '');
    };

    const cancelEditExpiry = () => {
        setEditingExpiryId(null);
        setEditExpiryValue('');
    };

    const saveEditExpiry = async (detailId) => {
        await onSaveExchangeExpiry?.(detailId, editExpiryValue || null);
        setEditingExpiryId(null);
        setEditExpiryValue('');
    };

    return (
        <>
            <div className="import-return-modal__meta import-return-modal__meta--fields">
                <div className="import-return-info-field">
                    <span className="import-return-info-field__label">Người tạo phiếu</span>
                    <div className="import-return-info-field__box">
                        <span className="import-return-info-field__value">
                            {detail.createdByName || '—'}
                        </span>
                    </div>
                </div>
                <div className="import-return-info-field">
                    <span className="import-return-info-field__label">Ngày tạo phiếu</span>
                    <div className="import-return-info-field__box">
                        <span className="import-return-info-field__value">
                            {formatDateOnly(detail.createdAt)}
                        </span>
                    </div>
                </div>
                <div className="import-return-info-field">
                    <span className="import-return-info-field__label">Giờ tạo</span>
                    <div className="import-return-info-field__box">
                        <span className="import-return-info-field__value">
                            {formatTimeOnly(detail.createdAt)}
                        </span>
                    </div>
                </div>
                {!isDraft ? (
                    <div className="import-return-info-field">
                        <span className="import-return-info-field__label">Trạng thái</span>
                        <div className="import-return-info-field__box">
                            <span className={getReturnStatusClass(detail.status)}>
                                {formatReturnStatus(detail.status)}
                            </span>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="import-return-modal__table-wrap">
                <table className="import-return-modal__table">
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
                            {showHistoryCols ? <th>HSD mới (nếu có)</th> : null}
                            {showHistoryCols ? <th>Trạng thái</th> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, index) => {
                            const isExchange =
                                line.method === RETURN_METHOD.EXCHANGE;
                            const isDone = line.lineStatus === LINE_STATUS.DONE;
                            const isEditing = editingExpiryId === line.detailId;

                            return (
                                <tr key={line.detailId}>
                                    <td>{index + 1}</td>
                                    <td>{line.productName}</td>
                                    <td>{line.batchCode || '—'}</td>
                                    <td>{line.quantity}</td>
                                    <td>{line.supplierName || '—'}</td>
                                    <td>{line.note || line.returnReason || '—'}</td>
                                    <td>{formatMethod(line.method)}</td>
                                    <td>{formatCurrency(line.lineValue)}</td>
                                    {showHistoryCols ? (
                                        <td>
                                            {!isExchange ? (
                                                <span className="text-muted">—</span>
                                            ) : isDone && !isEditing ? (
                                                <div className="import-return-modal__hsd-cell">
                                                    <input
                                                        type="date"
                                                        className="import-return-modal__control import-return-modal__hsd-input"
                                                        value={line.exchangeExpiryDate || ''}
                                                        disabled
                                                        readOnly
                                                    />
                                                    <button
                                                        type="button"
                                                        className="import-return-modal__hsd-edit"
                                                        title="Sửa HSD"
                                                        disabled={busy}
                                                        onClick={() => startEditExpiry(line)}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                </div>
                                            ) : isDone && isEditing ? (
                                                <div className="import-return-modal__hsd-cell">
                                                    <input
                                                        type="date"
                                                        className="import-return-modal__control import-return-modal__hsd-input"
                                                        value={editExpiryValue}
                                                        disabled={busy}
                                                        onChange={(e) =>
                                                            setEditExpiryValue(e.target.value)
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        className="import-return-modal__hsd-save"
                                                        title="Lưu HSD"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            saveEditExpiry(line.detailId)
                                                        }
                                                    >
                                                        <Check size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="import-return-modal__hsd-cancel"
                                                        title="Hủy"
                                                        disabled={busy}
                                                        onClick={cancelEditExpiry}
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    type="date"
                                                    className="import-return-modal__control import-return-modal__hsd-input"
                                                    value={getPendingExpiry(line)}
                                                    disabled={busy}
                                                    onChange={(e) =>
                                                        setPendingExpiry((prev) => ({
                                                            ...prev,
                                                            [String(line.detailId)]:
                                                                e.target.value,
                                                        }))
                                                    }
                                                />
                                            )}
                                        </td>
                                    ) : null}
                                    {showHistoryCols ? (
                                        <td>
                                            <StyledSelect
                                                className={
                                                    isDone
                                                        ? 'styled-select--status-success'
                                                        : 'styled-select--status-danger'
                                                }
                                                value={line.lineStatus || LINE_STATUS.WAITING}
                                                disabled={
                                                    busy ||
                                                    detail.status === DOC_STATUS.COMPLETED ||
                                                    isDone
                                                }
                                                options={[
                                                    {
                                                        value: LINE_STATUS.WAITING,
                                                        label: formatLineStatus(
                                                            LINE_STATUS.WAITING,
                                                        ),
                                                    },
                                                    {
                                                        value: LINE_STATUS.DONE,
                                                        label: formatLineStatus(LINE_STATUS.DONE),
                                                    },
                                                ]}
                                                onChange={(next) =>
                                                    onLineStatus(
                                                        line.detailId,
                                                        next,
                                                        isExchange
                                                            ? getPendingExpiry(line) || null
                                                            : undefined,
                                                    )
                                                }
                                            />
                                            {line.exchangeBatchCode ? (
                                                <div className="import-return-modal__exchange-hint">
                                                    Lô đổi: {line.exchangeBatchCode}
                                                </div>
                                            ) : null}
                                        </td>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="import-return-modal__detail-footer">
                <strong>{formatCurrency(detail.totalRefund)}</strong>
                {isDraft ? (
                    <div className="import-return-modal__detail-actions">
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--primary"
                            disabled={busy || lines.length === 0}
                            onClick={onSubmitDraft}
                        >
                            Lưu Đổi Trả
                        </button>
                        <button
                            type="button"
                            className="supplier-btn supplier-btn--secondary"
                            disabled={busy}
                            onClick={onEditDraft}
                        >
                            Chỉnh sửa
                        </button>
                    </div>
                ) : null}
            </div>
        </>
    );
}
