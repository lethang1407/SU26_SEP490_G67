import { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Search,
    Home,
    Trash2,
    AlertCircle,
    CornerUpLeft,
    ShoppingCart,
    Ban,
    QrCode,
    WifiOff
} from "lucide-react";
import "../../../css/POS.css";
import "../../../css/ExchangeOrder.css";
import ExchangeOrderPicker from '../components/ExchangeOrderPicker';
import LocationPicker from '../components/LocationPicker';
import TransferQrPanel from '../components/TransferQrPanel';
import { useStorePaymentInfo } from '../hooks/useStorePaymentInfo';
import { buildPaymentReference } from '../utils/vietqr';
import { getOrderForExchange, processExchangeOrder, searchProductsByName, getInvoiceData, getProductPosInfo } from "../api";
import {
    hasLocationProblem, toStockPicks, withPickQty, withTotalQty, withFifoPicks,
} from '../utils/cartLocation';
import {
    displayStock, hasNoSellableLocation, isUnsellable, UNSELLABLE_HINT, unsellableMessage,
} from '../utils/productStock';
import { isValidQtyInput, isValidQtyValue, isQtyInvalid, parseQty } from '../utils/validation';
import { printInvoice } from '../utils/printInvoice';
import { getApiErrorMessage } from "../../../utils/api-utils";
import { formatVnd } from "../utils/money";
import { previewSettlement, refundForQty } from "../utils/exchangeSettlement";
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { enqueueOfflineOrder, getOfflineSalesOrder, saveOfflineSalesOrder, searchOfflineProducts } from '@/lib/db';
import { showOfflineToast } from './OfflineToast';

function generateOfflineExchangeCode() {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = Math.floor(100000 + Math.random() * 900000);
    return `DTO${datePart}_${randPart}`;
}

function buildExchangeDataFromCache(cached) {
    if (!cached) return null;
    const createdAt = cached.createdAt ? new Date(cached.createdAt) : new Date();
    // 7 days return policy
    const deadline = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const isExpired = now > deadline;

    return {
        orderId: cached.id,
        orderCode: cached.orderCode,
        totalAmount: cached.totalAmount ?? 0,
        paymentMethod: cached.paymentMethod || 'CASH',
        orderStatus: cached.orderStatus || 'COMPLETED',
        createdAt: cached.createdAt,
        customer: cached.customer ? {
            id: cached.customer.id,
            fullName: cached.customer.fullName || cached.customer.name,
            phoneNumber: cached.customer.phoneNumber || cached.customer.phone
        } : null,
        items: (cached.items || []).map((item, idx) => ({
            salesOrderDetailId: item.salesOrderDetailId ?? (item.id || idx + 1),
            productId: item.productId,
            productCode: item.productCode || '',
            productName: item.productName || item.name || '',
            unitName: item.unitName || '',
            quantityPurchased: item.quantityPurchased ?? item.quantity ?? 1,
            quantityReturned: item.quantityReturned ?? 0,
            quantityReturnable: item.quantityReturnable ?? ((item.quantityPurchased ?? item.quantity ?? 1) - (item.quantityReturned ?? 0)),
            productReturnable: item.productReturnable ?? true,
            unitPrice: item.unitPrice ?? 0,
            lineTotal: item.lineTotal ?? ((item.unitPrice ?? 0) * (item.quantityPurchased ?? item.quantity ?? 1))
        })),
        isDebt: Boolean(cached.isDebt),
        dueDate: cached.dueDate || null,
        paidAmount: cached.paidAmount ?? 0,
        debtRemaining: cached.debtRemaining ?? 0,
        debtOverdue: cached.dueDate ? (new Date(cached.dueDate) < now && (cached.debtRemaining > 0)) : false,
        returnWindowExpired: isExpired,
        returnDeadline: deadline.toISOString(),
        isOfflineCached: true
    };
}


/** Tiền hoàn của một dòng trả, đã trừ phần giảm giá hóa đơn phân bổ cho dòng đó. */
const returnLineRefund = (item, qty) => refundForQty({
    netLineTotal: item.netLineTotal,
    quantityPurchased: item.quantityPurchased,
    alreadyReturned: item.quantityReturned,
    qty,
});

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

/** Bang hang ban moi dung dung bo cot cua gio hang POS. */
const NEW_COLUMN_COUNT = 8;

const ExchNewTableHead = () => (
    <>
        <thead>
            <tr>
                <th className="col-stt">STT</th>
                <th>MÃ SẢN PHẨM</th>
                <th>TÊN SẢN PHẨM</th>
                <th>ĐVT</th>
                <th>VỊ TRÍ</th>
                <th className="text-center">SỐ LƯỢNG</th>
                <th className="text-right">ĐƠN GIÁ</th>
                <th className="text-right">THÀNH TIỀN</th>
            </tr>
        </thead>
    </>
);

export default function ExchangeOrder({ orderId: orderIdProp, embedded = false, onDone, onDirtyChange, ref }) {
    const { isOnline } = useOnlineStatus();
    const params = useParams();
    const orderId = orderIdProp ?? params.orderId;
    const navigate = useNavigate();
    const [originalOrder, setOriginalOrder] = useState(null);
    const [loading, setLoading] = useState(!!orderId);
    const [error, setError] = useState(null);
    const [returnItems, setReturnItems] = useState([]);
    const [exchangeItems, setExchangeItems] = useState([]);
    // Ô số lượng đang gõ dở, key theo productId (mỗi sản phẩm một dòng)
    const [exchangeQtyInputs, setExchangeQtyInputs] = useState({});
    const [posInfoError, setPosInfoError] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [hideUnchanged, setHideUnchanged] = useState(false);
    const [refundMethod, setRefundMethod] = useState('cash');
    const [returnNote, setReturnNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const [validationErrors, setValidationErrors] = useState({});
    const [transferReference] = useState(buildPaymentReference);

    // Load original order data
    useEffect(() => {
        const loadOrder = async () => {
            try {
                setLoading(true);
                setError(null);
                const isOffline = !isOnline || (typeof window !== 'undefined' && !window.navigator.onLine);

                if (isOffline) {
                    const cached = await getOfflineSalesOrder(orderId);
                    if (cached) {
                        const exchangeData = cached.exchangeDetail || buildExchangeDataFromCache(cached);
                        setOriginalOrder(exchangeData);
                        const initialReturnItems = (exchangeData.items || []).map(item => ({
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
                        return;
                    }
                }

                const data = await getOrderForExchange(orderId);
                setOriginalOrder(data);
                await saveOfflineSalesOrder({
                    ...data,
                    exchangeDetail: data,
                    items: data.items || []
                });

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
                    // Giá trị dòng sau khi phân bổ giảm giá hóa đơn — tiền hoàn tính trên số này
                    netLineTotal: item.netLineTotal ?? item.lineTotal ?? item.unitPrice * item.quantityPurchased,
                    total: 0
                }));
                setReturnItems(initialReturnItems);
            } catch (err) {
                console.error("Failed to fetch order for exchange:", err);
                // Fallback to offline Dexie cache if network failed
                try {
                    const cached = await getOfflineSalesOrder(orderId);
                    if (cached) {
                        const exchangeData = cached.exchangeDetail || buildExchangeDataFromCache(cached);
                        setOriginalOrder(exchangeData);
                        const initialReturnItems = (exchangeData.items || []).map(item => ({
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
                        return;
                    }
                } catch (cacheErr) {
                    console.warn("[ExchangeOrder] Failed to load order from offline cache:", cacheErr);
                }
                setError(getApiErrorMessage(err, 'Không thể tải thông tin đơn hàng'));
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            loadOrder();
        }
    }, [orderId, isOnline]);

    // Search products
    useEffect(() => {
        const searchProducts = async () => {
            if (searchInput.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            try {
                setSearchLoading(true);
                const isOffline = !isOnline || (typeof window !== 'undefined' && !window.navigator.onLine);
                if (isOffline) {
                    const offlineResults = await searchOfflineProducts(searchInput);
                    setSearchResults(offlineResults.map(p => ({
                        id: p.id,
                        name: p.name,
                        sellingPrice: p.price,
                        stockQuantity: p.stockQuantity,
                        baseUnit: p.unit,
                        units: p.units || [],
                        locations: p.locations || []
                    })));
                    return;
                }

                const results = await searchProductsByName(searchInput);
                setSearchResults(results);
            } catch (err) {
                // Fallback to offline search on network error
                try {
                    const offlineResults = await searchOfflineProducts(searchInput);
                    setSearchResults(offlineResults.map(p => ({
                        id: p.id,
                        name: p.name,
                        sellingPrice: p.price,
                        stockQuantity: p.stockQuantity,
                        baseUnit: p.unit,
                        units: p.units || [],
                        locations: p.locations || []
                    })));
                    return;
                } catch (offlineSearchErr) {
                    console.warn("[ExchangeOrder] Offline search fallback failed:", offlineSearchErr);
                }
                console.error('Search error:', err);
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        };

        const debounce = setTimeout(searchProducts, 300);
        return () => clearTimeout(debounce);
    }, [searchInput, isOnline]);

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
            return { ...item, selected: true, returnQty: qty, total: returnLineRefund(item, qty) };
        }));
        setValidationErrors(prev => ({ ...prev, returnItems: null }));
    }, []);

    const handleReturnQtyChange = useCallback((salesOrderDetailId, delta) => {
        setReturnItems(prev => prev.map(item => {
            if (item.salesOrderDetailId === salesOrderDetailId) {
                // Không bao giờ vượt quá số lượng đã mua (trừ phần đã trả ở lần trước)
                const newQty = Math.max(1, Math.min(item.quantityReturnable, item.returnQty + delta));
                return { ...item, returnQty: newQty, total: returnLineRefund(item, newQty) };
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

    const handleExchangeQtyInput = useCallback((productId, raw) => {
        if (!isValidQtyInput(raw)) return;
        setExchangeQtyInputs(prev => ({ ...prev, [productId]: raw }));
    }, []);

    const handleExchangeQtyBlur = useCallback((productId) => {
        setExchangeQtyInputs(prev => {
            const raw = prev[productId];
            if (isValidQtyValue(raw)) {
                const qty = parseQty(raw);
                setExchangeItems(items => items.map(item => item.productId === productId
                    ? { ...withTotalQty(item, qty), total: qty * item.price }
                    : item));
            }
            const next = { ...prev };
            delete next[productId];
            return next;
        });
    }, []);

    const handleExchangePickQty = useCallback((productId, key, qty) => {
        setExchangeItems(prev => prev.map(item => {
            if (item.productId !== productId) return item;
            const next = withPickQty(item, key, qty);
            return { ...next, total: next.qty * item.price };
        }));
        setValidationErrors(prev => ({ ...prev, exchangeItems: null }));
    }, []);

    const handleExchangeUnitChange = useCallback((index, productUnitId) => {
        setExchangeItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const selectedUnit = (item.units ?? []).find(
                (u) => String(u.id) === String(productUnitId)
            );
            if (!selectedUnit) return item;
            const newPrice = selectedUnit.sellingPrice ?? item.price;
            return withFifoPicks({
                ...item,
                productUnitId: selectedUnit.id,
                unitName: selectedUnit.name,
                price: newPrice,
                total: item.qty * newPrice
            });
        }));
    }, []);

    // Thêm hàng khách lấy đi
    const handleAddExchangeProduct = useCallback(async (product) => {
        const existingIndex = exchangeItems.findIndex(item => item.productId === product.id);

        if (existingIndex >= 0) {
            setExchangeItems(prev => prev.map((item, i) => {
                if (i === existingIndex) {
                    const newQty = item.qty + 1;
                    return { ...withTotalQty(item, newQty), total: newQty * item.price };
                }
                return item;
            }));
        } else {
            // Vị trí + lô lấy từ api pos-info, giống giỏ hàng POS
            let posInfo;
            try {
                posInfo = await getProductPosInfo(product.id);
                setPosInfoError(null);
            } catch (error) {
                console.error("Failed to fetch product POS info:", error);
                if (!isOnline || (typeof window !== 'undefined' && !window.navigator.onLine)) {
                    posInfo = {
                        locations: product.locations || [],
                        units: product.units || [],
                        batches: product.batches || [],
                        availableQuantity: product.stockQuantity ?? 0
                    };
                } else {
                    setPosInfoError(`Không tải được vị trí để hàng của "${product.name}". Vui lòng thử lại.`);
                    return;
                }
            }

            // Giống giỏ POS: chưa xếp vị trí thì không lấy đi được, chặn ngay ở đây.
            if (hasNoSellableLocation(posInfo)) {
                setPosInfoError(unsellableMessage(product.name, posInfo));
                return;
            }

            const units = product.productUnits ?? [];
            const defaultUnit = units.find((u) => u.isDefault)
                ?? units.find((u) => Number(u.unitBase) === 1)
                ?? units[0];
            const price = defaultUnit?.sellingPrice ?? product.sellingPrice ?? 0;

            const locations = (posInfo?.locations ?? []).filter((loc) => Number(loc.quantity ?? 0) > 0);

            const newItem = withFifoPicks({
                productId: product.id,
                productCode: product.barcode || `SP${String(product.id).padStart(6, '0')}`,
                productName: product.name,
                units,
                unitName: defaultUnit?.name || 'Cái',
                qty: 1,
                price,
                total: price,
                locations,
                stockTotal: posInfo?.availableQuantity ?? null,
                stockSales: posInfo?.salesZoneQuantity ?? null,
                stockWarehouse: posInfo?.warehouseQuantity ?? null,
                productUnitId: defaultUnit?.id ?? null
            });
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
        setExchangeItems(prev => {
            const removed = prev[index];
            if (removed) {
                setExchangeQtyInputs(inputs => {
                    const next = { ...inputs };
                    delete next[removed.productId];
                    return next;
                });
            }
            return prev.filter((_, i) => i !== index);
        });
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
                ? `Hạn đổi trả của hóa đơn này là hết ngày ${formatVnDate(originalOrder.returnDeadline)}. lâu thì không đổi/trả được, kể cả hàng hỏng hay hết hạn.`
                : 'lâu thì không đổi/trả được, kể cả hàng hỏng hay hết hạn.',
        }
        : originalOrder?.debtOverdue
            ? {
                title: 'Đơn nợ đã lâu trả',
                detail: `Hóa đơn này còn nợ ${formatVnd(originalOrder.debtRemaining)} và đã lâu ${formatVnDate(originalOrder.dueDate)}. Khách cần thanh toán hết nợ trước, sau đó mới xử lý đổi/trả.`,
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

        if (isOnline && exchangeItems.some(hasLocationProblem)) {
            errors.exchangeItems = 'Số lượng nhập ở một vị trí vượt quá tồn tại vị trí đó.';
        }

        if (settlement.hasCashMovement && !refundMethod) {
            errors.refundMethod = direction === 'collect'
                ? 'Vui lòng chọn hình thức thanh toán'
                : 'Vui lòng chọn hình thức hoàn tiền';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (paymentReference) => {
        if (!validateForm()) {
            return { ok: false, error: null };
        }

        const buildExchangeReceipt = (code) => ({
            returnCode: code,
            direction,
            isExchange,
            netAmount,
            returnSubtotal,
            exchangeSubtotal,
            refundMethod: refundMethod.toUpperCase(),
            isDebtOrder: !!originalOrder?.isDebt,
            debtOffsetAmount: settlement?.debtOffsetAmount ?? 0,
            exchangeCreditAmount: settlement?.exchangeCreditAmount ?? 0,
            cashRefundAmount: settlement?.cashRefundAmount ?? 0,
            cashCollectAmount: settlement?.cashCollectAmount ?? 0,
            newDebtOnExchange: settlement?.newDebtOnExchange ?? 0,
            debtPaymentCollected: 0,
            debtRemainingAfter: 0,
            exchangeOrderCode: code,
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
                // Rỗng = BE trừ FIFO toàn kho, giống giỏ hàng POS
                picks: toStockPicks(item),
                productUnitId: item.productUnitId || null,
                quantity: item.qty,
                unitPrice: item.price,
                discountAmount: 0
            })),
            returnNote: returnNote.trim() || null,
            refundMethod: refundMethod.toUpperCase(),
            // Chuyen khoan: noi dung da in tren ma QR, de doi soat voi sao ke.
            ...(paymentReference ? { paymentReference } : {}),
            returnDiscount: 0,
            exchangeDiscount: 0,
            debtPaymentAmount: null
        };

        const isOfflineMode = !isOnline || (typeof window !== 'undefined' && !window.navigator.onLine);
        if (isOfflineMode) {
            try {
                setSubmitting(true);
                setSubmitError(null);
                const offlineCode = generateOfflineExchangeCode();
                const offlineUuid = `off-exch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const receipt = buildExchangeReceipt(offlineCode);

                const snapshot = {
                    id: offlineUuid,
                    orderCode: offlineCode,
                    originalOrderId: orderId,
                    originalOrderCode: originalOrder?.orderCode || String(orderId),
                    isOffline: true,
                    totalAmount: Math.abs(netAmount),
                    refundMethod: refundMethod.toUpperCase(),
                    direction,
                    isExchange,
                    note: returnNote.trim() || '',
                    createdAt: new Date().toISOString(),
                    customer: originalOrder?.customer ? {
                        id: originalOrder.customer.id,
                        fullName: originalOrder.customer.fullName || originalOrder.customer.name,
                        phoneNumber: originalOrder.customer.phoneNumber || originalOrder.customer.phone
                    } : null,
                    returnLines: receipt.returnLines,
                    exchangeLines: receipt.exchangeLines
                };

                await enqueueOfflineOrder({
                    clientUuid: offlineUuid,
                    type: 'EXCHANGE',
                    payload,
                    orderSnapshot: snapshot,
                    customer: originalOrder?.customer || null
                });

                showOfflineToast();
                await printExchangeReceipt(receipt);
                finishExchange();
                return { ok: true, isOffline: true };
            } catch (err) {
                console.error('[OfflineQueue] Failed to enqueue exchange order:', err);
                setSubmitError('Không thể lưu phiếu đổi trả ngoại tuyến');
                return { ok: false, error: 'Không thể lưu phiếu đổi trả ngoại tuyến' };
            } finally {
                setSubmitting(false);
            }
        }

        try {
            setSubmitting(true);
            setSubmitError(null);

            const processed = await processExchangeOrder(payload);
            const receipt = {
                returnCode: processed.returnCode,
                direction,
                isExchange,
                netAmount,
                returnSubtotal,
                exchangeSubtotal,
                refundMethod: refundMethod.toUpperCase(),
                isDebtOrder: !!processed.originalIsDebt,
                debtOffsetAmount: processed.debtOffsetAmount ?? 0,
                exchangeCreditAmount: processed.exchangeCreditAmount ?? 0,
                cashRefundAmount: processed.cashRefundAmount ?? 0,
                cashCollectAmount: processed.cashCollectAmount ?? 0,
                newDebtOnExchange: processed.newDebtOnExchange ?? 0,
                debtPaymentCollected: processed.debtPaymentCollected ?? 0,
                debtRemainingAfter: processed.debtRemainingAfter ?? 0,
                exchangeOrderCode: processed.exchangeOrderCode ?? null,
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
            };
            await printExchangeReceipt(receipt);
            finishExchange();
            return { ok: true };
        } catch (err) {
            console.error("Exchange order submission failed:", err);
            const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || err.message?.toLowerCase().includes('network');
            if (isNetworkError) {
                try {
                    const offlineCode = generateOfflineExchangeCode();
                    const offlineUuid = `off-exch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                    const receipt = buildExchangeReceipt(offlineCode);

                    const snapshot = {
                        id: offlineUuid,
                        orderCode: offlineCode,
                        originalOrderId: orderId,
                        originalOrderCode: originalOrder?.orderCode || String(orderId),
                        isOffline: true,
                        totalAmount: Math.abs(netAmount),
                        refundMethod: refundMethod.toUpperCase(),
                        direction,
                        isExchange,
                        note: returnNote.trim() || '',
                        createdAt: new Date().toISOString(),
                        customer: originalOrder?.customer ? {
                            id: originalOrder.customer.id,
                            fullName: originalOrder.customer.fullName || originalOrder.customer.name,
                            phoneNumber: originalOrder.customer.phoneNumber || originalOrder.customer.phone
                        } : null,
                        returnLines: receipt.returnLines,
                        exchangeLines: receipt.exchangeLines
                    };

                    await enqueueOfflineOrder({
                        clientUuid: offlineUuid,
                        type: 'EXCHANGE',
                        payload,
                        orderSnapshot: snapshot,
                        customer: originalOrder?.customer || null
                    });

                    showOfflineToast();
                    await printExchangeReceipt(receipt);
                    finishExchange();
                    return { ok: true, isOffline: true };
                } catch (queueErr) {
                    console.error('[OfflineQueue] Failed to enqueue exchange order:', queueErr);
                }
            }

            const message = getApiErrorMessage(err, 'Không thể xử lý đổi trả hàng');
            setSubmitError(message);
            return { ok: false, error: message };
        } finally {
            setSubmitting(false);
        }
    };

    // Chuyển khoản cho phần tiền khách phải bù thêm
    const isTransferCollect = settlement.hasCashMovement
        && direction === 'collect'
        && refundMethod === 'transfer';

    const transferBlockedReason = !isTransferCollect ? null
        : blockedReason ? blockedReason.title
            : selectedItems.length === 0
                ? 'Chưa chọn dòng nào để trả. Tích vào ô "Trả" ở dòng hàng khách mang về.'
                : exchangeItems.length === 0
                    ? 'Chưa có hàng lấy mới nên không có số tiền nào để thu.'
                    : exchangeItems.some(hasLocationProblem)
                        ? 'Có vị trí nhập vượt tồn.'
                        : settlement.totalCashIn <= 0
                            ? 'Đơn đổi trả chưa có số tiền cần thu.'
                            : null;

    const { bank, loading: bankLoading, error: bankError } = useStorePaymentInfo();

    const handleFooterAction = async () => {
        await handleSubmit(isTransferCollect ? transferReference : null);
    };

    /** Ghi sổ + in xong là rời màn đổi trả. */
    const finishExchange = () => {
        if (embedded) {
            onDone?.();
        } else {
            navigate('/admin/pos');
        }
    };

    /**
     * Dựng phiếu đổi trả và đẩy thẳng ra máy in.
     */
    const printExchangeReceipt = async (result) => {
        if (!result) return;
        {
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
            } catch (error) {
                console.error("Failed to fetch store info for exchange receipt:", error);
            }

            printInvoice({
                ...head,
                kind: 'EXCHANGE',
                orderCode: result.returnCode,
                originalOrderCode: originalOrder?.orderCode,
                createdAtVn: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
                customer: originalOrder?.customer ?? null,
                refundMethod: result.refundMethod,
                returnItems: result.returnLines,
                exchangeItems: result.exchangeLines,
                returnSubtotal: result.returnSubtotal,
                exchangeSubtotal: result.exchangeSubtotal,
                netAmount: result.netAmount,
                isDebtOrder: result.isDebtOrder,
                debtOffsetAmount: result.debtOffsetAmount,
                cashRefundAmount: result.cashRefundAmount,
                cashCollectAmount: result.cashCollectAmount,
                debtPaymentCollected: result.debtPaymentCollected,
                newDebtOnExchange: result.newDebtOnExchange,
                debtRemainingAfter: result.debtRemainingAfter,
                exchangeOrderCode: result.exchangeOrderCode,
            });
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
                        searchResults.map(product => {
                            const blocked = isUnsellable(product);
                            const stock = displayStock(product);
                            return (
                                <div
                                    key={product.id}
                                    className={`exchange-dropdown-item${blocked ? ' psd-item--blocked' : ''}`}
                                    title={blocked ? UNSELLABLE_HINT : undefined}
                                    onClick={() => {
                                        if (blocked) return;
                                        handleAddExchangeProduct(product);
                                    }}
                                >
                                    <div className="exchange-dropdown-item-name">{product.name}</div>
                                    <div className="exchange-dropdown-item-price">
                                        Giá: {formatVnd(product.sellingPrice)}
                                        <span className={`psd-stock${stock <= 0 ? ' psd-stock--empty' : ''}`}>
                                            Tồn kho: {stock.toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
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

            {(!isOnline || originalOrder?.isOfflineCached) && (
                <div style={{
                    backgroundColor: '#fffbeb',
                    borderBottom: '1px solid #fde68a',
                    color: '#92400e',
                    padding: '8px 16px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 500
                }}>
                    <WifiOff size={15} style={{ flexShrink: 0 }} />
                    <span>
                        Chế độ ngoại tuyến: Đang tra cứu đơn hàng từ bộ nhớ đệm (lưu tối đa 7 ngày). Phiếu đổi trả sẽ được lưu vào hàng đợi và tự động đồng bộ khi có Internet.
                    </span>
                </div>
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

                                            {/* kiểm tra đã có vị trí của lô hàng trong kho hay không */}
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
                                                            <option value=""> Chọn </option>
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
                            <table className="cart-table exch-table exch-new-table">
                                <ExchNewTableHead />
                                <tbody>
                                    <tr className="exch-group-row exch-group-row--new">
                                        <td colSpan={NEW_COLUMN_COUNT}>
                                            <ShoppingCart size={14} /> Thêm sản phẩm mới
                                        </td>
                                    </tr>

                                    {exchangeItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={NEW_COLUMN_COUNT} className="exchange-empty-state">
                                                Chưa có hàng nào. Bỏ trống nếu khách chỉ trả hàng lấy tiền.
                                            </td>
                                        </tr>
                                    ) : exchangeItems.map((item, index) => (
                                        <tr key={`${item.productId}-${index}`} className="exch-row exch-row--new">
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {index + 1}
                                                    <button
                                                        className="btn-delete"
                                                        title="Bỏ dòng này"
                                                        onClick={() => handleRemoveExchangeItem(index)}
                                                    >
                                                        <Trash2 size={18} color="#ef4444" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="font-bold product-code-cell">{item.productCode}</td>
                                            <td>
                                                <div>{item.productName}</div>
                                                {item.stockTotal != null && (
                                                    <div
                                                        className="cart-stock-line"
                                                        title={`Tồn bán được: ${Number(item.stockTotal).toLocaleString('vi-VN')}`}
                                                    >
                                                        Tồn kho: {Number(item.stockTotal).toLocaleString('vi-VN')}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {(item.units ?? []).length > 1 ? (
                                                    <select
                                                        className="unit-select"
                                                        value={item.productUnitId ?? ''}
                                                        onChange={(e) => handleExchangeUnitChange(index, e.target.value)}
                                                    >
                                                        {item.units.map((u) => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    item.unitName
                                                )}
                                            </td>
                                            <td>
                                                <LocationPicker
                                                    item={item}
                                                    onPickQtyChange={(key, qty) => handleExchangePickQty(item.productId, key, qty)}
                                                />
                                            </td>
                                            <td>
                                                <div className="qty-control qty-control--underline">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={exchangeQtyInputs[item.productId] ?? item.qty}
                                                        onChange={(e) => handleExchangeQtyInput(item.productId, e.target.value)}
                                                        onBlur={() => handleExchangeQtyBlur(item.productId)}
                                                        className={`qty-input qty-input--underline${isQtyInvalid(exchangeQtyInputs[item.productId]) ? ' qty-input-error' : ''}`}
                                                        title={isQtyInvalid(exchangeQtyInputs[item.productId]) ? 'Số lượng phải lớn hơn 0' : ''}
                                                    />
                                                </div>
                                                {isQtyInvalid(exchangeQtyInputs[item.productId]) && (
                                                    <div className="qty-error-msg">Phải là số &gt; 0</div>
                                                )}
                                            </td>
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

                    {validationErrors.exchangeItems && (
                        <div className="exchange-section-error">
                            <AlertCircle size={14} className="inline-icon" />
                            {validationErrors.exchangeItems}
                        </div>
                    )}

                    {posInfoError && (
                        <div className="exchange-section-error">
                            <AlertCircle size={14} className="inline-icon" />
                            {posInfoError}
                        </div>
                    )}
                </div>

                {/* CỘT PHẢI: Payment  */}
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

                        {/* Tiền hàng  */}
                        <section className="pos-panel-group">
                            <div className="summary-row">
                                <span>Tiền hóa đơn gốc</span>
                                <span className="font-bold">
                                    {formatVnd(originalOrder?.totalAmount)}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span>Tiền hàng trả lại</span>
                                <span className="font-bold exch-amount-out">
                                    {formatVnd(returnSubtotal)}
                                </span>
                            </div>
                            <div className="summary-row">
                                <span>Tiền hàng lấy mới</span>
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

                                    {/* Mã QR cho phần tiền khách bù thêm, giống khung chuyển khoản ở POS */}
                                    {isTransferCollect && (
                                        <TransferQrPanel
                                            bank={bank}
                                            bankLoading={bankLoading}
                                            bankError={bankError}
                                            amount={settlement.totalCashIn}
                                            reference={transferReference}
                                            blockedReason={transferBlockedReason}
                                        />
                                    )}
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
                            onClick={handleFooterAction}
                            disabled={submitting || !!blockedReason}
                            title={blockedReason ? blockedReason.title : undefined}
                        >
                            {isTransferCollect && !submitting && <QrCode size={16} />}
                            {submitting ? 'ĐANG XỬ LÝ...'
                                : blockedReason ? 'KHÔNG THỂ ĐỔI TRẢ'
                                    : (isExchange ? 'ĐỔI HÀNG' : 'TRẢ HÀNG')}
                        </button>
                    </div>
                </div>
            </div>

        </>
    );
}
