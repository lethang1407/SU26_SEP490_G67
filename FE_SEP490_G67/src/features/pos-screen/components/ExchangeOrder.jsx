import { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Search,
    Home,
    Trash2,
    AlertCircle,
    Printer,
    CornerUpLeft,
    ShoppingCart,
    Ban
} from "lucide-react";
import "../../../css/POS.css";
import "../../../css/ExchangeOrder.css";
import ExchangeOrderPicker from '../components/ExchangeOrderPicker';
import { getOrderForExchange, processExchangeOrder, searchProductsByName, getInvoiceData } from "../api";
import { printInvoice } from '../utils/printInvoice';
import { getApiErrorMessage } from "../../../utils/api-utils";
import { formatVnd } from "../utils/money";
import { previewSettlement } from "../utils/exchangeSettlement";

const formatVnDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : '';

const ITEM_CONDITIONS = [
    { value: 'RESELLABLE', label: 'Nguyên vẹn' },
    { value: 'DAMAGED', label: 'Hỏng' },
    { value: 'EXPIRED', label: 'Hết hạn' },
    { value: 'OPENED', label: 'Đã mở' },
];

const ExchTableHead = () => (
    <>
        <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '19%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
            <tr>
                <th className="exch-col-check">TRẢ</th>
                <th className="col-stt">STT</th>
                <th>MÃ SẢN PHẨM</th>
                <th>TÊN SẢN PHẨM</th>
                <th>ĐVT</th>
                <th className="text-center">SL MUA</th>
                <th className="text-center">SL ĐỔI TRẢ</th>
                <th className="text-center">TÌNH TRẠNG</th>
                <th>GHI CHÚ</th>
                <th className="text-right">ĐƠN GIÁ</th>
                <th className="text-right">THÀNH TIỀN</th>
            </tr>
        </thead>
    </>
);

export default function ExchangeOrder({ orderId: orderIdProp, embedded = false, onDone, onDirtyChange, ref }) {
    const params = useParams();
    const orderId = orderIdProp ?? params.orderId;
    const navigate = useNavigate();
    const [originalOrder, setOriginalOrder] = useState(null);
    const [loading, setLoading] = useState(!!orderId);
    const [error, setError] = useState(null);
    const [returnItems, setReturnItems] = useState([]);
    const [exchangeItems, setExchangeItems] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [hideUnchanged, setHideUnchanged] = useState(false);
    const [refundMethod, setRefundMethod] = useState('cash');
    const [returnNote, setReturnNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const [validationErrors, setValidationErrors] = useState({});
    const [submitResult, setSubmitResult] = useState(null);
    const [printing, setPrinting] = useState(false);

    // Load original order data
    useEffect(() => {
        const loadOrder = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getOrderForExchange(orderId);
                setOriginalOrder(data);

                const initialReturnItems = data.items.map(item => ({
                    salesOrderDetailId: item.salesOrderDetailId,
                    productId: item.productId,
                    productCode: item.productCode,
                    productName: item.productName,
                    unitName: item.unitName,
                    quantityPurchased: item.quantityPurchased,
                    quantityReturned: item.quantityReturned ?? 0,
                    quantityReturnable: item.quantityReturnable ?? item.quantityPurchased,
                    productReturnable: item.productReturnable ?? true,
                    selected: false,
                    returnQty: 0,
                    itemCondition: '',
                    note: '',
                    unitPrice: item.unitPrice,
                    total: 0
                }));
                setReturnItems(initialReturnItems);
            } catch (err) {
                setError(getApiErrorMessage(err, 'Không thể tải thông tin đơn hàng'));
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            loadOrder();
        }
    }, [orderId]);

    // Search products
    useEffect(() => {
        const searchProducts = async () => {
            if (searchInput.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            try {
                setSearchLoading(true);
                const results = await searchProductsByName(searchInput);
                setSearchResults(results);
            } catch (err) {
                console.error('Search error:', err);
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        };

        const debounce = setTimeout(searchProducts, 300);
        return () => clearTimeout(debounce);
    }, [searchInput]);

    const onDirtyChangeRef = useRef(onDirtyChange);
    useEffect(() => {
        onDirtyChangeRef.current = onDirtyChange;
    });
    useEffect(() => {
        const dirty = returnItems.some(item => item.selected)
            || exchangeItems.length > 0
            || returnNote.trim().length > 0;
        onDirtyChangeRef.current?.(dirty);
    }, [returnItems, exchangeItems, returnNote]);

    const handleToggleReturn = useCallback((salesOrderDetailId) => {
        setReturnItems(prev => prev.map(item => {
            if (item.salesOrderDetailId !== salesOrderDetailId) return item;
            if (item.selected) {
                return { ...item, selected: false, returnQty: 0, itemCondition: '', note: '', total: 0 };
            }
            const qty = Math.min(1, item.quantityReturnable);
            return { ...item, selected: true, returnQty: qty, total: qty * item.unitPrice };
        }));
        setValidationErrors(prev => ({ ...prev, returnItems: null }));
    }, []);

    const handleReturnQtyChange = useCallback((salesOrderDetailId, delta) => {
        setReturnItems(prev => prev.map(item => {
            if (item.salesOrderDetailId === salesOrderDetailId) {
                // Không bao giờ vượt quá số lượng đã mua (trừ phần đã trả ở lần trước)
                const newQty = Math.max(1, Math.min(item.quantityReturnable, item.returnQty + delta));
                return { ...item, returnQty: newQty, total: newQty * item.unitPrice };
            }
            return item;
        }));
        setValidationErrors(prev => ({ ...prev, returnItems: null }));
    }, []);

    const handleConditionChange = useCallback((salesOrderDetailId, condition) => {
        setReturnItems(prev => prev.map(item =>
            item.salesOrderDetailId === salesOrderDetailId
                ? { ...item, itemCondition: condition }
                : item
        ));
        setValidationErrors(prev => ({ ...prev, returnItems: null }));
    }, []);

    const handleNoteChange = useCallback((salesOrderDetailId, note) => {
        setReturnItems(prev => prev.map(item =>
            item.salesOrderDetailId === salesOrderDetailId
                ? { ...item, note }
                : item
        ));
    }, []);

    const handleExchangeQtyChange = useCallback((index, delta) => {
        setExchangeItems(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty, total: newQty * item.price };
            }
            return item;
        }));
    }, []);

    const handleExchangeUnitChange = useCallback((index, productUnitId) => {
        setExchangeItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const selectedUnit = (item.units ?? []).find(
                (u) => String(u.id) === String(productUnitId)
            );
            if (!selectedUnit) return item;
            const newPrice = selectedUnit.sellingPrice ?? item.price;
            return {
                ...item,
                productUnitId: selectedUnit.id,
                unitName: selectedUnit.name,
                price: newPrice,
                total: item.qty * newPrice
            };
        }));
    }, []);

    // Thêm hàng khách lấy đi
    const handleAddExchangeProduct = useCallback((product) => {
        const existingIndex = exchangeItems.findIndex(item => item.productId === product.id);

        if (existingIndex >= 0) {
            setExchangeItems(prev => prev.map((item, i) => {
                if (i === existingIndex) {
                    const newQty = item.qty + 1;
                    return { ...item, qty: newQty, total: newQty * item.price };
                }
                return item;
            }));
        } else {
            const units = product.productUnits ?? [];
            const defaultUnit = units.find((u) => u.isDefault)
                ?? units.find((u) => Number(u.unitBase) === 1)
                ?? units[0];
            const price = defaultUnit?.sellingPrice ?? product.sellingPrice ?? 0;
            const newItem = {
                productId: product.id,
                productCode: product.barcode || `SP${String(product.id).padStart(6, '0')}`,
                productName: product.name,
                units,
                unitName: defaultUnit?.name || 'Cái',
                qty: 1,
                price,
                total: price,
                batchId: product.stockBatches?.[0]?.id || null,
                productUnitId: defaultUnit?.id ?? null
            };
            setExchangeItems(prev => [...prev, newItem]);
        }

        setSearchInput('');
        setSearchResults([]);
        setValidationErrors(prev => ({ ...prev, exchangeItems: null }));
    }, [exchangeItems]);

    useImperativeHandle(ref, () => ({
        addExchangeProduct: handleAddExchangeProduct,
    }), [handleAddExchangeProduct]);

    const handleRemoveExchangeItem = useCallback((index) => {
        setExchangeItems(prev => prev.filter((_, i) => i !== index));
    }, []);

    const returnSubtotal = returnItems.reduce((sum, item) => sum + item.total, 0);
    const exchangeSubtotal = exchangeItems.reduce((sum, item) => sum + item.total, 0);
    const netAmount = returnSubtotal - exchangeSubtotal;
    const isExchange = exchangeItems.length > 0;
    const isDebtOrder = !!originalOrder?.isDebt;

    const settlement = useMemo(() => previewSettlement({
        returnAmount: returnSubtotal,
        exchangeAmount: exchangeSubtotal,
        debtRemaining: originalOrder?.debtRemaining ?? 0,
        isDebt: isDebtOrder,
        dueDate: originalOrder?.dueDate ?? null,
        debtPayment: 0,
    }), [returnSubtotal, exchangeSubtotal, originalOrder, isDebtOrder]);

    const direction = settlement.cashRefund > 0 ? 'refund'
        : settlement.totalCashIn > 0 ? 'collect'
            : 'even';
    const blockedReason = originalOrder?.returnWindowExpired
        ? {
            title: 'Hóa đơn đã hết hạn đổi trả',
            detail: originalOrder?.returnDeadline
                ? `Hạn đổi trả của hóa đơn này là hết ngày ${formatVnDate(originalOrder.returnDeadline)}. Quá hạn thì không đổi/trả được, kể cả hàng hỏng hay hết hạn.`
                : 'Quá hạn thì không đổi/trả được, kể cả hàng hỏng hay hết hạn.',
        }
        : originalOrder?.debtOverdue
            ? {
                title: 'Đơn nợ đã quá hạn trả',
                detail: `Hóa đơn này còn nợ ${formatVnd(originalOrder.debtRemaining)} và đã quá hạn ${formatVnDate(originalOrder.dueDate)}. Khách cần thanh toán hết nợ trước, sau đó mới xử lý đổi/trả.`,
            }
            : null;

    const selectedItems = useMemo(
        () => returnItems.filter(item => item.selected),
        [returnItems]
    );
    const visibleReturnItems = hideUnchanged
        ? returnItems.filter(item => item.selected)
        : returnItems;

    const validateForm = () => {
        const errors = {};

        if (selectedItems.length === 0) {
            errors.returnItems = 'Chưa chọn dòng nào để trả. Tích vào ô "Trả" ở dòng hàng khách mang về.';
        }

        selectedItems.forEach(item => {
            if (item.returnQty > item.quantityReturnable) {
                errors.returnItems = `"${item.productName}" chỉ còn ${item.quantityReturnable} có thể trả`;
            } else if (!item.itemCondition) {
                errors.returnItems = `Chưa chọn tình trạng cho "${item.productName}"`;
            } else if (!item.productReturnable) {
                errors.returnItems = `"${item.productName}" không được phép trả lại`;
            }
        });

        if (settlement.hasCashMovement && !refundMethod) {
            errors.refundMethod = direction === 'collect'
                ? 'Vui lòng chọn hình thức thanh toán'
                : 'Vui lòng chọn hình thức hoàn tiền';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setSubmitting(true);
            setSubmitError(null);

            const payload = {
                originalOrderId: parseInt(orderId),
                returnItems: selectedItems.map(item => ({
                    salesOrderDetailId: item.salesOrderDetailId,
                    productId: item.productId,
                    quantity: item.returnQty,
                    unitName: item.unitName,
                    itemCondition: item.itemCondition,
                    itemNote: item.note.trim() || null
                })),
                exchangeItems: exchangeItems.map(item => ({
                    productId: item.productId,
                    batchId: item.batchId,
                    productUnitId: item.productUnitId,
                    quantity: item.qty,
                    unitPrice: item.price,
                    discountAmount: 0
                })),
                returnNote: returnNote.trim() || null,
                refundMethod: refundMethod.toUpperCase(),
                returnDiscount: 0,
                exchangeDiscount: 0,
                debtPaymentAmount: null
            };

            const result = await processExchangeOrder(payload);
            setSubmitResult({
                returnCode: result.returnCode,
                direction,
                isExchange,
                netAmount,
                returnSubtotal,
                exchangeSubtotal,
                refundMethod: refundMethod.toUpperCase(),
                // Số quyết toán lấy từ RESPONSE, không dùng lại bản xem trước ở FE:
                // backend là nơi chốt, và nó có thể kẹp bớt tiền trả thêm.
                isDebtOrder: !!result.originalIsDebt,
                debtOffsetAmount: result.debtOffsetAmount ?? 0,
                exchangeCreditAmount: result.exchangeCreditAmount ?? 0,
                cashRefundAmount: result.cashRefundAmount ?? 0,
                cashCollectAmount: result.cashCollectAmount ?? 0,
                newDebtOnExchange: result.newDebtOnExchange ?? 0,
                debtPaymentCollected: result.debtPaymentCollected ?? 0,
                debtRemainingAfter: result.debtRemainingAfter ?? 0,
                exchangeOrderCode: result.exchangeOrderCode ?? null,
                returnLines: selectedItems.map(item => ({
                    productName: item.productName,
                    unitName: item.unitName,
                    quantity: item.returnQty,
                    unitPrice: item.unitPrice,
                    lineTotal: item.total,
                })),
                exchangeLines: exchangeItems.map(item => ({
                    productName: item.productName,
                    unitName: item.unitName,
                    quantity: item.qty,
                    unitPrice: item.price,
                    lineTotal: item.total,
                })),
            });
        } catch (err) {
            setSubmitError(getApiErrorMessage(err, 'Không thể xử lý đổi trả hàng'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseResult = () => {
        setSubmitResult(null);
        if (embedded) {
            onDone?.();
        } else {
            navigate('/admin/pos');
        }
    };

    const handlePrintResult = async () => {
        if (!submitResult || printing) return;
        setPrinting(true);
        try {
            let head = {};
            try {
                const invoice = await getInvoiceData(orderId);
                head = {
                    storeName: invoice?.storeName,
                    storeAddress: invoice?.storeAddress,
                    taxCode: invoice?.taxCode,
                    currency: invoice?.currency,
                    cashierName: invoice?.cashierName,
                };
            } catch {
                // Không lấy được thông tin cửa hàng thì vẫn in phiếu, chỉ thiếu phần đầu trang.
            }

            printInvoice({
                ...head,
                kind: 'EXCHANGE',
                orderCode: submitResult.returnCode,
                originalOrderCode: originalOrder?.orderCode,
                createdAtVn: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                customer: originalOrder?.customer ?? null,
                refundMethod: submitResult.refundMethod,
                returnItems: submitResult.returnLines,
                exchangeItems: submitResult.exchangeLines,
                returnSubtotal: submitResult.returnSubtotal,
                exchangeSubtotal: submitResult.exchangeSubtotal,
                netAmount: submitResult.netAmount,
                isDebtOrder: submitResult.isDebtOrder,
                debtOffsetAmount: submitResult.debtOffsetAmount,
                cashRefundAmount: submitResult.cashRefundAmount,
                cashCollectAmount: submitResult.cashCollectAmount,
                debtPaymentCollected: submitResult.debtPaymentCollected,
                newDebtOnExchange: submitResult.newDebtOnExchange,
                debtRemainingAfter: submitResult.debtRemainingAfter,
                exchangeOrderCode: submitResult.exchangeOrderCode,
            });
        } finally {
            setPrinting(false);
        }
    };

    // Chưa chọn hóa đơn -> hiển thị bước tìm kiếm & chọn hóa đơn cần đổi/trả
    if (!orderId) {
        return <ExchangeOrderPicker />;
    }

    const shell = (children) => embedded
        ? children
        : <div className="pos-container">{children}</div>;

    if (loading) {
        return shell(
            <div className="exchange-state-container">
                <div>Đang tải...</div>
            </div>
        );
    }

    if (error) {
        return shell(
            <div className="exchange-error-container">
                <AlertCircle size={48} color="#ef4444" />
                <div className="exchange-error-text">{error}</div>
                <button
                    onClick={() => (embedded ? onDone?.() : navigate('/admin/pos'))}
                    className="exchange-error-back-btn"
                >
                    Quay lại
                </button>
            </div>
        );
    }

    const COLUMN_COUNT = 11;
    const searchBox = (
        <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input
                type="text"
                placeholder="Tìm kiếm sản phẩm"
                className="search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput.length >= 2 && (
                <div className="exchange-dropdown">
                    {searchLoading ? (
                        <div className="exchange-dropdown-state">Đang tìm...</div>
                    ) : searchResults.length > 0 ? (
                        searchResults.map(product => (
                            <div
                                key={product.id}
                                className="exchange-dropdown-item"
                                onClick={() => handleAddExchangeProduct(product)}
                            >
                                <div className="exchange-dropdown-item-name">{product.name}</div>
                                <div className="exchange-dropdown-item-price">
                                    Giá: {formatVnd(product.sellingPrice)}
                                    <span className={`psd-stock${Number(product.stockQuantity ?? 0) <= 0 ? ' psd-stock--empty' : ''}`}>
                                        Tồn kho: {Number(product.stockQuantity ?? 0).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="exchange-dropdown-state exchange-dropdown-empty">Không tìm thấy sản phẩm</div>
                    )}
                </div>
            )}
        </div>
    );

    return shell(
        <>
            {!embedded && (
                <header className="pos-header">
                    <div className="pos-header-left">
                        {searchBox}
                        <div className="pos-header-center">
                            <button className="tab-active">
                                Đổi trả hàng - {originalOrder?.orderCode}
                            </button>
                        </div>
                    </div>

                    <div className="pos-header-right">
                        <button className="icon-btn" onClick={() => navigate('/admin/pos')} title="Trang chủ POS">
                            <Home size={24} />
                        </button>
                    </div>
                </header>
            )}

            <div className="pos-main">
                {/* CỘT TRÁI*/}
                <div className="pos-cart-section exchange-cart-section">
                    <div className="exch-toolbar">
                        <div className="exch-toolbar-title">
                            ĐỔI TRẢ HÀNG
                            <span className="exch-toolbar-order">{originalOrder?.orderCode}</span>
                        </div>

                        <label className="exch-toolbar-toggle">
                            <input
                                type="checkbox"
                                checked={hideUnchanged}
                                onChange={(e) => setHideUnchanged(e.target.checked)}
                            />
                            <span>Ẩn sản phẩm</span>
                        </label>

                    </div>

                    <div className="exch-table-split">
                        {/* Phần 1: hàng khách TRẢ VỀ cửa hàng  */}
                        <div className="exch-table-scroll">
                            <table className="cart-table exch-table">
                                <ExchTableHead />
                                <tbody>
                                    <tr className="exch-group-row exch-group-row--return">
                                        <td colSpan={COLUMN_COUNT}>
                                            <CornerUpLeft size={14} /> Sản phẩm trả lại
                                        </td>
                                    </tr>

                                    {visibleReturnItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={COLUMN_COUNT} className="exchange-empty-state">
                                                Chưa có sản phẩm nào được chọn trả. Bỏ tích “Ẩn” để xem toàn bộ hóa đơn.
                                            </td>
                                        </tr>
                                    ) : visibleReturnItems.map((item, index) => (
                                        <tr
                                            key={item.salesOrderDetailId ?? item.productId}
                                            className={`exch-row exch-row--return${item.selected ? ' is-active' : ''}`}
                                        >
                                            <td className="exch-col-check">
                                                <input
                                                    type="checkbox"
                                                    className="exch-check"
                                                    checked={item.selected}
                                                    disabled={item.quantityReturnable === 0}
                                                    title={item.quantityReturnable === 0
                                                        ? 'Dòng này đã trả hết ở lần trước'
                                                        : 'Trả dòng này'}
                                                    onChange={() => handleToggleReturn(item.salesOrderDetailId)}
                                                />
                                            </td>
                                            <td>{index + 1}</td>
                                            <td className="font-bold product-code-cell">{item.productCode}</td>
                                            <td>{item.productName}</td>
                                            <td>{item.unitName}</td>
                                            <td className="text-center">
                                                {item.quantityPurchased}
                                                {item.quantityReturnable < item.quantityPurchased && (
                                                    <div className="qty-remaining-note">
                                                        còn trả được {item.quantityReturnable}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Chưa tích thì ba ô dưới đây không tồn tại — không có gì để nhập */}
                                            {item.selected ? (
                                                <>
                                                    <td>
                                                        <div className="qty-control">
                                                            <button className="qty-btn" onClick={() => handleReturnQtyChange(item.salesOrderDetailId, -1)}>-</button>
                                                            <input type="text" value={item.returnQty} readOnly className="qty-input" />
                                                            <button className="qty-btn" onClick={() => handleReturnQtyChange(item.salesOrderDetailId, 1)}>+</button>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <select
                                                            className="unit-select"
                                                            value={item.itemCondition}
                                                            onChange={(e) => handleConditionChange(item.salesOrderDetailId, e.target.value)}
                                                        >
                                                            <option value="">-- Chọn --</option>
                                                            {ITEM_CONDITIONS.map(c => (
                                                                <option key={c.value} value={c.value}>{c.label}</option>
                                                            ))}
                                                        </select>
                                                        {!item.productReturnable && (
                                                            <div className="condition-policy-note">
                                                                Sản phẩm không cho trả lại
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="exch-note-input"
                                                            placeholder="VD: cận date, bao bì móp..."
                                                            value={item.note}
                                                            maxLength={500}
                                                            onChange={(e) => handleNoteChange(item.salesOrderDetailId, e.target.value)}
                                                        />
                                                    </td>
                                                </>
                                            ) : (
                                                <td colSpan={3} className="exch-row-idle">Không đổi trả</td>
                                            )}

                                            <td className="text-right">{formatVnd(item.unitPrice)}</td>
                                            <td className="text-right font-bold exch-amount-out">
                                                {formatVnd(item.selected ? item.total : 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Phần 2: hàng khách LẤY ĐI (đổi sang món khác) */}
                        <div className="exch-table-scroll">
                            <table className="cart-table exch-table">
                                <ExchTableHead />
                                <tbody>
                                    <tr className="exch-group-row exch-group-row--new">
                                        <td colSpan={COLUMN_COUNT}>
                                            <ShoppingCart size={14} /> Thêm sản phẩm mới
                                        </td>
                                    </tr>

                                    {exchangeItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={COLUMN_COUNT} className="exchange-empty-state">
                                                Chưa có hàng nào. Bỏ trống nếu khách chỉ trả hàng lấy tiền.
                                            </td>
                                        </tr>
                                    ) : exchangeItems.map((item, index) => (
                                        <tr key={`${item.productId}-${index}`} className="exch-row exch-row--new">
                                            <td className="exch-col-check">
                                                <button
                                                    className="btn-delete"
                                                    title="Bỏ dòng này"
                                                    onClick={() => handleRemoveExchangeItem(index)}
                                                >
                                                    <Trash2 size={16} color="#ef4444" />
                                                </button>
                                            </td>
                                            <td>{index + 1}</td>
                                            <td className="font-bold product-code-cell">{item.productCode}</td>
                                            <td>{item.productName}</td>
                                            <td>
                                                {(item.units ?? []).length > 1 ? (
                                                    <select
                                                        className="unit-select"
                                                        value={item.productUnitId ?? ''}
                                                        onChange={(e) => handleExchangeUnitChange(index, e.target.value)}
                                                    >
                                                        {item.units.map((u) => (
                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    item.unitName
                                                )}
                                            </td>
                                            <td className="text-center exch-row-idle">—</td>
                                            <td>
                                                <div className="qty-control">
                                                    <button className="qty-btn" onClick={() => handleExchangeQtyChange(index, -1)}>-</button>
                                                    <input type="text" value={item.qty} readOnly className="qty-input" />
                                                    <button className="qty-btn" onClick={() => handleExchangeQtyChange(index, 1)}>+</button>
                                                </div>
                                            </td>
                                            <td colSpan={2} className="exch-row-idle">Hàng bán mới</td>
                                            <td className="text-right">{formatVnd(item.price)}</td>
                                            <td className="text-right font-bold exch-amount-in">
                                                {formatVnd(item.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {validationErrors.returnItems && (
                        <div className="exchange-section-error">
                            <AlertCircle size={14} className="inline-icon" />
                            {validationErrors.returnItems}
                        </div>
                    )}
                </div>

                {/* CỘT PHẢI: HÓA ĐƠN THƯỜNG  */}
                <div className="pos-payment-section">
                    <div className="payment-content">

                        {blockedReason && (
                            <section className="pos-panel-group">
                                <div className="exch-blocked-banner">
                                    <Ban size={18} />
                                    <div>
                                        <strong>{blockedReason.title}</strong>
                                        {blockedReason.detail}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/*Khách hàng*/}
                        <section className="pos-panel-group">
                            <div className="summary-row">
                                <span>Khách hàng</span>
                                <span className="font-bold">
                                    {originalOrder?.customer?.fullName || 'Khách lẻ'}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span>Hóa đơn gốc</span>
                                <span className="order-code-link">{originalOrder?.orderCode}</span>
                            </div>
                        </section>

                        {/* Tiền hàng  */}
                        <section className="pos-panel-group">
                            <div className="summary-row">
                                <span>Tiền hóa đơn gốc</span>
                                <span className="font-bold">
                                    {formatVnd(originalOrder?.totalAmount)}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span>Hàng trả lại</span>
                                <span className="font-bold exch-amount-out">
                                    {formatVnd(returnSubtotal)}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span>Hàng lấy mới</span>
                                <span className="font-bold exch-amount-in">
                                    {formatVnd(exchangeSubtotal)}
                                </span>
                            </div>

                            <div className={`exch-net-row exch-net-row--${direction}`}>
                                <span className="exch-net-label">
                                    {direction === 'refund' ? 'Hoàn tiền cho khách'
                                        : direction === 'collect' ? 'Khách thanh toán'
                                            : 'Không phát sinh tiền'}
                                </span>
                                <span className="exch-net-value">
                                    {formatVnd(direction === 'refund'
                                        ? settlement.cashRefund
                                        : settlement.totalCashIn)}
                                </span>

                                {settlement.debtRemainingBefore > 0 && (
                                    <span className="exch-net-debt">
                                        <span>Nợ còn lại của hóa đơn gốc</span>
                                        <span className="exch-net-debt-value">
                                            {formatVnd(settlement.debtRemainingAfter)}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </section>

                        <section className="pos-panel-group">
                            <div className="order-note">
                                <label className="order-note-label" htmlFor="exch-return-note">
                                    Ghi chú phiếu đổi/trả
                                </label>
                                <textarea
                                    id="exch-return-note"
                                    className="order-note-input"
                                    rows={2}
                                    maxLength={500}
                                    placeholder="Lý do đổi trả sản phẩm"
                                    value={returnNote}
                                    onChange={(e) => setReturnNote(e.target.value)}
                                    disabled={!!blockedReason}
                                />
                            </div>
                        </section>

                        {/* Thanh toán  */}
                        <section className="pos-panel-group pos-panel-group--last">
                            {/* <h3 className="pos-panel-group-title">
                                {direction === 'collect' ? 'Khách thanh toán' : 'Hoàn tiền cho khách'}
                            </h3> */}

                            {/* Không phát sinh tiền thì không hiện gì cả — dòng tiền ở
                                exch-net-row bên trên đã nói đúng điều đó rồi. */}
                            {settlement.hasCashMovement && (
                                <>
                                    <span className="payment-methods-title">
                                        {direction === 'collect' ? 'Hình thức thanh toán' : 'Hình thức hoàn tiền'}
                                    </span>
                                    <div className="methods-grid">
                                        <label className={`method-label ${refundMethod === 'cash' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                checked={refundMethod === 'cash'}
                                                onChange={() => setRefundMethod('cash')}
                                            />
                                            <span>Tiền mặt</span>
                                        </label>
                                        <label className={`method-label ${refundMethod === 'transfer' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                checked={refundMethod === 'transfer'}
                                                onChange={() => setRefundMethod('transfer')}
                                            />
                                            <span>Chuyển khoản</span>
                                        </label>
                                    </div>
                                </>
                            )}

                            {validationErrors.refundMethod && (
                                <div className="refund-method-error">
                                    {validationErrors.refundMethod}
                                </div>
                            )}
                        </section>

                        {submitError && (
                            <div className="exchange-submit-error">
                                <AlertCircle size={16} />
                                {submitError}
                            </div>
                        )}

                    </div>

                    <div className="payment-footer">
                        <button
                            className="btn-checkout"
                            onClick={handleSubmit}
                            disabled={submitting || !!blockedReason}
                            title={blockedReason ? blockedReason.title : undefined}
                        >
                            {submitting ? 'ĐANG XỬ LÝ...'
                                : blockedReason ? 'KHÔNG THỂ ĐỔI TRẢ'
                                    : isExchange ? 'ĐỔI HÀNG' : 'TRẢ HÀNG'}
                        </button>
                    </div>
                </div>
            </div>

            {submitResult && (
                <div className="batch-modal-overlay">
                    <div className="batch-modal exch-result-modal">
                        <div className="batch-modal-header">
                            <div>
                                <div className="batch-modal-title">
                                    {submitResult.isExchange ? 'Đổi hàng thành công' : 'Trả hàng thành công'}
                                </div>
                                <div className="batch-modal-subtitle">
                                    Mã phiếu: {submitResult.returnCode}
                                </div>
                            </div>
                        </div>

                        <div className="exch-result-body">
                            <div className={`exch-net-row exch-net-row--${submitResult.direction}`}>
                                <span className="exch-net-label">
                                    {submitResult.direction === 'refund' ? 'Tiền hoàn cho khách'
                                        : submitResult.direction === 'collect' ? 'Khách cần thanh toán thêm'
                                            : 'Không phát sinh tiền'}
                                </span>
                                <span className="exch-net-value">
                                    {formatVnd(submitResult.direction === 'refund'
                                        ? submitResult.cashRefundAmount
                                        : submitResult.cashCollectAmount + submitResult.debtPaymentCollected)}
                                </span>
                            </div>

                            {submitResult.isDebtOrder && (
                                <div className="exch-debt-panel">
                                    {submitResult.debtOffsetAmount > 0 && (
                                        <div className="exch-debt-row exch-debt-row--offset">
                                            <span>Đã cấn trừ công nợ</span>
                                            <span className="exch-debt-value">
                                                {formatVnd(submitResult.debtOffsetAmount)}
                                            </span>
                                        </div>
                                    )}
                                    {submitResult.debtPaymentCollected > 0 && (
                                        <div className="exch-debt-row exch-debt-row--offset">
                                            <span>Khách trả thêm nợ cũ</span>
                                            <span className="exch-debt-value">
                                                {formatVnd(submitResult.debtPaymentCollected)}
                                            </span>
                                        </div>
                                    )}
                                    {submitResult.newDebtOnExchange > 0 && (
                                        <div className="exch-debt-row exch-debt-row--new-debt">
                                            <span>
                                                Ghi nợ trên đơn đổi
                                                {submitResult.exchangeOrderCode
                                                    ? ` ${submitResult.exchangeOrderCode}`
                                                    : ''}
                                            </span>
                                            <span className="exch-debt-value">
                                                {formatVnd(submitResult.newDebtOnExchange)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="exch-debt-row exch-debt-row--total">
                                        <span>Nợ còn lại của hóa đơn gốc</span>
                                        <span className="exch-debt-value">
                                            {formatVnd(submitResult.debtRemainingAfter)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="receipt-actions">
                            <button
                                className="btn-checkout"
                                onClick={handlePrintResult}
                                disabled={printing}
                            >
                                <Printer size={18} style={{ marginRight: 8 }} />
                                {printing ? 'Đang chuẩn bị...' : 'In phiếu đổi trả'}
                            </button>
                            <button className="receipt-close-btn" onClick={handleCloseResult}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
