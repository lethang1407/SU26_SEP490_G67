import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImportPanel from '@/features/product/components/ImportPanel';
import DraftPoWarningModal from '@/features/product/components/DraftPoWarningModal';
import ProductToast, { ProductToastContainer } from '@/features/product/components/ProductToast';
import { importOrderApi } from '@/features/product/api/importOrderApi';
import {
    buildOrderLines,
    buildSuggestionOverride,
    toSupplierFallback,
    validateLines,
} from '@/features/product/utils/importPanelUtils';
import { suppliersApi } from '@/features/supplier/api';
import { getOutOfStockProducts } from '@/features/inventory/api/inventoryAttentionApi';
import { IMPORT_ORDER_ROUTES } from '@/features/import-order/constants';

const EMPTY_WARNING = { isOpen: false, items: [], pendingIds: [] };

/**
 * Bấm "sản phẩm đã hết hàng" trên thẻ Kho hàng → mở đúng pop-up "Chuẩn bị đơn nhập hàng"
 * của trang Sản phẩm, điền sẵn các SP đang hết hàng kèm gợi ý số lượng / NCC / giá.
 *
 * <p>Danh sách lấy từ cùng API với con số trên thẻ nên luôn khớp. SP nào đang nằm trên đơn
 * nháp (DRAFT) thì cảnh báo trước như trang Sản phẩm; bỏ qua cảnh báo thì SP đó bị loại.
 *
 * <p>Chỉ render khi đang mở (xem TodayProblems): mỗi lần mở là một state mới, khỏi phải reset.
 */
export default function OutOfStockImportModal({ open, onClose }) {
    const navigate = useNavigate();
    const [panelItems, setPanelItems] = useState([]);
    const [overrides, setOverrides] = useState({});
    const [supplierFallback, setSupplierFallback] = useState([]);
    const [suggesting, setSuggesting] = useState(true);
    const [creating, setCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [draftWarning, setDraftWarning] = useState(EMPTY_WARNING);
    const [categoryById, setCategoryById] = useState({});

    const loadSuggestions = useCallback(async (ids, categories) => {
        if (!ids.length) {
            setPanelItems([]);
            return;
        }
        setSuggesting(true);
        try {
            const suggestions = await importOrderApi.getSuggestions(ids, {});
            setPanelItems((suggestions || []).map((s) => ({
                ...s,
                categoryName: s.categoryName ?? categories[s.productId] ?? null,
            })));
            setOverrides(Object.fromEntries(
                (suggestions || []).map((s) => [s.productId, buildSuggestionOverride(s)]),
            ));
        } catch (err) {
            console.error('Failed to load import suggestions for out-of-stock products:', err);
            setErrorMsg(err?.response?.data?.message
                || 'Không lấy được gợi ý nhập hàng. Vui lòng thử lại.');
        } finally {
            setSuggesting(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;

        suppliersApi.getSuppliers({ page: 0, size: 1000 })
            .then((pageRes) => {
                if (!cancelled) setSupplierFallback(toSupplierFallback(pageRes?.content || pageRes?.items || []));
            })
            .catch((err) => {
                console.error('Failed to load suppliers for import panel:', err);
                if (!cancelled) setSupplierFallback([]);
            });

        (async () => {
            try {
                const products = await getOutOfStockProducts();
                if (cancelled) return;
                const categories = Object.fromEntries(products.map((p) => [p.productId, p.categoryName]));
                setCategoryById(categories);
                const ids = products.map((p) => p.productId);
                const onDraft = products
                    .filter((p) => p.openPoId || p.openPoCode)
                    .map((p) => ({
                        id: p.productId,
                        orderId: p.openPoId,
                        name: p.productName,
                        code: p.openPoCode,
                        qty: p.openPoQty,
                    }));
                if (onDraft.length) {
                    // Hỏi trước như trang Sản phẩm; gợi ý chỉ tải sau khi người dùng chọn.
                    setSuggesting(false);
                    setDraftWarning({ isOpen: true, items: onDraft, pendingIds: ids });
                    return;
                }
                await loadSuggestions(ids, categories);
            } catch (err) {
                console.error('Failed to load out-of-stock products:', err);
                if (!cancelled) {
                    setSuggesting(false);
                    setErrorMsg('Không tải được danh sách sản phẩm hết hàng. Vui lòng thử lại.');
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, loadSuggestions]);

    const handleConfirmDraftAdd = () => {
        const ids = draftWarning.pendingIds;
        setDraftWarning(EMPTY_WARNING);
        loadSuggestions(ids, categoryById);
    };

    const handleCancelDraftAdd = () => {
        const onDraftIds = new Set(draftWarning.items.map((i) => i.id));
        const ids = draftWarning.pendingIds.filter((id) => !onDraftIds.has(id));
        setDraftWarning(EMPTY_WARNING);
        if (!ids.length) {
            onClose();
            return;
        }
        loadSuggestions(ids, categoryById);
    };

    const handleOpenDraftPo = (orderId) => {
        onClose();
        if (orderId) {
            navigate(`${IMPORT_ORDER_ROUTES.list}?orderId=${orderId}`, {
                state: { selectedOrderId: Number(orderId) || orderId },
            });
        } else {
            navigate(IMPORT_ORDER_ROUTES.list);
        }
    };

    const removeFromPanel = (id) => {
        setPanelItems((prev) => {
            const remaining = prev.filter((p) => String(p.productId) !== String(id));
            if (remaining.length === 0) onClose();
            return remaining;
        });
        setOverrides((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleSupplierCreated = (newSupplier) => {
        if (!newSupplier?.id) return;
        setSupplierFallback((prev) => (prev.some((s) => Number(s.id) === Number(newSupplier.id))
            ? prev
            : [...toSupplierFallback([newSupplier]), ...prev]));
    };

    const handleCreate = async () => {
        setErrorMsg('');
        const validationErrors = validateLines(panelItems, overrides);
        if (validationErrors.length) {
            setErrorMsg(validationErrors.join('\n'));
            return;
        }

        setCreating(true);
        try {
            const created = await importOrderApi.createOrders(buildOrderLines(panelItems, overrides));
            const codes = (created || []).map((o) => o.orderCode).filter(Boolean);
            const msg = codes.length
                ? `Đã tạo ${codes.length} đơn nhập nháp: ${codes.join(', ')}.`
                : 'Đã tạo đơn nhập nháp thành công.';
            onClose();
            navigate(IMPORT_ORDER_ROUTES.list, { state: { successMessage: msg } });
        } catch (err) {
            console.error('Failed to create import orders from dashboard:', err);
            setErrorMsg(err?.response?.data?.message
                || 'Không tạo được đơn nhập. Kiểm tra NCC, số lượng và API.');
        } finally {
            setCreating(false);
        }
    };

    const patchOverride = (id, patch) =>
        setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

    return (
        <>
            <ImportPanel
                isOpen={open && !draftWarning.isOpen}
                panelItems={panelItems}
                overrides={overrides}
                suggesting={suggesting}
                supplierFallback={supplierFallback}
                onChangeQty={(id, quantity) => patchOverride(id, { quantity })}
                onChangePrice={(id, price, unitBase) => {
                    const safeBase = Number(unitBase) > 0 ? Number(unitBase) : 1;
                    patchOverride(id, { costPerUnit: Number(price) / safeBase });
                }}
                onChangeSupplier={(id, supplier) => patchOverride(id, supplier)}
                onChangeUnit={(id, unitPatch) => patchOverride(id, unitPatch)}
                onRemove={removeFromPanel}
                onSupplierCreated={handleSupplierCreated}
                onCreate={handleCreate}
                onClose={onClose}
                creating={creating}
            />

            <DraftPoWarningModal
                isOpen={open && draftWarning.isOpen}
                items={draftWarning.items}
                onConfirmAdd={handleConfirmDraftAdd}
                onCancel={handleCancelDraftAdd}
                onOpenDraftPo={handleOpenDraftPo}
            />

            {open && errorMsg && (
                <ProductToastContainer>
                    <ProductToast message={errorMsg} type="error" onClose={() => setErrorMsg('')} />
                </ProductToastContainer>
            )}
        </>
    );
}
