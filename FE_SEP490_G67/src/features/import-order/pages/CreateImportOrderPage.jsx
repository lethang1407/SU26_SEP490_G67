import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierAddNewModal from '../../supplier/components/SupplierAddNewModal';
import { suppliersApi } from '../../supplier/api';
import { importOrdersApi } from '../api';
import ImportOrderProductSearch from '../components/ImportOrderProductSearch';
import ImportOrderLineTable from '../components/ImportOrderLineTable';
import ImportOrderCreateSidebar from '../components/ImportOrderCreateSidebar';
import ImportOrderAlertModal from '../components/ImportOrderAlertModal';
import ImportOrderReturnSection from '../components/ImportOrderReturnSection';
import {
    mapPendingReturnLine,
    selectedReturnDeduction,
} from '../utils/importReturnAttachUtils';
import { ORDER_STATUS } from '../constants';
import { isRemoteImageUrl, validateInvoiceImageFile } from '@/lib/cloudinary';
import {
    suggestCostForUnit,
    resolveLineType,
    isNonPayableImportLine,
    computeGoodsTotal,
    computeOpenTrialAmount,
    computeRegularPayableAmount,
} from '../utils/importOrderUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

function hasValidSupplier(supplier) {
    return supplier?.id != null && Number(supplier.id) > 0 && !Number.isNaN(Number(supplier.id));
}

function selectedReturnSnapshot(pendingReturnLines = [], returnLineIds = []) {
    const byKey = new Map((pendingReturnLines || []).map((line) => [String(line.key), line]));
    return [...returnLineIds]
        .map((id) => {
            const line = byKey.get(String(id));
            return `${String(id)}:${line?.method || 'RETURN'}`;
        })
        .sort();
}

function buildFormSnapshot({
    supplier,
    lines,
    note,
    invoiceImageUrl,
    discountAmount,
    returnLineIds = [],
    pendingReturnLines = [],
}) {
    return JSON.stringify({
        supplierId: supplier?.id ?? null,
        note: note?.trim() || '',
        invoiceImageUrl: invoiceImageUrl || '',
        discountAmount: Number(discountAmount) || 0,
        returnLineIds: selectedReturnSnapshot(pendingReturnLines, returnLineIds),
        lines: (lines || []).map((line) => ({
            productId: line.productId,
            productUnitId: line.productUnitId ?? null,
            quantity: Number(line.quantity) || 0,
            costPerUnit: Number(line.costPerUnit) || 0,
            expiryDate: line.expiryDate || '',
            note: line.note?.trim() || '',
            isPromotion: Boolean(line.isPromotion),
            lineType: resolveLineType(line),
        })),
    });
}

function normalizeProductUnits(productUnits) {
    return (productUnits || []).map((unit) => ({
        id: unit.id,
        name: unit.name || 'Chai',
        unitBase: Number(unit.unitBase) || 1,
    }));
}

function pickDefaultProductUnit(productUnits) {
    const units = normalizeProductUnits(productUnits);
    if (units.length === 0) {
        return { id: null, name: 'Chai', unitBase: 1 };
    }
    return units.find((unit) => unit.unitBase === 1) || units[0];
}

function createLineFromProduct(product) {
    const productUnits = normalizeProductUnits(product.productUnits);
    const selectedUnit = pickDefaultProductUnit(productUnits);
    const lastCostPerBase = Number(product.lastCostPerBase ?? product.importPrice ?? 0) || 0;
    return {
        key: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        parentId: product.parentId ?? null,
        parentName: product.parentName || '',
        attributes: product.attributes || [],
        productUnits,
        productUnitId: selectedUnit.id,
        unitName: selectedUnit.name,
        unitBase: selectedUnit.unitBase,
        lastCostPerBase,
        sellingPrice: Number(product.sellingPrice) || 0,
        quantity: 1,
        costPerUnit: suggestCostForUnit(lastCostPerBase, selectedUnit.unitBase),
        expiryDate: '',
        note: '',
        isPromotion: false,
        isTrial: false,
        lineType: 'REGULAR',
        alreadyInStore:
            Boolean(product.alreadyInStore) || Number(product.stockQuantity) > 0,
    };
}

function mapDetailLine(item) {
    const productUnits = normalizeProductUnits(item.productUnits);
    const selectedUnit =
        productUnits.find((unit) => unit.id === item.productUnitId) ||
        pickDefaultProductUnit(productUnits);
    return {
        key: `detail-${item.id || item.productId}-${Math.random().toString(36).slice(2, 7)}`,
        productId: item.productId,
        productCode: item.productCode || (item.productId ? `SP${String(item.productId).padStart(6, '0')}` : ''),
        productName: item.parentName || item.productName || '',
        parentId: item.parentId ?? null,
        parentName: item.parentName || '',
        attributes: item.attributes || [],
        productUnits,
        productUnitId: item.productUnitId ?? selectedUnit.id,
        unitName: item.unitName || selectedUnit.name || 'Cái',
        unitBase: selectedUnit.unitBase ?? 1,
        lastCostPerBase: Number(item.lastCostPerBase) || 0,
        sellingPrice: Number(item.sellingPrice) || 0,
        quantity: Number(item.quantity) || 1,
        costPerUnit: Number(item.costPerUnit) || 0,
        expiryDate: item.expiryDate || '',
        note: item.note || '',
        isPromotion: Boolean(item.isPromotion) || item.lineType === 'PROMOTION',
        isTrial: Boolean(item.isTrial) || item.lineType === 'TRIAL',
        lineType: item.lineType || (item.isTrial ? 'TRIAL' : item.isPromotion ? 'PROMOTION' : 'REGULAR'),
        alreadyInStore: Boolean(item.alreadyInStore),
        trialStatus: item.trialStatus || '',
    };
}

function toApiPayload(orderStatus, {
    supplier,
    note,
    invoiceImage,
    safeDiscount,
    safePaidAmount,
    lines,
    returnLineIds = [],
    pendingReturnLines = [],
}) {
    const byKey = new Map((pendingReturnLines || []).map((line) => [String(line.key), line]));
    const returnLines = returnLineIds
        .map((id) => {
            const detailId = Number(id);
            if (!Number.isInteger(detailId) || detailId <= 0) return null;
            const line = byKey.get(String(id));
            return {
                detailId,
                method: line?.method === 'EXCHANGE' ? 'EXCHANGE' : 'RETURN',
            };
        })
        .filter(Boolean);

    return {
        supplierId: hasValidSupplier(supplier) ? Number(supplier.id) : null,
        orderStatus,
        note: note.trim() || null,
        invoiceImage: invoiceImage || null,
        discountAmount: safeDiscount,
        paidAmount: orderStatus === ORDER_STATUS.IMPORTED ? safePaidAmount : 0,
        paymentMethod: 'CASH',
        returnLineIds: returnLines.map((item) => item.detailId),
        returnLines,
        lines: lines.map((line) => ({
            productId: line.productId,
            productUnitId: line.productUnitId ?? null,
            quantity: Number(line.quantity) || 0,
            costPerUnit: Number(line.costPerUnit) || 0,
            expiryDate: line.expiryDate || null,
            note: line.note?.trim() || null,
            isPromotion: resolveLineType(line) === 'PROMOTION',
            isTrial: resolveLineType(line) === 'TRIAL',
            lineType: resolveLineType(line),
        })),
    };
}

export default function CreateImportOrderPage() {
    const navigate = useNavigate();
    const { id: editIdParam } = useParams();
    const [searchParams] = useSearchParams();
    const editId = editIdParam ? Number(editIdParam) : null;
    const isEditMode = Number.isInteger(editId) && editId > 0;
    // Dashboard mời "Nhập hàng" cho một SP cụ thể thì mở màn này với SP đó có sẵn.
    const preselectProductId = Number(searchParams.get('productId')) || null;
    const preselectQuery = searchParams.get('q') || '';

    const [lines, setLines] = useState([]);
    const [supplier, setSupplier] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(isEditMode);
    const [orderCode, setOrderCode] = useState('');
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [addingSupplier, setAddingSupplier] = useState(false);
    const [addSupplierError, setAddSupplierError] = useState('');
    const [note, setNote] = useState('');
    const [invoiceImageUrl, setInvoiceImageUrl] = useState('');
    const [invoiceImageName, setInvoiceImageName] = useState('');
    const [invoiceFile, setInvoiceFile] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [leaveGuardOpen, setLeaveGuardOpen] = useState(false);
    const [alertModal, setAlertModal] = useState({
        open: false,
        title: '',
        message: '',
        cancelLabel: undefined,
        onConfirm: undefined,
    });
    const [pendingReturnLines, setPendingReturnLines] = useState([]);
    const [selectedReturnLineKeys, setSelectedReturnLineKeys] = useState([]);
    const [loadingReturns, setLoadingReturns] = useState(false);

    const displayLines = useMemo(() => {
        const regular = lines.filter((line) => resolveLineType(line) === 'REGULAR');
        const trial = lines.filter((line) => resolveLineType(line) === 'TRIAL');
        const promo = lines.filter((line) => resolveLineType(line) === 'PROMOTION');
        return [...regular, ...trial, ...promo];
    }, [lines]);

    const allowNavigateRef = useRef(false);
    const initialSnapshotRef = useRef(null);
    const savedInvoiceUrlRef = useRef('');
    /** false = tự fill tiền trả = cần trả NCC; true = chủ đã sửa tay (trả một phần / không trả) */
    const paidAmountTouchedRef = useRef(false);

    const closeAlertModal = () =>
        setAlertModal({
            open: false,
            title: '',
            message: '',
            cancelLabel: undefined,
            onConfirm: undefined,
        });

    const showAlertModal = (title, message, options = {}) => {
        setAlertModal({
            open: true,
            title,
            message,
            cancelLabel: options.cancelLabel,
            onConfirm: options.onConfirm,
        });
    };

    const hasRegularPayable = useMemo(
        () => lines.some((line) => resolveLineType(line) === 'REGULAR'),
        [lines],
    );
    const importItemCount = useMemo(
        () => lines.filter((line) => resolveLineType(line) !== 'PROMOTION').length,
        [lines],
    );
    const payableAmount = useMemo(
        () =>
            lines.reduce((sum, line) => {
                if (isNonPayableImportLine(line)) return sum;
                return sum + (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0);
            }, 0),
        [lines],
    );
    const goodsAmount = useMemo(() => computeGoodsTotal(lines), [lines]);
    const openTrialAmount = useMemo(() => computeOpenTrialAmount(lines), [lines]);
    const regularPayableAmount = useMemo(() => computeRegularPayableAmount(lines), [lines]);
    const safeDiscount = hasRegularPayable
        ? Math.min(Math.max(Number(discountAmount) || 0, 0), regularPayableAmount)
        : 0;
    const returnDeductionAmount = useMemo(
        () => selectedReturnDeduction(pendingReturnLines, selectedReturnLineKeys),
        [pendingReturnLines, selectedReturnLineKeys],
    );
    const settlementNet = payableAmount - safeDiscount - returnDeductionAmount;
    const amountDue = Math.max(settlementNet, 0);
    const supplierRefundAmount = Math.max(-settlementNet, 0);
    const maxPaidAtImport = Math.max(amountDue - openTrialAmount, 0);
    const safePaidAmount = Math.min(Math.max(Number(paidAmount) || 0, 0), maxPaidAtImport);
    const debtAmount = Math.max(amountDue - safePaidAmount, 0);

    const formSnapshot = useMemo(
        () =>
            buildFormSnapshot({
                supplier,
                lines,
                note,
                invoiceImageUrl,
                discountAmount,
                returnLineIds: selectedReturnLineKeys,
                pendingReturnLines,
            }),
        [supplier, lines, note, invoiceImageUrl, discountAmount, selectedReturnLineKeys, pendingReturnLines],
    );

    const isDirty = useMemo(() => {
        if (loadingDetail || loadingReturns) return false;
        if (isEditMode) {
            if (!initialSnapshotRef.current) return false;
            return formSnapshot !== initialSnapshotRef.current;
        }
        return (
            hasValidSupplier(supplier) ||
            lines.length > 0 ||
            Boolean(note.trim()) ||
            Boolean(invoiceImageUrl) ||
            Number(discountAmount) > 0 ||
            selectedReturnLineKeys.length > 0
        );
    }, [
        loadingDetail,
        loadingReturns,
        isEditMode,
        formSnapshot,
        supplier,
        lines,
        note,
        invoiceImageUrl,
        discountAmount,
        selectedReturnLineKeys,
    ]);

    const blocker = useBlocker(({ currentLocation, nextLocation }) => {
        if (allowNavigateRef.current) return false;
        if (!isDirty) return false;
        return currentLocation.pathname !== nextLocation.pathname;
    });

    useEffect(() => {
        if (blocker.state === 'blocked') {
            setLeaveGuardOpen(true);
        }
    }, [blocker.state]);

    useEffect(() => {
        const onBeforeUnload = (event) => {
            if (!isDirty || allowNavigateRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    useEffect(() => () => {
        if (invoiceImageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(invoiceImageUrl);
        }
    }, [invoiceImageUrl]);

    const allowNavigate = () => {
        allowNavigateRef.current = true;
    };

    const handleStayOnPage = () => {
        setLeaveGuardOpen(false);
        if (blocker.state === 'blocked') {
            blocker.reset();
        }
    };

    const handleLeaveWithoutSave = () => {
        setLeaveGuardOpen(false);
        allowNavigate();
        if (blocker.state === 'blocked') {
            blocker.proceed();
        }
    };

    useEffect(() => {
        let cancelled = false;
        setLoadingSuppliers(true);
        suppliersApi
            .getSuppliers({ page: 0, size: 100 })
            .then((page) => {
                if (cancelled) return;
                setSuppliers(
                    (page?.content || []).map((item) => ({
                        id: item.id,
                        supplierCode: item.supplierCode,
                        name: item.name,
                        phoneNumber: item.phoneNumber || '',
                        notes: item.notes || '',
                    })),
                );
            })
            .catch(() => {
                if (!cancelled) setSuppliers([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingSuppliers(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!isEditMode) return undefined;

        let cancelled = false;
        setLoadingDetail(true);
        initialSnapshotRef.current = null;

        importOrdersApi
            .getImportOrderDetail(editId)
            .then((detail) => {
                if (cancelled) return;

                if (detail.orderStatus !== ORDER_STATUS.DRAFT) {
                    window.alert('Chỉ được mở lại phiếu tạm. Phiếu đã nhập hàng không thể chỉnh sửa.');
                    allowNavigate();
                    navigate('/admin/warehouse/import', { replace: true });
                    return;
                }

                const mappedLines = (detail.items || []).map(mapDetailLine);
                const selected = detail.supplierId
                    ? {
                        id: detail.supplierId,
                        supplierCode: detail.supplierCode,
                        name: detail.supplierName,
                    }
                    : null;
                const nextNote = detail.note || '';
                const nextInvoice = detail.invoiceImage || '';
                const nextDiscount = Number(detail.discountAmount) || 0;

                savedInvoiceUrlRef.current = nextInvoice;
                setOrderCode(detail.orderCode || '');
                setNote(nextNote);
                setInvoiceImageUrl(nextInvoice);
                setInvoiceImageName(nextInvoice ? 'Ảnh hóa đơn đã lưu' : '');
                setInvoiceFile(null);
                setDiscountAmount(nextDiscount);
                paidAmountTouchedRef.current = false;
                setPaidAmount(0);
                setLines(mappedLines);

                if (selected) {
                    setSupplier(selected);
                    setSuppliers((prev) => {
                        const exists = prev.some((item) => item.id === selected.id);
                        return exists ? prev : [selected, ...prev];
                    });
                }

                setSelectedReturnLineKeys(
                    (detail.returnLines || [])
                        .map((line) => String(line.detailId))
                        .filter(Boolean),
                );

                initialSnapshotRef.current = buildFormSnapshot({
                    supplier: selected,
                    lines: mappedLines,
                    note: nextNote,
                    invoiceImageUrl: nextInvoice,
                    discountAmount: nextDiscount,
                    returnLineIds: (detail.returnLines || [])
                        .map((line) => String(line.detailId))
                        .filter(Boolean),
                    pendingReturnLines: (detail.returnLines || []).map(mapPendingReturnLine),
                });
            })
            .catch((error) => {
                if (cancelled) return;
                const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    'Không tải được phiếu tạm. Vui lòng thử lại.';
                window.alert(message);
                allowNavigate();
                navigate('/admin/warehouse/import', { replace: true });
            })
            .finally(() => {
                if (!cancelled) setLoadingDetail(false);
            });

        return () => {
            cancelled = true;
        };
    }, [editId, isEditMode, navigate]);

    useEffect(() => {
        if (!hasValidSupplier(supplier)) {
            setPendingReturnLines([]);
            setSelectedReturnLineKeys([]);
            setLoadingReturns(false);
            return undefined;
        }

        let cancelled = false;
        setLoadingReturns(true);

        importOrdersApi
            .getPendingSupplierReturns(supplier.id, isEditMode ? editId : undefined)
            .then((result) => {
                if (cancelled) return;
                const mapped = (result || []).map(mapPendingReturnLine);
                setPendingReturnLines((prev) => {
                    const prevMethods = new Map(prev.map((line) => [String(line.key), line.method]));
                    return mapped.map((line) => {
                        const localMethod = prevMethods.get(String(line.key));
                        return localMethod ? { ...line, method: localMethod } : line;
                    });
                });
                const attachedKeys = mapped
                    .filter((line) => line.attached)
                    .map((line) => String(line.key));
                setSelectedReturnLineKeys((prev) => {
                    const valid = new Set(mapped.map((line) => String(line.key)));
                    const kept = prev.filter((key) => valid.has(key));
                    return kept.length > 0 ? kept : attachedKeys;
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setPendingReturnLines([]);
                    setSelectedReturnLineKeys([]);
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingReturns(false);
            });

        return () => {
            cancelled = true;
        };
    }, [supplier?.id, editId, isEditMode]);

    const defaultPaidAmount = Math.max(amountDue - openTrialAmount, 0);

    useEffect(() => {
        if (!paidAmountTouchedRef.current) {
            // Mặc định trả phần hàng thường; bán thử để công nợ đến khi quyết toán.
            setPaidAmount(defaultPaidAmount);
            return;
        }
        setPaidAmount((prev) => Math.min(Math.max(Number(prev) || 0, 0), maxPaidAtImport));
    }, [amountDue, defaultPaidAmount, maxPaidAtImport]);

    useEffect(() => {
        setDiscountAmount((prev) =>
            hasRegularPayable
                ? Math.min(Math.max(Number(prev) || 0, 0), regularPayableAmount)
                : 0,
        );
    }, [hasRegularPayable, regularPayableAmount]);

    const handleDiscountAmountChange = (value) => {
        if (!hasRegularPayable) {
            setDiscountAmount(0);
            return;
        }
        const parsed = Math.max(0, Number(value) || 0);
        setDiscountAmount(Math.min(parsed, regularPayableAmount));
    };

    const handlePaidAmountChange = (value) => {
        paidAmountTouchedRef.current = true;
        const parsed = Math.max(0, Number(value) || 0);
        setPaidAmount(Math.min(parsed, maxPaidAtImport));
    };

    const handleSelectProducts = (products) => {
        const list = (Array.isArray(products) ? products : [products]).filter(Boolean);
        if (list.length === 0) return;
        setLines((prev) => {
            let next = prev;
            list.forEach((product) => {
                const newLine = createLineFromProduct(product);
                const existing = next.find(
                    (line) =>
                        line.productId === product.id &&
                        line.productUnitId === newLine.productUnitId &&
                        resolveLineType(line) === 'REGULAR',
                );
                if (existing) {
                    next = next.map((line) =>
                        line.key === existing.key
                            ? { ...line, quantity: (Number(line.quantity) || 0) + 1 }
                            : line,
                    );
                } else {
                    next = [...next, newLine];
                }
            });
            return next;
        });
    };

    const handleSelectProduct = (product) => {
        handleSelectProducts([product]);
    };

    const preselectAppliedRef = useRef(false);
    useEffect(() => {
        if (isEditMode || !preselectProductId || !preselectQuery) return;
        if (preselectAppliedRef.current) return;
        preselectAppliedRef.current = true;

        let cancelled = false;
        (async () => {
            try {
                const results = await importOrdersApi.searchProducts(preselectQuery);
                const match = (results || []).find((item) => item.id === preselectProductId);
                if (!cancelled && match) handleSelectProduct(match);
            } catch {
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isEditMode, preselectProductId, preselectQuery]);

    const handleChangeLine = (key, patch) => {
        setLines((prev) => {
            const current = prev.find((line) => line.key === key);
            if (!current) return prev;

            const nextPatch = { ...patch };
            const merged = { ...current, ...nextPatch };
            const nextType = resolveLineType(merged);

            if (nextType === 'TRIAL' && current.alreadyInStore) {
                showAlertModal(
                    'Hàng bán thử',
                    'Chỉ dùng cho sản phẩm mới, chưa từng có ở cửa hàng.',
                );
                return prev;
            }

            const togglingType = typeof patch.lineType === 'string' || typeof patch.isPromotion === 'boolean';

            if (togglingType) {
                const sibling = prev.find(
                    (line) =>
                        line.key !== key &&
                        line.productId === merged.productId &&
                        line.productUnitId === merged.productUnitId &&
                        resolveLineType(line) === nextType,
                );
                if (sibling) {
                    return prev
                        .filter((line) => line.key !== key)
                        .map((line) =>
                            line.key === sibling.key
                                ? {
                                    ...line,
                                    quantity:
                                        (Number(line.quantity) || 0) +
                                        (Number(current.quantity) || 0),
                                }
                                : line,
                        );
                }
            }

            return prev.map((line) => (line.key === key ? { ...line, ...nextPatch } : line));
        });
    };

    const handleRemoveLine = (key) => {
        setLines((prev) => prev.filter((line) => line.key !== key));
    };

    const handleToggleReturnLine = (lineKey) => {
        const key = String(lineKey);
        setSelectedReturnLineKeys((prev) =>
            prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
        );
    };

    const handleToggleAllReturnLines = (selectAll) => {
        if (!selectAll) {
            setSelectedReturnLineKeys([]);
            return;
        }
        setSelectedReturnLineKeys(pendingReturnLines.map((line) => String(line.key)));
    };

    const handleChangeReturnMethod = (lineKey, method) => {
        const nextMethod = method === 'EXCHANGE' ? 'EXCHANGE' : 'RETURN';
        setPendingReturnLines((prev) =>
            prev.map((line) =>
                String(line.key) === String(lineKey) ? { ...line, method: nextMethod } : line,
            ),
        );
    };

    const revokeIfBlobUrl = (url) => {
        if (url?.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    };

    const handleClearInvoiceImage = () => {
        setInvoiceImageUrl((prev) => {
            revokeIfBlobUrl(prev);
            return '';
        });
        setInvoiceImageName('');
        setInvoiceFile(null);
    };

    const handleInvoiceImageChange = (file) => {
        if (!file) {
            handleClearInvoiceImage();
            return;
        }
        try {
            validateInvoiceImageFile(file);
        } catch (error) {
            showAlertModal(
                'Ảnh hóa đơn',
                error?.message || 'Ảnh hóa đơn không hợp lệ.',
            );
            return;
        }
        setInvoiceImageUrl((prev) => {
            revokeIfBlobUrl(prev);
            return URL.createObjectURL(file);
        });
        setInvoiceImageName(file.name || 'Ảnh hóa đơn');
        setInvoiceFile(file);
    };

    const selectCreatedSupplier = (created) => {
        setSuppliers((prev) => {
            const exists = prev.some(
                (item) =>
                    item.id === created.id ||
                    item.supplierCode?.toLowerCase() === created.supplierCode?.toLowerCase(),
            );
            return exists ? prev : [created, ...prev];
        });
        setSupplier(created);
        setIsAddSupplierOpen(false);
        setAddSupplierError('');
    };

    const handleAddSupplier = (supplierData) => {
        setAddingSupplier(true);
        setAddSupplierError('');

        suppliersApi
            .addSupplier(supplierData)
            .then(async () => {
                const page = await suppliersApi.getSuppliers({
                    search: supplierData.name,
                    size: 10,
                });
                const matched = (page?.content || []).find(
                    (item) =>
                        item.supplierCode?.toLowerCase() ===
                        supplierData.supplierCode?.toLowerCase(),
                );

                if (!matched?.id) {
                    throw new Error('Đã tạo NCC nhưng không lấy được mã hệ thống. Vui lòng tìm lại.');
                }

                selectCreatedSupplier({
                    id: matched.id,
                    supplierCode: matched.supplierCode,
                    name: matched.name,
                    phoneNumber: matched.phoneNumber || '',
                    notes: matched.notes || '',
                });
            })
            .catch((error) => {
                const message =
                    error?.response?.data?.message ||
                    error?.message ||
                    'Không thể thêm nhà cung cấp. Vui lòng thử lại.';
                setAddSupplierError(message);
            })
            .finally(() => setAddingSupplier(false));
    };

    const validate = ({ useModal = false, requireSupplier = true } = {}) => {
        if (requireSupplier && !hasValidSupplier(supplier)) {
            showAlertModal(
                'Hoàn thành phiếu nhập',
                'Bạn chưa chọn nhà cung cấp. Vui lòng chọn nhà cung cấp trước khi hoàn thành phiếu nhập hàng.',
            );
            return false;
        }
        if (lines.length === 0 && selectedReturnLineKeys.length === 0) {
            if (useModal) {
                showAlertModal(
                    'Hoàn thành phiếu nhập',
                    'Bạn chưa thêm sản phẩm nhập hoặc chọn dòng đổi/trả. Vui lòng thêm ít nhất một dòng.',
                );
            } else {
                showAlertModal(
                    'Lưu phiếu tạm',
                    'Vui lòng thêm ít nhất một sản phẩm nhập hoặc chọn dòng đổi/trả trước khi lưu tạm.',
                );
            }
            return false;
        }
        const invalidLine = lines.find(
            (line) =>
                !line.productId ||
                !line.productUnitId ||
                (Number(line.quantity) || 0) < 1,
        );
        if (invalidLine) {
            showAlertModal(
                'Dòng hàng chưa hợp lệ',
                'Có dòng hàng chưa hợp lệ. Kiểm tra đơn vị tính và số lượng.',
            );
            return false;
        }
        const missingPriceLine = lines.find(
            (line) =>
                resolveLineType(line) !== 'PROMOTION' && (Number(line.costPerUnit) || 0) <= 0,
        );
        if (missingPriceLine) {
            const isTrial = resolveLineType(missingPriceLine) === 'TRIAL';
            showAlertModal(
                'Chưa nhập đơn giá',
                isTrial
                    ? `Hàng bán thử "${missingPriceLine.productName}" phải nhập giá thỏa thuận.`
                    : `Đơn giá của "${missingPriceLine.productName}" chưa nhập.`,
            );
            return false;
        }
        return true;
    };

    const countMissingExpiry = () =>
        lines.filter((line) => !String(line.expiryDate || '').trim()).length;

    const navigateAfterSuccess = (message) => {
        allowNavigate();
        navigate('/admin/warehouse/import', {
            state: message ? { successMessage: message } : undefined,
        });
    };

    const submitOrder = async (orderStatus, options = {}) => {
        const { skipSuccessModal = false, proceedBlockedNavigation = false } = options;

        // Complete đã validate riêng; draft vẫn validate bằng modal
        if (orderStatus === ORDER_STATUS.DRAFT) {
            if (!validate({ useModal: false, requireSupplier: false }) || submitting || loadingDetail) return false;
        } else if (submitting || loadingDetail) {
            return false;
        }

        const payload = toApiPayload(orderStatus, {
            supplier,
            note,
            invoiceImage: isRemoteImageUrl(invoiceImageUrl) ? invoiceImageUrl : null,
            safeDiscount,
            safePaidAmount,
            lines,
            returnLineIds: selectedReturnLineKeys,
            pendingReturnLines,
        });

        setSubmitting(true);
        try {
            const saved = isEditMode
                ? await importOrdersApi.updateImportOrder(editId, payload)
                : await importOrdersApi.createImportOrder(payload);
            const orderId = saved?.id || editId;

            let imageWarning = '';
            if (invoiceFile && orderId) {
                try {
                    const uploaded = await importOrdersApi.uploadInvoiceImage(orderId, invoiceFile);
                    const nextUrl = uploaded?.url || '';
                    if (nextUrl) {
                        savedInvoiceUrlRef.current = nextUrl;
                        setInvoiceImageUrl((prev) => {
                            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
                            return nextUrl;
                        });
                        setInvoiceFile(null);
                        setInvoiceImageName('Ảnh hóa đơn đã lưu');
                    }
                } catch (error) {
                    imageWarning =
                        error?.response?.data?.message ||
                        'Phiếu đã lưu nhưng không tải được ảnh hóa đơn. Bạn có thể thêm lại khi sửa phiếu tạm.';
                }
            } else if (isEditMode && orderId && savedInvoiceUrlRef.current && !isRemoteImageUrl(invoiceImageUrl)) {
                try {
                    await importOrdersApi.deleteInvoiceImage(orderId);
                    savedInvoiceUrlRef.current = '';
                } catch (error) {
                    imageWarning =
                        error?.response?.data?.message ||
                        'Phiếu đã lưu nhưng không xóa được ảnh hóa đơn cũ.';
                }
            }

            // Đã lưu thành công → coi form sạch để không chặn lần nữa
            initialSnapshotRef.current = buildFormSnapshot({
                supplier,
                lines,
                note,
                invoiceImageUrl: isRemoteImageUrl(invoiceImageUrl)
                    ? invoiceImageUrl
                    : savedInvoiceUrlRef.current || '',
                discountAmount,
                returnLineIds: selectedReturnLineKeys,
                pendingReturnLines,
            });

            const successMessage =
                (orderStatus === ORDER_STATUS.DRAFT
                    ? isEditMode
                        ? 'Đã cập nhật phiếu tạm.'
                        : 'Đã lưu phiếu tạm thành công.'
                    : 'Đã hoàn thành phiếu nhập hàng.')
                + (imageWarning ? ` ${imageWarning}` : '');

            if (skipSuccessModal) {
                allowNavigate();
                setLeaveGuardOpen(false);
                if (proceedBlockedNavigation && blocker.state === 'blocked') {
                    blocker.proceed();
                } else {
                    navigate('/admin/warehouse/import', {
                        state: { successMessage },
                    });
                }
                return true;
            }

            // Nhập hàng thành công: về danh sách + toast góc màn hình
            if (orderStatus === ORDER_STATUS.IMPORTED) {
                navigateAfterSuccess(successMessage);
                return true;
            }

            showAlertModal('Lưu phiếu tạm', successMessage, {
                onConfirm: () => {
                    closeAlertModal();
                    navigateAfterSuccess();
                },
            });
            return true;
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Không thể lưu phiếu nhập. Vui lòng thử lại.';
            showAlertModal(
                orderStatus === ORDER_STATUS.DRAFT ? 'Lưu phiếu tạm' : 'Hoàn thành phiếu nhập',
                message,
            );
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraftAndLeave = async () => {
        if (submitting || loadingDetail) return;

        if (!validate({ useModal: false, requireSupplier: false })) {
            // Thiếu NCC/SP: đóng guard, ở lại trang để sửa
            setLeaveGuardOpen(false);
            if (blocker.state === 'blocked') {
                blocker.reset();
            }
            return;
        }

        const ok = await submitOrder(ORDER_STATUS.DRAFT, {
            skipSuccessModal: true,
            proceedBlockedNavigation: true,
        });

        if (!ok && blocker.state === 'blocked') {
            setLeaveGuardOpen(false);
            blocker.reset();
        }
    };

    const handleComplete = () => {
        if (!validate({ useModal: true, requireSupplier: true }) || submitting || loadingDetail) return;

        const missingCount = countMissingExpiry();
        if (missingCount > 0) {
            showAlertModal(
                'Hoàn thành phiếu nhập',
                `Có ${missingCount} sản phẩm chưa nhập hạn sử dụng. Bạn có chắc muốn hoàn thành phiếu nhập hàng?`,
                {
                    cancelLabel: 'Quay lại',
                    onConfirm: () => {
                        closeAlertModal();
                        submitOrder(ORDER_STATUS.IMPORTED);
                    },
                },
            );
            return;
        }

        submitOrder(ORDER_STATUS.IMPORTED);
    };

    const handleCancelDraft = () => {
        if (!isEditMode || submitting || loadingDetail) return;
        showAlertModal(
            'Hủy phiếu tạm',
            `Bạn có chắc muốn hủy phiếu tạm ${orderCode || ''}? Phiếu sẽ bị xóa khỏi danh sách và không thể khôi phục.`,
            {
                cancelLabel: 'Quay lại',
                onConfirm: async () => {
                    closeAlertModal();
                    setSubmitting(true);
                    try {
                        await importOrdersApi.cancelDraftImportOrder(editId);
                        window.alert('Đã hủy phiếu tạm.');
                        navigateAfterSuccess();
                    } catch (error) {
                        const message =
                            error?.response?.data?.message ||
                            error?.message ||
                            'Không thể hủy phiếu tạm. Vui lòng thử lại.';
                        showAlertModal('Hủy phiếu tạm', message);
                    } finally {
                        setSubmitting(false);
                    }
                },
            },
        );
    };

    return (
        <div className="admin-content">

            <AdminHeader />
            <main className="admin-main admin-main--ioc-create">
                <div className="dashboard-container ioc-page ioc-page--create">
                    <header className="ioc-page__header ioc-page__header--compact">
                        <button
                            type="button"
                            className="ioc-page__back"
                            title="Quay lại danh sách"
                            onClick={() => navigate('/admin/warehouse/import')}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="ioc-page__title">
                            {isEditMode ? 'Mở lại phiếu tạm' : 'Nhập hàng'}
                        </h1>
                    </header>

                    {loadingDetail ? (
                        <p className="supplier-detail-empty-text">Đang tải phiếu tạm...</p>
                    ) : (
                        <div className="ioc-layout">
                            <section className="ioc-main">
                                <ImportOrderProductSearch
                                    onSelect={handleSelectProduct}
                                    onSelectMany={handleSelectProducts}
                                />
                                <section className="ioc-section ioc-section--import">
                                    <header className="ioc-section__head">
                                        <div>
                                            <h2 className="ioc-section__title">I. Hàng nhập</h2>
                                        </div>
                                    </header>
                                    <ImportOrderLineTable
                                        lines={displayLines}
                                        onChangeLine={handleChangeLine}
                                        onRemoveLine={handleRemoveLine}
                                    />
                                </section>

                                <ImportOrderReturnSection
                                    supplier={supplier}
                                    lines={pendingReturnLines}
                                    selectedLineKeys={selectedReturnLineKeys}
                                    loading={loadingReturns}
                                    onToggleLine={handleToggleReturnLine}
                                    onToggleAll={handleToggleAllReturnLines}
                                    onChangeMethod={handleChangeReturnMethod}
                                />
                            </section>

                            <ImportOrderCreateSidebar
                                supplier={supplier}
                                suppliers={suppliers}
                                suppliersLoading={loadingSuppliers}
                                note={note}
                                invoiceImageUrl={invoiceImageUrl}
                                invoiceImageName={invoiceImageName}
                                totalAmount={goodsAmount}
                                openTrialAmount={openTrialAmount}
                                importItemCount={importItemCount}
                                discountAmount={safeDiscount}
                                returnDeductionAmount={returnDeductionAmount}
                                amountDue={amountDue}
                                supplierRefundAmount={supplierRefundAmount}
                                paidAmount={safePaidAmount}
                                debtAmount={debtAmount}
                                submitting={submitting}
                                showDiscount={hasRegularPayable}
                                onSelectSupplier={setSupplier}
                                onClearSupplier={() => setSupplier(null)}
                                onOpenAddSupplier={() => {
                                    setAddSupplierError('');
                                    setIsAddSupplierOpen(true);
                                }}
                                onNoteChange={setNote}
                                onInvoiceImageChange={handleInvoiceImageChange}
                                onClearInvoiceImage={handleClearInvoiceImage}
                                onDiscountAmountChange={handleDiscountAmountChange}
                                onPaidAmountChange={handlePaidAmountChange}
                                onSaveDraft={() => submitOrder(ORDER_STATUS.DRAFT)}
                                onComplete={handleComplete}
                                showCancelDraft={isEditMode}
                                onCancelDraft={handleCancelDraft}
                            />
                        </div>
                    )}
                </div>

                <ImportOrderAlertModal
                    open={alertModal.open}
                    title={alertModal.title}
                    message={alertModal.message}
                    confirmLabel="Đồng ý"
                    cancelLabel={alertModal.cancelLabel}
                    onClose={closeAlertModal}
                    onConfirm={alertModal.onConfirm}
                />

                <ImportOrderAlertModal
                    open={leaveGuardOpen}
                    title="Phiếu nhập chưa được lưu"
                    message="Bạn đang nhập hàng dở. Nếu thoát bây giờ, những gì vừa chọn (nhà cung cấp, mặt hàng, số lượng, giá…) sẽ mất và phải nhập lại từ đầu."
                    cancelLabel="Tiếp tục nhập"
                    dangerLabel="Thoát, không cần giữ"
                    confirmLabel={submitting ? 'Đang lưu...' : 'Lưu tạm rồi thoát'}
                    confirmDisabled={submitting}
                    dangerDisabled={submitting}
                    onClose={handleStayOnPage}
                    onDanger={handleLeaveWithoutSave}
                    onConfirm={handleSaveDraftAndLeave}
                />

                <SupplierAddNewModal
                    open={isAddSupplierOpen}
                    onClose={() => {
                        if (!addingSupplier) {
                            setIsAddSupplierOpen(false);
                            setAddSupplierError('');
                        }
                    }}
                    onSubmit={handleAddSupplier}
                    submitting={addingSupplier}
                    submitError={addSupplierError}
                />
            </main >
        </div >
    );
}
