import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SideBar from '../../../components/ui/sidebar/SideBar';
import AdminHeader from '../../../components/ui/header-footer/Header';
import SupplierAddNewModal from '../../supplier/components/SupplierAddNewModal';
import { suppliersApi } from '../../supplier/api';
import { importOrdersApi } from '../api';
import ImportOrderProductSearch from '../components/ImportOrderProductSearch';
import ImportOrderLineTable from '../components/ImportOrderLineTable';
import ImportOrderCreateSidebar from '../components/ImportOrderCreateSidebar';
import ImportOrderAlertModal from '../components/ImportOrderAlertModal';
import { getProfile } from '../../profile/api';
import { ORDER_STATUS } from '../constants';
import { uploadInvoiceImage } from '@/lib/cloudinary';
import { suggestCostForUnit } from '../utils/importOrderUtils';
import '../../../css/AdminDashboard.css';
import '../../../css/Supplier.css';
import '../../../css/ImportOrder.css';

function hasValidSupplier(supplier) {
    return supplier?.id != null && Number(supplier.id) > 0 && !Number.isNaN(Number(supplier.id));
}

function buildFormSnapshot({ supplier, lines, note, invoiceImageUrl, discountAmount }) {
    return JSON.stringify({
        supplierId: supplier?.id ?? null,
        note: note?.trim() || '',
        invoiceImageUrl: invoiceImageUrl || '',
        discountAmount: Number(discountAmount) || 0,
        lines: (lines || []).map((line) => ({
            productId: line.productId,
            productUnitId: line.productUnitId ?? null,
            quantity: Number(line.quantity) || 0,
            costPerUnit: Number(line.costPerUnit) || 0,
            expiryDate: line.expiryDate || '',
            note: line.note?.trim() || '',
            isPromotion: Boolean(line.isPromotion),
        })),
    });
}

function normalizeProductUnits(productUnits) {
    return (productUnits || []).map((unit) => ({
        id: unit.id,
        name: unit.name || 'Cái',
        unitBase: Number(unit.unitBase) || 1,
    }));
}

function pickDefaultProductUnit(productUnits) {
    const units = normalizeProductUnits(productUnits);
    if (units.length === 0) {
        return { id: null, name: 'Cái', unitBase: 1 };
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
        productName: item.productName || '',
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
        isPromotion: Boolean(item.isPromotion),
    };
}

function toApiPayload(orderStatus, { supplier, note, invoiceImage, safeDiscount, safePaidAmount, lines }) {
    return {
        supplierId: Number(supplier.id),
        orderStatus,
        note: note.trim() || null,
        invoiceImage: invoiceImage || null,
        discountAmount: safeDiscount,
        paidAmount: orderStatus === ORDER_STATUS.IMPORTED ? safePaidAmount : 0,
        paymentMethod: 'CASH',
        lines: lines.map((line) => ({
            productId: line.productId,
            productUnitId: line.productUnitId ?? null,
            quantity: Number(line.quantity) || 0,
            costPerUnit: Number(line.costPerUnit) || 0,
            expiryDate: line.expiryDate || null,
            note: line.note?.trim() || null,
            isPromotion: Boolean(line.isPromotion),
        })),
    };
}

export default function CreateImportOrderPage() {
    const navigate = useNavigate();
    const { id: editIdParam } = useParams();
    const editId = editIdParam ? Number(editIdParam) : null;
    const isEditMode = Number.isInteger(editId) && editId > 0;

    const [lines, setLines] = useState([]);
    const [supplier, setSupplier] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(isEditMode);
    const [orderCode, setOrderCode] = useState('');
    const [creatorName, setCreatorName] = useState('');
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [addingSupplier, setAddingSupplier] = useState(false);
    const [addSupplierError, setAddSupplierError] = useState('');
    const [note, setNote] = useState('');
    const [invoiceImageUrl, setInvoiceImageUrl] = useState('');
    const [invoiceImageName, setInvoiceImageName] = useState('');
    const [uploadingInvoiceImage, setUploadingInvoiceImage] = useState(false);
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

    const allowNavigateRef = useRef(false);
    const initialSnapshotRef = useRef(null);
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

    const totalAmount = useMemo(
        () =>
            lines.reduce((sum, line) => {
                if (line.isPromotion) return sum;
                return sum + (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0);
            }, 0),
        [lines],
    );

    const safeDiscount = Math.min(Math.max(Number(discountAmount) || 0, 0), totalAmount);
    const amountDue = Math.max(totalAmount - safeDiscount, 0);
    const safePaidAmount = Math.min(Math.max(Number(paidAmount) || 0, 0), amountDue);
    const debtAmount = Math.max(amountDue - safePaidAmount, 0);

    const formSnapshot = useMemo(
        () => buildFormSnapshot({ supplier, lines, note, invoiceImageUrl, discountAmount }),
        [supplier, lines, note, invoiceImageUrl, discountAmount],
    );

    const isDirty = useMemo(() => {
        if (loadingDetail) return false;
        if (isEditMode) {
            if (!initialSnapshotRef.current) return false;
            return formSnapshot !== initialSnapshotRef.current;
        }
        return (
            hasValidSupplier(supplier) ||
            lines.length > 0 ||
            Boolean(note.trim()) ||
            Boolean(invoiceImageUrl) ||
            Number(discountAmount) > 0
        );
    }, [loadingDetail, isEditMode, formSnapshot, supplier, lines, note, invoiceImageUrl, discountAmount]);

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
        let cancelled = false;
        getProfile()
            .then((profile) => {
                if (cancelled) return;
                // Phiếu mới: người lập = user đang đăng nhập. Phiếu sửa: ưu tiên tên từ detail.
                setCreatorName((prev) => prev || profile?.fullName || '');
            })
            .catch(() => {});
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

                setOrderCode(detail.orderCode || '');
                if (detail.createdByName) setCreatorName(detail.createdByName);
                setNote(nextNote);
                setInvoiceImageUrl(nextInvoice);
                setInvoiceImageName(nextInvoice ? 'Ảnh hóa đơn đã lưu' : '');
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

                initialSnapshotRef.current = buildFormSnapshot({
                    supplier: selected,
                    lines: mappedLines,
                    note: nextNote,
                    invoiceImageUrl: nextInvoice,
                    discountAmount: nextDiscount,
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
        if (!paidAmountTouchedRef.current) {
            // Mặc định: trả đủ theo tổng cần trả NCC (tổng tiền − giảm giá)
            setPaidAmount(amountDue);
            return;
        }
        // Đã sửa tay: chỉ kẹp trong khoảng hợp lệ khi tổng thay đổi
        setPaidAmount((prev) => Math.min(Math.max(Number(prev) || 0, 0), amountDue));
    }, [amountDue]);

    const handleDiscountAmountChange = (value) => {
        const parsed = Math.max(0, Number(value) || 0);
        setDiscountAmount(Math.min(parsed, totalAmount));
    };

    const handlePaidAmountChange = (value) => {
        paidAmountTouchedRef.current = true;
        const parsed = Math.max(0, Number(value) || 0);
        setPaidAmount(Math.min(parsed, amountDue));
    };

    const handleSelectProduct = (product) => {
        setLines((prev) => {
            const newLine = createLineFromProduct(product);
            const existing = prev.find(
                (line) =>
                    line.productId === product.id &&
                    line.productUnitId === newLine.productUnitId,
            );
            if (existing) {
                return prev.map((line) =>
                    line.key === existing.key
                        ? { ...line, quantity: (Number(line.quantity) || 0) + 1 }
                        : line,
                );
            }
            return [...prev, newLine];
        });
    };

    const handleChangeLine = (key, patch) => {
        setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    };

    const handleRemoveLine = (key) => {
        setLines((prev) => prev.filter((line) => line.key !== key));
    };

    const handleInvoiceImageChange = async (file) => {
        if (!file) {
            setInvoiceImageUrl('');
            setInvoiceImageName('');
            return;
        }

        setUploadingInvoiceImage(true);
        try {
            const result = await uploadInvoiceImage(file);
            setInvoiceImageUrl(result.url);
            setInvoiceImageName(file.name || 'Ảnh hóa đơn');
        } catch (error) {
            setInvoiceImageUrl('');
            setInvoiceImageName('');
            showAlertModal(
                'Upload ảnh hóa đơn',
                error?.message || 'Không thể upload ảnh. Vui lòng thử lại.',
            );
        } finally {
            setUploadingInvoiceImage(false);
        }
    };

    const handleClearInvoiceImage = () => {
        setInvoiceImageUrl('');
        setInvoiceImageName('');
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
                    search: supplierData.supplierCode,
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

    const validate = ({ useModal = false } = {}) => {
        if (!hasValidSupplier(supplier)) {
            if (useModal) {
                showAlertModal(
                    'Hoàn thành phiếu nhập',
                    'Bạn chưa chọn nhà cung cấp. Vui lòng chọn nhà cung cấp trước khi hoàn thành phiếu nhập hàng.',
                );
            } else {
                showAlertModal(
                    'Lưu phiếu tạm',
                    'Vui lòng chọn nhà cung cấp trước khi lưu tạm.',
                );
            }
            return false;
        }
        if (lines.length === 0) {
            if (useModal) {
                showAlertModal(
                    'Hoàn thành phiếu nhập',
                    'Bạn chưa thêm sản phẩm nào. Vui lòng thêm ít nhất một sản phẩm trước khi hoàn thành.',
                );
            } else {
                showAlertModal(
                    'Lưu phiếu tạm',
                    'Vui lòng thêm ít nhất một sản phẩm trước khi lưu tạm.',
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
            if (!validate({ useModal: false }) || submitting || loadingDetail) return false;
        } else if (submitting || loadingDetail) {
            return false;
        }

        if (uploadingInvoiceImage) {
            showAlertModal(
                'Đang upload ảnh',
                'Đang upload ảnh hóa đơn. Vui lòng đợi xong rồi lưu lại.',
            );
            return false;
        }

        const payload = toApiPayload(orderStatus, {
            supplier,
            note,
            invoiceImage: invoiceImageUrl,
            safeDiscount,
            safePaidAmount,
            lines,
        });

        setSubmitting(true);
        try {
            if (isEditMode) {
                await importOrdersApi.updateImportOrder(editId, payload);
            } else {
                await importOrdersApi.createImportOrder(payload);
            }

            // Đã lưu thành công → coi form sạch để không chặn lần nữa
            initialSnapshotRef.current = buildFormSnapshot({
                supplier,
                lines,
                note,
                invoiceImageUrl,
                discountAmount,
            });

            const successMessage =
                orderStatus === ORDER_STATUS.DRAFT
                    ? isEditMode
                        ? 'Đã cập nhật phiếu tạm.'
                        : 'Đã lưu phiếu tạm thành công.'
                    : 'Đã hoàn thành phiếu nhập hàng.';

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
        if (submitting || loadingDetail || uploadingInvoiceImage) return;

        if (!validate({ useModal: false })) {
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
        if (!validate({ useModal: true }) || submitting || loadingDetail) return;

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
        <div className="admin-layout">
            <SideBar />
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
                                    <ImportOrderProductSearch onSelect={handleSelectProduct} />
                                    <ImportOrderLineTable
                                        lines={lines}
                                        onChangeLine={handleChangeLine}
                                        onRemoveLine={handleRemoveLine}
                                    />
                                </section>

                                <ImportOrderCreateSidebar
                                    supplier={supplier}
                                    suppliers={suppliers}
                                    suppliersLoading={loadingSuppliers}
                                    orderCode={orderCode}
                                    creatorName={creatorName}
                                    note={note}
                                    invoiceImageUrl={invoiceImageUrl}
                                    invoiceImageName={invoiceImageName}
                                    uploadingInvoiceImage={uploadingInvoiceImage}
                                    totalAmount={totalAmount}
                                    discountAmount={safeDiscount}
                                    amountDue={amountDue}
                                    paidAmount={safePaidAmount}
                                    debtAmount={debtAmount}
                                    orderStatus={ORDER_STATUS.DRAFT}
                                    submitting={submitting || uploadingInvoiceImage}
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
                            confirmDisabled={submitting || uploadingInvoiceImage}
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
                    </div>
                </main>
            </div>
        </div>
    );
}
