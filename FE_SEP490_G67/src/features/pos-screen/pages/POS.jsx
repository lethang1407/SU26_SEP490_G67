import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Search, X,
    RefreshCcw,
    History,
    RotateCcw,
    ClipboardList,
    Trash2,
    Pencil,
    Plus,
    AlertCircle,
    Lock,
    QrCode,
    WifiOff
} from "lucide-react";
import "../../../css/POS.css";
import { isValidQtyInput, isValidQtyValue, isQtyInvalid, parseQty } from '../utils/validation';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useCheckout } from '../hooks/useCheckout';
import { useStorePaymentInfo } from '../hooks/useStorePaymentInfo';
import { useProductSearch } from '../hooks/useProductSearch';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { hasLocationProblem, withPickQty, withTotalQty, withFifoPicks } from '../utils/cartLocation';
import { hasNoSellableLocation, unsellableMessage } from '../utils/productStock';
import {
    debtLevelMeta, canSellOnDebt, debtSummaryText, debtBlockReason, formatMoney,
    isOverdueCustomer, debtOverdueWarning,
} from '../utils/debtStatus';
import { formatVnd } from '../utils/money';
import LocationPicker from '../components/LocationPicker';
import ProductThumb from '../components/ProductThumb';
import CustomerSearchDropdown from '../components/CustomerSearchDropdown';
import QuickAddCustomerModal from '../components/QuickAddCustomerModal';
import SalesOrderHistoryModal from '../components/SalesOrderHistoryModal';
import CustomerDebtModal from '../components/CustomerDebtModal';
import ExchangeOrder from '../components/ExchangeOrder';
import TransferQrPanel from '../components/TransferQrPanel';
import OfflineOrdersModal from '../components/OfflineOrdersModal';
import OfflineToast, { showOfflineToast } from '../components/OfflineToast';
import PosHeaderMenu, { PosHeaderLeft } from '../components/PosHeaderMenu';
import { buildPaymentReference } from '../utils/vietqr';
import { saveActiveCart, loadActiveCart } from '../utils/cartStorage';
import { printInvoice } from '../utils/printInvoice';
import { createQuickCustomer, getProductPosInfo, getInvoiceData } from '../api';
import { getApiErrorMessage } from '../../../utils/api-utils';

const MAX_TABS = 10;

// Hằng số dùng chung cho tab không có giỏ
const EMPTY_CART = [];
const EMPTY_QTY_INPUTS = {};

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'transfer', label: 'Chuyển khoản' },
    { value: 'debt', label: 'Ghi nợ' },
];

/** Hạn trả nợ mặc định: 45 ngày kể từ hôm nay, dạng yyyy-MM-dd cho input date. */
const DEFAULT_DEBT_DAYS = 45;
function toDateInput(date) {
    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}
function defaultDueDate() {
    const d = new Date();
    d.setDate(d.getDate() + DEFAULT_DEBT_DAYS);
    return toDateInput(d);
}

let _tabCounter = 1;
function nextTabId() { return ++_tabCounter; }

function createTab(id = 1) {
    return {
        id,
        type: 'SALE',
        cartItems: [],
        qtyInputs: {},
        paymentMethod: 'cash',
        note: '',
        transferReference: buildPaymentReference(),
    };
}

function createReturnTab(id, orderId) {
    return { id, type: 'RETURN', orderId: String(orderId) };
}

const POSScreen = () => {
    const [searchParams] = useSearchParams();

    const { isOnline, toggleOffline } = useOnlineStatus();
    const {
        queue: offlineQueue,
        pendingCount: offlinePendingCount,
        isSyncing: isOfflineSyncing,
        syncNow: handleOfflineSyncNow,
        removeQueueItem: handleRemoveOfflineItem,
        clearSynced: handleClearSyncedOffline
    } = useOfflineSync();
    const [showOfflineModal, setShowOfflineModal] = useState(false);

    const [tabs, setTabs] = useState(() => {
        const saved = loadActiveCart();
        const saleTab = saved ? { ...createTab(1), ...saved } : createTab(1);
        const returnOrderId = searchParams.get('return');
        return returnOrderId
            ? [saleTab, createReturnTab(nextTabId(), returnOrderId)]
            : [saleTab];
    });
    const [activeTabId, setActiveTabId] = useState(() => tabs[tabs.length - 1].id);

    const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
    const isReturnTab = activeTab.type === 'RETURN';

    const tabLabels = useMemo(() => {
        let sale = 0;
        let ret = 0;
        return Object.fromEntries(tabs.map(t => [
            t.id,
            t.type === 'RETURN' ? `Trả hàng ${++ret}` : `Hóa đơn ${++sale}`,
        ]));
    }, [tabs]);

    const cartItems = useMemo(() => activeTab.cartItems ?? EMPTY_CART, [activeTab.cartItems]);
    const qtyInputs = useMemo(() => activeTab.qtyInputs ?? EMPTY_QTY_INPUTS, [activeTab.qtyInputs]);

    const setCartItems = useCallback((updater) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? { ...t, cartItems: typeof updater === 'function' ? updater(t.cartItems) : updater }
                : t
        ));
    }, [activeTabId]);

    const setQtyInputs = useCallback((updater) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId
                ? { ...t, qtyInputs: typeof updater === 'function' ? updater(t.qtyInputs) : updater }
                : t
        ));
    }, [activeTabId]);

    const paymentMethod = activeTab.paymentMethod ?? 'cash';
    const setPaymentMethod = useCallback((value) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId ? { ...t, paymentMethod: value } : t
        ));
    }, [activeTabId]);

    const note = activeTab.note ?? '';
    const setNote = useCallback((value) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId ? { ...t, note: value } : t
        ));
    }, [activeTabId]);

    // Add new tab (tối đa MAX_TABS hóa đơn)
    const handleAddTab = useCallback(() => {
        if (tabs.length >= MAX_TABS) return;
        const id = nextTabId();
        setTabs(prev => [...prev, createTab(id)]);
        setActiveTabId(id);
    }, [tabs.length]);

    const handleOpenReturnTab = useCallback((orderId) => {
        const key = String(orderId);
        const existing = tabs.find(t => t.type === 'RETURN' && t.orderId === key);
        if (existing) {
            setActiveTabId(existing.id);
            return;
        }
        if (tabs.length >= MAX_TABS) return;
        const id = nextTabId();
        setTabs(prev => [...prev, createReturnTab(id, key)]);
        setActiveTabId(id);
    }, [tabs]);

    const returnDirtyRef = useRef({});
    const handleReturnDirtyChange = useCallback((tabId, dirty) => {
        returnDirtyRef.current[tabId] = dirty;
    }, []);

    const closeTab = useCallback((tabId) => {
        delete returnDirtyRef.current[tabId];
        setTabs(prev => {
            if (prev.length === 1) {
                if (prev[0].type !== 'RETURN') return prev;
                const fresh = createTab(nextTabId());
                setActiveTabId(fresh.id);
                return [fresh];
            }
            const next = prev.filter(t => t.id !== tabId);
            if (activeTabId === tabId) {
                setActiveTabId(next[next.length - 1].id);
            }
            return next;
        });
    }, [activeTabId]);

    const handleCloseTab = useCallback((tabId, e) => {
        e.stopPropagation();
        if (returnDirtyRef.current[tabId]
            && !window.confirm('Đóng thông tin của đơn sẽ không lưu lại. Bạn có chắc muốn đóng không?')) {
            return;
        }
        closeTab(tabId);
    }, [closeTab]);

    // false | 'exchange' (chọn đơn để trả/đổi) | 'history' (chỉ tra cứu)
    const [historyOpen, setHistoryOpen] = useState(false);
    const [customerDebtOpen, setCustomerDebtOpen] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [posInfoError, setPosInfoError] = useState(null);
    const [cashGivenInput, setCashGivenInput] = useState('');

    // Bán nợ: tiền khách đưa trước, để trống là nợ toàn bộ
    const [prepaidInput, setPrepaidInput] = useState('');
    const [dueDate, setDueDate] = useState(defaultDueDate);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddLoading, setQuickAddLoading] = useState(false);
    const [quickAddError, setQuickAddError] = useState(null);
    const [discountEditing, setDiscountEditing] = useState(false);
    const discountInputRef = useRef(null);
    const [printError, setPrintError] = useState(null);
    const transferReference = activeTab.transferReference ?? '';
    const setTransferReference = useCallback((value) => {
        setTabs(prev => prev.map(t =>
            t.id === activeTabId ? { ...t, transferReference: value } : t
        ));
    }, [activeTabId]);


    const addProductToCart = useCallback((product, posInfo) => {
        const units = product.productUnits ?? [];
        const defaultUnit = units.find((u) => u.isDefault)
            ?? units.find((u) => Number(u.unitBase) === 1)
            ?? units[0];

        const locations = (posInfo?.locations ?? []).filter((loc) => Number(loc.quantity ?? 0) > 0);

        const newItem = withFifoPicks({
            id: String(product.id),
            productId: product.id,
            code: product.barcode ?? product.id,
            imageUrl: posInfo?.imageUrl ?? product.imageUrl ?? null,
            name: product.name,
            units,
            productUnitId: defaultUnit?.id ?? null,
            unit: defaultUnit?.name ?? 'N/A',
            locations,
            stockTotal: posInfo?.availableQuantity ?? null,
            stockSales: posInfo?.salesZoneQuantity ?? null,
            stockWarehouse: posInfo?.warehouseQuantity ?? null,
            qty: 1,
            price: defaultUnit?.sellingPrice ?? product.sellingPrice ?? 0,
        });
        setCartItems((prev) => {
            const existing = prev.find((i) => i.id === newItem.id);
            if (existing) {
                // Quét thêm: lấp vào vị trí FIFO còn chỗ, giữ phần thu ngân đã chia tay.
                return prev.map((i) => i.id === newItem.id ? withTotalQty(i, i.qty + 1) : i);
            }
            return [...prev, newItem];
        });
    }, [setCartItems]);

    const onProductFound = useCallback(async (product) => {
        // Vị trí + lô lấy từ api pos-info
        try {
            const posInfo = await getProductPosInfo(product.id);
            if (hasNoSellableLocation(posInfo)) {
                setPosInfoError(unsellableMessage(product.name, posInfo));
                return;
            }
            setPosInfoError(null);
            addProductToCart(product, posInfo);
        } catch (error) {
            console.error("Failed to fetch product POS info:", error);
            // Fallback for offline mode: allow adding to cart with default unit and mock/offline location
            if (typeof window !== 'undefined' && !window.navigator.onLine) {
                const fallbackPosInfo = {
                    units: product.units?.length ? product.units : [
                        { id: product.productUnitId || product.id, name: product.unit || 'Cái', sellingPrice: product.price || product.sellingPrice || 0 }
                    ],
                    locations: product.locations?.length ? product.locations : [
                        { zoneName: 'Khu bán lẻ', locationCode: 'KHO-CHINH', quantity: product.stockQuantity || 999 }
                    ],
                    availableQuantity: product.stockQuantity || 999
                };
                setPosInfoError(null);
                addProductToCart(product, fallbackPosInfo);
            } else {
                // Ưu tiên lời báo của server (vd "Sản phẩm đã ngừng kinh doanh, không thể bán").
                setPosInfoError(getApiErrorMessage(
                    error, `Không tải được vị trí để hàng của "${product.name}". Vui lòng thử lại.`));
            }
        }
    }, [addProductToCart]);

    const setPickQty = useCallback((id, key, qty) => {
        setCartItems((prev) =>
            prev.map((item) => item.id === id ? withPickQty(item, key, qty) : item)
        );
    }, [setCartItems]);

    const changeUnit = useCallback((id, productUnitId) => {
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const selectedUnit = (item.units ?? []).find(
                    (u) => String(u.id) === String(productUnitId)
                );
                if (!selectedUnit) return item;
                return withFifoPicks({
                    ...item,
                    productUnitId: selectedUnit.id,
                    unit: selectedUnit.name,
                    price: selectedUnit.sellingPrice ?? 0,
                });
            })
        );
    }, [setCartItems]);

    // Product name search hook
    const { results: searchResults, loading: searchLoading, error: searchError, clearResults } =
        useProductSearch(searchInput);

    const showDropdown = searchInput.trim().length >= 2 && (searchLoading || searchError || searchResults.length >= 0);
    const returnPaneRefs = useRef({});

    const handleSearchSelect = useCallback((product) => {
        if (isReturnTab) {
            returnPaneRefs.current[activeTabId]?.addExchangeProduct(product);
        } else {
            onProductFound(product);
        }
        setSearchInput('');
        clearResults();
    }, [isReturnTab, activeTabId, onProductFound, clearResults]);

    const { scanning, error: scanError, clearError: clearScanError } =
        useBarcodeScanner({ onProductFound, enabled: !isReturnTab });

    // Checkout hook
    const {
        phone, setPhone,
        customer,
        discount, setDiscount,
        submitting,
        error: checkoutError,
        attachCustomer,
        detachCustomer,
        submitCheckout,
        resetCheckout,
    } = useCheckout();

    const handleSelectOfflineOrder = useCallback((offlineItem) => {
        if (!offlineItem) return;
        const snapshot = offlineItem.orderSnapshot || {};
        const payload = offlineItem.payload || {};

        if (offlineItem.type === 'EXCHANGE') {
            const originalId = payload.originalOrderId || snapshot.originalOrderId || snapshot.originalOrderCode;
            if (originalId) {
                const newId = nextTabId();
                setTabs(prev => [...prev, createReturnTab(newId, originalId)]);
                setActiveTabId(newId);
            }
            setShowOfflineModal(false);
            return;
        }

        const items = (snapshot.items || []).map((it, idx) => ({
            id: String(it.productId || idx),
            productId: it.productId,
            code: it.code || it.productId,
            imageUrl: it.imageUrl ?? null,
            name: it.productName || it.name,
            units: [],
            unit: it.unitName || it.unit || 'Cái',
            productUnitId: it.productUnitId || null,
            locations: [],
            stockTotal: 999,
            qty: it.quantity || it.qty || 1,
            price: it.unitPrice || it.price || 0,
        }));

        setTabs((prev) => {
            const existingTab = prev.find((t) => t.id === activeTabId);
            if (existingTab && (!existingTab.cartItems || existingTab.cartItems.length === 0)) {
                return prev.map((t) =>
                    t.id === activeTabId
                        ? {
                            ...t,
                            cartItems: items,
                            note: payload.note || snapshot.note || '',
                            paymentMethod: (snapshot.paymentMethod || 'CASH').toLowerCase(),
                        }
                        : t
                );
            } else {
                const newId = nextTabId();
                const newTab = {
                    ...createTab(newId),
                    cartItems: items,
                    note: payload.note || snapshot.note || '',
                    paymentMethod: (snapshot.paymentMethod || 'CASH').toLowerCase(),
                };
                setActiveTabId(newId);
                return [...prev, newTab];
            }
        });

        if (offlineItem.customer) {
            attachCustomer(offlineItem.customer);
        }

        setShowOfflineModal(false);
    }, [activeTabId, attachCustomer]);

    const { results: customerResults, loading: customerSearchLoading, error: customerSearchError, clearResults: clearCustomerResults } =
        useCustomerSearch(customer ? '' : phone);

    const showCustomerDropdown = !customer && !showQuickAdd && phone.trim().length >= 1 &&
        (customerSearchLoading || customerSearchError || customerResults.length >= 0);

    const handleCustomerSelect = useCallback((cust) => {
        attachCustomer(cust);
        clearCustomerResults();
    }, [attachCustomer, clearCustomerResults]);

    const handleRemoveCustomer = useCallback(() => {
        detachCustomer();
        setShowQuickAdd(false);
        setQuickAddError(null);
        clearCustomerResults();
    }, [detachCustomer, clearCustomerResults]);

    const canQuickAdd = !customer;

    const quickAddPrefill = useMemo(() => {
        const raw = phone.trim();
        return /^\d+$/.test(raw)
            ? { name: '', phone: raw }
            : { name: raw, phone: '' };
    }, [phone]);

    const handleUserPlus = useCallback(() => {
        if (customer) return;
        setQuickAddError(null);
        setShowQuickAdd(true);
    }, [customer]);

    const handleQuickAddSubmit = useCallback(async ({ fullName, phoneNumber }) => {
        setQuickAddLoading(true);
        setQuickAddError(null);
        try {
            const newCustomer = await createQuickCustomer({ fullName, phoneNumber });
            attachCustomer(newCustomer);
            setShowQuickAdd(false);
            clearCustomerResults();
        } catch (err) {
            const msg = err.response?.data?.message ?? 'Không thể thêm khách hàng. Vui lòng thử lại.';
            setQuickAddError(msg);
        } finally {
            setQuickAddLoading(false);
        }
    }, [attachCustomer, clearCustomerResults]);

    const handleQuickAddClose = useCallback(() => {
        setShowQuickAdd(false);
        setQuickAddError(null);
    }, []);

    // Qty editing handlers
    const handleQtyChange = (id, raw) => {
        if (!isValidQtyInput(raw)) return;
        setQtyInputs((prev) => ({ ...prev, [id]: raw }));
    };

    const handleQtyBlur = (id) => {
        const raw = qtyInputs[id];
        if (!isValidQtyValue(raw)) {
            setQtyInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
        } else {
            setCartItems((prev) =>
                prev.map((item) => item.id === id ? withTotalQty(item, parseQty(raw)) : item)
            );
            setQtyInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
        }
    };

    const removeItem = (id) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
        setQtyInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    };

    const locationBlocked = isOnline ? cartItems.some(hasLocationProblem) : false;
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const totalItems = Math.ceil(cartItems.reduce((sum, item) => sum + item.qty, 0));
    const safeDiscount = Math.min(discount, subtotal);
    const amountDue = subtotal - safeDiscount;

    const cashGiven = cashGivenInput.trim() === ''
        ? amountDue
        : (parseFloat(cashGivenInput) || 0);
    const changeDue = cashGiven - amountDue;

    // Ghi nợ
    const isDebtMode = paymentMethod === 'debt';
    const isTransferMode = paymentMethod === 'transfer';
    const prepaid = parseFloat(prepaidInput) || 0;
    // Nếu trả đủ thì không phải ghi nợ
    const prepaidInvalid = prepaid < 0 || (amountDue > 0 && prepaid >= amountDue);
    const remainingDebt = Math.max(0, amountDue - prepaid);
    const debtCustomerBlocked = isDebtMode && !canSellOnDebt(customer);
    const debtBlockedReason = isDebtMode ? debtBlockReason(customer) : null;
    const debtBlocked = isDebtMode
        && (debtCustomerBlocked || !dueDate || prepaidInvalid);

    const customerMeta = debtLevelMeta(customer);
    const customerSummary = debtSummaryText(customer);
    const customerOverdue = isOverdueCustomer(customer);
    // lâu chỉ cảnh báo, không chặn ghi nợ nữa.
    const overdueWarning = isDebtMode ? debtOverdueWarning(customer) : null;

    useEffect(() => {
        if (isReturnTab) return;
        saveActiveCart(cartItems, qtyInputs);
    }, [cartItems, qtyInputs, isReturnTab]);

    const handleNewOrder = () => {
        setCartItems([]);
        setQtyInputs({});
        setSearchInput('');
        setPosInfoError(null);
        clearResults();
        resetCheckout();
        clearScanError();
        clearCustomerResults();
        setShowQuickAdd(false);
        setQuickAddError(null);
        setDiscountEditing(false);
        setCashGivenInput('');

        setTransferReference(buildPaymentReference());
        setPaymentMethod('cash');
        setNote('');
        setPrepaidInput('');
        setDueDate(defaultDueDate());
    };

    const runCheckout = async () => {
        const result = await submitCheckout(cartItems, paymentMethod, {
            paidAmount: prepaid,
            dueDate,
        }, note, isTransferMode ? transferReference : null);
        if (!result.ok) return result;
        if (result.isOffline) {
            showOfflineToast();
        }
        const orderId = result.order?.id ?? result.invoice?.orderId ?? null;
        let invoice = result.invoice;
        if (!invoice && orderId != null) {
            try {
                invoice = await getInvoiceData(orderId);
            } catch (error) {
                // Báo cho thu ngân ở dưới, đơn vẫn đã lưu thành công.
                console.error("Failed to fetch invoice data after order:", error);
            }
        }

        if (invoice) {
            printInvoice(invoice);
            setPrintError(null);
        } else {
            const code = result.order?.orderCode ?? orderId ?? '';
            setPrintError(
                `Đơn ${code} đã lưu thành công nhưng không tải được bản in. `
                + 'Vào "Lịch sử đơn hàng" để in lại.'
            );
        }
        handleNewOrder();
        return result;
    };

    const handleCheckout = async () => {
        await runCheckout();
    };

    const { bank, loading: bankLoading, error: bankError } = useStorePaymentInfo();

    const transferBlockedReason = !isTransferMode ? null
        : cartItems.length === 0 ? 'Thêm sản phẩm vào giỏ để hiện mã QR chuyển khoản.'
            : locationBlocked ? 'Các vị trí đã chọn không đủ số lượng.'
                : amountDue <= 0 ? 'Đơn hàng chưa có số tiền cần thu.'
                    : null;

    // Discount editing
    const handleDiscountEditToggle = () => {
        setDiscountEditing(prev => !prev);
        if (!discountEditing) {
            setTimeout(() => discountInputRef.current?.focus(), 50);
        }
    };

    return (
        <div className="pos-container">
            <header className="pos-header">
                <PosHeaderLeft
                    searchInput={searchInput}
                    onSearchInputChange={setSearchInput}
                    scanning={scanning}
                    showDropdown={showDropdown}
                    searchResults={searchResults}
                    searchLoading={searchLoading}
                    searchError={searchError}
                    onSelectProduct={handleSearchSelect}
                    onCloseDropdown={() => {
                        setSearchInput('');
                        clearResults();
                    }}
                    tabs={tabs}
                    tabLabels={tabLabels}
                    activeTabId={activeTabId}
                    onSelectTab={setActiveTabId}
                    onCloseTab={handleCloseTab}
                    onAddTab={handleAddTab}
                    maxTabs={MAX_TABS}
                />

                <div className="pos-header-right flex items-center gap-3">
                    {/* Badge Chế độ Offline rõ ràng, nổi bật khi mất mạng */}
                    {!isOnline && (
                        <div
                            className="pos-offline-badge"
                            title="Hệ thống đang hoạt động ở Chế độ Offline do mất kết nối Internet"
                        >
                            <WifiOff size={15} strokeWidth={2.5} />
                            <span>Chế độ Offline</span>
                        </div>
                    )}

                    <div className="pos-sync-wrapper">
                        <button
                            type="button"
                            className="pos-sync-btn"
                            onClick={() => setShowOfflineModal(true)}
                            aria-label="Đồng bộ dữ liệu"
                        >
                            <RefreshCcw
                                size={18}
                                className={isOfflineSyncing ? 'animate-spin' : ''}
                            />

                            {/* Badge đỏ hiển thị số lượng đơn offline chờ đồng bộ */}
                            {offlinePendingCount > 0 && (
                                <span className="pos-sync-badge">
                                    {offlinePendingCount}
                                </span>
                            )}
                        </button>

                        {/* Tooltip Đồng bộ dữ liệu hiển thị khi hover */}
                        <div className="pos-sync-tooltip">
                            Đồng bộ dữ liệu
                        </div>
                    </div>

                    <PosHeaderMenu />
                </div>
            </header>

            {/* SCAN ERROR BANNER */}
            {scanError && (
                <div className="scan-error-banner">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        {scanError}
                    </span>
                    <button onClick={clearScanError} title="Đóng">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* POS-INFO ERROR BANNER */}
            {posInfoError && (
                <div className="scan-error-banner">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        {posInfoError}
                    </span>
                    <button onClick={() => setPosInfoError(null)} title="Đóng">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* KHÔNG IN ĐƯỢC - đơn vẫn đã lưu */}
            {printError && (
                <div className="scan-error-banner">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        {printError}
                    </span>
                    <button onClick={() => setPrintError(null)} title="Đóng">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="pos-main" style={isReturnTab ? { display: 'none' } : undefined}>

                {/* LEFT COLUMN - CART */}
                <div className="pos-cart-section">
                    <div className="cart-table-wrapper">
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th className="col-stt">STT</th>
                                    <th>ẢNH SẢN PHẨM</th>
                                    <th>TÊN SẢN PHẨM</th>
                                    <th>ĐVT</th>
                                    <th>VỊ TRÍ</th>
                                    <th className="text-center">SỐ LƯỢNG</th>
                                    <th className="text-right">ĐƠN GIÁ</th>
                                    <th className="text-right">THÀNH TIỀN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cartItems.length === 0 && (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                                            Quét mã vạch hoặc tìm kiếm để thêm sản phẩm
                                        </td>
                                    </tr>
                                )}
                                {cartItems.map((item, index) => {
                                    const rawVal = qtyInputs[item.id];
                                    const displayVal = rawVal !== undefined ? rawVal : item.qty;
                                    const isInvalid = isQtyInvalid(rawVal);
                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {index + 1}
                                                    <button className="btn-delete" title="Xóa" onClick={() => removeItem(item.id)}>
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <ProductThumb url={item.imageUrl} alt={item.name} size={44} />
                                            </td>
                                            <td>
                                                <div>{item.name}</div>
                                                {item.stockTotal != null && (
                                                    <div
                                                        className="cart-stock-line"
                                                        title={`Quầy ${Number(item.stockSales ?? 0).toLocaleString('vi-VN')} - Kho ${Number(item.stockWarehouse ?? 0).toLocaleString('vi-VN')}`}
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
                                                        onChange={(e) => changeUnit(item.id, e.target.value)}
                                                    >
                                                        {item.units.map((u) => (
                                                            <option key={u.id} value={u.id}>
                                                                {u.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    item.unit
                                                )}
                                            </td>
                                            <td>
                                                <LocationPicker
                                                    item={item}
                                                    onPickQtyChange={(key, qty) => setPickQty(item.id, key, qty)}
                                                />
                                            </td>
                                            <td>
                                                <div className="qty-control qty-control--underline">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={displayVal}
                                                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                                        onBlur={() => handleQtyBlur(item.id)}
                                                        className={`qty-input qty-input--underline${isInvalid ? ' qty-input-error' : ''}`}
                                                        title={isInvalid ? 'Số lượng phải lớn hơn 0' : ''}
                                                    />
                                                </div>
                                                {isInvalid && (
                                                    <div className="qty-error-msg">Phải là số &gt; 0</div>
                                                )}
                                            </td>
                                            <td className="text-right">{formatVnd(item.price)}</td>
                                            <td className="text-right font-bold">{formatVnd(item.price * item.qty)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="cart-actions">
                        <div className="order-note">
                            <textarea
                                id="pos-order-note"
                                className="order-note-input"
                                rows={2}
                                maxLength={500}
                                placeholder="Ghi chú cho đơn này (không bắt buộc)"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>

                        <div className="cart-actions-buttons">
                            <button
                                className="cart-action-btn"
                                onClick={() => setHistoryOpen('exchange')}
                                title="Chọn hóa đơn cũ để trả hoặc đổi hàng"
                            >
                                <RotateCcw size={18} />
                                Đổi/Trả hàng
                            </button>
                            <button
                                className="cart-action-btn"
                                onClick={() => setHistoryOpen('history')}
                                title="Xem các hóa đơn đã bán"
                            >
                                <History size={18} />
                                Lịch sử đơn hàng
                            </button>
                            <button
                                className="cart-action-btn"
                                onClick={() => setCustomerDebtOpen(true)}
                                title="Xem và thu nợ khách hàng"
                            >
                                <ClipboardList size={18} />
                                Thu nợ
                            </button>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN - PAYMENT */}
                <div className="pos-payment-section">
                    <div className="payment-content">

                        {/* Tìm khách hàng */}
                        <div className="customer-search">
                            <div className="search-wrapper">
                                <Search className="search-icon" size={18} />
                                <input
                                    type="text"
                                    autoComplete="off"
                                    maxLength={100}
                                    placeholder={
                                        'Tìm khách hàng (tên hoặc số điện thoại)'}
                                    className="customer-input"
                                    value={phone}
                                    disabled={!!customer}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        setShowQuickAdd(false);
                                        setQuickAddError(null);
                                    }}
                                />
                                {showCustomerDropdown && (
                                    <CustomerSearchDropdown
                                        results={customerResults}
                                        loading={customerSearchLoading}
                                        error={customerSearchError}
                                        onSelect={handleCustomerSelect}
                                        onAddNew={handleUserPlus}
                                        onClose={clearCustomerResults}
                                        debtMode={isDebtMode}
                                    />
                                )}
                            </div>

                            {/* Đã chọn khách thì nút này chuyển thành "bỏ chọn" */}
                            {customer ? (
                                <button
                                    className="btn-add-customer btn-add-customer--clear"
                                    title="Bỏ khách hàng khỏi đơn"
                                    onClick={handleRemoveCustomer}
                                >
                                    <X size={20} />
                                </button>
                            ) : (
                                <button
                                    className="btn-add-customer"
                                    title="Thêm khách hàng mới"
                                    onClick={handleUserPlus}
                                    disabled={!canQuickAdd || quickAddLoading}
                                >
                                    <Plus size={20} />
                                </button>
                            )}
                        </div>

                        {/* Khách đã chọn: tên + tình trạng công nợ */}
                        {customer && (
                            <div className={`customer-debt-card customer-debt-card--${customerMeta.cls.replace('debt-dot--', '')}`}>
                                <div className="cdc-head">
                                    <span className={`debt-dot ${customerMeta.cls}`} />
                                    <span className="cdc-name">{customer.fullName}</span>
                                    {customerOverdue && (
                                        <Lock size={14} className="cdc-lock" aria-label="Khách đang nợ lâu" />
                                    )}
                                    <span className="cdc-level">{customerMeta.label}</span>

                                </div>
                                {customerSummary && (
                                    <div className="cdc-summary">{customerSummary}</div>
                                )}
                                {debtBlockedReason && (
                                    <div className="cdc-block">
                                        <AlertCircle size={13} />
                                        {debtBlockedReason}
                                    </div>
                                )}
                                {!debtBlockedReason && overdueWarning && (
                                    <div className="cdc-warn">
                                        <AlertCircle size={13} />
                                        {overdueWarning}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="summary-row summary-row--total">
                            <span>
                                Tổng tiền
                                <span className="summary-item-count">({totalItems} sản phẩm)</span>
                            </span>
                            <span className="font-bold">{formatVnd(subtotal)}</span>
                        </div>

                        {/* Discount row */}
                        <div className="summary-row summary-row--divider">
                            <span
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#2563eb' }}
                                onClick={handleDiscountEditToggle}
                                title="Nhấn để nhập giảm giá"
                            >
                                Giảm giá <Pencil size={14} />
                            </span>
                            {discountEditing ? (
                                <input
                                    ref={discountInputRef}
                                    type="number"
                                    min={0}
                                    max={subtotal}
                                    value={discount || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setDiscount(Math.max(0, val));
                                    }}
                                    onBlur={() => setDiscountEditing(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === 'Escape') {
                                            setDiscountEditing(false);
                                        }
                                    }}
                                    className="discount-input"
                                    placeholder="0"
                                />
                            ) : (
                                <span
                                    className="font-bold"
                                    style={{ cursor: 'pointer', color: safeDiscount > 0 ? '#dc2626' : undefined }}
                                    onClick={handleDiscountEditToggle}
                                >
                                    {safeDiscount > 0 ? `- ${formatVnd(safeDiscount)}` : formatVnd(0)}
                                </span>
                            )}
                        </div>
                        <div className="summary-row summary-row--major" style={{ marginTop: '16px' }}>
                            <span className="summary-major-label">Khách phải trả</span>
                            <span className="text-blue-large">{formatVnd(amountDue)}</span>
                        </div>

                        {/* Tiền khách đưa - dùng chung cho tiền mặt và ghi nợ */}
                        {paymentMethod !== 'transfer' && (
                            <div className="summary-row summary-row--major">
                                <span className="summary-major-label">Tiền khách đưa</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={isDebtMode ? amountDue : undefined}
                                    step={1000}
                                    className={`cash-given-input${isDebtMode && prepaidInvalid ? ' input-error' : ''}`}
                                    value={isDebtMode ? prepaidInput : cashGivenInput}
                                    placeholder={isDebtMode ? '0' : amountDue.toLocaleString('vi-VN')}
                                    onChange={(e) => {
                                        if (isDebtMode) setPrepaidInput(e.target.value);
                                        else setCashGivenInput(e.target.value);
                                    }}
                                />
                            </div>
                        )}

                        {isDebtMode && prepaidInvalid && (
                            <div className="debt-form-error">
                                Tiền khách đưa phải nhỏ hơn {formatMoney(amountDue)}.
                                Trả đủ thì chọn hình thức tiền mặt hoặc chuyển khoản.
                            </div>
                        )}

                        {paymentMethod === 'cash' && (
                            <div className={`summary-row summary-row--major change-due-row${changeDue > 0 ? '' : ' is-zero'}${changeDue < 0 ? '' : ' summary-row--divider'}`}>
                                <span className="summary-major-label">Tiền thừa trả khách</span>
                                <span className="change-due-amount">
                                    {formatVnd(Math.max(0, changeDue))}
                                </span>
                            </div>
                        )}

                        {paymentMethod === 'cash' && changeDue < 0 && (
                            <div className="summary-row summary-row--major summary-row--divider cash-short-row">
                                <span className="summary-major-label">Khách đưa còn thiếu</span>
                                <span className="change-due-amount">
                                    {formatVnd(Math.abs(changeDue))}
                                </span>
                            </div>
                        )}
                        {/* Ghi nợ */}
                        {isDebtMode && (
                            <div className="debt-form">
                                <div className="debt-form-title">Thông tin ghi nợ</div>

                                <div className="summary-row summary-row--major debt-remaining-row">
                                    <span className="summary-major-label">Khách còn nợ</span>
                                    <span className="debt-remaining-amount">{formatMoney(remainingDebt)}</span>
                                </div>

                                <div className="summary-row">
                                    <span className="summary-major-label">Hạn trả nợ</span>
                                    <input
                                        type="date"
                                        className={`debt-due-input${!dueDate ? ' input-error' : ''}`}
                                        value={dueDate}
                                        min={toDateInput(new Date())}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="payment-methods">
                            <span className="payment-methods-title">Hình thức thanh toán</span>
                            <div className="methods-grid">
                                {PAYMENT_METHODS.map(({ value, label }) => (
                                    <label
                                        key={value}
                                        className={`method-label ${paymentMethod === value ? 'active' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            checked={paymentMethod === value}
                                            onChange={() => setPaymentMethod(value)}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>

                            {isTransferMode && (
                                <TransferQrPanel
                                    bank={bank}
                                    bankLoading={bankLoading}
                                    bankError={bankError}
                                    amount={amountDue}
                                    reference={transferReference}
                                    blockedReason={transferBlockedReason}
                                />
                            )}
                        </div>



                        {isDebtMode && !customer && (
                            <div className="scan-error-banner" style={{ marginTop: '12px', borderRadius: '4px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} />
                                    Tìm theo số điện thoại hoặc thêm khách mới để ghi công nợ.
                                </span>
                            </div>
                        )}

                        {/* {locationBlocked && isOnline && (
                            <div className="scan-error-banner" style={{ marginTop: '12px', borderRadius: '4px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} />
                                    Chưa chọn vị trí lấy hàng hoặc các lô hàng không đủ số lượng.
                                </span>
                            </div>
                        )} */}

                        {/* Checkout error */}
                        {checkoutError && (
                            <div className="scan-error-banner" style={{ marginTop: '12px', borderRadius: '4px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} />
                                    {checkoutError}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Checkout Button */}
                    <div className="payment-footer">
                        <button
                            className="btn-checkout"
                            disabled={submitting || cartItems.length === 0 || locationBlocked || debtBlocked}
                            title={debtBlockedReason ?? undefined}
                            onClick={handleCheckout}
                        >
                            {debtBlocked && isDebtMode && <Lock size={16} />}
                            {isTransferMode && !submitting && <QrCode size={16} />}
                            {submitting ? 'ĐANG XỬ LÝ...' : (isDebtMode ? 'GHI NỢ' : 'THANH TOÁN')}
                        </button>
                    </div>
                </div>
            </div>

            {/* RETURN TABS */}
            {tabs.filter(t => t.type === 'RETURN').map(tab => (
                <div
                    key={tab.id}
                    className={`pos-return-pane${tab.id === activeTabId ? ' is-active' : ''}`}
                >
                    <ExchangeOrder
                        embedded
                        ref={(handle) => {
                            if (handle) returnPaneRefs.current[tab.id] = handle;
                            else delete returnPaneRefs.current[tab.id];
                        }}
                        orderId={tab.orderId}
                        onDone={() => closeTab(tab.id)}
                        onDirtyChange={(dirty) => handleReturnDirtyChange(tab.id, dirty)}
                    />
                </div>
            ))}

            {/* THÊM NHANH KHÁCH HÀNG */}
            {showQuickAdd && !customer && (
                <QuickAddCustomerModal
                    initialName={quickAddPrefill.name}
                    initialPhone={quickAddPrefill.phone}
                    loading={quickAddLoading}
                    error={quickAddError}
                    onSubmit={handleQuickAddSubmit}
                    onClose={handleQuickAddClose}
                />
            )}

            {/* HISTORY MODAL */}
            {historyOpen && (
                <SalesOrderHistoryModal
                    mode={historyOpen}
                    onClose={() => setHistoryOpen(false)}
                    onExchange={(orderId) => {
                        setHistoryOpen(false);
                        handleOpenReturnTab(orderId);
                    }}
                />
            )}

            {/* OFFLINE ORDERS MODAL */}
            <OfflineOrdersModal
                show={showOfflineModal}
                onClose={() => setShowOfflineModal(false)}
                queue={offlineQueue}
                isSyncing={isOfflineSyncing}
                onSyncNow={handleOfflineSyncNow}
                onRemoveItem={handleRemoveOfflineItem}
                onSelectOrder={handleSelectOfflineOrder}
                isOnline={isOnline}
            />

            {/* KIOTVIET-STYLE OFFLINE TOAST NOTIFICATION */}
            <OfflineToast />

            {customerDebtOpen && (
                <CustomerDebtModal onClose={() => setCustomerDebtOpen(false)} />
            )}

        </div>
    );
};

export default POSScreen;